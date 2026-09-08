'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { NAV_GROUPS, NavItem, NavGroup } from '@/config/navigation';

function MenuIcon({ icon, className = 'w-5 h-5' }: { icon: NavItem['icon']; className?: string }) {
  const props = { className, fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', 'aria-hidden': true as const };
  const pathProps = { strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, strokeWidth: 1.5 };

  switch (icon) {
    case 'search':
      return <svg {...props}><path {...pathProps} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
    case 'archive':
      return <svg {...props}><path {...pathProps} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>;
    case 'grid':
      return <svg {...props}><path {...pathProps} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>;
    case 'file-text':
      return <svg {...props}><path {...pathProps} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
    case 'users':
      return <svg {...props}><path {...pathProps} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m3 5.197v-1" /></svg>;
    case 'settings':
      return <svg {...props}><path {...pathProps} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.573-1.066z" /><path {...pathProps} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
    case 'bank':
      return <svg {...props}><path {...pathProps} d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11m4-11v11m4-11v11m4-11v11m4-11v11" /></svg>;
    case 'printer':
      return <svg {...props}><path {...pathProps} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m10 0v4H7v-4m10 0H7m10-8V3H7v6" /></svg>;
    case 'cash':
      return <svg {...props}><path {...pathProps} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
  }
}

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matsu focus-visible:ring-offset-1';

interface GlobalSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function GlobalSidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen = false,
  onMobileClose,
}: GlobalSidebarProps) {
  const { user } = useAuth();
  const pathname = usePathname();

  const visibleGroups = NAV_GROUPS.map((group: NavGroup) => ({
    ...group,
    items: group.items.filter((item: NavItem) =>
      user ? item.requiredRoles.includes(user.role) : false
    ),
  })).filter(group => group.items.length > 0);

  // 区画コンテキストの書類画面（/plots/[id]/documents 配下）は
  // 「台帳問い合わせ」ではなく「書類管理」をアクティブにする（#270）
  const isPlotDocuments = /^\/plots\/[^/]+\/documents(\/|$)/.test(pathname);

  const isActive = (itemPath: string) => {
    if (itemPath === '/documents') {
      return pathname === itemPath || pathname.startsWith(itemPath + '/') || isPlotDocuments;
    }
    if (itemPath === '/plots') {
      return (pathname === '/plots' || pathname.startsWith('/plots/')) && !isPlotDocuments;
    }
    return pathname === itemPath || pathname.startsWith(itemPath + '/');
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}
      <div
        data-testid="global-sidebar"
        className={`bg-kinari border-r border-gin fixed top-0 left-0 h-screen overflow-y-auto overflow-x-hidden flex flex-col transition-all duration-300 ease-in-out
          ${collapsed ? 'w-16' : 'w-56'}
          ${mobileOpen ? 'translate-x-0 z-50' : '-translate-x-full z-50'}
          md:translate-x-0 md:z-10
        `}
      >
        {/* Header */}
        <div className={`flex items-center border-b border-gin ${collapsed ? 'justify-center p-3' : 'justify-between p-4'}`}>
          {!collapsed && (
            <Link href="/plots" className="flex items-center gap-3 flex-shrink-0">
              <div className="w-10 h-10 flex-shrink-0 rounded-xl bg-gradient-matsu flex items-center justify-center shadow-matsu">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="min-w-0">
                <h2 className="font-mincho text-base font-semibold text-sumi tracking-wide truncate leading-tight">
                  小嶺霊園CRM
                </h2>
                <p className="text-[10px] text-hai tracking-[0.15em] uppercase mt-0.5">
                  Komine Cemetery
                </p>
              </div>
            </Link>
          )}
          <button
            onClick={() => {
              if (mobileOpen) {
                onMobileClose?.();
              } else {
                onToggleCollapse();
              }
            }}
            className={`p-2 rounded-md text-hai hover:text-sumi hover:bg-white cursor-pointer transition-colors ${focusRing}`}
            aria-label={collapsed ? 'メニューを開く' : 'メニューを閉じる'}
          >
            {collapsed ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            )}
          </button>
        </div>

        {/* Navigation */}
        <div className={`flex-1 ${collapsed ? 'px-1.5 py-3' : 'p-4'}`}>
          <nav className="space-y-4">
            {visibleGroups.map((group, groupIndex) => (
              <div key={group.label}>
                {groupIndex > 0 && (
                  <div className="border-t border-gin mb-4"></div>
                )}

                {!collapsed && (
                  <div className="mb-2 px-2">
                    <p className="text-xs font-semibold text-hai uppercase tracking-wider">
                      {group.label}
                    </p>
                    {group.description && (
                      <p className="text-[10px] text-hai-light mt-0.5 normal-case tracking-normal leading-snug">
                        {group.description}
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-1">
                  {group.items.map((item) => {
                    const active = isActive(item.path);

                    return collapsed ? (
                      <Link
                        key={item.path}
                        href={item.path}
                        onClick={onMobileClose}
                        className={`w-full flex justify-center p-2.5 rounded-md cursor-pointer transition-colors ${focusRing} ${active
                          ? 'bg-matsu-50 text-matsu border border-matsu-200'
                          : 'text-sumi hover:bg-white hover:text-matsu'
                          }`}
                        title={item.description ? `${item.label} — ${item.description}` : item.label}
                        aria-label={item.description ? `${item.label}（${item.description}）` : item.label}
                      >
                        <MenuIcon icon={item.icon} className="w-5 h-5" />
                      </Link>
                    ) : (
                      <Link
                        key={item.path}
                        href={item.path}
                        onClick={onMobileClose}
                        className={`w-full flex items-center gap-3 text-left px-3 py-2.5 text-senior-sm rounded-lg cursor-pointer transition-all duration-200 ${focusRing} ${active
                          ? 'bg-matsu-50 text-matsu border-l-[3px] border-matsu shadow-sm font-medium'
                          : 'text-sumi hover:bg-white hover:text-matsu hover:shadow-sm border-l-[3px] border-transparent'
                          }`}
                        title={item.description ? `${item.label} — ${item.description}` : item.label}
                      >
                        <MenuIcon icon={item.icon} className={`w-5 h-5 flex-shrink-0 ${active ? 'text-matsu' : 'text-hai'}`} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* 「業務の流れ」ステッパー（#191/PR#252）は業務フロー誤記載のため暫定削除（#265）。
            正しいフローが確定したら再実装を別 issue で検討する */}
      </div>
    </>
  );
}
