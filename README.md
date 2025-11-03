# LunchSync 🍕

> A multi-tenant SaaS platform for coordinating corporate lunch orders

LunchSync simplifies the process of organizing group lunch orders within companies. Create events, select restaurants, gather orders from team members, and coordinate deliveries—all in one place.

## 📚 Documentation

**Complete documentation is available in the [docs/](docs/) folder:**
- 📖 [Documentation Index](docs/README.md) - Start here
- 🚀 [Quick Reference](docs/development/QUICK_REFERENCE.md) - Fast commands & endpoints
- 🎯 [Frontend Implementation Plan](docs/development/FRONTEND_PLAN.md) - Roadmap & progress
- 🧪 [Testing Documentation](docs/testing/) - Test reports & plans
- 🚢 [Deployment Guide](docs/deployment/DEPLOYMENT.md) - Production deployment

## 📊 Project Status

### Backend ✅ Complete (100%)
- ✅ 100% Test Coverage (44/44 tests passing)
- ✅ 85% Security Score
- ✅ Multi-tenant architecture
- ✅ Full API implementation
- ✅ Authentication & authorization

### Frontend 🔄 In Progress (85%)
- ✅ Core pages & routing
- ✅ API integration
- ✅ State management
- ✅ Testing infrastructure (Vitest + RTL + MSW)
- ✅ 12 tests passing
- 📋 [See detailed plan](docs/development/FRONTEND_PLAN.md)
- 📖 [Testing Guide](frontend/TESTING.md)

## ✨ Features

- **Multi-Tenant Architecture**: Fully isolated data per company
- **Event Management**: Create and manage lunch events with deadlines
- **Restaurant Integration**: Support for menu-based and custom orders
- **Role-Based Access**: Admin and user roles with different permissions
- **Real-Time Updates**: Live order tracking and participant management
- **Flexible Payment**: Event creator, individual, or company expense options
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Toast Notifications**: User-friendly success and error messages
- **Form Validation**: Client and server-side validation with Zod

## 🏗️ Technology Stack

### Frontend
- React 18 + TypeScript
- Vite
- Tailwind CSS + shadcn/ui components
- Zustand (State Management)
- TanStack Query (Data Fetching)
- React Router v6
- Axios
- React Hook Form + Zod
- **Testing**: Vitest + React Testing Library + MSW

### Backend
- Node.js 20+ with TypeScript
- Express.js
- PostgreSQL 15+
- Prisma ORM
- JWT Authentication
- Zod Validation
- **Testing**: Jest + Supertest (100% coverage)
- JWT Authentication
- Zod Validation

### DevOps
- Docker + Docker Compose
- PostgreSQL in container

## 📁 Project Structure

```
lunch.app/
├── frontend/          # React + Vite application
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/           # shadcn/ui components
│   │   │   ├── layout/       # Header, Sidebar, Layout
│   │   │   └── features/     # Feature components
│   │   ├── pages/            # Route pages
│   │   ├── store/            # Zustand stores
│   │   ├── lib/              # API client & utilities
│   │   ├── types/            # TypeScript types
│   │   └── App.tsx
│   └── package.json
│
├── backend/           # Express API
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/         # Authentication
│   │   │   ├── restaurants/  # Restaurant management
│   │   │   ├── events/       # Event management
│   │   │   └── orders/       # Order management
│   │   ├── middleware/       # Auth, validation, error handling
│   │   ├── config/           # Database, environment
│   │   └── utils/            # JWT, bcrypt, logger
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   └── package.json
│
└── docker-compose.yml
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Docker and Docker Compose
- npm or yarn

### 1. Start Database
```bash
docker-compose up -d
```

### 2. Setup Backend
```bash
cd backend
npm install
npx prisma migrate dev
npm run db:seed
```

### 3. Setup Frontend
```bash
cd frontend
npm install

# Create .env file (REQUIRED)
cat > .env << 'EOF'
VITE_API_URL=http://localhost:5000/api
EOF
```

### 4. Run Tests
```bash
# Frontend tests
cd frontend
npm test                  # Run tests
npm run test:coverage     # Run with coverage
npm run test:ui          # Run with UI

# Backend tests
cd backend
npm test
```

### 5. Run Both Servers
```bash
# Terminal 1 - Backend (port 5000)
cd backend && npm run dev

# Terminal 2 - Frontend (port 3000)
cd frontend && npm run dev
```

### 6. Login
Open `http://localhost:3000` and use:
- **Admin**: `admin@demo.com` / `password123`
- **User**: `user@demo.com` / `password123`

> 💡 **Detailed instructions**: See [Quick Reference Guide](docs/development/QUICK_REFERENCE.md)

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register company + admin
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Restaurants
- `GET /api/restaurants` - List restaurants
- `POST /api/restaurants` - Create restaurant (admin)
- `GET /api/restaurants/:id` - Get restaurant details
- `PATCH /api/restaurants/:id` - Update restaurant (admin)
- `DELETE /api/restaurants/:id` - Delete restaurant (admin)
- `POST /api/restaurants/:id/menu-items` - Add menu item (admin)
- `PATCH /api/restaurants/:id/menu-items/:itemId` - Update menu item (admin)
- `DELETE /api/restaurants/:id/menu-items/:itemId` - Delete menu item (admin)

### Events
- `GET /api/events` - List events
- `POST /api/events` - Create event
- `GET /api/events/:id` - Get event details
- `PATCH /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event
- `POST /api/events/:id/close` - Close event
- `POST /api/events/:id/join` - Join event

### Orders
- `GET /api/events/:eventId/orders` - Get event orders
- `POST /api/events/:eventId/orders` - Place/update order
- `DELETE /api/events/:eventId/orders/:id` - Cancel order
- `PATCH /api/events/:eventId/orders/:id/payment` - Confirm payment

## 🗄️ Database Schema

The application uses Prisma ORM with the following main models:

- **Company** - Multi-tenant company data
- **User** - Users with ADMIN/USER roles
- **Restaurant** - Restaurants with optional menus
- **MenuItem** - Menu items for restaurants
- **Event** - Lunch coordination events
- **EventParticipant** - Users who joined events
- **Order** - User orders (menu-based or custom)
- **OrderItem** - Individual items in menu-based orders

## 🔑 Key Business Rules

1. **Multi-tenancy** - All data is isolated by `companyId`
2. **Role-Based Access**:
## 🏗️ Architecture

### Key Design Principles
1. **Multi-Tenant Isolation**: Each company's data is completely isolated at the database level
2. **Role-Based Access Control**:
   - **ADMIN**: Manage restaurants, menus, and company settings
   - **USER**: Create/join events, place orders
3. **Event-Driven Workflow**: 
   - Create event → Users join → Place orders → Close event → Delivery
4. **Flexible Ordering**: Supports both structured menu-based and free-text custom orders

### Database Schema
See [Prisma Schema](backend/prisma/schema.prisma) for complete details.

Key entities: Company, User, Restaurant, MenuItem, Event, EventParticipant, Order, OrderItem

## 🔧 Development

### Testing
```bash
# Backend API tests (Jest)
cd backend
npm test

# Run all tests with coverage
./run-tests.sh

# Security tests
./security-tests.sh
```

**Backend Test Status**: ✅ 44/44 tests passing (100%)

### Database Management
```bash
# Run migrations
cd backend
npx prisma migrate dev

# Seed database with demo data
npm run db:seed

# Open Prisma Studio (GUI)
npx prisma studio
```

### Environment Variables

**Backend** (`backend/.env`):
```env
DATABASE_URL="postgresql://lunchsync:lunchsync123@localhost:5434/lunchsync"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"
PORT=5000
NODE_ENV="development"
```

**Frontend** (`frontend/.env`):
```env
VITE_API_URL=http://localhost:5000/api
```

## 🤝 Contributing

1. Check [Frontend Implementation Plan](docs/development/FRONTEND_PLAN.md) for available tasks
2. Pick a task and update its status
3. Follow the existing code patterns
4. Add tests for new features
5. Update documentation

## 📞 Support

- 📖 [Documentation](docs/README.md)
- 🐛 [Report Issues](../../issues)
- 💬 [Discussions](../../discussions)

## 📄 License

This project is for demonstration purposes.

## 👥 Contributors

Built by AI Agent for LunchSync demonstration.
