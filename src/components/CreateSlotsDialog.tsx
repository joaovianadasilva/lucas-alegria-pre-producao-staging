import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Loader2 } from 'lucide-react';
import { addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CreateSlotsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateSlotsDialog({ open, onOpenChange, onSuccess }: CreateSlotsDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [quantidade, setQuantidade] = useState(10);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!selectedDate) {
      toast.error('Selecione uma data');
      return;
    }

    if (quantidade < 1 || quantidade > 50) {
      toast.error('Quantidade deve estar entre 1 e 50');
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-slots', {
        body: {
          action: 'createSlotsInBulk',
          data: {
            dataDisponivel: format(selectedDate, 'yyyy-MM-dd'),
            quantidade
          }
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast.success(`${quantidade} vagas criadas com sucesso!`);
      onSuccess();
      onOpenChange(false);
      setSelectedDate(undefined);
      setQuantidade(10);
    } catch (error: any) {
      console.error('Error creating slots:', error);
      toast.error(error.message || 'Erro ao criar vagas');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Vagas em Massa</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Selecione a Data</Label>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) =>
                date < new Date(new Date().setHours(0, 0, 0, 0)) ||
                date > addDays(new Date(), 30)
              }
              locale={ptBR}
              className="rounded-md border"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Você pode criar vagas para até 30 dias no futuro
            </p>
          </div>

          <div>
            <Label htmlFor="quantidade">Quantidade de Vagas</Label>
            <Input
              id="quantidade"
              type="number"
              min={1}
              max={50}
              value={quantidade}
              onChange={(e) => setQuantidade(Number(e.target.value))}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              As novas vagas serão adicionadas após as existentes para esta data
            </p>
          </div>

          {selectedDate && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm font-medium">
                📅 {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {quantidade} {quantidade === 1 ? 'vaga será criada' : 'vagas serão criadas'}
              </p>
            </div>
          )}

          <Button
            className="w-full"
            onClick={handleCreate}
            disabled={!selectedDate || isCreating}
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Criar {quantidade} Vagas
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
