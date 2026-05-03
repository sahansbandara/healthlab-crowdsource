const http = require('http');

http.get('http://localhost:5000/api/experiments', (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        console.log('--- RESPONSE START ---');
        console.log(data);
        console.log('--- RESPONSE END ---');
    });
}).on('error', (err) => {
    console.error('Error fetching experiments:', err.message);
});
