'use client';

import { useState, useEffect } from 'react';
import { AuthGuard } from '@/components/auth-guard';
import GlobalSidebar from '@/components/layout/GlobalSidebar';
import MockDataBanner from '@/components/mock-data-banner';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const handleOpenSidebar = () => setMobileSidebarOpen(true);
    window.addEventListener('open-mobile-sidebar', handleOpenSidebar);
    return () => window.removeEventListener('open-mobile-sidebar', handleOpenSidebar);
  }, []);

  const sidebarWidth = sidebarCollapsed ? 'md:ml-16' : 'md:ml-56';

  return (
    <AuthGuard>
      <div className="flex h-screen bg-shiro">
        <GlobalSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />

        <div className={`flex-1 min-w-0 flex flex-col ml-0 ${sidebarWidth} transition-[margin] duration-normal ease-elegant`}>
          <MockDataBanner />
          {children}
        </div>
      </div>
    </AuthGuard>
  );
}
