import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar, Clock, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatLocalDate, toISODateString } from '@/lib/dateUtils';
import { useAuth } from '@/contexts/AuthContext';

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


export function CalendarSlotPicker({ onSlotSelect, selectedDate, selectedSlot }: CalendarSlotPickerProps) {
  const { provedorAtivo } = useAuth();
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
          provedorId: provedorAtivo?.id,
          data: {
            dataInicio: dateRange.startDate,
            dataFim: dateRange.endDate,
          },
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
              <div className="flex flex-wrap gap-1 mt-auto">
                {counts.disponivel > 0 && (
                  <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-500 text-white">
                    {counts.disponivel}
                  </span>
                )}
                {counts.ocupado > 0 && (
                  <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-500 text-black">
                    {counts.ocupado}
                  </span>
                )}
                {counts.bloqueado > 0 && (
                  <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-900 text-white">
                    {counts.bloqueado}
                  </span>
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
                    variant={slot.status === 'disponivel' && !isSelected ? "outline" : "default"}
                    disabled={slot.status !== 'disponivel'}
                    onClick={() => handleSlotClick(viewingDate, slot.slot_numero)}
                    className={cn(
                      "h-auto py-3 flex flex-col gap-1",
                      slot.status === 'disponivel' && !isSelected && "border-green-500 border-2 hover:bg-green-50",
                      slot.status === 'disponivel' && isSelected && "bg-green-500 text-white hover:bg-green-600",
                      slot.status === 'ocupado' && "bg-yellow-500 text-black hover:bg-yellow-500 cursor-not-allowed",
                      slot.status === 'bloqueado' && "bg-gray-900 text-white hover:bg-gray-900 cursor-not-allowed"
                    )}
                  >
                    {isSelected && <CheckCircle className="h-4 w-4" />}
                    <span className="font-semibold">Vaga {slot.slot_numero}</span>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[10px] px-2 py-0",
                        slot.status === 'disponivel' && "bg-green-100 text-green-800",
                        slot.status === 'ocupado' && "bg-yellow-100 text-yellow-800",
                        slot.status === 'bloqueado' && "bg-gray-700 text-white"
                      )}
                    >
                      {slot.status === 'disponivel' && 'Disponível'}
                      {slot.status === 'ocupado' && 'Ocupado'}
                      {slot.status === 'bloqueado' && 'Bloqueado'}
                    </Badge>
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
          <div className="space-y-2 mt-2">
            <p className="text-sm text-muted-foreground text-center">
              Clique em um dia com horários disponíveis
            </p>
            <div className="flex items-center justify-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-green-500"></span>
                <span>Disponível</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-yellow-500"></span>
                <span>Ocupado</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-gray-900"></span>
                <span>Bloqueado</span>
              </span>
            </div>
          </div>
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
                    {formatLocalDate(selectedDate)} - Vaga {selectedSlot}
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
