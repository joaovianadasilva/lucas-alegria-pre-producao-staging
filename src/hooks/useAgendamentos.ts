import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DatesWithSlots {
  [date: string]: {
    [slotNumber: number]: string;
  };
}

export interface AgendamentoData {
  dataAgendamento: string;
  slotNumero: number;
  nomeCliente: string;
  emailCliente: string;
  telefoneCliente?: string;
}

export const useAgendamentos = (spreadsheetId: string) => {
  const [datesWithSlots, setDatesWithSlots] = useState<DatesWithSlots>({});
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  const fetchDatesAndSlots = async () => {
    setLoading(true);
    try {
      console.log('=== HOOK: Chamando edge function ===');
      const { data, error } = await supabase.functions.invoke('google-sheets-integration', {
        body: {
          action: 'getDatesAndSlots',
          spreadsheetId
        }
      });

      if (error) throw error;
      
      console.log('=== HOOK: Resposta da edge function ===');
      console.log('data:', JSON.stringify(data, null, 2));
      
      if (data?.success) {
        console.log('=== HOOK: Dados recebidos ===');
        console.log('datesWithSlots recebido:', JSON.stringify(data.data, null, 2));
        setDatesWithSlots(data.data);
      } else {
        throw new Error(data?.error || 'Erro ao carregar dados');
      }
    } catch (error) {
      console.error('Error fetching dates and slots:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as datas disponíveis",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createAgendamento = async (agendamentoData: AgendamentoData) => {
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-sheets-integration', {
        body: {
          action: 'createBooking',
          spreadsheetId,
          data: agendamentoData
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Sucesso!",
          description: "Agendamento criado com sucesso",
        });
        
        // Refresh data
        await fetchDatesAndSlots();
        
        return data.data;
      } else {
        throw new Error(data?.error || 'Erro ao criar agendamento');
      }
    } catch (error) {
      console.error('Error creating agendamento:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível criar o agendamento",
        variant: "destructive",
      });
      throw error;
    } finally {
      setCreating(false);
    }
  };

  const getAvailableSlots = (date: string) => {
    const slots = datesWithSlots[date] || {};
    const availableSlots: number[] = [];
    
    console.log(`=== HOOK: getAvailableSlots para data ${date} ===`);
    console.log('slots object:', JSON.stringify(slots, null, 2));
    
    for (let i = 1; i <= 10; i++) {
      const slotValue = slots[i];
      const defaultValue = slotValue || '';
      const isEmpty = defaultValue === '' || defaultValue.trim() === '';
      
      console.log(`  Slot ${i}: original="${slotValue}" default="${defaultValue}" isEmpty=${isEmpty} tipo="${typeof slotValue}"`);
      
      // Slot is available if empty
      if (isEmpty) {
        availableSlots.push(i);
        console.log(`    ➤ ADICIONADO como disponível`);
      } else {
        console.log(`    ➤ NÃO disponível`);
      }
    }
    
    console.log(`Slots disponíveis para ${date}:`, availableSlots);
    return availableSlots;
  };

  const getSlotStatus = (date: string, slot: number): 'available' | 'occupied' | 'blocked' => {
    const slots = datesWithSlots[date] || {};
    const slotValue = slots[slot];
    const defaultValue = slotValue || '';
    
    console.log(`=== HOOK: getSlotStatus para ${date} slot ${slot} ===`);
    console.log(`  original="${slotValue}" default="${defaultValue}" tipo="${typeof slotValue}"`);
    
    let status: 'available' | 'occupied' | 'blocked';
    if (defaultValue === '' || defaultValue.trim() === '') {
      status = 'available';
    } else if (defaultValue === '-') {
      status = 'blocked';
    } else {
      status = 'occupied';
    }
    
    console.log(`  ➤ STATUS: ${status}`);
    return status;
  };

  const getAvailableDates = () => {
    return Object.keys(datesWithSlots).filter(date => {
      return getAvailableSlots(date).length > 0;
    });
  };

  useEffect(() => {
    if (spreadsheetId) {
      fetchDatesAndSlots();
    }
  }, [spreadsheetId]);

  return {
    datesWithSlots,
    loading,
    creating,
    fetchDatesAndSlots,
    createAgendamento,
    getAvailableSlots,
    getSlotStatus,
    getAvailableDates,
  };
};