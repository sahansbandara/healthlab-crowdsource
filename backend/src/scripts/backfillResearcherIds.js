const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const Researcher = require('../models/Researcher');
const { db } = require('../config/db');

async function backfill() {
  try {
    console.log('--- Starting Researcher ID Backfill ---');
    
    // Find all approved researchers without IDs
    const researchers = await Researcher.find({ 
      status: 'approved', 
      researcherId: { $exists: false } 
    }).sort({ createdAt: 1 }); // Oldest first

    console.log(`Found ${researchers.length} researchers to backfill.`);

    let nextNum = 1;

    // Get current max ID if some already exist
    const lastWithId = await Researcher.findOne({ researcherId: { $ne: null } })
      .sort({ researcherId: -1 });

    if (lastWithId && lastWithId.researcherId) {
      const match = lastWithId.researcherId.match(/RE(\d+)/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }

    for (const r of researchers) {
      const newId = `RE${nextNum.toString().padStart(3, '0')}`;
      r.researcherId = newId;
      await r.save();
      console.log(`Assigned ${newId} to ${r.fullName}`);
      nextNum++;
    }

    console.log('--- Backfill Completed Successfully ---');
    process.exit(0);
  } catch (err) {
    console.error('Backfill failed:', err);
    process.exit(1);
  }
}

// Wait for DB connection
db.on('open', backfill);
db.on('error', (err) => {
  console.error('DB connection error:', err);
  process.exit(1);
});
