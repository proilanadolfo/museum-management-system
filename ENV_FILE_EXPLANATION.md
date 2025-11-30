# ❓ FAQ: Ngano Dili Ma-push ang .env File?

## Short Answer:
**DILI, ang `.env` file DILI ma-push sa GitHub para sa security.**

## Detailed Explanation:

### 1. **Security Reasons**
Ang `.env` file nag-contain sa:
- Database passwords
- API keys
- Secret tokens
- Email credentials
- Other sensitive information

Kung ma-push ninyo ang `.env` file sa GitHub:
- ❌ Makita sa tanan ang inyong passwords
- ❌ Makita ang inyong API keys
- ❌ Maka-access ang bisan kinsa sa inyong database
- ❌ Security risk kaayo!

### 2. **Gitignore Protection**
Ang `.env` file naa na sa `.gitignore` file, which means:
- Git **DILI** mo-track sa `.env` file
- **DILI** ma-push sa GitHub automatically
- Safe ang inyong credentials

### 3. **Unsaon sa mga Kauban?**

**Solution: Template File + Setup Guide**

1. **Template File** - `SETUP_GUIDE.md`
   - Nag-contain sa tanan nga environment variables nga kailangan
   - Wala'y actual values (template lang)
   - Safe i-push sa GitHub

2. **Setup Guide** - `SETUP_GUIDE.md`
   - Step-by-step instructions
   - Unsaon pag-create sa `.env` file
   - Unsaon pag-get sa connection strings
   - Complete guide para sa mga kauban

### 4. **Process para sa mga Kauban:**

```
1. Clone ang repository
   ↓
2. Basaha ang SETUP_GUIDE.md
   ↓
3. Create ug .env file sa backend/ folder
   ↓
4. Copy-paste ang template gikan sa SETUP_GUIDE.md
   ↓
5. Fill in ang actual values (MongoDB connection, etc.)
   ↓
6. Run ang system
```

### 5. **Example:**

**DILI i-push (sa .env file):**
```env
MONGO_URI_ADMIN=mongodb+srv://user:ACTUAL_PASSWORD@cluster0.abc123.mongodb.net/museum_admin
EMAIL_PASS=actual-gmail-app-password-here
JWT_SECRET=actual-secret-key-here
```

**OKAY i-push (sa SETUP_GUIDE.md):**
```env
MONGO_URI_ADMIN=mongodb+srv://username:password@cluster-hostname/museum_admin
EMAIL_PASS=your-gmail-app-password
JWT_SECRET=your-secret-key-here
```

---

## ✅ Summary:

| Question | Answer |
|----------|--------|
| Ma-push ba ang `.env` file? | **DILI** - Para sa security |
| Unsaon sa mga kauban? | Basaha ang `SETUP_GUIDE.md` |
| Asa makita ang template? | Sa `SETUP_GUIDE.md` file |
| Safe ba ang `.env` file? | **OO** - Naa sa `.gitignore` |

---

## 🎯 Bottom Line:

**Ang `.env` file DILI ma-push sa GitHub, pero ang mga kauban makakuha sa instructions gikan sa `SETUP_GUIDE.md` para makas setup sila sa ilang own `.env` file.**


