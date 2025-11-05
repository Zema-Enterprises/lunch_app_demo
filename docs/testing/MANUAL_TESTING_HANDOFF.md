# Phase 5.4 - Manual Testing Handoff Guide
**Date:** November 4, 2025  
**Status:** Ready for Manual Validation  
**Environment:** All services running and verified

---

## Quick Start

### 1. Access the Application
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000/api
- **Database:** PostgreSQL on localhost:5434

### 2. Test Credentials
**Default test user (created by seed):**
- Email: `test@example.com`
- Password: `Password123!`

### 3. Services Status ✅
All services are running and healthy:
- ✅ `lunchsync-backend` - Up 48 minutes (healthy)
- ✅ `lunchsync-frontend` - Up 48 minutes
- ✅ `lunchsync-postgres` - Up 2 hours (healthy)

---

## Manual Testing Checklist

### Phase 1: Login & Basic Navigation (5 minutes)

1. **Open browser** and navigate to http://localhost:3000
2. **Login** with test@example.com / Password123!
3. **Verify** the dashboard loads
4. **Check** the notification bell in the header
5. **Observe** initial badge count (if any notifications exist)

**✅ Success Criteria:**
- Login successful
- Dashboard visible
- Notification bell present in header
- Badge shows unread count (or is empty)

---

### Phase 2: Create Event & Verify Notifications (10 minutes)

**Critical Test:** Validates the duplicate delivery bug fix

1. **Create a new event:**
   - Navigate to Events page
   - Click "Create Event"
   - Fill in required fields:
     - Title: "Test Lunch Event"
     - Description: "Testing notifications"
     - Delivery Location: "Office"
     - Order Deadline: Tomorrow's date
     - Select a restaurant from dropdown
   - Click "Create"

2. **Verify notification:**
   - Check notification bell
   - **Expected:** Badge count increases by 1
   - Click bell to open dropdown
   - **Expected:** See "Event created" notification
   - **CRITICAL:** Ensure notification appears ONLY ONCE (not duplicated)

3. **Test mark as read:**
   - Click on the notification
   - **Expected:** Badge count decreases by 1
   - Notification marked as read (visual change)

**✅ Success Criteria:**
- Event created successfully
- Notification appears in bell
- **NO duplicate notifications** (critical bug fix validation)
- Badge count accurate
- Mark as read works

---

### Phase 3: Join Event & Order Flow (10 minutes)

1. **Join the event:**
   - Navigate to Events page
   - Click on the event you created
   - Click "Join Event"
   - **Expected:** Confirmation message

2. **Place an order:**
   - On event details page
   - Click "Place Order"
   - Select menu items (if available) OR enter custom order
   - Click "Submit Order"

3. **Verify notifications:**
   - Check notification bell
   - **Expected:** New notification for order placed
   - **CRITICAL:** Verify NO duplicates
   - Badge count should reflect new notification

**✅ Success Criteria:**
- Join event successful
- Order placed successfully
- Notifications appear without duplicates
- Badge counts remain accurate

---

### Phase 4: Notification Interactions (10 minutes)

1. **Dropdown functionality:**
   - Click bell to open dropdown
   - **Test keyboard:** Press `Enter` on bell (should open)
   - **Test keyboard:** Press `Escape` (should close)
   - **Test mouse:** Click outside dropdown (should close)

2. **Filters:**
   - In notification dropdown, toggle "All" / "Unread"
   - **Expected:** List updates to show only unread when filtered
   - Badge count should match unread count

3. **Mark all as read:**
   - If multiple notifications exist
   - Click "Mark all as read" button
   - **Expected:** Badge goes to 0
   - All notifications visually marked as read

4. **Settings:**
   - Click notification settings icon
   - Toggle email notification settings
   - Save changes
   - Refresh page
   - **Expected:** Settings persist

**✅ Success Criteria:**
- Dropdown opens/closes correctly
- Keyboard navigation works
- Filters work correctly
- Mark all as read functional
- Settings persist after refresh

---

### Phase 5: Accessibility Testing (15 minutes)

**Tools Required:** Screen reader (NVDA for Windows, VoiceOver for Mac)

1. **Screen reader announcements:**
   - Enable screen reader
   - Tab to notification bell
   - **Expected:** Announces "Notifications, X unread"
   - Activate bell with `Enter`
   - **Expected:** Announces "Notifications menu opened"

2. **Keyboard navigation:**
   - Use `Tab` to navigate through notifications
   - Use `Enter` or `Space` to activate
   - **Expected:** All interactive elements accessible

3. **Visual accessibility:**
   - Test at 200% zoom (Ctrl/Cmd + Plus)
   - **Expected:** Layout remains usable
   - Test high-contrast mode (if available)
   - **Expected:** Text remains readable

**✅ Success Criteria:**
- Screen reader announces correctly
- All features keyboard-accessible
- High zoom maintains usability
- High contrast readable

---

### Phase 6: Browser Compatibility (20 minutes)

**Test in each browser:**

#### Chrome (Latest)
1. Open http://localhost:3000 in Chrome
2. Complete Phase 2 & 3 tests
3. Check DevTools Console for errors
4. **Test notification permissions:**
   - Click "Enable notifications" if prompted
   - **Expected:** Browser permission dialog appears
5. **Test service worker:**
   - Open DevTools → Application → Service Workers
   - **Expected:** Worker registered and active

#### Firefox (Latest)
1. Repeat tests from Chrome
2. Verify WebSocket connections work
3. Check for any Firefox-specific issues
4. Test notification permissions

#### Safari (if available)
1. Repeat core tests
2. Verify iOS notification handling
3. Check for webkit-specific issues

**✅ Success Criteria:**
- All features work in Chrome
- All features work in Firefox
- All features work in Safari (if tested)
- No console errors
- Service worker registers correctly

---

### Phase 7: Performance Testing (15 minutes)

1. **React Profiler:**
   - Open React DevTools
   - Navigate to Profiler tab
   - Start recording
   - Open notification dropdown with many items
   - Stop recording
   - **Expected:** Render time < 100ms for list

2. **Network monitoring:**
   - Open DevTools → Network tab
   - Leave idle for 2 minutes
   - **Expected:** ≤ 2 API requests per minute (polling)
   - Check for WebSocket connections (Socket.IO)

3. **Large dataset test:**
   - If possible, seed database with 200+ notifications
   - Open dropdown
   - **Expected:** Smooth scrolling (virtualization)
   - No lag or freezing

4. **Memory leaks:**
   - Open DevTools → Memory
   - Take heap snapshot
   - Interact with notifications for 5 minutes
   - Take another snapshot
   - **Expected:** No significant growth

**✅ Success Criteria:**
- Fast render times
- Low network activity when idle
- Smooth scrolling with large datasets
- No memory leaks detected

---

### Phase 8: Edge Cases & Error Handling (10 minutes)

1. **Network disconnect:**
   - Open DevTools → Network
   - Set to "Offline"
   - **Expected:** Offline banner appears
   - Set back to "Online"
   - **Expected:** Banner disappears, reconnects

2. **Concurrent users:**
   - Open second browser/incognito window
   - Login with different user
   - Create event in first window
   - **Expected:** Second user receives notification (if applicable)

3. **Rapid interactions:**
   - Quickly click mark as read multiple times
   - **Expected:** No errors, UI responds correctly

4. **Invalid data:**
   - Try to create event with missing fields
   - **Expected:** Validation errors displayed

**✅ Success Criteria:**
- Offline mode handled gracefully
- Concurrent users work correctly
- UI handles rapid clicks
- Validation prevents bad data

---

## Issue Reporting Template

If you find issues during testing, document using this template:

```markdown
### Issue: [Brief Description]

**Severity:** Critical / High / Medium / Low
**Browser:** Chrome/Firefox/Safari
**Steps to Reproduce:**
1. Step one
2. Step two
3. Step three

**Expected Behavior:**
What should happen

**Actual Behavior:**
What actually happened

**Screenshots/Logs:**
[Attach if available]

**Environment:**
- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- Date: November 4, 2025
```

---

## Critical Validations

These are **must-pass** items before release:

### 🔴 Critical
- [ ] **No duplicate notifications** (bug fix validation)
- [ ] Login/logout works
- [ ] Events can be created
- [ ] Orders can be placed
- [ ] Notifications appear correctly
- [ ] Badge counts accurate

### 🟡 High Priority
- [ ] Keyboard navigation functional
- [ ] Screen reader compatibility
- [ ] Settings persist
- [ ] Mark as read/all works
- [ ] Filters work correctly

### 🟢 Medium Priority
- [ ] Multiple browser support
- [ ] Offline mode
- [ ] Performance acceptable
- [ ] No console errors

---

## Quick Commands Reference

### Service Management
```bash
# Check status
docker-compose ps

# View backend logs
docker logs lunchsync-backend -f

# View frontend logs
docker logs lunchsync-frontend -f

# Restart services
docker-compose restart

# Stop all services
docker-compose down
```

### Backend Commands
```bash
cd backend

# Run tests
npm test

# Run specific test
npm test -- restaurants.integration.test.ts

# Coverage
npm run test:coverage

# Seed database
npm run db:seed
```

### Frontend Commands
```bash
cd frontend

# Run tests
npm test -- --run

# Run specific test
npm test -- NotificationBell.test.tsx

# Lint
npm run lint
```

---

## Support & Documentation

**If you encounter issues:**

1. **Check logs:** `docker logs lunchsync-backend` or `docker logs lunchsync-frontend`
2. **Review documentation:**
   - `docs/testing/PHASE_5.4_COMPLETION_REPORT.md` - Overall status
   - `docs/testing/REGRESSION_TEST_EXECUTION_REPORT.md` - Test details
   - `docs/testing/NOTIFICATIONS_REGRESSION_CHECKLIST.md` - Full checklist
3. **Restart services:** `docker-compose restart`
4. **Check database:** Verify PostgreSQL is running on port 5434

**Emergency contacts:**
- Engineering Lead: [Contact info]
- QA Lead: [Contact info]
- DevOps: [Contact info]

---

## Completion Criteria

Phase 5.4 is ready for release when:

- ✅ All automated tests passing (DONE - 1046/1046)
- ⏳ All critical manual tests pass
- ⏳ All high-priority manual tests pass
- ⏳ Accessibility validated
- ⏳ Browser compatibility confirmed
- ⏳ Performance acceptable
- ⏳ Stakeholder sign-offs obtained

**Current Status:** 75% complete (automated done, manual pending)

---

## Next Steps After Manual Testing

1. **Document results** - Fill in checklist status
2. **Report issues** - Use issue template above
3. **Fix any blockers** - Critical/high severity issues
4. **Retest** - Verify fixes work
5. **Obtain sign-offs** - Engineering, QA, Product, DevOps
6. **Prepare release** - Update release notes
7. **Deploy to staging** - Test in staging environment
8. **Deploy to production** - Follow rollout plan

---

**Testing Started:** [Date/Time]  
**Testing Completed:** [Date/Time]  
**Tester Name:** [Your Name]  
**Test Result:** PASS / FAIL / BLOCKED  
**Notes:** [Any additional observations]

---

**Good luck with testing! 🚀**

The system is stable, all automated tests are passing, and the critical duplicate notification bug has been fixed. Focus your manual testing on user workflows and the items marked as **Critical** above.
