# 📚 LunchSync Documentation

Welcome to the LunchSync documentation hub. This directory contains all technical documentation, guides, and development instructions.

## 📂 Documentation Structure

```
docs/
├── README.md                    # This file - Documentation index
├── testing/                     # Testing documentation (ACTIVE)
│   ├── TESTING_IMPROVEMENT_PLAN.md
│   ├── TESTING_QUICK_REFERENCE.md
│   ├── PROGRESS.md
│   ├── API_ADJUSTMENTS_AUTH.md
│   ├── API_ADJUSTMENTS_EVENTS.md
│   └── README.md
├── development/                 # Development plans and guides
│   ├── FRONTEND_PLAN.md
│   ├── QUICK_REFERENCE.md
│   └── completed-phases/
├── architecture/                # System architecture (future)
├── deployment/                  # Deployment guides (future)
└── archive/                     # Historical documents
```

---

## 🚀 Quick Start

### New Developers - Start Here
1. **[Main Instructions](../INSTRUCTIONS.md)** - Complete development workflow and standards
2. **[Testing Strategy](./testing/TESTING_IMPROVEMENT_PLAN.md)** - How we approach testing
3. **[Progress Tracker](./testing/PROGRESS.md)** - Current status and what's next

### Writing Tests
1. **[Testing Quick Reference](./testing/TESTING_QUICK_REFERENCE.md)** - Common commands and patterns
2. **[Instructions](../INSTRUCTIONS.md)** - Test-driven development workflow
3. **[API Adjustments](./testing/)** - Examples of API changes from tests

### Understanding API Changes
- **[Tenant Invite Guardrails](./testing/API_ADJUSTMENTS_TENANT_INVITES.md)** - Phase 1 invite-only onboarding rollout
- **[Auth API Changes](./testing/archive/API_ADJUSTMENTS_AUTH.md)** - Phase 1.1 authentication changes
- **[Event API Changes](./testing/archive/API_ADJUSTMENTS_EVENTS.md)** - Phase 1.2 event management changes
- **[Frontend Compatibility](./testing/FRONTEND_COMPATIBILITY_ANALYSIS.md)** - Breaking changes analysis
- **[Bug Fixes](./testing/BUG_FIX_USER_STATS_ROUTE.md)** - Route ordering and other fixes

---

## 📊 Current Status

### Completed
- ✅ Phase 0: Test Infrastructure (23 files)
- ✅ Phase 1.1: Authentication Tests (47/47 passing)
- ✅ Phase 1.2: Event Management Tests (38/38 passing)
- ✅ Phase 1.3: Order Management Tests (31/31 passing)
- ✅ Frontend Compatibility Updates (auth + events + orders)
- ✅ Bug Fix: User stats route ordering

### In Progress
- 🔄 Documentation updates

### Next
- 📋 Phase 1.4: Restaurant & Menu Management Tests (~32 tests)

### Coverage
- **Integration Tests**: 116 passing (47 auth + 38 events + 31 orders)
- **Backend**: ~40% (Target: 90%)
- **Frontend**: ~20% (Target: 80%)

---

## 🎯 Key Resources

### Development
- **[INSTRUCTIONS.md](../INSTRUCTIONS.md)** - Master development guide
- **[Frontend Plan](./development/FRONTEND_PLAN.md)** - Frontend implementation roadmap
- **[Quick Reference](./development/QUICK_REFERENCE.md)** - Developer cheat sheet

### Testing
- **[Testing Improvement Plan](./testing/TESTING_IMPROVEMENT_PLAN.md)** - Complete testing strategy
- **[Testing Quick Reference](./testing/TESTING_QUICK_REFERENCE.md)** - Testing commands and patterns
- **[Progress Tracker](./testing/PROGRESS.md)** - Live status updates

### Completed Work
- **[Completed Phases](./development/completed-phases/)** - Archive of phase reports
- **[Archive](./archive/)** - Historical summaries

---

## 📝 Documentation Standards

### When to Update Documentation

**After Each Testing Phase**:
1. Create `API_ADJUSTMENTS_<FEATURE>.md` in `testing/` directory
2. Update `testing/PROGRESS.md` with completion status
3. Update `testing/README.md` with new links
4. Archive old phase reports to `archive/`

**After API Changes**:
1. Document in appropriate API_ADJUSTMENTS file
2. Include before/after code examples
3. Explain rationale for changes
4. List all modified files

**After Frontend Changes**:
1. Update component documentation
2. Update type definitions
3. Note breaking changes

### Document Structure

All documentation should include:
- Clear title and purpose
- Table of contents (for longer docs)
- Current status/version
- Last updated date
- Links to related documents

---

## 🗂️ Archive Policy

Documents are archived when they become outdated. Historical phase reports and old summaries are kept in `archive/` for reference but are not actively maintained.

**Current Active Documentation**:
- INSTRUCTIONS.md (root)
- testing/ directory (all files)
- development/FRONTEND_PLAN.md
- development/QUICK_REFERENCE.md

**Archived Documentation**:
- archive/ - Old summaries and reports
- development/completed-phases/ - Historical phase completion reports

---

## 🔍 Finding Information

### "How do I...?"
→ Check [INSTRUCTIONS.md](../INSTRUCTIONS.md)

### "What's the testing strategy?"
→ Check [Testing Improvement Plan](./testing/TESTING_IMPROVEMENT_PLAN.md)

### "What changed in the API?"
→ Check [testing/API_ADJUSTMENTS_*.md](./testing/)

### "What's the current status?"
→ Check [testing/PROGRESS.md](./testing/PROGRESS.md)

### "How do I run tests?"
→ Check [Testing Quick Reference](./testing/TESTING_QUICK_REFERENCE.md)

---

**Last Updated**: After Phase 1.2 + Bug Fixes  
**Maintained By**: Development Team
