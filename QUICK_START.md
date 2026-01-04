# 🎯 YO3 Platform - Developer Quick Start

**Total setup time**: ~2 minutes  
**Prerequisites**: Docker Desktop running

---

## ⚡ Start Development in ONE COMMAND

```powershell
# Navigate to project directory
cd d:\D_ORGANIZED\Development\Projects\yo3-platform\yo3-platform

# Execute one-click startup
powershell -ExecutionPolicy Bypass -File .\start-dev.ps1
```

**That's it!** Browser opens automatically with everything running.

---

## 📝 Test Credentials (Copy-Paste Ready)

### Web Login
```
Username: testuser
Password: Test@123456
```

### Database Access
```
Host: localhost

MySQL (Identity DB):
  Port: 3306
  User: identity_user
  Pass: DevIdentity2024

MySQL (Stream DB):
  Port: 3307
  User: stream_user
  Pass: DevStream2024

MySQL (Root):
  User: root
  Pass: DevRootPass2024

PostgreSQL (Sentinel):
  Port: 5432
  User: sentinel_user
  Pass: DevSentinel2024
```

---

## 🔗 Access Points

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:5173/ |
| **API Gateway** | http://localhost/ |
| **Dashboard** | http://localhost:5173/dashboard |
| **Test Dashboard** | http://localhost:5173/test-dashboard |

---

## 🔄 Workflow

```
1. Run: .\start-dev.ps1
   ↓
2. Browser opens to http://localhost:5173/
   ↓
3. Click "Login" button
   ↓
4. Enter testuser / Test@123456
   ↓
5. Click "Dashboard" to access protected content
   ↓
6. Done! Ready for development
```

---

## 🛑 Stop Everything

```powershell
# Stop frontend dev server
# Press Ctrl+C in frontend terminal

# Stop Docker containers
docker-compose -f docker-compose.dev.yml down
```

---

## ⚙️ Manual Backend Commands (If Needed)

```powershell
# Start services only (no frontend)
docker-compose -f docker-compose.dev.yml up -d

# View service logs
docker-compose -f docker-compose.dev.yml logs -f identity-db

# Check service status
docker-compose -f docker-compose.dev.yml ps

# Enter database shell
docker exec -it identity-db mysql -u root -p

# Rebuild services
docker-compose -f docker-compose.dev.yml build
```

---

## 🧪 Quick Test Checklist

- [ ] Frontend loads at http://localhost:5173/
- [ ] Login page accessible
- [ ] Can login with testuser/Test@123456
- [ ] Dashboard page accessible after login
- [ ] Logout works and redirects to login
- [ ] No errors in browser console (F12)

---

## 🆘 Common Issues

| Issue | Solution |
|-------|----------|
| **Docker not found** | Start Docker Desktop from Windows menu |
| **Port 5173 in use** | `netstat -ano \| findstr :5173` then `taskkill /PID <ID> /F` |
| **Blank page** | Hard refresh: Ctrl+Shift+R |
| **Can't login** | Check Identity DB is running: `docker-compose ps` |
| **Slow startup** | First time takes longer. Subsequent runs are fast. |

---

## 📚 More Info

- Full setup details: [SYSTEM_STATUS.md](SYSTEM_STATUS.md)
- Test guide: [TEST_LOGIN_GUIDE.md](TEST_LOGIN_GUIDE.md)
- Deployment status: [DEPLOYMENT_FRONTEND_STATUS.md](DEPLOYMENT_FRONTEND_STATUS.md)

---

**Ready? Run:** `.\start-dev.ps1`

