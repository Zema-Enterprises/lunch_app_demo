# LunchSync - Testing Guide

## Table of Contents

1. [Manual Testing Checklist](#manual-testing-checklist)
2. [User Flows](#user-flows)
3. [API Testing](#api-testing)
4. [Multi-Tenancy Testing](#multi-tenancy-testing)
5. [Security Testing](#security-testing)

## Manual Testing Checklist

### Authentication

- [ ] Register new company with admin user
  - Email validation works
  - Password requirements enforced (min 6 chars)
  - Company slug format validated
  - Success toast appears
  - Redirects to dashboard
  
- [ ] Login with existing credentials
  - Admin user (admin@demo.com / password123)
  - Regular user (user@demo.com / password123)
  - Invalid credentials show error
  - JWT token stored in localStorage
  - Redirects to dashboard

- [ ] Logout functionality
  - Token removed from localStorage
  - Redirects to login
  - Protected routes inaccessible

### Dashboard

- [ ] Stats display correctly
  - Active events count
  - Total restaurants count
  
- [ ] Upcoming events list
  - Shows events with OPEN status
  - Displays restaurant name
  - Shows order deadline
  - Shows delivery location
  - Click navigates to events page

### Restaurant Management

- [ ] View restaurants list
  - All company restaurants displayed
  - Shows cuisine type
  - Shows operating hours
  - Shows delivery time
  - Badge indicates hasMenu status

- [ ] Create restaurant (Admin only)
  - Form validation works
  - Required fields enforced
  - Time format validated (HH:MM)
  - URL validation for image
  - Success toast on creation
  - New restaurant appears in list

- [ ] Menu items display
  - Shows menu item count if hasMenu=true
  - No menu badge if hasMenu=false

### Events Management

- [ ] View events page
  - Filter by status (OPEN, CLOSED, ALL)
  - Events display with all details
  - Participant count shown
  - Payment method displayed

- [ ] Create event (Admin only)
  - Select restaurant from dropdown
  - Set delivery location
  - Pick order deadline (datetime)
  - Choose payment method
  - Success toast on creation
  - Creator auto-added as participant

- [ ] Join event
  - "Join Event" button for non-participants
  - Success toast on join
  - Participant count updates
  - Button changes to "Place Order"

- [ ] Close event (Admin/Creator only)
  - Only visible for OPEN events
  - Success toast on close
  - Status changes to CLOSED
  - Orders no longer accepted

### Order Flow

- [ ] Menu-based ordering
  - Menu items grouped by category
  - Add to order functionality
  - Quantity controls (+/-)
  - Real-time total calculation
  - Special instructions field
  - Success toast on order placement

- [ ] Custom ordering (no-menu restaurants)
  - Text area for custom order
  - Special instructions field
  - Submit works correctly
  - Success toast appears

- [ ] Order modal
  - Displays event details
  - Shows restaurant name
  - Participants list visible
  - Close modal works

### Notifications

- [ ] Success toasts appear for:
  - Restaurant creation
  - Event creation
  - Joining event
  - Closing event
  - Placing order

- [ ] Error toasts appear for:
  - Failed API calls
  - Validation errors
  - Server errors

- [ ] Toast auto-dismiss (5 seconds)
- [ ] Toast manual dismiss (X button)

### Form Validation (React Hook Form + Zod)

- [ ] Login form
  - Email format validated
  - Password min length enforced
  - Error messages display
  
- [ ] Register form
  - All fields required
  - Email format validated
  - Password confirmation works
  - Company slug format enforced
  - Inline error messages

### Responsive Design

- [ ] Mobile view (< 640px)
  - Navigation collapses
  - Cards stack vertically
  - Forms are readable
  - Buttons accessible

- [ ] Tablet view (640px - 1024px)
  - 2-column grids
  - Proper spacing
  - Readable text

- [ ] Desktop view (> 1024px)
  - 3-column grids
  - Full layout visible
  - Optimal spacing

## User Flows

### Flow 1: New Admin Registration

1. Navigate to `/register`
2. Fill in personal details (name, email, password, confirm password)
3. Fill in company details (name, domain, slug)
4. Click "Create Account"
5. System creates company and admin user
6. Redirected to dashboard
7. See welcome message and empty state

### Flow 2: Admin Creates Team Lunch Event

1. Login as admin
2. Navigate to Events page
3. Click "Create Event"
4. Select restaurant
5. Set delivery location and deadline
6. Choose payment method
7. Submit form
8. Event appears in events list
9. Admin is auto-participant

### Flow 3: User Joins Event and Places Order

1. Login as regular user
2. Go to Events page
3. See available OPEN events
4. Click "Join Event"
5. See "Place Order" button appear
6. Click "Place Order"
7. If menu restaurant:
   - Browse menu by category
   - Add items to order
   - Adjust quantities
   - Add special instructions
8. If no-menu restaurant:
   - Type custom order
   - Add special instructions
9. Submit order
10. See success toast
11. Modal closes

### Flow 4: Admin Closes Event

1. Login as admin (or event creator)
2. Go to Events page
3. Find OPEN event with orders
4. Click "Close Event"
5. Event status changes to CLOSED
6. Orders locked
7. No more participants can join

## API Testing

### Using cURL

#### Authentication

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@company.com",
    "password": "password123",
    "name": "Test User",
    "companyName": "Test Company",
    "domain": "test.com",
    "slug": "test-company"
  }'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@demo.com",
    "password": "password123"
  }'

# Get current user (replace TOKEN)
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer TOKEN"
```

#### Restaurants

```bash
# Get all restaurants (replace TOKEN)
curl -X GET http://localhost:5000/api/restaurants \
  -H "Authorization: Bearer TOKEN"

# Create restaurant (admin only)
curl -X POST http://localhost:5000/api/restaurants \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Restaurant",
    "cuisine": "Italian",
    "openTime": "11:00",
    "closeTime": "22:00",
    "deliveryTime": "30 minutes",
    "hasMenu": true
  }'
```

#### Events

```bash
# Get all events
curl -X GET http://localhost:5000/api/events \
  -H "Authorization: Bearer TOKEN"

# Create event (admin only)
curl -X POST http://localhost:5000/api/events \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Team Lunch",
    "restaurantId": "RESTAURANT_ID",
    "deliveryLocation": "Conference Room A",
    "orderDeadline": "2024-10-02T14:00:00Z",
    "paymentMethod": "EVENT_CREATOR"
  }'

# Join event
curl -X POST http://localhost:5000/api/events/EVENT_ID/join \
  -H "Authorization: Bearer TOKEN"
```

### Using Postman

1. Import the following as a collection
2. Set `{{baseUrl}}` to `http://localhost:5000/api`
3. Set `{{token}}` to your JWT token

Collection available in `/backend/postman/LunchSync.postman_collection.json` (if created)

## Multi-Tenancy Testing

### Test Isolation

1. **Create Two Companies**:
   - Register Company A with admin1@companya.com
   - Register Company B with admin2@companyb.com

2. **Create Data in Each**:
   - Admin A creates Restaurant A1
   - Admin B creates Restaurant B1
   - Admin A creates Event A1
   - Admin B creates Event B1

3. **Verify Isolation**:
   - Login as Admin A
   - Should only see Restaurant A1, Event A1
   - Should NOT see Company B's data

4. **API Level Testing**:
   - Get Admin A's token
   - Try to access Company B's restaurant by ID
   - Should get 404 or 403 error

### Test Cases

| Test Case | Expected Result |
|-----------|-----------------|
| User A views restaurants | Only sees Company A restaurants |
| User A views events | Only sees Company A events |
| User A tries to join Company B event | 404 Not Found or 403 Forbidden |
| User A tries to order from Company B restaurant | 404 Not Found |
| Admin A creates restaurant | Restaurant belongs to Company A |
| User B searches for Company A data | No results |

## Security Testing

### Authentication & Authorization

- [ ] Routes protected without JWT token
- [ ] Expired JWT tokens rejected
- [ ] Invalid JWT tokens rejected
- [ ] Admin-only routes block regular users
- [ ] User cannot access other company's data

### SQL Injection Prevention

Test with malicious inputs:
```
email: admin@demo.com' OR '1'='1
password: ' OR '1'='1' --
```
Expected: Validation error or safe handling

### XSS Prevention

Test with script injection:
```html
<script>alert('XSS')</script>
```
Expected: Input sanitized or escaped

### CSRF Protection

- [ ] API requires Authorization header
- [ ] Stateless JWT implementation
- [ ] No cookie-based sessions

## Performance Testing

### Load Testing with Artillery

```bash
npm install -g artillery

# Create artillery.yml
artillery run artillery.yml
```

Example `artillery.yml`:
```yaml
config:
  target: 'http://localhost:5000'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "API Load Test"
    flow:
      - post:
          url: "/api/auth/login"
          json:
            email: "admin@demo.com"
            password: "password123"
      - get:
          url: "/api/restaurants"
```

### Metrics to Monitor

- Response time < 200ms (p95)
- Error rate < 1%
- Throughput > 100 req/s

## Database Testing

### Verify Constraints

```sql
-- Test unique constraint on user email per company
INSERT INTO "User" (email, password, name, role, "companyId") 
VALUES ('admin@demo.com', 'hash', 'Duplicate', 'USER', 'COMPANY_ID');
-- Expected: Error

-- Test cascade delete
DELETE FROM "Company" WHERE id = 'COMPANY_ID';
-- Expected: All related records deleted
```

### Data Integrity

- [ ] Foreign key constraints work
- [ ] Unique constraints enforced
- [ ] Default values applied
- [ ] Timestamps auto-update

## Automated Testing (Future)

### Backend (Jest + Supertest)

```bash
cd backend
npm install --save-dev jest supertest @types/jest
npm test
```

### Frontend (Vitest + React Testing Library)

```bash
cd frontend
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom
npm test
```

### E2E Testing (Playwright)

```bash
npm install --save-dev @playwright/test
npx playwright test
```

## Bug Reporting Template

```markdown
**Bug Title**: Brief description

**Environment**: Development/Production

**Steps to Reproduce**:
1. 
2. 
3. 

**Expected Behavior**: 

**Actual Behavior**: 

**Screenshots**: (if applicable)

**Browser/Device**: 

**Additional Context**: 
```

## Test Credentials

```
Admin Account:
Email: admin@demo.com
Password: password123

Regular User:
Email: user@demo.com
Password: password123

Company: Demo Company
```

## Testing Completion Checklist

- [ ] All authentication flows tested
- [ ] All CRUD operations verified
- [ ] Multi-tenancy isolation confirmed
- [ ] Form validation working
- [ ] Responsive design validated
- [ ] Error handling tested
- [ ] Success notifications working
- [ ] API security verified
- [ ] Database constraints tested
- [ ] Performance acceptable
