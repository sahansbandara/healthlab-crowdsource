const { MongoClient } = require('mongodb');
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

const checkStatus = async () => {
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db('af_project_db');
        const experiments = await db.collection('experiments').find({}).toArray();

        console.log(`Total experiments: ${experiments.length}`);
        experiments.forEach(exp => {
            console.log(`ID: ${exp._id}, Status: ${exp.status}, Title: ${exp.title}`);
        });

        await client.close();
        process.exit(0);
    } catch (err) {
        console.error('Check failed:', err);
        process.exit(1);
    }
};

checkStatus();
