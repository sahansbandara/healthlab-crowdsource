const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });

async function run() {
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);
    try {
        await client.connect();
        // Default db is extracted from URI, or specify if needed. The URI has af_project_db
        const db = client.db();

        const email = 'doctor@example.com';
        const password = 'password123';

        const users = db.collection('users');
        const existingUser = await users.findOne({ email });
        if (existingUser) {
            await users.deleteOne({ email });
            await db.collection('researchers').deleteMany({ user: existingUser._id });
            console.log('Cleaned up existing user');
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const insertUserRes = await users.insertOne({
            name: 'Dr. John Doe',
            email: email,
            password: hashedPassword,
            role: 'researcher',
            createdAt: new Date(),
            updatedAt: new Date(),
            __v: 0
        });

        const researchers = db.collection('researchers');
        await researchers.insertOne({
            user: insertUserRes.insertedId,
            fullName: 'Dr. John Doe',
            status: 'approved',
            nic: '123456789V',
            gender: 'Male',
            highestAcademicQualification: 'PhD',
            researcherType: 'Academic',
            hasPublishedResearch: true,
            purpose: 'Testing API',
            createdAt: new Date(),
            updatedAt: new Date(),
            __v: 0
        });

        console.log('Successfully created test researcher!');
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);
    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

run();
