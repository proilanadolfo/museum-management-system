# Museum Management System

A modern web application for managing museum operations, built with React (Frontend) and Node.js/Express (Backend).

## 🏗️ Project Structure

```
Museum/
├── backend/          # Node.js/Express API server
│   ├── models/       # MongoDB models
│   ├── routes/       # API routes
│   ├── db.js         # Database connection
│   └── index.js      # Server entry point
├── frontend/         # React application
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── styles/       # CSS files
│   │   └── assets/       # Images and static files
│   └── package.json
└── README.md         # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB Atlas account (or local MongoDB)
- npm or yarn
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/proilanadolfo/museum-management-system.git
   cd museum-management-system
   ```

2. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install Frontend Dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Setup Environment Variables**
   - Create a `.env` file in the `backend/` folder
   - Copy the template from `SETUP_GUIDE.md` or see the example below
   - **IMPORTANT**: The `.env` file is NOT included in the repository for security reasons
   - You need to create your own `.env` file with your actual credentials

   **Minimum required variables:**
   ```env
   PORT=5000
   MONGO_URI_ADMIN=mongodb+srv://username:password@cluster-hostname/museum_admin?retryWrites=true&w=majority&appName=Cluster0
   MONGO_URI_SUPERADMIN=mongodb+srv://username:password@cluster-hostname/museum_superadmin?retryWrites=true&w=majority&appName=Cluster0
   MONGO_URI_BOOKINGS=mongodb+srv://username:password@cluster-hostname/museum_bookings?retryWrites=true&w=majority&appName=Cluster0
   JWT_SECRET=your-secret-key-here
   SESSION_SECRET=your-session-secret-here
   FRONTEND_URL=http://localhost:5173
   ```

   See `SETUP_GUIDE.md` for complete environment variable list and detailed setup instructions.

### Running the Application

1. **Start the Backend Server**
   ```bash
   cd backend
   npm start
   ```
   The API will be available at `http://localhost:5000`

2. **Start the Frontend Development Server**
   ```bash
   cd frontend
   npm run dev
   ```
   The application will be available at `http://localhost:5173`

3. **Access the Application**
   - Open `http://localhost:5173` in your browser
   - Use default credentials:
     - Super Admin: `superadmin` / `admin123`
     - Admin: `admin` / `admin123`

## 🎯 Features

### Authentication System
- **Super Admin Login**: Full system access
- **Administrator Login**: Limited access for daily operations
- Secure password hashing with bcryptjs
- JWT token-based authentication

### Dashboard
- Modern, responsive UI design
- Real-time statistics
- User management interface
- Activity monitoring

### Database Structure
- **museum_superadmin**: Super admin accounts
- **museum_admin**: Regular administrator accounts
- Separate collections for role-based access control

## 🔧 API Endpoints

### Authentication
- `POST /api/superadmin/login` - Super admin login
- `POST /api/admin/login` - Administrator login

### Data Management
- `GET /api/admin/count` - Get administrator statistics
- `POST /api/seed-superadmin` - Create default super admin
- `POST /api/seed-admin` - Create default admin
- `POST /api/seed-multiple-admins` - Create sample admin accounts

## 🎨 Technology Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **React Icons** - Icon library
- **CSS3** - Styling with modern features

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **bcryptjs** - Password hashing
- **CORS** - Cross-origin resource sharing

## 📱 Responsive Design

The application is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile devices

## 🔐 Default Credentials

### Super Admin
- **Username**: `superadmin`
- **Password**: `admin123`

### Administrator
- **Username**: `admin`
- **Password**: `admin123`

## 🛠️ Development

### Adding New Features
1. Create components in `frontend/src/components/`
2. Add API routes in `backend/routes/`
3. Update database models in `backend/models/`
4. Style components in `frontend/src/styles/`

### Database Seeding
Run these commands to populate the database with sample data:
```bash
curl -X POST http://localhost:5000/api/seed-superadmin
curl -X POST http://localhost:5000/api/seed-admin
curl -X POST http://localhost:5000/api/seed-multiple-admins
```

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📚 Setup Documentation

- **`SETUP_GUIDE.md`** - Complete setup guide for team members (includes environment variables)
- **`MONGODB_ATLAS_SETUP.md`** - MongoDB Atlas configuration guide
- **`GOOGLE_OAUTH_SETUP.md`** - Google OAuth integration setup
- **`SEMAPHORE_SMS_SETUP.md`** - SMS notifications setup
- **`GITHUB_PUSH_GUIDE.md`** - Guide for pushing to GitHub

## ⚠️ Important Notes

- **Environment Variables**: The `.env` file is NOT included in the repository. You must create your own `.env` file in the `backend/` folder. See `SETUP_GUIDE.md` for instructions.
- **Database**: This project uses MongoDB Atlas (cloud database). You need to set up your own MongoDB Atlas account and connection strings.
- **Security**: Never commit `.env` files or sensitive credentials to Git.

## 📞 Support

For support and questions, please contact the development team.
