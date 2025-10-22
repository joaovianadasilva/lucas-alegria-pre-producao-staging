import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, Plus, Lock, Unlock, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AdminSlotsProps {
  open: boolean;
  onClose: () => void;
}

interface SlotDate {
  data_disponivel: string;
  slots: { [key: number]: string | null };
}

export const AdminSlots = ({ open, onClose }: AdminSlotsProps) => {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dates, setDates] = useState<SlotDate[]>([]);
  const [newDate, setNewDate] = useState('');

  const handleLogin = () => {
    if (password === 'admin123') {
      setAuthenticated(true);
      loadDates();
    } else {
      toast.error('Senha incorreta');
    }
  };

  const loadDates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-slots', {
        body: { action: 'getDatesAndSlots' }
      });

      if (error) throw error;

      if (data?.success) {
        const datesArray: SlotDate[] = Object.entries(data.data).map(([date, slots]) => ({
          data_disponivel: date,
          slots: slots as { [key: number]: string | null }
        }));
        setDates(datesArray.sort((a, b) => a.data_disponivel.localeCompare(b.data_disponivel)));
      }
    } catch (error) {
      console.error('Erro ao carregar datas:', error);
      toast.error('Erro ao carregar datas');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDate = async () => {
    if (!newDate) {
      toast.error('Selecione uma data');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-slots', {
        body: { 
          action: 'createSlotDate',
          data: { dataDisponivel: newDate }
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Data adicionada com sucesso!');
        setNewDate('');
        loadDates();
      }
    } catch (error) {
      console.error('Erro ao adicionar data:', error);
      toast.error('Erro ao adicionar data');
    } finally {
      setLoading(false);
    }
  };

  const handleBlockSlot = async (date: string, slotNumber: number) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-slots', {
        body: { 
          action: 'blockSlot',
          data: { dataDisponivel: date, slotNumero: slotNumber }
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Slot bloqueado');
        loadDates();
      }
    } catch (error) {
      console.error('Erro ao bloquear slot:', error);
      toast.error('Erro ao bloquear slot');
    } finally {
      setLoading(false);
    }
  };

  const handleReleaseSlot = async (date: string, slotNumber: number) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-slots', {
        body: { 
          action: 'releaseSlot',
          data: { dataDisponivel: date, slotNumero: slotNumber }
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Slot liberado');
        loadDates();
      }
    } catch (error) {
      console.error('Erro ao liberar slot:', error);
      toast.error('Erro ao liberar slot');
    } finally {
      setLoading(false);
    }
  };

  const getSlotStatus = (slotValue: string | null) => {
    if (slotValue === null) return 'available';
    if (slotValue === '-') return 'blocked';
    return 'occupied';
  };

  const handleClose = () => {
    setAuthenticated(false);
    setPassword('');
    setDates([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Administração de Slots
          </DialogTitle>
        </DialogHeader>

        {!authenticated ? (
          <div className="space-y-4 p-4">
            <div className="space-y-2">
              <Label htmlFor="password">Senha de Administrador</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="Digite a senha"
              />
            </div>
            <Button onClick={handleLogin} className="w-full">
              Entrar
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Adicionar Nova Data</CardTitle>
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
                  <Button onClick={handleAddDate} disabled={loading || !newDate}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Datas Disponíveis</h3>
              {loading && <p className="text-muted-foreground">Carregando...</p>}
              {dates.length === 0 && !loading && (
                <p className="text-muted-foreground">Nenhuma data cadastrada</p>
              )}
              
              {dates.map((dateItem) => (
                <Card key={dateItem.data_disponivel}>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {new Date(dateItem.data_disponivel + 'T00:00:00').toLocaleDateString('pt-BR')}
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
                                ? 'bg-green-50 border-green-200'
                                : status === 'blocked'
                                ? 'bg-gray-50 border-gray-200'
                                : 'bg-red-50 border-red-200'
                            }`}
                          >
                            <div className="text-sm font-medium mb-2">Slot {slotNum}</div>
                            <div className="text-xs mb-2">
                              {status === 'available' && 'Disponível'}
                              {status === 'blocked' && 'Bloqueado'}
                              {status === 'occupied' && 'Ocupado'}
                            </div>
                            {status === 'available' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleBlockSlot(dateItem.data_disponivel, slotNum)}
                                disabled={loading}
                              >
                                <Lock className="h-3 w-3" />
                              </Button>
                            )}
                            {status === 'blocked' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReleaseSlot(dateItem.data_disponivel, slotNum)}
                                disabled={loading}
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
        )}
      </DialogContent>
    </Dialog>
  );
};
