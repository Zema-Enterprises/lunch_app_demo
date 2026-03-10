# UI/UX Instructions for LunchSync

**Project:** LunchSync
**Stack:** React 18.2, TypeScript 5.3, Vite 5, Tailwind CSS 3.4, shadcn/ui-style components
**Generated:** 2026-02-27

## About This File

This document defines project-specific UI/UX rules for any AI agent working on the LunchSync frontend. Every rule references actual component names, import paths, CSS variables, and code patterns from this codebase. Follow these rules exactly when creating or modifying UI code.

## Stack Summary

LunchSync is a React 18 SPA built with Vite and TypeScript. Styling uses Tailwind CSS with custom design tokens defined as CSS variables in `frontend/src/index.css`. The component library lives in `frontend/src/components/ui/` following shadcn/ui conventions. Forms use React Hook Form with Zod validation via `@hookform/resolvers/zod`. Server state is managed by TanStack Query 5; client state by Zustand stores. Icons come exclusively from `lucide-react`. Real-time updates use Socket.IO. The app is PWA-enabled via `vite-plugin-pwa`.

---

## Top 10 Non-Negotiable Rules

These rules apply to **every** UI change. Violations must be fixed before merging.

### 1. Use project components — never raw HTML equivalents

Always import from `@/components/ui/`. Never write raw `<button>`, `<input>`, `<select>`, or `<textarea>` elements.

```tsx
// CORRECT
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

// WRONG — raw HTML bypasses design tokens and focus styles
<button className="bg-blue-500 ...">Save</button>
```

### 2. Every form input must have an associated label

Use `htmlFor` on `<label>` matching the `id` on the input. This is a WCAG 2.1 Level A requirement.

```tsx
// CORRECT
<label htmlFor="eventName">Event name</label>
<Input id="eventName" {...register('name')} />

// WRONG — no programmatic label association
<label>Event name</label>
<Input {...register('name')} />
```

**Known violations to fix:**
- `components/restaurants/EditRestaurantDialog.tsx` — labels missing `htmlFor`, inputs missing `id`
- `components/features/AddRestaurantDialog.tsx` — same issue
- `components/menu/AddMenuItemDialog.tsx` — same issue

### 3. Show loading state for every async operation

Use TanStack Query's `isLoading` / `isPending` to render `<Skeleton />` for content areas or disable the submit button with a spinner.

```tsx
import { Skeleton } from '@/components/ui/skeleton';

// Content loading
if (isLoading) return <Skeleton className="h-48 w-full" />;

// Submit button loading
<Button disabled={isPending}>
  {isPending ? 'Saving...' : 'Save'}
</Button>
```

### 4. Use the toast system for all user feedback

Import `useNotificationStore` from `@/store/notificationStore`. Never use `window.alert()` or `console.log()` for user-facing feedback.

```tsx
import { useNotificationStore } from '@/store/notificationStore';

const { addToast } = useNotificationStore();

// Success
addToast({ type: 'success', message: 'Event created successfully' });

// Error
addToast({ type: 'error', message: 'Failed to create event' });

// Warning
addToast({ type: 'warning', message: 'You have unsaved changes' });
```

### 5. Gate destructive actions behind ConfirmDialog

Any delete, cancel, or irreversible action must use `ConfirmDialog` with `variant="danger"`.

```tsx
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

<ConfirmDialog
  isOpen={showConfirm}
  onClose={() => setShowConfirm(false)}
  onConfirm={handleDelete}
  title="Delete restaurant"
  message="This will permanently remove the restaurant and all its menu items."
  confirmText="Delete"
  variant="danger"
  isLoading={isDeleting}
/>
```

### 6. Colors via Tailwind utilities only — no hardcoded hex in components

All colors must use Tailwind classes. Raw hex values are only permitted in:
- `frontend/src/index.css` (design token definitions)
- Dynamic theme preview components (e.g., `pages/CompanySettings.tsx`)

```tsx
// CORRECT
<div className="bg-slate-100 text-slate-900">

// WRONG
<div style={{ backgroundColor: '#f1f5f9', color: '#0f172a' }}>
```

### 7. Icons from lucide-react only

Never import icons from other libraries. Decorative icons get `aria-hidden="true"`. Icon-only buttons get `aria-label`.

```tsx
import { Trash2, Plus } from 'lucide-react';

// Decorative icon alongside text
<Button><Plus className="mr-2 h-4 w-4" aria-hidden="true" /> Add item</Button>

// Icon-only button — MUST have aria-label
<Button variant="ghost" size="icon" aria-label="Delete item">
  <Trash2 className="h-4 w-4" />
</Button>
```

### 8. Never remove or override focus-visible styles

The project uses a consistent focus ring: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2`. This is baked into all `@/components/ui/*` components. Never add `outline: none` or `focus:ring-0` to any interactive element.

### 9. Validate forms with Zod + React Hook Form

All forms must use `react-hook-form` with `zodResolver` and a Zod schema from `@/lib/validation/schemas`.

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginFormData } from '@/lib/validation/schemas';

const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
  resolver: zodResolver(loginSchema),
});
```

Display field errors inline with `role="alert"`:
```tsx
{errors.email && (
  <p role="alert" className="text-sm text-red-500 mt-1">
    {errors.email.message}
  </p>
)}
```

### 10. Use EmptyState for zero-data views

Never show a blank page or just "No results". Use the `EmptyState` component.

```tsx
import { EmptyState } from '@/components/ui/empty-state';
import { CalendarOff } from 'lucide-react';

<EmptyState
  icon={CalendarOff}
  title="No events yet"
  description="Create your first lunch event to get started."
  action={<Button onClick={openCreate}>Create event</Button>}
/>
```

---

## Domain Rules

### Domain 1: Usability Heuristics

#### 1.1 System Status Visibility

Every async action must communicate its state to the user:
- **Loading**: `<Skeleton />` from `@/components/ui/skeleton` for content; `disabled` + loading text on buttons
- **Success**: `addToast({ type: 'success', message: '...' })`
- **Error**: `addToast({ type: 'error', message: '...' })` + inline field errors with `role="alert"`
- **Real-time updates**: Socket.IO events update TanStack Query cache via `queryClient.invalidateQueries()`

Add `role="status"` and visually hidden text for screen reader announcements on spinners:

```tsx
<div role="status" className="flex items-center gap-2">
  <Spinner />
  <span className="sr-only">Loading events...</span>
</div>
```

#### 1.2 Match Between System and Real World

- Use domain language: "event" (not "session"), "order" (not "request"), "restaurant" (not "vendor")
- Date/time formats: use `Intl.DateTimeFormat` or a consistent formatter — never raw ISO strings
- Currency: display with proper locale formatting (e.g., `$12.50`)

#### 1.3 User Control and Freedom

- Every dialog must have a close button (X) or cancel action
- Use `Dialog` + `DialogContent` from `@/components/ui/dialog` which includes built-in close
- Multi-step flows must allow going back to previous steps
- Destructive actions are recoverable where possible (soft-delete preference)

#### 1.4 Consistency and Standards

- Use the same `Button` variant for the same action type across the app:
  - **Primary actions** (create, save): `variant="default"`
  - **Destructive actions** (delete, cancel event): `variant="destructive"`
  - **Secondary actions** (cancel dialog, back): `variant="outline"`
  - **Tertiary actions** (less prominent): `variant="ghost"` or `variant="link"`
- Dialog layout: `DialogHeader` > `DialogTitle` + `DialogDescription` > form content > `DialogFooter` with actions right-aligned
- Card layout: `Card` > `CardHeader` > `CardTitle` + `CardDescription` > `CardContent` > `CardFooter`

#### 1.5 Error Prevention

- Disable submit buttons during pending mutations: `<Button disabled={isPending}>`
- Validate on blur for individual fields, validate all on submit
- Use `type="email"`, `type="tel"`, `type="number"` on inputs for mobile keyboard hints
- Pre-fill known values (e.g., user's company from auth context)

#### 1.6 Recognition Over Recall

- Use `<Select>` dropdowns (from `@/components/ui/select`) instead of free-text for known value sets (restaurants, event types, payment methods)
- Show recent/frequent choices first in selection lists
- Use `Badge` (from `@/components/ui/badge`) to display event status with color coding:
  - OPEN: `variant="success"`
  - CLOSED: `variant="secondary"`
  - CANCELLED: `variant="destructive"`
  - COMPLETED: `variant="default"`

#### 1.7 Flexibility and Efficiency

- Support keyboard shortcuts for power users where applicable
- Allow both menu-based orders (structured) and custom orders (free text)
- Responsive design: mobile-first Tailwind breakpoints (`sm:`, `md:`, `lg:`)

#### 1.8 Aesthetic and Minimalist Design

- One primary CTA per view/dialog
- Use whitespace generously — Tailwind spacing scale (`space-y-4`, `gap-6`, `p-6`)
- Remove or hide non-essential information behind expandable sections
- Keep dialogs focused: one purpose per dialog

#### 1.9 Help Users Recover from Errors

- Error toasts must include actionable information: what failed and what to try
- Form field errors appear directly below the offending field
- Network errors: suggest retry with a button, don't just display the error
- Never show raw error codes or stack traces to users

```tsx
// CORRECT
addToast({ type: 'error', message: 'Could not save order. Please check your connection and try again.' });

// WRONG
addToast({ type: 'error', message: 'Error: ECONNREFUSED 127.0.0.1:5000' });
```

#### 1.10 Help and Documentation

- Use `DialogDescription` to provide context in every dialog
- Tooltips (via `title` attribute or a tooltip component) for icon-only buttons
- Use placeholder text sparingly — it disappears on focus and is not a substitute for labels

---

### Domain 2: Accessibility & Inclusivity

#### 2.1 Semantic HTML Structure

- Use `<main id="main-content" role="main">` (already in layout)
- Use `<nav>`, `<header>`, `<footer>`, `<section>`, `<article>` appropriately
- Headings must follow hierarchy (`h1` > `h2` > `h3`) — never skip levels
- The `SkipLink` component (`@/components/accessibility/SkipLink.tsx`) is already configured to target `#main-content`

#### 2.2 Keyboard Navigation

- All interactive elements must be reachable via Tab key
- Focus order must follow visual order (no positive `tabIndex` values)
- Dialogs must trap focus while open (handled by `@/components/ui/dialog`)
- Escape key closes dialogs and dropdowns
- The `Select` component already handles full keyboard navigation (arrow keys, Enter, Escape, type-ahead)

#### 2.3 ARIA Attributes

- Dynamic content updates: use `aria-live="polite"` for non-urgent updates, `aria-live="assertive"` for errors
- Loading spinners: `role="status"` with `sr-only` descriptive text
- Form errors: `role="alert"` on error message elements
- Expandable sections: `aria-expanded` on the trigger
- Icon-only buttons: `aria-label="descriptive action"`
- Decorative icons: `aria-hidden="true"`

```tsx
// Toast container — already announced via aria-live in ToastContainer
// Inline error — use role="alert"
{errors.name && <p role="alert" className="text-sm text-red-500">{errors.name.message}</p>}
```

#### 2.4 Color and Contrast

- Never use color as the sole indicator of state — always pair with text or icons
- Badge variants combine color AND text for status
- Error states: red border + error message text (not just red border alone)
- Minimum contrast ratio: 4.5:1 for normal text, 3:1 for large text (WCAG AA)

#### 2.5 Focus Management

- When a dialog opens, focus moves to the first interactive element inside
- When a dialog closes, focus returns to the trigger element
- After deleting an item from a list, focus moves to the nearest remaining item
- Focus ring: `focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2` — never override

#### 2.6 Screen Reader Support

- Images must have `alt` text (empty `alt=""` for decorative images)
- Use `sr-only` class for visually hidden but screen-reader-accessible text
- Tables must have `<caption>` or `aria-label`
- Status changes triggered by real-time events should update `aria-live` regions

#### 2.7 Testing for Accessibility

- Use `jest-axe` (already installed) in component tests:

```tsx
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

it('should have no accessibility violations', async () => {
  const { container } = render(<MyComponent />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

- **Linting gap**: `eslint-plugin-jsx-a11y` is not yet installed. Consider adding it to catch label association, alt text, and ARIA misuse at lint time.

---

### Domain 3: Visual Design & Layout

#### 3.1 Design Tokens

All visual values come from CSS custom properties defined in `frontend/src/index.css`:

| Token | Value | Usage |
|-------|-------|-------|
| `--radius` | `0.5rem` | Border radius for all components |
| `--ls-primary` | `#0f172a` | Primary brand color (dark slate) |
| `--ls-secondary` | `#22c55e` | Secondary/accent color (green) |
| `--ls-background` | `#f8fafc` | Page background |

Tailwind extends `borderRadius` from `--radius`. Use Tailwind's `rounded-md`, `rounded-lg` etc., which map to these tokens. Never hardcode `border-radius` values in component styles.

#### 3.2 Spacing and Layout

- Use Tailwind spacing scale consistently: `p-4`, `gap-4`, `space-y-4`, `mt-6`
- Page-level padding: `p-6` or `px-6 py-8`
- Card internal spacing: `p-6` (via `CardContent`)
- Dialog width: constrain with `max-w-md`, `max-w-lg`, or `max-w-xl` on `DialogContent`
- Grid layouts: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`

#### 3.3 Responsive Design

- Mobile-first: base styles are mobile, add breakpoints for larger screens
- Breakpoints: `sm:` (640px), `md:` (768px), `lg:` (1024px), `xl:` (1280px)
- Navigation collapses to hamburger menu on mobile
- Dialogs become full-screen on mobile (`max-w-full sm:max-w-md`)
- Tables become card lists on mobile (stack vertically)

---

### Domain 4: Interaction Patterns

#### 4.1 Form Submission

Standard form submission flow:

1. User fills form (validated on blur per field)
2. User clicks submit
3. Button shows loading state (`disabled`, text changes to "Saving...")
4. On success: close dialog + success toast + invalidate relevant queries
5. On error: keep dialog open + error toast + highlight invalid fields

```tsx
const mutation = useMutation({
  mutationFn: createEvent,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['events'] });
    addToast({ type: 'success', message: 'Event created' });
    onClose();
  },
  onError: (error) => {
    addToast({ type: 'error', message: error.message || 'Failed to create event' });
  },
});
```

#### 4.2 Destructive Action Flow

1. User clicks delete/cancel button
2. `ConfirmDialog` opens with `variant="danger"`
3. User must explicitly confirm
4. Confirm button shows loading state via `isLoading` prop
5. On success: close dialog + success toast + invalidate queries
6. On error: keep dialog open + error toast

#### 4.3 Real-Time Updates

- Socket.IO events arrive via `@/lib/realtime/` hooks
- On receiving an event, invalidate the relevant TanStack Query cache
- Show a toast for significant updates (e.g., "New order placed by John")
- Use optimistic updates for user's own actions where latency matters

---

### Domain 5: Cognitive Load & Content

#### 5.1 Progressive Disclosure

- Show summary first, details on expand/click
- Event cards show: title, date, status, restaurant — full details in modal
- Menu items show: name, price — description on hover/expand
- Settings organized into tabs/sections, not one long form

#### 5.2 Microcopy and Labels

- Button labels: action verbs ("Create event", "Place order", "Delete restaurant")
- Avoid vague labels ("Submit", "OK", "Click here")
- Error messages: specific and actionable ("Email is required" not "Invalid input")
- Confirmation dialogs: restate what will happen ("Delete 'Pizza Palace'? This cannot be undone.")

#### 5.3 Information Hierarchy

- Page title (`h1`) always visible — one per page
- Section headings (`h2`) group related content
- Primary action is the most visually prominent element (default button variant)
- Destructive actions are visually distinct (red/destructive variant) but not dominant

#### 5.4 Content Grouping

- Use `Card` components to group related information
- Separate sections with consistent spacing (`space-y-8` between major sections)
- Lists use consistent item components — never mix card and row styles in the same list
- Related actions grouped in `DialogFooter` or button groups

---

## Enforcement Reference

### Automated Checks

| Check | Tool | Command |
|-------|------|---------|
| TypeScript errors | `tsc` | `cd frontend && npx tsc --noEmit` |
| ESLint (strict, 0 warnings) | ESLint | `cd frontend && npm run lint` |
| Accessibility violations | `jest-axe` | `cd frontend && npm test -- --grep "accessibility"` |
| Unit tests | Vitest | `cd frontend && npm test` |
| Build verification | Vite | `cd frontend && npm run build` |

### Missing (Recommended Additions)

| Check | Tool | How to Add |
|-------|------|------------|
| Accessibility lint rules | `eslint-plugin-jsx-a11y` | `npm install -D eslint-plugin-jsx-a11y` + add to ESLint config |
| Color contrast | `axe-core` in tests | Already installed; ensure `axe()` runs in component tests |

---

## AI Agent Checklist

Before submitting any UI change, verify all items:

- [ ] **Components**: Used `@/components/ui/*` components — no raw HTML buttons/inputs/selects
- [ ] **Labels**: Every input has `<label htmlFor="...">` matching `<Input id="...">`
- [ ] **Loading**: Async operations show `<Skeleton />` or disabled button with loading text
- [ ] **Feedback**: Success/error paths use `useNotificationStore().addToast()`
- [ ] **Destructive**: Delete/cancel actions gated by `<ConfirmDialog variant="danger">`
- [ ] **Colors**: No hardcoded hex values in component files — Tailwind classes only
- [ ] **Icons**: All icons from `lucide-react`; decorative icons have `aria-hidden="true"`; icon-only buttons have `aria-label`
- [ ] **Focus**: Focus-visible ring styles preserved — no `outline: none` or `focus:ring-0` overrides
- [ ] **Errors**: Form field errors display inline with `role="alert"`; error toasts have actionable messages
- [ ] **Empty states**: Zero-data views use `<EmptyState />` component
- [ ] **Responsive**: Layout works at mobile (`< 640px`), tablet, and desktop breakpoints
- [ ] **Accessibility test**: Component test includes `jest-axe` assertion (`expect(await axe(container)).toHaveNoViolations()`)
