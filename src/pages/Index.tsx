import React from "react";
import { useNavigate } from "react-router-dom";
import { FormularioCompleto } from "@/components/FormularioCompleto";
import { Button } from "@/components/ui/button";
import { Calendar, ListChecks } from "lucide-react";

const SPREADSHEET_ID = "1S1NnfgjwQnvQcyptU2OUf-oxHOb-NPuP_DY-hc7Oovg";
const WEBHOOK_URL = "https://n8n-n8n-start.adwqys.easypanel.host/webhook/20dd8ffc-0dc4-47e8-8cb0-70812d8ae227";

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex gap-4 justify-end">
          <Button onClick={() => navigate('/agendamentos/novo')} variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            Novo Agendamento
          </Button>
          <Button onClick={() => navigate('/agendamentos/gerenciar')} variant="outline">
            <ListChecks className="mr-2 h-4 w-4" />
            Gerenciar Agendamentos
          </Button>
        </div>
      </div>
      <FormularioCompleto spreadsheetId={SPREADSHEET_ID} webhookUrl={WEBHOOK_URL} />
    </div>
  );
}
