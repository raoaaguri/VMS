# Ubuntu EC2 Deployment Guide

Complete guide to deploy the Vendor Management System on AWS EC2 Ubuntu server.

## Table of Contents

1. [EC2 Instance Setup](#ec2-instance-setup)
2. [Server Prerequisites](#server-prerequisites)
3. [PostgreSQL Setup](#postgresql-setup)
4. [Backend Deployment](#backend-deployment)
5. [Frontend Deployment](#frontend-deployment)
6. [Nginx Configuration](#nginx-configuration)
7. [PM2 Process Manager](#pm2-process-manager)
8. [SSL/HTTPS Setup](#ssl-https-setup)
9. [Maintenance & Monitoring](#maintenance--monitoring)

---

## EC2 Instance Setup

### 1. Launch EC2 Instance

1. **Go to AWS Console** → EC2 → Launch Instance
2. **Choose AMI**: Ubuntu Server 22.04 LTS (or latest)
3. **Instance Type**: t2.medium or higher (minimum t2.small)
4. **Configure Security Groups**:
   - SSH (22) - Your IP
   - HTTP (80) - 0.0.0.0/0
   - HTTPS (443) - 0.0.0.0/0
   - Custom TCP (3000) - Your IP (optional, for testing backend directly)
5. **Storage**: 20 GB or more
6. **Create/Download Key Pair** (.pem file)

### 2. Connect to EC2

```bash
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

---

## Server Prerequisites

### 1. Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install Node.js (v20.x)

```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version
```

### 3. Install PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify installation
sudo systemctl status postgresql
```

### 4. Install Nginx

```bash
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Verify installation
sudo systemctl status nginx
```

### 5. Install PM2 (Process Manager)

```bash
sudo npm install -g pm2

# Verify installation
pm2 --version
```

### 6. Install Git

```bash
sudo apt install -y git
```

---

## PostgreSQL Setup

### 1. Create Database and User

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL prompt, run:
CREATE DATABASE vms;
CREATE USER vmsuser WITH ENCRYPTED PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE vms TO vmsuser;
ALTER DATABASE vms OWNER TO vmsuser;
\q
```

### 2. Configure PostgreSQL for Local Connections

```bash
# Edit pg_hba.conf
sudo nano /etc/postgresql/14/main/pg_hba.conf

# Add this line (or modify existing local connection):
local   all             all                                     md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### 3. Test Database Connection

```bash
psql -U vmsuser -d vms -h localhost
# Enter password when prompted
# If connected successfully, type \q to exit
```

---

## Backend Deployment

### 1. Create Application Directory

```bash
sudo mkdir -p /var/www/vms
sudo chown -R ubuntu:ubuntu /var/www/vms
cd /var/www/vms
```

### 2. Clone/Upload Your Application

**Option A: Using Git (Recommended)**

```bash
cd /var/www/vms
git clone https://github.com/your-username/your-repo.git .
```

**Option B: Using SCP from Local Machine**

```bash
# From your local machine:
scp -i your-key.pem -r /path/to/project ubuntu@your-ec2-public-ip:/var/www/vms/
```

### 3. Install Backend Dependencies

```bash
cd /var/www/vms/backend
npm install --production
```

### 4. Configure Environment Variables

```bash
cd /var/www/vms/backend
nano .env
```

Add the following:

```env
# Server Configuration
NODE_ENV=production
PORT=3000

# PostgreSQL Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=vms
POSTGRES_USER=vmsuser
POSTGRES_PASSWORD=your-secure-password
POSTGRES_SSL=false

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-long
JWT_EXPIRES_IN=7d

# Optional: Supabase (if still needed for migration)
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-key
```

**IMPORTANT: Generate a secure JWT secret:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. Setup Database Schema

```bash
cd /var/www/vms/backend
npm run db:setup
```

### 6. Migrate Data from Supabase (Optional)

If you want to copy your Supabase data:

```bash
cd /var/www/vms/backend
npm run db:migrate-from-supabase
```

Or seed with sample data:

```bash
npm run db:seed
```

### 7. Test Backend

```bash
cd /var/www/vms/backend
node src/server.js
```

Visit: `http://your-ec2-public-ip:3000/api/health`

If working, press `Ctrl+C` to stop.

---

## Frontend Deployment

### 1. Configure Frontend API URL

```bash
cd /var/www/vms
nano .env
```

Add:

```env
VITE_API_URL=https://your-domain.com/api
# Or for testing: http://your-ec2-public-ip/api
```

### 2. Install Dependencies and Build

```bash
cd /var/www/vms
npm install
npm run build
```

This creates a `dist/` folder with the production build.

### 3. Verify Build

```bash
ls -la dist/
# Should see index.html and assets folder
```

---

## Nginx Configuration

### 1. Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/vms
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    # For testing, use: server_name your-ec2-public-ip;

    # Frontend - React App
    location / {
        root /var/www/vms/dist;
        try_files $uri $uri/ /index.html;

        # Enable gzip compression
        gzip on;
        gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    }

    # Backend API - Node.js
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logs
    access_log /var/log/nginx/vms_access.log;
    error_log /var/log/nginx/vms_error.log;
}
```

### 2. Enable the Site

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/vms /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### 3. Configure Firewall (UFW)

```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
sudo ufw status
```

---

## PM2 Process Manager

### 1. Start Backend with PM2

```bash
cd /var/www/vms/backend

# Start the backend
pm2 start src/server.js --name vms-backend

# Save PM2 process list
pm2 save

# Configure PM2 to start on system boot
pm2 startup systemd
# Copy and run the command that PM2 outputs
```

### 2. PM2 Commands

```bash
# View running processes
pm2 list

# View logs
pm2 logs vms-backend

# Monitor
pm2 monit

# Restart
pm2 restart vms-backend

# Stop
pm2 stop vms-backend

# Delete process
pm2 delete vms-backend
```

### 3. PM2 Ecosystem File (Advanced)

Create `ecosystem.config.js` in `/var/www/vms/backend`:

```javascript
module.exports = {
  apps: [{
    name: 'vms-backend',
    script: './src/server.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

Start with:

```bash
pm2 start ecosystem.config.js
```

---

## SSL/HTTPS Setup

### 1. Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 2. Obtain SSL Certificate

**Important**: Your domain must point to your EC2 public IP first!

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

Follow the prompts:
- Enter your email
- Agree to terms
- Choose to redirect HTTP to HTTPS (recommended)

### 3. Test Auto-Renewal

```bash
sudo certbot renew --dry-run
```

### 4. Update Frontend .env

```bash
cd /var/www/vms
nano .env
```

Update:

```env
VITE_API_URL=https://your-domain.com/api
```

Rebuild frontend:

```bash
npm run build
```

---

## Maintenance & Monitoring

### 1. View Logs

```bash
# Backend logs (PM2)
pm2 logs vms-backend

# Nginx access logs
sudo tail -f /var/log/nginx/vms_access.log

# Nginx error logs
sudo tail -f /var/log/nginx/vms_error.log

# PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

### 2. Update Application

```bash
# Stop backend
pm2 stop vms-backend

# Pull latest code
cd /var/www/vms
git pull origin main

# Update backend
cd backend
npm install --production

# Update frontend
cd ..
npm install
npm run build

# Restart backend
pm2 restart vms-backend

# Reload Nginx
sudo systemctl reload nginx
```

### 3. Database Backup

```bash
# Create backup script
nano ~/backup-db.sh
```

Add:

```bash
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups"
mkdir -p $BACKUP_DIR
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U vmsuser -h localhost vms > $BACKUP_DIR/vms_backup_$DATE.sql
# Keep only last 7 days of backups
find $BACKUP_DIR -name "vms_backup_*.sql" -mtime +7 -delete
```

Make executable and add to crontab:

```bash
chmod +x ~/backup-db.sh

# Run daily at 2 AM
crontab -e
# Add this line:
0 2 * * * /home/ubuntu/backup-db.sh
```

### 4. Monitoring with PM2

```bash
# Install PM2 monitoring
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## Security Best Practices

### 1. Keep System Updated

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Configure SSH Key-Only Access

```bash
sudo nano /etc/ssh/sshd_config

# Set:
PasswordAuthentication no
PermitRootLogin no

# Restart SSH
sudo systemctl restart sshd
```

### 3. Install Fail2Ban

```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 4. Regular Security Updates

```bash
# Enable automatic security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

---

## Troubleshooting

### Backend Not Starting

```bash
# Check PM2 logs
pm2 logs vms-backend

# Check if port 3000 is in use
sudo lsof -i :3000

# Check database connection
cd /var/www/vms/backend
node test-connection.js
```

### Frontend Not Loading

```bash
# Check Nginx status
sudo systemctl status nginx

# Check Nginx error logs
sudo tail -f /var/log/nginx/vms_error.log

# Verify build files exist
ls -la /var/www/vms/dist/
```

### Database Connection Issues

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log

# Test connection
psql -U vmsuser -d vms -h localhost
```

### 502 Bad Gateway

```bash
# Backend might be down
pm2 list
pm2 restart vms-backend

# Check backend logs
pm2 logs vms-backend
```

---

## Quick Deployment Checklist

- [ ] Launch EC2 instance with proper security groups
- [ ] Connect via SSH
- [ ] Install Node.js, PostgreSQL, Nginx, PM2
- [ ] Create PostgreSQL database and user
- [ ] Upload/clone application code
- [ ] Configure backend .env file
- [ ] Run database migrations
- [ ] Configure frontend .env file
- [ ] Build frontend
- [ ] Configure Nginx
- [ ] Start backend with PM2
- [ ] Test application
- [ ] Setup SSL with Certbot (if domain available)
- [ ] Configure backups
- [ ] Setup monitoring

---

## Post-Deployment URLs

- **Frontend**: http://your-domain.com or http://your-ec2-public-ip
- **Backend API**: http://your-domain.com/api or http://your-ec2-public-ip/api
- **Health Check**: http://your-domain.com/api/health

---

## Support

For issues, check:
1. PM2 logs: `pm2 logs vms-backend`
2. Nginx logs: `sudo tail -f /var/log/nginx/vms_error.log`
3. PostgreSQL logs: `sudo tail -f /var/log/postgresql/postgresql-14-main.log`

**Default Admin Login**:
- Email: admin@example.com
- Password: admin123

**Change this immediately in production!**
