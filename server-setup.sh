#!/bin/bash

# Vendor Management System - Ubuntu Server Setup Script
# This script sets up a fresh Ubuntu server for deployment

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 Vendor Management System - Server Setup${NC}"
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then
  echo -e "${RED}❌ Please do not run this script as root${NC}"
  exit 1
fi

# Update system
echo -e "${YELLOW}📦 Updating system packages...${NC}"
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
echo -e "${YELLOW}📦 Installing Node.js 20.x...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify Node.js installation
NODE_VERSION=$(node --version)
echo -e "${GREEN}✅ Node.js installed: $NODE_VERSION${NC}"

# Install PostgreSQL
echo -e "${YELLOW}📦 Installing PostgreSQL...${NC}"
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

echo -e "${GREEN}✅ PostgreSQL installed${NC}"

# Install Nginx
echo -e "${YELLOW}📦 Installing Nginx...${NC}"
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

echo -e "${GREEN}✅ Nginx installed${NC}"

# Install PM2
echo -e "${YELLOW}📦 Installing PM2...${NC}"
sudo npm install -g pm2

echo -e "${GREEN}✅ PM2 installed${NC}"

# Install Git
echo -e "${YELLOW}📦 Installing Git...${NC}"
sudo apt install -y git

echo -e "${GREEN}✅ Git installed${NC}"

# Create application directory
echo -e "${YELLOW}📁 Creating application directory...${NC}"
sudo mkdir -p /var/www/vms
sudo chown -R $USER:$USER /var/www/vms

echo -e "${GREEN}✅ Application directory created${NC}"

# Configure firewall
echo -e "${YELLOW}🔥 Configuring firewall...${NC}"
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH

echo -e "${YELLOW}⚠️  Enable firewall? (y/n)${NC}"
read -r ENABLE_UFW
if [ "$ENABLE_UFW" = "y" ]; then
  sudo ufw --force enable
  echo -e "${GREEN}✅ Firewall enabled${NC}"
else
  echo -e "${YELLOW}⏭️  Skipped firewall activation${NC}"
fi

# Setup PostgreSQL database
echo -e "${YELLOW}🗄️  Setting up PostgreSQL database...${NC}"
echo ""
echo "Enter database name (default: vms):"
read -r DB_NAME
DB_NAME=${DB_NAME:-vms}

echo "Enter database user (default: vmsuser):"
read -r DB_USER
DB_USER=${DB_USER:-vmsuser}

echo "Enter database password:"
read -sr DB_PASSWORD

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE $DB_NAME;
CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER DATABASE $DB_NAME OWNER TO $DB_USER;
EOF

echo -e "${GREEN}✅ Database created: $DB_NAME${NC}"

# Configure PostgreSQL for local connections
echo -e "${YELLOW}🔧 Configuring PostgreSQL...${NC}"
PG_VERSION=$(ls /etc/postgresql/)
PG_HBA_FILE="/etc/postgresql/$PG_VERSION/main/pg_hba.conf"

# Backup original file
sudo cp $PG_HBA_FILE ${PG_HBA_FILE}.backup

# Add local connection with password
if ! sudo grep -q "local.*all.*all.*md5" $PG_HBA_FILE; then
  sudo sed -i '/^local.*all.*all.*peer/a local   all             all                                     md5' $PG_HBA_FILE
fi

# Restart PostgreSQL
sudo systemctl restart postgresql

echo -e "${GREEN}✅ PostgreSQL configured${NC}"

# Install Fail2Ban (optional security)
echo -e "${YELLOW}🛡️  Install Fail2Ban for security? (y/n)${NC}"
read -r INSTALL_FAIL2BAN
if [ "$INSTALL_FAIL2BAN" = "y" ]; then
  sudo apt install -y fail2ban
  sudo systemctl enable fail2ban
  sudo systemctl start fail2ban
  echo -e "${GREEN}✅ Fail2Ban installed${NC}"
fi

# Summary
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Server setup completed successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "📋 Configuration Summary:"
echo "  • Node.js: $NODE_VERSION"
echo "  • PostgreSQL: Installed"
echo "  • Nginx: Installed"
echo "  • PM2: Installed"
echo "  • Database: $DB_NAME"
echo "  • DB User: $DB_USER"
echo ""
echo "📝 Save these database credentials:"
echo "  Host: localhost"
echo "  Port: 5432"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo "  Password: [hidden]"
echo ""
echo "📁 Application directory: /var/www/vms"
echo ""
echo "🔜 Next steps:"
echo "  1. Clone your application to /var/www/vms"
echo "  2. Configure backend/.env with database credentials"
echo "  3. Configure .env with API URL"
echo "  4. Run: cd /var/www/vms/backend && npm install"
echo "  5. Run: cd /var/www/vms/backend && npm run db:setup"
echo "  6. Run: cd /var/www/vms && npm install && npm run build"
echo "  7. Copy nginx.conf to /etc/nginx/sites-available/vms"
echo "  8. Enable site: sudo ln -s /etc/nginx/sites-available/vms /etc/nginx/sites-enabled/"
echo "  9. Start backend: cd /var/www/vms/backend && pm2 start ecosystem.config.js"
echo "  10. Restart Nginx: sudo systemctl restart nginx"
echo ""
echo "📖 For detailed instructions, see DEPLOYMENT_GUIDE_UBUNTU_EC2.md"
