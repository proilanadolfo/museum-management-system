# Museum Guest Page

A modern, responsive guest page for the Museum Attendance and Booking System built with React and MERN stack.

## Features

- **Modern Design**: Elegant and smooth-scrolling interface inspired by modern museum websites
- **Responsive Layout**: Fully responsive design that works on desktop, tablet, and mobile devices
- **Smooth Navigation**: Fixed navbar with smooth scroll navigation between sections
- **Interactive Components**: 
  - Hero section with call-to-action buttons
  - Filterable gallery of exhibits
  - Online booking form with validation
  - Contact form and information
- **Booking System**: Complete booking form that submits data to MongoDB via REST API

## Components Structure

```
GuestPage/
├── Navbar.jsx          # Fixed navigation bar
├── Home.jsx           # Hero section and introduction
├── Gallery.jsx        # Exhibits gallery with filters
├── Booking.jsx        # Online booking form
├── Contact.jsx        # Contact information and form
├── GuestPage.jsx      # Main component that combines all sections
├── guestcss/
│   └── global.css     # Global styles and utilities
├── Navbar.css         # Navigation styles
├── Home.css           # Home section styles
├── Gallery.css        # Gallery styles
├── Booking.css        # Booking form styles
├── Contact.css        # Contact section styles
├── GuestPage.css      # Main page and footer styles
└── index.js           # Export file for clean imports
```

## Usage

### Accessing the Guest Page

The guest page is accessible at `/guest` route. By default, the application redirects to this page.

### Navigation

The page includes smooth scroll navigation between sections:
- **Home**: Hero section and museum introduction
- **Exhibits**: Gallery of museum exhibits with category filters
- **Gallery**: Visual gallery of museum artifacts and displays
- **Announcements**: Latest museum announcements and news
- **Book a Visit**: Online booking form for museum visits
- **Contact**: Contact information and inquiry form

### Booking System

The booking form includes:
- Full Name (required)
- Email Address (required)
- Contact Number (required)
- Visit Date (required, must be future date)
- Number of Visitors (required, 1-50)
- Purpose of Visit (required)
- Special Requests (optional)

### API Integration

The booking form submits data to:
- **Endpoint**: `POST /api/bookings`
- **Database**: MongoDB collection `museum_bookings`
- **Response**: Confirmation code and booking status

## Styling

Each component has its own CSS file for maintainability:
- Modern CSS with flexbox and grid layouts
- Smooth transitions and hover effects
- Gradient backgrounds and modern design elements
- Mobile-first responsive design
- Custom scrollbar styling

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Dependencies

- React 19.1.1
- React Router DOM (for routing)
- Bootstrap 5.3.8 (for base styles)
- React Icons 5.5.0 (for icons)

## Development

To run the guest page in development:

1. Start the backend server:
   ```bash
   cd backend
   npm start
   ```

2. Start the frontend development server:
   ```bash
   cd frontend
   npm run dev
   ```

3. Navigate to `http://localhost:5173/guest`

## Production Deployment

The guest page is designed to work seamlessly in production environments with proper API endpoints and database connections.
