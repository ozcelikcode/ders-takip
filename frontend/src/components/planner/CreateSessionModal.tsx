import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { X, Calendar, Timer, BookOpen, Target, Coffee, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { tr } from 'date-fns/locale';
import { CreateStudySessionRequest, StudySession } from '../../types/planner';
import { studySessionsAPI, coursesAPI } from '../../services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import ConfirmDialog from '../common/ConfirmDialog';

// Color palette for sessions
const SESSION_COLORS = [
  { name: 'Mavi', value: '#3B82F6', bg: 'bg-blue-500' },
  { name: 'Yeşil', value: '#10B981', bg: 'bg-emerald-500' },
  { name: 'Mor', value: '#8B5CF6', bg: 'bg-violet-500' },
  { name: 'Kırmızı', value: '#EF4444', bg: 'bg-red-500' },
  { name: 'Turuncu', value: '#F59E0B', bg: 'bg-amber-500' },
  { name: 'Pembe', value: '#EC4899', bg: 'bg-pink-500' },
  { name: 'İndigo', value: '#6366F1', bg: 'bg-indigo-500' },
  { name: 'Teal', value: '#14B8A6', bg: 'bg-teal-500' },
  { name: 'Gri', value: '#6B7280', bg: 'bg-gray-500' },
  { name: 'Sarı', value: '#EAB308', bg: 'bg-yellow-500' },
  { name: 'Lacivert', value: '#1E40AF', bg: 'bg-blue-700' },
  { name: 'Koyu Yeşil', value: '#047857', bg: 'bg-emerald-700' },
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
    workDuration: z.number().min(5).max(90),
    shortBreak: z.number().min(1).max(30),
    longBreak: z.number().min(10).max(60),
    cyclesBeforeLongBreak: z.number().min(2).max(8),
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
  const [showPomodoroSettings, setShowPomodoroSettings] = useState(false);
  const [sessionCategory, setSessionCategory] = useState<'course' | 'break' | 'custom'>('course');
  const [durationMode, setDurationMode] = useState<'minutes' | 'timeRange'>('minutes');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const queryClient = useQueryClient();
  const isEditMode = !!editSession;

  const { data: coursesData } = useQuery({
    queryKey: ['courses'],
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
    formState: { errors, isValid },
  } = useForm<CreateSessionForm>({
    resolver: zodResolver(createSessionSchema),
    mode: 'onChange',
    defaultValues: {
      sessionCategory: 'course',
      startDate: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      startTime: `${selectedHour.toString().padStart(2, '0')}:00`,
      durationMode: 'minutes',
      duration: 60,
      endTime: '',
      sessionType: 'study',
      color: '#3B82F6', // Default blue color
      pomodoroSettings: {
        workDuration: 25,
        shortBreak: 5,
        longBreak: 15,
        cyclesBeforeLongBreak: 4,
      },
    },
  });

  const sessionType = watch('sessionType');

  const sessionMutation = useMutation({
    mutationFn: async (data: CreateStudySessionRequest) => {
      if (isEditMode && editSession) {
        const response = await studySessionsAPI.updateSession(editSession.id.toString(), data);
        return response.data;
      } else {
        const response = await studySessionsAPI.createSession(data);
        return response.data;
      }
    },
    onSuccess: () => {
      toast.success(isEditMode ? 'Çalışma seansı güncellendi' : 'Çalışma seansı oluşturuldu');
      queryClient.invalidateQueries({ queryKey: ['study-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['todays-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['daily-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['pomodoro-sessions'] });
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
    mutationFn: async (sessionId: string) => {
      const response = await studySessionsAPI.deleteSession(sessionId);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Çalışma seansı silindi');
      queryClient.invalidateQueries({ queryKey: ['study-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['todays-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['daily-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['pomodoro-sessions'] });
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

    // Parse start date and time from form
    const [startHours, startMinutes] = correctedData.startTime.split(':').map(Number);
    const startTime = new Date(correctedData.startDate);
    startTime.setHours(startHours, startMinutes, 0, 0);

    // Calculate end time based on duration
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + correctedData.duration);

    // Determine title based on session category
    let finalTitle: string;
    if (correctedData.sessionCategory === 'course' && correctedData.courseId) {
      const selectedCourse = coursesData?.find((course: any) => course.id.toString() === correctedData.courseId);
      if (selectedCourse) {
        // Check if course name already contains category to prevent duplication
        const hasCategory = selectedCourse.name.includes(`(${selectedCourse.category})`) ||
                          selectedCourse.name.includes(`(${selectedCourse.category.toLowerCase()})`);
        finalTitle = hasCategory ? selectedCourse.name : `${selectedCourse.name} (${selectedCourse.category})`;
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

    const sessionData: CreateStudySessionRequest = {
      title: finalTitle,
      description: correctedData.description || undefined,
      ...(correctedData.courseId && { courseId: parseInt(correctedData.courseId) }),
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration: correctedData.duration,
      sessionType: correctedData.sessionType,
      color: correctedData.color || '#3B82F6',
      ...(correctedData.sessionType === 'pomodoro' && correctedData.pomodoroSettings && {
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

  const handleDelete = () => {
    if (!editSession) return;
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!editSession) return;

    try {
      await deleteMutation.mutateAsync(editSession.id.toString());
      setShowDeleteConfirm(false);
    } catch (error) {
      // Error already handled by mutation onError
      setShowDeleteConfirm(false);
    }
  };

  // Pre-fill form when editing
  useEffect(() => {
    if (editSession && isOpen) {
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

      const sessionStartTime = parseISO(editSession.startTime);

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
        pomodoroSettings: editSession.pomodoroSettings || {
          workDuration: 25,
          shortBreak: 5,
          longBreak: 15,
          cyclesBeforeLongBreak: 4,
        },
      });
    }
  }, [editSession, isOpen, reset]);

  React.useEffect(() => {
    if (sessionType === 'pomodoro') {
      setShowPomodoroSettings(true);
    } else {
      setShowPomodoroSettings(false);
    }
  }, [sessionType]);

  React.useEffect(() => {
    setValue('sessionCategory', sessionCategory);
    // Mola seçildiğinde sessionType'ı break yap
    if (sessionCategory === 'break') {
      setValue('sessionType', 'break');
    }
  }, [sessionCategory, setValue]);

  React.useEffect(() => {
    setValue('durationMode', durationMode);
  }, [durationMode, setValue]);

  // Saat aralığı modunda bitiş saatinden süreyi hesapla
  const watchedEndTime = watch('endTime');
  const watchedStartDate = watch('startDate');
  const watchedStartTime = watch('startTime');

  React.useEffect(() => {
    if (durationMode === 'timeRange' && watchedEndTime && watchedStartDate && watchedStartTime) {
      // Parse start time from form
      const [startHours, startMinutes] = watchedStartTime.split(':').map(Number);
      const startTime = new Date(watchedStartDate);
      startTime.setHours(startHours, startMinutes, 0, 0);

      // Parse end time
      const [endHours, endMinutes] = watchedEndTime.split(':').map(Number);
      const endTime = new Date(watchedStartDate);
      endTime.setHours(endHours, endMinutes, 0, 0);

      const durationInMinutes = differenceInMinutes(endTime, startTime);

      if (durationInMinutes > 0 && durationInMinutes <= 480) {
        setValue('duration', durationInMinutes, { shouldValidate: true });
      }
    }
  }, [watchedEndTime, watchedStartDate, watchedStartTime, durationMode, setValue]);

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog
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
              className="mx-auto max-w-lg w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl my-8 max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                  {isEditMode ? 'Çalışma Seansını Düzenle' : 'Yeni Çalışma Seansı'}
                </Dialog.Title>
                <button
                  onClick={handleClose}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form id="create-session-form" onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 overflow-y-auto flex-1">
                {/* Study Category Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Çalışma Türü *
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setSessionCategory('course')}
                      className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                        sessionCategory === 'course'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1.5">
                        <BookOpen className={`w-5 h-5 ${sessionCategory === 'course' ? 'text-blue-500' : 'text-gray-400'}`} />
                        <span className="font-medium text-xs">Ders Çalışması</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSessionCategory('break')}
                      className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                        sessionCategory === 'break'
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1.5">
                        <Coffee className={`w-5 h-5 ${sessionCategory === 'break' ? 'text-orange-500' : 'text-gray-400'}`} />
                        <span className="font-medium text-xs">Mola</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSessionCategory('custom')}
                      className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                        sessionCategory === 'custom'
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1.5">
                        <Target className={`w-5 h-5 ${sessionCategory === 'custom' ? 'text-green-500' : 'text-gray-400'}`} />
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
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">Ders seçin</option>
                       {coursesData?.map((course: any) => (
                        <option key={course.id} value={course.id.toString()}>
                          {course.name} ({course.category})
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
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
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
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
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
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
                      className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                        durationMode === 'minutes'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Timer className={`w-4 h-4 ${durationMode === 'minutes' ? 'text-blue-500' : 'text-gray-400'}`} />
                        <span className="font-medium text-sm">Dakika</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDurationMode('timeRange')}
                      className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                        durationMode === 'timeRange'
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
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
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
                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
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

                            const [startHours, startMinutes] = startTimeValue.split(':').map(Number);
                            const startTime = new Date(startDateValue);
                            startTime.setHours(startHours, startMinutes, 0, 0);

                            const [endHours, endMinutes] = endTimeValue.split(':').map(Number);
                            const endTime = new Date(startDateValue);
                            endTime.setHours(endHours, endMinutes, 0, 0);

                            const duration = differenceInMinutes(endTime, startTime);

                            return duration > 0 ? `${duration} dakika` : '0 dakika';
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
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="study">Çalışma</option>
                      <option value="pomodoro">Pomodoro</option>
                      <option value="review">Tekrar</option>
                    </select>
                  </div>
                )}

                 {/* End Time Display - Only for Minutes Mode */}
                 {durationMode === 'minutes' && (
                   <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                     <div className="flex items-center justify-between">
                       <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                         📅 Bitiş Saati:
                       </span>
                       <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                         {(() => {
                           const duration = watch('duration') || 60;
                           const startDateValue = watch('startDate');
                           const startTimeValue = watch('startTime');

                           if (!startDateValue || !startTimeValue) return '--:--';

                           const [startHours, startMinutes] = startTimeValue.split(':').map(Number);
                           const startTime = new Date(startDateValue);
                           startTime.setHours(startHours, startMinutes, 0, 0);

                           const endTime = new Date(startTime);
                           endTime.setMinutes(endTime.getMinutes() + duration);

                           return format(endTime, 'HH:mm');
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
                          className={`w-10 h-10 rounded-full border-2 transition-all duration-200 ${
                            watch('color') === color.value
                              ? 'border-gray-800 dark:border-gray-200 scale-110 shadow-lg ring-2 ring-offset-2 ring-blue-500'
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
                      onClick={handleDelete}
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
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
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
        title="Çalışma Seansını Sil"
        message="Bu çalışma seansını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz."
        type="danger"
      />
    </AnimatePresence>
  );
};

export default CreateSessionModal;