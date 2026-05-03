require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const { connectDB } = require('../src/config/db');
const User = require('../src/models/User');
const Experiment = require('../src/models/Experiment');

const run = async () => {
    try {
        await connectDB();

        console.log('--- DIAGNOSTICS ---');
        console.log('User Model DB:', User.db.name);
        console.log('Experiment Model DB:', Experiment.db.name);

        const usersCount = await User.countDocuments();
        console.log('Users in User.db:', usersCount);

        const expCount = await Experiment.countDocuments();
        console.log('Experiments in Experiment.db:', expCount);

        if (expCount > 0) {
            const oneExp = await Experiment.findOne();
            console.log('Sample experiment ID:', oneExp._id);
        }

    } catch (err) {
        console.error('DIAGNOSTIC FAILURE:', err);
    }
    process.exit(0);
};

run();
