import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
  universe_domain: string;
}

async function getAccessToken(serviceAccount: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: serviceAccount.token_uri,
    exp: now + 3600,
    iat: now,
  };

  const header = { alg: 'RS256', typ: 'JWT' };
  
  // Create JWT manually using Web Crypto API
  const encoder = new TextEncoder();
  const headerEncoded = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadEncoded = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const data = `${headerEncoded}.${payloadEncoded}`;
  
  // Import private key
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    encoder.encode(serviceAccount.private_key.replace(/\\n/g, '\n')),
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );
  
  // Sign the JWT
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    encoder.encode(data)
  );
  
  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const jwt = `${data}.${signatureBase64}`;
  
  // Exchange JWT for access token
  const tokenResponse = await fetch(serviceAccount.token_uri, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  
  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

async function getSheetData(spreadsheetId: string, range: string, accessToken: string) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch sheet data: ${response.statusText}`);
  }
  
  return await response.json();
}

async function updateSheetData(spreadsheetId: string, range: string, values: any[][], accessToken: string) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW`;
  
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
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
    
    // Get service account credentials from Supabase secrets
    const serviceAccountKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
    if (!serviceAccountKey) {
      throw new Error('Google Service Account Key not found');
    }
    
    const serviceAccount: ServiceAccount = JSON.parse(serviceAccountKey);
    const accessToken = await getAccessToken(serviceAccount);
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    switch (action) {
      case 'getDatesAndSlots': {
        console.log('Fetching dates and slots from sheet');
        
        // Fetch data from Google Sheets (assuming data starts from row 2, column A to K)
        const sheetData = await getSheetData(spreadsheetId, 'A:K', accessToken);
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
        const sheetData = await getSheetData(spreadsheetId, 'A:K', accessToken);
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
          [[`${nomeCliente} - ${emailCliente}`]]
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