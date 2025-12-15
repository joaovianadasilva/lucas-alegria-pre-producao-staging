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


export function SlotSelectorForDate({ selectedDate, selectedSlot, onSlotSelect }: SlotSelectorForDateProps) {
  const { data: slotsData, isLoading } = useQuery({
    queryKey: ['slots-for-date', selectedDate],
    queryFn: async () => {
      if (!selectedDate) return null;

      const { data, error } = await supabase
        .from('slots')
        .select('*')
        .eq('data_disponivel', selectedDate)
        .order('slot_numero', { ascending: true });

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

  if (!slotsData || slotsData.length === 0) {
    return (
      <div className="text-sm text-destructive">
        Não há vagas configuradas para esta data
      </div>
    );
  }

  const getSlotStatus = (slotNum: number): 'available' | 'occupied' | 'blocked' => {
    const slot = slotsData.find(s => s.slot_numero === slotNum);
    
    if (!slot) return 'blocked'; // Slot não existe = bloqueado
    if (slot.status === 'disponivel') return 'available';
    if (slot.status === 'bloqueado') return 'blocked';
    return 'occupied';
  };

  // Obter todos os números de slots disponíveis
  const slotNumbers = slotsData.map(s => s.slot_numero).sort((a, b) => a - b);
  const maxSlot = Math.max(...slotNumbers, 10); // Garantir mínimo de 10

  return (
    <div className="space-y-2">
      <Label>Selecione a vaga</Label>
      <div className="max-h-[300px] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: maxSlot }, (_, i) => i + 1).map((slotNum) => {
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
                  <div className="font-semibold">Vaga {slotNum}</div>
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
      </div>
      <div className="text-xs text-muted-foreground mt-2">
        Selecione uma vaga disponível para o reagendamento
      </div>
    </div>
  );
}
