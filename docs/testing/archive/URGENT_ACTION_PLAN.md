# 🚨 URGENT ACTION PLAN - Phase 5.4 Blockers

> **Status**: 5 critical issues preventing GA release  
> **Timeline**: Can be fixed in 3-4 hours  
> **Owner**: Engineering Team

---

## Overview

Test validation revealed **5 blocking issues**. Documentation was ~80% accurate but:
- Tests are failing (16 backend, 1 frontend)
- One legitimate Phase 5.1 bug found
- Test counts in documentation don't match reality
- **Phase 5.4 cannot complete until these are fixed**

---

## BLOCKER #1: Duplicate Notification Delivery ⚠️ CRITICAL

**Severity**: 🔴 **CRITICAL** (Phase 5.1 functionality broken)  
**File**: `backend/src/__tests__/integration/notifications.gateway.smoke.test.ts:205`  
**Impact**: Real-time notifications delivering duplicates to users  
**Time to Fix**: 1-2 hours

### The Problem
```
Test: "avoids duplicate delivery when targeting a specific user 
alongside company broadcast"

Expected: 1 notification
Actual:   2 notifications (duplicate)

Scenario:
- Send notification to company room
- Send notification to user room
- User receives BOTH (should receive only ONE)
```

### Root Cause
Gateway room isolation logic in `backend/src/realtime/notifications.gateway.ts` not deduplicating when user appears in multiple rooms (company + user).

### Fix Steps

1. **Examine gateway broadcaster**:
```bash
cd backend
grep -n "emitNotification\|company:\|user:" src/realtime/notifications.gateway.ts
```

2. **Add deduplication logic**:
   - Option A: Only emit to user room (if user-targeted), OR
   - Option B: Check if recipient already in another room before emitting
   - Option C: Track seen notification IDs per socket client

3. **Test the fix**:
```bash
npm test -- notifications.gateway.smoke.test.ts --testNamePattern="avoids duplicate"
```

4. **Verify**:
```bash
npm run test:realtime
```

---

## BLOCKER #2: Restaurant Controller Tests (13 failures) ⚠️ TEST CODE ISSUE

**Severity**: 🟠 **HIGH** (Tests wrong, not API)  
**File**: `backend/src/modules/restaurants/__tests__/restaurants.controller.test.ts`  
**Impact**: 13 false-negative test failures  
**Time to Fix**: 30 minutes

### The Problem

API returns responses wrapped in `{ data: {...} }` (documented standard).
Tests expect unwrapped format OR different error structures.

**Examples**:
```typescript
// Test expects:
expect(response.body.id).toBe(restaurantId);

// API returns:
{ data: { id: "...", name: "...", ... } }

// Should be:
expect(response.body.data.id).toBe(restaurantId);
```

### Affected Tests (13)
1. `should create a new restaurant`
2. `should sanitize XSS in restaurant name`
3. `should validate required fields`
4. `should enforce max length validation`
5. `should get all restaurants for company`
6. `should get a specific restaurant`
7. `should return 404 for non-existent restaurant`
8. `should get menu items for a restaurant`
9. `should return empty array for restaurant with no menu`
10. `should not get menu from another company` (+ domain unique constraint)
11. `should update a restaurant`
12. `should sanitize XSS in update`
13. `should return 404 on delete non-existent`

### Fix Strategy

**Option A**: Create test helper to unwrap responses
```typescript
// Create helper in test file
const getResponseData = (response: any) => response.body.data;

// Use in tests
expect(getResponseData(response).id).toBe(restaurantId);
```

**Option B**: Update each test to unwrap
```typescript
// Before
expect(response.body.id).toBe(restaurantId);

// After
expect(response.body.data.id).toBe(restaurantId);
```

**Option C**: Create shared test utility
```typescript
// frontend/src/test/utils/api-test-helpers.ts
export const unwrapResponse = (response: any) => response.body.data;
export const unwrapError = (response: any) => response.body.errors;
```

### Recommended Approach
- Use **Option C** (shared utility) for consistency
- Apply to all tests that expect `response.body` directly
- Add comment explaining the `{ data: ... }` wrapper convention

### Fix Steps
```bash
cd backend

# 1. Create test helper
cat > src/test/helpers/response-utils.ts << 'EOF'
export const getData = (response: any) => response.body.data;
export const getErrors = (response: any) => response.body.errors;
EOF

# 2. Update test file
# - Import { getData, getErrors } from test helpers
# - Replace response.body.* with getData(response).*
# - Replace error expectations

# 3. Test
npm test -- restaurants.controller.test.ts

# 4. Verify all 13 pass
```

---

## BLOCKER #3: Test Fixture Role Mismatch ⚠️ MEDIUM

**Severity**: 🟠 **MEDIUM** (Test infrastructure issue)  
**File**: `backend/src/test/phase0-verification.test.ts`  
**Impact**: 2 tests failing, factory returns wrong role  
**Time to Fix**: 15 minutes

### The Problem

```typescript
// Test expects
expect(employee.role).toBe('EMPLOYEE');

// Factory creates
{ role: 'USER', ... }
```

### Fix Steps

1. **Locate employee factory**:
```bash
grep -rn "createEmployee" backend/src/test/factories/
```

2. **Update factory**:
```typescript
export async function createEmployee(companyId: string) {
  return prisma.user.create({
    data: {
      // ... other fields
      role: 'EMPLOYEE',  // ← Changed from 'USER'
      companyId,
    },
  });
}
```

3. **Test**:
```bash
npm test -- phase0-verification.test.ts
```

---

## BLOCKER #4: MSW Handler Missing ⚠️ MEDIUM

**Severity**: 🟡 **MEDIUM** (Frontend test configuration)  
**File**: `frontend/src/test/integration/notification-workflow.test.tsx`  
**Impact**: 1 test failing + 15 unhandled rejections  
**Time to Fix**: 15-30 minutes

### The Problem

```
Error: [MSW] Cannot bypass a request when using the "error" strategy

Test: "displays empty state when no notifications exist"
Makes a request that doesn't have an MSW handler configured.
```

### Fix Steps

1. **Identify the unhandled request**:
   - Add console log to test
   - Or run with `--reporter=verbose`

2. **Check MSW handlers**:
```bash
cd frontend
ls -la src/test/mocks/handlers.ts
grep -n "notifications" src/test/mocks/handlers.ts
```

3. **Add missing handler**:
```typescript
// In src/test/mocks/handlers.ts
rest.get('/api/notifications', (req, res, ctx) => {
  return res(
    ctx.status(200),
    ctx.json({
      data: []  // empty state
    })
  );
}),
```

4. **Alternative: Fix MSW strategy**:
```typescript
// In test setup, allow unhandled requests to bypass
const server = setupServer(...handlers);
server.listen({
  onUnhandledRequest: 'bypass'  // Instead of 'error'
});
```

5. **Test**:
```bash
npm test -- notification-workflow.test.tsx -- --run
```

---

## BLOCKER #5: Documentation Outdated ⚠️ LOW

**Severity**: 🟡 **LOW** (Documentation issue)  
**Files**: Multiple  
**Impact**: Misleading test counts  
**Time to Fix**: 30 minutes

### The Problem

**Documentation claims**:
- Backend: 252/313 passing
- Frontend: 614/614 passing

**Actual**:
- Backend: 333/349 total (16 failing)
- Frontend: 696/697 passing (1 failing)

### Fix Steps

1. **Update `docs/testing/PROGRESS.md`**:
   ```markdown
   # Current Status
   - Backend Tests: 333/349 total (333 passing, 16 failing)
     - Issue: 13 restaurant tests need response unwrapping fix
     - Issue: 1 notification gateway duplicate delivery bug
     - Issue: 2 test fixture role mismatches
   - Frontend Tests: 696/697 (696 passing, 1 failing)
     - Issue: MSW handler configuration
   ```

2. **Update `CURRENT_STATUS_SUMMARY.md`**:
   Replace:
   ```
   **Backend Tests**: 313 total, 252 passing
   **Frontend Tests**: 614/614 passing (100% ✅)
   ```
   
   With:
   ```
   **Backend Tests**: 349 total, 333 passing (5 issues blocking)
   **Frontend Tests**: 697 total, 696 passing (MSW issue)
   ```

3. **Add new section to PROGRESS.md**:
   ```markdown
   ## Known Issues (Phase 5.4)
   
   ### Issue #1: Duplicate Notification Delivery (CRITICAL)
   - File: src/__tests__/integration/notifications.gateway.smoke.test.ts
   - Fix: Deduplicate in gateway room logic
   - Status: Blocking Phase 5.1 validation
   
   ### Issue #2: Restaurant Tests Response Format (TEST CODE)
   - File: src/modules/restaurants/__tests__/restaurants.controller.test.ts
   - Fix: Unwrap { data: ... } response wrapper
   - Status: 13 tests failing
   
   ... (other issues)
   ```

---

## Execution Checklist

### Phase 1: Fix Critical Bugs (Priority Order)

- [ ] **Issue #1 (1-2 hrs)**: Duplicate notification delivery
  - [ ] Debug notifications.gateway.ts
  - [ ] Implement deduplication
  - [ ] Test: `npm run test:realtime`
  - [ ] Commit: "fix(realtime): prevent duplicate notifications in gateway"

- [ ] **Issue #2 (30 min)**: Restaurant controller tests
  - [ ] Create test utility for response unwrapping
  - [ ] Update 13 tests to use utility
  - [ ] Test: `npm test -- restaurants.controller.test.ts`
  - [ ] Commit: "test(restaurants): fix response format expectations"

- [ ] **Issue #3 (15 min)**: Employee factory role
  - [ ] Find factory function
  - [ ] Update role from 'USER' to 'EMPLOYEE'
  - [ ] Test: `npm test -- phase0-verification.test.ts`
  - [ ] Commit: "test(fixtures): correct employee role in factory"

- [ ] **Issue #4 (15-30 min)**: MSW handler
  - [ ] Identify unhandled request
  - [ ] Add MSW handler or adjust strategy
  - [ ] Test: `npm test -- notification-workflow.test.tsx`
  - [ ] Commit: "test(frontend): add missing MSW notification handler"

- [ ] **Issue #5 (30 min)**: Documentation
  - [ ] Update PROGRESS.md with actual test counts
  - [ ] Update CURRENT_STATUS_SUMMARY.md
  - [ ] Create KNOWN_ISSUES.md
  - [ ] Commit: "docs(testing): update test counts and known issues"

### Phase 2: Validation

- [ ] Run full backend test suite: `npm test`
- [ ] Run full frontend test suite: `npm test -- --run`
- [ ] Verify all tests pass (or document why they can't)
- [ ] Update PROGRESS.md with new baseline
- [ ] Create `docs/testing/TEST_VALIDATION_PASSED.md` with results

### Phase 3: Release Readiness

- [ ] Create final status report
- [ ] Obtain stakeholder sign-offs
- [ ] Schedule production rollout

---

## Estimated Effort

| Issue | Estimate | Owner |
|-------|----------|-------|
| #1: Duplicate notifications | 1-2 hrs | Backend Lead |
| #2: Restaurant tests | 30 min | Test Lead |
| #3: Factory role | 15 min | Test Lead |
| #4: MSW handler | 15-30 min | Frontend Lead |
| #5: Documentation | 30 min | QA Lead |
| **Total** | **~3-4 hours** | Team |
| Validation | 30 min | QA Lead |
| Sign-off | 30 min | Eng Lead |

**Timeline**: Can be completed by end of business today or early tomorrow morning.

---

## Success Criteria

- ✅ All 16 backend tests passing
- ✅ All 1 frontend test passing
- ✅ Notification duplicate delivery fixed
- ✅ Documentation updated with accurate counts
- ✅ Realtime tests can run (or documented why they can't)
- ✅ Full regression checklist executed in staging

---

## Next Phase (After Fixes)

Once all blockers are resolved:

1. ✅ Execute full regression checklist
2. ✅ Run security tests
3. ✅ Validate Honeycomb telemetry
4. ✅ Obtain final stakeholder approvals
5. ✅ Schedule production rollout

---

**Created**: November 3, 2025, 17:35 UTC  
**Priority**: 🔴 **CRITICAL** - Blocking GA release  
**Next Review**: After fixes implemented (est. 3-4 hours)
