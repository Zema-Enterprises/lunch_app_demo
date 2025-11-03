# Frontend Compatibility Analysis
> **Review Update (2025-10-07):** Verified during Phase 4.4 accessibility + integration pass.

## Overview

Analysis of frontend code compatibility with backend API changes from Phase 1.1 (Authentication) and Phase 1.2 (Events).

**Date**: After Phase 1.2 Completion  
**Backend Changes**: Response format standardization (`{ data: ... }` wrapper, `{ message: ... }` errors)

---

## 🔴 BREAKING CHANGES IDENTIFIED

### 1. Authentication API (Phase 1.1)

#### Backend Changes
- **Login Response**: Now wrapped in `{ data: { token, user } }`
- **Register Response**: Now wrapped in `{ data: { token, user } }`
- **Get Current User**: Now wrapped in `{ data: { user } }` (no company)
- **Error Responses**: Changed from `{ error: "..." }` to `{ message: "..." }`

#### Frontend Impact

**File**: `frontend/src/store/authStore.ts`

**Current Code** (Lines 35-49):
```typescript
const response = await apiClient.post<AuthResponse>('/auth/login', {
  email,
  password,
});
const { token, user, company } = response.data;  // ❌ BROKEN - expects unwrapped response
```

**Issue**:
- Frontend expects `response.data.token` directly
- Backend now returns `response.data.data.token`
- Company is no longer included in login/register responses

**Affected Functions**:
- `login()` - Lines 34-51
- `register()` - Lines 53-71
- `loadUser()` - Lines 83-106

---

### 2. Events API (Phase 1.2)

#### Backend Changes
- **GET /api/events**: Returns `{ data: Event[] }`
- **GET /api/events/:id**: Returns `{ data: Event }`
- **POST /api/events**: Returns `{ data: Event }`
- **PATCH /api/events/:id**: Returns `{ data: Event }`
- **POST /api/events/:id/join**: Returns `{ data: EventParticipant }`
- **POST /api/events/:id/close**: Returns `{ data: Event }`

#### Frontend Impact

**File**: `frontend/src/lib/api/hooks.ts`

**Current Code** (Lines 181-189):
```typescript
export const useEvents = (status?: string) => {
  return useQuery({
    queryKey: ['events', status],
    queryFn: async () => {
      const response = await apiClient.get<Event[]>('/events', {
        params: status ? { status } : {},
      });
      return response.data;  // ❌ BROKEN - expects unwrapped response
    },
  });
};
```

**Issue**:
- Frontend expects `response.data` to be `Event[]`
- Backend now returns `response.data.data` as `Event[]`

**Affected Functions**:
- `useEvents()` - Lines 181-189
- `useEvent()` - Lines 191-200
- `useCreateEvent()` - Lines 202-215
- `useUpdateEvent()` - Lines 217-230
- `useJoinEvent()` - Lines 274-287
- `useCloseEvent()` - Lines 289-302

---

### 3. Error Handling

#### Backend Changes
- All errors now return `{ message: "..." }` instead of `{ error: "..." }`

#### Frontend Impact

**File**: `frontend/src/pages/Login.tsx` (Line 30)
```typescript
setError('root', { message: err.response?.data?.error || 'Login failed' });
// ❌ Should use err.response?.data?.message
```

**File**: `frontend/src/lib/api/hooks.ts`
- Error handling in mutation `onError` callbacks may need updates
- Currently most hooks show generic error messages
- Need to extract and display `message` field from backend errors

---

## 📊 Impact Summary

| Area | Files Affected | Functions Affected | Severity |
|------|---------------|-------------------|----------|
| Authentication | 2 | 3 | 🔴 CRITICAL |
| Events | 1 | 6 | 🔴 CRITICAL |
| Error Handling | 2+ | Multiple | 🟡 MEDIUM |

---

## ✅ Required Changes

### 1. Update Auth Store (`frontend/src/store/authStore.ts`)

#### Change 1: Login Function
```typescript
// BEFORE
const response = await apiClient.post<AuthResponse>('/auth/login', {
  email,
  password,
});
const { token, user, company } = response.data;

// AFTER
const response = await apiClient.post<{ data: { token: string; user: User } }>('/auth/login', {
  email,
  password,
});
const { token, user } = response.data.data;  // Unwrap { data: ... }

// Note: company is no longer included, need separate call if needed
```

#### Change 2: Register Function
```typescript
// BEFORE
const response = await apiClient.post<AuthResponse>('/auth/register', data);
const { token, user, company } = response.data;

// AFTER
const response = await apiClient.post<{ data: { token: string; user: User } }>('/auth/register', data);
const { token, user } = response.data.data;  // Unwrap { data: ... }
```

#### Change 3: Load User Function
```typescript
// BEFORE
const response = await apiClient.get<{ user: User; company: Company }>(
  '/auth/me'
);
set({
  user: response.data.user,
  company: response.data.company,
  // ...
});

// AFTER
const response = await apiClient.get<{ data: { user: User } }>(
  '/auth/me'
);
set({
  user: response.data.data.user,
  company: null,  // Or fetch separately if needed
  // ...
});
```

---

### 2. Update API Hooks (`frontend/src/lib/api/hooks.ts`)

#### Pattern for ALL hooks:

```typescript
// BEFORE
const response = await apiClient.get<Event[]>('/events');
return response.data;

// AFTER
const response = await apiClient.get<{ data: Event[] }>('/events');
return response.data.data;  // Unwrap { data: ... }
```

#### Affected Hooks (need same pattern):
1. `useEvents()` - Line 185
2. `useEvent()` - Line 195
3. `useCreateEvent()` - Line 206
4. `useUpdateEvent()` - Line 223
5. `useJoinEvent()` - Line 279
6. `useCloseEvent()` - Line 294

---

### 3. Update Error Handling

#### Pattern for error messages:

```typescript
// BEFORE
const message = error.response?.data?.error || 'Default message';

// AFTER
const message = error.response?.data?.message || 'Default message';
```

#### Files to Update:
- `frontend/src/pages/Login.tsx` - Line 30
- `frontend/src/pages/Register.tsx` - If it exists
- `frontend/src/lib/api/hooks.ts` - `useChangePassword()` onError callback

---

### 4. Update Type Definitions

**File**: `frontend/src/types/index.ts` (or wherever AuthResponse is defined)

```typescript
// BEFORE
export interface AuthResponse {
  token: string;
  user: User;
  company: Company;
}

// AFTER - No longer used, backend returns { data: { token, user } }
// Can be removed or updated to:
export interface AuthResponse {
  data: {
    token: string;
    user: User;
  };
}

// For getCurrentUser
export interface GetCurrentUserResponse {
  data: {
    user: User;
  };
}
```

---

## 🔄 Additional Considerations

### Company Data

**Issue**: Backend no longer returns company in login/register/getCurrentUser responses.

**Options**:
1. **Fetch separately**: Add `useCompany()` hook call after authentication
2. **Accept missing company**: Set company to null initially, fetch when needed
3. **Backend adjustment**: Re-add company to getCurrentUser response (if critical)

**Recommendation**: Option 1 - Fetch company separately when needed. This follows the principle of fetching only what's necessary.

---

### Other API Endpoints

**Status**: Need to verify other endpoints (restaurants, orders, etc.)

Based on the pattern established in auth and events, likely affected:
- Restaurants API - Probably needs same updates
- Orders API - Probably needs same updates
- Users API - Probably needs same updates

**Note**: All endpoints should follow the same pattern:
- Success responses: `{ data: ... }`
- Error responses: `{ message: ... }`

---

## 📋 Implementation Checklist

- [ ] Update `authStore.ts` - login function
- [ ] Update `authStore.ts` - register function
- [ ] Update `authStore.ts` - loadUser function
- [ ] Update `authStore.ts` - handle missing company
- [ ] Update `hooks.ts` - useEvents
- [ ] Update `hooks.ts` - useEvent
- [ ] Update `hooks.ts` - useCreateEvent
- [ ] Update `hooks.ts` - useUpdateEvent
- [ ] Update `hooks.ts` - useJoinEvent
- [ ] Update `hooks.ts` - useCloseEvent
- [ ] Update error handling in Login.tsx
- [ ] Update error handling in Register.tsx (if exists)
- [ ] Update error handling in hooks.ts
- [ ] Update TypeScript types
- [ ] Test login flow
- [ ] Test register flow
- [ ] Test event creation
- [ ] Test event joining
- [ ] Test error messages display correctly

---

## 🎯 Priority

**HIGH PRIORITY** - These changes block core functionality:
1. ✅ Authentication (login, register, loadUser)
2. ✅ Events (list, create, join, close)
3. ✅ Error messages

**MEDIUM PRIORITY** - May affect other features:
4. Restaurants API
5. Orders API
6. Users API

---

## Next Steps

1. Implement auth store changes
2. Implement API hooks changes
3. Test authentication flow
4. Test event management flow
5. Verify error messages display correctly
6. Check and update other API endpoints if needed
7. Update frontend tests to match new response format

---

**Document Version**: 1.0  
**Last Updated**: After Phase 1.2 Completion  
**Status**: Analysis Complete - Ready for Implementation
