import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Lock, Unlock, Trash2, Loader2, Calendar as CalendarIcon, User, Mail } from 'lucide-react';
import { format } from 'date-fns';
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

interface SlotDetailDialogProps {
  slot: Slot | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function SlotDetailDialog({ slot, open, onOpenChange, onSuccess }: SlotDetailDialogProps) {
  const { provedorAtivo } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  if (!slot) return null;

  const canBlock = slot.status === 'disponivel';
  const canRelease = slot.status === 'bloqueado';
  const canDelete = slot.status !== 'ocupado';

  const updateSlotStatus = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-slots', {
        body: {
          action: 'updateSlotStatus',
          provedorId: provedorAtivo?.id,
          data: { slotId: slot.id, status: newStatus }
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast.success(
        newStatus === 'bloqueado'
          ? 'Slot bloqueado com sucesso'
          : 'Slot liberado com sucesso'
      );
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating slot:', error);
      toast.error(error.message || 'Erro ao atualizar slot');
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteSlot = async () => {
    if (!confirm('Tem certeza que deseja deletar este slot?')) {
      return;
    }

    setIsUpdating(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-slots', {
        body: {
          action: 'deleteSlot',
          provedorId: provedorAtivo?.id,
          data: { slotId: slot.id }
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast.success('Slot deletado com sucesso');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error deleting slot:', error);
      toast.error(error.message || 'Erro ao deletar slot');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'disponivel':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      case 'bloqueado':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
      case 'ocupado':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100';
      default:
        return '';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'disponivel':
        return 'Disponível';
      case 'bloqueado':
        return 'Bloqueado';
      case 'ocupado':
        return 'Ocupado';
      default:
        return status;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Vaga {slot.slot_numero}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {format(new Date(slot.data_disponivel + 'T00:00:00'), "dd 'de' MMMM 'de' yyyy", {
              locale: ptBR,
            })}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Status</Label>
            <div className="mt-1">
              <Badge className={getStatusColor(slot.status)}>
                {getStatusLabel(slot.status)}
              </Badge>
            </div>
          </div>

          {slot.agendamentos && (
            <div className="p-4 border rounded-lg space-y-3 bg-muted/50">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-xs">Cliente</Label>
                  <p className="text-sm font-medium">{slot.agendamentos.nome_cliente}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-xs">Email</Label>
                  <p className="text-sm">{slot.agendamentos.email_cliente}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">{slot.agendamentos.tipo}</Badge>
                <Badge variant="outline">{slot.agendamentos.status}</Badge>
              </div>
            </div>
          )}

          {slot.observacao && (
            <div>
              <Label>Observação</Label>
              <p className="text-sm text-muted-foreground mt-1">{slot.observacao}</p>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            {canBlock && (
              <Button
                onClick={() => updateSlotStatus('bloqueado')}
                disabled={isUpdating}
                variant="outline"
                className="flex-1"
              >
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Lock className="h-4 w-4 mr-2" />
                )}
                Bloquear
              </Button>
            )}

            {canRelease && (
              <Button
                onClick={() => updateSlotStatus('disponivel')}
                disabled={isUpdating}
                variant="outline"
                className="flex-1"
              >
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Unlock className="h-4 w-4 mr-2" />
                )}
                Liberar
              </Button>
            )}

            {canDelete && (
              <Button
                variant="destructive"
                onClick={deleteSlot}
                disabled={isUpdating}
                className="flex-1"
              >
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Deletar
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
