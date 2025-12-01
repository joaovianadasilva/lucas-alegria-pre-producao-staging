import React from 'react';
import { CalendarSlots } from '@/components/CalendarSlots';

export default function ConfigurarSlots() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Calendário de Vagas</h2>
        <p className="text-muted-foreground">
          Gerencie os horários disponíveis para agendamento de forma visual
        </p>
      </div>
      <CalendarSlots />
    </div>
  );
}
