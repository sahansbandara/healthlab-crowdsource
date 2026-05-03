const axios = require('axios');
require('dotenv').config();

const BASE_URL = `http://localhost:${process.env.PORT || 5000}`;

async function runBenchmark() {
    console.log('--- Funding Module Performance Benchmark ---');
    console.log(`Target: ${BASE_URL}`);

    const endpoints = [
        { name: 'Health Check', url: '/health' },
        { name: 'Open Fund Requests', url: '/api/fund-requests/open' }
    ];

    for (const endpoint of endpoints) {
        console.log(`\nTesting ${endpoint.name}...`);
        const start = Date.now();
        try {
            await axios.get(`${BASE_URL}${endpoint.url}`);
            const duration = Date.now() - start;
            console.log(`✅ Success: ${duration}ms`);
        } catch (err) {
            console.error(`❌ Failed: ${err.message}`);
        }
    }

    console.log('\n--- Benchmark Complete ---');
}

runBenchmark();
