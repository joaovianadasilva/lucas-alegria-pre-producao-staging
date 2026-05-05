import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Filter, CalendarRange, Info } from 'lucide-react';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { formatLocalDate, toISODateString } from '@/lib/dateUtils';
import {
  ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
  BarChart, Bar, LineChart, Line,
} from 'recharts';

interface Provedor { id: string; nome: string }

type Preset = 'hoje' | '7d' | 'mes_atual' | 'mes_anterior' | 'ano' | 'custom';

function getPresetRange(p: Preset): { ini: string; fim: string } {
  const today = new Date();
  const t = (d: Date) => toISODateString(d);
  if (p === 'hoje') return { ini: t(today), fim: t(today) };
  if (p === '7d') {
    const d = new Date(today); d.setDate(d.getDate() + 6);
    return { ini: t(today), fim: t(d) };
  }
  if (p === 'mes_atual') {
    const ini = new Date(today.getFullYear(), today.getMonth(), 1);
    const fim = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { ini: t(ini), fim: t(fim) };
  }
  if (p === 'mes_anterior') {
    const ini = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const fim = new Date(today.getFullYear(), today.getMonth(), 0);
    return { ini: t(ini), fim: t(fim) };
  }
  if (p === 'ano') {
    const ini = new Date(today.getFullYear(), 0, 1);
    const fim = new Date(today.getFullYear(), 11, 31);
    return { ini: t(ini), fim: t(fim) };
  }
  return { ini: t(today), fim: t(today) };
}

interface Relatorio {
  kpis: {
    hoje: number; proximos7Dias: number; pendentes: number; confirmados: number;
    concluidos: number; cancelados: number; reprogramados: number; semTecnico: number;
  };
  serieTemporal: { data: string; total: number; pendentes: number; confirmados: number; concluidos: number; cancelados: number }[];
  ocupacaoPorSlot: { slot: number; total: number }[];
  porTecnico: { tecnico: string; total: number; pendentes: number; concluidos: number }[];
  distribuicaoStatus: { status: string; total: number }[];
  distribuicaoConfirmacao: { confirmacao: string; total: number }[];
  cancelReprogTempo: { data: string; cancelados: number; reprogramados: number }[];
  porOrigem: { chave: string; total: number }[];
  porRepresentante: { chave: string; total: number }[];
  porRede: { chave: string; total: number }[];
  agingPendencias: { faixa: string; total: number }[];
  leadTime: { faixa: string; total: number }[];
  pendentesPorTecnico: { tecnico: string; total: number }[];
  registradosPorDia: { data: string; total: number }[];
}

const STATUS_OPTS = ['pendente', 'confirmado', 'concluido', 'cancelado', 'reagendado'];
const CONF_OPTS = ['pre-agendado', 'confirmado', 'nao_confirmado'];

function MultiPopover({
  label, options, selected, onChange,
}: { label: string; options: string[]; selected: string[]; onChange: (v: string[]) => void }) {
  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter(s => s !== v) : [...selected, v]);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-3 w-3" /> {label}
          {selected.length > 0 && <Badge variant="secondary">{selected.length}</Badge>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="space-y-2 max-h-72 overflow-auto">
          {options.length === 0 && <div className="text-xs text-muted-foreground">Sem opções.</div>}
          {options.map(o => (
            <label key={o} className="flex items-center gap-2 cursor-pointer text-sm">
              <Checkbox checked={selected.includes(o)} onCheckedChange={() => toggle(o)} />
              <span className="capitalize">{o}</span>
            </label>
          ))}
          {selected.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => onChange([])}>Limpar</Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

const COLORS = ['hsl(var(--primary))', 'hsl(142 71% 45%)', 'hsl(38 92% 50%)', 'hsl(0 84% 60%)', 'hsl(262 83% 58%)', 'hsl(199 89% 48%)'];

export default function RelatorioVisaoGeralAgendamentos() {
  const [provedorIds, setProvedorIds] = useState<string[]>([]);
  const [preset, setPreset] = useState<Preset>('mes_atual');
  const initial = getPresetRange('mes_atual');
  const [dataInicio, setDataInicio] = useState(initial.ini);
  const [dataFim, setDataFim] = useState(initial.fim);
  const [status, setStatus] = useState<string[]>([]);
  const [confirmacao, setConfirmacao] = useState<string[]>([]);
  const [tipos, setTipos] = useState<string[]>([]);
  const [origens, setOrigens] = useState<string[]>([]);
  const [redes, setRedes] = useState<string[]>([]);
  const [reps, setReps] = useState<string[]>([]);
  const [tecnicoIds, setTecnicoIds] = useState<string[]>([]);

  const [applied, setApplied] = useState({
    provedorIds: [] as string[], dataInicio: initial.ini, dataFim: initial.fim,
    status: [] as string[], confirmacao: [] as string[], tipos: [] as string[],
    origens: [] as string[], redes: [] as string[], representantes: [] as string[],
    tecnicoIds: [] as string[], key: 0,
  });

  const { data: provedores } = useQuery({
    queryKey: ['central-provedores'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('central-operacional', { body: { action: 'listProvedores' } });
      if (error) throw error;
      return data.provedores as Provedor[];
    },
  });

  // Catálogos para filtros (RLS dá acesso por provedor; super_admin vê tudo)
  const { data: catTipos } = useQuery({
    queryKey: ['cat-tipos-agend'],
    queryFn: async () => (await supabase.from('catalogo_tipos_agendamento').select('codigo, nome').eq('ativo', true)).data || [],
  });
  const { data: catOrigens } = useQuery({
    queryKey: ['cat-origens'],
    queryFn: async () => (await supabase.from('catalogo_origem_vendas').select('nome').eq('ativo', true)).data || [],
  });
  const { data: catReps } = useQuery({
    queryKey: ['cat-reps'],
    queryFn: async () => (await supabase.from('catalogo_representantes').select('nome').eq('ativo', true)).data || [],
  });

  const { data: relatorio, isLoading, isFetching } = useQuery<Relatorio>({
    queryKey: ['central-relatorio-agendamentos', applied],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('central-operacional', {
        body: {
          action: 'relatorioVisaoGeralAgendamentos',
          provedorIds: applied.provedorIds.length ? applied.provedorIds : undefined,
          dataInicio: applied.dataInicio,
          dataFim: applied.dataFim,
          status: applied.status.length ? applied.status : undefined,
          confirmacao: applied.confirmacao.length ? applied.confirmacao : undefined,
          tipos: applied.tipos.length ? applied.tipos : undefined,
          origens: applied.origens.length ? applied.origens : undefined,
          redes: applied.redes.length ? applied.redes : undefined,
          representantes: applied.representantes.length ? applied.representantes : undefined,
          tecnicoIds: applied.tecnicoIds.length ? applied.tecnicoIds : undefined,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao gerar relatório');
      return data as Relatorio;
    },
  });

  // Opções dinâmicas (extraídas dos dados retornados quando catálogos não cobrirem)
  const opcoesRedes = useMemo(() => {
    const set = new Set<string>();
    relatorio?.porRede.forEach(r => r.chave && r.chave !== 'Não informado' && set.add(r.chave));
    return Array.from(set).sort();
  }, [relatorio]);

  const opcoesTecnicos = useMemo(() => {
    const set = new Set<string>();
    relatorio?.porTecnico.forEach(t => t.tecnico && set.add(t.tecnico));
    return Array.from(set).sort();
  }, [relatorio]);

  const handlePreset = (p: Preset) => {
    setPreset(p);
    if (p !== 'custom') {
      const r = getPresetRange(p);
      setDataInicio(r.ini); setDataFim(r.fim);
    }
  };

  const aplicar = () => {
    if (!dataInicio || !dataFim) { toast.error('Selecione um período'); return; }
    if (dataInicio > dataFim) { toast.error('Data inicial maior que final'); return; }
    setApplied({
      provedorIds, dataInicio, dataFim, status, confirmacao, tipos, origens, redes,
      representantes: reps, tecnicoIds, key: applied.key + 1,
    });
  };

  const toggleProv = (id: string) =>
    setProvedorIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);

  const k = relatorio?.kpis;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <CalendarRange className="h-7 w-7" />
        <div>
          <h1 className="text-3xl font-bold">Visão Geral de Agendamentos</h1>
          <p className="text-muted-foreground">Carga operacional, saúde da agenda e pendências.</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Filtros</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" /> Provedores
                  {provedorIds.length > 0 && <Badge variant="secondary">{provedorIds.length}</Badge>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72">
                <div className="space-y-2 max-h-72 overflow-auto">
                  {(provedores || []).map(p => (
                    <label key={p.id} className="flex items-center gap-2 cursor-pointer text-sm">
                      <Checkbox checked={provedorIds.includes(p.id)} onCheckedChange={() => toggleProv(p.id)} />
                      {p.nome}
                    </label>
                  ))}
                  {provedorIds.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setProvedorIds([])}>Limpar</Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <div className="flex flex-wrap gap-1">
              {([
                ['hoje', 'Hoje'], ['7d', '7 dias'], ['mes_atual', 'Mês atual'],
                ['mes_anterior', 'Mês anterior'], ['ano', 'Ano'], ['custom', 'Customizado'],
              ] as [Preset, string][]).map(([v, lbl]) => (
                <Button key={v} size="sm" variant={preset === v ? 'default' : 'outline'} onClick={() => handlePreset(v)}>{lbl}</Button>
              ))}
            </div>

            <div>
              <Label className="text-xs">Início</Label>
              <Input type="date" value={dataInicio} onChange={e => { setDataInicio(e.target.value); setPreset('custom'); }} />
            </div>
            <div>
              <Label className="text-xs">Fim</Label>
              <Input type="date" value={dataFim} onChange={e => { setDataFim(e.target.value); setPreset('custom'); }} />
            </div>

            <Button onClick={aplicar} disabled={isFetching}>
              {isFetching ? 'Carregando...' : 'Aplicar filtros'}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <MultiPopover label="Status" options={STATUS_OPTS} selected={status} onChange={setStatus} />
            <MultiPopover label="Confirmação" options={CONF_OPTS} selected={confirmacao} onChange={setConfirmacao} />
            <MultiPopover label="Tipo" options={(catTipos || []).map((t: any) => t.codigo)} selected={tipos} onChange={setTipos} />
            <MultiPopover label="Origem" options={(catOrigens || []).map((o: any) => o.nome)} selected={origens} onChange={setOrigens} />
            <MultiPopover label="Representante" options={(catReps || []).map((r: any) => r.nome)} selected={reps} onChange={setReps} />
            <MultiPopover label="Rede" options={opcoesRedes} selected={redes} onChange={setRedes} />
            <MultiPopover label="Técnico" options={opcoesTecnicos} selected={tecnicoIds} onChange={setTecnicoIds} />
          </div>
        </CardContent>
      </Card>

      {isLoading || !relatorio ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Carregando...</CardContent></Card>
      ) : (
        <>
          {/* Linha 1 - KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi titulo="Hoje" valor={k!.hoje} accent="text-blue-600" info="Total de agendamentos cuja data agendada é hoje, dentro dos filtros aplicados." />
            <Kpi titulo="Próximos 7 dias" valor={k!.proximos7Dias} accent="text-indigo-600" info="Agendamentos com data entre hoje e os próximos 7 dias (independente do período filtrado)." />
            <Kpi titulo="Pendentes" valor={k!.pendentes} accent="text-amber-600" info="Agendamentos com status 'pendente' no período filtrado — ainda não concluídos nem cancelados." />
            <Kpi titulo="Confirmados" valor={k!.confirmados} accent="text-emerald-600" info="Agendamentos cuja confirmação com o cliente está marcada como 'confirmado' no período." />
            <Kpi titulo="Concluídos" valor={k!.concluidos} accent="text-green-700" info="Agendamentos com status 'concluido' (instalação/serviço realizado) no período." />
            <Kpi titulo="Cancelados" valor={k!.cancelados} accent="text-red-600" info="Agendamentos com status 'cancelado' no período filtrado." />
            <Kpi titulo="Reprogramados" valor={k!.reprogramados} accent="text-orange-600" info="Quantidade de agendamentos distintos que tiveram pelo menos uma reprogramação registrada no período." />
            <Kpi titulo="Sem técnico" valor={k!.semTecnico} accent="text-slate-600" info="Agendamentos no período que ainda não possuem técnico responsável atribuído." />
          </div>

          {/* Registrados por dia (created_at) */}
          <ChartCard title="Agendamentos registrados por dia" info="Quantidade de agendamentos criados (data de cadastro / created_at) em cada dia do período filtrado.">
            {(!relatorio.registradosPorDia || relatorio.registradosPorDia.length === 0) ? <Empty/> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={relatorio.registradosPorDia}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="data" tickFormatter={d => formatLocalDate(d, { day: '2-digit', month: '2-digit' })} />
                  <YAxis allowDecimals={false} />
                  <Tooltip labelFormatter={d => formatLocalDate(String(d))} />
                  <Bar dataKey="total" name="Registrados" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Linha 2 - Carga operacional */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ChartCard title="Volume por dia" info="Quantidade total de agendamentos por data agendada, dentro do período e filtros aplicados.">
              {relatorio.serieTemporal.length === 0 ? <Empty/> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={relatorio.serieTemporal}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="data" tickFormatter={d => formatLocalDate(d, { day: '2-digit', month: '2-digit' })} />
                    <YAxis allowDecimals={false} />
                    <Tooltip labelFormatter={d => formatLocalDate(String(d))} />
                    <Bar dataKey="total" name="Total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
            <ChartCard title="Ocupação por slot" info="Quantos agendamentos foram alocados em cada número de vaga (slot) no período. Ajuda a identificar horários mais carregados.">
              {relatorio.ocupacaoPorSlot.length === 0 ? <Empty/> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={relatorio.ocupacaoPorSlot}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="slot" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="total" name="Agendamentos" fill="hsl(199 89% 48%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
            <ChartCard title="Agendamentos por técnico" info="Distribuição de agendamentos atribuídos a cada técnico no período, separando os pendentes dos concluídos. 'Sem técnico' agrupa os agendamentos sem responsável.">
              {relatorio.porTecnico.length === 0 ? <Empty/> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={relatorio.porTecnico} layout="vertical" margin={{ left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis type="category" dataKey="tecnico" width={100} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="pendentes" name="Pendentes" stackId="a" fill="hsl(38 92% 50%)" />
                    <Bar dataKey="concluidos" name="Concluídos" stackId="a" fill="hsl(142 71% 45%)" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          {/* Linha 3 - Saúde da agenda */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ChartCard title="Distribuição por status" info="Total de agendamentos agrupados pelo status (pendente, confirmado, concluído, cancelado, reagendado).">
              {relatorio.distribuicaoStatus.length === 0 ? <Empty/> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={relatorio.distribuicaoStatus}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
            <ChartCard title="Distribuição por confirmação" info="Total de agendamentos agrupados pelo estado de confirmação com o cliente (pré-agendado, confirmado, não confirmado).">
              {relatorio.distribuicaoConfirmacao.length === 0 ? <Empty/> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={relatorio.distribuicaoConfirmacao}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="confirmacao" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="total" fill="hsl(262 83% 58%)" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
            <ChartCard title="Cancelamentos e reprogramações ao longo do tempo" info="Série diária de cancelamentos (pela data agendada) e reprogramações (pela data em que foram registradas) no período.">
              {relatorio.cancelReprogTempo.length === 0 ? <Empty/> : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={relatorio.cancelReprogTempo}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="data" tickFormatter={d => formatLocalDate(d, { day: '2-digit', month: '2-digit' })} />
                    <YAxis allowDecimals={false} />
                    <Tooltip labelFormatter={d => formatLocalDate(String(d))} />
                    <Legend />
                    <Line type="monotone" dataKey="cancelados" name="Cancelados" stroke="hsl(0 84% 60%)" />
                    <Line type="monotone" dataKey="reprogramados" name="Reprogramados" stroke="hsl(38 92% 50%)" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          {/* Linha 4 - Origem e qualidade */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ChartCard title="Agendamentos por origem" info="Quantidade de agendamentos por canal de origem (ex.: site, indicação, parceiro). Valores em branco aparecem como 'Não informado'.">
              <BarHorizontal data={relatorio.porOrigem} color={COLORS[0]} />
            </ChartCard>
            <ChartCard title="Agendamentos por representante" info="Quantidade de agendamentos atribuídos a cada representante de vendas no período.">
              <BarHorizontal data={relatorio.porRepresentante} color={COLORS[1]} />
            </ChartCard>
            <ChartCard title="Agendamentos por rede" info="Quantidade de agendamentos por zona/lado da rede (mapeado a partir do campo 'rede' do agendamento).">
              <BarHorizontal data={relatorio.porRede} color={COLORS[4]} />
            </ChartCard>
          </div>

          {/* Linha 5 - Pendências */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ChartCard title="Aging de pendências" info="Distribuição dos agendamentos pendentes pelo tempo (em dias) desde a data agendada até hoje. Quanto mais à direita, mais antiga é a pendência.">
              {relatorio.agingPendencias.every(a => a.total === 0) ? <Empty/> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={relatorio.agingPendencias}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="faixa" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="total" fill="hsl(38 92% 50%)" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
            <ChartCard title="Tempo entre criação e data agendada" info="Distribuição do lead time: quantos dias se passam entre a criação do agendamento e a data marcada. Indica antecedência típica.">
              {relatorio.leadTime.every(a => a.total === 0) ? <Empty/> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={relatorio.leadTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="faixa" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="total" fill="hsl(199 89% 48%)" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
            <ChartCard title="Pendentes por técnico (inclui sem técnico)" info="Quantidade de agendamentos pendentes por técnico responsável. 'Sem técnico' agrupa pendências ainda não atribuídas.">
              <BarHorizontal data={relatorio.pendentesPorTecnico.map(p => ({ chave: p.tecnico, total: p.total }))} color={COLORS[3]} />
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ titulo, valor, accent, info }: { titulo: string; valor: number; accent?: string; info?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{titulo}</div>
          {info && (
            <TooltipProvider delayDuration={150}>
              <UITooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-muted-foreground hover:text-foreground transition-colors" aria-label={`Sobre ${titulo}`}>
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs">{info}</TooltipContent>
              </UITooltip>
            </TooltipProvider>
          )}
        </div>
        <div className={`text-3xl font-bold mt-1 ${accent || ''}`}>{(valor || 0).toLocaleString('pt-BR')}</div>
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, info, children }: { title: string; info?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between gap-2">
          <span>{title}</span>
          {info && (
            <TooltipProvider delayDuration={150}>
              <UITooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-muted-foreground hover:text-foreground transition-colors" aria-label={`Sobre ${title}`}>
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs">{info}</TooltipContent>
              </UITooltip>
            </TooltipProvider>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent style={{ height: 280 }}>{children}</CardContent>
    </Card>
  );
}

function Empty() {
  return <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Sem dados no período.</div>;
}

function BarHorizontal({ data, color }: { data: { chave: string; total: number }[]; color: string }) {
  if (!data || data.length === 0) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" allowDecimals={false} />
        <YAxis type="category" dataKey="chave" width={100} />
        <Tooltip />
        <Bar dataKey="total" fill={color} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
