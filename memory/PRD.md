# Storybook Vault - Product Requirements Document

## Overview
Storybook Vault is a premium private web app for a single admin to upload storybook PDFs, convert them into beautiful interactive flipbooks, customize the reading experience, and share protected links with customers.

## Core Features

### Admin Panel
- **Login**: Password-based admin authentication (`Pankaj021`)
- **Dashboard**: Grid view of all storybooks with status, stats, and quick actions (edit, share, delete)
- **Preview Studio**: 3-panel layout for customization (Settings, Live Preview, Publish/Share)

### Storybook Viewer (CustomerViewer.js)
- **Navigation Styles**: 5 desktop styles (AirBar, CinemaDock, GhostEdges, etc.)
- **Mobile Portrait Mode**: Horizontal bottom floating nav bar
- **Mobile Landscape Mode** (via fullscreen): Vertical left-side nav bar
- **Touch Gestures**: Swipe to navigate, tap zones for prev/next
- **Go To Page**: Popup to jump to specific page number
- **Fullscreen**: Native browser fullscreen with orientation lock on Android
- **Sound**: Page-flip sounds with volume control
- **Password Protection**: Per-storybook password gate

### PDF Processing
- Upload PDF -> Convert to image spreads via PyMuPDF
- WebP format for optimized file size
- HTTP caching headers for fast subsequent loads

## Technical Stack
- **Frontend**: React, Tailwind CSS, Framer Motion, Lucide React
- **Backend**: FastAPI, PyMuPDF, Uvicorn
- **Storage**: Local file system (in-memory database for storybook metadata)

## What's Implemented (as of March 18, 2026)

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
- [x] **Clean fullscreen + landscape logic** for CustomerViewer.js
  - Default: Portrait mode, horizontal bottom nav
  - Fullscreen on mobile: Locks to landscape (Android), vertical left nav
  - Exit fullscreen: Returns to portrait, unlocks orientation
  - iOS: Shows "rotate phone" toast hint (orientation lock not supported)
- [x] Image loading optimization with onLoad handler
- [x] Go To Page popup with proper positioning
- [x] Bottom nav positioned above Emergent badge

## Upcoming Tasks (P0-P2)

### P0 - High Priority
- [ ] Replace PDF: Allow replacing the PDF of a storybook while preserving settings

### P1 - Medium Priority  
- [ ] Duplicate Project: Clone a storybook with all settings
- [ ] Archive Library: Archive functionality on dashboard

### P2 - Lower Priority
- [ ] View Analytics: View counter and stats

## Future/Backlog
- QR code sharing
- Custom cover intro screen
- Personalized customer labels
- Search inside PDFs (text-enabled)
- Bookmark spreads
- Theme presets by story type

## Key Files
- `/app/backend/server.py` - API endpoints, PDF processing
- `/app/frontend/src/pages/CustomerViewer.js` - Storybook viewer component
- `/app/frontend/src/pages/PreviewStudio.js` - Editor UI
- `/app/frontend/src/pages/Dashboard.js` - Admin dashboard
- `/app/frontend/src/lib/sounds.js` - Sound playback logic

## Test Credentials
- Admin Password: `Pankaj021`
- Test Storybook Slug: `s1-fd32a004`

## Notes
- Backend uses in-memory storage (not persistent database)
- Orientation lock works on Android but not iOS Safari
- Desktop navigation unchanged from original implementation
