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
        console.log('=== DIAGNÓSTICO: Fetching dates and slots from sheet ===');
        
        // Fetch data from Google Sheets (assuming data starts from row 2, column A to K)
        const sheetData = await getSheetData(spreadsheetId, 'A:K', apiKey);
        const rows = sheetData.values || [];
        
        console.log('=== DADOS BRUTOS DO GOOGLE SHEETS ===');
        console.log('Total de linhas:', rows.length);
        console.log('Primeiras 5 linhas:', JSON.stringify(rows.slice(0, 5), null, 2));
        
        // Helper function to convert dd/mm/yyyy to yyyy-mm-dd
        const convertDateFormat = (dateStr: string): string => {
          if (!dateStr) return dateStr;
          
          // Check if it's already in ISO format
          if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return dateStr;
          }
          
          // Convert dd/mm/yyyy to yyyy-mm-dd
          const dateParts = dateStr.split('/');
          if (dateParts.length === 3) {
            const day = dateParts[0].padStart(2, '0');
            const month = dateParts[1].padStart(2, '0');
            const year = dateParts[2];
            const isoDate = `${year}-${month}-${day}`;
            console.log(`Convertendo data: ${dateStr} -> ${isoDate}`);
            return isoDate;
          }
          
          return dateStr;
        };

        const datesWithSlots: { [key: string]: { [key: number]: string } } = {};
        
        // Process each row (skip header if exists)
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (row && row[0]) { // Check if date exists in column A
            const originalDate = row[0];
            const convertedDate = convertDateFormat(originalDate);
            datesWithSlots[convertedDate] = {};
            
            console.log(`=== PROCESSANDO LINHA ${i + 1} (DATA: ${originalDate} -> ${convertedDate}) ===`);
            console.log('Linha completa:', JSON.stringify(row, null, 2));
            
            // Check slots 1-10 (columns B-K, indices 1-10)
            for (let slotNum = 1; slotNum <= 10; slotNum++) {
              const cellValue = row[slotNum];
              const processedValue = cellValue || '';
              datesWithSlots[convertedDate][slotNum] = processedValue;
              
              console.log(`  Slot ${slotNum}: original="${cellValue}" processed="${processedValue}" tipo="${typeof cellValue}"`);
            }
          }
        }
        
        console.log('=== OBJETO FINAL datesWithSlots ===');
        console.log(JSON.stringify(datesWithSlots, null, 2));
        
        return new Response(
          JSON.stringify({ success: true, data: datesWithSlots }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      case 'createBooking': {
        const { dataAgendamento, slotNumero, nomeCliente, emailCliente, telefoneCliente } = data;
        
        console.log('Creating booking:', { dataAgendamento, slotNumero, nomeCliente, emailCliente });
        
        // Helper function to convert yyyy-mm-dd back to dd/mm/yyyy for Google Sheets lookup
        const convertToSheetFormat = (isoDate: string): string => {
          if (!isoDate) return isoDate;
          
          // Check if it's in ISO format
          if (isoDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [year, month, day] = isoDate.split('-');
            return `${day}/${month}/${year}`;
          }
          
          return isoDate;
        };
        
        // Convert the ISO date back to Google Sheets format for lookup
        const sheetDateFormat = convertToSheetFormat(dataAgendamento);
        console.log(`Procurando data na planilha: ${dataAgendamento} -> ${sheetDateFormat}`);
        
        // First, check if slot is available in Google Sheets
        const sheetData = await getSheetData(spreadsheetId, 'A:K', apiKey);
        const rows = sheetData.values || [];
        
        let rowIndex = -1;
        let isSlotAvailable = false;
        
        // Find the row with the matching date (using original sheet format)
        for (let i = 1; i < rows.length; i++) {
          if (rows[i] && rows[i][0] === sheetDateFormat) {
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