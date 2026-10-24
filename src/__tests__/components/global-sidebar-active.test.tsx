/**
 * GlobalSidebar アクティブ項目判定のテスト（#270）
 *
 * - 通常パスは前方一致で対応するナビ項目がアクティブになる
 * - 区画コンテキストの書類画面（/plots/[id]/documents 配下）では
 *   「台帳問い合わせ」ではなく「書類管理」がアクティブになる
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import GlobalSidebar from '@/components/layout/GlobalSidebar';

let mockPathname = '/plots';

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    user: {
      id: 'staff-1',
      email: 'test@example.com',
      name: 'テスト太郎',
      role: 'admin',
    },
  }),
}));

function renderSidebar() {
  return render(<GlobalSidebar collapsed={false} onToggleCollapse={() => {}} />);
}

/** ナビ項目リンクがアクティブ表示（bg-matsu-50）かどうか */
function isLinkActive(label: string): boolean {
  const link = screen.getByRole('link', { name: new RegExp(`^${label}`) });
  return link.className.includes('bg-matsu-50');
}

describe('GlobalSidebar アクティブ項目判定', () => {
  it('/plots では台帳問い合わせがアクティブ', () => {
    mockPathname = '/plots';
    renderSidebar();
    expect(isLinkActive('台帳問い合わせ')).toBe(true);
    expect(isLinkActive('書類管理')).toBe(false);
  });

  it('/plots/[id]（区画詳細）では台帳問い合わせがアクティブ', () => {
    mockPathname = '/plots/123';
    renderSidebar();
    expect(isLinkActive('台帳問い合わせ')).toBe(true);
    expect(isLinkActive('書類管理')).toBe(false);
  });

  it('/plots/[id]/edit では台帳問い合わせがアクティブのまま', () => {
    mockPathname = '/plots/123/edit';
    renderSidebar();
    expect(isLinkActive('台帳問い合わせ')).toBe(true);
    expect(isLinkActive('書類管理')).toBe(false);
  });

  it('/plots/[id]/documents（書類履歴）では書類管理がアクティブ（#270）', () => {
    mockPathname = '/plots/123/documents';
    renderSidebar();
    expect(isLinkActive('書類管理')).toBe(true);
    expect(isLinkActive('台帳問い合わせ')).toBe(false);
  });

  it('/plots/[id]/documents/create（書類作成）では書類管理がアクティブ（#270）', () => {
    mockPathname = '/plots/123/documents/create';
    renderSidebar();
    expect(isLinkActive('書類管理')).toBe(true);
    expect(isLinkActive('台帳問い合わせ')).toBe(false);
  });

  it('/documents（グローバル書類管理）では書類管理がアクティブ', () => {
    mockPathname = '/documents';
    renderSidebar();
    expect(isLinkActive('書類管理')).toBe(true);
    expect(isLinkActive('台帳問い合わせ')).toBe(false);
  });

  it('/bulk-invoice では請求書一括印刷がアクティブ（書類管理と取り違えない）', () => {
    mockPathname = '/bulk-invoice';
    renderSidebar();
    expect(isLinkActive('請求書一括印刷')).toBe(true);
    expect(isLinkActive('書類管理')).toBe(false);
  });

  it('/collective-burials では合祀管理がアクティブ', () => {
    mockPathname = '/collective-burials';
    renderSidebar();
    expect(isLinkActive('合祀管理')).toBe(true);
    expect(isLinkActive('台帳問い合わせ')).toBe(false);
  });
});
