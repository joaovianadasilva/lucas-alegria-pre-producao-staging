import { NavLink, useLocation } from 'react-router-dom';
import { Wallet, Undo2, BarChart3, ArrowLeft, ShieldCheck, FileText } from 'lucide-react';
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

const operacional = [
  { title: 'Recebimentos', url: '/central/operacional/recebimentos', icon: Wallet },
  { title: 'Reembolsos', url: '/central/operacional/reembolsos', icon: Undo2 },
];

export function CentralSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { pathname } = useLocation();
  const isActive = (p: string) => pathname === p;
  const cls = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'bg-accent text-accent-foreground font-medium' : 'hover:bg-accent/50';

  return (
    <Sidebar collapsible="icon" className={collapsed ? 'w-14' : 'w-60'}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              {!collapsed && <span>Central de Controle</span>}
            </div>
          </SidebarGroupLabel>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Operacional</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {operacional.map(i => (
                <SidebarMenuItem key={i.url}>
                  <SidebarMenuButton asChild isActive={isActive(i.url)}>
                    <NavLink to={i.url} className={cls}>
                      <i.icon className="h-4 w-4" />
                      {!collapsed && <span>{i.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Dados</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/central/contratos')}>
                  <NavLink to="/central/contratos" className={cls}>
                    <FileText className="h-4 w-4" />
                    {!collapsed && <span>Contratos</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Relatórios</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton disabled>
                  <BarChart3 className="h-4 w-4" />
                  {!collapsed && <span className="text-muted-foreground">Em breve</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/agendamentos/novo" className="hover:bg-accent/50">
                    <ArrowLeft className="h-4 w-4" />
                    {!collapsed && <span>Voltar ao provedor</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
