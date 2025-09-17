import { useState } from 'react';
import { DateSlotSelector } from '@/components/DateSlotSelector';
import { AgendamentoForm } from '@/components/AgendamentoForm';
import { Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// ID da planilha Google Sheets hardcoded
const SPREADSHEET_ID = '1S1NnfgjwQnvQcyptU2OUf-oxHOb-NPuP_DY-hc7Oovg';

const Index = () => {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<number>(0);
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();

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
            Gerencie seus agendamentos facilmente
          </p>
        </div>

        {showForm ? (
          /* Booking Form */
          <AgendamentoForm
            selectedDate={selectedDate}
            selectedSlot={selectedSlot}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
            spreadsheetId={SPREADSHEET_ID}
          />
        ) : (
          /* Main Interface */
          <DateSlotSelector
            spreadsheetId={SPREADSHEET_ID}
            onSlotSelect={handleSlotSelect}
          />
        )}
      </div>
    </div>
  );
};

export default Index;
