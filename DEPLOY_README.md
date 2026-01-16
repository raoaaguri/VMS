# 🚀 Deployment Instructions

## Quick Links

- **[Quick Deploy Checklist](./QUICK_DEPLOY_CHECKLIST.md)** - Fast deployment reference
- **[Complete Deployment Guide](./DEPLOYMENT_GUIDE_UBUNTU_EC2.md)** - Detailed step-by-step instructions
- **[Deployment Summary](./DEPLOYMENT_SUMMARY.md)** - Overview of all deployment files
- **[PostgreSQL Migration](./MIGRATE_TO_LOCAL_POSTGRES.md)** - Migrate data from Supabase

## 📦 What's Included

### Documentation
- Complete Ubuntu EC2 deployment guide
- Quick reference checklist
- PostgreSQL migration guide
- Troubleshooting tips

### Configuration Files
- `nginx.conf` - Web server configuration
- `backend/ecosystem.config.js` - PM2 process manager config
- `.env.production.example` - Frontend environment template
- `backend/.env.production.example` - Backend environment template

### Automation Scripts
- `server-setup.sh` - Automated server installation
- `deploy.sh` - Application update script
- `backup-db.sh` - Database backup script
- `health-check.sh` - System health verification

## ⚡ Quick Start

### 1. Launch EC2 Instance
- Ubuntu 22.04 LTS
- t2.medium or higher
- Open ports: 22 (SSH), 80 (HTTP), 443 (HTTPS)

### 2. Run Automated Setup

```bash
# Upload setup script
scp -i your-key.pem server-setup.sh ubuntu@your-ec2-ip:~/

# Connect and run
ssh -i your-key.pem ubuntu@your-ec2-ip
chmod +x server-setup.sh
./server-setup.sh
```

### 3. Deploy Application

```bash
# Upload application
cd /var/www/vms
git clone https://github.com/your-username/your-repo.git .

# Configure backend
cd backend
cp .env.production.example .env
nano .env  # Update database password and JWT secret
npm install --production
npm run db:setup

# Configure and build frontend
cd ..
cp .env.production.example .env
nano .env  # Update API URL
npm install
npm run build

# Setup Nginx
sudo cp nginx.conf /etc/nginx/sites-available/vms
sudo nano /etc/nginx/sites-available/vms  # Update server_name
sudo ln -s /etc/nginx/sites-available/vms /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# Start backend
cd backend
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd
```

### 4. Verify Deployment

```bash
chmod +x health-check.sh
./health-check.sh
```

Visit: `http://your-ec2-ip`

## 🔐 Important Security Steps

Before going live:

1. **Change default admin password**
   - Login: admin@example.com / admin123
   - Change immediately!

2. **Generate secure JWT secret**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. **Setup SSL/HTTPS**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

4. **Enable firewall**
   ```bash
   sudo ufw allow 'Nginx Full'
   sudo ufw allow OpenSSH
   sudo ufw enable
   ```

5. **Setup backups**
   ```bash
   chmod +x backup-db.sh
   crontab -e
   # Add: 0 2 * * * /var/www/vms/backup-db.sh
   ```

## 📊 Architecture

```
Internet
   ↓
EC2 Instance (Ubuntu)
   ↓
Nginx (Port 80/443)
   ├─ Frontend (/) → React App
   └─ Backend (/api) → Node.js :3000
         ↓
   PM2 Process Manager
         ↓
   PostgreSQL (Port 5432)
```

## 🛠️ Daily Operations

```bash
# View logs
pm2 logs vms-backend

# Restart backend
pm2 restart vms-backend

# Update application
./deploy.sh

# Check health
./health-check.sh

# Backup database
./backup-db.sh
```

## 🆘 Troubleshooting

### Backend won't start
```bash
pm2 logs vms-backend
cd backend && node test-connection.js
```

### 502 Bad Gateway
```bash
pm2 restart vms-backend
sudo systemctl restart nginx
```

### Can't connect to database
```bash
sudo systemctl status postgresql
psql -U vmsuser -d vms -h localhost
```

## 📱 Default Credentials

**Admin Account:**
- Email: admin@example.com
- Password: admin123

**⚠️ CHANGE IMMEDIATELY IN PRODUCTION!**

## 🔄 Updating the Application

```bash
cd /var/www/vms
./deploy.sh
```

Or manually:
```bash
git pull origin main
cd backend && npm install --production
cd .. && npm install && npm run build
pm2 restart vms-backend
sudo systemctl reload nginx
```

## 📞 Need Help?

1. Check [DEPLOYMENT_GUIDE_UBUNTU_EC2.md](./DEPLOYMENT_GUIDE_UBUNTU_EC2.md)
2. Run `./health-check.sh` to diagnose issues
3. Check logs:
   - Backend: `pm2 logs vms-backend`
   - Nginx: `sudo tail -f /var/log/nginx/vms_error.log`
   - PostgreSQL: `sudo tail -f /var/log/postgresql/postgresql-14-main.log`

## ✅ Pre-Launch Checklist

- [ ] EC2 instance launched and configured
- [ ] Server setup completed (Node.js, PostgreSQL, Nginx, PM2)
- [ ] Database created and configured
- [ ] Backend deployed and running
- [ ] Frontend built and deployed
- [ ] Nginx configured and running
- [ ] SSL/HTTPS configured (production)
- [ ] Default admin password changed
- [ ] Database backups configured
- [ ] Application tested thoroughly
- [ ] Health checks passing

---

**Ready to deploy!** Start with [QUICK_DEPLOY_CHECKLIST.md](./QUICK_DEPLOY_CHECKLIST.md) 🚀
