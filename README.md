# Vendor Management System

A full-stack vendor management system with purchase order tracking, built with React and Node.js, using Supabase for the database.

## Features

- Role-based access control (Admin & Vendor)
- Purchase order management with workflow states
- Vendor management and configuration
- Line item tracking with delivery dates
- Priority management for orders and items
- ERP integration APIs
- Responsive UI with table-based listings

## Tech Stack

### Frontend
- React 18
- React Router for navigation
- Tailwind CSS for styling
- Lucide React for icons

### Backend
- Node.js with Express
- Layered architecture (Controllers, Services, Repositories)
- JWT authentication
- Supabase for database (Postgres-compatible)

### Database
- Supabase (PostgreSQL)
- Row Level Security (RLS) enabled
- Structured for easy migration to external Postgres

## Project Structure

```
project/
├── backend/
│   └── src/
│       ├── config/          # Environment and DB configuration
│       ├── modules/          # Feature modules
│       │   ├── auth/        # Authentication
│       │   ├── users/       # User management
│       │   ├── vendors/     # Vendor management
│       │   ├── pos/         # Purchase orders
│       │   └── erp/         # ERP integration
│       ├── middlewares/     # Auth, validation, error handling
│       └── utils/           # Helpers and utilities
├── src/
│   ├── config/              # API configuration
│   ├── contexts/            # React contexts
│   ├── components/          # Shared components
│   └── pages/               # Route pages
│       ├── admin/           # Admin portal
│       └── vendor/          # Vendor portal
```

## Database Schema

### Tables
- `users` - Admin and vendor users with role-based access
- `vendors` - Vendor company information
- `purchase_orders` - Purchase orders from ERP
- `purchase_order_line_items` - Line items for each PO

### Status Workflow
- PO Status: CREATED → ACCEPTED → PLANNED → DELIVERED
- Line Item Status: CREATED → ACCEPTED → PLANNED → DELIVERED

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase account (already configured)

### Installation

1. Install frontend dependencies:
```bash
npm install
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

### Running the Application

1. Start the backend server:
```bash
cd backend
npm start
```
The backend will run on http://localhost:3001

2. In a new terminal, start the frontend:
```bash
npm run dev
```
The frontend will run on http://localhost:5173

### Login Credentials

**Admin Account:**
- Email: admin@example.com
- Password: admin123

**Vendor Account:**
- Email: vendor@acme.com
- Password: vendor123

## API Endpoints

### Authentication
- `POST /auth/login` - User login

### Admin Routes
- `GET /admin/pos` - List all purchase orders
- `GET /admin/pos/:id` - Get PO details
- `PUT /admin/pos/:id/priority` - Update PO priority
- `PUT /admin/pos/:poId/line-items/:lineItemId/priority` - Update line item priority
- `GET /admin/vendors` - List all vendors
- `POST /admin/vendors` - Create vendor
- `PUT /admin/vendors/:id` - Update vendor
- `POST /admin/vendors/:id/user` - Create vendor user

### Vendor Routes
- `GET /vendor/pos` - List vendor's purchase orders
- `GET /vendor/pos/:id` - Get PO details
- `POST /vendor/pos/:id/accept` - Accept PO with delivery dates
- `PUT /vendor/pos/:poId/line-items/:lineItemId/expected-delivery-date` - Update delivery date
- `PUT /vendor/pos/:poId/line-items/:lineItemId/status` - Update line item status

### ERP Integration (Requires API Key)
- `POST /erp/vendors` - Create/update vendor
- `POST /erp/pos` - Create purchase order

ERP API Key: Set in backend `.env` as `ERP_API_KEY`

## Future Migration to External Postgres

The system is designed for easy migration to external PostgreSQL:

1. **Database layer abstraction**: `backend/src/config/db.js` can be swapped to use `pg.Pool`
2. **Schema compatibility**: All table and column names are Postgres-standard
3. **Environment variables ready**: Configure PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD
4. **No code changes needed**: Only connection configuration changes required

## Environment Variables

Backend `.env` file should contain:
```
NODE_ENV=development
PORT=3001
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
JWT_SECRET=<your-jwt-secret>
ERP_API_KEY=<your-erp-api-key>
```

For future Postgres migration, add:
```
PGHOST=<postgres-host>
PGPORT=5432
PGDATABASE=<database-name>
PGUSER=<username>
PGPASSWORD=<password>
PGSSLMODE=require
```

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Row Level Security (RLS) on all tables
- Role-based access control
- Secure API endpoints with middleware
- ERP API key authentication

## Business Rules

1. Vendors must accept POs by providing expected delivery dates for all line items
2. Priority can be changed by admins while PO/line item is not delivered
3. Vendors can update expected delivery dates until line item is delivered
4. Status can only progress forward (no regression)
5. PO becomes DELIVERED when all line items are delivered
6. Delivered items lock their expected dates and priorities

## Support

For issues or questions about the system, refer to the code documentation or contact your system administrator.
