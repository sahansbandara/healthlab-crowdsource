jest.mock('../../src/models/FundRequest', () => ({
  aggregate: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
}));

jest.mock('../../src/models/User', () => ({
  aggregate: jest.fn(),
  countDocuments: jest.fn(),
}));

jest.mock('../../src/models/Researcher', () => ({
  aggregate: jest.fn(),
  countDocuments: jest.fn(),
}));

const FundRequest = require('../../src/models/FundRequest');
const User = require('../../src/models/User');
const Researcher = require('../../src/models/Researcher');
const analyticsService = require('../../src/services/analyticsService');

describe('analyticsService unit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getDashboardStats returns normalized analytics payload', async () => {
    User.aggregate.mockResolvedValueOnce([{ _id: 'admin', count: 1 }, { _id: 'participant', count: 2 }]);
    Researcher.aggregate.mockResolvedValueOnce([{ _id: 'approved', count: 1 }, { _id: 'pending', count: 1 }]);
    Researcher.aggregate.mockResolvedValueOnce([{ _id: 'MSc', count: 2 }]);
    User.aggregate.mockResolvedValueOnce([{ _id: '2026-04-01', count: 2 }]);

    User.countDocuments
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(3);

    Researcher.countDocuments
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);

    const result = await analyticsService.getDashboardStats(7);

    expect(result).toHaveProperty('userRoles');
    expect(result).toHaveProperty('researcherStatus');
    expect(result).toHaveProperty('summary');
    expect(result.summary.totalUsers).toBe(3);
    expect(result.userRoles.admin).toBe(1);
    expect(result.researcherStatus.approved).toBe(1);
  });

  test('getReports returns paginated data contract', async () => {
    const fakeRows = [{ _id: 'r1' }, { _id: 'r2' }];

    FundRequest.find.mockReturnValue({
      sort: () => ({
        skip: () => ({
          limit: () => ({
            populate: () => ({
              populate: async () => fakeRows,
            }),
          }),
        }),
      }),
    });

    FundRequest.countDocuments.mockResolvedValue(12);

    const result = await analyticsService.getReports({ page: 2, limit: 5, status: 'APPROVED' });

    expect(result.data).toHaveLength(2);
    expect(result.pagination.total).toBe(12);
    expect(result.pagination.page).toBe(2);
    expect(result.pagination.pages).toBe(3);
  });
});
