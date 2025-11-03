# Phase 1.3: Order Management API Adjustments
> **Review Update (2025-10-07):** Verified during Phase 4.4 accessibility + integration pass.

**Date**: January 2025  
**Phase**: Phase 1.3 - Order Management Flow Tests  
**Status**: ✅ COMPLETE  
**Test Results**: 31/31 tests passing

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Approach](#approach)
3. [API Changes](#api-changes)
4. [Validation Enhancements](#validation-enhancements)
5. [Business Logic Fixes](#business-logic-fixes)
6. [Test Coverage](#test-coverage)
7. [Files Modified](#files-modified)
8. [Verification](#verification)

---

## Executive Summary

Following the Test-Driven Development (TDD) approach established in Phase 1.1 and 1.2, we:

1. **Created 31 comprehensive integration tests** for order management (988 lines)
2. **Identified 6 API functions** requiring updates through test failures
3. **Standardized responses** to match established patterns ({ data: ... })
4. **Enhanced validation** to prevent 500 errors (menu item existence check)
5. **Fixed business logic** for proper error categorization (400 vs 403)

**Result**: All 31 tests passing with consistent API behavior across all endpoints.

---

## Approach

### TDD Workflow
```
1. Write comprehensive tests first (31 test cases)
   ├─ Order creation, retrieval, updates, deletion
   ├─ Payment confirmation
   ├─ Order-event relationships
   └─ Company isolation & RBAC

2. Run tests to identify gaps
   ├─ Response format inconsistencies
   ├─ Missing error messages
   └─ Validation gaps

3. Adjust API to match test requirements
   ├─ Wrap all responses in { data: ... }
   ├─ Standardize error format to { message: ... }
   └─ Add missing validations

4. Verify all tests pass (100% pass rate)
```

### API Standards Applied

**Success Responses**:
```typescript
// BEFORE
res.json(orders)
res.status(201).json(order)

// AFTER
res.json({ data: orders })
res.status(201).json({ data: order })
```

**Error Responses**:
```typescript
// BEFORE
res.status(500).json({ error: 'Failed to fetch orders' })
res.status(404).json({ error: 'Order not found' })

// AFTER
res.status(500).json({ message: 'Failed to fetch orders' })
res.status(404).json({ message: 'Order not found' })
```

---

## API Changes

### 1. Get Event Orders

**File**: `backend/src/modules/orders/orders.controller.ts`  
**Function**: `getEventOrders()`  
**Changes**: 
- Wrapped response in `{ data: orders }`
- Changed all error responses from `{ error }` to `{ message }`

**Before**:
```typescript
export const getEventOrders = async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const userId = req.user!.id;
    const companyId = req.user!.companyId;

    // Verify event exists and belongs to user's company
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        companyId,
      },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Get all orders for this event
    const orders = await prisma.order.findMany({
      where: {
        eventId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        event: {
          select: {
            id: true,
            name: true,
            deadline: true,
          },
        },
        orderItems: {
          include: {
            menuItem: true,
          },
        },
      },
    });

    return res.json(orders);
  } catch (error) {
    console.error('Error fetching event orders:', error);
    return res.status(500).json({ error: 'Failed to fetch orders' });
  }
};
```

**After**:
```typescript
export const getEventOrders = async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const userId = req.user!.id;
    const companyId = req.user!.companyId;

    // Verify event exists and belongs to user's company
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        companyId,
      },
    });

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Get all orders for this event
    const orders = await prisma.order.findMany({
      where: {
        eventId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        event: {
          select: {
            id: true,
            name: true,
            deadline: true,
          },
        },
        orderItems: {
          include: {
            menuItem: true,
          },
        },
      },
    });

    return res.json({ data: orders });
  } catch (error) {
    console.error('Error fetching event orders:', error);
    return res.status(500).json({ message: 'Failed to fetch orders' });
  }
};
```

**Rationale**: 
- Consistency with auth and events API standards
- Frontend expects `{ data: ... }` wrapper for all success responses
- Error field standardized to `message` for uniform error handling

---

### 2. Create or Update Order

**File**: `backend/src/modules/orders/orders.controller.ts`  
**Function**: `createOrUpdateOrder()`  
**Changes**:
- Added menu item existence validation (prevents 500 errors)
- Wrapped response in `{ data: order }`
- Changed all error responses from `{ error }` to `{ message }`

**Before** (partial):
```typescript
export const createOrUpdateOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const userId = req.user!.id;
    const companyId = req.user!.companyId;
    const { orderItems, specialInstructions } = req.body;

    // Verify event exists and belongs to user's company
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        companyId,
      },
      include: {
        participants: {
          where: {
            userId,
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // User must be a participant
    if (event.participants.length === 0) {
      return res.status(403).json({ error: 'Must join event before ordering' });
    }

    // Check if event is still open
    if (event.status !== 'OPEN') {
      return res.status(400).json({ error: 'Event is no longer accepting orders' });
    }

    // Check if deadline has passed
    if (event.deadline && new Date() > event.deadline) {
      return res.status(400).json({ error: 'Event deadline has passed' });
    }

    // ... rest of function
    
    return res.status(existingOrder ? 200 : 201).json(order);
  } catch (error) {
    console.error('Error creating/updating order:', error);
    return res.status(500).json({ error: 'Failed to process order' });
  }
};
```

**After** (showing new validation):
```typescript
export const createOrUpdateOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const userId = req.user!.id;
    const companyId = req.user!.companyId;
    const { orderItems, specialInstructions } = req.body;

    // Verify event exists and belongs to user's company
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        companyId,
      },
      include: {
        participants: {
          where: {
            userId,
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // User must be a participant
    if (event.participants.length === 0) {
      return res.status(403).json({ message: 'Must join event before ordering' });
    }

    // Check if event is still open
    if (event.status !== 'OPEN') {
      return res.status(400).json({ message: 'Event is no longer accepting orders' });
    }

    // Check if deadline has passed
    if (event.deadline && new Date() > event.deadline) {
      return res.status(400).json({ message: 'Event deadline has passed' });
    }

    // NEW: Validate menu items if provided
    if (orderItems && orderItems.length > 0) {
      for (const item of orderItems) {
        const menuItem = await prisma.menuItem.findUnique({
          where: { id: item.menuItemId },
        });
        
        if (!menuItem) {
          return res.status(404).json({ 
            message: `Menu item not found: ${item.menuItemId}` 
          });
        }
      }
    }

    // ... rest of function
    
    return res.status(existingOrder ? 200 : 201).json({ data: order });
  } catch (error) {
    console.error('Error creating/updating order:', error);
    return res.status(500).json({ message: 'Failed to process order' });
  }
};
```

**Rationale**:
- **Menu item validation**: Prevents 500 Internal Server Error when creating orders with non-existent menu items
- Returns proper 404 with descriptive message before attempting database operations
- Maintains response format consistency with other endpoints

---

### 3. Delete Order

**File**: `backend/src/modules/orders/orders.controller.ts`  
**Function**: `deleteOrder()`  
**Changes**: Changed all error responses from `{ error }` to `{ message }`

**Before**:
```typescript
export const deleteOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const userId = req.user!.id;
    const companyId = req.user!.companyId;

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
        event: {
          companyId,
        },
      },
      include: {
        event: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.event.status === 'CLOSED') {
      return res.status(400).json({ error: 'Cannot delete order from closed event' });
    }

    await prisma.order.delete({
      where: { id: orderId },
    });

    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting order:', error);
    return res.status(500).json({ error: 'Failed to delete order' });
  }
};
```

**After**:
```typescript
export const deleteOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const userId = req.user!.id;
    const companyId = req.user!.companyId;

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
        event: {
          companyId,
        },
      },
      include: {
        event: true,
      },
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.event.status === 'CLOSED') {
      return res.status(400).json({ message: 'Cannot delete order from closed event' });
    }

    await prisma.order.delete({
      where: { id: orderId },
    });

    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting order:', error);
    return res.status(500).json({ message: 'Failed to delete order' });
  }
};
```

**Rationale**: Error message standardization for consistent frontend error handling.

---

### 4. Confirm Payment

**File**: `backend/src/modules/orders/orders.controller.ts`  
**Function**: `confirmPayment()`  
**Changes**:
- Wrapped response in `{ data: updated }`
- Changed all error responses from `{ error }` to `{ message }`

**Before**:
```typescript
export const confirmPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const userId = req.user!.id;
    const companyId = req.user!.companyId;

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
        event: {
          companyId,
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { isPaid: true },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        event: {
          select: {
            id: true,
            name: true,
          },
        },
        orderItems: {
          include: {
            menuItem: true,
          },
        },
      },
    });

    return res.json(updated);
  } catch (error) {
    console.error('Error confirming payment:', error);
    return res.status(500).json({ error: 'Failed to confirm payment' });
  }
};
```

**After**:
```typescript
export const confirmPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const userId = req.user!.id;
    const companyId = req.user!.companyId;

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
        event: {
          companyId,
        },
      },
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { isPaid: true },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        event: {
          select: {
            id: true,
            name: true,
          },
        },
        orderItems: {
          include: {
            menuItem: true,
          },
        },
      },
    });

    return res.json({ data: updated });
  } catch (error) {
    console.error('Error confirming payment:', error);
    return res.status(500).json({ message: 'Failed to confirm payment' });
  }
};
```

**Rationale**: Consistency with all other endpoints for response wrapping and error messages.

---

### 5. Get User Orders

**File**: `backend/src/modules/orders/orders.controller.ts`  
**Function**: `getUserOrders()`  
**Changes**:
- Wrapped response in `{ data: orders }`
- Changed all error responses from `{ error }` to `{ message }`

**Before**:
```typescript
export const getUserOrders = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const companyId = req.user!.companyId;

    const orders = await prisma.order.findMany({
      where: {
        userId,
        event: {
          companyId,
        },
      },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            deadline: true,
            restaurant: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        orderItems: {
          include: {
            menuItem: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.json(orders);
  } catch (error) {
    console.error('Error fetching user orders:', error);
    return res.status(500).json({ error: 'Failed to fetch orders' });
  }
};
```

**After**:
```typescript
export const getUserOrders = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const companyId = req.user!.companyId;

    const orders = await prisma.order.findMany({
      where: {
        userId,
        event: {
          companyId,
        },
      },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            deadline: true,
            restaurant: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        orderItems: {
          include: {
            menuItem: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.json({ data: orders });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    return res.status(500).json({ message: 'Failed to fetch orders' });
  }
};
```

**Rationale**: Final function update to complete response format standardization.

---

### 6. Delete Event (Business Logic Fix)

**File**: `backend/src/modules/events/events.controller.ts`  
**Function**: `deleteEvent()`  
**Changes**: Changed status code from 403 to 400 for order count validation

**Before**:
```typescript
// Prevent deletion if event has orders
if (existing._count.orders > 0) {
  return res.status(403).json({ 
    message: 'Cannot delete event with existing orders' 
  });
}
```

**After**:
```typescript
// Prevent deletion if event has orders
if (existing._count.orders > 0) {
  return res.status(400).json({ 
    message: 'Cannot delete event with existing orders' 
  });
}
```

**Rationale**:
- **400 (Bad Request)**: Used for business rule violations and validation errors
- **403 (Forbidden)**: Used for authorization/permission issues
- Having orders is a **validation/business rule** issue, not a permission issue
- The user has permission to delete (they created it), but the current state prevents it
- Matches test expectations and proper HTTP semantics

---

## Validation Enhancements

### Menu Item Existence Check

**Problem**: Creating orders with non-existent menu items resulted in 500 Internal Server Error due to foreign key constraint violations.

**Solution**: Added validation loop before processing order items:

```typescript
// Validate menu items if provided
if (orderItems && orderItems.length > 0) {
  for (const item of orderItems) {
    const menuItem = await prisma.menuItem.findUnique({
      where: { id: item.menuItemId },
    });
    
    if (!menuItem) {
      return res.status(404).json({ 
        message: `Menu item not found: ${item.menuItemId}` 
      });
    }
  }
}
```

**Impact**:
- Changes 500 Internal Server Error → 404 Not Found
- Provides descriptive error message with the specific menu item ID
- Prevents database constraint violations
- Improves API user experience

**Test Coverage**:
```typescript
it('should reject order with invalid menu items', async () => {
  const response = await authenticatedRequest(app, company1Employee.token)
    .post(`/api/events/${event1.id}/orders`)
    .send({
      orderItems: [
        {
          menuItemId: 'invalid-menu-item-id',
          quantity: 1,
          price: 10.00,
        },
      ],
    })
    .expect(404);

  expect(response.body.message).toContain('Menu item not found');
});
```

---

## Business Logic Fixes

### Event Deletion Status Code

**Issue**: Deleting an event with existing orders returned 403 Forbidden

**Analysis**:
- User **has permission** to delete the event (they created it)
- The **current state** (having orders) prevents deletion
- This is a **business rule/validation** issue, not an **authorization** issue

**Fix**: Changed status code from 403 → 400

**HTTP Status Code Semantics**:
- `400 Bad Request`: Client error due to invalid request or business rule violation
- `403 Forbidden`: Client lacks proper authorization/permissions
- `404 Not Found`: Resource doesn't exist

**Examples**:
```typescript
// Permission issues → 403
if (event.creatorId !== userId) {
  return res.status(403).json({ message: 'Only creator can delete event' });
}

// Business rule violations → 400
if (event._count.orders > 0) {
  return res.status(400).json({ message: 'Cannot delete event with orders' });
}

// Resource not found → 404
if (!event) {
  return res.status(404).json({ message: 'Event not found' });
}
```

---

## Test Coverage

### Test File
**Path**: `backend/src/__tests__/integration/orders.integration.test.ts`  
**Lines**: 988  
**Test Suites**: 10  
**Test Cases**: 31  
**Status**: ✅ ALL PASSING

### Test Suites Breakdown

#### 1. Order Creation (11 tests)
- ✅ Happy path: Create order with menu items
- ✅ Happy path: Create order without menu items
- ✅ Update existing order (idempotency - same user, same event)
- ✅ Reject order with negative total amount
- ✅ Reject order with zero quantity
- ✅ Reject order with negative quantity
- ✅ Reject order with negative item price
- ✅ Reject order with invalid menu items (404)
- ✅ Reject order from non-participant
- ✅ Reject order on closed event
- ✅ Reject order from different company user

#### 2. Order Retrieval (6 tests)
- ✅ Get all orders for an event
- ✅ Empty array for event with no orders
- ✅ Reject access to different company's event orders
- ✅ Get all orders for current user
- ✅ Empty array when user has no orders
- ✅ Filter orders by company (isolation)

#### 3. Order Updates (3 tests)
- ✅ Update existing order items
- ✅ Update special instructions
- ✅ Prevent cross-user order updates

#### 4. Order Deletion (4 tests)
- ✅ Delete own order
- ✅ Return 404 for non-existent order
- ✅ Prevent deletion from closed event
- ✅ Prevent deleting another user's order

#### 5. Payment Confirmation (4 tests)
- ✅ Confirm payment for own order
- ✅ Idempotent payment confirmation
- ✅ Return 404 for non-existent order
- ✅ Prevent confirming payment for other user's order

#### 6. Order-Event Relationship (2 tests)
- ✅ Cascade delete orders when event is deleted
- ✅ Prevent event deletion if it has orders (400 status)

#### 7. Company Isolation (1 test)
- ✅ Orders from different companies are isolated

---

## Files Modified

### Backend Files (2 files, ~60 lines changed)

#### 1. `backend/src/modules/orders/orders.controller.ts`
**Functions Updated**: 5
- `getEventOrders()` - Response wrapping, error messages
- `createOrUpdateOrder()` - Menu validation, response wrapping, error messages
- `deleteOrder()` - Error messages
- `confirmPayment()` - Response wrapping, error messages
- `getUserOrders()` - Response wrapping, error messages

**Lines Changed**: ~50

#### 2. `backend/src/modules/events/events.controller.ts`
**Functions Updated**: 1
- `deleteEvent()` - Status code fix (403 → 400)

**Lines Changed**: 1

### Test Files (1 file, 988 lines)

#### 1. `backend/src/__tests__/integration/orders.integration.test.ts` (NEW)
- 31 comprehensive test cases
- Full CRUD coverage
- Authorization testing
- Business logic validation
- Company isolation verification

### Helper Files (1 file, 75 lines)

#### 1. `backend/src/test/factories/menuItem.factory.ts` (NEW)
- `createMenuItem()` - Single menu item creation
- `createMenuItems()` - Bulk creation with categories
- `buildMenuItemData()` - Data builder for validation tests

---

## Verification

### Integration Test Results

```bash
# Phase 1.1: Authentication Tests
npm test -- auth.integration.test.ts
Test Suites: 1 passed, 1 total
Tests:       47 passed, 47 total
Time:        3.219 s
```

```bash
# Phase 1.2: Event Management Tests
npm test -- events.integration.test.ts
Test Suites: 1 passed, 1 total
Tests:       38 passed, 38 total
Time:        5.809 s
```

```bash
# Phase 1.3: Order Management Tests
npm test -- orders.integration.test.ts
Test Suites: 1 passed, 1 total
Tests:       31 passed, 31 total
Time:        9.309 s
```

**Total Integration Tests**: 116 tests (47 + 38 + 31)  
**Pass Rate**: 100%

---

## API Consistency Achieved

### Response Format Standards

All endpoints now follow consistent patterns:

#### Success Responses
```typescript
// List endpoints
GET /api/events/:eventId/orders → { data: Order[] }
GET /api/users/orders → { data: Order[] }

// Single resource endpoints
POST /api/events/:eventId/orders → { data: Order }
PUT /api/events/:eventId/orders/:orderId → { data: Order }
PUT /api/orders/:orderId/confirm-payment → { data: Order }

// Deletion endpoints
DELETE /api/orders/:orderId → 204 No Content
```

#### Error Responses
```typescript
// All errors use message field
404 → { message: 'Order not found' }
400 → { message: 'Event is no longer accepting orders' }
403 → { message: 'Must join event before ordering' }
500 → { message: 'Failed to process order' }
```

### Status Code Usage

```typescript
// Success
200 OK         - Successful GET, PUT
201 Created    - Successful POST (new resource)
204 No Content - Successful DELETE

// Client Errors
400 Bad Request  - Validation errors, business rule violations
403 Forbidden    - Authorization failures (wrong user, wrong company)
404 Not Found    - Resource doesn't exist

// Server Errors
500 Internal     - Unexpected server errors
```

---

## Next Steps

### Phase 1.3 Remaining Tasks
1. ✅ **Document API changes** (this document)
2. **Check frontend compatibility**
   - Review order-related hooks (`useOrders`, `useCreateOrder`, etc.)
   - Identify breaking changes from response format updates
   - Check error handling for `message` field
3. **Update frontend if needed**
   - Unwrap `{ data: ... }` responses
   - Fix error handling
   - Update TypeScript types
4. **Update project documentation**
   - PROGRESS.md with Phase 1.3 completion
   - testing/README.md with new test file
   - docs/README.md current status

### Phase 1.4: Restaurant & Menu Management (Next)
- ~32 test cases estimated
- Restaurant CRUD operations
- Menu item CRUD operations
- Restaurant-company relationships
- Menu item-restaurant relationships

---

## Lessons Learned

### TDD Success Factors
1. **Write tests first**: Caught all inconsistencies before manual testing
2. **Comprehensive coverage**: 31 test cases covered edge cases we wouldn't have thought of
3. **Iterative fixes**: Each test failure pointed to specific API gaps
4. **Standards enforcement**: Tests enforced consistent response formats

### API Design Insights
1. **Validation early**: Check menu item existence before database operations
2. **Proper status codes**: 400 for business rules, 403 for permissions
3. **Consistent patterns**: `{ data: ... }` for all success, `{ message: ... }` for all errors
4. **Descriptive errors**: Include specific IDs in error messages

### Testing Best Practices
1. **Company isolation**: Every test suite must verify multi-tenant boundaries
2. **RBAC coverage**: Test creator permissions, participant requirements
3. **Edge cases**: Closed events, non-existent resources, cross-company access
4. **Idempotency**: Test operations can be safely repeated

---

## Summary

✅ **31 integration tests created** (988 lines)  
✅ **6 API functions updated** (response format, validation, error messages)  
✅ **100% test pass rate** achieved  
✅ **API consistency** maintained across all endpoints  
✅ **Validation enhanced** (menu item existence check)  
✅ **Business logic fixed** (proper HTTP status codes)  

**Next**: Frontend compatibility check and updates.
