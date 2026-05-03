const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const inspect = async () => {
    const uri = process.env.MONGODB_URI;

    try {
        const conn = await mongoose.createConnection(`${uri}/af_project_db`).asPromise();
        const User = conn.model("User", new mongoose.Schema({}, { strict: false }), "users");
        const Experiment = conn.model("Experiment", new mongoose.Schema({}, { strict: false }), "experiments");

        const userCount = await User.countDocuments();
        const expCount = await Experiment.countDocuments();

        console.log(`User count in af_project_db: ${userCount}`);
        console.log(`Experiment count in af_project_db: ${expCount}`);

        if (expCount > 0) {
            const sampleExp = await Experiment.findOne();
            console.log('Sample Experiment:', JSON.stringify(sampleExp, null, 2));
        }

        if (userCount > 0) {
            const sampleUser = await User.findOne().select('-password');
            console.log('Sample User:', JSON.stringify(sampleUser, null, 2));
        }

        await conn.close();
        process.exit(0);
    } catch (err) {
        console.error('Inspection failed:', err);
        process.exit(1);
    }
};

inspect();
