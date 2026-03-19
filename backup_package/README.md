# Storybook Vault - Backup Package

## Contents

```
backup_package/
├── restore.sh              # Automated restore script
├── uploads/                # Original PDF files
├── spreads/                # Generated spread images
├── mongodb_backup/         # Database backup
├── backend.env.backup      # Backend environment variables
└── frontend.env.backup     # Frontend environment variables
```

## How to Restore in New Emergent Account

### Step 1: Set Up New Project

1. Log into your NEW Emergent account
2. Create a new project by importing from GitHub
3. Select the repository where you saved Storybook Vault
4. Wait for the project to initialize

### Step 2: Upload This Backup Package

1. In the new Emergent chat, type: "I need to upload backup files"
2. Upload the `storybook_vault_backup.zip` file
3. Ask the agent to extract it:
   ```
   Please extract the backup zip to /app/backup_package/
   ```

### Step 3: Run the Restore Script

Ask the agent to run:
```bash
cd /app/backup_package && bash restore.sh
```

Or run these commands manually:
```bash
# Extract backup (if not already done)
unzip storybook_vault_backup.zip -d /app/backup_package/

# Restore PDFs
cp -r /app/backup_package/uploads/* /app/backend/uploads/

# Restore spreads  
cp -r /app/backup_package/spreads/* /app/backend/spreads/

# Restore MongoDB
mongorestore --uri="mongodb://localhost:27017" --db=test_database /app/backup_package/mongodb_backup/test_database --drop

# Restart services
sudo supervisorctl restart backend
sudo supervisorctl restart frontend
```

### Step 4: Verify

1. Open the new Preview URL
2. Login with password: `Pankaj021`
3. Check that your storybooks appear in the dashboard
4. Open a storybook to verify spreads load correctly

## Environment Variables

The new Emergent environment will automatically configure:
- `MONGO_URL` - Points to local MongoDB
- `REACT_APP_BACKEND_URL` - Your new preview URL

You don't need to manually set these.

## Troubleshooting

### Storybooks not showing?
```bash
# Check MongoDB has data
mongosh test_database --eval "db.storybooks.countDocuments()"
```

### Spreads not loading?
```bash
# Check spreads folder has images
ls -la /app/backend/spreads/
```

### Backend not starting?
```bash
# Check logs
tail -50 /var/log/supervisor/backend.err.log
```

## Original Environment Values (Reference)

**Backend (.env):**
```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="test_database"
CORS_ORIGINS="*"
```

**Frontend (.env):**
```
REACT_APP_BACKEND_URL=<will be different in new account>
WDS_SOCKET_PORT=443
ENABLE_HEALTH_CHECK=false
```
