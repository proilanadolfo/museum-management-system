# 📱 Semaphore SMS Integration Setup Guide

## ✅ What's Been Added

1. **Semaphore SMS integration** - Supports Philippines numbers perfectly!
2. **Dual provider support** - Can use Semaphore or Twilio
3. **Automatic provider selection** - Uses Semaphore if API key exists
4. **Better pricing** - PHP 0.50 per SMS (much cheaper than Twilio!)

## 🎯 Why Semaphore?

**Advantages:**
- ✅ **Cheaper** - PHP 0.50 per SMS (vs $0.05-0.10 for Twilio)
- ✅ **No restrictions** - Can send to all Philippines networks (Globe, Smart, Sun, Dito)
- ✅ **No phone number needed** - Uses sender name instead
- ✅ **Local support** - Philippine-based service
- ✅ **Perfect for Philippines** - Designed for local SMS

## 🔧 Setup Instructions

### Step 1: Sign Up for Semaphore

1. **Go to Semaphore**: https://semaphore.co/
2. **Click "Sign Up"** or "Get Started"
3. **Create an account** (free to sign up)
4. **Verify your email**

### Step 2: Get Your API Key

1. **Log in to Semaphore Dashboard**
2. **Go to "API" section** or "Settings" → "API"
3. **Copy your API Key** (looks like: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)

### Step 3: Set Sender Name (Optional)

1. **Go to "Sender Names"** in Semaphore dashboard
2. **Register a sender name** (e.g., "BSC-System", "Museum", "BSC")
3. **Wait for approval** (usually instant or few hours)
4. **Note:** Sender name can be up to 11 alphanumeric characters

### Step 4: Add Credentials to `.env` File

Open `backend/.env` and add these lines:

```env
# Semaphore SMS Configuration (Recommended for Philippines)
SEMAPHORE_API_KEY=your-api-key-here
SEMAPHORE_SENDER_NAME=BSC-System
SMS_PROVIDER=semaphore
```

**Example:**
```env
SEMAPHORE_API_KEY=abc123def456ghi789jkl012mno345pqr678
SEMAPHORE_SENDER_NAME=BSC-System
SMS_PROVIDER=semaphore
```

**Note:** 
- `SMS_PROVIDER=semaphore` - Forces Semaphore (optional, auto-detected if API key exists)
- `SEMAPHORE_SENDER_NAME` - Optional, defaults to "BSC-System" if not set

### Step 5: Restart Backend Server

```bash
cd backend
npm start
```

**Look for:**
```
✅ Semaphore SMS configured
📱 SMS Provider: SEMAPHORE
```

## 📱 How It Works

### When SMS is Sent:

1. **Booking Confirmed** → Guest receives SMS with:
   - Confirmation message
   - Visit date and time
   - Number of visitors
   - Confirmation code

2. **Booking Cancelled** → Guest receives SMS with:
   - Cancellation notice
   - Requested date
   - Confirmation code

### Phone Number Format:

The system automatically formats phone numbers:
- `09171234567` → `639171234567` (Semaphore format)
- `+639171234567` → `639171234567`
- `639171234567` → `639171234567` (unchanged)

## 🧪 Testing

1. **Add Semaphore credentials** to `backend/.env`
2. **Restart backend server**
3. **Create a test booking** from guest form
4. **Go to Admin Dashboard** → Bookings
5. **Confirm the booking**
6. **Check backend console** for:
   ```
   ✅ SMS sent successfully via Semaphore to 639171234567: [message_id]
   ```
7. **Check guest's phone** for SMS notification

## 💰 Pricing

- **Per SMS:** PHP 0.50 (exclusive of VAT)
- **Long messages:** Messages over 160 characters are split (charged per part)
- **No monthly fees:** Pay per SMS only
- **Much cheaper than Twilio:** PHP 0.50 vs $0.05-0.10 (~PHP 2.50-5.00)

## 🔍 Troubleshooting

### SMS Not Sending?

1. **Check `.env` file:**
   - Make sure `SEMAPHORE_API_KEY` is set
   - No extra spaces or quotes
   - API key is correct

2. **Check Backend Logs:**
   - Look for `✅ SMS sent successfully via Semaphore`
   - Check for error messages

3. **Check Semaphore Dashboard:**
   - Go to Semaphore dashboard → "Messages" or "Logs"
   - See if SMS was sent
   - Check for any errors

4. **Sender Name Issues:**
   - Make sure sender name is approved in Semaphore
   - Sender name should be 11 characters or less
   - Use alphanumeric only (no special characters)

### Common Errors:

- **"Invalid API key"** → Check API key in `.env`
- **"Sender name not approved"** → Wait for approval or use default
- **"Insufficient credits"** → Add credits to Semaphore account

## 📊 Semaphore vs Twilio

| Feature | Semaphore | Twilio |
|---------|-----------|--------|
| **Cost per SMS** | PHP 0.50 | $0.05-0.10 (~PHP 2.50-5.00) |
| **Philippines Support** | ✅ Perfect | ⚠️ Needs PH number ($120/month) |
| **Phone Number Needed** | ❌ No (uses sender name) | ✅ Yes |
| **Setup Complexity** | ✅ Simple | ⚠️ More complex |
| **Local Support** | ✅ Philippines-based | ❌ International |
| **Best For** | Philippines only | International |

## 🎯 Switching Between Providers

**To use Semaphore:**
```env
SEMAPHORE_API_KEY=your-key
SMS_PROVIDER=semaphore
```

**To use Twilio:**
```env
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=+1234567890
SMS_PROVIDER=twilio
```

**Auto-detection:**
- If `SEMAPHORE_API_KEY` exists → Uses Semaphore
- If only Twilio credentials exist → Uses Twilio
- Can override with `SMS_PROVIDER` environment variable

## 📍 Where SMS is Sent

SMS notifications are automatically sent when:
- Admin confirms a booking (status → `confirmed`)
- Admin cancels a booking (status → `cancelled`)

**Location in code:**
- `backend/routes/bookings.js` → `PATCH /api/bookings/:id/status`
- `backend/sms-config.js` → SMS sending functions

## 🎉 Success!

Once configured, Semaphore SMS will work automatically for all Philippines numbers!

**Benefits:**
- ✅ Cheaper than Twilio
- ✅ No restrictions for Philippines
- ✅ Simple setup
- ✅ Perfect for local use

