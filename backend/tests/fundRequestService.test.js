const {
    createRequest,
    getMyRequests,
    updateStatus
} = require('../src/services/fundRequestService');
const FundRequest = require('../src/models/FundRequest');
const Experiment = require('../src/models/Experiment');
const ExperimentWallet = require('../src/models/ExperimentWallet');
const auditService = require('../src/services/auditService');

jest.mock('../src/models/FundRequest');
jest.mock('../src/models/Experiment');
jest.mock('../src/models/ExperimentWallet');
jest.mock('../src/services/auditService');

describe('FundRequestService Unit Tests', () => {
    let mockUser;

    beforeEach(() => {
        jest.clearAllMocks();
        mockUser = { _id: 'user123', role: 'RESEARCHER' };
    });

    describe('createRequest', () => {
        test('should throw error if targetAmount is <= 0', async () => {
            const data = { targetAmount: 0 };
            await expect(createRequest(mockUser, data)).rejects.toThrow('Target amount must be positive');
        });

        test('should throw error if experiment not found', async () => {
            Experiment.findById.mockResolvedValue(null);
            const data = { experimentId: 'exp123', targetAmount: 100 };
            await expect(createRequest(mockUser, data)).rejects.toThrow('Experiment not found');
        });

        test('should successfully create a request', async () => {
            const mockExperiment = { _id: 'exp123', createdBy: 'user123' };
            Experiment.findById.mockResolvedValue(mockExperiment);
            FundRequest.countDocuments.mockResolvedValue(0); // No active requests, no monthly limit hit

            const mockCreatedRequest = { _id: 'req123', status: 'SUBMITTED' };
            FundRequest.create.mockResolvedValue(mockCreatedRequest);

            const data = { experimentId: 'exp123', targetAmount: 500, reason: 'Equipment' };
            const result = await createRequest(mockUser, data);

            expect(result).toEqual(mockCreatedRequest);
            expect(FundRequest.create).toHaveBeenCalledWith(expect.objectContaining({
                targetAmount: 500,
                status: 'SUBMITTED'
            }));
            expect(auditService.logAction).toHaveBeenCalled();
        });
    });

    describe('updateStatus', () => {
        test('should transition status to UNDER_REVIEW correctly', async () => {
            const mockRequest = {
                _id: 'req123',
                status: 'SUBMITTED',
                save: jest.fn().mockResolvedValue(true),
                experimentId: 'exp123'
            };
            FundRequest.findById.mockResolvedValue(mockRequest);

            const adminUser = { _id: 'admin1', role: 'ADMIN' };
            const result = await updateStatus('req123', adminUser, { status: 'UNDER_REVIEW' });

            expect(result.status).toBe('UNDER_REVIEW');
            expect(mockRequest.save).toHaveBeenCalled();
        });

        test('should throw error for invalid transition to UNDER_REVIEW', async () => {
            const mockRequest = {
                _id: 'req123',
                status: 'DRAFT'
            };
            FundRequest.findById.mockResolvedValue(mockRequest);

            const adminUser = { _id: 'admin1', role: 'ADMIN' };
            await expect(updateStatus('req123', adminUser, { status: 'UNDER_REVIEW' }))
                .rejects.toThrow('Invalid transition to UNDER_REVIEW');
        });
    });
});
