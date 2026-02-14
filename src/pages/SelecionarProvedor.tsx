import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Settings } from 'lucide-react';
import logoW2A from '@/assets/logo_W2A.svg';

export default function SelecionarProvedor() {
  const { provedoresDisponiveis, provedoresLoading, selecionarProvedor, provedorAtivo, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  // Auto-redirect se já tem provedor ativo
  useEffect(() => {
    if (provedorAtivo) {
      navigate('/', { replace: true });
    }
  }, [provedorAtivo, navigate]);

  // Auto-redirect se só tem 1 provedor
  useEffect(() => {
    if (!provedoresLoading && provedoresDisponiveis.length === 1 && !provedorAtivo) {
      selecionarProvedor(provedoresDisponiveis[0].id);
      navigate('/', { replace: true });
    }
  }, [provedoresLoading, provedoresDisponiveis, provedorAtivo, selecionarProvedor, navigate]);

  const handleSelect = (id: string) => {
    selecionarProvedor(id);
    navigate('/', { replace: true });
  };

  if (provedoresLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando provedores...</p>
        </div>
      </div>
    );
  }

  if (provedoresDisponiveis.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <Building2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Nenhum provedor disponível</h1>
          <p className="text-muted-foreground">Você não está vinculado a nenhum provedor. Entre em contato com o administrador.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <img src={logoW2A} alt="W2A Telecomunicações" className="h-12 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Selecione o Provedor</h1>
          <p className="text-muted-foreground mt-1">Escolha o provedor para acessar o sistema</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {provedoresDisponiveis.map((provedor) => (
            <Card
              key={provedor.id}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => handleSelect(provedor.id)}
            >
              <CardContent className="flex flex-col items-center justify-center p-6 gap-3">
                {provedor.logo_url ? (
                  <img src={provedor.logo_url} alt={provedor.nome} className="h-12 object-contain" />
                ) : (
                  <Building2 className="h-12 w-12 text-muted-foreground" />
                )}
                <span className="font-semibold text-lg">{provedor.nome}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        {isSuperAdmin() && (
          <div className="text-center">
            <Button variant="outline" onClick={() => navigate('/gerenciar-provedores')}>
              <Settings className="mr-2 h-4 w-4" />
              Gerenciar Provedores
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
