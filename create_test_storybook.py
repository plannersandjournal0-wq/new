import requests
import json
import io

# Create and upload a real test storybook
BACKEND_URL = "https://journal-build.preview.emergentagent.com/api"
ADMIN_PASSWORD = "Pankaj021"

def create_simple_pdf():
    """Create a simple test PDF"""
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
/Kids [3 0 R 4 0 R]
/Count 2
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 5 0 R
>>
endobj

4 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 6 0 R
>>
endobj

5 0 obj
<<
/Length 55
>>
stream
BT
/F1 24 Tf
150 400 Td
(Page 1 - Luna's Adventure) Tj
ET
endstream
endobj

6 0 obj
<<
/Length 55
>>
stream
BT
/F1 24 Tf
150 400 Td
(Page 2 - The Magic Forest) Tj
ET
endstream
endobj

xref
0 7
0000000000 65535 f 
0000000010 00000 n 
0000000053 00000 n 
0000000118 00000 n 
0000000181 00000 n 
0000000244 00000 n 
0000000350 00000 n 
trailer
<<
/Size 7
/Root 1 0 R
>>
startxref
458
%%EOF"""
    return io.BytesIO(pdf_content)

def main():
    print("🚀 Creating test storybook for end-to-end testing")
    
    # Login
    response = requests.post(
        f"{BACKEND_URL}/admin/login",
        json={"password": ADMIN_PASSWORD}
    )
    
    if response.status_code != 200:
        print("❌ Failed to login")
        return None
        
    token = response.json()['token']
    print("✅ Admin login successful")
    
    # Create and upload storybook
    pdf_file = create_simple_pdf()
    headers = {"Authorization": f"Bearer {token}"}
    files = {
        'file': ('lunas_adventure.pdf', pdf_file, 'application/pdf')
    }
    data = {
        'title': "Luna's Magical Adventure",
        'subtitle': 'A bedtime story for testing'
    }

    response = requests.post(
        f"{BACKEND_URL}/storybooks/upload",
        headers=headers,
        files=files,
        data=data
    )
    
    if response.status_code not in [200, 201]:
        print(f"❌ Failed to upload storybook: {response.text}")
        return None
        
    storybook = response.json()
    print(f"✅ Storybook uploaded successfully")
    print(f"   ID: {storybook['id']}")
    print(f"   Slug: {storybook['slug']}")
    print(f"   Spreads: {storybook['spreadCount']}")
    
    # Return data for testing
    return {
        'id': storybook['id'],
        'slug': storybook['slug'],
        'title': storybook['title'],
        'token': token
    }

if __name__ == "__main__":
    result = main()
    if result:
        print("\n📋 Test storybook details:")
        print(json.dumps(result, indent=2))