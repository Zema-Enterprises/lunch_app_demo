# nCLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**LunchSync** is a multi-tenant SaaS platform for coordinating corporate lunch orders. The application uses a strict multi-tenant architecture where all data is isolated by `companyId`.

## Tech Stack

- **Frontend**: React 18 + TypeScript, Vite, Tailwind CSS, shadcn/ui, Zustand, TanStack Query, React Router v6
- **Backend**: Node.js 20+ with TypeScript, Express.js, PostgreSQL 15+, Prisma ORM
- **Authentication**: JWT tokens stored in localStorage
- **Validation**: Zod (shared schemas between frontend and backend)
- **Security**: Helmet, CORS, rate limiting, input sanitization

## Project Structure

```
lunch.app/
├── frontend/          # React app on port 3000
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/           # shadcn/ui components
│   │   │   ├── layout/       # Header, Sidebar, Layout
│   │   │   └── features/     # Feature-specific components
│   │   ├── pages/            # Route pages
│   │   ├── store/            # Zustand stores (auth, events, restaurants, notifications)
│   │   ├── lib/
│   │   │   ├── api/          # Axios client with interceptors
│   │   │   └── validation/   # Zod schemas
│   │   └── types/            # TypeScript type definitions
│   └── package.json
│
├── backend/           # Express API on port 5000
│   ├── src/
│   │   ├── modules/          # Feature modules (auth, restaurants, events, orders)
│   │   │   └── [module]/
│   │   │       ├── *.routes.ts
│   │   │       ├── *.controller.ts
│   │   │       └── *.validation.ts
│   │   ├── middleware/       # auth, tenant, validation, error handling
│   │   ├── config/           # env, database
│   │   └── utils/            # jwt, bcrypt, logger, sanitize
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   └── package.json
│
└── docker-compose.yml # PostgreSQL container (port 5434)
```

## Common Commands

### Database Setup & Management

```bash
# Start PostgreSQL
docker-compose up -d

# Run migrations
cd backend
npx prisma migrate dev

# Seed database with demo data
npm run db:seed

# Open Prisma Studio (database GUI)
npx prisma studio
```

### Development

```bash
# Backend (runs on http://localhost:5000)
cd backend
npm install
npm run dev

# Frontend (runs on http://localhost:3000)
cd frontend
npm install
npm run dev
```

### Build & Production

```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
npm run preview
```

### Linting

```bash
cd frontend
npm run lint
```

## Key Architecture Patterns

### Multi-Tenancy

- **All database queries MUST include `companyId` filtering**
- User's `companyId` comes from JWT token payload (`req.user.companyId`)
- Each company's data is completely isolated
- Prisma schema uses `@relation` with `onDelete: Cascade` for data integrity

### Authentication Flow

1. User logs in → backend validates → returns JWT + user + company
2. Frontend stores JWT in `localStorage`
3. Axios interceptor adds `Authorization: Bearer <token>` to all requests
4. Backend `authMiddleware` verifies JWT and attaches `req.user`
5. All protected routes require `authMiddleware`

### Middleware Chain

```
Request → Rate Limiter → authMiddleware → tenantMiddleware → Controller
```

- `authMiddleware`: Verifies JWT, sets `req.user` (src/middleware/auth.ts)
- `tenantMiddleware`: Ensures user is authenticated (src/middleware/tenant.ts)
- `adminMiddleware`: Restricts access to ADMIN role only
- `validate()`: Validates request body with Zod schemas

### State Management (Frontend)

- **Zustand stores**: `authStore`, `eventStore`, `restaurantStore`, `notificationStore`
- Auth state includes: `user`, `company`, `token`, `isAuthenticated`
- API calls use TanStack Query for caching and invalidation
- Axios interceptor auto-redirects to `/login` on 401

### API Client Pattern

- Base URL: `import.meta.env.VITE_API_URL` (defaults to `/api`)
- All API calls go through `apiClient` (frontend/src/lib/api/client.ts)
- Automatic token injection via request interceptor
- Automatic logout on 401 response

## Database Models (Prisma)

### Core Entities

- **Company**: Multi-tenant root (slug, domain must be unique)
- **User**: Belongs to Company, has UserRole (ADMIN/USER)
- **Restaurant**: Company-scoped, can have menu items
- **MenuItem**: Belongs to Restaurant
- **Event**: Created by User, linked to Restaurant, has EventStatus (OPEN/CLOSED/COMPLETED/CANCELLED)
- **EventParticipant**: Join table for Users in Events
- **Order**: One per User per Event, can be menu-based or custom text
- **OrderItem**: Individual menu items in an Order

### Important Relationships

- User → Company (many-to-one, cascade delete)
- Restaurant → Company (many-to-one, cascade delete)
- Event → Company (many-to-one, cascade delete)
- Order unique constraint: `@@unique([userId, eventId])`

## Business Rules

1. **User Roles**:

   - ADMIN: Can manage restaurants and menu items
   - USER: Can create events, join events, place orders
2. **Event Lifecycle**:

   - Any user can create an event
   - Users must join event before placing order
   - Orders accepted until `orderDeadline`
   - Event creator can close event (status → CLOSED)
   - Once closed, no new orders/modifications
3. **Order Rules**:

   - One order per user per event
   - Users can update their order before event closes
   - Orders can be menu-based (with OrderItems) OR custom text
   - Payment confirmation is boolean flag only

## Environment Variables

### Backend (.env)

```
DATABASE_URL="postgresql://lunchsync:lunchsync123@localhost:5434/lunchsync"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"
PORT=5000
NODE_ENV="development"
```

### Frontend (.env)

```
VITE_API_URL="http://localhost:5000/api"
```

## Security Notes

- Rate limiting: 100 requests/15min (general), 5 requests/15min (auth endpoints)
- Helmet CSP configured with strict policies
- Input sanitization using DOMPurify on backend (src/utils/sanitize.ts)
- CORS restricted to localhost:3000 and localhost:3001 in dev
- JWT expiration defaults to 7 days
- Passwords hashed with bcrypt (10 rounds)

## Demo Credentials

After running `npm run db:seed`:

- **Admin**: admin@demo.com / password123
- **User**: user@demo.com / password123

## Testing Scripts

- `run-tests.sh`: Main test runner
- `security-tests.sh`: Security-specific tests
- `verify-security.sh`: Security verification

## Important Notes

- Frontend expects backend on `http://localhost:5000`
- PostgreSQL runs on port **5434** (not default 5432)
- All API routes prefixed with `/api`
- Health check endpoint: `GET /health`
- Always run migrations after schema changes
- Seed data creates demo company "Demo Corp"
