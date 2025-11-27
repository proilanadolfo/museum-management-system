# Missing Features from "Done" List
## Features nga naa sa system pero wala sa Done column

---

## 🖼️ GALLERY MANAGEMENT (Admin)

### MISSING-001: Create Gallery Item (Admin)
**User Story:** As an Administrator, I want to create new gallery items so that I can add new exhibits to the museum.

**Acceptance Criteria:**
- Admin can upload image (max 5MB, formats: jpeg, jpg, png, gif, webp)
- Admin can enter title, category, description, year
- Admin can set display order
- Admin can set active/inactive status
- Image is saved to uploads/gallery directory
- Gallery item is saved to database
- Success message is displayed
- New item appears in gallery immediately

---

### MISSING-002: Update Gallery Item (Admin)
**User Story:** As an Administrator, I want to update gallery items so that I can modify exhibit information.

**Acceptance Criteria:**
- Admin can update title, category, description, year
- Admin can change display order
- Admin can toggle active/inactive status
- Admin can upload new image (replaces old one)
- Old image is deleted when new one is uploaded
- Changes are saved to database
- Success message is displayed

---

### MISSING-003: Delete Gallery Item (Admin)
**User Story:** As an Administrator, I want to delete gallery items so that I can remove outdated exhibits.

**Acceptance Criteria:**
- Admin can delete gallery items
- Confirmation dialog is shown before deletion
- Image file is deleted from server
- Gallery item is removed from database
- Success message is displayed

---

## 📢 ANNOUNCEMENTS MANAGEMENT (Admin)

### MISSING-004: Create Announcement (Admin)
**User Story:** As an Administrator, I want to create new announcements so that I can share news with visitors.

**Acceptance Criteria:**
- Admin can enter title and description
- Admin can set announcement date
- Admin can set display order
- Admin can set active/inactive status
- Title, description, and date are required
- Announcement is saved to database
- Success message is displayed
- New announcement appears in list immediately

---

### MISSING-005: Update Announcement (Admin)
**User Story:** As an Administrator, I want to update announcements so that I can modify or correct information.

**Acceptance Criteria:**
- Admin can update title, description, date
- Admin can change display order
- Admin can toggle active/inactive status
- Changes are saved to database
- Success message is displayed

---

### MISSING-006: Delete Announcement (Admin)
**User Story:** As an Administrator, I want to delete announcements so that I can remove outdated news.

**Acceptance Criteria:**
- Admin can delete announcements
- Confirmation dialog is shown before deletion
- Announcement is removed from database
- Success message is displayed

---

## 📅 BOOKING MANAGEMENT (Admin)

### MISSING-007: View Bookings in Calendar View (Admin)
**User Story:** As an Administrator, I want to view bookings in a calendar format so that I can see the schedule visually.

**Acceptance Criteria:**
- Calendar view shows bookings as events
- Events are color-coded by status (pending, confirmed, cancelled)
- Calendar supports month, week, day, and agenda views
- Clicking event shows booking details
- Events show booking name and number of visitors
- Calendar can be navigated (previous/next month)
- Real-time updates refresh calendar
- Toggle between Table and Calendar views

---

### MISSING-008: Update Booking Status (Admin)
**User Story:** As an Administrator, I want to update booking status so that I can confirm or cancel visitor requests.

**Acceptance Criteria:**
- Admin can change booking status (pending, confirmed, cancelled)
- Admin can add notes when updating status
- Status change triggers email notification to guest
- Status change triggers SMS notification (if configured)
- Confirmed bookings sync to Google Calendar (if enabled)
- Cancelled bookings remove from Google Calendar (if enabled)
- Real-time update is broadcast to all clients
- Success message is displayed

---

### MISSING-009: Delete Booking (Admin)
**User Story:** As an Administrator, I want to delete bookings so that I can remove invalid or duplicate requests.

**Acceptance Criteria:**
- Admin can delete bookings
- Confirmation dialog is shown before deletion
- Booking is permanently deleted from database
- Google Calendar event is deleted (if exists)
- Real-time update is broadcast to all clients
- Success message is displayed

---

## ✅ ATTENDANCE MANAGEMENT (Admin)

### MISSING-010: Check-Out Visitor (Admin)
**User Story:** As an Administrator, I want to check out visitors so that I can track when they leave the museum.

**Acceptance Criteria:**
- Admin can select a checked-in visitor from the list
- Admin can click "Check Out" button
- Check-out time is automatically recorded
- Status changes from "checked-in" to "checked-out"
- Duration of visit is calculated and displayed
- Success message is displayed
- Real-time update is broadcast to all connected clients
- Cannot check out already checked-out visitors

---



---

## 📄 REPORTS GENERATION (Admin)

### MISSING-012: Generate PDF Report (Admin - Quick Export)
**User Story:** As an Administrator, I want to generate PDF reports so that I can create official documents.

**Acceptance Criteria:**
- Admin can select report type (today, week, month, custom)
- Admin can set date range for custom reports
- PDF is generated with formatted table
- PDF includes header with logo and organization info
- PDF includes footer with page numbers
- PDF includes statistics summary
- PDF is downloaded automatically
- Filename includes date
- Success message is displayed

---

### MISSING-013: Generate Excel Report (Admin)
**User Story:** As an Administrator, I want to generate Excel reports so that I can analyze data in spreadsheet format.

**Acceptance Criteria:**
- Admin can export attendance data to Excel format
- Excel file includes header with organization info
- Excel file includes statistics summary
- Excel file includes formatted table with all records
- Excel file is downloaded automatically
- Filename includes date
- Success message is displayed

---

### MISSING-014: Generate CSV Report (Admin)
**User Story:** As an Administrator, I want to generate CSV reports so that I can import data into other systems.

**Acceptance Criteria:**
- Admin can export attendance data to CSV format
- CSV file includes header comments with metadata
- CSV file includes statistics summary
- CSV file includes all records in comma-separated format
- CSV file is downloaded automatically
- Filename includes date
- Success message is displayed

---

### MISSING-015: Preview Report Data with Templates (Admin)
**User Story:** As an Administrator, I want to preview report data before generating PDF so that I can verify the information.

**Acceptance Criteria:**
- Admin can select report template
- Admin can set date range (start date, end date)
- Admin can apply filters (type, status, department, school, grade)
- Preview shows filtered data in table format
- Preview shows first 10 records with message if more exist
- Preview displays: date, name, type, time in, time out, status
- Preview updates when filters change

---

### MISSING-016: Generate PDF Report with Templates (Admin)
**User Story:** As an Administrator, I want to generate PDF reports using templates so that I can create formatted documents.

**Acceptance Criteria:**
- Admin can select report template
- Admin can set date range
- Admin can apply filters
- PDF is generated using selected template
- PDF includes filtered attendance data
- PDF is formatted according to template settings (orientation, title)
- PDF is downloaded automatically
- Filename includes template name and date
- Success message is displayed
- Error handling for generation failures

---

## 📊 REPORT TEMPLATES (Super Admin)

### MISSING-017: Create Report Template (Super Admin)
**User Story:** As a Super Administrator, I want to create report templates so that admins can generate formatted reports.

**Acceptance Criteria:**
- Super Admin can create new report templates
- Template includes: name, format (PDF, Excel, CSV), orientation (portrait/landscape)
- Template builder allows drag-and-drop elements
- Template can include: logo, title, subtitle, text, table, footer, divider
- Template is saved to database
- Template appears in admin's template list
- Success message is displayed

---

### MISSING-018: View Report Templates (Super Admin)
**User Story:** As a Super Administrator, I want to view all report templates so that I can manage them.

**Acceptance Criteria:**
- Super Admin can see list of all report templates
- List shows template name, format, orientation, element count
- List is sorted by creation date
- Templates can be edited or deleted

---

### MISSING-019: Update Report Template (Super Admin)
**User Story:** As a Super Administrator, I want to update report templates so that I can modify formatting.

**Acceptance Criteria:**
- Super Admin can update template name, format, orientation
- Super Admin can add, edit, or remove elements
- Super Admin can drag elements to reposition
- Changes are saved to database
- Updated template is available to admins immediately
- Success message is displayed

---

### MISSING-020: Delete Report Template (Super Admin)
**User Story:** As a Super Administrator, I want to delete report templates so that I can remove outdated formats.

**Acceptance Criteria:**
- Super Admin can delete report templates
- Confirmation dialog is shown before deletion
- Template is removed from database
- Template no longer appears in admin's list
- Success message is displayed

---

## ⚙️ SETTINGS MANAGEMENT (Admin)

### MISSING-021: View Museum Settings (Admin)
**User Story:** As an Administrator, I want to view museum settings so that I can see current configuration.

**Acceptance Criteria:**
- Admin can view operating hours for each day
- Admin can view available days
- Admin can view blocked dates
- Admin can view time slots
- Admin can view booking limits (min/max advance days, max visitors per slot)
- Admin can view booking acceptance status

---

### MISSING-022: Update Museum Settings (Admin)
**User Story:** As an Administrator, I want to update museum settings so that I can configure operating hours and booking rules.

**Acceptance Criteria:**
- Admin can set operating hours for each day of the week
- Admin can set available days (which days museum is open)
- Admin can add/remove blocked dates
- Admin can add/remove available dates (overrides)
- Admin can set time slots
- Admin can set min/max advance booking days
- Admin can set max visitors per slot
- Admin can toggle booking acceptance on/off
- Changes are saved to database
- Success message is displayed
- Settings affect booking availability immediately

---

### MISSING-023: Connect Google Calendar (Admin)
**User Story:** As an Administrator, I want to connect Google Calendar so that confirmed bookings sync automatically.

**Acceptance Criteria:**
- Admin can click "Connect Google Calendar" button
- Redirects to Google OAuth consent screen
- After authorization, tokens are saved to settings
- Connection status is displayed
- Test connection button verifies connection
- Success message is displayed

---

### MISSING-024: Disconnect Google Calendar (Admin)
**User Story:** As an Administrator, I want to disconnect Google Calendar so that I can stop syncing bookings.

**Acceptance Criteria:**
- Admin can click "Disconnect Google Calendar" button
- Confirmation dialog is shown
- Tokens are removed from settings
- Connection status shows "Not Connected"
- Success message is displayed
- Future bookings won't sync

---

### MISSING-025: Test Google Calendar Connection (Admin)
**User Story:** As an Administrator, I want to test Google Calendar connection so that I can verify it's working.

**Acceptance Criteria:**
- Admin can click "Test Connection" button
- System verifies tokens are valid
- System checks if Calendar API is accessible
- Success or error message is displayed
- Test result is clear and informative

---

### MISSING-026: Auto-Sync Bookings to Google Calendar
**User Story:** As a System, I want to automatically sync confirmed bookings to Google Calendar so that they appear in external calendars.

**Acceptance Criteria:**
- When booking status changes to "confirmed", event is created in Google Calendar
- Event includes: booking name, date, time, number of visitors
- Event link is saved to booking record
- When booking is cancelled, event is deleted from Google Calendar
- Sync happens automatically without admin action
- Errors are logged but don't block booking updates

---

## 👤 PROFILE MANAGEMENT

### MISSING-027: Update Profile (Admin)
**User Story:** As an Administrator, I want to update my profile information so that my details are current.

**Acceptance Criteria:**
- Admin can update name, email, username
- Admin can upload profile picture (max 5MB)
- Admin can change password
- Profile picture is saved and displayed
- Changes are saved to database
- Success message is displayed

---

### MISSING-028: Update Profile (Super Admin)
**User Story:** As a Super Administrator, I want to update my profile information so that my details are current.

**Acceptance Criteria:**
- Super Admin can update name, email, username
- Super Admin can upload profile picture (max 5MB)
- Profile picture is saved and displayed
- Changes are saved to database
- Success message is displayed

---





sdfgdfggfddgfdgfdgf

## 🔄 REAL-TIME UPDATES

### MISSING-029: Real-Time Booking Updates (Admin)
**User Story:** As an Administrator, I want to receive real-time booking updates so that I can see changes immediately.

**Acceptance Criteria:**
- Admin dashboard receives real-time updates via SSE (Server-Sent Events)
- New bookings appear immediately without refresh
- Booking status changes update immediately
- Booking deletions update immediately
- Updates work across multiple browser tabs
- Connection is automatically re-established if lost

---

### MISSING-030: Real-Time Attendance Updates (Admin)
**User Story:** As an Administrator, I want to receive real-time attendance updates so that I can see check-ins immediately.

**Acceptance Criteria:**
- Attendance list receives real-time updates via SSE
- New check-ins appear immediately without refresh
- Check-outs update immediately
- Attendance record updates appear immediately
- Updates work across multiple browser tabs
- Connection is automatically re-established if lost

---

## 🌐 GUEST PAGE FEATURES

### MISSING-031: View Contact/About Page (Guest)
**User Story:** As a Guest, I want to view contact information and museum details so that I can learn about the museum and reach them.

**Acceptance Criteria:**
- Contact/About page displays museum information
- Page shows mission, vision, and statistics
- Page displays contact details (address, phone, email)
- Page shows operating hours
- Page is accessible from navigation
- Page is responsive

---

### MISSING-032: View Museum Location on Map (Guest)
**User Story:** As a Guest, I want to view the museum location on a map so that I can find directions.

**Acceptance Criteria:**
- Map displays museum location
- Map is interactive (zoom, pan)
- Map shows address or coordinates
- Map uses OpenStreetMap or Google Maps
- Map is responsive

---

## 📧 EMAIL NOTIFICATIONS

### MISSING-033: Send Booking Confirmation Email
**User Story:** As a System, I want to send booking confirmation emails so that guests know their booking is confirmed.

**Acceptance Criteria:**
- Email is sent when booking status changes to "confirmed"
- Email includes booking details (name, date, time, visitors, purpose)
- Email includes confirmation code
- Email is formatted professionally
- Email is sent to guest's email address
- Email sending doesn't block booking update

---

### MISSING-034: Send Booking Cancellation Email
**User Story:** As a System, I want to send booking cancellation emails so that guests know their booking is cancelled.

**Acceptance Criteria:**
- Email is sent when booking status changes to "cancelled"
- Email includes booking details
- Email includes confirmation code
- Email is formatted professionally
- Email is sent to guest's email address

---

### MISSING-035: Send Booking Submission Email
**User Story:** As a System, I want to send booking submission emails so that guests receive their confirmation code.

**Acceptance Criteria:**
- Email is sent immediately after booking creation
- Email includes confirmation code prominently
- Email includes booking details (date, time, visitors, purpose)
- Email provides instructions for checking status
- Email is formatted professionally
- Email is sent to guest's email address

---

### MISSING-036: Send Admin Credentials Email
**User Story:** As a System, I want to send admin credentials emails so that new admins can log in.

**Acceptance Criteria:**
- Email is sent when new admin account is created
- Email includes username and password
- Email includes login instructions
- Email includes security notice
- Email is formatted professionally
- Email is sent to admin's email address

---

### MISSING-037: Send Password Reset Code Email
**User Story:** As a System, I want to send password reset code emails so that users can reset their passwords.

**Acceptance Criteria:**
- Email is sent when password reset is requested
- Email includes 6-digit reset code prominently
- Email includes expiration time (10 minutes)
- Email includes instructions
- Email is formatted professionally
- Email is sent to user's email address

---

## 📱 SMS NOTIFICATIONS

### MISSING-038: Send Booking Confirmation SMS
**User Story:** As a System, I want to send booking confirmation SMS so that guests receive mobile notifications.

**Acceptance Criteria:**
- SMS is sent when booking status changes to "confirmed"
- SMS includes booking details (name, date, confirmation code)
- SMS is sent to guest's Philippine mobile number
- SMS sending doesn't block booking update
- SMS uses Semaphore SMS service (if configured)

---

### MISSING-039: Send Booking Cancellation SMS
**User Story:** As a System, I want to send booking cancellation SMS so that guests receive mobile notifications.

**Acceptance Criteria:**
- SMS is sent when booking status changes to "cancelled"
- SMS includes booking details
- SMS is sent to guest's Philippine mobile number
- SMS sending doesn't block booking update

---

## 📊 DASHBOARD FEATURES

### MISSING-040: View Attendance Trends Chart (Admin)
**User Story:** As an Administrator, I want to see attendance trends over the last 7 days so that I can identify patterns.

**Acceptance Criteria:**
- Line chart shows attendance for last 7 days
- Chart displays date on X-axis and count on Y-axis
- Chart updates with real-time data
- Chart is responsive and readable

---

### MISSING-041: View Visitor Type Distribution (Admin)
**User Story:** As an Administrator, I want to see the distribution of visitor types so that I can understand visitor demographics.

**Acceptance Criteria:**
- Pie chart shows breakdown of student, staff, and visitor counts
- Chart displays percentages for each type
- Chart is color-coded for easy identification
- Chart updates with real-time data

---

### MISSING-042: View Booking Status Distribution (Admin)
**User Story:** As an Administrator, I want to see the distribution of booking statuses so that I can track booking management.

**Acceptance Criteria:**
- Pie chart shows breakdown of pending, confirmed, and cancelled bookings
- Chart displays percentages for each status
- Chart is color-coded for easy identification
- Chart updates with real-time data

---

### MISSING-043: View Booking Trends Chart (Admin)
**User Story:** As an Administrator, I want to see booking trends over the last 30 days so that I can analyze booking patterns.

**Acceptance Criteria:**
- Line chart shows bookings created over last 30 days
- Chart displays date on X-axis and count on Y-axis
- Chart updates with real-time data
- Chart is responsive and readable

---

### MISSING-044: View Upcoming Bookings (Admin)
**User Story:** As an Administrator, I want to see upcoming bookings so that I can prepare for future visits.

**Acceptance Criteria:**
- List shows next 6 upcoming bookings
- Each booking shows name, date, number of visitors, status, and purpose
- Bookings are sorted by visit date (earliest first)
- Only pending and confirmed bookings are shown
- Confirmation code is displayed for reference

---

## ✅ SUMMARY

**Total Missing Features: 44**

**Categories:**
- Gallery Management: 3 features
- Announcements Management: 3 features
- Booking Management: 3 features
- Attendance Management: 2 features
- Reports Generation: 5 features
- Report Templates (Super Admin): 4 features
- Settings Management: 6 features
- Profile Management: 2 features
- Real-Time Updates: 2 features
- Guest Page Features: 2 features
- Email Notifications: 5 features
- SMS Notifications: 2 features
- Dashboard Features: 5 features

---

## 📝 NOTES

1. **All these features are IMPLEMENTED** in your system but are NOT in your Trello "Done" column.

2. **Recommendation:** Add these to your Trello board as separate cards or update existing cards to include these features.

3. **Priority:** Some features like "Update Booking Status" and "Check-Out Visitor" are critical daily operations and should be marked as Done.

4. **Testing:** Make sure all these features are tested before marking as Done.

---

**End of Document**

