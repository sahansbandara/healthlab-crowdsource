const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Experiment = require('../src/models/Experiment');
const FundRequest = require('../src/models/FundRequest');
const ExperimentWallet = require('../src/models/ExperimentWallet');

require('dotenv').config();

// Helper to create token
const generateToken = (id) => {
    const jwt = require('jsonwebtoken');
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1d' });
};

beforeAll(async () => {
    // Check if connected, if not connect. 
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGODB_URI);
    }
});

afterAll(async () => {
    await mongoose.connection.close();
});

describe('Fund Management Integration Flow', () => {
    let adminToken, researcherToken;
    let researcherId, adminId;
    let experimentId;

    beforeEach(async () => {
        await User.deleteMany({});
        await Experiment.deleteMany({});
        await ExperimentWallet.deleteMany({});
        await FundRequest.deleteMany({});

        // 1. Setup Users
        const admin = await User.create({ name: 'Admin', email: 'admin@test.com', password: 'password', role: 'ADMIN' });
        adminId = admin._id;
        adminToken = generateToken(admin._id);

        const researcher = await User.create({ name: 'Researcher', email: 'res@test.com', password: 'password', role: 'RESEARCHER' });
        researcherId = researcher._id;
        researcherToken = generateToken(researcher._id);

        // 2. Setup Experiment
        const exp = await Experiment.create({
            ownerId: researcherId,
            title: 'Test Experiment',
            fundingTargetAmount: 10000,
            minTopUpAmount: 50,
            maxTopUpAmount: 5000,
            currency: 'USD'
        });
        experimentId = exp._id;

        // Wallet
        await ExperimentWallet.create({ experimentId, balance: 0 });
    });

    test('Full flow: Create -> Submit -> Approve -> Wallet Check', async () => {
        // 1. Create Request (DRAFT)
        const createRes = await request(app)
            .post('/api/fund-requests')
            .set('Authorization', `Bearer ${researcherToken}`)
            .send({
                experimentId,
                requestedAmount: 500,
                reason: 'Lab equipment'
            });

        expect(createRes.status).toBe(201);
        expect(createRes.body.status).toBe('DRAFT');
        const requestId = createRes.body._id;

        // 2. Submit Request
        const submitRes = await request(app)
            .put(`/api/fund-requests/${requestId}`)
            .set('Authorization', `Bearer ${researcherToken}`)
            .send({
                status: 'SUBMITTED'
            });

        expect(submitRes.status).toBe(200);
        expect(submitRes.body.status).toBe('SUBMITTED');

        // 3. Admin: Review -> UNDER_REVIEW
        const reviewRes = await request(app)
            .patch(`/api/admin/fund-requests/${requestId}/status`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                status: 'UNDER_REVIEW'
            });

        expect(reviewRes.status).toBe(200);
        expect(reviewRes.body.status).toBe('UNDER_REVIEW');

        // 4. Admin: Approve
        const approveRes = await request(app)
            .patch(`/api/admin/fund-requests/${requestId}/status`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                status: 'APPROVED',
                adminDecisionNote: 'Approved for science'
            });

        expect(approveRes.status).toBe(200);
        expect(approveRes.body.status).toBe('APPROVED');
        expect(approveRes.body.approvedAmount).toBe(500);

        // 5. Check Wallet
        // Researcher checks wallet
        const walletRes = await request(app)
            .get(`/api/experiments/${experimentId}/wallet`)
            .set('Authorization', `Bearer ${researcherToken}`);

        expect(walletRes.status).toBe(200);
        expect(walletRes.body.balance).toBe(500);
    });

    test('Validation: Min Top Up Amount', async () => {
        const res = await request(app)
            .post('/api/fund-requests')
            .set('Authorization', `Bearer ${researcherToken}`)
            .send({
                experimentId,
                requestedAmount: 10, // Min is 50
                reason: 'Too low'
            });

        expect(res.status).toBe(400);
    });
});
