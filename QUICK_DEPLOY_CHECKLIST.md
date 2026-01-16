# Quick Deployment Checklist

This is a condensed checklist for deploying to Ubuntu EC2. For detailed instructions, see [DEPLOYMENT_GUIDE_UBUNTU_EC2.md](./DEPLOYMENT_GUIDE_UBUNTU_EC2.md).

## Prerequisites

- [ ] AWS EC2 instance running Ubuntu 22.04
- [ ] Security groups configured (SSH, HTTP, HTTPS)
- [ ] SSH key pair (.pem file)
- [ ] Domain name (optional, can use EC2 IP)

## Step 1: Connect to Server

```bash
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

## Step 2: Run Automated Setup

Upload and run the setup script:

```bash
# From your local machine
scp -i your-key.pem server-setup.sh ubuntu@your-ec2-ip:~/

# On the server
chmod +x ~/server-setup.sh
./server-setup.sh
```

This installs:
- Node.js 20.x
- PostgreSQL
- Nginx
- PM2
- Creates database and user

## Step 3: Deploy Application

```bash
# Clone your repository
cd /var/www/vms
git clone https://github.com/your-username/your-repo.git .

# Or upload via SCP from local machine
scp -i your-key.pem -r /path/to/project ubuntu@your-ec2-ip:/var/www/vms/
```

## Step 4: Configure Backend

```bash
cd /var/www/vms/backend

# Copy and edit environment file
cp .env.production.example .env
nano .env

# Update these values:
# - POSTGRES_PASSWORD (from setup script)
# - JWT_SECRET (generate new one)
# - SUPABASE credentials (if migrating data)

# Install dependencies
npm install --production

# Setup database
npm run db:setup

# Optional: Migrate from Supabase
npm run db:migrate-from-supabase
```

## Step 5: Configure Frontend

```bash
cd /var/www/vms

# Copy and edit environment file
cp .env.production.example .env
nano .env

# Update VITE_API_URL with your domain or EC2 IP
# Example: VITE_API_URL=https://your-domain.com/api

# Install and build
npm install
npm run build
```

## Step 6: Configure Nginx

```bash
# Copy Nginx configuration
sudo cp /var/www/vms/nginx.conf /etc/nginx/sites-available/vms

# Edit server_name in the config
sudo nano /etc/nginx/sites-available/vms
# Change "your-domain.com" to your actual domain or EC2 IP

# Enable site
sudo ln -s /etc/nginx/sites-available/vms /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test and restart
sudo nginx -t
sudo systemctl restart nginx
```

## Step 7: Start Backend with PM2

```bash
cd /var/www/vms/backend

# Start backend
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup systemd
# Run the command that PM2 outputs
```

## Step 8: Verify Deployment

```bash
cd /var/www/vms
chmod +x health-check.sh
./health-check.sh
```

Or manually check:
- Frontend: `http://your-ec2-ip` or `http://your-domain.com`
- Backend: `http://your-ec2-ip/api/health`

## Step 9: Setup SSL (Production Only)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate (domain must point to server first)
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Update frontend .env with https URL
cd /var/www/vms
nano .env
# Change VITE_API_URL to https://your-domain.com/api

# Rebuild frontend
npm run build
```

## Step 10: Setup Backups

```bash
# Copy backup script
cp /var/www/vms/backup-db.sh ~/backup-db.sh
chmod +x ~/backup-db.sh

# Test backup
./backup-db.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /home/ubuntu/backup-db.sh
```

## Default Credentials

**Admin Login:**
- Email: `admin@example.com`
- Password: `admin123`

**⚠️ Change immediately after first login!**

## Common Commands

```bash
# View backend logs
pm2 logs vms-backend

# Restart backend
pm2 restart vms-backend

# View Nginx logs
sudo tail -f /var/log/nginx/vms_error.log

# Update application (after git push)
cd /var/www/vms
chmod +x deploy.sh
./deploy.sh

# Health check
./health-check.sh
```

## Troubleshooting

### Backend won't start
```bash
pm2 logs vms-backend
cd /var/www/vms/backend
node test-connection.js
```

### 502 Bad Gateway
```bash
pm2 restart vms-backend
sudo systemctl restart nginx
```

### Database connection failed
```bash
sudo systemctl status postgresql
psql -U vmsuser -d vms -h localhost
```

## File Structure on Server

```
/var/www/vms/
├── dist/                    # Built frontend
├── backend/
│   ├── src/
│   ├── .env                # Backend config
│   └── ecosystem.config.js # PM2 config
├── .env                    # Frontend config
├── nginx.conf              # Nginx template
├── deploy.sh               # Deployment script
└── health-check.sh         # Health check script
```

## Security Reminders

- [ ] Change default admin password
- [ ] Use strong database password
- [ ] Generate new JWT secret
- [ ] Enable SSL/HTTPS
- [ ] Keep system updated: `sudo apt update && sudo apt upgrade`
- [ ] Configure firewall: `sudo ufw enable`
- [ ] Install Fail2Ban: `sudo apt install fail2ban`

## Support

For detailed instructions and troubleshooting, see:
- [DEPLOYMENT_GUIDE_UBUNTU_EC2.md](./DEPLOYMENT_GUIDE_UBUNTU_EC2.md)
- [MIGRATE_TO_LOCAL_POSTGRES.md](./MIGRATE_TO_LOCAL_POSTGRES.md)

For issues:
1. Check PM2 logs: `pm2 logs vms-backend`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/vms_error.log`
3. Run health check: `./health-check.sh`
