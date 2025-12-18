# Ders Takip Sistemi - Active Context

## Mevcut Durum

### Son Çalışma (2025-12-18 Session Özeti)
Bu session'da Haftalık Planlayıcı (WeeklyPlanner) ve ilgili bileşenlerde çok sayıda UI/UX iyileştirmesi yapıldı:

#### 1. Resize Preview (Görev Boyutlandırma) Düzeltmeleri ✅
- **Sorun**: Resize işlemi sırasında orijinal session ve preview aynı anda görünüyordu, mouse bırakıldıktan sonra preview kaybolmuyordu
- **Çözüm**: 
  - `useEffect` içine taşınan event listener'lar closure sorununu çözdü
  - State temizliği async işlem öncesine alındı
  - Orijinal session resize sırasında `opacity: 0` ile gizleniyor
  - Minimum 5 dakika limitiyle sessiz sınırlama (hata mesajı yok)

#### 2. Session Kartları Modern Tasarım ✅
- **Gradient arka plan**: `linear-gradient(135deg, color 0%, adjustColor(color, -20) 100%)`
- **Shadow ve rounded corners**: `shadow-lg rounded-xl`
- **Beyaz buton ikonları**: Tüm action butonlar `text-white` ve `drop-shadow-sm`
- **adjustColor helper fonksiyonu**: Renk tonlaması için

#### 3. Küçük Kartlarda Buton Görünürlüğü ✅
- **Sorun**: < 30px yüksekliğindeki kartlarda butonlar görünmüyordu
- **Çözüm**: Küçük kartlar için minimal buton düzeni eklendi (Play, Edit - 3x3 boyut)

#### 4. Duraklatılmış Görevlerde Edit Butonu ✅
- **Sorun**: Paused durumunda Edit butonu `opacity-0 group-hover:opacity-100` ile gizliydi
- **Çözüm**: Edit butonu her zaman görünür yapıldı

#### 5. Hafta Değiştirme (Sürükle-Bırak) ✅
- **Özellik**: Görevleri navigasyon oklarına sürükleyerek hafta değiştirme
- **Çözüm**: Ok butonlarına `onDrop` event handler'ı eklendi

#### 6. Dashboard Haftalık İlerleme Grafiği ✅
- **Sorun**: Günler rastgele sıralanıyordu, renk tema ile uyumsuzdu
- **Çözüm**:
  - Günler Pzt→Paz sabit sıralama
  - Gradient renk (`#8b5cf6` → `#6366f1`)
  - `useMemo` ile optimizasyon
  - **Gelişmiş tooltip**: Tam gün adı ve tarih
- **Hafta Değiştirme (Sürükle-Bırak)**: Görevleri navigasyon oklarına sürükleyerek hafta değiştirme

#### 7. "Gelecek Haftaya Taşı" Drop Zone ✅
- **Özellik**: Görev sürüklenirken ekranın sağ üst köşesinde beliren yüzen bir drop zone.
- **İşlev**: Görev buraya bırakıldığında otomatik olarak 1 hafta sonrasına aynı gün ve saate taşınır.
- **UX**: Backdrop blur, animasyonlu giriş/çıkış ve görsel geri bildirim.

#### 8. Session Kartı Hover ve Resize İyileştirmesi ✅
- **Sorun**: Resize handle üzerindeki şeffaf beyaz bandın "çirkin" görünmesi.
- **Çözüm**:
  - Şeffaf beyaz band kaldırıldı.
  - Sadece hover durumunda görünen çok ince bir indikasyon çizgisi eklendi.
  - Resize handle'a rounded corners eklendi (`rounded-b-xl`).
  - Cursor değişimi korunarak temiz bir görünüm sağlandı.

#### 9. Stabilite ve Bug Fix'ler ✅
- **Tarih Formatı Hatası**: Bazı backend sürümlerinden gelen boşluklu tarih formatlarının `parseISO` tarafından reddedilmesi (Invalid Date) ve görevlerin görünmez olması düzeltildi (`parseDate` helper eklendi).
- **Stuck Drag State**: Görev sürüklenirken iptal edilirse veya navigasyon oklarına bırakılırsa `draggedSession` state'inin takılı kalması ve görevlerin soluk görünmesi düzeltildi (`onDragEnd` ve ek temizlik logicleri eklendi).
- **Syntax Fix**: Yanlışlıkla bozulan bileşen yapısı ve dangling handler'lar düzeltildi.
- `frontend/src/components/planner/WeeklyPlanner.tsx`
- `frontend/src/components/planner/GoalsOverview.tsx`
- `frontend/src/components/dashboard/WeeklyProgressChart.tsx`

## Şu Anki Odak Noktası

### Mevcut Durum Değerlendirmesi
**Çalışan Özellikler**:
- ✅ User authentication (login/register/logout)
- ✅ Kategori ve ders yönetimi (tüm kullanıcılar için)
- ✅ Konu oluşturma ve yönetimi
- ✅ User authentication (login/register/logout)
- ✅ Kategori ve ders yönetimi (tüm kullanıcılar için)
- ✅ Konu oluşturma ve yönetimi
- ✅ Haftalık planlayıcı (drag & drop, week migration, resize UX)
- ✅ Pomodoro timer
- ✅ İstatistik ve grafikler
- ✅ Bildirim sistemi
- ✅ Dark/Light mode
- ✅ Responsive design

**Son Bug Fix'ler**:
- Konu oluşturma form validasyonu
- Modal scroll sorunları
- Renk seçim sistemi

### Aktif Geliştirme Alanları
1. **Sistem Stabilizasyonu**: Mevcut özelliklerin stabilizasyonu
2. **Kullanıcı Deneyimi**: UX iyileştirmeleri
3. **Performans Optimizasyonu**: Hız ve verimlilik artışı

### Son Kritik Sorun ve Çözümü (2025-11-21)
**Sorun #1**: Konu eklendikten sonra "Ders yüklenirken bir hata oluştu" mesajı
**Neden**: React Query cache key mismatch between CourseDetailPage ve CreateTopicModal
- CourseDetailPage: `['course', id]` (id: string)
- CreateTopicModal: `['course', courseId.toString()]` (courseId: integer → string)
**İlk Çözüm Denemesi**: Cache key'i `['course', courseId]` olarak düzeltildi
**Sonuç**: Hata mesajı gitti AMA konular anlık görünmüyordu

**Sorun #2**: Konu eklendikten sonra sayfayı yenileme ihtiyacı
**Neden**: Query key structure'da query parameter eksikliği
- CourseDetailPage query key: `['course', id]`
- CourseDetailPage query fn: `getCourse(id, { includeTopics: true })`
- CreateTopicModal invalidation: `['course', courseId]`
**Problem**: TanStack Query query parametrelerini cache key hash'ine dahil ediyor
**Asıl Çözüm**: Her iki yerde de query key'e parametreleri dahil et
- CourseDetailPage: `['course', id, { includeTopics: true }]`
- CreateTopicModal: `['course', courseId, { includeTopics: true }]`
- Invalidation: `['course', courseId, { includeTopics: true }]`

**Öğrenilen**: React Query'de parametreli sorgular için query key'e parametreleri MUTLAKA dahil et!

### Backend Port Sorunu (2025-11-14)
**Sorun**: Port 5001 kullanımdaydı, connection refused hataları
**Çözüm**:
- Backend'i port 5002'ye taşıdı
- Frontend `.env` dosyasında `VITE_API_BASE_URL=http://localhost:5002/api` olarak güncellendi
- Backend başarıyla yeniden başlatıldı

## Önemli Kararlar ve Yaklaşımlar

### Technical Decisions
- **State Management**: Zustand (simple) + TanStack Query (server state)
- **Form Management**: React Hook Form + Zod validation
- **Styling**: TailwindCSS + Headless UI (accessibility)
- **Database**: SQLite (development simplicity)
- **Authentication**: JWT with refresh token pattern

### Development Patterns
- **Component Structure**: Functional components only, hooks-based
- **Error Handling**: Global error boundaries + local error states
- **API Design**: RESTful with consistent response format
- **Validation**: Client-side + server-side validation

### Code Quality Standards
- **TypeScript**: Strict mode enabled
- **File Organization**: Feature-based folder structure
- **Naming Conventions**: Turkish for UI, English for technical terms
- **Documentation**: JSDoc comments for functions

## Bilinmesi Gereken Patterns

### Modal Pattern
```typescript
<AnimatePresence>
  {isOpen && (
    <Dialog as={motion.div} open={isOpen} onClose={handleClose}>
      <Dialog.Panel as={motion.div} className="flex flex-col max-h-[90vh]">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
          <div className="flex-shrink-0">Header</div>
          <div className="overflow-y-scroll flex-1">Content</div>
          <div className="flex-shrink-0">Footer</div>
        </form>
      </Dialog.Panel>
    </Dialog>
  )}
</AnimatePresence>
```

### API Call Pattern
```typescript
const mutation = useMutation({
  mutationFn: (data) => apiCall(data),
  onSuccess: () => {
    toast.success('İşlem başarılı');
    queryClient.invalidateQueries(['key']);
  },
  onError: (error) => {
    const message = error?.response?.data?.error?.message || 'Hata oluştu';
    toast.error(message);
  },
});
```

### Form Validation Pattern
```typescript
const schema = z.object({
  name: z.string().min(1, 'Bu alan zorunlu'),
  description: z.string().optional().or(z.literal('')),
});

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema),
});
```

## Önemli Dosya Lokasyonları

### Key Components
- **CreateTopicModal**: `frontend/src/components/modals/CreateTopicModal.tsx`
- **CourseCreateModal**: `frontend/src/components/modals/CourseCreateModal.tsx`
- **CategoryManagementModal**: `frontend/src/components/modals/CategoryManagementModal.tsx`
- **WeeklyPlanner**: `frontend/src/components/planner/WeeklyPlanner.tsx`
- **DailyCalendar**: `frontend/src/components/planner/DailyCalendar.tsx`

### Key Backend Files
- **topicController**: `backend/src/controllers/topicController.ts`
- **userController**: `backend/src/controllers/userController.ts`
- **Models**: `backend/src/models/` (User, Course, Topic, StudySession)

### API Services
- **Main API**: `frontend/src/services/api.ts`
- **Courses API**: `frontend/src/services/coursesAPI.ts`
- **Auth API**: `frontend/src/services/authAPI.ts`

## Önemli Insights ve Öğrenmeler

### Technical Insights
1. **React Hook Form + Zod**: Güçlü validation ama empty string handling'e dikkat
2. **TanStack Query**: Automatic caching ama cache invalidation stratejisi önemli
3. **SQLite**: Development için harika ama production'da PostgreSQL düşünülebilir
4. **Drag & Drop**: Native HTML5 API yeterli ama race condition'lara dikkat

### User Experience Insights
1. **Modal Design**: Flex layout + max-height + overflow-y-scroll kombinasyonu ideal
2. **Color Selection**: Preset renkler custom color picker'dan daha kullanıcı dostu
3. **Form Validation**: Anlık feedback + Türkçe hata mesajları öneml
4. **Loading States**: Skeleton loading kullanıcı deneyimini artırıyor

### Development Insights
1. **Error Handling**: Centralized error handling + local error states
2. **State Management**: Simple state için Zustand ideal, complex state için Redux
3. **TypeScript**: Strict mode development'i yavaşlatır ama production'da hayat kurtarır
4. **Testing**: Component testing E2E testing'den daha değerli

## Mevcut Sorunlar ve Riskler

### Known Issues
- **Authentication**: Token refresh mechanism'da edge case'ler olabilir
- **Performance**: Large data sets için pagination eksik
- **Mobile**: Touch interactions (drag & drop) mobile'da optimize edilebilir

### Technical Debt
- **Database Schema**: Migration system eksik
- **API Documentation**: OpenAPI/Swagger eksik
- **Testing**: E2E tests eksik
- **Error Logging**: Production error tracking eksik

### Performance Considerations
- **Bundle Size**: Code splitting optimize edilebilir
- **Database Queries**: N+1 query problemleri olabilir
- **Memory Usage**: Large data sets için virtual scrolling gerekli

## Sonraki Potansiyel Adımlar

### Short Term (1-2 weeks)
1. **Stabilizasyon**: Mevcut bug'ları fixleme
2. **Testing**: Unit test coverage artırma
3. **Performance**: Bundle optimization
4. **Documentation**: API documentation ekleme

### Medium Term (1-2 months)
1. **Features**: Export/import functionality
2. **Mobile**: PWA implementation
3. **Analytics**: Advanced statistics
4. **Social**: User collaboration features

### Long Term (3+ months)
1. **Scaling**: Database migration to PostgreSQL
2. **Mobile App**: React Native implementation
3. **AI Features**: Smart recommendations
4. **Enterprise**: Team management features

## Development Guidelines

### Code Review Checklist
- [ ] TypeScript types are correct
- [ ] Error handling is implemented
- [ ] Loading states are considered
- [ ] Responsive design is checked
- [ ] Accessibility is considered
- [ ] Performance implications are evaluated
- [ ] Security implications are considered
- [ ] Tests are written if necessary

### Git Workflow
- **Feature branches**: `feature/description`
- **Commit format**: `feat: add feature`, `fix: fix bug`, `docs: update docs`
- **Pull requests**: Required for all changes
- **Code reviews**: At least one approval required

### Environment Management
- **Development**: Local SQLite + environment variables
- **Testing**: In-memory database
- **Production**: External database with proper backups
- **Secrets**: Environment variables, never commit secrets

## Development Workflow Update (2025-12-12)
- Root `npm run dev:all` starts backend + frontend together (`npm run dev` is an alias).
- Frontend proxy and env now point to backend port 5002.
