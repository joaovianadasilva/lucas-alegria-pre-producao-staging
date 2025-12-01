import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Lock, Unlock } from 'lucide-react';

interface SlotDate {
  data_disponivel: string;
  slots: { [key: number]: string | null };
}

export function AdminSlots() {
  const queryClient = useQueryClient();
  const [newDate, setNewDate] = useState('');

  const { data: dates, isLoading } = useQuery({
    queryKey: ['admin-slots'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-slots', {
        body: { action: 'getDatesAndSlots' }
      });

      if (error) throw error;

      if (data?.success) {
        const datesArray: SlotDate[] = Object.entries(data.data).map(([date, slots]) => ({
          data_disponivel: date,
          slots: slots as { [key: number]: string | null }
        }));
        return datesArray.sort((a, b) => a.data_disponivel.localeCompare(b.data_disponivel));
      }
      return [];
    },
  });

  const addDateMutation = useMutation({
    mutationFn: async (date: string) => {
      const { data, error } = await supabase.functions.invoke('manage-slots', {
        body: { 
          action: 'createSlotDate',
          data: { dataDisponivel: date }
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-slots'] });
      toast.success('Data adicionada com sucesso!');
      setNewDate('');
    },
    onError: (error: any) => {
      toast.error('Erro ao adicionar data: ' + error.message);
    },
  });

  const blockSlotMutation = useMutation({
    mutationFn: async ({ date, slotNumber }: { date: string; slotNumber: number }) => {
      const { data, error } = await supabase.functions.invoke('manage-slots', {
        body: { 
          action: 'blockSlot',
          data: { dataDisponivel: date, slotNumero: slotNumber }
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-slots'] });
      toast.success('Vaga bloqueada');
    },
    onError: (error: any) => {
      toast.error('Erro ao bloquear vaga: ' + error.message);
    },
  });

  const releaseSlotMutation = useMutation({
    mutationFn: async ({ date, slotNumber }: { date: string; slotNumber: number }) => {
      const { data, error } = await supabase.functions.invoke('manage-slots', {
        body: { 
          action: 'releaseSlot',
          data: { dataDisponivel: date, slotNumero: slotNumber }
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-slots'] });
      toast.success('Vaga liberada');
    },
    onError: (error: any) => {
      toast.error('Erro ao liberar vaga: ' + error.message);
    },
  });

  const getSlotStatus = (slotValue: string | null) => {
    if (slotValue === null) return 'available';
    if (slotValue === '-') return 'blocked';
    return 'occupied';
  };

  const handleAddDate = () => {
    if (!newDate) {
      toast.error('Selecione uma data');
      return;
    }
    addDateMutation.mutate(newDate);
  };

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Adicionar Nova Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <Button 
              onClick={handleAddDate} 
              disabled={addDateMutation.isPending || !newDate}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Datas Disponíveis</h3>
        {dates?.length === 0 && (
          <p className="text-muted-foreground">Nenhuma data cadastrada</p>
        )}
        
        {dates?.map((dateItem) => (
          <Card key={dateItem.data_disponivel}>
            <CardHeader>
              <CardTitle className="text-base">
                {format(new Date(dateItem.data_disponivel + 'T00:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((slotNum) => {
                  const status = getSlotStatus(dateItem.slots[slotNum]);
                  return (
                    <div
                      key={slotNum}
                      className={`p-3 border rounded-lg text-center ${
                        status === 'available'
                          ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
                          : status === 'blocked'
                          ? 'bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-800'
                          : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
                      }`}
                    >
                      <div className="text-sm font-medium mb-2">Vaga {slotNum}</div>
                      <div className="text-xs mb-2">
                        {status === 'available' && 'Disponível'}
                        {status === 'blocked' && 'Bloqueado'}
                        {status === 'occupied' && 'Ocupado'}
                      </div>
                      {status === 'available' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => blockSlotMutation.mutate({ date: dateItem.data_disponivel, slotNumber: slotNum })}
                          disabled={blockSlotMutation.isPending}
                        >
                          <Lock className="h-3 w-3" />
                        </Button>
                      )}
                      {status === 'blocked' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => releaseSlotMutation.mutate({ date: dateItem.data_disponivel, slotNumber: slotNum })}
                          disabled={releaseSlotMutation.isPending}
                        >
                          <Unlock className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
