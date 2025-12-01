import React from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { UserMenu } from './UserMenu';
import logoW2A from '@/assets/logo_W2A.svg';

export const AppLayout: React.FC = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <header className="h-14 border-b flex items-center px-6 bg-background">
            <div className="flex items-center gap-2 w-1/3">
              <SidebarTrigger />
            </div>
            <div className="flex-1 flex justify-center">
              <img src={logoW2A} alt="W2A Telecomunicações" className="h-10" />
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
