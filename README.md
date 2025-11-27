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
- MongoDB (running on localhost:27017)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Museum
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

### Running the Application

1. **Start MongoDB**
   - Make sure MongoDB is running on `localhost:27017`
   - Or update the connection string in `backend/db.js`

2. **Start the Backend Server**
   ```bash
   cd backend
   npm run start
   ```
   The API will be available at `http://localhost:5000`

3. **Start the Frontend Development Server**
   ```bash
   cd frontend
   npm run dev
   ```
   The application will be available at `http://localhost:5173`

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

## 📞 Support

For support and questions, please contact the development team.
