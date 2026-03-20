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


# Order Models

class ProcessingLogEntry(BaseModel):
    """Single log entry in order processing"""
    timestamp: str
    status: str
    message: str

class CustomerData(BaseModel):
    """Customer information from webhook"""
    requestedName: str  # For personalization
    buyerFullName: str  # Actual customer identity
    customerEmail: str
    password: Optional[str] = None
    customFields: Dict = {}

class PaymentData(BaseModel):
    """Payment information from webhook"""
    amount: Optional[int] = None
    currency: Optional[str] = None
    paymentMethod: Optional[str] = None
    transactionId: Optional[str] = None

class TemplateSnapshot(BaseModel):
    """Frozen template data at order time"""
    productSlug: str
    basePdfPath: str
    title: str
    fieldMappings: List[Dict] = []
    pageCount: int
    orientation: str

class AutomationOrder(BaseModel):
    """Complete automation order record"""
    model_config = ConfigDict(extra="ignore")
    
    # Core identification
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    externalOrderId: str  # Unique - for idempotency
    webhookEventId: Optional[str] = None
    isSimulatedWebhook: bool = False
    
    # Customer data
    customerData: CustomerData
    
    # Product & template linkage
    productSlug: str
    templateId: Optional[str] = None
    templateTitle: Optional[str] = None
    
    # Template snapshot (frozen at order time)
    templateSnapshot: Optional[TemplateSnapshot] = None
    
    # Payment data
    paymentData: Optional[PaymentData] = None
    
    # Processing status
    status: str = "received"  # received | verified | processing | completed | failed | cancelled
    
    # Generation locking
    generationLocked: bool = False
    lockedAt: Optional[str] = None
    finalizedAt: Optional[str] = None
    
    # Generated assets
    personalizedPdfPath: Optional[str] = None
    personalizedPdfUrl: Optional[str] = None
    
    # Generated storybook
    storybookId: Optional[str] = None
    storybookSlug: Optional[str] = None
    customerViewUrl: Optional[str] = None
    
    # Processing logs
    processingLog: List[ProcessingLogEntry] = []
    
    # Error tracking
    errorMessage: Optional[str] = None
    errorDetails: Optional[str] = None
    retryCount: int = 0
    lastRetryAt: Optional[str] = None
    
    # Email delivery
    emailSent: bool = False
    emailSentAt: Optional[str] = None
    
    # Timestamps
    createdAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    updatedAt: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    completedAt: Optional[str] = None

class WebhookSimulateRequest(BaseModel):
    """Request model for simulating webhook"""
    productSlug: str
    requestedName: str
    buyerFullName: Optional[str] = None
    customerEmail: str
    password: Optional[str] = None
    orderId: Optional[str] = None  # Used as externalOrderId

class OrderListResponse(BaseModel):
    """Response model for order list"""
    orders: List[AutomationOrder]
    total: int
    limit: int
    offset: int
