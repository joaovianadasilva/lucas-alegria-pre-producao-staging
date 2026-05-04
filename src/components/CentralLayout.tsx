import React from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { CentralSidebar } from './CentralSidebar';
import { UserMenu } from './UserMenu';

export const CentralLayout: React.FC = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <CentralSidebar />
        <main className="flex-1 overflow-auto">
          <header className="h-14 border-b flex items-center px-6 bg-background">
            <SidebarTrigger />
            <div className="flex-1 flex justify-center">
              <span className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
                Central de Controle · Super Admin
              </span>
            </div>
            <UserMenu />
          </header>
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};
