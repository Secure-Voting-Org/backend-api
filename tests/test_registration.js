async function testRegistration() {
    const payload = {
        "aadhaar": "123412341234",
        "faceDescriptor": [],
        "formData": {
            "firstName": "Test",
            "surname": "User",
            "relativeName": "Parent",
            "relationType": "Father",
            "state": "State",
            "district": "District",
            "assemblyConstituency": "Constituency1",
            "dobDay": "01",
            "dobMonth": "01",
            "dobYear": "1990",
            "gender": "Male",
            "mobileSelf": true,
            "mobileNumber": "9999999999",
            "emailSelf": true,
            "email": "test@example.com",
            "houseNo": "1",
            "streetArea": "Street",
            "villageTown": "City",
            "pincode": "123456",
            "disabilityCategories": { "locomotive": false }
        }
    };

    try {
        const response = await fetch('http://localhost:8081/api/registration/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log(`Status: ${response.status}`);
        console.log("Response:", JSON.stringify(data, null, 2));
    } catch (error) {
        console.log("Error:", error.message);
    }
}

testRegistration();
