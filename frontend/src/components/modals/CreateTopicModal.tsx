import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { topicsAPI } from '../../services/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Dialog } from '@headlessui/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const topicSchema = z.object({
  name: z.string().min(1, 'Konu adı gereklidir').max(200, 'Konu adı çok uzun'),
  description: z.string().optional(),
  estimatedTime: z.number().min(1, 'Tahmini süre en az 1 dakika olmalıdır').max(999, 'Tahmini süre çok uzun'),
  difficulty: z.enum(['Kolay', 'Orta', 'Zor'], { required_error: 'Zorluk seviyesi seçiniz' }),
});

type TopicForm = z.infer<typeof topicSchema>;

interface CreateTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: number;
}

const CreateTopicModal: React.FC<CreateTopicModalProps> = ({ isOpen, onClose, courseId }) => {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<TopicForm>({
    resolver: zodResolver(topicSchema),
    defaultValues: {
      name: '',
      description: '',
      estimatedTime: 30,
      difficulty: 'Orta',
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: TopicForm) =>
      topicsAPI.createTopic({
        ...data,
        courseId,
      }),
    onSuccess: () => {
      toast.success('Konu başarıyla oluşturuldu');
      queryClient.invalidateQueries({ queryKey: ['course', courseId.toString()] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      handleClose();
    },
    onError: () => {
      toast.error('Konu oluşturulurken hata oluştu');
    },
  });

  const onSubmit = (data: TopicForm) => {
    createMutation.mutate(data);
  };

  const handleClose = () => {
    reset();
    onClose();
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
              className="mx-auto max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl flex flex-col max-h-[90vh]"
            >
              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                  <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                    Yeni Konu Ekle
                  </Dialog.Title>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Konu Adı *
                    </label>
                    <input
                      {...register('name')}
                      type="text"
                      placeholder="ör. Limit, Türev, Integral"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Açıklama
                    </label>
                    <textarea
                      {...register('description')}
                      rows={2}
                      placeholder="Konu açıklaması..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  {/* Estimated Time and Difficulty */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Estimated Time */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Tahmini Süre (dk) *
                      </label>
                      <input
                        {...register('estimatedTime', { valueAsNumber: true })}
                        type="number"
                        min="1"
                        max="999"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                      />
                      {errors.estimatedTime && (
                        <p className="mt-1 text-sm text-red-600">{errors.estimatedTime.message}</p>
                      )}
                    </div>

                    {/* Difficulty */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Zorluk *
                      </label>
                      <select
                        {...register('difficulty')}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="Kolay">Kolay</option>
                        <option value="Orta">Orta</option>
                        <option value="Zor">Zor</option>
                      </select>
                      {errors.difficulty && (
                        <p className="mt-1 text-sm text-red-600">{errors.difficulty.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {createMutation.isPending ? 'Oluşturuluyor...' : 'Oluştur'}
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

export default CreateTopicModal;
