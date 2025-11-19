import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface SlotSelectorForDateProps {
  selectedDate: string;
  selectedSlot: number | null;
  onSlotSelect: (slot: number) => void;
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

export function SlotSelectorForDate({ selectedDate, selectedSlot, onSlotSelect }: SlotSelectorForDateProps) {
  const { data: slotsData, isLoading } = useQuery({
    queryKey: ['slots-for-date', selectedDate],
    queryFn: async () => {
      if (!selectedDate) return null;

      const { data, error } = await supabase
        .from('slots_disponiveis')
        .select('*')
        .eq('data_disponivel', selectedDate)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!selectedDate,
  });

  if (!selectedDate) {
    return (
      <div className="text-sm text-muted-foreground">
        Selecione uma data primeiro
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!slotsData) {
    return (
      <div className="text-sm text-destructive">
        Não há slots configurados para esta data
      </div>
    );
  }

  const getSlotStatus = (slotNum: number): 'available' | 'occupied' | 'blocked' => {
    const slotValue = slotsData[`slot_${slotNum}` as keyof typeof slotsData];
    
    if (!slotValue || slotValue === null) return 'available';
    if (slotValue === '-') return 'blocked';
    return 'occupied';
  };

  return (
    <div className="space-y-2">
      <Label>Selecione o horário</Label>
      <div className="grid grid-cols-2 gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((slotNum) => {
          const status = getSlotStatus(slotNum);
          const isSelected = selectedSlot === slotNum;
          const isDisabled = status !== 'available';

          return (
            <Button
              key={slotNum}
              variant={isSelected ? 'default' : 'outline'}
              disabled={isDisabled}
              onClick={() => onSlotSelect(slotNum)}
              className={`w-full ${
                status === 'occupied' 
                  ? 'opacity-50 cursor-not-allowed' 
                  : status === 'blocked'
                  ? 'opacity-30 cursor-not-allowed'
                  : ''
              }`}
            >
              <div className="text-center">
                <div className="font-semibold">Slot {slotNum}</div>
                <div className="text-xs">
                  {SLOT_LABELS[slotNum - 1]}
                </div>
                {status === 'occupied' && (
                  <div className="text-xs text-muted-foreground">Ocupado</div>
                )}
                {status === 'blocked' && (
                  <div className="text-xs text-muted-foreground">Bloqueado</div>
                )}
              </div>
            </Button>
          );
        })}
      </div>
      <div className="text-xs text-muted-foreground mt-2">
        Selecione um horário disponível para o reagendamento
      </div>
    </div>
  );
}
