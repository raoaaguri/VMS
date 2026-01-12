# 🚀 Quick Start - PostgreSQL Migration

## ✅ Status: COMPLETE & OPERATIONAL

---

## 📌 Quick Commands

```bash
# 1. Start Development Server
cd backend
npm run dev

# Server will start on http://localhost:3001

# 2. Test Database Connection
npm run db:test

# 3. Seed Sample Data (if not done)
npm run db:seed

# 4. Access Database Directly
psql -h localhost -U postgres -d vms
```

---

## 🔐 Login Credentials

```
Admin:
  Email: admin@example.com
  Password: admin123

Vendor:
  Email: vendor@acme.com
  Password: vendor123
```

---

## 📊 Database Info

```
Host: localhost
Port: 5432
Database: vms
User: postgres
Password: postgres
```

---

## 🌐 API Endpoints

```
Health: http://localhost:3001/health
Admin Dashboard: http://localhost:3001/admin/dashboard
Vendor Dashboard: http://localhost:3001/vendor/dashboard
```

---

## 📁 Important Files

```
Backend:
  backend/src/config/db.js          → PostgreSQL adapter
  backend/.env                       → Database credentials
  backend/package.json               → Dependencies

Documentation:
  MIGRATION_COMPLETE.md              → Full guide
  POSTGRES_MIGRATION_COMPLETE.md     → Technical details
```

---

## 🛠️ NPM Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start dev server |
| `npm start` | Start production server |
| `npm run db:setup` | Initialize database |
| `npm run db:test` | Test connection |
| `npm run db:seed` | Seed sample data |
| `npm run db:import` | Import Supabase data |

---

## ⚡ What Changed

✅ Database: Supabase → PostgreSQL  
✅ Config: Added .env with credentials  
✅ Dependencies: Added `pg` library  
✅ Code: No changes (adapter layer handles it)

---

## 🎯 Next Steps

1. Run `npm run dev`
2. Test with `npm run db:test`
3. Create accounts or use test credentials
4. Start building!

---

## 💡 Need Help?

- Server won't start? → Check `npm run db:test`
- Can't login? → Run `npm run db:seed`
- Port 3001 in use? → Change PORT in .env
- Lost test data? → Run `npm run db:setup && npm run db:seed`

---

**Everything is ready. Happy coding! 🎉**

Last Updated: January 12, 2026
