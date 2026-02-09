const axios = require('axios');

const testApi = async () => {
    const refId = '2AAIGKC18WAU';
    const url = `http://localhost:5000/api/application/status/${refId}`;
    console.log(`Testing API: ${url}`);

    try {
        const res = await axios.get(url);
        console.log("Status:", res.status);
        console.log("Data:", res.data);
    } catch (err) {
        console.error("API Call Failed:");
        if (err.response) {
            console.error("Status:", err.response.status);
            console.error("Data:", err.response.data);
        } else {
            console.error(err.message);
        }
    }
};

testApi();
