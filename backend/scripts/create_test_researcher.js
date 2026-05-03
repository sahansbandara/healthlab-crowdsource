require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../src/models/User");
const Researcher = require("../src/models/Researcher");

async function createTestResearcher() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");

        const email = "test_researcher@example.com";
        const password = "password123";

        // Delete existing if any
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            await Researcher.deleteMany({ user: existingUser._id });
            await User.deleteOne({ email });
            console.log("Deleted existing test user");
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await User.create({
            name: "Test Researcher",
            email,
            password: hashedPassword,
            role: "researcher",
        });

        const researcher = await Researcher.create({
            user: user._id,
            fullName: "Test Researcher",
            nic: "123456789V",
            gender: "Male",
            currentWorkplace: "Test Lab",
            highestAcademicQualification: "PhD",
            researcherType: "Student",
            hasPublishedResearch: true,
            purpose: "Testing",
            status: "approved", // Set as approved
        });

        console.log("Created test researcher:");
        console.log("Email:", email);
        console.log("Password:", password);

        mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error);
        mongoose.disconnect();
    }
}

createTestResearcher();
