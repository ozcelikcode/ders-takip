import React from 'react';
import { Dialog } from '@headlessui/react';
import { X, Target, Clock, Calendar, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CreatePlanRequest } from '../../types/planner';
import { plansAPI } from '../../services/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

interface GoalSettingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const createGoalSchema = z.object({
  title: z.string().min(1, 'Plan başlığı gereklidir').max(100, 'Plan başlığı çok uzun'),
  description: z.string().optional(),
  startDate: z.string().min(1, 'Başlangıç tarihi gereklidir'),
  endDate: z.string().min(1, 'Bitiş tarihi gereklidir'),
  dailyHours: z.number().min(0.5, 'Minimum 0.5 saat').max(24, 'Maximum 24 saat'),
  weeklyHours: z.number().min(1, 'Minimum 1 saat').max(168, 'Maximum 168 saat'),
  targetTopics: z.number().min(1, 'Minimum 1 konu').max(100, 'Maximum 100 konu'),
  priority: z.enum(['low', 'medium', 'high']),
}).refine((data) => new Date(data.endDate) > new Date(data.startDate), {
  message: 'Bitiş tarihi başlangıç tarihinden sonra olmalıdır',
  path: ['endDate'],
});

type CreateGoalForm = z.infer<typeof createGoalSchema>;

const GoalSettingModal: React.FC<GoalSettingModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateGoalForm>({
    resolver: zodResolver(createGoalSchema),
    defaultValues: {
      dailyHours: 4,
      weeklyHours: 28,
      targetTopics: 10,
      priority: 'medium',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    },
  });

  const dailyHours = watch('dailyHours');
  const weeklyHours = watch('weeklyHours');
  const startDate = watch('startDate');
  const endDate = watch('endDate');

  const createPlanMutation = useMutation({
    mutationFn: async (data: CreatePlanRequest) => {
      const response = await plansAPI.createPlan(data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Hedef planı oluşturuldu');
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      onClose();
      reset();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Bir hata oluştu');
    },
  });

  const onSubmit = (data: CreateGoalForm) => {
    const planData: CreatePlanRequest = {
      title: data.title,
      description: data.description,
      startDate: data.startDate,
      endDate: data.endDate,
      goals: {
        dailyHours: data.dailyHours,
        weeklyHours: data.weeklyHours,
        targetTopics: data.targetTopics,
        priority: data.priority,
      },
    };

    createPlanMutation.mutate(planData);
  };

  const handleClose = () => {
    onClose();
    reset();
  };

  const calculateWeeksFromDates = () => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
      return diffWeeks;
    }
    return 0;
  };

  const calculateTotalHours = () => {
    const weeks = calculateWeeksFromDates();
    return weeks * weeklyHours;
  };

  const calculateRecommendedTopics = () => {
    const totalHours = calculateTotalHours();
    // Assume 3 hours per topic on average
    return Math.round(totalHours / 3);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

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

          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel
              as={motion.div}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="mx-auto max-w-2xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Yeni Hedef Planı Oluştur
                </Dialog.Title>
                <button
                  onClick={handleClose}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="text-md font-medium text-gray-900 dark:text-white">Plan Bilgileri</h3>

                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Plan Başlığı *
                    </label>
                    <input
                      {...register('title')}
                      type="text"
                      id="title"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Örn: React Öğrenme Planı"
                    />
                    {errors.title && (
                      <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Açıklama
                    </label>
                    <textarea
                      {...register('description')}
                      id="description"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Plan hakkında detaylar..."
                    />
                  </div>

                  {/* Date Range */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">Plan Dönemi</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Başlangıç Tarihi *
                        </label>
                        <div className="relative">
                          <input
                            {...register('startDate')}
                            type="date"
                            id="startDate"
                            className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                        {errors.startDate && (
                          <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Bitiş Tarihi *
                        </label>
                        <div className="relative">
                          <input
                            {...register('endDate')}
                            type="date"
                            id="endDate"
                            className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                        {errors.endDate && (
                          <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>
                        )}
                      </div>
                    </div>

                    {/* Duration Info */}
                    {startDate && endDate && (
                      <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Plan Süresi:</span>
                          <span className="font-semibold text-blue-600 dark:text-blue-400">
                            {calculateWeeksFromDates()} hafta
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Time Goals */}
                <div className="space-y-4">
                  <h3 className="text-md font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Zaman Hedefleri
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="dailyHours" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Günlük Hedef (saat) *
                      </label>
                      <input
                        {...register('dailyHours', { valueAsNumber: true })}
                        type="number"
                        id="dailyHours"
                        min="0.5"
                        max="24"
                        step="0.5"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                      {errors.dailyHours && (
                        <p className="mt-1 text-sm text-red-600">{errors.dailyHours.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="weeklyHours" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Haftalık Hedef (saat) *
                      </label>
                      <input
                        {...register('weeklyHours', { valueAsNumber: true })}
                        type="number"
                        id="weeklyHours"
                        min="1"
                        max="168"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                      {errors.weeklyHours && (
                        <p className="mt-1 text-sm text-red-600">{errors.weeklyHours.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Weekly hours validation */}
                  {dailyHours && weeklyHours && dailyHours * 7 > weeklyHours && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                      <p className="text-sm text-amber-800">
                        ⚠️ Günlük hedef × 7 ({dailyHours * 7} saat) haftalık hedeften büyük.
                        Haftalık hedefi {Math.ceil(dailyHours * 7)} saate yükseltmeyi düşünün.
                      </p>
                    </div>
                  )}
                </div>

                {/* Topic Goals */}
                <div className="space-y-4">
                  <h3 className="text-md font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Konu Hedefleri
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="targetTopics" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Hedef Konu Sayısı *
                      </label>
                      <input
                        {...register('targetTopics', { valueAsNumber: true })}
                        type="number"
                        id="targetTopics"
                        min="1"
                        max="100"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Önerilen: {calculateRecommendedTopics()} konu ({calculateTotalHours()} saat / 3 saat/konu)
                      </p>
                      {errors.targetTopics && (
                        <p className="mt-1 text-sm text-red-600">{errors.targetTopics.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Öncelik *
                      </label>
                      <select
                        {...register('priority')}
                        id="priority"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="low">Düşük</option>
                        <option value="medium">Orta</option>
                        <option value="high">Yüksek</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Plan Özeti</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-blue-700 dark:text-blue-300">
                        📅 Süre: <span className="font-medium">{calculateWeeksFromDates()} hafta</span>
                      </p>
                      <p className="text-blue-700 dark:text-blue-300">
                        ⏰ Toplam Saat: <span className="font-medium">{calculateTotalHours()} saat</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-blue-700 dark:text-blue-300">
                        🎯 Hedef Konu: <span className="font-medium">{watch('targetTopics')} konu</span>
                      </p>
                      <p className="text-blue-700 dark:text-blue-300">
                        📊 Öncelik: <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(watch('priority'))}`}>
                          {watch('priority') === 'high' ? 'Yüksek' : watch('priority') === 'medium' ? 'Orta' : 'Düşük'}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={createPlanMutation.isPending}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
                  >
                    {createPlanMutation.isPending ? 'Oluşturuluyor...' : 'Plan Oluştur'}
                  </button>
                </div>
              </form>
            </Dialog.Panel>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
};

export default GoalSettingModal;