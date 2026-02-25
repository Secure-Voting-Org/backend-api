import pytest
import requests
import zipfile
import io

BASE_URL = "http://localhost:5001"

def test_export_ledger_zip():
    """
    Test 5.5: Auditor Forensic Tools
    Verifies that the /api/observer/export-ledger endpoint returns a valid .zip file
    containing the ledger.json and signature.sha256 files.
    """
    # 1. Hit the export endpoint
    response = requests.get(f"{BASE_URL}/api/observer/export-ledger")
    
    # 2. Verify response status and headers
    assert response.status_code == 200, "Expected status code 200 for export-ledger"
    assert "application/zip" in response.headers.get("Content-Type", ""), "Response should be a ZIP archive"
    assert "secure_voting_ledger_export.zip" in response.headers.get("Content-Disposition", ""), "Missing expected filename in disposition"

    # 3. Read the binary content into a BytesIO object so we can parse it as a ZIP
    try:
        zip_buffer = io.BytesIO(response.content)
        with zipfile.ZipFile(zip_buffer, 'r') as zf:
            # 4. Get the list of files inside the zip
            file_names = zf.namelist()
            
            # 5. Verify the required files are inside the archive
            assert "ledger.json" in file_names, "ledger.json is missing from the export archive"
            assert "signature.sha256" in file_names, "signature.sha256 is missing from the export archive"
            assert "README.txt" in file_names, "README.txt is missing from the export archive"
            
            # 6. Verify ledger.json is not empty
            ledger_data = zf.read("ledger.json")
            assert len(ledger_data) > 0, "ledger.json is empty"
            
            # 7. Verify signature is correctly sized (sha256 hex string is 64 characters)
            sig_data = zf.read("signature.sha256").decode('utf-8')
            assert len(sig_data) == 64, f"Signature should be exactly 64 characters, got {len(sig_data)}"
            
    except zipfile.BadZipFile:
        pytest.fail("The response could not be parsed as a valid ZIP file")
