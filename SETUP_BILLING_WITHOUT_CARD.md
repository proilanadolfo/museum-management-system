# 💳 Setup Billing Account Without Payment Card

## ✅ Good News: Pwede Ra Walay Payment Card!

Ang Google Cloud pwede ra mag-setup og billing account bisag wala payment card. Ang free tier (10,000 map loads/month) pwede gihapon gamiton.

---

## 📋 Step-by-Step Guide

### Step 1: Go to Billing

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. I-select ang project: **MatigBukSU**
3. Sa left sidebar, i-click **Billing**
   - Kung wala nimo makita, i-click ang hamburger menu (☰) sa top left
   - I-expand ang "Billing" section

### Step 2: Create Billing Account

1. Kung wala pa billing account, makita nimo ang message: "No billing account"
2. I-click ang **"Create Account"** o **"Link a billing account"** button
3. Mo-redirect ka sa billing account creation page

### Step 3: Fill in Billing Information

**Account Details:**
- **Account name**: I-type ang name (e.g., "MatigBukSU Billing")
- **Country**: I-select ang imong country (Philippines)
- **Currency**: I-select ang currency (USD or PHP)

**Payment Information:**
- **Payment method**: I-click ang dropdown
- **Option 1**: I-try i-skip kung available
- **Option 2**: Kung required, i-click "Add payment method" pero pwede ra i-skip later
- **Note**: Kung mo-ask og payment method, pwede ra nimo i-skip o i-cancel

### Step 4: Link to Project

1. After ma-create ang billing account
2. I-link sa imong project: **MatigBukSU**
3. I-click **"Link"** o **"Set Account"**

### Step 5: Verify

1. I-check kung na-link na ang billing account
2. Dapat makita nimo ang billing account name sa project
3. Status: "Active" o "Linked"

---

## ⚠️ Important Notes

### Free Tier Still Works
- ✅ 10,000 map loads/month = **FREE**
- ✅ Wala na charge kung mo-stay sa free tier
- ✅ Automatic stop kung mo-exceed (kung wala payment method)

### What Happens Without Payment Card
- ✅ Free tier gihapon mo-work
- ✅ 10,000 map loads/month = libre
- ⚠️ Kung mo-exceed, mo-stop ang service
- ⚠️ Dili ka makabayad automatically

### Protection
- I-set daily quotas para sa protection
- I-monitor ang usage regularly
- I-set alerts kung mo-approach na sa limit

---

## 🔧 After Setting Up Billing

### Step 1: Restart Dev Server
```bash
cd frontend
npm run dev
```

### Step 2: Test the Map
1. I-open ang browser: `http://localhost:5173/guest/about`
2. I-scroll down sa "Find Us" section
3. Dapat makita na ang Google Map (wala na error)

---

## 📊 Set Daily Quotas (Recommended)

Para ma-protect gikan sa unexpected usage:

1. Go to Google Cloud Console → APIs & Services → Quotas
2. I-search "Maps JavaScript API"
3. I-click "Map loads per day"
4. I-set ang limit (e.g., 300 per day = ~9,000 per month)
5. I-click "Save"

---

## ✅ Summary

**What to Do:**
1. ✅ Go to Billing → Create Account
2. ✅ Fill in details (pwede ra walay payment method)
3. ✅ Link to project
4. ✅ Restart dev server
5. ✅ Test the map

**Result:**
- ✅ Billing account set up
- ✅ Free tier mo-work gihapon
- ✅ Google Maps mo-work na
- ✅ Wala na error

---

## 🆘 If Still Not Working

1. I-check kung na-link na ang billing account sa project
2. I-verify nga "Maps JavaScript API" enabled gihapon
3. I-check ang browser console (F12) para sa specific error
4. I-restart ang dev server
5. I-clear ang browser cache (Ctrl + Shift + R)

