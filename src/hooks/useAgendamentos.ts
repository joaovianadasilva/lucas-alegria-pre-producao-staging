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
      const { data, error } = await supabase.functions.invoke('google-sheets-integration', {
        body: {
          action: 'getDatesAndSlots',
          spreadsheetId
        }
      });

      if (error) throw error;
      
      if (data?.success) {
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
    
    for (let i = 1; i <= 10; i++) {
      const slotValue = slots[i] || '';
      // Slot is available if empty or not blocked with "-"
      if (slotValue === '' || slotValue.trim() === '') {
        availableSlots.push(i);
      }
    }
    
    return availableSlots;
  };

  const getSlotStatus = (date: string, slot: number): 'available' | 'occupied' | 'blocked' => {
    const slots = datesWithSlots[date] || {};
    const slotValue = slots[slot] || '';
    
    if (slotValue === '-') return 'blocked';
    if (slotValue === '' || slotValue.trim() === '') return 'available';
    return 'occupied';
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