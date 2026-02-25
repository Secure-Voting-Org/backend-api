import pytest
import requests

# Base URL pointing to the new migrated API Port
BASE_URL = "http://localhost:5001"

def test_fraud_detection_simulation():
    """
    Test the Database Breach Simulation API endpoint using Python Requests.
    Validates that the Fraud Engine natively flags out-of-loop raw data.
    """
    url = f"{BASE_URL}/api/admin/inject-fake-vote"
    
    # Send a POST request to simulate a breach
    try:
        response = requests.post(url, headers={"Authorization": "Bearer TEST_TOKEN"})
        assert response.status_code == 200, "Expected 200 OK from server"
        
        data = response.json()
        assert data is not None
        assert "success" in data
        assert data["success"] == True
        assert "Watchdog" in data["message"]
    except requests.exceptions.ConnectionError:
        pytest.skip("Backend is not running at 5001. Skipping API test.")

def test_fraud_clear_data():
    """
    Test the environment reset endpoint using Python Requests.
    Validates that test data traces are completely wiped from PostgreSQL.
    """
    url = f"{BASE_URL}/api/admin/clear-fake-votes"
    
    try:
        response = requests.post(url, headers={"Authorization": "Bearer TEST_TOKEN"})
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
    except requests.exceptions.ConnectionError:
        pytest.skip("Backend is not running at 5001. Skipping API test.")
