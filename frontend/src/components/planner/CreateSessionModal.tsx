import {
  calendarViewDate,
  wallTimeToInstant,
  formatZonedTime,
  sessionDurationLimits,
  isSessionDurationValid,
  createSessionSchema as createSessionRequestSchema,
  updateSessionSchema as updateSessionRequestSchema,
} from '@study-tracker/contracts';
import { format } from '../../utils/calendarDates';
import { pomodoroDefaults } from '@study-tracker/contracts';
import { useUserPreferencesStore } from '../../store/userPreferencesStore';
import { useAccountQueryKeys } from '../../hooks/useAccountQueryKeys';
import { Dialog } from '@headlessui/react';
import { contractResolver } from '../../lib/contractResolver';
import { useQuery } from '@tanstack/react-query';
import { differenceInMinutes } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  Calendar,
  Coffee,
  Target,
  Timer,
  Trash2,
  X,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { isAxiosError } from 'axios';
import { useAccountMutation } from '../../hooks/useAccountMutation';
import type { CatalogCourse } from '../../types/catalog';
import { sessionFormSchema, type CreateSessionForm } from './sessionForm';
import { coursesAPI, studySessionsAPI } from '../../services/api';
import {
  CreateStudySessionRequest,
  StudySession,
  UpdateStudySessionRequest,
} from '../../types/planner';
import ConfirmDialog from '../common/ConfirmDialog';

// Session identity colors are independent of the neutral dialog surfaces.
const SESSION_COLORS = [
  { name: 'Gök Mavisi', value: '#60A5FA' },
  { name: 'Nane Yeşili', value: '#34D399' },
  { name: 'Lavanta', value: '#A78BFA' },
  { name: 'Mercan', value: '#F87171' },
  { name: 'Kayısı', value: '#FBBF24' },
  { name: 'Şakayık', value: '#F472B6' },
  { name: 'Safir', value: '#818CF8' },
  { name: 'Deniz', value: '#2DD4BF' },
  { name: 'Beton', value: '#9CA3AF' },
  { name: 'Ayçiçeği', value: '#FCD34D' },
  { name: 'Okyanus', value: '#38BDF8' },
  { name: 'Çimen', value: '#4ADE80' },
];

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: Date | undefined;
  selectedHour?: number | undefined;
  editSession?: StudySession | null;
}

const SessionEditor: React.FC<Omit<CreateSessionModalProps, 'isOpen'>> = (
  props,
) => {
  const [{ selectedDate, selectedHour = 9, editSession }] = useState(props);
  const { onClose } = props;
  const accountKeys = useAccountQueryKeys();
  const livePreferences = useUserPreferencesStore((state) => state.preferences);
  const [preferences] = useState(livePreferences);
  const defaultPomodoro = useMemo(
    () => pomodoroDefaults(preferences),
    [
      preferences.defaultPomodoroDuration,
      preferences.defaultShortBreak,
      preferences.defaultLongBreak,
      preferences.pomodorosUntilLongBreak,
    ],
  );
  const [sessionCategory, setSessionCategory] = useState<
    'course' | 'break' | 'custom'
  >('course');
  const [durationMode, setDurationMode] = useState<'minutes' | 'timeRange'>(
    'minutes',
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const mutation = useAccountMutation([accountKeys.sessions()]);
  const [writeSnapshot, setWriteSnapshot] = useState(editSession);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [conflicted, setConflicted] = useState(false);
  const isEditMode = !!editSession;

  const coursesQuery = useQuery({
    queryKey: accountKeys.catalog('courses', { isActive: 'all' }),
    queryFn: async () => {
      const response = await coursesAPI.getCourses({ isActive: 'all' });
      if (!response.data.data?.courses)
        throw new Error('Course list response is missing');
      return response.data.data.courses as CatalogCourse[];
    },
  });

  const coursesData = coursesQuery.data?.filter(
    (course) => course.isActive || course.id === editSession?.courseId,
  );

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    setError,
    formState: { errors, isValid },
  } = useForm<CreateSessionForm>({
    resolver: contractResolver(sessionFormSchema),
    mode: 'onChange',
    defaultValues: {
      sessionCategory: 'course',
      startDate: selectedDate
        ? format(selectedDate, 'yyyy-MM-dd')
        : format(
            calendarViewDate(new Date(), preferences.timezone),
            'yyyy-MM-dd',
          ),
      startTime: `${selectedHour.toString().padStart(2, '0')}:00`,
      durationMode: 'minutes',
      duration: 60,
      endTime: '',
      sessionType: 'study',
      color: '#60A5FA', // Default soft blue color
      pomodoroSettings: defaultPomodoro,
    },
  });

  const sessionType = watch('sessionType');
  const showPomodoroSettings = sessionType === 'pomodoro';

  const reloadSnapshot = async () => {
    if (!editSession || !mutation.isCurrent()) return;
    try {
      const response = await studySessionsAPI.getSession(
        String(editSession.id),
      );
      if (mutation.isCurrent() && response.data.data?.session) {
        setWriteSnapshot(response.data.data.session);
        setNeedsRefresh(false);
      }
    } catch {
      /* Keep writes blocked until the current snapshot can be read. */
    }
  };
  const perform = (operation: () => Promise<unknown>, message: string) =>
    mutation.save(async () => {
      try {
        await operation();
      } catch (error) {
        if (
          isAxiosError(error) &&
          error.response?.status === 409 &&
          mutation.isCurrent() &&
          editSession
        ) {
          setConflicted(true);
          setNeedsRefresh(true);
          await reloadSnapshot();
        }
        throw error;
      }
    }, message);

  const onSubmit = async (data: CreateSessionForm) => {
    if (needsRefresh || mutation.isPending || showDeleteConfirm) return;
    // Force the correct sessionCategory in case of sync issues
    const correctedData = {
      ...data,
      sessionCategory: sessionCategory,
    };

    let startTime: Date;
    let endTime: Date;
    try {
      startTime = wallTimeToInstant(
        correctedData.startDate,
        correctedData.startTime,
        preferences.timezone,
      );
      endTime =
        durationMode === 'timeRange' && correctedData.endTime
          ? wallTimeToInstant(
              correctedData.startDate,
              correctedData.endTime,
              preferences.timezone,
            )
          : new Date(startTime.getTime() + correctedData.duration * 60000);
      if (!isSessionDurationValid(endTime.getTime() - startTime.getTime()))
        throw new Error('Invalid session duration');
    } catch {
      setError('startTime', {
        type: 'validate',
        message:
          'Saat aralığını kontrol edin. Saat diliminde bulunmayan veya iki kez yaşanan saatler seçilemez.',
      });
      return;
    }

    // Determine title based on session category
    let finalTitle: string;
    if (correctedData.sessionCategory === 'course' && correctedData.courseId) {
      const selectedCourse = coursesData?.find(
        (course) => course.id.toString() === correctedData.courseId,
      );
      if (editSession?.courseId === selectedCourse?.id && editSession) {
        finalTitle = editSession.title;
      } else if (selectedCourse) {
        // Check if course name already contains category to prevent duplication
        const categoryName = selectedCourse.category?.name || '';
        const hasCategory =
          selectedCourse.name.includes(`(${categoryName})`) ||
          selectedCourse.name.includes(`(${categoryName.toLowerCase()})`);
        finalTitle = hasCategory
          ? selectedCourse.name
          : `${selectedCourse.name}${categoryName ? ` (${categoryName})` : ''}`;
      } else {
        finalTitle = 'Ders Çalışması';
      }
    } else if (correctedData.sessionCategory === 'break') {
      finalTitle = 'Mola';
    } else if (
      correctedData.sessionCategory === 'custom' &&
      correctedData.customTitle
    ) {
      finalTitle = correctedData.customTitle;
    } else {
      finalTitle = 'Çalışma Seansı'; // fallback
    }

    const effectiveSessionType =
      correctedData.sessionCategory === 'break'
        ? 'break'
        : correctedData.sessionType === 'break'
          ? 'study'
          : correctedData.sessionType;

    const sessionData: CreateStudySessionRequest | UpdateStudySessionRequest = {
      title: finalTitle,
      description: correctedData.description ?? '',
      ...(correctedData.sessionCategory === 'course' && correctedData.courseId
        ? { courseId: parseInt(correctedData.courseId, 10) }
        : isEditMode
          ? { courseId: null, topicId: null }
          : {}),
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      sessionType: effectiveSessionType,
      color: correctedData.color || '#3B82F6',
      ...(effectiveSessionType === 'pomodoro' &&
        correctedData.pomodoroSettings && {
          pomodoroSettings: {
            workDuration: correctedData.pomodoroSettings.workDuration || 25,
            shortBreak: correctedData.pomodoroSettings.shortBreak || 5,
            longBreak: correctedData.pomodoroSettings.longBreak || 15,
            cyclesBeforeLongBreak:
              correctedData.pomodoroSettings.cyclesBeforeLongBreak || 4,
            currentCycle: 0,
          },
        }),
    };

    const request =
      isEditMode && writeSnapshot
        ? updateSessionRequestSchema.safeParse({
            ...sessionData,
            expectedUpdatedAt: writeSnapshot.updatedAt,
          })
        : createSessionRequestSchema.safeParse(sessionData);
    if (!request.success) {
      setError('title', {
        type: 'validate',
        message: 'Başlık, ders ve seans ayarlarını kontrol edin.',
      });
      return;
    }
    const saved = await perform(
      () =>
        isEditMode && writeSnapshot && 'expectedUpdatedAt' in request.data
          ? studySessionsAPI.updateSession(writeSnapshot, request.data)
          : studySessionsAPI.createSession(
              createSessionRequestSchema.parse(request.data),
            ),
      isEditMode
        ? 'Çalışma seansı güncellendi.'
        : 'Çalışma seansı oluşturuldu.',
    );
    if (saved) onClose();
  };

  const handleClose = () => {
    if (mutation.isPending || showDeleteConfirm) return;
    onClose();
  };

  const handleDelete = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!editSession || mutation.isPending || needsRefresh) return;
    mutation.clearError();
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!writeSnapshot || needsRefresh) return false;
    const saved = await perform(
      () => studySessionsAPI.deleteSession(writeSnapshot),
      'Çalışma seansı silindi.',
    );
    if (saved) {
      setShowDeleteConfirm(false);
      onClose();
    }
    return saved;
  };

  // Pre-fill form when editing OR when opening with selected date/hour
  useEffect(() => {
    if (editSession) {
      // Editing existing session
      const durationInMinutes = editSession.duration;

      // Determine session category
      let category: 'course' | 'break' | 'custom';
      if (editSession.sessionType === 'break') {
        category = 'break';
      } else if (editSession.courseId) {
        category = 'course';
      } else {
        category = 'custom';
      }

      setSessionCategory(category);

      const sessionStartTime = calendarViewDate(
        editSession.startTime,
        preferences.timezone,
      );

      reset({
        sessionCategory: category,
        courseId: editSession.courseId?.toString() || '',
        customTitle: category === 'custom' ? editSession.title : '',
        description: editSession.description || '',
        startDate: format(sessionStartTime, 'yyyy-MM-dd'),
        startTime: format(sessionStartTime, 'HH:mm'),
        durationMode: 'minutes',
        duration: durationInMinutes,
        endTime: '',
        sessionType: editSession.sessionType,
        color: editSession.color || '#3B82F6',
        pomodoroSettings: editSession.pomodoroSettings || defaultPomodoro,
      });
    } else {
      // Creating new session - use selected date/hour
      setSessionCategory('course');
      setDurationMode('minutes');

      reset({
        sessionCategory: 'course',
        startDate: selectedDate
          ? format(selectedDate, 'yyyy-MM-dd')
          : format(
              calendarViewDate(new Date(), preferences.timezone),
              'yyyy-MM-dd',
            ),
        startTime: `${(selectedHour ?? 9).toString().padStart(2, '0')}:00`,
        durationMode: 'minutes',
        duration: 60,
        endTime: '',
        sessionType: 'study',
        color: '#3B82F6',
        pomodoroSettings: defaultPomodoro,
      });
    }
  }, [
    editSession,
    selectedDate,
    selectedHour,
    reset,
    defaultPomodoro,
    preferences.timezone,
  ]);

  React.useEffect(() => {
    if (sessionCategory === 'break') {
      setValue('sessionType', 'break', { shouldValidate: true });
    } else if (sessionType === 'break') {
      setValue('sessionType', 'study', { shouldValidate: true });
    }
    setValue('sessionCategory', sessionCategory, { shouldValidate: true });
  }, [sessionCategory, sessionType, setValue]);

  React.useEffect(() => {
    setValue('durationMode', durationMode, { shouldValidate: true });
  }, [durationMode, setValue]);

  // Saat aralığı modunda bitiş saatinden süreyi hesapla
  const watchedEndTime = watch('endTime');
  const watchedStartDate = watch('startDate');
  const watchedStartTime = watch('startTime');

  React.useEffect(() => {
    if (
      durationMode === 'timeRange' &&
      watchedEndTime &&
      watchedStartDate &&
      watchedStartTime
    ) {
      try {
        const start = wallTimeToInstant(
          watchedStartDate,
          watchedStartTime,
          preferences.timezone,
        );
        const end = wallTimeToInstant(
          watchedStartDate,
          watchedEndTime,
          preferences.timezone,
        );
        const minutes = differenceInMinutes(end, start);
        if (minutes > 0 && minutes <= sessionDurationLimits.maxMinutes)
          setValue('duration', minutes, { shouldValidate: true });
      } catch {
        /* Submission reports ambiguous or missing wall times. */
      }
    }
  }, [
    watchedEndTime,
    watchedStartDate,
    watchedStartTime,
    durationMode,
    setValue,
    preferences.timezone,
  ]);

  return (
    <Dialog
      key="create-session-modal"
      as={motion.div}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      open
      onClose={handleClose}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto">
        <Dialog.Panel
          as={motion.div}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="panel mx-auto my-8 flex max-h-[90vh] w-full max-w-lg flex-col shadow-xl"
          aria-busy={mutation.isPending}
        >
          <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700/50">
            <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
              {isEditMode ? 'Çalışma Seansını Düzenle' : 'Yeni Çalışma Seansı'}
            </Dialog.Title>
            <button
              onClick={handleClose}
              disabled={mutation.isPending}
              aria-label="Pencereyi kapat"
              className="p-2 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form
            id="create-session-form"
            onSubmit={handleSubmit(onSubmit)}
            className="p-5 space-y-5 overflow-y-auto flex-1"
          >
            <fieldset
              disabled={mutation.isPending || showDeleteConfirm}
              className="space-y-5 disabled:opacity-60"
            >
              <p className="text-xs text-[var(--muted)]">
                Takvim saat dilimi: {preferences.timezone}
              </p>
              {coursesQuery.isError && (
                <div role="alert">
                  <p>Dersler yüklenemedi.</p>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => void coursesQuery.refetch()}
                  >
                    Dersleri tekrar yükle
                  </button>
                </div>
              )}
              {conflicted && (
                <p role="status" className="text-sm">
                  İşlem çakışma nedeniyle reddedildi. Taslağınız korunuyor;
                  tekrar kaydetmeden önce değerleri kontrol edin.
                </p>
              )}
              {needsRefresh && (
                <div role="alert">
                  <p>Güncel seans okunmadan işlem yapılamaz.</p>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => void reloadSnapshot()}
                  >
                    Güncel seansı yeniden yükle
                  </button>
                </div>
              )}
              {!showDeleteConfirm && mutation.errorMessage && (
                <p role="alert" className="text-sm text-red-600">
                  {mutation.errorMessage}
                </p>
              )}
              {errors.title && (
                <p role="alert" className="text-sm text-red-600">
                  {errors.title.message}
                </p>
              )}
              {/* Study Category Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Çalışma Türü *
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    aria-pressed={sessionCategory === 'course'}
                    onClick={() => setSessionCategory('course')}
                    className={`p-4 rounded-md border transition-colors duration-150 ${
                      sessionCategory === 'course'
                        ? 'border-[var(--solid)] bg-[var(--subtle)] text-[var(--text)]'
                        : 'border-[var(--line)] text-[var(--muted)] hover:bg-[var(--subtle)]'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <BookOpen
                        className={`w-6 h-6 ${sessionCategory === 'course' ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}
                      />
                      <span className="font-medium text-xs">
                        Ders Çalışması
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    aria-pressed={sessionCategory === 'break'}
                    onClick={() => setSessionCategory('break')}
                    className={`p-4 rounded-md border transition-colors duration-150 ${
                      sessionCategory === 'break'
                        ? 'border-[var(--solid)] bg-[var(--subtle)] text-[var(--text)]'
                        : 'border-[var(--line)] text-[var(--muted)] hover:bg-[var(--subtle)]'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Coffee
                        className={`w-6 h-6 ${sessionCategory === 'break' ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}
                      />
                      <span className="font-medium text-xs">Mola</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    aria-pressed={sessionCategory === 'custom'}
                    onClick={() => setSessionCategory('custom')}
                    className={`p-4 rounded-md border transition-colors duration-150 ${
                      sessionCategory === 'custom'
                        ? 'border-[var(--solid)] bg-[var(--subtle)] text-[var(--text)]'
                        : 'border-[var(--line)] text-[var(--muted)] hover:bg-[var(--subtle)]'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Target
                        className={`w-6 h-6 ${sessionCategory === 'custom' ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}
                      />
                      <span className="font-medium text-xs">Özel Görev</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Course Selection, Break, or Custom Title */}
              {sessionCategory === 'course' && (
                <div>
                  <label
                    htmlFor="courseId"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Ders Seçimi *
                  </label>
                  <select
                    {...register('courseId')}
                    id="courseId"
                    className="input"
                  >
                    <option value="">Ders seçin</option>
                    {coursesData?.map((course) => (
                      <option key={course.id} value={course.id.toString()}>
                        {course.name}{' '}
                        {course.category?.name
                          ? `(${course.category.name})`
                          : ''}
                      </option>
                    ))}
                  </select>
                  {errors.courseId && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.courseId.message}
                    </p>
                  )}
                </div>
              )}

              {sessionCategory === 'break' && (
                <div className="rounded-lg border border-[var(--line)] bg-[var(--subtle)] p-3">
                  <p className="flex items-center gap-2 text-sm text-[var(--muted)]">
                    <Coffee className="w-4 h-4" />
                    Mola seansı oluşturuyorsunuz. Süreyi ve zamanı ayarlayın.
                  </p>
                </div>
              )}

              {sessionCategory === 'custom' && (
                <div>
                  <label
                    htmlFor="customTitle"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Özel Görev Başlığı *
                  </label>
                  <input
                    {...register('customTitle')}
                    type="text"
                    id="customTitle"
                    className="input"
                    placeholder="Özel görevinizi tanımlayın"
                  />
                  {errors.customTitle && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.customTitle.message}
                    </p>
                  )}
                </div>
              )}

              {/* Description */}
              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Açıklama
                </label>
                <textarea
                  {...register('description')}
                  id="description"
                  rows={3}
                  className="input"
                  placeholder="Çalışma seansı açıklaması"
                />
              </div>

              {/* Start Date and Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Plan Başlangıç Tarihi ve Saati *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="startDate"
                      className="block text-xs text-gray-600 dark:text-gray-400 mb-1"
                    >
                      Tarih
                    </label>
                    <input
                      {...register('startDate')}
                      type="date"
                      id="startDate"
                      className="input"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="startTime"
                      className="block text-xs text-gray-600 dark:text-gray-400 mb-1"
                    >
                      Saat
                    </label>
                    <input
                      {...register('startTime')}
                      type="time"
                      id="startTime"
                      className="input"
                    />
                  </div>
                </div>
              </div>

              {/* Duration Selection Mode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Süre Seçim Tipi
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDurationMode('minutes')}
                    className={`p-3 rounded-md border transition-colors duration-150 ${
                      durationMode === 'minutes'
                        ? 'border-[var(--solid)] bg-[var(--subtle)] text-[var(--text)]'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Timer
                        className={`w-4 h-4 ${durationMode === 'minutes' ? 'text-primary-500' : 'text-gray-400'}`}
                      />
                      <span className="font-medium text-sm">Dakika</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDurationMode('timeRange')}
                    className={`p-3 rounded-md border transition-colors duration-150 ${
                      durationMode === 'timeRange'
                        ? 'border-[var(--solid)] bg-[var(--subtle)] text-[var(--text)]'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Calendar
                        className={`w-4 h-4 ${durationMode === 'timeRange' ? 'text-purple-500' : 'text-gray-400'}`}
                      />
                      <span className="font-medium text-sm">Saat Aralığı</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Duration Input - Minutes Mode */}
              {durationMode === 'minutes' && (
                <div>
                  <label
                    htmlFor="duration"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Süre (dakika) *
                  </label>
                  <input
                    {...register('duration', { valueAsNumber: true })}
                    type="number"
                    id="duration"
                    min={sessionDurationLimits.minMinutes}
                    max={sessionDurationLimits.maxMinutes}
                    step="any"
                    className="input"
                  />
                  {errors.duration && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.duration.message}
                    </p>
                  )}
                </div>
              )}

              {/* Duration Input - Time Range Mode */}
              {durationMode === 'timeRange' && (
                <div className="space-y-3">
                  <div>
                    <label
                      htmlFor="endTime"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                    >
                      Bitiş Saati *
                    </label>
                    <input
                      {...register('endTime')}
                      type="time"
                      id="endTime"
                      className="input"
                    />
                  </div>

                  {/* Auto-calculated duration display */}
                  <div className="bg-[var(--subtle)] rounded-lg p-3 border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        ⏱️ Toplam Süre:
                      </span>
                      <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                        {(() => {
                          const startDateValue = watch('startDate');
                          const startTimeValue = watch('startTime');
                          const endTimeValue = watch('endTime');

                          if (
                            !startDateValue ||
                            !startTimeValue ||
                            !endTimeValue
                          )
                            return '0 dakika';

                          try {
                            const start = wallTimeToInstant(
                              startDateValue,
                              startTimeValue,
                              preferences.timezone,
                            );
                            const end = wallTimeToInstant(
                              startDateValue,
                              endTimeValue,
                              preferences.timezone,
                            );
                            const duration = differenceInMinutes(end, start);
                            return duration > 0
                              ? `${duration} dakika`
                              : '0 dakika';
                          } catch {
                            return 'Geçersiz saat';
                          }
                        })()}
                      </span>
                    </div>
                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                      Başlangıç ve bitiş saatine göre otomatik hesaplanır
                    </p>
                  </div>
                </div>
              )}

              {/* Session Type */}
              {sessionCategory !== 'break' && (
                <div>
                  <label
                    htmlFor="sessionType"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Seans Türü *
                  </label>
                  <select
                    {...register('sessionType')}
                    id="sessionType"
                    className="input"
                  >
                    <option value="study">Çalışma</option>
                    <option value="pomodoro">Pomodoro</option>
                    <option value="review">Tekrar</option>
                  </select>
                </div>
              )}

              {/* End Time Display - Only for Minutes Mode */}
              {durationMode === 'minutes' && (
                <div className="bg-[var(--subtle)] rounded-lg p-3 border border-primary-200 dark:border-primary-800">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Bitiş saati:
                    </span>
                    <span className="text-lg font-bold text-[var(--text)]">
                      {(() => {
                        const duration = watch('duration') || 60;
                        const startDateValue = watch('startDate');
                        const startTimeValue = watch('startTime');

                        if (!startDateValue || !startTimeValue) return '--:--';

                        try {
                          const start = wallTimeToInstant(
                            startDateValue,
                            startTimeValue,
                            preferences.timezone,
                          );
                          return formatZonedTime(
                            new Date(start.getTime() + duration * 60000),
                            preferences.timezone,
                          );
                        } catch {
                          return 'Geçersiz saat';
                        }
                      })()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1.5 flex items-center gap-1">
                    <Timer className="w-3 h-3" />
                    Başlangıç + {watch('duration') || 60} dakika
                  </p>
                </div>
              )}

              {/* Pomodoro Settings */}
              <AnimatePresence>
                {showPomodoroSettings && (
                  <motion.div
                    key="pomodoro-settings"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="rounded-lg border border-[var(--line)] bg-[var(--subtle)] p-4 space-y-3">
                      <div className="flex items-center gap-2 text-[var(--text)]">
                        <Timer className="w-5 h-5" />
                        <span className="font-medium">Pomodoro Ayarları</span>
                      </div>

                      {/* Preset Buttons */}
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-[var(--muted)]">
                          Hazır Ayarlar:
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setValue('pomodoroSettings.workDuration', 25);
                              setValue('pomodoroSettings.shortBreak', 5);
                              setValue('pomodoroSettings.longBreak', 15);
                              setValue(
                                'pomodoroSettings.cyclesBeforeLongBreak',
                                4,
                              );
                            }}
                            className="btn btn-secondary text-xs"
                          >
                            Klasik (25dk)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setValue('pomodoroSettings.workDuration', 45);
                              setValue('pomodoroSettings.shortBreak', 10);
                              setValue('pomodoroSettings.longBreak', 20);
                              setValue(
                                'pomodoroSettings.cyclesBeforeLongBreak',
                                3,
                              );
                            }}
                            className="btn btn-secondary text-xs"
                          >
                            Uzun (45dk)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setValue('pomodoroSettings.workDuration', 60);
                              setValue('pomodoroSettings.shortBreak', 10);
                              setValue('pomodoroSettings.longBreak', 30);
                              setValue(
                                'pomodoroSettings.cyclesBeforeLongBreak',
                                2,
                              );
                            }}
                            className="btn btn-secondary text-xs"
                          >
                            Maksimum (60dk)
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="workDuration" className="block text-xs font-medium text-[var(--muted)] mb-1">
                            Çalışma (dk)
                          </label>
                          <input
                            id="workDuration"
                            {...register('pomodoroSettings.workDuration', {
                              valueAsNumber: true,
                            })}
                            type="number"
                            min="5"
                            max="90"
                            className="input text-sm"
                          />
                        </div>

                        <div>
                          <label htmlFor="shortBreak" className="block text-xs font-medium text-[var(--muted)] mb-1">
                            Kısa Mola (dk)
                          </label>
                          <input
                            id="shortBreak"
                            {...register('pomodoroSettings.shortBreak', {
                              valueAsNumber: true,
                            })}
                            type="number"
                            min="1"
                            max="30"
                            className="input text-sm"
                          />
                        </div>

                        <div>
                          <label htmlFor="longBreak" className="block text-xs font-medium text-[var(--muted)] mb-1">
                            Uzun Mola (dk)
                          </label>
                          <input
                            id="longBreak"
                            {...register('pomodoroSettings.longBreak', {
                              valueAsNumber: true,
                            })}
                            type="number"
                            min="10"
                            max="60"
                            className="input text-sm"
                          />
                        </div>

                        <div>
                          <label htmlFor="cyclesBeforeLongBreak" className="block text-xs font-medium text-[var(--muted)] mb-1">
                            Döngü Sayısı
                          </label>
                          <input
                            id="cyclesBeforeLongBreak"
                            {...register(
                              'pomodoroSettings.cyclesBeforeLongBreak',
                              { valueAsNumber: true },
                            )}
                            type="number"
                            min="2"
                            max="8"
                            className="input text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Color Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Renk Seçimi
                </label>
                <input type="hidden" {...register('color')} />
                <div className="grid grid-cols-6 gap-2">
                  {SESSION_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() =>
                        setValue('color', color.value, {
                          shouldValidate: true,
                          shouldDirty: true,
                        })
                      }
                      className={`w-10 h-10 rounded-full border-2 transition-all duration-200 ${
                        watch('color') === color.value
                          ? 'border-gray-800 dark:border-gray-200 scale-110 shadow-lg ring-2 ring-offset-2 ring-primary-500'
                          : 'border-gray-300 dark:border-gray-600 hover:scale-105 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                      aria-label={`${color.name} seans rengi`}
                      aria-pressed={watch('color') === color.value}
                    />
                  ))}
                </div>
              </div>
            </fieldset>
            {/* Buttons */}
          </form>

          {/* Footer with buttons */}
          <div className="flex flex-wrap justify-between items-center gap-3 p-5 border-t border-[var(--line)] bg-[var(--surface)]">
            {/* Delete button - left side, only in edit mode */}
            <div>
              {isEditMode && (
                <button
                  type="button"
                  onClick={(e) => handleDelete(e)}
                  disabled={mutation.isPending || needsRefresh}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                  Sil
                </button>
              )}
            </div>

            {/* Cancel and Submit buttons - right side */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={mutation.isPending}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                İptal
              </button>
              <button
                type="submit"
                form="create-session-form"
                disabled={
                  mutation.isPending ||
                  needsRefresh ||
                  showDeleteConfirm ||
                  !isValid ||
                  (sessionCategory === 'course' &&
                    !coursesData?.some(
                      (course) => String(course.id) === watch('courseId'),
                    ))
                }
                className="btn btn-primary"
              >
                {mutation.isPending
                  ? isEditMode
                    ? 'Güncelleniyor...'
                    : 'Oluşturuluyor...'
                  : isEditMode
                    ? 'Güncelle'
                    : 'Oluştur'}
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Seansı sil"
        message={`“${editSession?.title}” seansı ve bu seansa ait ölçüm kayıtları kalıcı olarak silinecek. Bu işlem geri alınamaz.`}
        type="danger"
      >
        {mutation.errorMessage && (
          <p role="alert" className="text-sm text-red-600">
            {mutation.errorMessage}
          </p>
        )}
        {needsRefresh && (
          <p role="alert">
            Güncel seans okunamadı. Bu onayı kapatıp seansı yeniden yükleyin.
          </p>
        )}
      </ConfirmDialog>
    </Dialog>
  );
};

export default function CreateSessionModal({
  isOpen,
  ...props
}: CreateSessionModalProps) {
  return isOpen ? (
    <SessionEditor key={props.editSession?.id ?? 'new'} {...props} />
  ) : null;
}
