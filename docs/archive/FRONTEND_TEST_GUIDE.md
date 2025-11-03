# Frontend E2E Testing Guide

This guide provides step-by-step manual testing procedures for the LunchSync frontend application.

**Test Environment:**
- Frontend: http://localhost:3001
- Backend: http://localhost:5000
- Database: PostgreSQL with seed data

**Test Credentials:**
- Admin: `admin@demo.com` / `password123`
- Regular User: `user@demo.com` / `password123`

---

## Test Suite 1: Registration & Login Flow

### TC-FE-001: User Registration
**Steps:**
1. Navigate to http://localhost:3001
2. Click "Register" or "Sign Up" button
3. Fill in the form:
   - Email: `newuser@test.com`
   - Password: `TestPass123!`
   - Name: `Test User`
   - Company Name: `Test Company`
   - Company Domain: `testcompany.com`
   - Company Slug: `test-company`
4. Click "Register" button

**Expected Results:**
- ✅ Form validates all required fields
- ✅ Shows loading state during registration
- ✅ On success: redirects to dashboard
- ✅ JWT token stored in localStorage
- ✅ User info displayed in header/profile

**Edge Cases to Test:**
- [ ] Invalid email format shows error
- [ ] Password too short (<6 chars) shows error
- [ ] Empty company name shows error
- [ ] Duplicate email shows error message
- [ ] Network error shows user-friendly message

---

### TC-FE-002: User Login
**Steps:**
1. Navigate to http://localhost:3001/login
2. Enter credentials:
   - Email: `admin@demo.com`
   - Password: `password123`
3. Click "Login" button

**Expected Results:**
- ✅ Form validates email and password
- ✅ Shows loading state during login
- ✅ Redirects to dashboard on success
- ✅ JWT token stored in localStorage
- ✅ User role (admin/user) determined correctly

**Edge Cases:**
- [ ] Wrong password shows error
- [ ] Non-existent email shows error
- [ ] Empty fields show validation errors
- [ ] Remember me checkbox persists token

---

### TC-FE-003: Protected Routes
**Steps:**
1. Open browser incognito/private window
2. Try to access: http://localhost:3001/dashboard
3. Verify redirect to login page
4. Login with valid credentials
5. Verify redirect back to original page

**Expected Results:**
- ✅ Unauthenticated users redirected to login
- ✅ After login, redirect to originally requested page
- ✅ Authenticated users can access protected pages
- ✅ Logout clears token and redirects to login

---

## Test Suite 2: Dashboard

### TC-FE-004: Dashboard Loading
**Steps:**
1. Login as `admin@demo.com`
2. Wait for dashboard to load
3. Verify all stats and data appear

**Expected Results:**
- ✅ Stats cards display:
  - Total restaurants count
  - Upcoming events count
  - Active orders count
  - Total spent amount
- ✅ Loading states shown while fetching
- ✅ Upcoming events list displays correctly
- ✅ Navigation menu visible with all options

**Edge Cases:**
- [ ] Empty state when no data
- [ ] Error state on API failure
- [ ] Refresh button works

---

## Test Suite 3: Restaurant Management

### TC-FE-005: View Restaurants List
**Steps:**
1. Navigate to Restaurants page
2. Verify list displays all restaurants
3. Check each restaurant card shows:
   - Restaurant name
   - Cuisine type
   - Hours
   - Delivery time

**Expected Results:**
- ✅ All restaurants load correctly (Pizza Palace, Sushi Express, Local Deli)
- ✅ Restaurant cards show correct information
- ✅ Images load or show placeholder
- ✅ Filter/search works if implemented

---

### TC-FE-006: Create Restaurant (Admin Only)
**Steps:**
1. Login as admin: `admin@demo.com`
2. Navigate to Restaurants
3. Click "Add Restaurant" button
4. Fill in form:
   - Name: `Test Restaurant`
   - Cuisine: `Italian`
   - Open Time: `09:00`
   - Close Time: `22:00`
   - Delivery Time: `30-45 minutes`
   - Has Menu: ✓
5. Submit form

**Expected Results:**
- ✅ Form validates all fields
- ✅ Shows loading state during creation
- ✅ Success toast notification appears
- ✅ New restaurant appears in list
- ✅ Redirects to restaurants list or detail page

**Edge Cases:**
- [ ] Non-admin users don't see "Add Restaurant" button
- [ ] Empty fields show validation errors
- [ ] Duplicate restaurant name handled
- [ ] Cancel button works

---

### TC-FE-007: View Restaurant Menu
**Steps:**
1. Navigate to Restaurants
2. Click on "Pizza Palace"
3. View menu items
4. Verify all items display correctly

**Expected Results:**
- ✅ Menu items load (Margherita Pizza, Pepperoni Pizza, Caesar Salad, Garlic Bread)
- ✅ Each item shows: name, description, price, category
- ✅ Available/unavailable status indicated
- ✅ Images load or show placeholder

---

## Test Suite 4: Event Management

### TC-FE-008: Create Lunch Event
**Steps:**
1. Login as admin: `admin@demo.com`
2. Navigate to Events page
3. Click "Create Event" button
4. Fill in form:
   - Title: `Team Lunch Friday`
   - Restaurant: Select "Pizza Palace"
   - Order Deadline: Tomorrow 10:00 AM
   - Delivery Location: `Office Kitchen`
   - Payment Method: `INDIVIDUAL`
   - Description: `Weekly team lunch`
5. Submit form

**Expected Results:**
- ✅ Form validates all required fields
- ✅ Date picker allows only future dates
- ✅ Restaurant dropdown populated
- ✅ Success notification on creation
- ✅ New event appears in events list

**Edge Cases:**
- [ ] Past date shows validation error
- [ ] Missing required fields show errors
- [ ] Cancel button works
- [ ] Duplicate event title allowed

---

### TC-FE-009: View Events List
**Steps:**
1. Navigate to Events page
2. Verify all events display
3. Check filters: All, Open, Closed, My Events
4. Test each filter

**Expected Results:**
- ✅ All company events displayed
- ✅ Each event card shows:
  - Title
  - Restaurant name
  - Date/time
  - Status (Open/Closed)
  - Participant count
- ✅ Filters work correctly
- ✅ Sort options work (if implemented)

---

### TC-FE-010: Join Event
**Steps:**
1. Login as user: `user@demo.com`
2. Navigate to Events
3. Find an OPEN event
4. Click "Join" button
5. Verify joined status

**Expected Results:**
- ✅ Join button changes to "Joined" or "Place Order"
- ✅ Participant count increases
- ✅ Success notification appears
- ✅ User can now place orders for event

**Edge Cases:**
- [ ] Can't join closed events
- [ ] Can't join twice
- [ ] Can leave event before ordering

---

### TC-FE-011: Close Event (Admin Only)
**Steps:**
1. Login as admin
2. Navigate to event detail page
3. Click "Close Event" button
4. Confirm action

**Expected Results:**
- ✅ Confirmation dialog appears
- ✅ Event status changes to CLOSED
- ✅ No new participants can join
- ✅ No new orders can be placed
- ✅ Success notification

---

## Test Suite 5: Order Placement

### TC-FE-012: Place Order with Menu Items
**Steps:**
1. Login as user
2. Navigate to an OPEN event
3. Click "Place Order" button
4. Order modal opens
5. Browse menu items
6. Add items to order:
   - Click "+" to increase quantity
   - Click "-" to decrease quantity
7. Review total
8. Click "Submit Order"

**Expected Results:**
- ✅ Order modal displays restaurant menu
- ✅ Menu items grouped by category
- ✅ Quantity controls work correctly
- ✅ Total price updates in real-time
- ✅ Can't submit empty order
- ✅ Success notification on submission
- ✅ Modal closes after submission
- ✅ Order appears in event orders list

**Edge Cases:**
- [ ] Quantity can't be negative
- [ ] Quantity can't be 0
- [ ] Max quantity limit (if any)
- [ ] Price calculation correct with multiple items

---

### TC-FE-013: Place Custom Order
**Steps:**
1. Open order modal
2. Click "Add Custom Item" or similar
3. Enter custom order details:
   - Description: `Gluten-free pasta with veggies`
   - Price: `15.99`
4. Submit order

**Expected Results:**
- ✅ Custom order field visible
- ✅ Can enter free-text description
- ✅ Can specify price (optional)
- ✅ Order submits successfully
- ✅ Custom order appears in orders list

---

### TC-FE-014: Update/Cancel Order
**Steps:**
1. Place an order
2. Go back to event
3. Click "Edit Order" or "Cancel Order"
4. Make changes or cancel
5. Submit

**Expected Results:**
- ✅ Can edit order before deadline
- ✅ Can cancel order
- ✅ Changes reflect immediately
- ✅ Can't edit after event closes
- ✅ Confirmation dialog for cancel

---

## Test Suite 6: Multi-Tenant Isolation

### TC-FE-015: Data Isolation
**Steps:**
1. Create 2nd company account:
   - Email: `admin2@company2.com`
   - Company: `Company 2`
2. Login with new account
3. Check dashboard
4. Verify no data from Demo Company visible

**Expected Results:**
- ✅ Empty restaurants list (or only public ones)
- ✅ No events from other companies
- ✅ No orders from other companies
- ✅ Can create own restaurants/events
- ✅ Data completely isolated

---

## Test Suite 7: Form Validation

### TC-FE-016: Field Validation
**Test each form with:**
- [ ] Empty required fields → Error messages
- [ ] Invalid email format → Error message
- [ ] Short password (<6 chars) → Error message
- [ ] Invalid dates (past dates for events) → Error message
- [ ] Negative numbers for prices → Error message
- [ ] Special characters in restricted fields → Error message

**Expected Results:**
- ✅ Real-time validation feedback
- ✅ Clear error messages
- ✅ Can't submit invalid forms
- ✅ Errors clear when fixed

---

## Test Suite 8: Responsive Design

### TC-FE-017: Mobile View (320px)
**Steps:**
1. Open DevTools (F12)
2. Toggle device toolbar
3. Set viewport to iPhone SE (320px)
4. Navigate through all pages

**Expected Results:**
- ✅ Navigation collapses to hamburger menu
- ✅ Cards stack vertically
- ✅ Forms remain usable
- ✅ Buttons appropriately sized
- ✅ Text readable (no overflow)
- ✅ Modals fit screen

---

### TC-FE-018: Tablet View (768px)
**Steps:**
1. Set viewport to iPad (768px)
2. Test all pages

**Expected Results:**
- ✅ Layout adapts to medium screens
- ✅ 2-column grids where appropriate
- ✅ Navigation visible or collapsible
- ✅ Touch targets large enough

---

### TC-FE-019: Desktop View (1024px+)
**Steps:**
1. Set viewport to 1920x1080
2. Test all pages

**Expected Results:**
- ✅ Full navigation visible
- ✅ Multi-column layouts
- ✅ Content doesn't stretch too wide
- ✅ Proper use of whitespace

---

## Test Suite 9: Error Handling

### TC-FE-020: Network Errors
**Steps:**
1. Open DevTools → Network tab
2. Enable "Offline" mode
3. Try to load dashboard
4. Try to submit forms

**Expected Results:**
- ✅ User-friendly error messages
- ✅ Retry button available
- ✅ App doesn't crash
- ✅ Loading states timeout gracefully

---

### TC-FE-021: 404 Not Found
**Steps:**
1. Navigate to non-existent page: http://localhost:3001/nonexistent
2. Navigate to deleted resource

**Expected Results:**
- ✅ 404 page displays
- ✅ Back to home button works
- ✅ Navigation still functional

---

### TC-FE-022: Empty States
**Steps:**
1. Create new company with no data
2. Check each page

**Expected Results:**
- ✅ Empty state messages display
- ✅ Call-to-action buttons present
- ✅ Helpful guidance text
- ✅ No broken UI elements

---

## Test Suite 10: Performance

### TC-FE-023: Page Load Time
**Steps:**
1. Open DevTools → Network tab
2. Hard refresh (Ctrl+Shift+R)
3. Check load time

**Expected Results:**
- ✅ Initial load < 3 seconds
- ✅ Subsequent loads < 1 second (cached)
- ✅ Lazy loading for images
- ✅ Code splitting evident

---

### TC-FE-024: API Response Handling
**Steps:**
1. Check Network tab during usage
2. Verify API calls efficient

**Expected Results:**
- ✅ No unnecessary API calls
- ✅ Proper caching headers
- ✅ Optimistic UI updates where appropriate
- ✅ Debounced search inputs

---

## Bugs Found

| ID | Description | Severity | Status | Steps to Reproduce |
|----|-------------|----------|--------|-------------------|
| BUG-001 | Example bug | High | Open | 1. Step 1... |

---

## Test Execution Checklist

**Backend API Tests:**
- [x] Authentication
- [x] Restaurants CRUD
- [x] Events CRUD
- [x] Orders CRUD
- [x] Menu endpoint

**Frontend E2E Tests:**
- [ ] Registration & Login
- [ ] Dashboard
- [ ] Restaurant Management
- [ ] Event Management
- [ ] Order Placement
- [ ] Multi-Tenant Isolation
- [ ] Form Validation
- [ ] Responsive Design
- [ ] Error Handling
- [ ] Performance

**Next Steps:**
1. Execute frontend tests manually following this guide
2. Document any bugs found
3. Fix critical bugs
4. Create automated tests
5. Setup CI/CD pipeline
