from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException, Form, Depends
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
import fitz
from PIL import Image
import io
import bcrypt
import jwt
import json
import shutil

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# JWT Secret
JWT_SECRET = os.environ.get('JWT_SECRET', 'storybook-vault-secret-key-2024')
ADMIN_PASSWORD = "Pankaj021"

# Upload directories
UPLOAD_DIR = ROOT_DIR / "uploads"
SPREADS_DIR = ROOT_DIR / "spreads"
UPLOAD_DIR.mkdir(exist_ok=True)
SPREADS_DIR.mkdir(exist_ok=True)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Models
class AdminLogin(BaseModel):
    password: str

class AdminLoginResponse(BaseModel):
    token: str
    message: str

class StorybookSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    defaultViewMode: str = "one-page"
    onePageEffect: str = "StoryParallax"
    twoPageEffect: str = "Hardcover Classic"
    mobilePreferredEffect: str = "StoryParallax"
    soundEnabled: bool = True
    defaultSound: str = "Sound 2"
    soundVolume: float = 0.7
    perSpreadSoundMap: Dict[str, Dict[str, str]] = {}
    navLayout: str = "AirBar"
    roundedCorners: bool = True
    cornerRadius: int = 16
    themePreset: str = "Warm Cream"
    toolbarStyle: str = "Glass"
    accentColor: str = "#C9A86A"
    showThumbnails: bool = True
    showPageNumbers: bool = True
    allowFullscreen: bool = True
    allowRotate: bool = True
    allowZoom: bool = True

class Storybook(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    slug: str
    subtitle: str = ""
    pdfUrl: str
    coverImageUrl: str = ""
    status: str = "draft"
    orientation: str = "landscape"
    spreadCount: int = 0
    spreads: List[str] = []
    createdAt: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updatedAt: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    customerLink: str = ""
    embedCode: str = ""
    passwordProtected: bool = False
    passwordHash: str = ""
    expiresAt: Optional[str] = None
    viewCount: int = 0
    settings: StorybookSettings = Field(default_factory=StorybookSettings)

class StorybookCreate(BaseModel):
    title: str
    subtitle: str = ""

class StorybookUpdate(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    status: Optional[str] = None
    passwordProtected: Optional[bool] = None
    password: Optional[str] = None
    expiresAt: Optional[str] = None
    settings: Optional[Dict] = None

class PasswordVerify(BaseModel):
    password: str

# Helper functions
def create_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm="HS256")

def verify_token(token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_admin(authorization: str = Depends(lambda: None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.replace("Bearer ", "")
    verify_token(token)
    return {"authenticated": True}

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

async def convert_pdf_to_spreads(pdf_path: str, storybook_id: str) -> tuple:
    """Convert PDF to image spreads"""
    try:
        doc = fitz.open(pdf_path)
        spread_dir = SPREADS_DIR / storybook_id
        spread_dir.mkdir(exist_ok=True)
        
        spreads = []
        orientation = "landscape"
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            
            # Determine orientation from first page
            if page_num == 0:
                if page.rect.width < page.rect.height:
                    orientation = "portrait"
            
            # Render page to image at high quality
            mat = fitz.Matrix(2.0, 2.0)  # 2x zoom for quality
            pix = page.get_pixmap(matrix=mat)
            
            # Convert to PIL Image
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            
            # Save as JPEG with high quality
            spread_path = spread_dir / f"spread_{page_num}.jpg"
            img.save(spread_path, "JPEG", quality=90, optimize=True)
            
            spreads.append(f"/api/spreads/{storybook_id}/spread_{page_num}.jpg")
        
        doc.close()
        
        # Create cover from first page
        cover_url = spreads[0] if spreads else ""
        
        return spreads, cover_url, orientation, len(spreads)
    except Exception as e:
        logger.error(f"Error converting PDF: {e}")
        raise HTTPException(status_code=500, detail=f"PDF conversion failed: {str(e)}")

# Routes
@api_router.get("/")
async def root():
    return {"message": "Storybook Vault API"}

@api_router.post("/admin/login", response_model=AdminLoginResponse)
async def admin_login(login: AdminLogin):
    if login.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid password")
    
    token = create_token({"role": "admin"})
    return AdminLoginResponse(token=token, message="Login successful")

@api_router.post("/storybooks/upload")
async def upload_storybook(
    file: UploadFile = File(...),
    title: str = Form(...),
    subtitle: str = Form("")
):
    # Validate PDF
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    # Create storybook record
    storybook_id = str(uuid.uuid4())
    slug = title.lower().replace(" ", "-") + "-" + storybook_id[:8]
    
    # Save PDF
    pdf_path = UPLOAD_DIR / f"{storybook_id}.pdf"
    with open(pdf_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Convert to spreads
    spreads, cover_url, orientation, spread_count = await convert_pdf_to_spreads(str(pdf_path), storybook_id)
    
    # Create storybook
    storybook = Storybook(
        id=storybook_id,
        title=title,
        slug=slug,
        subtitle=subtitle,
        pdfUrl=f"/api/uploads/{storybook_id}.pdf",
        coverImageUrl=cover_url,
        spreads=spreads,
        orientation=orientation,
        spreadCount=spread_count,
        status="ready",
        customerLink=f"/view/{slug}",
        embedCode=f'<iframe src="/view/{slug}" width="100%" height="600px" frameborder="0"></iframe>'
    )
    
    doc = storybook.model_dump()
    await db.storybooks.insert_one(doc)
    
    return storybook

@api_router.get("/storybooks", response_model=List[Storybook])
async def get_storybooks(status: Optional[str] = None):
    query = {}
    if status and status != "all":
        query["status"] = status
    
    storybooks = await db.storybooks.find(query, {"_id": 0}).sort("createdAt", -1).to_list(1000)
    return storybooks

@api_router.get("/storybooks/{storybook_id}", response_model=Storybook)
async def get_storybook(storybook_id: str):
    storybook = await db.storybooks.find_one({"id": storybook_id}, {"_id": 0})
    if not storybook:
        raise HTTPException(status_code=404, detail="Storybook not found")
    return storybook

@api_router.get("/storybooks/slug/{slug}", response_model=Storybook)
async def get_storybook_by_slug(slug: str):
    storybook = await db.storybooks.find_one({"slug": slug}, {"_id": 0})
    if not storybook:
        raise HTTPException(status_code=404, detail="Storybook not found")
    
    # Increment view count
    await db.storybooks.update_one(
        {"slug": slug},
        {"$inc": {"viewCount": 1}}
    )
    
    return storybook

@api_router.put("/storybooks/{storybook_id}")
async def update_storybook(storybook_id: str, update: StorybookUpdate):
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    # Handle password update
    if "password" in update_data and update_data["password"]:
        update_data["passwordHash"] = hash_password(update_data["password"])
        del update_data["password"]
    
    update_data["updatedAt"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.storybooks.update_one(
        {"id": storybook_id},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Storybook not found")
    
    return {"message": "Storybook updated"}

@api_router.delete("/storybooks/{storybook_id}")
async def delete_storybook(storybook_id: str):
    # Delete files
    pdf_path = UPLOAD_DIR / f"{storybook_id}.pdf"
    spread_dir = SPREADS_DIR / storybook_id
    
    if pdf_path.exists():
        pdf_path.unlink()
    if spread_dir.exists():
        shutil.rmtree(spread_dir)
    
    result = await db.storybooks.delete_one({"id": storybook_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Storybook not found")
    
    return {"message": "Storybook deleted"}

@api_router.post("/storybooks/{storybook_id}/verify-password")
async def verify_storybook_password(storybook_id: str, verify: PasswordVerify):
    storybook = await db.storybooks.find_one({"id": storybook_id}, {"_id": 0})
    
    if not storybook:
        raise HTTPException(status_code=404, detail="Storybook not found")
    
    if not storybook.get("passwordProtected"):
        return {"valid": True}
    
    password_hash = storybook.get("passwordHash", "")
    if verify_password(verify.password, password_hash):
        return {"valid": True}
    
    return {"valid": False}

@api_router.get("/spreads/{storybook_id}/{filename}")
async def get_spread(storybook_id: str, filename: str):
    spread_path = SPREADS_DIR / storybook_id / filename
    
    if not spread_path.exists():
        raise HTTPException(status_code=404, detail="Spread not found")
    
    return FileResponse(spread_path)

@api_router.get("/uploads/{filename}")
async def get_upload(filename: str):
    file_path = UPLOAD_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(file_path)

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
