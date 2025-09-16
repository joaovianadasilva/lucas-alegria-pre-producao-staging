import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getSheetData(spreadsheetId: string, range: string, apiKey: string) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`;
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch sheet data: ${response.statusText}`);
  }
  
  return await response.json();
}

async function updateSheetData(spreadsheetId: string, range: string, values: any[][], apiKey: string) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW&key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: values,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to update sheet: ${response.statusText}`);
  }
  
  return await response.json();
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, spreadsheetId, data } = await req.json();
    
    // Get Google Sheets API key from Supabase secrets
    const apiKey = Deno.env.get('GOOGLE_SHEETS_API_KEY');
    if (!apiKey) {
      throw new Error('Google Sheets API Key not found');
    }
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    switch (action) {
      case 'getDatesAndSlots': {
        console.log('Fetching dates and slots from sheet');
        
        // Fetch data from Google Sheets (assuming data starts from row 2, column A to K)
        const sheetData = await getSheetData(spreadsheetId, 'A:K', apiKey);
        const rows = sheetData.values || [];
        
        const datesWithSlots: { [key: string]: { [key: number]: string } } = {};
        
        // Process each row (skip header if exists)
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (row && row[0]) { // Check if date exists in column A
            const date = row[0];
            datesWithSlots[date] = {};
            
            // Check slots 1-10 (columns B-K, indices 1-10)
            for (let slotNum = 1; slotNum <= 10; slotNum++) {
              const cellValue = row[slotNum] || '';
              datesWithSlots[date][slotNum] = cellValue;
            }
          }
        }
        
        return new Response(
          JSON.stringify({ success: true, data: datesWithSlots }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      case 'createBooking': {
        const { dataAgendamento, slotNumero, nomeCliente, emailCliente, telefoneCliente } = data;
        
        console.log('Creating booking:', { dataAgendamento, slotNumero, nomeCliente, emailCliente });
        
        // First, check if slot is available in Google Sheets
        const sheetData = await getSheetData(spreadsheetId, 'A:K', apiKey);
        const rows = sheetData.values || [];
        
        let rowIndex = -1;
        let isSlotAvailable = false;
        
        // Find the row with the matching date
        for (let i = 1; i < rows.length; i++) {
          if (rows[i] && rows[i][0] === dataAgendamento) {
            rowIndex = i;
            const cellValue = rows[i][slotNumero] || '';
            isSlotAvailable = cellValue === '' || cellValue.trim() === '';
            break;
          }
        }
        
        if (rowIndex === -1) {
          throw new Error('Data não encontrada na planilha');
        }
        
        if (!isSlotAvailable) {
          throw new Error('Slot não está disponível');
        }
        
        // Insert booking into Supabase
        const { data: booking, error: supabaseError } = await supabase
          .from('agendamentos')
          .insert({
            data_agendamento: dataAgendamento,
            slot_numero: slotNumero,
            nome_cliente: nomeCliente,
            email_cliente: emailCliente,
            telefone_cliente: telefoneCliente,
            status: 'confirmado'
          })
          .select()
          .single();
        
        if (supabaseError) {
          throw new Error(`Erro ao salvar no banco: ${supabaseError.message}`);
        }
        
        // Update Google Sheets with booking info
        const columnLetter = String.fromCharCode(65 + slotNumero); // Convert slot number to column letter (B=1, C=2, etc.)
        const cellRange = `${columnLetter}${rowIndex + 1}`;
        
        await updateSheetData(
          spreadsheetId, 
          cellRange, 
          [[`${nomeCliente} - ${emailCliente}`]],
          apiKey
        );
        
        console.log('Booking created successfully:', booking);
        
        return new Response(
          JSON.stringify({ success: true, data: booking }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      default:
        throw new Error('Invalid action');
    }
    
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})