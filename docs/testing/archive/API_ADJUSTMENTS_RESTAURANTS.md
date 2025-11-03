# API Adjustments - Restaurant & Menu Management
> **Review Update (2025-10-07):** Verified during Phase 4.4 accessibility + integration pass.

## Summary
Updated restaurant and menu item API endpoints to align with established patterns from Phases 1.1-1.3. All responses now use `{ data: ... }` wrapper and error messages use `{ message: ... }` instead of `{ error: ... }`.

## Changes Made

### Endpoint: GET /api/restaurants
**Before:**
```typescript
return res.json(restaurants);
return res.status(500).json({ error: 'Failed to fetch restaurants' });
```

**After:**
```typescript
return res.json({ data: restaurants });
return res.status(500).json({ message: 'Failed to fetch restaurants' });
```

**Rationale:** Maintain consistency with auth, event, and order endpoints.

---

### Endpoint: GET /api/restaurants/:id
**Before:**
```typescript
return res.status(404).json({ error: 'Restaurant not found' });
return res.json(restaurant);
return res.status(500).json({ error: 'Failed to fetch restaurant' });
```

**After:**
```typescript
return res.status(404).json({ message: 'Restaurant not found' });
return res.json({ data: restaurant });
return res.status(500).json({ message: 'Failed to fetch restaurant' });
```

**Rationale:** Standardize error format and response wrapping.

---

### Endpoint: POST /api/restaurants
**Before:**
```typescript
return res.status(201).json(restaurant);
return res.status(500).json({ error: 'Failed to create restaurant' });
```

**After:**
```typescript
return res.status(201).json({ data: restaurant });
return res.status(500).json({ message: 'Failed to create restaurant' });
```

**Rationale:** Match 201 response pattern from other create endpoints.

---

### Endpoint: PATCH /api/restaurants/:id
**Before:**
```typescript
return res.status(404).json({ error: 'Restaurant not found' });
return res.json(restaurant);
return res.status(500).json({ error: 'Failed to update restaurant' });
```

**After:**
```typescript
return res.status(404).json({ message: 'Restaurant not found' });
return res.json({ data: restaurant });
return res.status(500).json({ message: 'Failed to update restaurant' });
```

**Rationale:** Align with update patterns from other modules.

---

### Endpoint: DELETE /api/restaurants/:id
**Before:**
```typescript
return res.status(404).json({ error: 'Restaurant not found' });
return res.status(500).json({ error: 'Failed to delete restaurant' });
```

**After:**
```typescript
return res.status(404).json({ message: 'Restaurant not found' });
return res.status(500).json({ message: 'Failed to delete restaurant' });
```

**Rationale:** Standardize error messages (no change to 204 response).

---

### Endpoint: GET /api/restaurants/:id/menu
**Before:**
```typescript
return res.status(404).json({ error: 'Restaurant not found' });
return res.json(menuItems);
return res.status(500).json({ error: 'Failed to fetch menu items' });
```

**After:**
```typescript
return res.status(404).json({ message: 'Restaurant not found' });
return res.json({ data: menuItems });
return res.status(500).json({ message: 'Failed to fetch menu items' });
```

**Rationale:** Wrap menu items array in data envelope.

---

### Endpoint: POST /api/restaurants/:id/menu-items
**Before:**
```typescript
return res.status(404).json({ error: 'Restaurant not found' });
return res.status(201).json(menuItem);
return res.status(500).json({ error: 'Failed to create menu item' });
```

**After:**
```typescript
return res.status(404).json({ message: 'Restaurant not found' });
return res.status(201).json({ data: menuItem });
return res.status(500).json({ message: 'Failed to create menu item' });
```

**Rationale:** Match create endpoint patterns.

---

### Endpoint: PATCH /api/restaurants/:id/menu-items/:itemId
**Before:**
```typescript
return res.status(404).json({ error: 'Menu item not found' });
return res.json(updated);
return res.status(500).json({ error: 'Failed to update menu item' });
```

**After:**
```typescript
return res.status(404).json({ message: 'Menu item not found' });
return res.json({ data: updated });
return res.status(500).json({ message: 'Failed to update menu item' });
```

**Rationale:** Standardize update responses.

---

### Endpoint: DELETE /api/restaurants/:id/menu-items/:itemId
**Before:**
```typescript
return res.status(404).json({ error: 'Menu item not found' });
return res.json({ message: 'Menu item deleted successfully' });
return res.status(500).json({ error: 'Failed to delete menu item' });
```

**After:**
```typescript
return res.status(404).json({ message: 'Menu item not found' });
return res.status(204).send();
return res.status(500).json({ message: 'Failed to delete menu item' });
```

**Rationale:** Changed from 200 with message to standard 204 (no content) for delete operations.

---

## Files Modified

### Backend
- `backend/src/modules/restaurants/restaurants.controller.ts` - Updated all 9 controller functions
- `backend/src/__tests__/integration/restaurants.integration.test.ts` - Updated 43 test assertions
- `backend/src/test/factories/menuItem.factory.ts` - Changed signature to accept options object

### Frontend
- `frontend/src/lib/api/hooks.ts` - Updated 9 hooks:
  - `useRestaurants()` - Added data unwrap
  - `useRestaurant()` - Added data unwrap
  - `useCreateRestaurant()` - Added data unwrap
  - `useUpdateRestaurant()` - Added data unwrap
  - `useMenuItems()` - Added data unwrap
  - `useCreateMenuItem()` - Added data unwrap, fixed endpoint path
  - `useUpdateMenuItem()` - Added data unwrap, fixed endpoint path
  - `useDeleteMenuItem()` - Fixed endpoint path
  - `useToggleMenuItemAvailability()` - Added data unwrap, fixed endpoint path

## Frontend Impact

### Response Unwrapping
All restaurant hooks now unwrap the `{ data: ... }` response:
```typescript
// Before
const response = await apiClient.get<Restaurant[]>('/restaurants');
return response.data;

// After
const response = await apiClient.get<{ data: Restaurant[] }>('/restaurants');
return response.data.data; // Double unwrap
```

### Endpoint Path Fixes
Menu item endpoints were using incorrect paths:
```typescript
// Before (WRONG)
/restaurants/${restaurantId}/menu
/restaurants/${restaurantId}/menu/${itemId}

// After (CORRECT)
/restaurants/${restaurantId}/menu           // GET only (list items)
/restaurants/${restaurantId}/menu-items     // POST (create)
/restaurants/${restaurantId}/menu-items/${itemId}  // PATCH, DELETE
```

## Test Coverage

### Integration Tests Created: 43 tests
- **Restaurant CRUD**: 20 tests
  - Create: Admin success, non-admin rejection, validation, XSS sanitization
  - List: Get all, empty array, company isolation
  - Get Single: Success with items, 404 cases, available items only
  - Update: Admin update, non-admin rejection, 404 cases, XSS sanitization
  - Delete: Admin delete, non-admin rejection, 404 cases, cascade deletion

- **Menu Item CRUD**: 21 tests
  - Get Menu: Available items, filtering, empty array, 404, ordering
  - Create: Admin create, default values, non-admin rejection, 404, validation, negative price
  - Update: Admin update, non-admin rejection, 404 cases, availability toggle
  - Delete: Admin delete (204), non-admin rejection, 404 cases

- **Company Isolation**: 2 tests
  - Restaurant isolation between companies
  - Menu item isolation between companies

### All Tests Passing: 43/43 ✅

## Breaking Changes

### For Frontend Consumers
1. All restaurant API responses now wrapped in `{ data: ... }`
2. Menu item endpoint paths changed from `/menu/${itemId}` to `/menu-items/${itemId}`
3. Delete menu item now returns 204 instead of 200 with message
4. All error responses use `{ message: ... }` instead of `{ error: ... }`

### Migration Guide
If using restaurant hooks from `frontend/src/lib/api/hooks.ts`, no changes needed - hooks handle unwrapping internally.

If calling API directly:
```typescript
// Before
const response = await fetch('/api/restaurants');
const restaurants = await response.json();

// After
const response = await fetch('/api/restaurants');
const { data: restaurants } = await response.json();
```

## Consistency Achieved

This phase brings the Restaurant & Menu Management module into full alignment with:
- ✅ Phase 1.1: Auth endpoints (token, user data)
- ✅ Phase 1.2: Event endpoints (events, participants)
- ✅ Phase 1.3: Order endpoints (orders, items)
- ✅ Phase 1.4: Restaurant endpoints (restaurants, menu items)

All modules now share:
- `{ data: ... }` response wrapper
- `{ message: ... }` error format
- 204 (no content) for successful deletes
- Company isolation in all queries
- Admin-only mutations with RBAC enforcement
