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

function processPemKey(pemKey: string): ArrayBuffer {
  console.log('Processando chave PEM...');
  
  // Remove PEM headers, footers, and whitespace
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const altPemHeader = "-----BEGIN RSA PRIVATE KEY-----";
  const altPemFooter = "-----END RSA PRIVATE KEY-----";
  
  let cleanKey = pemKey.replace(/\\n/g, '\n'); // Convert escaped newlines
  
  // Handle both standard and RSA-specific PEM formats
  if (cleanKey.includes(pemHeader)) {
    cleanKey = cleanKey.replace(pemHeader, "").replace(pemFooter, "");
  } else if (cleanKey.includes(altPemHeader)) {
    cleanKey = cleanKey.replace(altPemHeader, "").replace(altPemFooter, "");
  }
  
  // Remove all whitespace characters (spaces, newlines, tabs)
  cleanKey = cleanKey.replace(/\s/g, "");
  
  console.log('Chave limpa (primeiros 50 chars):', cleanKey.substring(0, 50));
  
  try {
    // Decode base64 to binary
    const binaryDer = atob(cleanKey);
    
    // Convert to ArrayBuffer
    const keyBuffer = new ArrayBuffer(binaryDer.length);
    const keyArray = new Uint8Array(keyBuffer);
    for (let i = 0; i < binaryDer.length; i++) {
      keyArray[i] = binaryDer.charCodeAt(i);
    }
    
    console.log('Chave convertida para ArrayBuffer, tamanho:', keyBuffer.byteLength);
    return keyBuffer;
    
  } catch (error) {
    console.error('Erro ao processar chave PEM:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    throw new Error(`Falha ao processar chave PEM: ${errorMessage}`);
  }
}

async function generateJWT(clientEmail: string, privateKey: string, scope: string): Promise<string> {
  console.log('Gerando JWT para:', clientEmail);
  
  try {
    const header = {
      alg: 'RS256',
      typ: 'JWT'
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: clientEmail,
      scope: scope,
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    };

    const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    
    const signatureInput = `${encodedHeader}.${encodedPayload}`;
    
    // Process PEM key correctly
    console.log('Processando chave privada...');
    const keyBuffer = processPemKey(privateKey);
    
    console.log('Importando chave criptográfica...');
    const key = await crypto.subtle.importKey(
      'pkcs8',
      keyBuffer,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign']
    );

    console.log('Assinando JWT...');
    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      key,
      new TextEncoder().encode(signatureInput)
    );

    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    console.log('JWT gerado com sucesso');
    return `${signatureInput}.${encodedSignature}`;
    
  } catch (error) {
    console.error('Erro ao gerar JWT:', error);
    if (error instanceof Error) {
      console.error('Tipo de erro:', error.constructor.name);
      console.error('Mensagem:', error.message);
      throw new Error(`Falha ao gerar JWT: ${error.message}`);
    }
    throw new Error('Falha ao gerar JWT: Erro desconhecido');
  }
}

async function getAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const jwt = await generateJWT(clientEmail, privateKey, 'https://www.googleapis.com/auth/spreadsheets');
  
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function updateSheetData(spreadsheetId: string, range: string, values: any[][], clientEmail: string, privateKey: string) {
  const accessToken = await getAccessToken(clientEmail, privateKey);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW`;
  
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
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
    
    // Get Service Account credentials for write operations
    const clientEmail = Deno.env.get('GOOGLE_SA_CLIENT_EMAIL');
    const privateKey = Deno.env.get('GOOGLE_SA_PRIVATE_KEY');
    
    if (!clientEmail || !privateKey) {
      throw new Error('Google Service Account credentials not found');
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
        
        // Update Google Sheets with booking info (planilha é a fonte da verdade)
        const columnLetter = String.fromCharCode(65 + slotNumero); // Convert slot number to column letter (B=1, C=2, etc.)
        const cellRange = `${columnLetter}${rowIndex + 1}`;
        
        console.log(`Atualizando planilha - Range: ${cellRange}, Valor: ${nomeCliente} - ${emailCliente}`);
        
        await updateSheetData(
          spreadsheetId, 
          cellRange, 
          [[`${nomeCliente} - ${emailCliente}`]],
          clientEmail,
          privateKey
        );
        
        console.log('Agendamento criado com sucesso na planilha');
        
        // Criar objeto de resposta simples
        const bookingData = {
          data_agendamento: dataAgendamento,
          slot_numero: slotNumero,
          nome_cliente: nomeCliente,
          email_cliente: emailCliente,
          telefone_cliente: telefoneCliente,
          status: 'confirmado'
        };
        
        return new Response(
          JSON.stringify({ success: true, data: bookingData }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      default:
        throw new Error('Invalid action');
    }
    
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})