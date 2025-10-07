import React from "react";
import { FormularioCompleto } from "@/components/FormularioCompleto";

const SPREADSHEET_ID = "1S1NnfgjwQnvQcyptU2OUf-oxHOb-NPuP_DY-hc7Oovg";
const WEBHOOK_URL = "https://n8n-n8n-start.adwqys.easypanel.host/webhook-test/20dd8ffc-0dc4-47e8-8cb0-70812d8ae227"; // URL do webhook será fornecida

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      <FormularioCompleto spreadsheetId={SPREADSHEET_ID} webhookUrl={WEBHOOK_URL} />
    </div>
  );
}
