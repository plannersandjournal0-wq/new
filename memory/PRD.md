# Storybook Vault - Product Requirements Document

## Overview
Storybook Vault is a premium private web app for a single admin to upload storybook PDFs, convert them into beautiful interactive flipbooks, customize the reading experience, and share protected links with customers. It now includes an automation system for personalized storybook generation triggered by payment webhooks.

## Core Features

### Admin Panel
- **Login**: Password-based admin authentication (`Pankaj021`)
- **Dashboard**: Grid view of all storybooks with status, stats, and quick actions (edit, share, delete)
- **Preview Studio**: 3-panel layout for customization (Settings, Live Preview, Publish/Share)
- **Template Management**: Upload fillable PDF templates, auto-detect fields, map variables
- **Automation Orders**: View incoming orders, status tracking, retry failed orders, webhook simulator

### Storybook Viewer (CustomerViewer.js)
- **Navigation Styles**: 3 desktop styles (AirBar, CinemaDock, GhostEdges) with Left/Right arrows and GoTo button
- **Mobile Portrait Mode**: Horizontal bottom floating nav bar (default)
- **Mobile Landscape/Fullscreen Mode**: Vertical left-side nav bar
- **Touch Gestures**: Swipe to navigate, tap zones for prev/next
- **Go To Page**: Popup to jump to specific page number (available in all nav modes)
- **Fullscreen**: Native browser fullscreen with orientation lock on Android
- **Sound**: Page-flip sounds with volume control
- **Password Protection**: Per-storybook password gate

### Automation System (Phase 1)
- **Webhook Integration**: Receives Creem payment webhooks at `/api/webhooks/creem`
- **Template Selection**: Auto-selects active template based on `productSlug`
- **PDF Personalization**: Fills template fields with customer `requestedName`, preserving custom fonts
- **Flipbook Generation**: Converts personalized PDF to interactive storybook
- **Email Delivery**: Sends branded HTML email via Resend with storybook link and password
- **Order Management**: Full order tracking with processing logs, retry capability

### PDF Processing
- Upload PDF -> Convert to image spreads via PyMuPDF
- WebP format for optimized file size
- HTTP caching headers for fast subsequent loads
- Fillable PDF field detection and font-preserving personalization

## Technical Stack
- **Frontend**: React, Tailwind CSS, Framer Motion, Lucide React
- **Backend**: FastAPI, PyMuPDF (fitz), Motor (MongoDB), Resend (email)
- **Database**: MongoDB for storybooks, templates, and automation orders
- **Storage**: Local file system for PDFs and spreads

## What's Implemented

### Phase 1 - Core MVP (COMPLETE)
- [x] Admin login/authentication
- [x] PDF upload and spread conversion
- [x] Dashboard with storybook grid
- [x] Preview Studio for customization
- [x] Customer viewer with multiple nav styles
- [x] Password protection
- [x] Sound effects (custom MP3s)
- [x] Mobile responsive admin panel

### Phase 2 - Mobile Viewer Enhancement (COMPLETE - March 18)
- [x] Clean fullscreen + landscape logic for CustomerViewer.js
- [x] Fixed nav switching logic
- [x] Go To Page button present in both mobile nav modes
- [x] Image loading optimization

### Phase 3 - Automation System (COMPLETE - March 20)
- [x] Template Management (upload, detect fields, map variables)
- [x] Webhook Handler with idempotency protection
- [x] Order Processor pipeline
- [x] PDF Filler with font preservation (appearance stream injection)
- [x] Email Delivery via Resend
- [x] Admin UI: Unified AdminPanel with sidebar navigation
- [x] Webhook Simulator for testing

### Bug Fixes (COMPLETE - March 20)
- [x] Fix 1: Email field lookup tolerance (multiple email field names)
- [x] Fix 2: APP_BASE_URL env variable for email URLs
- [x] Fix 3: Font preservation - removed widget.update() after AP stream update
- [x] Fix 4: Creem webhook HMAC-SHA256 signature verification
- [x] Fix 5: Storage cleanup - delete personalized PDF after order completion
- [x] Fix 6: Desktop navigation arrows (Left/Right) + GoTo button in all styles

## API Endpoints

### Templates
- `POST /api/templates/upload` - Upload fillable PDF template
- `GET /api/templates` - List all templates
- `GET /api/templates/{id}` - Get single template
- `PUT /api/templates/{id}` - Update template (status, mappings)
- `DELETE /api/templates/{id}` - Delete template

### Automation
- `POST /api/webhooks/creem` - Production Creem webhook (with signature verification)
- `POST /api/automation/simulate-webhook` - Simulate webhook for testing
- `GET /api/automation/orders` - List automation orders
- `GET /api/automation/orders/{id}` - Get single order
- `POST /api/automation/orders/{id}/retry` - Retry failed order
- `POST /api/automation/test-pdf-fill` - Test PDF filling
- `POST /api/automation/test-email` - Test email sending

### Storybooks
- `POST /api/storybooks/upload` - Upload PDF storybook
- `GET /api/storybooks` - List all storybooks
- `GET /api/storybooks/{id}` - Get single storybook
- `GET /api/storybooks/slug/{slug}` - Get by slug (for customer view)
- `PUT /api/storybooks/{id}` - Update storybook
- `DELETE /api/storybooks/{id}` - Delete storybook

## Upcoming Tasks (P0-P2)

### P0 - High Priority
- [ ] Real Creem Webhook Integration: Configure actual webhook secret for live payments
- [ ] Frontend UI for Template Field Mapping: Visual interface for mapping fields

### P1 - Medium Priority  
- [ ] Replace PDF: Allow replacing the PDF of a storybook while preserving settings
- [ ] Duplicate Project: Clone a storybook with all settings
- [ ] Email notifications for failed orders

### P2 - Lower Priority
- [ ] View Analytics: View counter and stats
- [ ] Template versioning
- [ ] Order analytics dashboard

## Future/Backlog
- QR code sharing
- Custom cover intro screen
- Personalized customer labels
- Search inside PDFs (text-enabled)
- Bookmark spreads
- Theme presets by story type
- Expand personalization (photos, custom messages)

## Key Files
- `/app/backend/server.py` - API endpoints, PDF processing
- `/app/backend/automation/` - Automation module (order_processor, webhook_handler, pdf_filler, email_sender)
- `/app/frontend/src/pages/CustomerViewer.js` - Storybook viewer component
- `/app/frontend/src/pages/AdminPanel.js` - Unified admin layout
- `/app/frontend/src/pages/TemplateManagement.js` - Template management UI
- `/app/frontend/src/pages/AutomationOrders.js` - Order management UI

## Environment Variables (backend/.env)
- `MONGO_URL` - MongoDB connection string
- `DB_NAME` - Database name
- `RESEND_API_KEY` - Resend API key for emails
- `EMAIL_FROM` - Sender email address
- `APP_BASE_URL` - Base URL for customer storybook links
- `CREEM_WEBHOOK_SECRET` - HMAC secret for webhook verification

## Test Credentials
- Admin Password: `Pankaj021`
- Test Storybook Slug: `s1-fd32a004`

## Notes
- Creem webhook secret is currently set to `placeholder` - signature verification is skipped
- Desktop navigation now uses Left/Right arrows (ChevronLeft/ChevronRight) instead of Up/Down
- GoTo button available in all desktop nav styles (AirBar, CinemaDock, GhostEdges)
- Personalized PDF is deleted after order completion to save storage
- Email delivery failure does not fail the order (order status remains "completed")
