const axios = require('axios');

const testApi = async () => {
    const refId = 'HDDPBJMWKK37';
    try {
        console.log(`Testing API for RefID: ${refId}`);
        const url = `http://localhost:8081/api/application/status/${refId}`;
        const res = await axios.get(url);
        console.log('Response:', res.status, res.data);
    } catch (err) {
        if (err.response) {
            console.log('Error Response:', err.response.status, err.response.data);
        } else {
            console.error('Error:', err.message);
        }
    }
};

testApi();
