import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DateSlotSelector } from '@/components/DateSlotSelector';
import { TecnicoSelector } from '@/components/TecnicoSelector';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';

const SPREADSHEET_ID = "1S1NnfgjwQnvQcyptU2OUf-oxHOb-NPuP_DY-hc7Oovg";

const TIPOS_AGENDAMENTO = [
  { value: 'instalacao', label: 'Instalação' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'visita_tecnica', label: 'Visita Técnica' },
  { value: 'suporte', label: 'Suporte' },
];

export default function NovoAgendamento() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [tipo, setTipo] = useState('');
  const [nomeCliente, setNomeCliente] = useState('');
  const [emailCliente, setEmailCliente] = useState('');
  const [telefoneCliente, setTelefoneCliente] = useState('');
  const [tecnicoResponsavel, setTecnicoResponsavel] = useState('');
  const [observacao, setObservacao] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  const handleSlotSelect = (date: string, slot: number) => {
    setSelectedDate(date);
    setSelectedSlot(slot);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tipo || !nomeCliente || !emailCliente || !selectedDate || !selectedSlot) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('manage-appointments', {
        body: {
          action: 'createAppointment',
          tipo,
          dataAgendamento: selectedDate,
          slotNumero: selectedSlot,
          nomeCliente,
          emailCliente,
          telefoneCliente: telefoneCliente || null,
          tecnicoResponsavelId: tecnicoResponsavel || null,
          observacao: observacao || null,
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Sucesso",
          description: "Agendamento criado com sucesso!",
        });
        navigate('/agendamentos/gerenciar');
      } else {
        throw new Error(data?.error || 'Erro ao criar agendamento');
      }
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : 'Erro ao criar agendamento',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Novo Agendamento</h1>
            <p className="text-muted-foreground">Criar agendamento independente</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Agendamento</CardTitle>
              <CardDescription>Preencha os dados do agendamento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Agendamento <span className="text-destructive">*</span></Label>
                <Select value={tipo} onValueChange={setTipo} required>
                  <SelectTrigger id="tipo">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_AGENDAMENTO.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome do Cliente <span className="text-destructive">*</span></Label>
                  <Input
                    id="nome"
                    value={nomeCliente}
                    onChange={(e) => setNomeCliente(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email do Cliente <span className="text-destructive">*</span></Label>
                  <Input
                    id="email"
                    type="email"
                    value={emailCliente}
                    onChange={(e) => setEmailCliente(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone do Cliente</Label>
                <Input
                  id="telefone"
                  value={telefoneCliente}
                  onChange={(e) => setTelefoneCliente(e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <TecnicoSelector
                value={tecnicoResponsavel}
                onValueChange={setTecnicoResponsavel}
              />

              <div className="space-y-2">
                <Label htmlFor="observacao">Observações</Label>
                <Textarea
                  id="observacao"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <DateSlotSelector
            spreadsheetId={SPREADSHEET_ID}
            onSlotSelect={handleSlotSelect}
          />

          <div className="flex gap-4">
            <Button type="button" variant="outline" onClick={() => navigate('/')} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Criando...' : 'Criar Agendamento'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
