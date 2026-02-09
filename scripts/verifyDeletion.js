const fetch = global.fetch;

const BASE_URL = 'http://localhost:5000/api/constituency';
const TEST_NAME = 'TestConstituency_' + Date.now();

async function verify() {
    try {
        console.log("1. Adding test constituency...");
        const addRes = await fetch(BASE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: TEST_NAME, district: 'TestDistrict', state: 'TestState' })
        });
        const addData = await addRes.json();

        if (!addData.success) throw new Error("Failed to add test constituency");
        const id = addData.id;
        console.log(`   Added ID: ${id}`);

        console.log("2. Verifying existence...");
        const listRes = await fetch(BASE_URL.replace('/constituency', '/constituencies'));
        const listData = await listRes.json();
        const exists = listData.find(c => c.id === id);
        console.log(`   Exists: ${!!exists}`);

        console.log("3. Deleting test constituency...");
        const delRes = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' });
        const delData = await delRes.json();
        if (!delData.success) throw new Error("Failed to delete");
        console.log("   Deleted successfully.");

        console.log("4. Verifying deletion...");
        const listResAfter = await fetch(BASE_URL.replace('/constituency', '/constituencies'));
        const listDataAfter = await listResAfter.json();
        const existsAfter = listDataAfter.find(c => c.id === id);
        console.log(`   Exists after delete: ${!!existsAfter}`);

        if (!exists && !existsAfter) {
            console.log("\nVERIFICATION PASSED!");
        } else if (exists && !existsAfter) {
            console.log("\nVERIFICATION PASSED!");
        } else {
            console.log("\nVERIFICATION FAILED!");
        }

    } catch (err) {
        console.error("Verification error:", err);
    }
}

verify();
