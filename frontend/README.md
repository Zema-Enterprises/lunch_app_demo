# LunchSync Frontend

React 18 + TypeScript + Vite frontend application for LunchSync.

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Backend server running on port 5000

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**
   ```bash
   # Copy the example file
   cp .env.example .env
   
   # The .env file should contain:
   # VITE_API_URL=http://localhost:5000/api
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

The application will start on `http://localhost:3000`

### Available Scripts

- `npm run dev` - Start development server (port 3000)
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🏗️ Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **TanStack Query** - Server state management
- **Zustand** - Client state management
- **React Router v6** - Routing
- **React Hook Form + Zod** - Form handling and validation
- **Axios** - HTTP client

## 📁 Project Structure

```
src/
├── components/
│   ├── ui/              # Reusable UI components (shadcn/ui style)
│   ├── layout/          # Layout components (Header, Sidebar, Layout)
│   └── features/        # Feature-specific components
├── pages/               # Route page components
├── store/               # Zustand stores
├── lib/
│   ├── api/             # API client and hooks
│   └── validation/      # Zod schemas
├── types/               # TypeScript type definitions
├── App.tsx              # Main app component with routes
└── main.tsx             # Application entry point
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the frontend directory:

```env
# Required: Backend API URL
VITE_API_URL=http://localhost:5000/api
```

**Note**: All environment variables must be prefixed with `VITE_` to be exposed to the application.

### Vite Configuration

The `vite.config.ts` includes:
- Path alias: `@/` maps to `./src/`
- Proxy: `/api` requests are proxied to `http://localhost:5000` in development

## 🎨 UI Components

The project uses a custom component library inspired by shadcn/ui:
- Button, Card, Input, Select, Dialog, Badge, Toast, Textarea
- All components are in `src/components/ui/`
- Styled with Tailwind CSS utilities

## 🔌 API Integration

### API Client
Located in `src/lib/api/client.ts`:
- Axios instance with base URL from `VITE_API_URL`
- Automatic JWT token injection
- Response interceptor for 401 redirects

### React Query Hooks
Located in `src/lib/api/hooks.ts`:
- `useRestaurants()`, `useRestaurant(id)`
- `useEvents()`, `useEvent(id)`
- `useCreateOrder()`, `useEventOrders()`
- All mutations include automatic cache invalidation

### State Management
- **Auth State**: `src/store/authStore.ts` (Zustand)
- **Event State**: `src/store/eventStore.ts` (Zustand)
- **Restaurant State**: `src/store/restaurantStore.ts` (Zustand)
- **Notifications**: `src/store/notificationStore.ts` (Zustand)

## 📄 Pages

- `/login` - Login page
- `/register` - Registration page
- `/dashboard` - Dashboard with stats and upcoming events
- `/events` - Event listing and management
- `/restaurants` - Restaurant listing
- `/settings` - User and company settings

## 🐛 Troubleshooting

### API Connection Issues

If you see network errors:
1. Verify backend is running on port 5000
2. Check `.env` file exists with correct `VITE_API_URL`
3. Restart the dev server after changing `.env`

### Port Already in Use

If port 3000 is in use:
```bash
# Kill the process using port 3000
lsof -ti:3000 | xargs kill -9

# Or change the port in vite.config.ts
```

### Environment Variables Not Working

- Ensure variable names start with `VITE_`
- Restart dev server after changing `.env`
- Check browser console for the actual value

## 📚 Documentation

- [Main Documentation](../docs/README.md)
- [Frontend Implementation Plan](../docs/development/FRONTEND_PLAN.md)
- [Quick Reference Guide](../docs/development/QUICK_REFERENCE.md)

## 🤝 Contributing

1. Check [Frontend Plan](../docs/development/FRONTEND_PLAN.md) for tasks
2. Pick a task and update its status
3. Follow existing code patterns
4. Update documentation when complete

## 🔗 Useful Links

- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [TanStack Query](https://tanstack.com/query/latest)
- [Tailwind CSS](https://tailwindcss.com/)
- [Zustand](https://zustand-demo.pmnd.rs/)
