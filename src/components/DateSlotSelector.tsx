import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, CheckCircle, XCircle, Lock } from 'lucide-react';
import { useAgendamentos } from '@/hooks/useAgendamentos';
import { cn } from '@/lib/utils';

interface DateSlotSelectorProps {
  spreadsheetId: string;
  onSlotSelect: (date: string, slot: number) => void;
}

export const DateSlotSelector = ({ spreadsheetId, onSlotSelect }: DateSlotSelectorProps) => {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const { getAvailableDates, getAvailableSlots, getSlotStatus, loading } = useAgendamentos(spreadsheetId);

  const availableDates = getAvailableDates();
  const availableSlots = selectedDate ? getAvailableSlots(selectedDate) : [];

  const getStatusIcon = (status: 'available' | 'occupied' | 'blocked') => {
    switch (status) {
      case 'available':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'occupied':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'blocked':
        return <Lock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: 'available' | 'occupied' | 'blocked') => {
    switch (status) {
      case 'available':
        return 'bg-green-100 hover:bg-green-200 border-green-300 text-green-800';
      case 'occupied':
        return 'bg-red-100 border-red-300 text-red-800 cursor-not-allowed';
      case 'blocked':
        return 'bg-gray-100 border-gray-300 text-gray-800 cursor-not-allowed';
    }
  };

  if (loading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Carregando datas disponíveis...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Date Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Selecione uma Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          {availableDates.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma data disponível no momento
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {availableDates.map((date) => (
                <Button
                  key={date}
                  variant={selectedDate === date ? "default" : "outline"}
                  onClick={() => setSelectedDate(date)}
                  className="h-auto p-3 flex flex-col items-center gap-1"
                >
                  <span className="font-medium">
                    {new Date(date).toLocaleDateString('pt-BR', { 
                      day: '2-digit', 
                      month: '2-digit',
                      year: '2-digit'
                    })}
                  </span>
                  <span className="text-xs opacity-75">
                    {new Date(date).toLocaleDateString('pt-BR', { 
                      weekday: 'short' 
                    })}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {getAvailableSlots(date).length} slots
                  </Badge>
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Slot Selection */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Selecione um Horário
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Data selecionada: {new Date(selectedDate).toLocaleDateString('pt-BR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((slot) => {
                const status = getSlotStatus(selectedDate, slot);
                const isAvailable = status === 'available';
                
                return (
                  <Button
                    key={slot}
                    variant="outline"
                    disabled={!isAvailable}
                    onClick={() => isAvailable && onSlotSelect(selectedDate, slot)}
                    className={cn(
                      "h-20 flex flex-col items-center justify-center gap-2 transition-colors",
                      getStatusColor(status)
                    )}
                  >
                    {getStatusIcon(status)}
                    <span className="font-medium">Slot {slot}</span>
                    <span className="text-xs capitalize">
                      {status === 'available' && 'Disponível'}
                      {status === 'occupied' && 'Ocupado'}
                      {status === 'blocked' && 'Bloqueado'}
                    </span>
                  </Button>
                );
              })}
            </div>
            
            {availableSlots.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                Nenhum horário disponível para esta data
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Disponível</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span>Ocupado</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-gray-500" />
              <span>Bloqueado</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};