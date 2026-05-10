import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Plus, X, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Condition, Operator, OPERATORS, FieldDef, PRESETS, getPresetRange,
} from './dateConditionUtils';

interface Props {
  value: Condition[];
  onChange: (next: Condition[]) => void;
  fields: FieldDef[];
}

const newId = () => Math.random().toString(36).slice(2, 10);

const fmtBR = (s?: string) => {
  if (!s) return '';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
};

const toISO = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const parseISO = (s?: string) => {
  if (!s) return undefined;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export function DateConditionBuilder({ value, onChange, fields }: Props) {
  const update = (id: string, patch: Partial<Condition>) =>
    onChange(value.map(c => c.id === id ? { ...c, ...patch } : c));

  const remove = (id: string) => onChange(value.filter(c => c.id !== id));

  const add = () => onChange([
    ...value,
    {
      id: newId(),
      field: fields[0]?.key || 'created_at',
      operator: 'between',
      connector: 'AND',
    },
  ]);

  if (value.length === 0) {
    return (
      <button
        type="button"
        onClick={add}
        className="group flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/60 hover:text-foreground"
      >
        <CalendarIcon className="h-4 w-4" />
        <span className="font-medium">Adicionar filtro de data</span>
        <span className="text-xs opacity-70">— combine condições com E/OU</span>
      </button>
    );
  }

  return (
    <div className="space-y-2">
      {value.map((c, idx) => (
        <div key={c.id} className="space-y-2">
          {idx > 0 && (
            <div className="flex items-center gap-2 pl-2">
              <div className="h-px flex-1 bg-border" />
              <button
                type="button"
                onClick={() => update(c.id, { connector: c.connector === 'AND' ? 'OR' : 'AND' })}
                className={cn(
                  'rounded-md px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide transition-colors',
                  c.connector === 'AND'
                    ? 'bg-primary/15 text-primary hover:bg-primary/25'
                    : 'bg-amber-500/15 text-amber-600 hover:bg-amber-500/25 dark:text-amber-400'
                )}
                title="Clique para alternar entre E / OU"
              >
                {c.connector === 'AND' ? 'E' : 'OU'}
              </button>
              <div className="h-px flex-1 bg-border" />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-2 shadow-sm">
            <Select value={c.field} onValueChange={v => update(c.id, { field: v })}>
              <SelectTrigger className="h-9 w-[210px]">
                <CalendarIcon className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fields.map(f => (
                  <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={c.operator}
              onValueChange={v => update(c.id, {
                operator: v as Operator,
                from: undefined, to: undefined, value: undefined,
              })}
            >
              <SelectTrigger className="h-9 w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPERATORS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <ValueInput condition={c} onUpdate={(p) => update(c.id, p)} />

            <div className="ml-auto">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => remove(c.id)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}

      <div className="flex items-center gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={add} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Adicionar condição
        </Button>
        {value.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => onChange([])} className="gap-1.5 text-muted-foreground">
            <Trash2 className="h-3.5 w-3.5" />
            Limpar tudo
          </Button>
        )}
      </div>
    </div>
  );
}

function ValueInput({ condition, onUpdate }: { condition: Condition; onUpdate: (p: Partial<Condition>) => void }) {
  const [open, setOpen] = useState(false);

  if (condition.operator === 'is_set' || condition.operator === 'is_empty') {
    return <span className="px-2 text-xs text-muted-foreground">— sem valor —</span>;
  }

  if (condition.operator === 'between') {
    const label = condition.from || condition.to
      ? `${fmtBR(condition.from) || '…'} → ${fmtBR(condition.to) || '…'}`
      : 'Selecionar período';
    const range = condition.from || condition.to
      ? { from: parseISO(condition.from), to: parseISO(condition.to) }
      : undefined;

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={cn('h-9 justify-start gap-2 font-normal', !range && 'text-muted-foreground')}>
            <CalendarIcon className="h-3.5 w-3.5" />
            {label}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            <div className="flex w-32 flex-col gap-1 border-r p-2">
              <div className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Atalhos</div>
              {PRESETS.map(p => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => {
                    const r = getPresetRange(p.key);
                    onUpdate({ from: r.from, to: r.to });
                  }}
                  className="rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent"
                >
                  {p.label}
                </button>
              ))}
            </div>
            <Calendar
              mode="range"
              selected={range as any}
              onSelect={(r: any) => {
                onUpdate({
                  from: r?.from ? toISO(r.from) : undefined,
                  to: r?.to ? toISO(r.to) : undefined,
                });
              }}
              numberOfMonths={2}
              initialFocus
              className={cn('p-3 pointer-events-auto')}
            />
          </div>
          <div className="flex justify-end gap-2 border-t p-2">
            <Button variant="ghost" size="sm" onClick={() => onUpdate({ from: undefined, to: undefined })}>Limpar</Button>
            <Button size="sm" onClick={() => setOpen(false)}>Aplicar</Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Single date (eq / gt / lt)
  const selected = parseISO(condition.value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn('h-9 justify-start gap-2 font-normal', !selected && 'text-muted-foreground')}>
          <CalendarIcon className="h-3.5 w-3.5" />
          {selected ? fmtBR(condition.value) : 'Selecionar data'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(d) => {
            onUpdate({ value: d ? toISO(d) : undefined });
            setOpen(false);
          }}
          initialFocus
          className={cn('p-3 pointer-events-auto')}
        />
      </PopoverContent>
    </Popover>
  );
}
