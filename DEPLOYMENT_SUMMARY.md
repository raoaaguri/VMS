# Deployment Files Summary

Your application is ready for deployment to Ubuntu EC2! Here's what has been created:

## 📚 Documentation

1. **DEPLOYMENT_GUIDE_UBUNTU_EC2.md** - Complete step-by-step deployment guide
   - EC2 instance setup
   - Server prerequisites installation
   - PostgreSQL configuration
   - Backend and frontend deployment
   - Nginx setup
   - SSL/HTTPS configuration
   - Maintenance and monitoring

2. **QUICK_DEPLOY_CHECKLIST.md** - Quick reference checklist
   - Condensed deployment steps
   - Command reference
   - Troubleshooting tips

3. **MIGRATE_TO_LOCAL_POSTGRES.md** - Data migration guide
   - How to migrate data from Supabase to local PostgreSQL

## 🔧 Configuration Files

1. **nginx.conf** - Nginx web server configuration
   - Serves frontend (React app)
   - Proxies backend API requests
   - Security headers
   - Gzip compression

2. **backend/ecosystem.config.js** - PM2 process manager configuration
   - Backend process management
   - Auto-restart on failure
   - Log rotation

3. **backend/.env.production.example** - Backend environment template
   - PostgreSQL connection settings
   - JWT configuration
   - Supabase settings (optional)

4. **.env.production.example** - Frontend environment template
   - API URL configuration

## 🚀 Deployment Scripts

1. **server-setup.sh** - Automated server setup
   - Installs Node.js, PostgreSQL, Nginx, PM2
   - Creates database and user
   - Configures firewall
   - Interactive setup wizard

2. **deploy.sh** - Application deployment script
   - Pull latest code
   - Install dependencies
   - Build frontend
   - Restart backend
   - Reload Nginx

3. **backup-db.sh** - Database backup script
   - Creates compressed backups
   - Automatic cleanup (keeps 7 days)
   - Can be scheduled with cron

4. **health-check.sh** - System health check
   - Verifies all services
   - Checks API endpoints
   - Shows resource usage
   - Displays recent logs

## 🗂️ Database Files

1. **backend/migrate-from-supabase.js** - Supabase migration script
   - Fetches all data from Supabase
   - Creates schema in local PostgreSQL
   - Imports all tables and relationships

## 📋 Quick Start

### Option 1: Automated Setup (Recommended)

```bash
# 1. Upload setup script to server
scp -i your-key.pem server-setup.sh ubuntu@your-ec2-ip:~/

# 2. Run setup script
ssh -i your-key.pem ubuntu@your-ec2-ip
./server-setup.sh

# 3. Upload your application
# Option A: Git
cd /var/www/vms
git clone https://github.com/your-username/your-repo.git .

# Option B: SCP (from local machine)
scp -i your-key.pem -r /path/to/project ubuntu@your-ec2-ip:/var/www/vms/

# 4. Configure and deploy
cd /var/www/vms/backend
cp .env.production.example .env
nano .env  # Update credentials

npm install --production
npm run db:setup

cd /var/www/vms
cp .env.production.example .env
nano .env  # Update API URL

npm install
npm run build

# 5. Configure Nginx
sudo cp nginx.conf /etc/nginx/sites-available/vms
sudo nano /etc/nginx/sites-available/vms  # Update domain
sudo ln -s /etc/nginx/sites-available/vms /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 6. Start backend
cd /var/www/vms/backend
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd

# 7. Verify
./health-check.sh
```

### Option 2: Manual Setup

Follow the complete guide in **DEPLOYMENT_GUIDE_UBUNTU_EC2.md**

## 🔐 Security Checklist

Before going to production:

- [ ] Change default admin password (admin@example.com / admin123)
- [ ] Use a strong database password
- [ ] Generate a secure JWT secret (32+ characters)
- [ ] Enable SSL/HTTPS with Certbot
- [ ] Configure firewall (UFW)
- [ ] Install Fail2Ban
- [ ] Setup database backups
- [ ] Keep system updated

## 📊 Application Architecture

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  Internet → EC2 Instance (Ubuntu)               │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │                                           │ │
│  │  Nginx (Port 80/443)                      │ │
│  │  ├─ Frontend (React) → /                  │ │
│  │  └─ Backend Proxy → /api → :3000          │ │
│  │                                           │ │
│  └───────────────────────────────────────────┘ │
│                    ↓                            │
│  ┌───────────────────────────────────────────┐ │
│  │                                           │ │
│  │  PM2 Process Manager                      │ │
│  │  └─ Node.js Backend (Port 3000)           │ │
│  │                                           │ │
│  └───────────────────────────────────────────┘ │
│                    ↓                            │
│  ┌───────────────────────────────────────────┐ │
│  │                                           │ │
│  │  PostgreSQL (Port 5432)                   │ │
│  │  └─ Database: vms                         │ │
│  │                                           │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
└─────────────────────────────────────────────────┘
```

## 🌐 URLs After Deployment

- **Frontend**: `http://your-domain.com` or `http://your-ec2-ip`
- **Backend API**: `http://your-domain.com/api`
- **Health Check**: `http://your-domain.com/api/health`

With SSL:
- **Frontend**: `https://your-domain.com`
- **Backend API**: `https://your-domain.com/api`

## 🛠️ Maintenance Commands

```bash
# View logs
pm2 logs vms-backend
sudo tail -f /var/log/nginx/vms_error.log

# Restart services
pm2 restart vms-backend
sudo systemctl restart nginx
sudo systemctl restart postgresql

# Update application
cd /var/www/vms
./deploy.sh

# Backup database
./backup-db.sh

# Health check
./health-check.sh

# Monitor resources
pm2 monit
htop
```

## 📞 Support & Troubleshooting

### Common Issues

**502 Bad Gateway**
- Backend is down: `pm2 restart vms-backend`
- Check logs: `pm2 logs vms-backend`

**Database Connection Failed**
- Check PostgreSQL: `sudo systemctl status postgresql`
- Verify credentials in `backend/.env`

**Frontend Shows Blank Page**
- Check browser console for errors
- Verify API URL in `.env`
- Rebuild: `npm run build`

**Cannot Login**
- Check backend logs: `pm2 logs vms-backend`
- Verify database has users: `psql -U vmsuser -d vms -c "SELECT * FROM users;"`

For detailed troubleshooting, see **DEPLOYMENT_GUIDE_UBUNTU_EC2.md**

## 📖 Additional Resources

- AWS EC2 Documentation: https://docs.aws.amazon.com/ec2/
- Nginx Documentation: https://nginx.org/en/docs/
- PM2 Documentation: https://pm2.keymetrics.io/docs/
- PostgreSQL Documentation: https://www.postgresql.org/docs/

## 🎯 Next Steps

1. Review **DEPLOYMENT_GUIDE_UBUNTU_EC2.md** for detailed instructions
2. Launch your EC2 instance with Ubuntu 22.04
3. Run **server-setup.sh** for automated installation
4. Deploy your application following the checklist
5. Configure SSL/HTTPS for production
6. Setup database backups
7. Test thoroughly before going live

---

**Ready to deploy!** 🚀

Start with **QUICK_DEPLOY_CHECKLIST.md** for a fast deployment or **DEPLOYMENT_GUIDE_UBUNTU_EC2.md** for comprehensive instructions.
