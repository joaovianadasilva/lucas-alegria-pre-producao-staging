import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Wallet, Undo2, FileText } from 'lucide-react';

export default function CentralHome() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Central de Controle</h1>
        <p className="text-muted-foreground mt-1">Operações globais entre provedores.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link to="/central/operacional/recebimentos">
          <Card className="hover:shadow-md transition">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" /> Recebimentos</CardTitle>
              <CardDescription>Confirmar recebimentos de contratos elegíveis.</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/central/operacional/reembolsos">
          <Card className="hover:shadow-md transition">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Undo2 className="h-5 w-5" /> Reembolsos</CardTitle>
              <CardDescription>Confirmar reembolsos de contratos elegíveis.</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/central/contratos">
          <Card className="hover:shadow-md transition">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Todos os Contratos</CardTitle>
              <CardDescription>Visão consolidada cross-provedor com filtros e exportação.</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
