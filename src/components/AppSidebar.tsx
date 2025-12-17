import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  FileText,
  Calendar,
  ListChecks,
  Settings,
  Package,
  PlusCircle,
  Users,
  Clock,
  ScrollText,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/contexts/AuthContext';

const mainMenuItems = [
  { title: 'Cadastro de Venda', url: '/cadastro-venda', icon: FileText },
  { title: 'Registro de Agendamentos', url: '/agendamentos/novo', icon: Calendar },
  { title: 'Gerenciar Agenda', url: '/agendamentos/gerenciar', icon: ListChecks },
  { title: 'Histórico', url: '/historico', icon: Clock },
];

const adminOnlyMenuItems = [
  { title: 'Configurar Planos', url: '/configuracoes/planos', icon: Package },
  { title: 'Configurar Adicionais', url: '/configuracoes/adicionais', icon: PlusCircle },
  { title: 'Gerenciar Usuários', url: '/configuracoes/usuarios', icon: Users },
];

const slotsMenuItem = { title: 'Configurar Vagas', url: '/configuracoes/slots', icon: Clock };
const contratosMenuItem = { title: 'Contratos', url: '/contratos', icon: ScrollText };

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin');
  const isSupervisor = hasRole('supervisor');
  const isProvedor = hasRole('provedor');
  const canAccessSlots = isAdmin || isSupervisor;
  const canAccessContratos = isAdmin || isProvedor;

  const isActive = (path: string) => location.pathname === path;
  
  // Montar itens de configuração baseado nas permissões
  const configMenuItems = isAdmin 
    ? [...adminOnlyMenuItems, slotsMenuItem]
    : canAccessSlots 
      ? [slotsMenuItem]
      : [];
  
  const isConfigGroupActive = configMenuItems.some((item) => isActive(item.url));
  const showConfigMenu = configMenuItems.length > 0;

  const getNavClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'bg-accent text-accent-foreground font-medium' : 'hover:bg-accent/50';

  return (
    <Sidebar collapsible="icon" className={collapsed ? 'w-14' : 'w-60'}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavClass}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {canAccessContratos && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to={contratosMenuItem.url} className={getNavClass}>
                      <contratosMenuItem.icon className="h-4 w-4" />
                      {!collapsed && <span>{contratosMenuItem.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {showConfigMenu && (
          <Collapsible defaultOpen={isConfigGroupActive} className="group/collapsible">
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    {!collapsed && <span>Configurações</span>}
                  </div>
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {configMenuItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild>
                          <NavLink to={item.url} className={getNavClass}>
                            <item.icon className="h-4 w-4" />
                            {!collapsed && <span>{item.title}</span>}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
