import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, CalendarX, Clock, User, Mail, Phone } from 'lucide-react';
import { useAgendamentos, type AgendamentoData } from '@/hooks/useAgendamentos';

interface AgendamentoFormProps {
  selectedDate: string;
  selectedSlot: number;
  onSuccess: () => void;
  onCancel: () => void;
  spreadsheetId: string;
}

export const AgendamentoForm = ({ 
  selectedDate, 
  selectedSlot, 
  onSuccess, 
  onCancel, 
  spreadsheetId 
}: AgendamentoFormProps) => {
  const [formData, setFormData] = useState({
    nomeCliente: '',
    emailCliente: '',
    telefoneCliente: '',
  });

  const { createAgendamento, creating } = useAgendamentos(spreadsheetId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nomeCliente.trim() || !formData.emailCliente.trim()) {
      return;
    }

    try {
      const agendamentoData: AgendamentoData = {
        dataAgendamento: selectedDate,
        slotNumero: selectedSlot,
        nomeCliente: formData.nomeCliente.trim(),
        emailCliente: formData.emailCliente.trim(),
        telefoneCliente: formData.telefoneCliente.trim() || undefined,
      };

      await createAgendamento(agendamentoData);
      onSuccess();
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Confirmar Agendamento
        </CardTitle>
        <div className="text-sm text-muted-foreground space-y-1">
          <div className="flex items-center gap-2">
            <CalendarX className="h-4 w-4" />
            Data: {new Date(selectedDate).toLocaleDateString('pt-BR')}
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Slot: {selectedSlot}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Nome Completo *
            </Label>
            <Input
              id="nome"
              type="text"
              placeholder="Digite seu nome completo"
              value={formData.nomeCliente}
              onChange={(e) => handleInputChange('nomeCliente', e.target.value)}
              required
              disabled={creating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email *
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={formData.emailCliente}
              onChange={(e) => handleInputChange('emailCliente', e.target.value)}
              required
              disabled={creating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Telefone (opcional)
            </Label>
            <Input
              id="telefone"
              type="tel"
              placeholder="(11) 99999-9999"
              value={formData.telefoneCliente}
              onChange={(e) => handleInputChange('telefoneCliente', e.target.value)}
              disabled={creating}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={creating}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={creating || !formData.nomeCliente.trim() || !formData.emailCliente.trim()}
              className="flex-1"
            >
              {creating ? 'Agendando...' : 'Confirmar'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};