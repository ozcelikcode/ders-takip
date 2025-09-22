import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { X, Calendar, Timer, BookOpen, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { CreateStudySessionRequest } from '../../types/planner';
import { studySessionsAPI, plansAPI, coursesAPI } from '../../services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

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
}

const createSessionSchema = z.object({
  sessionCategory: z.enum(['course', 'custom'], { required_error: 'Çalışma türü seçiniz' }),
  courseId: z.string().optional(),
  customTitle: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  planId: z.string().optional(),
  duration: z.number().min(15, 'Minimum 15 dakika').max(480, 'Maximum 8 saat'),
  sessionType: z.enum(['study', 'break', 'pomodoro', 'review']),
  color: z.string().optional(),
  pomodoroSettings: z.object({
    workDuration: z.number().min(5).max(60),
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
}) => {
  const [showPomodoroSettings, setShowPomodoroSettings] = useState(false);
  const [sessionCategory, setSessionCategory] = useState<'course' | 'custom'>('course');
  const queryClient = useQueryClient();

  const { data: plansData } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const response = await plansAPI.getPlans({ isActive: true });
      return response.data.data?.plans || [];
    },
  });

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
      duration: 60,
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

  const createSessionMutation = useMutation({
    mutationFn: async (data: CreateStudySessionRequest) => {
      const response = await studySessionsAPI.createSession(data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Çalışma seansı oluşturuldu');
      queryClient.invalidateQueries({ queryKey: ['study-sessions'] });
      onClose();
      reset();
      setSessionCategory('course');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Bir hata oluştu');
    },
  });

  const onSubmit = (data: CreateSessionForm) => {
    // Force the correct sessionCategory in case of sync issues
    const correctedData = {
      ...data,
      sessionCategory: sessionCategory
    };

    if (!selectedDate) return;

    const startTime = new Date(selectedDate);
    startTime.setHours(selectedHour, 0, 0, 0);

    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + data.duration);

    // Determine title based on session category
    let finalTitle: string;
    if (correctedData.sessionCategory === 'course' && correctedData.courseId) {
      const selectedCourse = coursesData?.find((course: any) => course.id.toString() === correctedData.courseId);
      finalTitle = selectedCourse ? `${selectedCourse.name} Çalışması` : 'Ders Çalışması';
    } else if (correctedData.sessionCategory === 'custom' && correctedData.customTitle) {
      finalTitle = correctedData.customTitle;
    } else {
      finalTitle = 'Çalışma Seansı'; // fallback
    }

    const sessionData: CreateStudySessionRequest = {
      title: finalTitle,
      description: correctedData.description || undefined,
      ...(correctedData.planId && { planId: parseInt(correctedData.planId) }),
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

    createSessionMutation.mutate(sessionData);
  };

  const handleClose = () => {
    onClose();
    reset();
    setShowPomodoroSettings(false);
    setSessionCategory('course');
  };

  React.useEffect(() => {
    if (sessionType === 'pomodoro') {
      setShowPomodoroSettings(true);
    } else {
      setShowPomodoroSettings(false);
    }
  }, [sessionType]);

  React.useEffect(() => {
    setValue('sessionCategory', sessionCategory);
  }, [sessionCategory, setValue]);

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
                  Yeni Çalışma Seansı
                </Dialog.Title>
                <button
                  onClick={handleClose}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form id="create-session-form" onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 overflow-y-auto flex-1">
                {/* Date & Time Display */}
                {selectedDate && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm text-blue-900 dark:text-blue-100">
                      {format(selectedDate, 'dd MMMM yyyy', { locale: tr })} - {selectedHour}:00
                    </span>
                  </div>
                )}

                {/* Study Category Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Çalışma Türü *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSessionCategory('course')}
                      className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                        sessionCategory === 'course'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <BookOpen className={`w-6 h-6 ${sessionCategory === 'course' ? 'text-blue-500' : 'text-gray-400'}`} />
                        <span className="font-medium text-sm">Ders Çalışması</span>
                        <span className="text-xs opacity-75">Mevcut derslerden seçin</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSessionCategory('custom')}
                      className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                        sessionCategory === 'custom'
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Target className={`w-6 h-6 ${sessionCategory === 'custom' ? 'text-green-500' : 'text-gray-400'}`} />
                        <span className="font-medium text-sm">Özel Görev</span>
                        <span className="text-xs opacity-75">Kişisel çalışma planı</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Course Selection or Custom Title */}
                {sessionCategory === 'course' ? (
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
                ) : (
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

                {/* Plan Selection */}
                <div>
                  <label htmlFor="planId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Plan
                  </label>
                  <select
                    {...register('planId')}
                    id="planId"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Plan seçin (opsiyonel)</option>
                    {plansData?.map((plan) => (
                      <option key={plan.id} value={plan.id.toString()}>
                        {plan.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Duration & Session Type */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="duration" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Süre (dakika) *
                    </label>
                    <input
                      {...register('duration', { valueAsNumber: true })}
                      type="number"
                      id="duration"
                      min="15"
                      max="480"
                      step="15"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                    {errors.duration && (
                      <p className="mt-1 text-sm text-red-600">{errors.duration.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="sessionType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tür *
                    </label>
                    <select
                      {...register('sessionType')}
                      id="sessionType"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="study">Çalışma</option>
                      <option value="pomodoro">Pomodoro</option>
                      <option value="review">Tekrar</option>
                      <option value="break">Mola</option>
                    </select>
                  </div>
                 </div>

                 {/* Color Selection */}
                 <div>
                   <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                     Renk Seçimi
                   </label>
                   <div className="grid grid-cols-6 gap-2">
                     {SESSION_COLORS.map((color) => (
                       <button
                         key={color.value}
                         type="button"
                         onClick={() => setValue('color', color.value)}
                         className={`w-8 h-8 rounded-full border-2 transition-all duration-200 ${
                           watch('color') === color.value
                             ? 'border-gray-400 dark:border-gray-300 scale-110 shadow-lg'
                             : 'border-gray-200 dark:border-gray-600 hover:scale-105'
                         }`}
                         style={{ backgroundColor: color.value }}
                         title={color.name}
                       />
                     ))}
                   </div>
                 </div>

                 {/* Pomodoro Settings */}
                <AnimatePresence>
                  {showPomodoroSettings && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg space-y-3">
                        <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                          <Timer className="w-4 h-4" />
                          <span className="font-medium">Pomodoro Ayarları</span>
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
                              max="60"
                              className="w-full px-2 py-1 text-sm border border-red-300 dark:border-red-600 rounded focus:outline-none focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
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
                              className="w-full px-2 py-1 text-sm border border-red-300 dark:border-red-600 rounded focus:outline-none focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
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
                              className="w-full px-2 py-1 text-sm border border-red-300 dark:border-red-600 rounded focus:outline-none focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
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
                              className="w-full px-2 py-1 text-sm border border-red-300 dark:border-red-600 rounded focus:outline-none focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white"
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>



                 {/* Buttons */}
               </form>

              {/* Footer with buttons */}
              <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
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
                   disabled={createSessionMutation.isPending || !isValid}
                   className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
                 >
                  {createSessionMutation.isPending ? 'Oluşturuluyor...' : 'Oluştur'}
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
};

export default CreateSessionModal;