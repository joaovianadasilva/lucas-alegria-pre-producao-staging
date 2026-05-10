import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, Plus, FolderPlus, Play, CheckCircle2, XCircle } from 'lucide-react';
import { FIELDS, FieldDef, findField, ALL_FIELDS_INCLUDING_TODAY } from '@/lib/regras/fields';
import { operatorsForType, findOperator } from '@/lib/regras/operators';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Tipo = 'recebimento' | 'reembolso';
type Group = { op: 'AND' | 'OR'; children: Node[] };
type Cond = { field: string; operator: string; value?: any; ref?: string; offset?: { days?: number; months?: number } };
type Node = Group | Cond;

const isGroup = (n: Node): n is Group => (n as any).op !== undefined && Array.isArray((n as any).children);

interface Provedor { id: string; nome: string }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tipo: Tipo;
  initial?: any | null;
  provedores: Provedor[];
  onSaved: () => void;
}

const emptyTree = (): Group => ({ op: 'AND', children: [] });

function migrate(input: any, tipo: Tipo): Group {
  if (input && input.op && Array.isArray(input.children)) return input;
  // Adapt formato antigo
  const children: Node[] = [];
  if (input) {
    if (tipo === 'recebimento') {
      const exige = input.exige_pagamentos ?? 1;
      if (exige > 0) children.push({ field: 'qtd_pagamentos_efetuados', operator: 'gte', value: exige });
      if (input.dias_apos_ativacao) children.push({ field: 'today', operator: 'gte_date_offset', ref: 'data_ativacao', offset: { days: input.dias_apos_ativacao } });
    } else {
      if (input.dias_apos_cancelamento) children.push({ field: 'today', operator: 'gte_date_offset', ref: 'data_cancelamento', offset: { days: input.dias_apos_cancelamento } });
    }
    if (input.status_contrato_in) children.push({ field: 'status_contrato', operator: 'in', value: input.status_contrato_in });
  }
  return { op: 'AND', children };
}

export default function RegraEditorDialog({ open, onOpenChange, tipo, initial, provedores, onSaved }: Props) {
  const [nome, setNome] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [aplicaTodos, setAplicaTodos] = useState(false);
  const [provedorIds, setProvedorIds] = useState<string[]>([]);
  const [tree, setTree] = useState<Group>(emptyTree());
  const [saving, setSaving] = useState(false);
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setNome(initial.nome || '');
      setAtivo(initial.ativo ?? true);
      setAplicaTodos(initial.aplica_todos ?? false);
      setProvedorIds(initial.provedor_ids || (initial.provedor_id ? [initial.provedor_id] : []));
      setTree(migrate(initial.regra, tipo));
    } else {
      setNome(''); setAtivo(true); setAplicaTodos(false); setProvedorIds([]);
      setTree({ op: 'AND', children: [{ field: 'status_contrato', operator: 'eq', value: '' }] });
    }
    setTestInput(''); setTestResult(null);
  }, [open, initial, tipo]);

  const updateNode = (path: number[], updater: (n: Node) => Node) => {
    const recur = (node: Node, depth: number): Node => {
      if (depth === path.length) return updater(node);
      if (!isGroup(node)) return node;
      const idx = path[depth];
      const newChildren = node.children.map((c, i) => i === idx ? recur(c, depth + 1) : c);
      return { ...node, children: newChildren };
    };
    setTree(recur(tree, 0) as Group);
  };

  const addCondition = (path: number[]) => {
    updateNode(path, (n) => {
      if (!isGroup(n)) return n;
      return { ...n, children: [...n.children, { field: 'status_contrato', operator: 'eq', value: '' }] };
    });
  };
  const addGroup = (path: number[]) => {
    updateNode(path, (n) => {
      if (!isGroup(n)) return n;
      return { ...n, children: [...n.children, { op: 'AND', children: [] } as Group] };
    });
  };
  const removeChild = (parentPath: number[], childIdx: number) => {
    updateNode(parentPath, (n) => {
      if (!isGroup(n)) return n;
      const c = [...n.children]; c.splice(childIdx, 1);
      return { ...n, children: c };
    });
  };
  const setOp = (path: number[], op: 'AND' | 'OR') => {
    updateNode(path, (n) => isGroup(n) ? { ...n, op } : n);
  };
  const updateChild = (parentPath: number[], childIdx: number, child: Node) => {
    updateNode(parentPath, (n) => {
      if (!isGroup(n)) return n;
      const c = [...n.children]; c[childIdx] = child;
      return { ...n, children: c };
    });
  };

  const handleSave = async () => {
    if (!nome.trim()) { toast.error('Informe o nome da regra'); return; }
    if (!aplicaTodos && provedorIds.length === 0) { toast.error('Selecione provedores ou marque "aplica a todos"'); return; }
    if (tree.children.length === 0) { toast.error('Adicione ao menos uma condição'); return; }
    setSaving(true);
    try {
      const action = initial ? 'atualizarRegra' : 'criarRegra';
      const body: any = { action, nome, tipo, ativo, aplica_todos: aplicaTodos, provedor_ids: aplicaTodos ? [] : provedorIds, regra: tree };
      if (initial) body.id = initial.id;
      const { data, error } = await supabase.functions.invoke('central-operacional', { body });
      if (error || data?.error) throw new Error(error?.message || data?.error);
      toast.success('Regra salva');
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const runTest = async () => {
    if (!testInput.trim()) { toast.error('Informe um código de contrato ou ID'); return; }
    setTestResult({ loading: true });
    try {
      const isUuid = /^[0-9a-f]{8}-/.test(testInput.trim());
      const body: any = { action: 'testarRegra', regra: tree };
      if (isUuid) body.contratoId = testInput.trim(); else body.codigoContrato = testInput.trim();
      const { data, error } = await supabase.functions.invoke('central-operacional', { body });
      if (error || data?.error) throw new Error(error?.message || data?.error);
      setTestResult(data);
    } catch (e: any) {
      setTestResult({ error: e.message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? 'Editar regra' : 'Nova regra'} — {tipo === 'recebimento' ? 'Recebimento' : 'Reembolso'}</DialogTitle>
          <DialogDescription>Combine condições com E/OU. A regra é satisfeita quando a expressão for verdadeira para o contrato.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Nome da regra</Label>
              <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex.: Plano com ativação" />
            </div>
            <div className="flex items-end gap-4">
              <div className="flex items-center gap-2"><Switch checked={ativo} onCheckedChange={setAtivo} /> <Label>Ativa</Label></div>
              <div className="flex items-center gap-2"><Switch checked={aplicaTodos} onCheckedChange={setAplicaTodos} /> <Label>Aplica a todos os provedores</Label></div>
            </div>
          </div>

          {!aplicaTodos && (
            <div>
              <Label>Provedores alvo</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    {provedorIds.length === 0 ? 'Selecione provedores' : `${provedorIds.length} selecionado(s)`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72">
                  <div className="space-y-1 max-h-72 overflow-auto">
                    {provedores.map(p => (
                      <label key={p.id} className="flex items-center gap-2 cursor-pointer text-sm py-1">
                        <Checkbox
                          checked={provedorIds.includes(p.id)}
                          onCheckedChange={() => setProvedorIds(provedorIds.includes(p.id) ? provedorIds.filter(x => x !== p.id) : [...provedorIds, p.id])}
                        />
                        <span>{p.nome}</span>
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              {provedorIds.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {provedorIds.map(id => {
                    const p = provedores.find(x => x.id === id);
                    return <Badge key={id} variant="secondary">{p?.nome || id}</Badge>;
                  })}
                </div>
              )}
            </div>
          )}

          <div>
            <Label>Condições</Label>
            <div className="mt-2">
              <GroupEditor
                node={tree}
                path={[]}
                root
                onSetOp={(op) => setTree({ ...tree, op })}
                onAddCondition={() => addCondition([])}
                onAddGroup={() => addGroup([])}
                onUpdateChild={(idx, c) => updateChild([], idx, c)}
                onRemoveChild={(idx) => removeChild([], idx)}
                addCondition={addCondition}
                addGroup={addGroup}
                removeChild={removeChild}
                setOp={setOp}
                updateChild={updateChild}
              />
            </div>
          </div>

          <Card>
            <CardContent className="pt-4 space-y-3">
              <Label>Testar regra</Label>
              <div className="flex gap-2">
                <Input value={testInput} onChange={e => setTestInput(e.target.value)} placeholder="Código do contrato ou ID (UUID)" />
                <Button type="button" variant="secondary" onClick={runTest}><Play className="h-4 w-4 mr-1" /> Testar</Button>
              </div>
              {testResult?.loading && <div className="text-sm text-muted-foreground">Testando...</div>}
              {testResult?.error && <div className="text-sm text-destructive">{testResult.error}</div>}
              {testResult?.success && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {testResult.resultado ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-destructive" />}
                    <span className="font-medium">{testResult.resultado ? 'Elegível' : 'Não elegível'}</span>
                    <span className="text-xs text-muted-foreground">— {testResult.contrato?.codigo_contrato || testResult.contrato?.id} • {testResult.contrato?.nome_completo}</span>
                  </div>
                  <pre className="text-xs bg-muted p-2 rounded max-h-64 overflow-auto">{JSON.stringify(testResult.trace, null, 2)}</pre>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===== Sub-componentes =====

function GroupEditor(props: {
  node: Group;
  path: number[];
  root?: boolean;
  onSetOp: (op: 'AND' | 'OR') => void;
  onAddCondition: () => void;
  onAddGroup: () => void;
  onUpdateChild: (idx: number, c: Node) => void;
  onRemoveChild: (idx: number) => void;
  // recursive helpers
  addCondition: (path: number[]) => void;
  addGroup: (path: number[]) => void;
  removeChild: (parentPath: number[], childIdx: number) => void;
  setOp: (path: number[], op: 'AND' | 'OR') => void;
  updateChild: (parentPath: number[], childIdx: number, child: Node) => void;
}) {
  const { node, path, root } = props;
  return (
    <div className={`border-l-2 pl-3 py-2 space-y-2 ${root ? 'border-primary' : 'border-muted'}`}>
      <div className="flex items-center gap-2">
        <Select value={node.op} onValueChange={(v: 'AND' | 'OR') => props.onSetOp(v)}>
          <SelectTrigger className="w-24 h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="AND">E (todas)</SelectItem>
            <SelectItem value="OR">OU (qualquer)</SelectItem>
          </SelectContent>
        </Select>
        <Button type="button" size="sm" variant="outline" onClick={props.onAddCondition}><Plus className="h-3 w-3 mr-1" />Condição</Button>
        <Button type="button" size="sm" variant="outline" onClick={props.onAddGroup}><FolderPlus className="h-3 w-3 mr-1" />Grupo</Button>
      </div>

      {node.children.length === 0 && <div className="text-xs text-muted-foreground">Nenhuma condição. Adicione ao menos uma.</div>}

      {node.children.map((child, idx) => (
        <div key={idx} className="flex items-start gap-2">
          <div className="flex-1">
            {isGroup(child) ? (
              <GroupEditor
                node={child}
                path={[...path, idx]}
                onSetOp={(op) => props.updateChild(path, idx, { ...child, op })}
                onAddCondition={() => props.addCondition([...path, idx])}
                onAddGroup={() => props.addGroup([...path, idx])}
                onUpdateChild={(i, c) => {
                  const newChildren = [...child.children]; newChildren[i] = c;
                  props.updateChild(path, idx, { ...child, children: newChildren });
                }}
                onRemoveChild={(i) => {
                  const newChildren = [...child.children]; newChildren.splice(i, 1);
                  props.updateChild(path, idx, { ...child, children: newChildren });
                }}
                addCondition={props.addCondition}
                addGroup={props.addGroup}
                removeChild={props.removeChild}
                setOp={props.setOp}
                updateChild={props.updateChild}
              />
            ) : (
              <ConditionRow cond={child} onChange={(c) => props.onUpdateChild(idx, c)} />
            )}
          </div>
          <Button type="button" size="icon" variant="ghost" onClick={() => props.onRemoveChild(idx)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ))}
    </div>
  );
}

function ConditionRow({ cond, onChange }: { cond: Cond; onChange: (c: Cond) => void }) {
  const field = findField(cond.field) || FIELDS[0];
  const operators = operatorsForType(field.type);
  const op = findOperator(field.type, cond.operator) || operators[0];
  const shape = op?.valueShape || 'text';

  const handleField = (key: string) => {
    const f = findField(key)!;
    const ops = operatorsForType(f.type);
    onChange({ field: key, operator: ops[0]?.key || 'eq', value: undefined });
  };
  const handleOp = (k: string) => onChange({ ...cond, operator: k, value: undefined, ref: undefined, offset: undefined });

  return (
    <div className="flex flex-wrap items-center gap-2 p-2 bg-muted/30 rounded">
      <Select value={cond.field} onValueChange={handleField}>
        <SelectTrigger className="w-56 h-8"><SelectValue /></SelectTrigger>
        <SelectContent className="max-h-72">
          {FIELDS.map(f => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={cond.operator} onValueChange={handleOp}>
        <SelectTrigger className="w-52 h-8"><SelectValue /></SelectTrigger>
        <SelectContent className="max-h-72">
          {operators.map(o => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>

      <ValueInput shape={shape} field={field} cond={cond} onChange={onChange} />
    </div>
  );
}

function ValueInput({ shape, field, cond, onChange }: { shape: string; field: FieldDef; cond: Cond; onChange: (c: Cond) => void }) {
  if (shape === 'none') return null;
  if (shape === 'text') {
    return <Input className="h-8 w-48" value={cond.value ?? ''} onChange={e => onChange({ ...cond, value: e.target.value })} />;
  }
  if (shape === 'number') {
    return <Input type="number" className="h-8 w-32" value={cond.value ?? ''} onChange={e => onChange({ ...cond, value: e.target.value === '' ? '' : Number(e.target.value) })} />;
  }
  if (shape === 'date') {
    return <Input type="date" className="h-8 w-44" value={cond.value ?? ''} onChange={e => onChange({ ...cond, value: e.target.value })} />;
  }
  if (shape === 'enum') {
    return (
      <Select value={String(cond.value ?? '')} onValueChange={(v) => onChange({ ...cond, value: v })}>
        <SelectTrigger className="w-52 h-8"><SelectValue placeholder="Selecione" /></SelectTrigger>
        <SelectContent>{(field.options || []).map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
      </Select>
    );
  }
  if (shape === 'multi') {
    const arr: string[] = Array.isArray(cond.value) ? cond.value : [];
    const opts = field.options || [];
    if (opts.length > 0) {
      return (
        <Popover>
          <PopoverTrigger asChild><Button variant="outline" size="sm" className="h-8">{arr.length === 0 ? 'Selecione' : `${arr.length} selecionado(s)`}</Button></PopoverTrigger>
          <PopoverContent className="w-64">
            <div className="space-y-1 max-h-64 overflow-auto">
              {opts.map(o => (
                <label key={o.value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={arr.includes(o.value)} onCheckedChange={() => onChange({ ...cond, value: arr.includes(o.value) ? arr.filter(x => x !== o.value) : [...arr, o.value] })} />
                  <span>{o.label}</span>
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      );
    }
    // Free-form: comma-separated
    return <Input className="h-8 w-64" placeholder="valores separados por vírgula" value={arr.join(',')} onChange={e => onChange({ ...cond, value: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} />;
  }
  if (shape === 'date_range') {
    const arr: string[] = Array.isArray(cond.value) ? cond.value : ['', ''];
    return (
      <div className="flex gap-1">
        <Input type="date" className="h-8 w-40" value={arr[0] || ''} onChange={e => onChange({ ...cond, value: [e.target.value, arr[1] || ''] })} />
        <Input type="date" className="h-8 w-40" value={arr[1] || ''} onChange={e => onChange({ ...cond, value: [arr[0] || '', e.target.value] })} />
      </div>
    );
  }
  if (shape === 'field_offset') {
    const dateFields = ALL_FIELDS_INCLUDING_TODAY.filter(f => f.isDate);
    const offset = cond.offset || {};
    return (
      <div className="flex flex-wrap gap-1 items-center">
        <span className="text-xs text-muted-foreground">vs</span>
        <Select value={cond.ref || ''} onValueChange={(v) => onChange({ ...cond, ref: v })}>
          <SelectTrigger className="w-44 h-8"><SelectValue placeholder="Campo de data" /></SelectTrigger>
          <SelectContent>{dateFields.map(f => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}</SelectContent>
        </Select>
        <span className="text-xs">+</span>
        <Input type="number" className="h-8 w-20" placeholder="dias" value={offset.days ?? ''} onChange={e => onChange({ ...cond, offset: { ...offset, days: e.target.value === '' ? undefined : Number(e.target.value) } })} />
        <span className="text-xs text-muted-foreground">d</span>
        <Input type="number" className="h-8 w-20" placeholder="meses" value={offset.months ?? ''} onChange={e => onChange({ ...cond, offset: { ...offset, months: e.target.value === '' ? undefined : Number(e.target.value) } })} />
        <span className="text-xs text-muted-foreground">m</span>
      </div>
    );
  }
  return null;
}
