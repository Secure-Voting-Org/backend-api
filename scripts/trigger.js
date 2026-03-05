async function test() {
    try {
        const res = await fetch('http://localhost:5000/api/observer/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fullName: "JWT Test User",
                email: "jwt-test3@eci.gov.in",
                username: "obs_test3",
                password: "password123",
                role: "general"
            })
        });
        const text = await res.text();
        console.log("RESPONSE:", res.status, text);
    } catch (e) {
        console.error("FAIL", e);
    }
}
test();
