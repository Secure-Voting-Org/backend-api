const http = require('http');

const constituencies = [
    { name: 'Kuppam', district: 'Chittoor' },
    { name: 'Pulivendula', district: 'Kadapa' },
    { name: 'Tekkali', district: 'Srikakulam' },
    { name: 'Mangalagiri', district: 'Guntur' },
    { name: 'Hindupur', district: 'Anantapur' }
];

function postData(data) {
    const postData = JSON.stringify(data);

    const options = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/constituency',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const req = http.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => { responseData += chunk; });
        res.on('end', () => {
            console.log(`Response for ${data.name}: ${res.statusCode} ${responseData}`);
        });
    });

    req.on('error', (e) => {
        console.error(`Problem with request: ${e.message}`);
    });

    req.write(postData);
    req.end();
}

console.log("Seeding constituencies...");
const interval = setInterval(() => {
    const c = constituencies.shift();
    if (c) {
        postData(c);
    } else {
        clearInterval(interval);
    }
}, 500); // Stagger requests slightly
