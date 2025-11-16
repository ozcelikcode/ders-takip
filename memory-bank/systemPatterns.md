# Ders Takip Sistemi - System Patterns

## Mimarlık Genel Bakış

### Frontend Mimarisi
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React App     │────│   Zustand Store  │────│   TanStack Query │
│   (Pages/Components)  │   (State Mgmt)   │    │   (Server State)│
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                        │
         │                       ▼                        ▼
         │              ┌──────────────────┐    ┌─────────────────┐
         │              │   React Hook Form│    │     Axios API   │
         │              │   (Validation)   │    │   (HTTP Client) │
         └──────────────┼──────────────────┼────┼─────────────────┼
                        ▼                  ▼    ▼                 ▼
              ┌─────────────────────────────────────────────────────────┐
              │           TailwindCSS + Headless UI                   │
              │              (UI Components)                          │
              └─────────────────────────────────────────────────────────┘
```

### Backend Mimarisi
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Express App   │────│   JWT Middleware │────│   CORS & Helmet │
│   (API Server)  │    │   (Auth)         │    │   (Security)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                        │
         ▼                       ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Controllers   │────│   Sequelize ORM  │────│   SQLite DB     │
│   (Routes)      │    │   (Database)     │    │   (Storage)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Temel Mimarideki Kararlar

### 1. State Management Pattern
**Seçim**: Zustand + TanStack Query
**Neden**:
- Zustand basit ve TypeScript-friendly
- TanStack Query server state'i otomatik handle eder
- Redux'e göre daha az boilerplate

**Pattern**:
```typescript
// Global state (UI state) - Zustand
const useUIStore = (set) => ({
  theme: 'light',
  sidebarOpen: false,
  // UI state logic
});

// Server state - TanStack Query
const { data, isLoading } = useQuery({
  queryKey: ['courses'],
  queryFn: () => coursesAPI.getCourses(),
});
```

### 2. Form Management Pattern
**Seçim**: React Hook Form + Zod
**Neden**:
- Minimal re-render
- TypeScript integration
- Zod ile type-safe validation

**Pattern**:
```typescript
const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema),
});
```

### 3. API Layer Pattern
**Seçim**: Axios + Custom API wrapper
**Neden**:
- Automatic token management
- Response/error interceptors
- Centralized API configuration

**Pattern**:
```typescript
// api.ts
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Auto token attachment
api.interceptors.request.use((config) => {
  const token = getAuthToken();
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await refreshAuthToken();
      return api.request(error.config);
    }
    return Promise.reject(error);
  }
);
```

## Component Patterns

### 1. Component Hiyerarşisi
```
App.tsx
├── Layout Components
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   └── Footer.tsx
├── Page Components
│   ├── DashboardPage.tsx
│   ├── PlannerPage.tsx
│   ├── CoursesPage.tsx
│   └── StatsPage.tsx
└── Feature Components
    ├── WeeklyPlanner.tsx
    ├── PomodoroTimer.tsx
    └── StatCharts.tsx
```

### 2. Modal Pattern
**Pattern**: Headless UI Dialog + Framer Motion
```typescript
<AnimatePresence>
  {isOpen && (
    <Dialog as={motion.div} open={isOpen} onClose={onClose}>
      <Dialog.Panel as={motion.div}>
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Modal content */}
        </form>
      </Dialog.Panel>
    </Dialog>
  )}
</AnimatePresence>
```

### 3. Loading State Pattern
**Pattern**: Skeleton loading + TanStack Query states
```typescript
const { data, isLoading, error } = useQuery({...});

if (isLoading) return <LoadingSkeleton />;
if (error) return <ErrorMessage />;
return <DataComponent data={data} />;
```

## Data Flow Patterns

### 1. Authentication Flow
```
User Login → JWT Access + Refresh Token → API Requests → Auto Refresh on Expire
```

### 2. Data Fetching Pattern
```
Component Mount → TanStack Query → API Call → Cache → Component Render
```

### 3. Form Submission Pattern
```
Form Submit → Validation → API Call → Cache Invalidation → UI Update
```

## Error Handling Patterns

### 1. Frontend Error Boundary
```typescript
<ErrorBoundary fallback={<ErrorPage />}>
  <App />
</ErrorBoundary>
```

### 2. API Error Handling
```typescript
// Centralized error handling in api interceptors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || 'Bir hata oluştu';
    toast.error(message);
    return Promise.reject(error);
  }
);
```

### 3. Form Error Pattern
```typescript
// React Hook Form + Zod validation
const { formState: { errors } } = useForm({
  resolver: zodResolver(schema),
});

// Display errors inline
{errors.name && (
  <p className="text-red-500">{errors.name.message}</p>
)}
```

## Performance Patterns

### 1. Code Splitting
```typescript
// Lazy loading routes
const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const PlannerPage = lazy(() => import('../pages/PlannerPage'));
```

### 2. Memoization
```typescript
// Expensive computations
const memoizedValue = useMemo(() => {
  return expensiveCalculation(data);
}, [data]);

// Stable callbacks
const stableCallback = useCallback(() => {
  doSomething(dependencies);
}, [dependencies]);
```

### 3. Virtual Scrolling
**Pattern**: React TanStack Virtual (for large lists)
```typescript
const { virtualItems, totalSize } = useVirtualizer({
  count: items.length,
  getScrollElement: () => parentRef.current,
});
```

## Testing Patterns

### 1. Component Testing
```typescript
// React Testing Library
test('renders course list', async () => {
  render(<CourseList />);
  expect(screen.getByText('Dersler')).toBeInTheDocument();
  expect(await screen.findByText('Matematik')).toBeInTheDocument();
});
```

### 2. API Testing
```typescript
// Integration tests
test('POST /api/courses creates new course', async () => {
  const response = await request(app)
    .post('/api/courses')
    .send(courseData)
    .expect(201);
  expect(response.body.data.course.name).toBe('Matematik');
});
```

## Security Patterns

### 1. Authentication
- JWT with refresh token pattern
- Secure httpOnly cookies for refresh tokens
- Token rotation on refresh

### 2. Input Validation
- Frontend: Zod schema validation
- Backend: Express validator middleware
- SQL injection prevention via ORM

### 3. CORS & Security Headers
- Helmet.js for security headers
- CORS configuration for frontend domain
- Rate limiting for API endpoints

## Database Patterns

### 1. Sequelize Model Patterns
```typescript
// Model definition
class User extends Model {
  static associate(models) {
    User.hasMany(models.StudySession);
    User.belongsTo(models.Role);
  }
}
```

### 2. Query Optimization
- Proper indexing on frequently queried fields
- Eager loading for related data
- Pagination for large datasets

### 3. Migration Pattern
```typescript
// Database migrations
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('courses', {...});
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('courses');
  }
};
```