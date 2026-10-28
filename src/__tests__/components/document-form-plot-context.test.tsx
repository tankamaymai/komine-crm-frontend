import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { PlotDetailResponse } from '@komine/types';

import { DocumentForm } from '@/components/document-form';

/**
 * 区画のページから書類を保存するとき、区画の番号を顧客の番号として送らない。
 * 送ると裏側が「指定された顧客が見つかりません」で断る。
 */

const createMock = jest.fn();

jest.mock('@/hooks/useDocuments', () => {
  const actual = jest.requireActual('@/hooks/useDocuments');
  return {
    ...actual,
    useDocumentDetail: () => ({ data: null, isLoading: false, error: null, refresh: jest.fn() }),
    useDocumentMutations: () => ({
      create: createMock,
      update: jest.fn(),
      generate: jest.fn(),
      isLoading: false,
      error: null,
    }),
  };
});

jest.mock('@/lib/permit-text-measure', () => ({
  measureTextPt: () => 0,
  useFontsReadyVersion: () => 1,
  permitPrintFont: { className: 'font-print', style: { fontFamily: 'Noto Sans JP' } },
}));

jest.mock('@/lib/api/plots', () => {
  const actual = jest.requireActual('@/lib/api/plots');
  return {
    ...actual,
    getContractorPlotNumber: jest.fn().mockResolvedValue({ success: false }),
  };
});

const plotDetail = {
  id: 'plot-1',
  physicalPlot: { areaName: 'A区', plotNumber: '105', displayNumber: '105', areaSqm: 1.7 },
  roles: [
    {
      role: 'contractor',
      customer: { id: 'cust-1', name: '大利 和子', address: '福岡県中間市通谷' },
    },
  ],
} as unknown as PlotDetailResponse;

describe('区画のページから書類を保存する', () => {
  beforeEach(() => {
    createMock.mockReset();
    createMock.mockResolvedValue({ id: 'doc-1' });
  });

  it('顧客はその区画の契約者、区画はその区画として送る', async () => {
    render(
      <DocumentForm templateId="permit" plotDetail={plotDetail} onBack={jest.fn()} onSaved={jest.fn()} />
    );

    fireEvent.click(screen.getAllByRole('button', { name: '書類を保存' })[0]!);

    await waitFor(() => expect(createMock).toHaveBeenCalled());
    expect(createMock.mock.calls[0]![0]).toMatchObject({
      customerId: 'cust-1',
      contractPlotId: 'plot-1',
    });
  });
});
