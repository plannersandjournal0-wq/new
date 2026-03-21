import requests
import sys
import os
import json
from datetime import datetime
from pathlib import Path
import io

# Get backend URL from frontend env
BACKEND_URL = "https://journal-build.preview.emergentagent.com/api"
ADMIN_PASSWORD = "Pankaj021"

class StorybookVaultTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.test_storybook_id = None

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}: PASSED {details}")
        else:
            print(f"❌ {name}: FAILED {details}")
            self.failed_tests.append({"test": name, "details": details})

    def test_root_endpoint(self):
        """Test root API endpoint"""
        try:
            response = requests.get(f"{self.base_url}/")
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f" Message: {data.get('message', 'N/A')}"
        except Exception as e:
            success = False
            details = f"Error: {str(e)}"
        
        self.log_test("Root endpoint", success, details)
        return success

    def test_admin_login(self, password=ADMIN_PASSWORD):
        """Test admin login endpoint"""
        try:
            response = requests.post(
                f"{self.base_url}/admin/login",
                json={"password": password}
            )
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                self.token = data.get('token')
                details += f" Token received: {bool(self.token)}"
            else:
                details += f" Error: {response.text}"
        except Exception as e:
            success = False
            details = f"Error: {str(e)}"
        
        self.log_test("Admin login", success, details)
        return success

    def test_admin_login_wrong_password(self):
        """Test admin login with wrong password"""
        try:
            response = requests.post(
                f"{self.base_url}/admin/login",
                json={"password": "wrongpassword"}
            )
            success = response.status_code == 401
            details = f"Status: {response.status_code} (Should be 401)"
        except Exception as e:
            success = False
            details = f"Error: {str(e)}"
        
        self.log_test("Admin login wrong password", success, details)
        return success

    def create_test_pdf(self):
        """Create a simple test PDF in memory"""
        try:
            # Create a minimal PDF content
            pdf_content = b"""%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Test Storybook Page) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000053 00000 n 
0000000108 00000 n 
0000000179 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
274
%%EOF"""
            return io.BytesIO(pdf_content)
        except Exception as e:
            print(f"Failed to create test PDF: {e}")
            return None

    def test_upload_storybook(self):
        """Test storybook upload endpoint"""
        if not self.token:
            self.log_test("Upload storybook", False, "No auth token available")
            return False

        try:
            # Create test PDF
            pdf_file = self.create_test_pdf()
            if not pdf_file:
                self.log_test("Upload storybook", False, "Failed to create test PDF")
                return False

            headers = {"Authorization": f"Bearer {self.token}"}
            files = {
                'file': ('test_storybook.pdf', pdf_file, 'application/pdf')
            }
            data = {
                'title': 'Test Storybook',
                'subtitle': 'A test storybook for validation'
            }

            response = requests.post(
                f"{self.base_url}/storybooks/upload",
                headers=headers,
                files=files,
                data=data
            )
            
            success = response.status_code in [200, 201]
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                self.test_storybook_id = data.get('id')
                details += f" Storybook ID: {self.test_storybook_id}"
            else:
                details += f" Error: {response.text}"
                
        except Exception as e:
            success = False
            details = f"Error: {str(e)}"
        
        self.log_test("Upload storybook", success, details)
        return success

    def test_get_storybooks(self):
        """Test get storybooks endpoint"""
        try:
            headers = {"Authorization": f"Bearer {self.token}"} if self.token else {}
            response = requests.get(f"{self.base_url}/storybooks", headers=headers)
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f" Count: {len(data)} storybooks"
            else:
                details += f" Error: {response.text}"
                
        except Exception as e:
            success = False
            details = f"Error: {str(e)}"
        
        self.log_test("Get storybooks", success, details)
        return success

    def test_get_storybook_by_id(self):
        """Test get storybook by ID"""
        if not self.test_storybook_id:
            self.log_test("Get storybook by ID", False, "No test storybook ID available")
            return False

        try:
            headers = {"Authorization": f"Bearer {self.token}"} if self.token else {}
            response = requests.get(
                f"{self.base_url}/storybooks/{self.test_storybook_id}", 
                headers=headers
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f" Title: {data.get('title', 'N/A')}"
                
        except Exception as e:
            success = False
            details = f"Error: {str(e)}"
        
        self.log_test("Get storybook by ID", success, details)
        return success

    def test_update_storybook(self):
        """Test update storybook endpoint"""
        if not self.test_storybook_id or not self.token:
            self.log_test("Update storybook", False, "Missing storybook ID or token")
            return False

        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            update_data = {
                "status": "published",
                "passwordProtected": True,
                "password": "testpass123"
            }
            
            response = requests.put(
                f"{self.base_url}/storybooks/{self.test_storybook_id}",
                headers=headers,
                json=update_data
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f" Message: {data.get('message', 'Updated')}"
            else:
                details += f" Error: {response.text}"
                
        except Exception as e:
            success = False
            details = f"Error: {str(e)}"
        
        self.log_test("Update storybook", success, details)
        return success

    def test_password_verification(self):
        """Test password verification endpoint"""
        if not self.test_storybook_id:
            self.log_test("Password verification", False, "No test storybook ID")
            return False

        try:
            response = requests.post(
                f"{self.base_url}/storybooks/{self.test_storybook_id}/verify-password",
                json={"password": "testpass123"}
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f" Valid: {data.get('valid', False)}"
                
        except Exception as e:
            success = False
            details = f"Error: {str(e)}"
        
        self.log_test("Password verification", success, details)
        return success

    def test_get_storybook_by_slug(self):
        """Test get storybook by slug (customer endpoint)"""
        if not self.test_storybook_id:
            self.log_test("Get storybook by slug", False, "No test storybook available")
            return False

        try:
            # First get the storybook to find its slug
            headers = {"Authorization": f"Bearer {self.token}"} if self.token else {}
            sb_response = requests.get(
                f"{self.base_url}/storybooks/{self.test_storybook_id}", 
                headers=headers
            )
            
            if sb_response.status_code != 200:
                self.log_test("Get storybook by slug", False, "Could not get storybook slug")
                return False
                
            slug = sb_response.json().get('slug')
            if not slug:
                self.log_test("Get storybook by slug", False, "No slug found")
                return False

            # Now test the slug endpoint
            response = requests.get(f"{self.base_url}/storybooks/slug/{slug}")
            
            success = response.status_code == 200
            details = f"Status: {response.status_code} Slug: {slug}"
            
            if success:
                data = response.json()
                details += f" Title: {data.get('title', 'N/A')}"
                
        except Exception as e:
            success = False
            details = f"Error: {str(e)}"
        
        self.log_test("Get storybook by slug", success, details)
        return success

    def cleanup_test_data(self):
        """Clean up test storybook"""
        if not self.test_storybook_id or not self.token:
            return

        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            response = requests.delete(
                f"{self.base_url}/storybooks/{self.test_storybook_id}",
                headers=headers
            )
            success = response.status_code == 200
            self.log_test("Cleanup test data", success, f"Status: {response.status_code}")
        except Exception as e:
            print(f"Cleanup failed: {e}")

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Storybook Vault Backend Tests")
        print(f"🔗 Testing against: {self.base_url}")
        print("=" * 60)

        # Basic connectivity
        self.test_root_endpoint()
        
        # Authentication tests
        self.test_admin_login_wrong_password()
        self.test_admin_login()
        
        # Storybook management
        if self.token:
            self.test_get_storybooks()
            self.test_upload_storybook()
            self.test_get_storybook_by_id()
            self.test_update_storybook()
            self.test_password_verification()
            self.test_get_storybook_by_slug()
            
            # Cleanup
            self.cleanup_test_data()
        
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for test in self.failed_tests:
                print(f"  - {test['test']}: {test['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = StorybookVaultTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())