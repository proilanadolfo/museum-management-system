# MongoDB Atlas Setup Guide

## 🚀 Paano i-connect ang System sa MongoDB Atlas

### Step 1: Create MongoDB Atlas Account

1. Adto sa [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Sign up para sa free account
3. I-verify ang imong email

### Step 2: Create a Cluster

1. Pag-login sa MongoDB Atlas
2. Click **"Build a Database"** o **"Create"**
3. Pili ang **FREE** tier (M0 Sandbox)
4. Pili ang cloud provider ug region (mas maayo kung duol sa imong location)
5. I-click **"Create"** ug hulat sulod sa 3-5 minutes

### Step 3: Create Database User

1. Sa **Security** section, click **"Database Access"**
2. Click **"Add New Database User"**
3. Pili ang **"Password"** authentication method
4. I-type ang username ug password (i-save ni kay gamiton nimo sa connection string)
5. I-set ang **User Privileges** to **"Atlas admin"** o **"Read and write to any database"**
6. Click **"Add User"**

### Step 4: Configure Network Access

1. Sa **Security** section, click **"Network Access"**
2. Click **"Add IP Address"**
3. Para sa development, i-click **"Allow Access from Anywhere"** (0.0.0.0/0)
   - ⚠️ **Note**: Para sa production, mas maayo kung i-restrict nimo ang IP addresses
4. Click **"Confirm"**

### Step 5: Get Connection String

1. Sa **Deployment** section, click **"Connect"** sa imong cluster
2. Pili ang **"Connect your application"**
3. Pili ang **"Node.js"** driver ug version **4.1 or later**
4. Kopyaha ang connection string
   - Example: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`

### Step 6: Update .env File

1. Abri ang `backend/.env` file
2. I-update ang mosunod nga lines:

```env
# MongoDB Atlas Connection Strings
MONGO_URI_ADMIN=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/museum_admin?retryWrites=true&w=majority
MONGO_URI_SUPERADMIN=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/museum_superadmin?retryWrites=true&w=majority
MONGO_URI_BOOKINGS=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/museum_bookings?retryWrites=true&w=majority
```

**Important**: 
- I-replace ang `YOUR_USERNAME` sa imong database username
- I-replace ang `YOUR_PASSWORD` sa imong database password
- I-replace ang `YOUR_CLUSTER` sa imong cluster name (example: `cluster0.xxxxx`)
- ⚠️ **Important**: Kung naa special characters sa password, i-encode nimo using URL encoding:
  - `@` → `%40`
  - `#` → `%23`
  - `$` → `%24`
  - `%` → `%25`
  - `&` → `%26`
  - `+` → `%2B`
  - `=` → `%3D`

### Step 7: Test Connection

1. I-restart ang backend server:
   ```bash
   cd backend
   npm run start
   ```

2. Tan-awa ang console output. Dapat makita nimo:
   ```
   MongoDB connected: museum_admin, museum_superadmin & museum_bookings
   ```

3. Kung naa error, i-check:
   - Naka-setup ba ang network access (Step 4)
   - Tama ba ang username ug password
   - Naka-encode ba ang special characters sa password

### Example Connection String

Kung ang imong:
- Username: `museumuser`
- Password: `MyP@ssw0rd#123`
- Cluster: `cluster0.abc123.mongodb.net`

Ang connection string nimo:
```
mongodb+srv://museumuser:MyP%40ssw0rd%23123@cluster0.abc123.mongodb.net/museum_admin?retryWrites=true&w=majority
```

### Troubleshooting

#### Error: "MongoServerError: bad auth"
- I-check kung tama ang username ug password
- I-verify kung naka-encode ba ang special characters sa password

#### Error: "MongoServerError: IP not whitelisted"
- I-check ang Network Access settings
- I-add ang imong current IP address

#### Error: "MongooseServerSelectionError: connection timeout"
- I-check kung naa internet connection
- I-verify kung tama ang cluster name sa connection string

### Security Tips

1. **Never commit .env file** - Naka-gitignore na ni
2. **Use strong passwords** - Para sa database user
3. **Restrict IP access** - Para sa production, i-restrict ang IP addresses
4. **Use environment variables** - Dili hardcode ang credentials

### Need Help?

Kung naa gihapon problema, i-check:
- MongoDB Atlas documentation: https://docs.atlas.mongodb.com/
- Mongoose documentation: https://mongoosejs.com/docs/

