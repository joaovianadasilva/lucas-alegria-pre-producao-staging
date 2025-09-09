import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { DateSlotSelector } from '@/components/DateSlotSelector';
import { AgendamentoForm } from '@/components/AgendamentoForm';
import { Calendar, Settings, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<number>(0);
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();

  const handleSpreadsheetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (spreadsheetId.trim()) {
      setIsConfigured(true);
      toast({
        title: "Configuração salva!",
        description: "Planilha conectada com sucesso",
      });
    }
  };

  const handleSlotSelect = (date: string, slot: number) => {
    setSelectedDate(date);
    setSelectedSlot(slot);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setSelectedDate('');
    setSelectedSlot(0);
    toast({
      title: "Sucesso!",
      description: "Seu agendamento foi confirmado!",
    });
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setSelectedDate('');
    setSelectedSlot(0);
  };

  const resetConfiguration = () => {
    setIsConfigured(false);
    setSpreadsheetId('');
    setShowForm(false);
    setSelectedDate('');
    setSelectedSlot(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 p-4">
      <div className="container mx-auto py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 flex items-center justify-center gap-2">
            <Calendar className="h-8 w-8" />
            Sistema de Agendamentos
          </h1>
          <p className="text-xl text-muted-foreground">
            Conecte sua planilha Google Sheets e gerencie seus agendamentos
          </p>
        </div>

        {!isConfigured ? (
          /* Configuration Step */
          <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurar Planilha Google Sheets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSpreadsheetSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="spreadsheet-id">
                    ID da Planilha Google Sheets
                  </Label>
                  <Input
                    id="spreadsheet-id"
                    type="text"
                    placeholder="Ex: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                    value={spreadsheetId}
                    onChange={(e) => setSpreadsheetId(e.target.value)}
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    O ID está na URL da sua planilha: 
                    <br />
                    <code className="text-xs bg-muted px-1 rounded">
                      https://docs.google.com/spreadsheets/d/[ID_AQUI]/edit
                    </code>
                  </p>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Estrutura da Planilha:</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Coluna A: Datas (ex: 2024-01-15)</li>
                    <li>• Colunas B-K: Slots 1-10</li>
                    <li>• Célula vazia = disponível</li>
                    <li>• Célula com "-" = bloqueado</li>
                    <li>• Célula com texto = ocupado</li>
                  </ul>
                </div>

                <Button type="submit" className="w-full">
                  Conectar Planilha
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : showForm ? (
          /* Booking Form */
          <AgendamentoForm
            selectedDate={selectedDate}
            selectedSlot={selectedSlot}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
            spreadsheetId={spreadsheetId}
          />
        ) : (
          /* Main Interface */
          <div className="space-y-6">
            {/* Control Bar */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ExternalLink className="h-4 w-4" />
                Planilha conectada: {spreadsheetId.substring(0, 20)}...
              </div>
              <Button variant="outline" onClick={resetConfiguration}>
                <Settings className="h-4 w-4 mr-2" />
                Reconfigurar
              </Button>
            </div>

            {/* Date and Slot Selection */}
            <DateSlotSelector
              spreadsheetId={spreadsheetId}
              onSlotSelect={handleSlotSelect}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
