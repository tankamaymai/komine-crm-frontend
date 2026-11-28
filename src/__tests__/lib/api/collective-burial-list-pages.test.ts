jest.mock('@/lib/api/client', () => ({
  apiRequest: jest.fn(),
  shouldUseMockData: () => false,
}));

import { apiRequest } from '@/lib/api/client';
import { getCollectiveBurialList } from '@/lib/api/collective-burials';

const apiRequestMock = apiRequest as jest.Mock;

function page(ids: string[], totalCount: number, pageNumber: number, totalPages: number) {
  return {
    success: true,
    data: {
      items: ids.map((id) => ({ id })),
      pagination: { page: pageNumber, limit: 1000, totalCount, totalPages },
    },
  };
}

describe('合祀一覧は画面に全員出す', () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
  });

  it('1ページで足りるときは1回だけ取る', async () => {
    apiRequestMock.mockResolvedValue(page(['a'], 1, 1, 1));

    const result = await getCollectiveBurialList();

    expect(apiRequestMock).toHaveBeenCalledTimes(1);
    expect(apiRequestMock.mock.calls[0][0]).toContain('limit=1000');
    expect(result.success && result.data.items.map((item) => item.id)).toEqual(['a']);
  });

  it('続きのページがあるときは全部つなげる', async () => {
    apiRequestMock
      .mockResolvedValueOnce(page(['a'], 2, 1, 2))
      .mockResolvedValueOnce(page(['b'], 2, 2, 2));

    const result = await getCollectiveBurialList({ search: '51' });

    expect(apiRequestMock).toHaveBeenCalledTimes(2);
    expect(apiRequestMock.mock.calls[0][0]).toContain('search=51');
    expect(apiRequestMock.mock.calls[1][0]).toContain('page=2');
    expect(result.success && result.data.items.map((item) => item.id)).toEqual(['a', 'b']);
    if (result.success) {
      expect(result.data.pagination.totalCount).toBe(2);
    }
  });
});
