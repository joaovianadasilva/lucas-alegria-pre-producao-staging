import React from 'react';
import { AdminSlots } from '@/components/AdminSlots';

export default function ConfigurarSlots() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Configurar Slots de Agenda</h2>
        <p className="text-muted-foreground">
          Gerencie os horários disponíveis para agendamento
        </p>
      </div>
      <AdminSlots />
    </div>
  );
}
