import { render } from '@testing-library/react';

import PlotDocumentCreatePage from '@/app/(main)/plots/[id]/documents/create/page';
import PlotDocumentHistoryPage from '@/app/(main)/plots/[id]/documents/page';

/**
 * 区画のページの番号（URL の id）は区画の番号。顧客の番号として渡さない。
 */

let captured: Record<string, unknown> = {};

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'plot-1' }),
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/components/document-management', () => ({
  DocumentManagement: (props: Record<string, unknown>) => {
    captured = props;
    return null;
  },
}));

jest.mock('@/components/desktop-only-gate', () => ({
  DesktopOnlyGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/hooks/usePlots', () => ({
  usePlotDetail: () => ({
    plot: {
      id: 'plot-1',
      roles: [{ role: 'contractor', customer: { id: 'cust-1', name: '大利 和子' } }],
    },
  }),
}));

describe('区画の書類ページ', () => {
  beforeEach(() => {
    captured = {};
  });

  it('作成ページは、区画と契約者をそれぞれの欄で渡す', () => {
    render(<PlotDocumentCreatePage />);
    expect(captured.contractPlotId).toBe('plot-1');
    expect(captured.customerId).toBe('cust-1');
  });

  it('履歴ページは、区画で絞り込む（区画の番号を顧客の番号にしない）', () => {
    render(<PlotDocumentHistoryPage />);
    expect(captured.contractPlotId).toBe('plot-1');
    expect(captured.customerId).not.toBe('plot-1');
  });
});
