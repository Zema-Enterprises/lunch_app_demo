# LunchSync - Comprehensive Testing Plan

## 📋 Testing Overview

This document outlines a complete testing strategy for the LunchSync platform, covering backend APIs, frontend functionality, security, multi-tenancy, and user flows from start to finish.

## 🎯 Testing Objectives

1. Verify all API endpoints work correctly
2. Ensure complete user flows function end-to-end
3. Validate multi-tenant data isolation
4. Confirm security measures are effective
5. Test error handling and edge cases
6. Verify responsive design across devices
7. Validate form validation (client & server)

---

## 1️⃣ Backend API Testing

### 1.1 Authentication Module

#### Test Cases

**TC-AUTH-001: User Registration**
```bash
# Test: Successful company registration
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@newcompany.com",
    "password": "testpass123",
    "name": "Test Admin",
    "companyName": "Test Company",
    "domain": "testco.com",
    "slug": "test-company"
  }'

Expected: 201 Created, returns user + token
```

**TC-AUTH-002: Registration Validation**
- [ ] Empty email → 400 error
- [ ] Invalid email format → 400 error
- [ ] Password < 6 chars → 400 error
- [ ] Duplicate email in same company → 409 error
- [ ] Invalid slug format (spaces, uppercase) → 400 error

**TC-AUTH-003: User Login**
```bash
# Test: Successful login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@demo.com",
    "password": "password123"
  }'

Expected: 200 OK, returns token
```

**TC-AUTH-004: Login Validation**
- [ ] Wrong password → 401 error
- [ ] Non-existent user → 401 error
- [ ] Empty credentials → 400 error

**TC-AUTH-005: Get Current User**
```bash
# Test: Fetch current user
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"

Expected: 200 OK, returns user details
```

**TC-AUTH-006: Token Validation**
- [ ] No token → 401 error
- [ ] Invalid token → 401 error
- [ ] Expired token → 401 error

---

### 1.2 Restaurants Module

#### Test Cases

**TC-REST-001: List Restaurants**
```bash
curl -X GET http://localhost:5000/api/restaurants \
  -H "Authorization: Bearer TOKEN"

Expected: 200 OK, returns array of restaurants (tenant-scoped)
```

- [ ] Returns only user's company restaurants
- [ ] Includes menu items
- [ ] Ordered by createdAt desc

**TC-REST-002: Get Single Restaurant**
```bash
curl -X GET http://localhost:5000/api/restaurants/RESTAURANT_ID \
  -H "Authorization: Bearer TOKEN"

Expected: 200 OK, returns restaurant with menu items
```

- [ ] Invalid ID → 404 error
- [ ] Other company's restaurant → 404 error

**TC-REST-003: Get Menu Items (BUG FIX)**
```bash
curl -X GET http://localhost:5000/api/restaurants/RESTAURANT_ID/menu \
  -H "Authorization: Bearer TOKEN"

Expected: 200 OK, returns array of available menu items
```

- [ ] Returns only available items
- [ ] Grouped by category
- [ ] Invalid restaurant ID → 404 error

**TC-REST-004: Create Restaurant (Admin Only)**
```bash
curl -X POST http://localhost:5000/api/restaurants \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Restaurant",
    "cuisine": "Italian",
    "openTime": "11:00",
    "closeTime": "22:00",
    "deliveryTime": "45 minutes",
    "hasMenu": true
  }'

Expected: 201 Created, returns new restaurant
```

- [ ] Non-admin user → 403 error
- [ ] Missing required fields → 400 error
- [ ] Invalid time format → 400 error

**TC-REST-005: Add Menu Item (Admin Only)**
```bash
curl -X POST http://localhost:5000/api/restaurants/REST_ID/menu-items \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Margherita Pizza",
    "description": "Classic tomato and mozzarella",
    "price": 12.99,
    "category": "Pizza"
  }'

Expected: 201 Created, returns menu item
```

- [ ] Non-admin → 403 error
- [ ] Other company's restaurant → 404 error
- [ ] Negative price → 400 error

---

### 1.3 Events Module

#### Test Cases

**TC-EVENT-001: List Events**
```bash
# All events
curl -X GET http://localhost:5000/api/events \
  -H "Authorization: Bearer TOKEN"

# Filter by status
curl -X GET http://localhost:5000/api/events?status=OPEN \
  -H "Authorization: Bearer TOKEN"

Expected: 200 OK, returns filtered events
```

- [ ] Returns only user's company events
- [ ] Status filter works (OPEN, CLOSED, COMPLETED, CANCELLED)
- [ ] Includes participants and restaurant

**TC-EVENT-002: Create Event (Admin Only)**
```bash
curl -X POST http://localhost:5000/api/events \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Team Lunch",
    "description": "Weekly team lunch",
    "restaurantId": "RESTAURANT_ID",
    "deliveryLocation": "Conference Room A",
    "orderDeadline": "2025-10-02T14:00:00Z",
    "paymentMethod": "EVENT_CREATOR"
  }'

Expected: 201 Created, creator auto-added as participant
```

- [ ] Non-admin → 403 error
- [ ] Invalid restaurant ID → 404 error
- [ ] Past deadline → 400 error
- [ ] Other company's restaurant → 404 error

**TC-EVENT-003: Join Event**
```bash
curl -X POST http://localhost:5000/api/events/EVENT_ID/join \
  -H "Authorization: Bearer TOKEN"

Expected: 200 OK, user added as participant
```

- [ ] Already a participant → 400 error
- [ ] Event CLOSED → 400 error
- [ ] Other company's event → 404 error

**TC-EVENT-004: Close Event (Admin/Creator Only)**
```bash
curl -X POST http://localhost:5000/api/events/EVENT_ID/close \
  -H "Authorization: Bearer TOKEN"

Expected: 200 OK, event status changed to CLOSED
```

- [ ] Non-creator/non-admin → 403 error
- [ ] Already closed → 400 error

---

### 1.4 Orders Module

#### Test Cases

**TC-ORDER-001: Create Menu-Based Order**
```bash
curl -X POST http://localhost:5000/api/events/EVENT_ID/orders \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "menuItemId": "ITEM_ID_1",
        "quantity": 2,
        "price": 12.99
      },
      {
        "menuItemId": "ITEM_ID_2",
        "quantity": 1,
        "price": 8.99
      }
    ],
    "notes": "No onions please",
    "totalAmount": 34.97
  }'

Expected: 201 Created, order with items
```

- [ ] Duplicate order (same user + event) updates existing
- [ ] Invalid menu item → 400 error
- [ ] Event CLOSED → 400 error

**TC-ORDER-002: Create Custom Order**
```bash
curl -X POST http://localhost:5000/api/events/EVENT_ID/orders \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customOrder": "Caesar salad with grilled chicken",
    "notes": "Dressing on the side",
    "totalAmount": 0
  }'

Expected: 201 Created, custom order
```

- [ ] Empty customOrder → 400 error

**TC-ORDER-003: Delete Order**
```bash
curl -X DELETE http://localhost:5000/api/orders/ORDER_ID \
  -H "Authorization: Bearer TOKEN"

Expected: 200 OK, order deleted
```

- [ ] Other user's order → 403 error
- [ ] Event CLOSED → 400 error

---

## 2️⃣ Frontend End-to-End Testing

### 2.1 Registration & Login Flow

**Flow: New Company Registration**

1. Navigate to http://localhost:3001/register
2. Fill in form:
   - Name: "John Admin"
   - Email: "john@newtestco.com"
   - Password: "test123456"
   - Confirm Password: "test123456"
   - Company Name: "New Test Co"
   - Company Domain: "newtestco.com"
   - Company Slug: "new-test-co"
3. Click "Create Account"
4. ✅ Success: Redirected to /dashboard
5. ✅ Token stored in localStorage
6. ✅ User info loaded in header

**Test Cases:**
- [ ] Password mismatch shows error
- [ ] Invalid email shows error
- [ ] Invalid slug (uppercase) shows error
- [ ] Backend error shows toast
- [ ] Loading state during submission

**Flow: User Login**

1. Navigate to http://localhost:3001/login
2. Fill in:
   - Email: "admin@demo.com"
   - Password: "password123"
3. Click "Sign in"
4. ✅ Success: Redirected to /dashboard
5. ✅ Token stored
6. ✅ User name in header

**Test Cases:**
- [ ] Wrong password shows error
- [ ] Empty fields show validation errors
- [ ] Success toast appears
- [ ] Remember login (token persists on refresh)

---

### 2.2 Dashboard

**Test Cases:**

1. **Stats Display**
   - [ ] Active events count is correct
   - [ ] Restaurants count is correct
   - [ ] Numbers update after creating event/restaurant

2. **Upcoming Events List**
   - [ ] Shows only OPEN events
   - [ ] Displays restaurant name
   - [ ] Displays order deadline (formatted)
   - [ ] Displays delivery location
   - [ ] Click navigates to /events

3. **Loading States**
   - [ ] Shows skeleton loader while fetching
   - [ ] Shows empty state if no data

---

### 2.3 Restaurant Management

**Flow: View Restaurants**

1. Navigate to /restaurants
2. ✅ All company restaurants displayed
3. ✅ Each card shows:
   - Restaurant name
   - Cuisine type
   - Open/close times
   - Delivery time
   - "Has Menu" badge or "Custom Orders"
   - Menu items count

**Flow: Create Restaurant (Admin)**

1. Click "Add Restaurant" button (admin only)
2. Fill in form:
   - Name: "Test Pizza Place"
   - Cuisine: "Italian"
   - Open Time: "11:00"
   - Close Time: "22:00"
   - Delivery Time: "30 minutes"
   - Has Menu: checked
   - Image URL: (optional)
3. Click "Create Restaurant"
4. ✅ Success toast appears
5. ✅ Modal closes
6. ✅ New restaurant appears in list
7. ✅ Form resets

**Test Cases:**
- [ ] Non-admin user doesn't see button
- [ ] Required fields validated
- [ ] Time format validated
- [ ] URL format validated
- [ ] Backend error shows toast

---

### 2.4 Event Management

**Flow: Create Event (Admin)**

1. Navigate to /events
2. Click "Create Event"
3. Fill in form:
   - Title: "Friday Team Lunch"
   - Description: "Weekly gathering"
   - Restaurant: Select from dropdown
   - Delivery Location: "Office Lobby"
   - Order Deadline: Select future datetime
   - Payment Method: "Event Creator Pays"
4. Click "Create Event"
5. ✅ Success toast
6. ✅ Event appears in list
7. ✅ Creator is auto-participant

**Flow: Join Event**

1. Login as regular user
2. Go to /events
3. Find OPEN event
4. Click "Join Event"
5. ✅ Success toast
6. ✅ Button changes to "Place Order"
7. ✅ Participant count increases

**Flow: Close Event (Admin/Creator)**

1. Login as event creator
2. Go to /events
3. Find OPEN event
4. Click "Close Event"
5. ✅ Success toast
6. ✅ Status badge changes to "CLOSED"
7. ✅ "Join" and "Place Order" buttons disappear

**Test Cases:**
- [ ] Filter by status (OPEN/CLOSED/ALL) works
- [ ] Event cards show all details
- [ ] Non-admin can't create events
- [ ] Can't join closed events
- [ ] Non-creator can't close events
- [ ] Empty state when no events

---

### 2.5 Order Placement

**Flow: Menu-Based Order**

1. Login and join an OPEN event
2. Go to /events
3. Click "Place Order" on joined event
4. ✅ Modal opens with restaurant menu
5. ✅ Menu items grouped by category
6. Browse menu:
   - See item names, descriptions, prices
7. Add items:
   - Click "+" to add Margherita Pizza
   - Click "+" again to increase quantity to 2
   - Click "+" to add Caesar Salad
8. ✅ Order summary shows:
   - Margherita Pizza x2 = $25.98
   - Caesar Salad x1 = $8.99
   - Total = $34.97
9. Adjust quantity:
   - Click "-" to reduce pizza to 1
   - ✅ Total recalculates to $21.98
10. Add special instructions: "No onions"
11. Click "Place Order"
12. ✅ Success toast
13. ✅ Modal closes

**Flow: Custom Order**

1. Join event with no-menu restaurant
2. Click "Place Order"
3. ✅ Text area displayed instead of menu
4. Type custom order: "Chicken Caesar wrap with fries"
5. Add notes: "Extra dressing"
6. Click "Place Order"
7. ✅ Success toast
8. ✅ Modal closes

**Test Cases:**
- [ ] Menu loads correctly from API
- [ ] Can't add items to custom order restaurant
- [ ] Quantity controls work (no negative numbers)
- [ ] Total calculates correctly
- [ ] Can't submit empty order
- [ ] Can update existing order
- [ ] Participants list displays
- [ ] Modal closes properly

---

## 3️⃣ Multi-Tenant Isolation Testing

### Test Scenario: Two Companies

**Setup:**
1. Create Company A (admin1@companya.com)
2. Create Company B (admin2@companyb.com)

**Test Cases:**

**TC-MT-001: Restaurant Isolation**
1. Admin A creates Restaurant A1
2. Admin B creates Restaurant B1
3. Login as Admin A
4. ✅ GET /api/restaurants returns only A1
5. ✅ Try to access B1 by ID → 404
6. Login as Admin B
7. ✅ GET /api/restaurants returns only B1

**TC-MT-002: Event Isolation**
1. Admin A creates Event A1 with Restaurant A1
2. Admin B creates Event B1 with Restaurant B1
3. Login as User A
4. ✅ GET /api/events returns only A1
5. ✅ Try to join B1 → 404
6. Login as User B
7. ✅ GET /api/events returns only B1

**TC-MT-003: Order Isolation**
1. User A places order in Event A1
2. User B places order in Event B1
3. Admin A views Event A1 orders
4. ✅ Only sees User A's order
5. Admin B views Event B1 orders
6. ✅ Only sees User B's order

**TC-MT-004: Database Level**
```sql
-- Verify companyId on all tables
SELECT * FROM "Restaurant" WHERE "companyId" != 'COMPANY_A_ID';
-- Should not return any of Company A's restaurants

SELECT * FROM "Event" WHERE "companyId" != 'COMPANY_B_ID';
-- Should not return any of Company B's events
```

---

## 4️⃣ Security Testing

### 4.1 SQL Injection

**Test Cases:**
- [ ] Login with email: `admin@demo.com' OR '1'='1`
- [ ] Create restaurant with name: `'; DROP TABLE Restaurant;--`
- [ ] Search with: `%' OR 1=1--`

Expected: All should be safely handled by Prisma ORM

### 4.2 XSS Prevention

**Test Cases:**
- [ ] Create event with title: `<script>alert('XSS')</script>`
- [ ] Add restaurant with description: `<img src=x onerror=alert('XSS')>`
- [ ] Order notes: `<iframe src="evil.com"></iframe>`

Expected: HTML escaped or sanitized

### 4.3 Authentication & Authorization

**Test Cases:**
- [ ] Access /api/restaurants without token → 401
- [ ] Use expired token → 401
- [ ] Use invalid token → 401
- [ ] Regular user tries to create restaurant → 403
- [ ] Regular user tries to close event they didn't create → 403
- [ ] User tries to access other company's data → 404

### 4.4 Password Security

**Test Cases:**
- [ ] Passwords are hashed in database (not plain text)
- [ ] Password field not returned in API responses
- [ ] Password requirements enforced (min length)

---

## 5️⃣ Form Validation Testing

### Registration Form

**Test Cases:**
- [ ] Empty email → "Email is required"
- [ ] Invalid email → "Invalid email address"
- [ ] Password < 6 chars → "Password must be at least 6 characters"
- [ ] Passwords don't match → "Passwords don't match"
- [ ] Empty company name → "Company name is required"
- [ ] Invalid slug (spaces) → "Only lowercase letters, numbers, and hyphens allowed"
- [ ] Submit button disabled while loading

### Login Form

**Test Cases:**
- [ ] Empty email → validation error
- [ ] Invalid email → validation error
- [ ] Empty password → validation error

### Restaurant Form

**Test Cases:**
- [ ] Empty name → error
- [ ] Invalid time format (e.g., "25:00") → error
- [ ] Invalid URL → error

### Event Form

**Test Cases:**
- [ ] Empty title → error
- [ ] No restaurant selected → error
- [ ] Empty delivery location → error
- [ ] No deadline selected → error

---

## 6️⃣ Responsive Design Testing

### Mobile (320px - 640px)

**Test Cases:**
- [ ] Login/Register forms readable
- [ ] Dashboard cards stack vertically
- [ ] Navigation collapses to hamburger menu
- [ ] Event cards full width
- [ ] Restaurant cards full width
- [ ] Order modal scrollable
- [ ] Buttons accessible
- [ ] Forms don't overflow

### Tablet (640px - 1024px)

**Test Cases:**
- [ ] 2-column grid for cards
- [ ] Sidebar visible or collapsible
- [ ] Forms properly sized
- [ ] Modals centered

### Desktop (1024px+)

**Test Cases:**
- [ ] 3-column grid for cards
- [ ] Sidebar always visible
- [ ] Proper spacing
- [ ] Max width constraints

---

## 7️⃣ Error Handling & Edge Cases

### Network Errors

**Test Cases:**
- [ ] Disconnect network → show error toast
- [ ] Slow API (5s+) → show loading state
- [ ] 500 server error → show error toast
- [ ] 404 not found → show error message

### Empty States

**Test Cases:**
- [ ] No restaurants → show empty state with create button
- [ ] No events → show empty state with create button
- [ ] No menu items → show "Custom orders only"
- [ ] No participants → show "Be the first to join"

### Edge Cases

**Test Cases:**
- [ ] Very long restaurant name → truncate or wrap
- [ ] Special characters in names → handle correctly
- [ ] Large number of menu items → scroll properly
- [ ] Many participants → list scrollable
- [ ] Order with 100 items → handle correctly

---

## 8️⃣ Performance Testing

### Load Testing

**Test Cases:**
- [ ] 10 concurrent users creating events
- [ ] 50 concurrent users viewing dashboard
- [ ] 100 menu items in one restaurant
- [ ] 1000 orders in one event
- [ ] API response time < 200ms (p95)

### Database Performance

**Test Cases:**
- [ ] Queries use proper indexes
- [ ] N+1 query problems identified
- [ ] Large dataset pagination works

---

## 9️⃣ Testing Execution Plan

### Phase 1: Backend API (Days 1-2)
1. Test all authentication endpoints
2. Test all restaurant endpoints
3. Test all event endpoints
4. Test all order endpoints
5. Document any bugs found

### Phase 2: Frontend E2E (Days 3-4)
1. Test registration and login
2. Test dashboard
3. Test restaurant management
4. Test event management
5. Test order placement

### Phase 3: Integration (Day 5)
1. Test complete user flows
2. Test multi-tenant isolation
3. Test security
4. Test form validation

### Phase 4: Polish (Day 6)
1. Test responsive design
2. Test error handling
3. Performance testing
4. Fix all identified bugs

### Phase 5: Automated Tests (Day 7)
1. Write Jest tests for backend
2. Write Vitest tests for frontend
3. Setup CI/CD pipeline

---

## 🐛 Bug Tracking Template

```markdown
## Bug #XXX: [Short Description]

**Severity**: Critical / High / Medium / Low
**Status**: Open / In Progress / Fixed / Closed

**Description**:
[Detailed description of the bug]

**Steps to Reproduce**:
1. 
2. 
3. 

**Expected Behavior**:
[What should happen]

**Actual Behavior**:
[What actually happens]

**Environment**:
- Browser: 
- OS: 
- Backend version: 
- Frontend version: 

**Screenshots/Logs**:
[If applicable]

**Fix**:
[Description of the fix applied]
```

---

## ✅ Testing Completion Checklist

- [ ] All backend API endpoints tested
- [ ] All frontend pages tested
- [ ] All user flows completed successfully
- [ ] Multi-tenant isolation verified
- [ ] Security measures confirmed
- [ ] Form validation working
- [ ] Responsive design verified
- [ ] Error handling tested
- [ ] Performance acceptable
- [ ] All critical bugs fixed
- [ ] Documentation updated
- [ ] Automated tests written

---

## 📊 Success Metrics

- ✅ 0 critical bugs
- ✅ < 3 high severity bugs
- ✅ 95%+ test coverage
- ✅ All user flows complete successfully
- ✅ API response time < 200ms
- ✅ Zero data leakage between tenants

**Testing Start Date**: [To be filled]
**Testing End Date**: [To be filled]
**Total Bugs Found**: [To be filled]
**Bugs Fixed**: [To be filled]
