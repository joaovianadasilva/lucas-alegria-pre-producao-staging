import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreateSlotsDialog } from './CreateSlotsDialog';
import { SlotDetailDialog } from './SlotDetailDialog';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, addDays, startOfWeek, endOfWeek, isSameMonth, isSameDay, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Slot {
  id: string;
  data_disponivel: string;
  slot_numero: number;
  status: string;
  agendamento_id: string | null;
  observacao: string | null;
  agendamentos?: {
    id: string;
    nome_cliente: string;
    email_cliente: string;
    tipo: string;
    status: string;
  };
}

interface SlotStats {
  proxima_vaga: {
    data: string;
    quantidade: number;
  } | null;
  total_disponiveis: number;
  total_ocupados: number;
  total_bloqueados: number;
}

type ViewMode = 'day' | 'week' | 'month';

export function CalendarSlots() {
  const { provedorAtivo } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewMode>('week');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // Calcular período baseado na visualização
  const getDateRange = () => {
    let start, end;

    switch (view) {
      case 'day':
        start = format(currentDate, 'yyyy-MM-dd');
        end = start;
        break;
      case 'week':
        start = format(startOfWeek(currentDate, { locale: ptBR }), 'yyyy-MM-dd');
        end = format(endOfWeek(currentDate, { locale: ptBR }), 'yyyy-MM-dd');
        break;
      case 'month':
        start = format(startOfMonth(currentDate), 'yyyy-MM-dd');
        end = format(endOfMonth(currentDate), 'yyyy-MM-dd');
        break;
    }

    return { start, end };
  };

  const { start, end } = getDateRange();

  // Buscar slots
  const { data: slots, isLoading, refetch } = useQuery({
    queryKey: ['calendar-slots', start, end],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-slots', {
        body: {
          action: 'getCalendarSlots',
          provedorId: provedorAtivo?.id,
          data: {
            dataInicio: start,
            dataFim: end
          }
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      return data.data as { [date: string]: Slot[] };
    },
  });

  // Buscar estatísticas
  const { data: stats } = useQuery({
    queryKey: ['slots-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-slots', {
        body: { action: 'getSlotsStats', provedorId: provedorAtivo?.id }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      return data.data as SlotStats;
    },
  });

  const handleSlotClick = (slot: Slot) => {
    setSelectedSlot(slot);
    setDetailDialogOpen(true);
  };

  const handleNavigate = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setCurrentDate(new Date());
    } else if (direction === 'prev') {
      switch (view) {
        case 'day':
          setCurrentDate(addDays(currentDate, -1));
          break;
        case 'week':
          setCurrentDate(addDays(currentDate, -7));
          break;
        case 'month':
          setCurrentDate(subMonths(currentDate, 1));
          break;
      }
    } else {
      switch (view) {
        case 'day':
          setCurrentDate(addDays(currentDate, 1));
          break;
        case 'week':
          setCurrentDate(addDays(currentDate, 7));
          break;
        case 'month':
          setCurrentDate(addMonths(currentDate, 1));
          break;
      }
    }
  };

  const getSlotsByDate = (date: Date): Slot[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return slots?.[dateStr] || [];
  };

  const getStatusCounts = (dateSlots: Slot[]) => {
    return {
      disponivel: dateSlots.filter(s => s.status === 'disponivel').length,
      bloqueado: dateSlots.filter(s => s.status === 'bloqueado').length,
      ocupado: dateSlots.filter(s => s.status === 'ocupado').length,
    };
  };

  const renderDayView = () => {
    const daySlots = getSlotsByDate(currentDate);

    return (
      <div className="space-y-2">
        <h3 className="font-semibold text-lg">
          {format(currentDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          {daySlots.length === 0 ? (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              Nenhuma vaga configurada para este dia
            </div>
          ) : (
            daySlots.map((slot) => (
              <SlotCard key={slot.id} slot={slot} onClick={() => handleSlotClick(slot)} />
            ))
          )}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { locale: ptBR });
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => {
            const daySlots = getSlotsByDate(day);
            const counts = getStatusCounts(daySlots);
            const isCurrentMonth = isSameMonth(day, currentDate);

            return (
              <div
                key={day.toString()}
                className={`border rounded-lg p-2 min-h-[200px] ${
                  isToday(day) ? 'bg-primary/5 border-primary' : ''
                } ${!isCurrentMonth ? 'opacity-50' : ''}`}
              >
                <div className="text-center mb-2">
                  <div className="text-xs font-medium text-muted-foreground">
                    {format(day, 'EEE', { locale: ptBR })}
                  </div>
                  <div className={`text-lg font-bold ${isToday(day) ? 'text-primary' : ''}`}>
                    {format(day, 'dd')}
                  </div>
                </div>

                <div className="space-y-1">
                  {daySlots.slice(0, 5).map((slot) => (
                    <div
                      key={slot.id}
                      onClick={() => handleSlotClick(slot)}
                      className={`text-xs p-1 rounded cursor-pointer hover:opacity-80 ${
                        slot.status === 'disponivel'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                          : slot.status === 'bloqueado'
                          ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
                      }`}
                    >
                      #{slot.slot_numero}
                      {slot.agendamentos && (
                        <div className="truncate text-[10px]">
                          {slot.agendamentos.nome_cliente.split(' ')[0]}
                        </div>
                      )}
                    </div>
                  ))}
                  {daySlots.length > 5 && (
                    <div className="text-xs text-center text-muted-foreground">
                      +{daySlots.length - 5} mais
                    </div>
                  )}
                </div>

                {daySlots.length > 0 && (
                  <div className="mt-2 pt-2 border-t text-[10px] space-y-0.5">
                    {counts.disponivel > 0 && (
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        {counts.disponivel}
                      </div>
                    )}
                    {counts.ocupado > 0 && (
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-yellow-500" />
                        {counts.ocupado}
                      </div>
                    )}
                    {counts.bloqueado > 0 && (
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-gray-500" />
                        {counts.bloqueado}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { locale: ptBR });
    const endDate = endOfWeek(monthEnd, { locale: ptBR });

    const days: Date[] = [];
    let day = startDate;
    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }

    return (
      <div className="space-y-2">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground p-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const daySlots = getSlotsByDate(day);
            const counts = getStatusCounts(daySlots);
            const isCurrentMonth = isSameMonth(day, currentDate);

            return (
              <div
                key={day.toString()}
                className={`border rounded p-2 min-h-[80px] ${
                  isToday(day) ? 'bg-primary/5 border-primary' : ''
                } ${!isCurrentMonth ? 'opacity-30' : ''}`}
              >
                <div className={`text-sm font-medium mb-1 ${isToday(day) ? 'text-primary' : ''}`}>
                  {format(day, 'd')}
                </div>

                {daySlots.length > 0 && (
                  <div className="space-y-0.5">
                    <div className="flex gap-1 flex-wrap">
                      {counts.disponivel > 0 && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                          {counts.disponivel}
                        </Badge>
                      )}
                      {counts.ocupado > 0 && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
                          {counts.ocupado}
                        </Badge>
                      )}
                      {counts.bloqueado > 0 && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100">
                          {counts.bloqueado}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com navegação */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => handleNavigate('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => handleNavigate('today')}>
            Hoje
          </Button>
          <Button variant="outline" size="icon" onClick={() => handleNavigate('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="ml-4 text-lg font-semibold">
            {format(currentDate, view === 'day' ? "dd 'de' MMMM 'de' yyyy" : "MMMM 'de' yyyy", {
              locale: ptBR,
            })}
          </span>
        </div>

        <div className="flex gap-2">
          <Button
            variant={view === 'day' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('day')}
          >
            Dia
          </Button>
          <Button
            variant={view === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('week')}
          >
            Semana
          </Button>
          <Button
            variant={view === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('month')}
          >
            Mês
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Vagas
          </Button>
        </div>
      </div>

      {/* Card informativo */}
      {stats && stats.proxima_vaga && (
        <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <CalendarIcon className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Próxima vaga disponível</p>
                <p className="text-lg font-semibold">
                  {format(new Date(stats.proxima_vaga.data + 'T00:00:00'), "EEEE, dd 'de' MMMM", {
                    locale: ptBR,
                  })}
                </p>
                <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                  <span>🟢 {stats.total_disponiveis} disponíveis</span>
                  <span>🟡 {stats.total_ocupados} ocupados</span>
                  <span>⚫ {stats.total_bloqueados} bloqueados</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Renderizar visualização */}
      <Card>
        <CardContent className="pt-6">
          {view === 'day' && renderDayView()}
          {view === 'week' && renderWeekView()}
          {view === 'month' && renderMonthView()}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CreateSlotsDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => refetch()}
      />
      <SlotDetailDialog
        slot={selectedSlot}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onSuccess={() => refetch()}
      />
    </div>
  );
}

// Componente auxiliar para card de slot
function SlotCard({ slot, onClick }: { slot: Slot; onClick: () => void }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'disponivel':
        return 'bg-green-100 border-green-200 hover:bg-green-200 dark:bg-green-900 dark:border-green-800';
      case 'bloqueado':
        return 'bg-gray-100 border-gray-200 hover:bg-gray-200 dark:bg-gray-800 dark:border-gray-700';
      case 'ocupado':
        return 'bg-yellow-100 border-yellow-200 hover:bg-yellow-200 dark:bg-yellow-900 dark:border-yellow-800';
      default:
        return '';
    }
  };

  return (
    <div
      onClick={onClick}
      className={`p-3 border rounded-lg cursor-pointer transition-colors ${getStatusColor(
        slot.status
      )}`}
    >
      <div className="text-sm font-medium mb-1">Vaga {slot.slot_numero}</div>
      {slot.agendamentos && (
        <div className="text-xs truncate">{slot.agendamentos.nome_cliente}</div>
      )}
      {!slot.agendamentos && (
        <div className="text-xs text-muted-foreground capitalize">{slot.status}</div>
      )}
    </div>
  );
}
