import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { UserMenu } from './UserMenu';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Building2, ArrowLeftRight } from 'lucide-react';
import logoW2A from '@/assets/logo_W2A.svg';

export const AppLayout: React.FC = () => {
  const { provedorAtivo, provedoresDisponiveis } = useAuth();
  const navigate = useNavigate();
  const showSwitcher = provedoresDisponiveis.length > 1;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <header className="h-14 border-b flex items-center px-6 bg-background">
            <div className="flex items-center gap-2 w-1/3">
              <SidebarTrigger />
            </div>
            <div className="flex-1 flex justify-center items-center gap-3">
              {provedorAtivo?.logo_url ? (
                <img src={provedorAtivo.logo_url} alt={provedorAtivo.nome} className="h-10" />
              ) : (
                <img src={logoW2A} alt="W2A Telecomunicações" className="h-10" />
              )}
              {provedorAtivo && (
                <span className="text-sm font-medium text-muted-foreground hidden md:inline">
                  {provedorAtivo.nome}
                </span>
              )}
              {showSwitcher && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => navigate('/selecionar-provedor')}
                  title="Trocar provedor"
                >
                  <ArrowLeftRight className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="w-1/3 flex justify-end">
              <UserMenu />
            </div>
          </header>
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};
