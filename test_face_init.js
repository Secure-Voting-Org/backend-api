const faceService = require('./utils/faceService');

async function testFaceService() {
    console.log('--- FACE SERVICE DIAGNOSTIC ---');
    try {
        await faceService.loadModels();
        console.log('SUCCESS: Models loaded successfully in Node environment.');

        // We won't test full extraction without a real image here, 
        // but model loading is the biggest hurdle in Node.
        console.log('DIAGNOSTIC COMPLETE.');
    } catch (err) {
        console.error('FAILED: Face model loading error:', err);
        process.exit(1);
    }
}

testFaceService();
