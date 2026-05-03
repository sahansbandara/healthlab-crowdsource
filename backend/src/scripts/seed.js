require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Experiment = require('../models/Experiment');
const ExperimentWallet = require('../models/ExperimentWallet');
const FundRequest = require('../models/FundRequest');
const { connectDB } = require('../config/db');

const seedData = async () => {
    await connectDB();

    try {
        await User.deleteMany({});
        await Experiment.deleteMany({});
        await ExperimentWallet.deleteMany({});
        await FundRequest.deleteMany({});

        console.log('Data destroyed...');

        // Create Users
        const adminUser = await User.create({
            name: 'Admin User',
            email: 'admin@healthlab.io',
            password: 'password123',
            role: 'ADMIN'
        });

        const researcherUser = await User.create({
            name: 'Dr. Researcher',
            email: 'researcher@healthlab.io',
            password: 'password123',
            role: 'RESEARCHER'
        });

        console.log('Users created...');

        // Create Experiment
        const experiment = await Experiment.create({
            ownerId: researcherUser._id,
            title: 'Cancer Research Phase 1',
            description: 'A study on metabolic markers and their correlation with early-stage diagnosis.',
            tags: ['metabolic-health', 'circadian-rhythm'],
            fundingTargetAmount: 50000,
            minTopUpAmount: 100,
            maxTopUpAmount: 5000,
            maxTotalTopUps: 20000,
            currency: 'USD'
        });

        // Wallet is created automatically by logic? 
        // Logic is in ExperimentService.createExperiment, but here we used Model.create directly.
        // So we must manually create wallet.
        await ExperimentWallet.create({
            experimentId: experiment._id,
            currency: 'USD',
            balance: 0
        });

        console.log('Experiment & Wallet created...');

        // Create a fund request
        await FundRequest.create({
            experimentId: experiment._id,
            researcherId: researcherUser._id,
            requestedAmount: 1000,
            reason: 'Reagents purchase',
            status: 'SUBMITTED',
            submittedAt: new Date()
        });

        console.log('Fund Request created...');
        console.log('Seed completed!');
        process.exit();

    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

seedData();
