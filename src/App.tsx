import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./components/AppLayout";
import Auth from "./pages/Auth";
import CadastroVenda from "./pages/CadastroVenda";
import NovoAgendamento from "./pages/NovoAgendamento";
import GerenciarAgendamentos from "./pages/GerenciarAgendamentos";
import Historico from "./pages/Historico";
import ConfigurarPlanos from "./pages/ConfigurarPlanos";
import ConfigurarAdicionais from "./pages/ConfigurarAdicionais";
import GerenciarUsuarios from "./pages/GerenciarUsuarios";
import ConfigurarSlots from "./pages/ConfigurarSlots";
import Contratos from "./pages/Contratos";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Rotas Públicas */}
            <Route path="/auth" element={<Auth />} />
            
            {/* Rotas Protegidas */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Navigate to="/cadastro-venda" replace />} />
              <Route path="/cadastro-venda" element={<CadastroVenda />} />
              <Route path="/agendamentos/novo" element={<NovoAgendamento />} />
              <Route path="/agendamentos/gerenciar" element={<GerenciarAgendamentos />} />
              <Route path="/historico" element={<Historico />} />
              
              {/* Configurações - apenas para admins */}
              <Route element={<ProtectedRoute requiredRole="admin" />}>
                <Route path="/configuracoes/planos" element={<ConfigurarPlanos />} />
                <Route path="/configuracoes/adicionais" element={<ConfigurarAdicionais />} />
                <Route path="/configuracoes/usuarios" element={<GerenciarUsuarios />} />
              </Route>
              
              {/* Configurar Vagas - admin ou supervisor */}
              <Route element={<ProtectedRoute requiredRoles={["admin", "supervisor"]} />}>
                <Route path="/configuracoes/slots" element={<ConfigurarSlots />} />
              </Route>
              
              {/* Contratos - admin ou provedor */}
              <Route element={<ProtectedRoute requiredRoles={["admin", "provedor"]} />}>
                <Route path="/contratos" element={<Contratos />} />
              </Route>
            </Route>
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
