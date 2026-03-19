#!/bin/bash

# ============================================================
# STORYBOOK VAULT - RESTORE SCRIPT
# ============================================================
# This script restores all data from the backup package
# Run this in your NEW Emergent account after pulling from GitHub
# ============================================================

set -e

echo "=============================================="
echo "  STORYBOOK VAULT - RESTORE SCRIPT"
echo "=============================================="
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="/app/backend"

# Check if we're in the right place
if [ ! -d "$BACKEND_DIR" ]; then
    echo "ERROR: /app/backend not found. Are you in an Emergent environment?"
    exit 1
fi

echo "[1/5] Restoring uploaded PDFs..."
if [ -d "$SCRIPT_DIR/uploads" ]; then
    cp -r "$SCRIPT_DIR/uploads/"* "$BACKEND_DIR/uploads/" 2>/dev/null || mkdir -p "$BACKEND_DIR/uploads"
    cp -r "$SCRIPT_DIR/uploads/"* "$BACKEND_DIR/uploads/"
    echo "      ✓ PDFs restored to /app/backend/uploads/"
else
    echo "      ⚠ No uploads folder found in backup"
fi

echo ""
echo "[2/5] Restoring spread images..."
if [ -d "$SCRIPT_DIR/spreads" ]; then
    cp -r "$SCRIPT_DIR/spreads/"* "$BACKEND_DIR/spreads/" 2>/dev/null || mkdir -p "$BACKEND_DIR/spreads"
    cp -r "$SCRIPT_DIR/spreads/"* "$BACKEND_DIR/spreads/"
    echo "      ✓ Spreads restored to /app/backend/spreads/"
else
    echo "      ⚠ No spreads folder found in backup"
fi

echo ""
echo "[3/5] Restoring MongoDB data..."
if [ -d "$SCRIPT_DIR/mongodb_backup/test_database" ]; then
    mongorestore --uri="mongodb://localhost:27017" --db=test_database "$SCRIPT_DIR/mongodb_backup/test_database" --drop
    echo "      ✓ MongoDB data restored to test_database"
else
    echo "      ⚠ No MongoDB backup found"
fi

echo ""
echo "[4/5] Checking environment files..."
echo "      Backend .env backup saved at: $SCRIPT_DIR/backend.env.backup"
echo "      Frontend .env backup saved at: $SCRIPT_DIR/frontend.env.backup"
echo ""
echo "      NOTE: Environment files are auto-configured in Emergent."
echo "      The REACT_APP_BACKEND_URL will be different in your new account."
echo "      Emergent will set this automatically when you start the preview."

echo ""
echo "[5/5] Verifying restoration..."
echo ""
echo "      Uploaded PDFs:"
ls -lh "$BACKEND_DIR/uploads/" 2>/dev/null || echo "      (none)"
echo ""
echo "      Spread folders:"
ls -d "$BACKEND_DIR/spreads/"*/ 2>/dev/null || echo "      (none)"
echo ""
echo "      MongoDB storybooks:"
mongo --quiet --eval "db.storybooks.find({}, {title: 1, slug: 1, _id: 0}).forEach(function(doc) { print('      - ' + doc.title + ' (' + doc.slug + ')'); })" test_database 2>/dev/null || echo "      (run 'mongosh test_database' to verify manually)"

echo ""
echo "=============================================="
echo "  RESTORE COMPLETE!"
echo "=============================================="
echo ""
echo "Next steps:"
echo "1. Restart the backend: sudo supervisorctl restart backend"
echo "2. Restart the frontend: sudo supervisorctl restart frontend"
echo "3. Open your new Preview URL to test"
echo ""
