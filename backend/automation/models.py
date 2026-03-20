from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
from datetime import datetime
import uuid

# Template Models

class FillableField(BaseModel):
    """Represents a fillable field detected in a PDF"""
    fieldName: str
    fieldType: str  # text, checkbox, radio, etc.
    pageNumber: int
    currentValue: str = ""
    bounds: Dict[str, float] = {}  # {x, y, w, h}

class FieldMapping(BaseModel):
    """Maps a PDF field to a variable type"""
    pdfFieldName: str
    variableType: str  # "requestedName" in Phase 1
    fallbackValue: str = ""

class Template(BaseModel):
    """Complete template record"""
    model_config = ConfigDict(extra="ignore")
    
    # Core identification
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    productSlug: str
    description: str = ""
    
    # File references
    basePdfPath: str
    basePdfUrl: str
    
    # Fillable fields (auto-detected)
    fillableFields: List[FillableField] = []
    
    # Field mappings (admin configured)
    fieldMappings: List[FieldMapping] = []
    
    # Template metadata
    status: str = "draft"  # draft | active | inactive | archived
    orientation: str = "landscape"
    pageCount: int = 0
    thumbnailUrl: str = ""
    
    # Timestamps
    createdAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    updatedAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    activatedAt: Optional[str] = None
    deactivatedAt: Optional[str] = None
    archivedAt: Optional[str] = None

class TemplateCreate(BaseModel):
    """Request model for creating template"""
    title: str
    productSlug: str
    description: str = ""

class TemplateUpdate(BaseModel):
    """Request model for updating template"""
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    fieldMappings: Optional[List[FieldMapping]] = None

class TemplateListResponse(BaseModel):
    """Response model for template list"""
    templates: List[Template]
    total: int
