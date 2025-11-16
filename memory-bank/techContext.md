# Ders Takip Sistemi - Tech Context

## Teknoloji Stack

### Backend Stack
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: SQLite (Sequelize ORM)
- **Authentication**: JWT (Access + Refresh Token)
- **Security**: Helmet, CORS, bcrypt, Express Rate Limit
- **Development**: nodemon, ts-node

### Frontend Stack
- **Framework**: React 18 (Hooks only, no class components)
- **Language**: TypeScript
- **Build Tool**: Vite
- **State Management**: Zustand (client state) + TanStack Query (server state)
- **Routing**: React Router v6
- **Styling**: TailwindCSS
- **UI Components**: Headless UI
- **Forms**: React Hook Form + Zod validation
- **Animation**: Framer Motion
- **Charts**: Recharts
- **Icons**: Lucide React
- **Notifications**: React Hot Toast
- **Date Handling**: date-fns
- **HTTP Client**: Axios

## Development Setup

### Environment Requirements
- Node.js >= 18.0.0
- npm >= 9.0.0
- Git

### Development Commands
```bash
# Install all dependencies
npm run install:all

# Start both backend and frontend in development
npm run dev

# Individual services
npm run dev:backend  # Backend on port 5001
npm run dev:frontend # Frontend on port 3000

# Build for production
npm run build

# Linting
npm run lint

# Database operations
npm run db:setup
npm run seed
```

### Environment Variables

#### Backend (.env)
```env
PORT=5001
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_EXPIRE=1d
JWT_REFRESH_EXPIRE=7d
BCRYPT_SALT_ROUNDS=12
FRONTEND_URL=http://localhost:3000
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=10000
```

#### Frontend (.env)
```env
VITE_API_BASE_URL=http://localhost:5001/api
```

## Database Architecture

### Database Choice: SQLite
**Neden SQLite?**
- Zero configuration - development için ideal
- Single file - deployment basit
- TypeScript/Sequelize desteği güçlü
- Performansı bu proje için yeterli

### Database Schema
```
Users (id, email, password, firstName, lastName, avatar, role, createdAt, updatedAt)
Roles (id, name, permissions)
Categories (id, userId, name, description, color, icon, order, isActive, createdAt, updatedAt)
Courses (id, userId, categoryId, name, description, color, icon, order, isActive, createdAt, updatedAt)
Topics (id, courseId, name, description, estimatedTime, difficulty, order, isActive, createdAt, updatedAt)
StudySessions (id, userId, planId, topicId, courseId, title, description, startTime, endTime, duration, status, sessionType, color, notes, productivity, completedAt, createdAt, updatedAt)
Plans (id, userId, title, description, startDate, endDate, isActive, goals, createdAt, updatedAt)
Notifications (id, userId, sessionId, type, title, message, isRead, createdAt, updatedAt)
```

### Sequelize Models
- **User**: Authentication ve profil bilgileri
- **Category**: Kategoriler (Matematik, Türkçe, vb.)
- **Course**: Dersler (Türev, Limit, vb.)
- **Topic**: Konular (detaylı müfredat)
- **StudySession**: Çalışma oturumları
- **Plan**: Haftalık planlar
- **Notification**: Bildirimler

## API Architecture

### RESTful API Design
```
Base URL: http://localhost:5001/api

Authentication: Bearer Token (JWT)
Content-Type: application/json
```

### API Endpoints Structure
```
/auth
  POST /register     - Kullanıcı kaydı
  POST /login        - Giriş
  POST /logout       - Çıkış
  POST /refresh      - Token yenileme
  GET  /me          - Kullanıcı bilgileri
  PUT  /profile     - Profil güncelle
  POST /upload-avatar - Avatar yükle

/courses
  GET    /           - Ders listesi
  GET    /:id        - Ders detayı
  POST   /           - Yeni ders
  PUT    /:id        - Ders güncelle
  DELETE /:id        - Ders sil

/topics
  GET    /           - Konu listesi
  GET    /:id        - Konu detayı
  POST   /           - Yeni konu
  PUT    /:id        - Konu güncelle
  DELETE /:id        - Konu sil

/study-sessions
  GET    /           - Oturum listesi
  GET    /:id        - Oturum detayı
  POST   /           - Yeni oturum
  PUT    /:id        - Oturum güncelle
  DELETE /:id        - Oturum sil
  PUT    /:id/complete - Oturumu tamamla

/plans
  GET    /           - Plan listesi
  GET    /:id        - Plan detayı
  POST   /           - Yeni plan
  PUT    /:id        - Plan güncelle
  DELETE /:id        - Plan sil
```

### Response Format
```typescript
// Success Response
{
  "success": true,
  "data": {
    "course": { /* course data */ }
  },
  "message": "Ders başarıyla oluşturuldu"
}

// Error Response
{
  "success": false,
  "error": {
    "message": "Bu email zaten kullanılıyor",
    "code": "EMAIL_EXISTS"
  }
}

// List Response
{
  "success": true,
  "data": {
    "courses": [ /* array of courses */ ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45
    }
  }
}
```

## Frontend Architecture

### Component Structure
```
src/
├── components/
│   ├── common/           # Shared components
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Loading.tsx
│   │   └── ErrorBoundary.tsx
│   ├── modals/           # Modal components
│   │   ├── CourseCreateModal.tsx
│   │   └── TopicCreateModal.tsx
│   ├── dashboard/        # Dashboard specific
│   ├── planner/          # Planner specific
│   └── charts/           # Chart components
├── pages/
│   ├── DashboardPage.tsx
│   ├── PlannerPage.tsx
│   ├── CoursesPage.tsx
│   └── StatsPage.tsx
├── services/
│   ├── api.ts           # Axios configuration
│   ├── coursesAPI.ts    # Course API calls
│   └── authAPI.ts       # Auth API calls
├── store/
│   ├── authStore.ts     # Zustand auth store
│   └── uiStore.ts       # Zustand UI store
├── types/
│   ├── api.ts           # API response types
│   ├── auth.ts          # Auth types
│   └── planner.ts       # Planner types
├── utils/
│   ├── dateUtils.ts     # Date formatting
│   ├── validation.ts    # Validation schemas
│   └── constants.ts     # App constants
├── hooks/
│   ├── useAuth.ts       # Auth hook
│   └── useLocalStorage.ts # Local storage hook
└── styles/
    └── globals.css      # Tailwind imports
```

### State Management Pattern

#### Zustand (Client State)
```typescript
// authStore.ts
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}

// uiStore.ts
interface UIState {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  notifications: Notification[];
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}
```

#### TanStack Query (Server State)
```typescript
// Data fetching hooks
const { data: courses, isLoading } = useQuery({
  queryKey: ['courses'],
  queryFn: () => coursesAPI.getCourses(),
});

// Mutations
const createCourseMutation = useMutation({
  mutationFn: (data: CreateCourseData) => coursesAPI.createCourse(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['courses'] });
  },
});
```

## Authentication System

### JWT Flow
```
1. User Login → POST /auth/login
2. Server validates → Returns access_token + refresh_token
3. Client stores tokens → localStorage + httpOnly cookie
4. API Requests → Include Bearer access_token
5. Token Expires → Use refresh_token to get new access_token
6. Refresh Expires → Force logout
```

### Token Management
```typescript
// Access Token: 1 hour expiry, stored in localStorage
// Refresh Token: 7 days expiry, stored in httpOnly cookie

// Auto-refresh mechanism
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      const newToken = await refreshAuthToken();
      error.config.headers.Authorization = `Bearer ${newToken}`;
      return api.request(error.config);
    }
    return Promise.reject(error);
  }
);
```

## Performance Optimizations

### Frontend Optimizations
- **Code Splitting**: Lazy loading for routes
- **Bundle Size**: Tree shaking, dynamic imports
- **Caching**: TanStack Query automatic caching
- **Memoization**: useMemo, useCallback for expensive operations
- **Virtual Scrolling**: For long lists (plans, sessions)

### Backend Optimizations
- **Database Indexing**: On frequently queried fields
- **Query Optimization**: Sequelize includes, eager loading
- **Caching**: Response caching for static data
- **Pagination**: For large datasets

## Security Implementation

### Authentication Security
- bcrypt with 12 salt rounds for password hashing
- JWT with RS256 signing (production)
- Refresh token rotation
- Secure httpOnly cookies for refresh tokens

### API Security
- Helmet.js for security headers
- CORS configuration
- Rate limiting (100 req/min in production)
- Input validation on all endpoints
- SQL injection prevention via Sequelize

### Frontend Security
- XSS prevention via React's built-in protections
- CSRF protection via same-site cookies
- Content Security Policy headers
- HTTPS enforcement in production

## Deployment Architecture

### Development Environment
```
Frontend: Vite dev server (port 3000)
Backend: Express dev server (port 5001)
Database: SQLite file (database.sqlite)
```

### Production Considerations
```
Frontend: Static files (nginx/CDN)
Backend: Node.js server (PM2 process manager)
Database: PostgreSQL (upgrade from SQLite)
Monitoring: Health checks, logging
```

## Development Tools

### Code Quality
- **Linting**: ESLint + Prettier
- **Type Checking**: TypeScript strict mode
- **Pre-commit**: Husky + lint-staged
- **Git Hooks**: Automated formatting on commit

### Testing Strategy
- **Backend**: Jest + Supertest for API tests
- **Frontend**: React Testing Library for component tests
- **E2E**: Cypress (future enhancement)
- **Type Safety**: TypeScript for compile-time checking

### Development Experience
- **Hot Reload**: Vite HMR, nodemon
- **Developer Tools**: React DevTools, Redux DevTools
- **API Documentation**: Swagger/OpenAPI
- **Environment**: Consistent development setup across team