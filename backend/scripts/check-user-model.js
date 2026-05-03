require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const { connectDB } = require('../src/config/db');
const User = require('../src/models/User');

const check = async () => {
    await connectDB();
    const id = "67b494640183c123cfac33c3";
    try {
        const user = await User.findById(id);
        console.log(`Lookup result for ${id}:`, user ? `Found (${user.email})` : 'NOT FOUND');
        console.log(`User model is on DB: ${User.db.name}`);
    } catch (err) {
        console.error('Error:', err);
    }
    process.exit(0);
};

check();
