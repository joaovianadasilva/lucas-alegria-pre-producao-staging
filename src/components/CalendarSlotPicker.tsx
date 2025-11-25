import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar, Clock, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatLocalDate, toISODateString } from '@/lib/dateUtils';

interface CalendarSlotPickerProps {
  onSlotSelect: (date: string, slot: number) => void;
  selectedDate?: string;
  selectedSlot?: number;
}

interface Slot {
  id: string;
  data_disponivel: string;
  slot_numero: number;
  status: string;
  agendamento_id: string | null;
}

const SLOT_LABELS = [
  '8:00 - 9:00',
  '9:00 - 10:00',
  '10:00 - 11:00',
  '11:00 - 12:00',
  '13:00 - 14:00',
  '14:00 - 15:00',
  '15:00 - 16:00',
  '16:00 - 17:00',
  '17:00 - 18:00',
  '18:00 - 19:00',
];

export function CalendarSlotPicker({ onSlotSelect, selectedDate, selectedSlot }: CalendarSlotPickerProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewingDate, setViewingDate] = useState<string | null>(null);

  // Calculate date range for current month
  const dateRange = useMemo(() => {
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    return {
      startDate: toISODateString(start),
      endDate: toISODateString(end),
    };
  }, [currentDate]);

  // Fetch slots for the current month
  const { data: slotsData, isLoading } = useQuery({
    queryKey: ['calendar-slots-picker', dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-slots', {
        body: {
          action: 'getCalendarSlots',
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao carregar slots');

      return data.data as Record<string, Slot[]>;
    },
  });

  const handleNavigate = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
    setViewingDate(null);
  };

  const getSlotsByDate = (date: string): Slot[] => {
    return slotsData?.[date] || [];
  };

  const getStatusCounts = (date: string) => {
    const slots = getSlotsByDate(date);
    const disponivel = slots.filter(s => s.status === 'disponivel').length;
    const ocupado = slots.filter(s => s.status === 'ocupado').length;
    const bloqueado = slots.filter(s => s.status === 'bloqueado').length;
    return { disponivel, ocupado, bloqueado, total: slots.length };
  };

  const handleSlotClick = (date: string, slot: number) => {
    onSlotSelect(date, slot);
    setViewingDate(null);
  };

  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 border border-border/50" />);
    }

    const today = toISODateString(new Date());

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = toISODateString(date);
      const counts = getStatusCounts(dateStr);
      const isPast = dateStr < today;
      const hasSlots = counts.total > 0;
      const hasAvailable = counts.disponivel > 0;

      days.push(
        <div
          key={day}
          onClick={() => hasAvailable && !isPast && setViewingDate(dateStr)}
          className={cn(
            "h-24 border border-border/50 p-2 transition-colors",
            hasAvailable && !isPast && "cursor-pointer hover:bg-accent/50",
            isPast && "bg-muted/30",
            viewingDate === dateStr && "ring-2 ring-primary"
          )}
        >
          <div className="flex flex-col h-full">
            <span className={cn(
              "text-sm font-medium mb-1",
              isPast && "text-muted-foreground"
            )}>
              {day}
            </span>
            {hasSlots && (
              <div className="flex flex-col gap-0.5 text-xs">
                {counts.disponivel > 0 && (
                  <Badge variant="default" className="text-xs py-0 h-5">
                    {counts.disponivel} livre{counts.disponivel !== 1 ? 's' : ''}
                  </Badge>
                )}
                {counts.ocupado > 0 && (
                  <Badge variant="destructive" className="text-xs py-0 h-5">
                    {counts.ocupado} ocupado{counts.ocupado !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-7 gap-0">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
          <div key={day} className="h-10 flex items-center justify-center font-semibold text-sm bg-muted">
            {day}
          </div>
        ))}
        {days}
      </div>
    );
  };

  const renderSlotsPanel = () => {
    if (!viewingDate) return null;

    const slots = getSlotsByDate(viewingDate);
    const availableSlots = slots.filter(s => s.status === 'disponivel');

    return (
      <Card className="mt-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5" />
              {formatLocalDate(viewingDate, { weekday: 'long', day: '2-digit', month: 'long' })}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setViewingDate(null)}>
              Fechar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {availableSlots.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Nenhum horário disponível para esta data
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {slots.map((slot) => {
                const isAvailable = slot.status === 'disponivel';
                const isSelected = selectedDate === viewingDate && selectedSlot === slot.slot_numero;

                return (
                  <Button
                    key={slot.id}
                    variant={isSelected ? 'default' : 'outline'}
                    disabled={!isAvailable}
                    onClick={() => isAvailable && handleSlotClick(viewingDate, slot.slot_numero)}
                    className={cn(
                      "h-auto py-3 flex flex-col gap-1",
                      isAvailable && "hover:bg-primary/10",
                      !isAvailable && "opacity-40 cursor-not-allowed"
                    )}
                  >
                    {isSelected && <CheckCircle className="h-4 w-4" />}
                    <span className="font-semibold">Slot {slot.slot_numero}</span>
                    <span className="text-xs">{SLOT_LABELS[slot.slot_numero - 1]}</span>
                    <span className="text-xs">
                      {slot.status === 'disponivel' && 'Disponível'}
                      {slot.status === 'ocupado' && 'Ocupado'}
                      {slot.status === 'bloqueado' && 'Bloqueado'}
                    </span>
                  </Button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Carregando calendário...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => handleNavigate('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => handleNavigate('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground text-center mt-2">
            Clique em um dia com horários disponíveis
          </p>
        </CardHeader>
        <CardContent>{renderMonthView()}</CardContent>
      </Card>

      {renderSlotsPanel()}

      {selectedDate && selectedSlot && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-semibold">Agendamento selecionado</p>
                  <p className="text-sm text-muted-foreground">
                    {formatLocalDate(selectedDate)} - Slot {selectedSlot} ({SLOT_LABELS[selectedSlot - 1]})
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
