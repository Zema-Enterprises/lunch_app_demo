# Accessibility Guide

## Overview

LunchSync is built with accessibility in mind, following WCAG 2.1 Level AA guidelines. This document outlines the accessibility features implemented and best practices for maintaining accessibility.

## Implemented Features

### 1. Semantic HTML & ARIA
- ✅ **Landmarks**: Proper use of `<header>`, `<nav>`, `<main>`, `<aside>`
- ✅ **ARIA roles**: `role="banner"`, `role="navigation"`, `role="main"`, `role="dialog"`
- ✅ **ARIA labels**: Descriptive labels for interactive elements
- ✅ **ARIA live regions**: Dynamic content updates announced to screen readers
- ✅ **ARIA states**: `aria-invalid`, `aria-busy`, `aria-required`, `aria-expanded`

### 2. Keyboard Navigation
- ✅ **Focus management**: Proper focus order and visible focus indicators
- ✅ **Focus trap**: Modals trap focus within dialog
- ✅ **Skip link**: "Skip to main content" link for keyboard users
- ✅ **Escape key**: Closes modals and dialogs
- ✅ **Tab navigation**: All interactive elements accessible via keyboard

### 3. Form Accessibility
- ✅ **Label association**: All form inputs have associated `<label>` elements
- ✅ **Error messages**: Linked to inputs via `aria-describedby`
- ✅ **Required fields**: Marked with `aria-required="true"`
- ✅ **Validation**: Real-time validation with accessible error announcements
- ✅ **Autocomplete**: Appropriate `autocomplete` attributes

### 4. Screen Reader Support
- ✅ **Alternative text**: All icons have `aria-hidden="true"` or descriptive labels
- ✅ **Live regions**: `role="alert"` for error messages
- ✅ **Status messages**: `role="status"` for non-critical updates
- ✅ **Button labels**: Descriptive button text or `aria-label`
- ✅ **Modal announcements**: `aria-modal="true"` and `aria-labelledby`

### 5. Visual Accessibility
- ✅ **Color contrast**: Text meets WCAG AA standards (4.5:1 for normal text)
- ✅ **Focus indicators**: Visible focus rings on all interactive elements
- ✅ **Loading states**: Visual loading indicators for async operations
- ✅ **Error states**: Clear visual error indicators with icons and colors

## Accessibility Hooks

### `useFocusTrap(isOpen: boolean)`
Traps focus within a modal or dialog when open.

**Usage:**
```tsx
import { useFocusTrap } from '@/hooks/useAccessibility';

function MyModal({ onClose }: { onClose: () => void }) {
  const modalRef = useFocusTrap(true);
  
  return (
    <div ref={modalRef} role="dialog" aria-modal="true">
      {/* Modal content */}
    </div>
  );
}
```

### `useEscapeKey(callback: () => void, isEnabled = true)`
Closes modals/dialogs when Escape key is pressed.

**Usage:**
```tsx
import { useEscapeKey } from '@/hooks/useAccessibility';

function MyModal({ onClose }: { onClose: () => void }) {
  useEscapeKey(onClose);
  
  return <div>{/* Modal content */}</div>;
}
```

## Components with Built-in Accessibility

### SkipLink
Allows keyboard users to skip navigation and go directly to main content.

```tsx
import { SkipLink } from '@/components/accessibility/SkipLink';

// Already included in Layout component
```

### EventDetailsModal
- Focus trap
- Escape key to close
- ARIA labels and roles
- Keyboard navigation

### Forms (Login, Register, etc.)
- Associated labels
- Error messages linked to inputs
- Validation states
- Accessible error announcements

## Testing Accessibility

### Keyboard Testing
1. **Tab key**: Navigate through all interactive elements
2. **Shift+Tab**: Navigate backwards
3. **Enter/Space**: Activate buttons and links
4. **Escape**: Close modals and dialogs
5. **Arrow keys**: Navigate within components (where applicable)

### Screen Reader Testing
- **macOS**: VoiceOver (Cmd+F5)
- **Windows**: NVDA (free) or JAWS
- **Chrome Extension**: ChromeVox

### Automated Testing
```bash
# Install axe-core for automated testing
npm install -D @axe-core/react

# Run accessibility tests
npm test
```

### Manual Checklist
- [ ] All images have alt text or are decorative
- [ ] All form inputs have labels
- [ ] Color is not the only means of conveying information
- [ ] Text has sufficient contrast (4.5:1 minimum)
- [ ] Interactive elements have focus indicators
- [ ] Modals trap focus and can be closed with Escape
- [ ] Error messages are announced to screen readers
- [ ] Loading states are communicated
- [ ] Skip link works for keyboard users

## Best Practices for Developers

### 1. Always Use Semantic HTML
```tsx
// ✅ Good
<button onClick={handleClick}>Submit</button>

// ❌ Bad
<div onClick={handleClick}>Submit</div>
```

### 2. Provide Text Alternatives
```tsx
// ✅ Good
<User className="w-5 h-5" aria-hidden="true" />
<span className="sr-only">User profile</span>

// ❌ Bad
<User className="w-5 h-5" />
```

### 3. Use Proper Labels
```tsx
// ✅ Good
<label htmlFor="email">Email</label>
<input id="email" type="email" />

// ❌ Bad
<span>Email</span>
<input type="email" />
```

### 4. Announce Dynamic Changes
```tsx
// ✅ Good
<div role="alert" aria-live="polite">
  {error}
</div>

// ❌ Bad
<div>{error}</div>
```

### 5. Manage Focus
```tsx
// ✅ Good - Focus management in modals
const modalRef = useFocusTrap(isOpen);

// ❌ Bad - No focus management
```

## Common Patterns

### Modal/Dialog
```tsx
function MyModal({ isOpen, onClose }: Props) {
  const modalRef = useFocusTrap(isOpen);
  useEscapeKey(onClose, isOpen);
  
  if (!isOpen) return null;
  
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div ref={modalRef}>
        <h2 id="modal-title">Modal Title</h2>
        <button onClick={onClose} aria-label="Close dialog">
          <X aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
```

### Form with Validation
```tsx
<div>
  <label htmlFor="email">Email</label>
  <input
    id="email"
    type="email"
    aria-required="true"
    aria-invalid={!!errors.email}
    aria-describedby={errors.email ? 'email-error' : undefined}
  />
  {errors.email && (
    <p id="email-error" role="alert">
      {errors.email.message}
    </p>
  )}
</div>
```

### Loading State
```tsx
<button disabled={isLoading} aria-busy={isLoading}>
  {isLoading ? 'Loading...' : 'Submit'}
</button>
```

### Icon Button
```tsx
<button aria-label="Delete item">
  <Trash className="w-4 h-4" aria-hidden="true" />
</button>
```

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [WebAIM](https://webaim.org/)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)

## Accessibility Statement

LunchSync is committed to ensuring digital accessibility for people with disabilities. We continually improve the user experience for everyone and apply relevant accessibility standards.

### Conformance Status
- **Target**: WCAG 2.1 Level AA
- **Current Status**: Partial conformance
- **Last Reviewed**: October 2, 2025

### Feedback
We welcome feedback on the accessibility of LunchSync. Please contact us if you encounter any accessibility barriers.

---

**Note**: Accessibility is an ongoing process. This document should be updated as new features are added and accessibility improvements are made.
