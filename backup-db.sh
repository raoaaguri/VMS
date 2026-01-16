#!/bin/bash

# Database Backup Script
# Run daily via crontab: 0 2 * * * /var/www/vms/backup-db.sh

# Configuration
DB_NAME="vms"
DB_USER="vmsuser"
BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/vms_backup_$DATE.sql"
RETENTION_DAYS=7

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Perform backup
echo -e "${YELLOW}🗄️  Starting database backup...${NC}"
pg_dump -U $DB_USER -h localhost $DB_NAME > $BACKUP_FILE

# Check if backup was successful
if [ $? -eq 0 ]; then
  # Compress the backup
  gzip $BACKUP_FILE
  BACKUP_FILE="${BACKUP_FILE}.gz"

  # Get file size
  SIZE=$(du -h $BACKUP_FILE | cut -f1)

  echo -e "${GREEN}✅ Backup completed successfully${NC}"
  echo -e "   File: $BACKUP_FILE"
  echo -e "   Size: $SIZE"

  # Delete old backups (keep only last N days)
  echo -e "${YELLOW}🧹 Cleaning old backups (keeping last $RETENTION_DAYS days)...${NC}"
  find $BACKUP_DIR -name "vms_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

  # Count remaining backups
  BACKUP_COUNT=$(ls -1 $BACKUP_DIR/vms_backup_*.sql.gz 2>/dev/null | wc -l)
  echo -e "${GREEN}📊 Total backups: $BACKUP_COUNT${NC}"
else
  echo -e "${RED}❌ Backup failed${NC}"
  exit 1
fi
