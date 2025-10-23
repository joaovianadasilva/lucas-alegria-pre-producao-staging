import React from "react";
import { FormularioCompleto } from "@/components/FormularioCompleto";

const SPREADSHEET_ID = "1S1NnfgjwQnvQcyptU2OUf-oxHOb-NPuP_DY-hc7Oovg";
const WEBHOOK_URL = "https://n8n-n8n-start.adwqys.easypanel.host/webhook/20dd8ffc-0dc4-47e8-8cb0-70812d8ae227";

export default function CadastroVenda() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Cadastro de Venda</h2>
        <p className="text-muted-foreground">
          Preencha os dados para registrar um novo contrato
        </p>
      </div>
      <FormularioCompleto spreadsheetId={SPREADSHEET_ID} webhookUrl={WEBHOOK_URL} />
    </div>
  );
}
