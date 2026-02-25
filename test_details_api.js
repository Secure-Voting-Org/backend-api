const axios = require('axios');

const testDetails = async () => {
    try {
        // 1. Get List to find an ID
        console.log("Fetching list...");
        const listRes = await axios.get('http://localhost:5000/api/admin/pending-voters');

        if (listRes.data.length === 0) {
            console.log("No pending voters to test with.");
            return;
        }

        const appId = listRes.data[0].application_id;
        console.log(`Testing details for App ID: ${appId}`);

        // 2. Get Details
        const detailRes = await axios.get(`http://localhost:5000/api/admin/pending-voter/${appId}`);
        console.log("Status:", detailRes.status);
        console.log("Has Image Data?", !!detailRes.data.profile_image_data);
        console.log("Success!");

    } catch (err) {
        console.error("Test Failed:");
        if (err.response) {
            console.error(`Status: ${err.response.status}`);
            console.error(`Data:`, err.response.data);
        } else {
            console.error(err.message);
        }
    }
};

testDetails();
