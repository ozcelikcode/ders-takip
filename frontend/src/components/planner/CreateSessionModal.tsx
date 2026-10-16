import { calendarViewDate, wallTimeToInstant, formatZonedTime } from '@study-tracker/contracts';
import { format } from '../../utils/calendarDates';
import { pomodoroDefaults } from '@study-tracker/contracts';
import { useUserPreferencesStore } from '../../store/userPreferencesStore';
import { useAccountQueryKeys } from '../../hooks/useAccountQueryKeys';
import { Dialog } from '@headlessui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { differenceInMinutes } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Calendar, Coffee, Target, Timer, Trash2, X } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { coursesAPI, studySessionsAPI } from '../../services/api';
import { CreateStudySessionRequest, StudySession, UpdateStudySessionRequest } from '../../types/planner';
import ConfirmDialog from '../common/ConfirmDialog';

// Color palette for sessions - Soft/Pastel iOS style colors
const SESSION_COLORS = [
  { name: 'Gök Mavisi', value: '#60A5FA', bg: 'bg-blue-400' },
  { name: 'Nane Yeşili', value: '#34D399', bg: 'bg-emerald-400' },
  { name: 'Lavanta', value: '#A78BFA', bg: 'bg-violet-400' },
  { name: 'Mercan', value: '#F87171', bg: 'bg-red-400' },
  { name: 'Kayısı', value: '#FBBF24', bg: 'bg-amber-400' },
  { name: 'Şakayık', value: '#F472B6', bg: 'bg-pink-400' },
  { name: 'Safir', value: '#818CF8', bg: 'bg-indigo-400' },
  { name: 'Deniz', value: '#2DD4BF', bg: 'bg-teal-400' },
  { name: 'Beton', value: '#9CA3AF', bg: 'bg-gray-400' },
  { name: 'Ayçiçeği', value: '#FCD34D', bg: 'bg-yellow-400' },
  { name: 'Okyanus', value: '#38BDF8', bg: 'bg-sky-400' },
  { name: 'Çimen', value: '#4ADE80', bg: 'bg-green-400' },
];

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: Date | undefined;
  selectedHour?: number | undefined;
  editSession?: StudySession | null;
}

const createSessionSchema = z.object({
  sessionCategory: z.enum(['course', 'break', 'custom'], { required_error: 'Çalışma türü seçiniz' }),
  courseId: z.string().optional(),
  customTitle: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  startDate: z.string(),
  startTime: z.string(),
  durationMode: z.enum(['minutes', 'timeRange']),
  duration: z.number().min(5, 'Minimum 5 dakika').max(480, 'Maximum 8 saat'),
  endTime: z.string().optional(),
  sessionType: z.enum(['study', 'break', 'pomodoro', 'review']),
  color: z.string().optional(),
  pomodoroSettings: z.object({
    workDuration: z.number().int().min(1).max(120),
    shortBreak: z.number().int().min(1).max(30),
    longBreak: z.number().int().min(1).max(60),
    cyclesBeforeLongBreak: z.number().int().min(1).max(10),
  }).optional(),
}).superRefine((data, ctx) => {
  if (data.sessionCategory === 'course' && !data.courseId) {
    ctx.addIssue({
      code: 'custom',
      message: 'Ders seçimi gereklidir',
      path: ['courseId']
    });
  }
  if (data.sessionCategory === 'custom' && !data.customTitle) {
    ctx.addIssue({
      code: 'custom',
      message: 'Özel görev başlığı gereklidir',
      path: ['customTitle']
    });
  }
});

type CreateSessionForm = z.infer<typeof createSessionSchema>;

const CreateSessionModal: React.FC<CreateSessionModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  selectedHour = 9,
  editSession,
}) => {
  const accountKeys = useAccountQueryKeys();
  const preferences = useUserPreferencesStore(state => state.preferences);
  const defaultPomodoro = useMemo(() => pomodoroDefaults(preferences), [preferences.defaultPomodoroDuration, preferences.defaultShortBreak, preferences.defaultLongBreak, preferences.pomodorosUntilLongBreak]);
  const [showPomodoroSettings, setShowPomodoroSettings] = useState(false);
  const [sessionCategory, setSessionCategory] = useState<'course' | 'break' | 'custom'>('course');
  const [durationMode, setDurationMode] = useState<'minutes' | 'timeRange'>('minutes');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const queryClient = useQueryClient();
  const isEditMode = !!editSession;

  const { data: coursesData } = useQuery({
    queryKey: accountKeys.catalog('courses'),
    queryFn: async () => {
      const response = await coursesAPI.getCourses();
      return response.data.data?.courses || [];
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    setError,
    formState: { errors, isValid },
  } = useForm<CreateSessionForm>({
    resolver: zodResolver(createSessionSchema),
    mode: 'onChange',
    defaultValues: {
      sessionCategory: 'course',
      startDate: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(calendarViewDate(new Date(), preferences.timezone), 'yyyy-MM-dd'),
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

  const sessionMutation = useMutation({
    mutationFn: async (data: CreateStudySessionRequest | UpdateStudySessionRequest) => {
      if (isEditMode && editSession) {
        const response = await studySessionsAPI.updateSession(editSession, data as UpdateStudySessionRequest);
        return response.data;
      } else {
        const response = await studySessionsAPI.createSession(data as CreateStudySessionRequest);
        return response.data;
      }
    },
    onSuccess: () => {
      toast.success(isEditMode ? 'Çalışma seansı güncellendi' : 'Çalışma seansı oluşturuldu');
      queryClient.invalidateQueries({ queryKey: accountKeys.sessions() });
      onClose();
      reset();
      setSessionCategory('course');
      setDurationMode('minutes');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Bir hata oluştu');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (session: StudySession) => {
      const response = await studySessionsAPI.deleteSession(session);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Çalışma seansı silindi');
      queryClient.invalidateQueries({ queryKey: accountKeys.sessions() });
      onClose();
      reset();
      setSessionCategory('course');
      setDurationMode('minutes');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Seans silinirken hata oluştu');
    },
  });

  const onSubmit = (data: CreateSessionForm) => {
    // Force the correct sessionCategory in case of sync issues
    const correctedData = {
      ...data,
      sessionCategory: sessionCategory
    };

    let startTime: Date;
    let endTime: Date;
    try {
      startTime = wallTimeToInstant(correctedData.startDate, correctedData.startTime, preferences.timezone);
      endTime = durationMode === 'timeRange' && correctedData.endTime
        ? wallTimeToInstant(correctedData.startDate, correctedData.endTime, preferences.timezone)
        : new Date(startTime.getTime() + correctedData.duration * 60000);
      if (endTime <= startTime || endTime.getTime() - startTime.getTime() > 480 * 60000) throw new Error('Invalid session duration');
    } catch {
      setError('startTime', { type: 'validate', message: 'Saat aralığını kontrol edin. Saat diliminde bulunmayan veya iki kez yaşanan saatler seçilemez.' });
      return;
    }

    // Determine title based on session category
    let finalTitle: string;
    if (correctedData.sessionCategory === 'course' && correctedData.courseId) {
      const selectedCourse = coursesData?.find((course: any) => course.id.toString() === correctedData.courseId);
      if (selectedCourse) {
        // Check if course name already contains category to prevent duplication
        const categoryName = selectedCourse.category?.name || '';
        const hasCategory = selectedCourse.name.includes(`(${categoryName})`) ||
          selectedCourse.name.includes(`(${categoryName.toLowerCase()})`);
        finalTitle = hasCategory ? selectedCourse.name : `${selectedCourse.name}${categoryName ? ` (${categoryName})` : ''}`;
      } else {
        finalTitle = 'Ders Çalışması';
      }
    } else if (correctedData.sessionCategory === 'break') {
      finalTitle = 'Mola';
    } else if (correctedData.sessionCategory === 'custom' && correctedData.customTitle) {
      finalTitle = correctedData.customTitle;
    } else {
      finalTitle = 'Çalışma Seansı'; // fallback
    }

    const effectiveSessionType = correctedData.sessionCategory === 'break'
      ? 'break'
      : (correctedData.sessionType === 'break' ? 'study' : correctedData.sessionType);

    const sessionData: CreateStudySessionRequest | UpdateStudySessionRequest = {
      title: finalTitle,
      description: correctedData.description || undefined,
      ...(correctedData.sessionCategory === 'course' && correctedData.courseId
        ? { courseId: parseInt(correctedData.courseId, 10) }
        : (isEditMode ? { courseId: null, topicId: null } : {})),
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      sessionType: effectiveSessionType,
      color: correctedData.color || '#3B82F6',
      ...(effectiveSessionType === 'pomodoro' && correctedData.pomodoroSettings && {
        pomodoroSettings: {
          workDuration: correctedData.pomodoroSettings.workDuration || 25,
          shortBreak: correctedData.pomodoroSettings.shortBreak || 5,
          longBreak: correctedData.pomodoroSettings.longBreak || 15,
          cyclesBeforeLongBreak: correctedData.pomodoroSettings.cyclesBeforeLongBreak || 4,
          currentCycle: 0,
        }
      }),
    };

    sessionMutation.mutate(sessionData);
  };

  const handleClose = () => {
    onClose();
    reset();
    setShowPomodoroSettings(false);
    setSessionCategory('course');
    setDurationMode('minutes');
  };

  const handleDelete = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!editSession) {
      return;
    }
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (!editSession) return;
    deleteMutation.mutate(editSession);
    setShowDeleteConfirm(false);
  };

  // Pre-fill form when editing OR when opening with selected date/hour
  useEffect(() => {
    if (isOpen) {
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

        const sessionStartTime = calendarViewDate(editSession.startTime, preferences.timezone);

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
          startDate: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(calendarViewDate(new Date(), preferences.timezone), 'yyyy-MM-dd'),
          startTime: `${(selectedHour ?? 9).toString().padStart(2, '0')}:00`,
          durationMode: 'minutes',
          duration: 60,
          endTime: '',
          sessionType: 'study',
          color: '#3B82F6',
          pomodoroSettings: defaultPomodoro,
        });
      }
    }
  }, [editSession, isOpen, selectedDate, selectedHour, reset, defaultPomodoro, preferences.timezone]);

  React.useEffect(() => {
    if (sessionType === 'pomodoro') {
      setShowPomodoroSettings(true);
    } else {
      setShowPomodoroSettings(false);
    }
  }, [sessionType]);

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
    if (durationMode === 'timeRange' && watchedEndTime && watchedStartDate && watchedStartTime) {
      try {
        const start = wallTimeToInstant(watchedStartDate, watchedStartTime, preferences.timezone);
        const end = wallTimeToInstant(watchedStartDate, watchedEndTime, preferences.timezone);
        const minutes = differenceInMinutes(end, start);
        if (minutes > 0 && minutes <= 480) setValue('duration', minutes, { shouldValidate: true });
      } catch { /* Submission reports ambiguous or missing wall times. */ }
    }
  }, [watchedEndTime, watchedStartDate, watchedStartTime, durationMode, setValue, preferences.timezone]);

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog
          key="create-session-modal"
          as={motion.div}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          open={isOpen}
          onClose={handleClose}
          className="relative z-50"
        >
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

          <div className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto">
            <Dialog.Panel
              as={motion.div}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="mx-auto max-w-lg w-full bg-[var(--surface)] rounded-lg shadow-lg my-8 max-h-[90vh] flex flex-col border border-gray-200/50 dark:border-gray-700/50"
            >
              <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700/50">
                <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                  {isEditMode ? 'Çalışma Seansını Düzenle' : 'Yeni Çalışma Seansı'}
                </Dialog.Title>
                <button
                  onClick={handleClose}
                  aria-label="Pencereyi kapat"
                  className="p-2 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form id="create-session-form" onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-5 overflow-y-auto flex-1">
                <p className="text-xs text-[var(--muted)]">Takvim saat dilimi: {preferences.timezone}</p>
                {/* Study Category Selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Çalışma Türü *
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setSessionCategory('course')}
                      className={`p-4 rounded-md border transition-colors duration-150 ${sessionCategory === 'course'
                        ? 'border-gray-900 bg-gray-50 text-gray-900 dark:border-gray-300 dark:bg-gray-800 dark:text-white'
                        : 'border-gray-200/80 dark:border-gray-600/80 hover:border-gray-300 dark:hover:border-gray-500 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <BookOpen className={`w-6 h-6 ${sessionCategory === 'course' ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`} />
                        <span className="font-medium text-xs">Ders Çalışması</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSessionCategory('break')}
                      className={`p-4 rounded-md border transition-colors duration-150 ${sessionCategory === 'break'
                        ? 'border-gray-900 bg-gray-50 text-gray-900 dark:border-gray-300 dark:bg-gray-800 dark:text-white'
                        : 'border-gray-200/80 dark:border-gray-600/80 hover:border-gray-300 dark:hover:border-gray-500 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Coffee className={`w-6 h-6 ${sessionCategory === 'break' ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`} />
                        <span className="font-medium text-xs">Mola</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSessionCategory('custom')}
                      className={`p-4 rounded-md border transition-colors duration-150 ${sessionCategory === 'custom'
                        ? 'border-gray-900 bg-gray-50 text-gray-900 dark:border-gray-300 dark:bg-gray-800 dark:text-white'
                        : 'border-gray-200/80 dark:border-gray-600/80 hover:border-gray-300 dark:hover:border-gray-500 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Target className={`w-6 h-6 ${sessionCategory === 'custom' ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`} />
                        <span className="font-medium text-xs">Özel Görev</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Course Selection, Break, or Custom Title */}
                {sessionCategory === 'course' && (
                  <div>
                    <label htmlFor="courseId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Ders Seçimi *
                    </label>
                    <select
                      {...register('courseId')}
                      id="courseId"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">Ders seçin</option>
                      {coursesData?.map((course: any) => (
                        <option key={course.id} value={course.id.toString()}>
                          {course.name} {course.category?.name ? `(${course.category.name})` : ''}
                        </option>
                      ))}
                    </select>
                    {errors.courseId && (
                      <p className="mt-1 text-sm text-red-600">{errors.courseId.message}</p>
                    )}
                  </div>
                )}

                {sessionCategory === 'break' && (
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 border border-orange-200 dark:border-orange-800">
                    <p className="text-sm text-orange-800 dark:text-orange-200 flex items-center gap-2">
                      <Coffee className="w-4 h-4" />
                      Mola seansı oluşturuyorsunuz. Süreyi ve zamanı ayarlayın.
                    </p>
                  </div>
                )}

                {sessionCategory === 'custom' && (
                  <div>
                    <label htmlFor="customTitle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Özel Görev Başlığı *
                    </label>
                    <input
                      {...register('customTitle')}
                      type="text"
                      id="customTitle"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Özel görevinizi tanımlayın"
                    />
                    {errors.customTitle && (
                      <p className="mt-1 text-sm text-red-600">{errors.customTitle.message}</p>
                    )}
                  </div>
                )}




                {/* Description */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Açıklama
                  </label>
                  <textarea
                    {...register('description')}
                    id="description"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
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
                      <label htmlFor="startDate" className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Tarih
                      </label>
                      <input
                        {...register('startDate')}
                        type="date"
                        id="startDate"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label htmlFor="startTime" className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Saat
                      </label>
                      <input
                        {...register('startTime')}
                        type="time"
                        id="startTime"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
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
                      className={`p-3 rounded-md border transition-colors duration-150 ${durationMode === 'minutes'
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                        }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Timer className={`w-4 h-4 ${durationMode === 'minutes' ? 'text-primary-500' : 'text-gray-400'}`} />
                        <span className="font-medium text-sm">Dakika</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDurationMode('timeRange')}
                      className={`p-3 rounded-md border transition-colors duration-150 ${durationMode === 'timeRange'
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                        }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Calendar className={`w-4 h-4 ${durationMode === 'timeRange' ? 'text-purple-500' : 'text-gray-400'}`} />
                        <span className="font-medium text-sm">Saat Aralığı</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Duration Input - Minutes Mode */}
                {durationMode === 'minutes' && (
                  <div>
                    <label htmlFor="duration" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Süre (dakika) *
                    </label>
                    <input
                      {...register('duration', { valueAsNumber: true })}
                      type="number"
                      id="duration"
                      min="5"
                      max="480"
                      step="5"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    />
                    {errors.duration && (
                      <p className="mt-1 text-sm text-red-600">{errors.duration.message}</p>
                    )}
                  </div>
                )}

                {/* Duration Input - Time Range Mode */}
                {durationMode === 'timeRange' && (
                  <div className="space-y-3">
                    <div>
                      <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Bitiş Saati *
                      </label>
                      <input
                        {...register('endTime')}
                        type="time"
                        id="endTime"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
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

                            if (!startDateValue || !startTimeValue || !endTimeValue) return '0 dakika';

                            try {
                              const start = wallTimeToInstant(startDateValue, startTimeValue, preferences.timezone);
                              const end = wallTimeToInstant(startDateValue, endTimeValue, preferences.timezone);
                              const duration = differenceInMinutes(end, start);
                              return duration > 0 ? `${duration} dakika` : '0 dakika';
                            } catch { return 'Geçersiz saat'; }
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
                    <label htmlFor="sessionType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Seans Türü *
                    </label>
                    <select
                      {...register('sessionType')}
                      id="sessionType"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
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
                      <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                        {(() => {
                          const duration = watch('duration') || 60;
                          const startDateValue = watch('startDate');
                          const startTimeValue = watch('startTime');

                          if (!startDateValue || !startTimeValue) return '--:--';

                          try {
                            const start = wallTimeToInstant(startDateValue, startTimeValue, preferences.timezone);
                            return formatZonedTime(new Date(start.getTime() + duration * 60000), preferences.timezone);
                          } catch { return 'Geçersiz saat'; }
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
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg space-y-3 border border-red-200 dark:border-red-800">
                        <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                          <Timer className="w-5 h-5" />
                          <span className="font-medium">Pomodoro Ayarları</span>
                        </div>

                        {/* Preset Buttons */}
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-red-700 dark:text-red-300">Hazır Ayarlar:</p>
                          <div className="grid grid-cols-3 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setValue('pomodoroSettings.workDuration', 25);
                                setValue('pomodoroSettings.shortBreak', 5);
                                setValue('pomodoroSettings.longBreak', 15);
                                setValue('pomodoroSettings.cyclesBeforeLongBreak', 4);
                              }}
                              className="px-3 py-2 text-xs font-medium bg-white dark:bg-gray-700 border border-red-300 dark:border-red-600 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-red-700 dark:text-red-300"
                            >
                              Klasik (25dk)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setValue('pomodoroSettings.workDuration', 45);
                                setValue('pomodoroSettings.shortBreak', 10);
                                setValue('pomodoroSettings.longBreak', 20);
                                setValue('pomodoroSettings.cyclesBeforeLongBreak', 3);
                              }}
                              className="px-3 py-2 text-xs font-medium bg-white dark:bg-gray-700 border border-red-300 dark:border-red-600 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-red-700 dark:text-red-300"
                            >
                              Uzun (45dk)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setValue('pomodoroSettings.workDuration', 60);
                                setValue('pomodoroSettings.shortBreak', 10);
                                setValue('pomodoroSettings.longBreak', 30);
                                setValue('pomodoroSettings.cyclesBeforeLongBreak', 2);
                              }}
                              className="px-3 py-2 text-xs font-medium bg-white dark:bg-gray-700 border border-red-300 dark:border-red-600 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-red-700 dark:text-red-300"
                            >
                              Maksimum (60dk)
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-red-700 dark:text-red-300 mb-1">
                              Çalışma (dk)
                            </label>
                            <input
                              {...register('pomodoroSettings.workDuration', { valueAsNumber: true })}
                              type="number"
                              min="5"
                              max="90"
                              className="w-full px-2 py-1.5 text-sm border border-red-300 dark:border-red-600 rounded focus:outline-none focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-red-700 dark:text-red-300 mb-1">
                              Kısa Mola (dk)
                            </label>
                            <input
                              {...register('pomodoroSettings.shortBreak', { valueAsNumber: true })}
                              type="number"
                              min="1"
                              max="30"
                              className="w-full px-2 py-1.5 text-sm border border-red-300 dark:border-red-600 rounded focus:outline-none focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-red-700 dark:text-red-300 mb-1">
                              Uzun Mola (dk)
                            </label>
                            <input
                              {...register('pomodoroSettings.longBreak', { valueAsNumber: true })}
                              type="number"
                              min="10"
                              max="60"
                              className="w-full px-2 py-1.5 text-sm border border-red-300 dark:border-red-600 rounded focus:outline-none focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-red-700 dark:text-red-300 mb-1">
                              Döngü Sayısı
                            </label>
                            <input
                              {...register('pomodoroSettings.cyclesBeforeLongBreak', { valueAsNumber: true })}
                              type="number"
                              min="2"
                              max="8"
                              className="w-full px-2 py-1.5 text-sm border border-red-300 dark:border-red-600 rounded focus:outline-none focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
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
                        onClick={() => setValue('color', color.value, { shouldValidate: true, shouldDirty: true })}
                        className={`w-10 h-10 rounded-full border-2 transition-all duration-200 ${watch('color') === color.value
                          ? 'border-gray-800 dark:border-gray-200 scale-110 shadow-lg ring-2 ring-offset-2 ring-primary-500'
                          : 'border-gray-300 dark:border-gray-600 hover:scale-105 hover:border-gray-400'
                          }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>



                {/* Buttons */}
              </form>

              {/* Footer with buttons */}
              <div className="flex justify-between items-center gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                {/* Delete button - left side, only in edit mode */}
                <div>
                  {isEditMode && (
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e)}
                      disabled={deleteMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                      {deleteMutation.isPending ? 'Siliniyor...' : 'Sil'}
                    </button>
                  )}
                </div>

                {/* Cancel and Submit buttons - right side */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    form="create-session-form"
                    disabled={sessionMutation.isPending || !isValid}
                    className="btn btn-primary"
                  >
                    {sessionMutation.isPending
                      ? (isEditMode ? 'Güncelleniyor...' : 'Oluşturuluyor...')
                      : (isEditMode ? 'Güncelle' : 'Oluştur')}
                  </button>
                </div>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Görevi Sil"
        message={`"${editSession?.title}" görevini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`}
        type="danger"
      />
    </AnimatePresence>
  );
};

export default CreateSessionModal;