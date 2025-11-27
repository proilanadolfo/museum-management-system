# Museum Management System - User Stories & Acceptance Criteria
## Para sa Trello Sprint Planning

---

## 📋 AUTHENTICATION & USER MANAGEMENT

### US-001: Admin Login (Username/Password)
**User Story:** As an Administrator, I want to log in using my username and password so that I can access the admin dashboard.

**Acceptance Criteria:**
- Admin can log in with username or email
- Password is validated and hashed
- reCAPTCHA verification is required
- Invalid credentials show error message
- Successful login redirects to admin dashboard
- Session token is stored in localStorage
- Auto-activate admin status on login

---

### US-002: Super Admin Login (Username/Password)
**User Story:** As a Super Administrator, I want to log in using my username and password so that I can access the super admin dashboard.

**Acceptance Criteria:**
- Super Admin can log in with username or email
- Password is validated and hashed
- reCAPTCHA verification is required
- Invalid credentials show error message
- Successful login redirects to super admin dashboard
- Session token is stored in localStorage

---

### US-003: Google OAuth Login (Admin)
**User Story:** As an Administrator, I want to log in using my Google account so that I can access the system without remembering a password.

**Acceptance Criteria:**
- Admin can click "Login with Google" button
- Redirects to Google OAuth consent screen
- After authentication, redirects back to admin dashboard
- Google profile information is saved (name, picture, email)
- Only existing admin accounts can use Google OAuth
- Auto-activate admin status on Google login
- Error handling for email conflicts

---

### US-004: Google OAuth Login (Super Admin)
**User Story:** As a Super Administrator, I want to log in using my Google account so that I can access the system securely.

**Acceptance Criteria:**
- Super Admin can click "Login with Google" button
- Redirects to Google OAuth consent screen
- After authentication, redirects back to super admin dashboard
- Google profile information is saved
- Only existing super admin accounts can use Google OAuth
- Error handling for email conflicts

---

### US-005: Forgot Password (Admin)
**User Story:** As an Administrator, I want to reset my password if I forget it so that I can regain access to my account.

**Acceptance Criteria:**
- Admin can request password reset via email
- System generates 6-digit reset code
- Reset code is sent to admin's email
- Reset code expires after 10 minutes
- Admin can verify reset code
- Admin can set new password after code verification
- Old password is invalidated after reset

---

### US-006: Forgot Password (Super Admin)
**User Story:** As a Super Administrator, I want to reset my password if I forget it so that I can regain access to my account.

**Acceptance Criteria:**
- Super Admin can request password reset via email
- System generates 6-digit reset code
- Reset code is sent to super admin's email
- Reset code expires after 10 minutes
- Super Admin can verify reset code
- Super Admin can set new password after code verification

---

### US-007: Create Administrator Account (Super Admin)
**User Story:** As a Super Administrator, I want to create new administrator accounts so that I can grant access to other staff members.

**Acceptance Criteria:**
- Super Admin can create new admin accounts
- Username and email are required and must be unique
- System generates random password if not provided
- Password is automatically sent to admin's email
- New admin account is created with "inactive" status
- Admin credentials email is sent with login instructions
- Duplicate username/email shows error message

---

### US-008: View Administrator List (Super Admin)
**User Story:** As a Super Administrator, I want to view all administrator accounts so that I can manage them.

**Acceptance Criteria:**
- Super Admin can see list of all administrators
- List shows username, email, status, and creation date
- List is sorted by creation date (newest first)
- Password hashes are not displayed

---

### US-009: Update Administrator Account (Super Admin)
**User Story:** As a Super Administrator, I want to update administrator account details so that I can modify their information.

**Acceptance Criteria:**
- Super Admin can update username, email, and password
- Username and email must be unique
- Password can be changed independently
- Changes are saved to database
- Success message is displayed after update

---

### US-010: Activate/Deactivate Administrator (Super Admin)
**User Story:** As a Super Administrator, I want to activate or deactivate administrator accounts so that I can control access to the system.

**Acceptance Criteria:**
- Super Admin can toggle admin status (active/inactive)
- Status change is saved immediately
- Inactive admins cannot log in
- Active status is shown in admin list
- Success message confirms status change

---

### US-011: Delete Administrator Account (Super Admin)
**User Story:** As a Super Administrator, I want to delete administrator accounts so that I can remove access for former staff.

**Acceptance Criteria:**
- Super Admin can delete administrator accounts
- Confirmation dialog is shown before deletion
- Account is permanently deleted from database
- Success message confirms deletion
- Deleted admin cannot log in

---

### US-012: Update Profile (Admin)
**User Story:** As an Administrator, I want to update my profile information so that my details are current.

**Acceptance Criteria:**
- Admin can update name, email, username
- Admin can upload profile picture (max 5MB)
- Admin can change password
- Profile picture is saved and displayed
- Changes are saved to database
- Success message is displayed

---

### US-013: Update Profile (Super Admin)
**User Story:** As a Super Administrator, I want to update my profile information so that my details are current.

**Acceptance Criteria:**
- Super Admin can update name, email, username
- Super Admin can upload profile picture (max 5MB)
- Profile picture is saved and displayed
- Changes are saved to database
- Success message is displayed

---

## 📊 DASHBOARD & ANALYTICS

### US-014: View Dashboard Overview (Admin)
**User Story:** As an Administrator, I want to see an overview of today's statistics so that I can quickly understand the current status.

**Acceptance Criteria:**
- Dashboard shows today's attendance count
- Dashboard shows checked-in vs checked-out visitors
- Dashboard shows visitor type breakdown (student, staff, visitor)
- Dashboard shows booking statistics (pending, confirmed, cancelled)
- Dashboard shows upcoming bookings (next 6)
- Dashboard shows active announcements count
- Dashboard shows active exhibits count
- Data refreshes automatically
- Last updated timestamp is displayed

---

### US-015: View Attendance Trends Chart (Admin)
**User Story:** As an Administrator, I want to see attendance trends over the last 7 days so that I can identify patterns.

**Acceptance Criteria:**
- Line chart shows attendance for last 7 days
- Chart displays date on X-axis and count on Y-axis
- Chart updates with real-time data
- Chart is responsive and readable

---

### US-016: View Visitor Type Distribution (Admin)
**User Story:** As an Administrator, I want to see the distribution of visitor types so that I can understand visitor demographics.

**Acceptance Criteria:**
- Pie chart shows breakdown of student, staff, and visitor counts
- Chart displays percentages for each type
- Chart is color-coded for easy identification
- Chart updates with real-time data

---

### US-017: View Booking Status Distribution (Admin)
**User Story:** As an Administrator, I want to see the distribution of booking statuses so that I can track booking management.

**Acceptance Criteria:**
- Pie chart shows breakdown of pending, confirmed, and cancelled bookings
- Chart displays percentages for each status
- Chart is color-coded for easy identification
- Chart updates with real-time data

---

### US-018: View Booking Trends Chart (Admin)
**User Story:** As an Administrator, I want to see booking trends over the last 30 days so that I can analyze booking patterns.

**Acceptance Criteria:**
- Line chart shows bookings created over last 30 days
- Chart displays date on X-axis and count on Y-axis
- Chart updates with real-time data
- Chart is responsive and readable

---

### US-019: View Upcoming Bookings (Admin)
**User Story:** As an Administrator, I want to see upcoming bookings so that I can prepare for future visits.

**Acceptance Criteria:**
- List shows next 6 upcoming bookings
- Each booking shows name, date, number of visitors, status, and purpose
- Bookings are sorted by visit date (earliest first)
- Only pending and confirmed bookings are shown
- Confirmation code is displayed for reference

---

## ✅ ATTENDANCE MANAGEMENT

### US-020: Check-In Visitor (Admin)
**User Story:** As an Administrator, I want to check in visitors so that I can track who is currently in the museum.

**Acceptance Criteria:**
- Admin can enter visitor name
- Admin can select visitor type (student, staff, visitor)
- ID number is required for students and staff (exactly 10 digits)
- ID number is optional for visitors
- Admin can add notes
- System prevents duplicate check-ins (same ID number already checked in)
- Check-in time is automatically recorded
- Success message is displayed
- Real-time update is broadcast to all connected clients
- Attendance record appears in today's list immediately

---

### US-021: Check-Out Visitor (Admin)
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

### US-022: View Today's Attendance Records (Admin)
**User Story:** As an Administrator, I want to view today's attendance records so that I can see who is currently in the museum.

**Acceptance Criteria:**
- List shows all attendance records for today
- Records are sorted by check-in time (newest first)
- Each record shows: name, ID number, type, check-in time, check-out time, status
- Records are filtered by current admin
- List refreshes automatically
- Real-time updates via SSE (Server-Sent Events)

---

### US-023: Filter Attendance Records (Admin)
**User Story:** As an Administrator, I want to filter attendance records so that I can find specific visitors quickly.

**Acceptance Criteria:**
- Admin can filter by visitor type (all, student, staff, visitor)
- Admin can filter by status (all, checked-in, checked-out)
- Admin can search by name or ID number
- Filters work together (AND logic)
- Filtered results update immediately
- Clear filters button resets all filters

---

### US-024: Update Attendance Record (Admin)
**User Story:** As an Administrator, I want to update attendance records so that I can correct mistakes or add information.

**Acceptance Criteria:**
- Admin can edit visitor name
- Admin can change visitor type
- Admin can update ID number (with validation)
- Admin can add or edit notes
- Changes are saved to database
- Success message is displayed
- Real-time update is broadcast to all connected clients
- Validation rules apply (10 digits for student/staff)

---

### US-025: View Attendance Statistics (Admin)
**User Story:** As an Administrator, I want to view attendance statistics so that I can analyze visitor patterns.

**Acceptance Criteria:**
- Statistics show total visitors today
- Statistics show breakdown by type (student, staff, visitor)
- Statistics show checked-in vs checked-out counts
- Statistics update in real-time
- Statistics are calculated for current admin's records

---

### US-026: View Attendance Reports (Admin)
**User Story:** As an Administrator, I want to view attendance reports for different time periods so that I can analyze historical data.

**Acceptance Criteria:**
- Admin can select report type (today, week, month, custom)
- Admin can select date range for custom reports
- Report shows all attendance records in selected period
- Report includes: name, ID number, type, check-in time, check-out time, status, notes
- Report is sorted by check-in time (newest first)
- Report is limited to 100 records for performance

---

## 📅 BOOKING MANAGEMENT

### US-027: Create Booking (Guest)
**User Story:** As a Guest, I want to create a booking request so that I can visit the museum.

**Acceptance Criteria:**
- Guest can fill out booking form with: full name, email, contact number, visit date, purpose, number of visitors, special requests
- Email format is validated
- Philippine mobile number is normalized (+639XXXXXXXXX format)
- Visit date must be today or in the future
- Number of visitors must be between 1 and 50
- System generates unique confirmation code
- Booking is saved with "pending" status
- Confirmation email is sent with confirmation code
- Success message is displayed with confirmation code
- Real-time update is broadcast to admin dashboard

---

### US-028: View Booking Status (Guest)
**User Story:** As a Guest, I want to check my booking status using my confirmation code so that I can know if my booking is confirmed.

**Acceptance Criteria:**
- Guest can enter confirmation code and email
- System retrieves booking if code and email match
- Booking details are displayed: name, date, time, number of visitors, status, purpose
- Status is clearly shown (pending, confirmed, cancelled)
- Error message if booking not found or email doesn't match

---

### US-029: Cancel Booking (Guest)
**User Story:** As a Guest, I want to cancel my booking so that I can free up my slot if I can't make it.

**Acceptance Criteria:**
- Guest can cancel booking using confirmation code and email
- Guest can provide cancellation reason
- Booking status changes to "cancelled"
- Cancellation email is sent to guest
- Cancellation is recorded with timestamp and reason
- Real-time update is broadcast to admin dashboard
- Cannot cancel already cancelled bookings

---

### US-030: Modify Booking (Guest)
**User Story:** As a Guest, I want to modify my pending booking so that I can update my visit details.

**Acceptance Criteria:**
- Guest can modify pending bookings only
- Guest can change visit date (must be in future)
- Guest can change number of visitors (1-50)
- Guest can change purpose
- Guest can update special requests
- Changes are validated
- Success message is displayed
- Cannot modify confirmed or cancelled bookings

---

### US-031: View All Bookings (Admin)
**User Story:** As an Administrator, I want to view all bookings so that I can manage visitor requests.

**Acceptance Criteria:**
- Admin can see list of all bookings
- List shows: name, email, visit date, number of visitors, status, purpose, confirmation code
- List is sorted by creation date (newest first)
- List can be filtered by status
- List can be searched by name or confirmation code
- Real-time updates via SSE

---

### US-032: View Bookings in Calendar View (Admin)
**User Story:** As an Administrator, I want to view bookings in a calendar format so that I can see the schedule visually.

**Acceptance Criteria:**
- Calendar view shows bookings as events
- Events are color-coded by status (pending, confirmed, cancelled)
- Calendar supports month, week, day, and agenda views
- Clicking event shows booking details
- Events show booking name and number of visitors
- Calendar can be navigated (previous/next month)
- Real-time updates refresh calendar

---

### US-033: Update Booking Status (Admin)
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

### US-034: Delete Booking (Admin)
**User Story:** As an Administrator, I want to delete bookings so that I can remove invalid or duplicate requests.

**Acceptance Criteria:**
- Admin can delete bookings
- Confirmation dialog is shown before deletion
- Booking is permanently deleted from database
- Google Calendar event is deleted (if exists)
- Real-time update is broadcast to all clients
- Success message is displayed

---

### US-035: View Pending Bookings Count (Admin)
**User Story:** As an Administrator, I want to see the count of pending bookings so that I know how many need attention.

**Acceptance Criteria:**
- Pending bookings count is displayed in dashboard
- Count updates in real-time
- Count is accurate and reflects current database state
- Count is shown as a badge or number

---

### US-036: View Latest Pending Bookings (Admin)
**User Story:** As an Administrator, I want to see the latest pending bookings so that I can prioritize which ones to review.

**Acceptance Criteria:**
- List shows latest pending bookings (up to 50)
- List is sorted by creation date (newest first)
- Each booking shows: name, email, number of visitors, visit date, status
- List updates in real-time
- List is lightweight for quick loading

---

## 🖼️ GALLERY MANAGEMENT

### US-037: View Gallery Items (Guest)
**User Story:** As a Guest, I want to view the museum gallery so that I can see the exhibits.

**Acceptance Criteria:**
- Gallery displays all active gallery items
- Items are displayed in a grid layout
- Each item shows image, title, category, description, year
- Gallery is filterable by category
- Gallery is responsive (mobile, tablet, desktop)
- Images load properly

---

### US-038: View Gallery Items (Admin)
**User Story:** As an Administrator, I want to view all gallery items so that I can manage the museum exhibits.

**Acceptance Criteria:**
- Admin can see list of all gallery items (active and inactive)
- List shows: image thumbnail, title, category, description, year, order, active status
- List is sorted by order and creation date
- List can be filtered by category
- List can be searched by title

---

### US-039: Create Gallery Item (Admin)
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

### US-040: Update Gallery Item (Admin)
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

### US-041: Delete Gallery Item (Admin)
**User Story:** As an Administrator, I want to delete gallery items so that I can remove outdated exhibits.

**Acceptance Criteria:**
- Admin can delete gallery items
- Confirmation dialog is shown before deletion
- Image file is deleted from server
- Gallery item is removed from database
- Success message is displayed

---

## 📢 ANNOUNCEMENTS MANAGEMENT

### US-042: View Announcements (Guest)
**User Story:** As a Guest, I want to view museum announcements so that I can stay informed about news and events.

**Acceptance Criteria:**
- Announcements section displays active announcements
- Announcements are sorted by order and date (newest first)
- Each announcement shows title, description, and date
- Only active announcements are shown
- Maximum 10 announcements are displayed
- Announcements are displayed in a readable format

---

### US-043: View Announcements (Admin)
**User Story:** As an Administrator, I want to view all announcements so that I can manage museum news.

**Acceptance Criteria:**
- Admin can see list of all announcements (active and inactive)
- List shows: title, description, date, order, active status
- List is sorted by order and date (newest first)
- List can be searched by title

---

### US-044: Create Announcement (Admin)
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

### US-045: Update Announcement (Admin)
**User Story:** As an Administrator, I want to update announcements so that I can modify or correct information.

**Acceptance Criteria:**
- Admin can update title, description, date
- Admin can change display order
- Admin can toggle active/inactive status
- Changes are saved to database
- Success message is displayed

---

### US-046: Delete Announcement (Admin)
**User Story:** As an Administrator, I want to delete announcements so that I can remove outdated news.

**Acceptance Criteria:**
- Admin can delete announcements
- Confirmation dialog is shown before deletion
- Announcement is removed from database
- Success message is displayed

---

## 📄 REPORTS GENERATION

### US-047: View Report Templates (Admin)
**User Story:** As an Administrator, I want to view available report templates so that I can generate reports.

**Acceptance Criteria:**
- Admin can see list of all report templates
- Each template shows name, orientation, title
- Templates are created by Super Admin
- Admin can select a template from dropdown

---

### US-048: Preview Report Data (Admin)
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

### US-049: Generate PDF Report (Admin)
**User Story:** As an Administrator, I want to generate PDF reports so that I can create official documents.

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

### US-050: Create Report Template (Super Admin)
**User Story:** As a Super Administrator, I want to create report templates so that admins can generate formatted reports.

**Acceptance Criteria:**
- Super Admin can create new report templates
- Template includes: name, orientation (portrait/landscape), title
- Template defines layout and formatting
- Template is saved to database
- Template appears in admin's template list
- Success message is displayed

---

### US-051: View Report Templates (Super Admin)
**User Story:** As a Super Administrator, I want to view all report templates so that I can manage them.

**Acceptance Criteria:**
- Super Admin can see list of all report templates
- List shows template name, orientation, title
- List is sorted by creation date
- Templates can be edited or deleted

---

### US-052: Update Report Template (Super Admin)
**User Story:** As a Super Administrator, I want to update report templates so that I can modify formatting.

**Acceptance Criteria:**
- Super Admin can update template name, orientation, title
- Changes are saved to database
- Updated template is available to admins immediately
- Success message is displayed

---

### US-053: Delete Report Template (Super Admin)
**User Story:** As a Super Administrator, I want to delete report templates so that I can remove outdated formats.

**Acceptance Criteria:**
- Super Admin can delete report templates
- Confirmation dialog is shown before deletion
- Template is removed from database
- Template no longer appears in admin's list
- Success message is displayed

---

## ⚙️ SETTINGS MANAGEMENT

### US-054: View Museum Settings (Admin)
**User Story:** As an Administrator, I want to view museum settings so that I can see current configuration.

**Acceptance Criteria:**
- Admin can view operating hours for each day
- Admin can view available days
- Admin can view blocked dates
- Admin can view time slots
- Admin can view booking limits (min/max advance days, max visitors per slot)
- Admin can view booking acceptance status

---

### US-055: Update Museum Settings (Admin)
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

### US-056: View Available Dates for Booking (Guest)
**User Story:** As a Guest, I want to see available dates for booking so that I can choose when to visit.

**Acceptance Criteria:**
- Guest booking form shows only available dates
- Dates respect operating hours and available days
- Blocked dates are excluded
- Available dates override is respected
- Dates within min/max advance booking days are shown
- Dates are formatted clearly

---

### US-057: View Available Time Slots (Guest)
**User Story:** As a Guest, I want to see available time slots for my selected date so that I can choose a time.

**Acceptance Criteria:**
- Time slots are shown for selected date
- Slots respect operating hours for that day
- Slots show availability (available/full)
- Slots show current bookings count
- Slots respect max visitors per slot limit
- Slots are formatted in HH:MM format

---

### US-058: Connect Google Calendar (Admin)
**User Story:** As an Administrator, I want to connect Google Calendar so that confirmed bookings sync automatically.

**Acceptance Criteria:**
- Admin can click "Connect Google Calendar" button
- Redirects to Google OAuth consent screen
- After authorization, tokens are saved to settings
- Connection status is displayed
- Test connection button verifies connection
- Success message is displayed

---

### US-059: Disconnect Google Calendar (Admin)
**User Story:** As an Administrator, I want to disconnect Google Calendar so that I can stop syncing bookings.

**Acceptance Criteria:**
- Admin can click "Disconnect Google Calendar" button
- Confirmation dialog is shown
- Tokens are removed from settings
- Connection status shows "Not Connected"
- Success message is displayed
- Future bookings won't sync

---

### US-060: Test Google Calendar Connection (Admin)
**User Story:** As an Administrator, I want to test Google Calendar connection so that I can verify it's working.

**Acceptance Criteria:**
- Admin can click "Test Connection" button
- System verifies tokens are valid
- System checks if Calendar API is accessible
- Success or error message is displayed
- Test result is clear and informative

---

### US-061: Auto-Sync Bookings to Google Calendar
**User Story:** As a System, I want to automatically sync confirmed bookings to Google Calendar so that they appear in external calendars.

**Acceptance Criteria:**
- When booking status changes to "confirmed", event is created in Google Calendar
- Event includes: booking name, date, time, number of visitors
- Event link is saved to booking record
- When booking is cancelled, event is deleted from Google Calendar
- Sync happens automatically without admin action
- Errors are logged but don't block booking updates

---

## 🌐 GUEST PAGE FEATURES

### US-062: View Home Page (Guest)
**User Story:** As a Guest, I want to view the museum home page so that I can learn about the museum.

**Acceptance Criteria:**
- Home page displays hero section with call-to-action
- Home page shows museum introduction
- Navigation is smooth and responsive
- Page is visually appealing
- Page loads quickly

---

### US-063: View Gallery on Guest Page (Guest)
**User Story:** As a Guest, I want to view the museum gallery on the guest page so that I can see exhibits.

**Acceptance Criteria:**
- Gallery section displays active gallery items
- Gallery is filterable by category
- Gallery displays images, titles, descriptions
- Gallery is responsive
- Smooth scrolling navigation

---

### US-064: View Contact Information (Guest)
**User Story:** As a Guest, I want to view contact information so that I can reach the museum.

**Acceptance Criteria:**
- Contact section displays museum contact details
- Contact form is available (if implemented)
- Map shows museum location
- Contact information is accurate and up-to-date

---

### US-065: View About Page (Guest)
**User Story:** As a Guest, I want to view the about page so that I can learn more about the museum.

**Acceptance Criteria:**
- About page displays museum information
- About page is accessible from navigation
- Content is informative and well-formatted
- Page is responsive

---

### US-066: Navigate Guest Page (Guest)
**User Story:** As a Guest, I want to navigate the guest page smoothly so that I can access different sections easily.

**Acceptance Criteria:**
- Fixed navbar is always visible
- Smooth scroll navigation between sections
- Navigation links work correctly
- Mobile menu works on small screens
- Navigation is intuitive

---

## 📧 EMAIL NOTIFICATIONS

### US-067: Send Booking Confirmation Email
**User Story:** As a System, I want to send booking confirmation emails so that guests know their booking is confirmed.

**Acceptance Criteria:**
- Email is sent when booking status changes to "confirmed"
- Email includes booking details (name, date, time, visitors, purpose)
- Email includes confirmation code
- Email is formatted professionally
- Email is sent to guest's email address
- Email sending doesn't block booking update

---

### US-068: Send Booking Cancellation Email
**User Story:** As a System, I want to send booking cancellation emails so that guests know their booking is cancelled.

**Acceptance Criteria:**
- Email is sent when booking status changes to "cancelled"
- Email includes booking details
- Email includes confirmation code
- Email is formatted professionally
- Email is sent to guest's email address

---

### US-069: Send Booking Submission Email
**User Story:** As a System, I want to send booking submission emails so that guests receive their confirmation code.

**Acceptance Criteria:**
- Email is sent immediately after booking creation
- Email includes confirmation code prominently
- Email includes booking details (date, time, visitors, purpose)
- Email provides instructions for checking status
- Email is formatted professionally
- Email is sent to guest's email address

---

### US-070: Send Admin Credentials Email
**User Story:** As a System, I want to send admin credentials emails so that new admins can log in.

**Acceptance Criteria:**
- Email is sent when new admin account is created
- Email includes username and password
- Email includes login instructions
- Email includes security notice
- Email is formatted professionally
- Email is sent to admin's email address

---

### US-071: Send Password Reset Code Email
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

### US-072: Send Booking Confirmation SMS
**User Story:** As a System, I want to send booking confirmation SMS so that guests receive mobile notifications.

**Acceptance Criteria:**
- SMS is sent when booking status changes to "confirmed"
- SMS includes booking details (name, date, confirmation code)
- SMS is sent to guest's Philippine mobile number
- SMS sending doesn't block booking update
- SMS uses Semaphore SMS service (if configured)

---

### US-073: Send Booking Cancellation SMS
**User Story:** As a System, I want to send booking cancellation SMS so that guests receive mobile notifications.

**Acceptance Criteria:**
- SMS is sent when booking status changes to "cancelled"
- SMS includes booking details
- SMS is sent to guest's Philippine mobile number
- SMS sending doesn't block booking update

---

## 🔄 REAL-TIME UPDATES

### US-074: Real-Time Booking Updates (Admin)
**User Story:** As an Administrator, I want to receive real-time booking updates so that I can see changes immediately.

**Acceptance Criteria:**
- Admin dashboard receives real-time updates via SSE
- New bookings appear immediately without refresh
- Booking status changes update immediately
- Booking deletions update immediately
- Updates work across multiple browser tabs
- Connection is automatically re-established if lost

---

### US-075: Real-Time Attendance Updates (Admin)
**User Story:** As an Administrator, I want to receive real-time attendance updates so that I can see check-ins immediately.

**Acceptance Criteria:**
- Attendance list receives real-time updates via SSE
- New check-ins appear immediately without refresh
- Check-outs update immediately
- Attendance record updates appear immediately
- Updates work across multiple browser tabs
- Connection is automatically re-established if lost

---

## 🗺️ MAP INTEGRATION

### US-076: View Museum Location on Map (Guest)
**User Story:** As a Guest, I want to view the museum location on a map so that I can find directions.

**Acceptance Criteria:**
- Map displays museum location
- Map is interactive (zoom, pan)
- Map shows address or coordinates
- Map uses OpenStreetMap or Google Maps
- Map is responsive

---

## 🔒 SECURITY FEATURES

### US-077: reCAPTCHA Protection
**User Story:** As a System, I want to protect login forms with reCAPTCHA so that I can prevent bot attacks.

**Acceptance Criteria:**
- reCAPTCHA is displayed on login forms
- reCAPTCHA is verified before login
- Invalid reCAPTCHA shows error message
- reCAPTCHA uses Google reCAPTCHA v2
- reCAPTCHA works on admin and super admin login

---

### US-078: Password Hashing
**User Story:** As a System, I want to hash passwords so that they are stored securely.

**Acceptance Criteria:**
- Passwords are hashed using bcryptjs
- Password hashes are stored in database
- Plain passwords are never stored
- Password comparison uses bcrypt compare
- Password hashing uses salt rounds (10)

---

### US-079: Session Management
**User Story:** As a System, I want to manage user sessions so that access is controlled.

**Acceptance Criteria:**
- Session tokens are stored in localStorage
- Session tokens are checked on protected routes
- Expired sessions redirect to login
- Logout clears session tokens
- Multiple sessions are supported

---

## 📊 SUPER ADMIN DASHBOARD

### US-080: View Super Admin Dashboard
**User Story:** As a Super Administrator, I want to view a dashboard so that I can see system overview.

**Acceptance Criteria:**
- Dashboard displays system statistics
- Dashboard shows admin account counts
- Dashboard provides navigation to management sections
- Dashboard is responsive and user-friendly

---

### US-081: Manage Administrators (Super Admin)
**User Story:** As a Super Administrator, I want to manage administrators so that I can control system access.

**Acceptance Criteria:**
- Super Admin can view list of all administrators
- Super Admin can create, update, activate/deactivate, and delete administrators
- All administrator management features work correctly
- Changes are saved to database
- Success/error messages are displayed

---

### US-082: Manage Report Templates (Super Admin)
**User Story:** As a Super Administrator, I want to manage report templates so that admins can generate reports.

**Acceptance Criteria:**
- Super Admin can view, create, update, and delete report templates
- Template builder allows customization
- Templates are saved to database
- Templates are available to admins
- All template management features work correctly

---

## ✅ SUMMARY

**Total User Stories: 82**

**Categories:**
- Authentication & User Management: 13 stories
- Dashboard & Analytics: 6 stories
- Attendance Management: 7 stories
- Booking Management: 10 stories
- Gallery Management: 5 stories
- Announcements Management: 5 stories
- Reports Generation: 7 stories
- Settings Management: 8 stories
- Guest Page Features: 5 stories
- Email Notifications: 5 stories
- SMS Notifications: 2 stories
- Real-Time Updates: 2 stories
- Map Integration: 1 story
- Security Features: 3 stories
- Super Admin Dashboard: 3 stories

---

## 📝 NOTES FOR TRELLO

1. **Remove "Testing" and "Done" columns** - As requested, these should be removed from your Trello board workflow.

2. **Suggested Trello Columns:**
   - Backlog
   - To Do
   - In Progress
   - Review
   - Completed

3. **Labels to Consider:**
   - Frontend
   - Backend
   - Database
   - Integration
   - Bug Fix
   - Enhancement
   - Security

4. **Priority Levels:**
   - High Priority (Critical features)
   - Medium Priority (Important features)
   - Low Priority (Nice-to-have features)

5. **Sprint Planning:**
   - Group related user stories together
   - Estimate effort for each story
   - Assign stories to team members
   - Set sprint goals

---

**End of Document**

