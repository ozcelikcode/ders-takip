import React from 'react';
import { Dialog } from '@headlessui/react';
import { X, BookOpen, Users, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { coursesAPI } from '../../services/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

interface CourseManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCourse?: any | null;
}

const courseSchema = z.object({
  title: z.string().min(1, 'Ders başlığı gereklidir').max(200, 'Ders başlığı çok uzun'),
  description: z.string().optional(),
  instructor: z.string().min(1, 'Eğitmen adı gereklidir').max(100, 'Eğitmen adı çok uzun'),
  category: z.string().min(1, 'Kategori gereklidir'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  duration: z.number().min(1, 'Süre en az 1 saat olmalıdır').max(1000, 'Süre çok uzun'),
  maxStudents: z.number().min(1, 'En az 1 öğrenci olmalıdır').max(1000, 'Çok fazla öğrenci'),
  price: z.number().min(0, 'Fiyat negatif olamaz'),
  tags: z.string().optional(),
  isActive: z.boolean(),
});

type CourseForm = z.infer<typeof courseSchema>;

const CourseManagementModal: React.FC<CourseManagementModalProps> = ({
  isOpen,
  onClose,
  editingCourse,
}) => {
  const queryClient = useQueryClient();
  const isEditing = !!editingCourse;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CourseForm>({
    resolver: zodResolver(courseSchema),
    defaultValues: editingCourse ? {
      title: editingCourse.title,
      description: editingCourse.description,
      instructor: editingCourse.instructor,
      category: editingCourse.category,
      difficulty: editingCourse.difficulty,
      duration: editingCourse.duration,
      maxStudents: editingCourse.maxStudents,
      price: editingCourse.price,
      tags: editingCourse.tags?.join(', '),
      isActive: editingCourse.isActive,
    } : {
      difficulty: 'beginner',
      duration: 10,
      maxStudents: 50,
      price: 0,
      isActive: true,
    },
  });

  const createCourseMutation = useMutation({
    mutationFn: async (data: any) => {
      const courseData = {
        ...data,
        tags: data.tags ? data.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean) : [],
      };

      if (isEditing) {
        const response = await coursesAPI.updateCourse(editingCourse.id.toString(), courseData);
        return response.data;
      } else {
        const response = await coursesAPI.createCourse(courseData);
        return response.data;
      }
    },
    onSuccess: () => {
      toast.success(isEditing ? 'Ders güncellendi' : 'Ders oluşturuldu');
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      onClose();
      reset();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Bir hata oluştu');
    },
  });

  const onSubmit = (data: CourseForm) => {
    createCourseMutation.mutate(data);
  };

  const handleClose = () => {
    onClose();
    reset();
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
                  <BookOpen className="w-5 h-5" />
                  {isEditing ? 'Ders Düzenle' : 'Yeni Ders Oluştur'}
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
                  <h3 className="text-md font-medium text-gray-900 dark:text-white">Temel Bilgiler</h3>

                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Ders Başlığı *
                    </label>
                    <input
                      {...register('title')}
                      type="text"
                      id="title"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Örn: React Temelleri"
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
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Ders hakkında detaylı açıklama..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="instructor" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Eğitmen *
                      </label>
                      <input
                        {...register('instructor')}
                        type="text"
                        id="instructor"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Eğitmen adı"
                      />
                      {errors.instructor && (
                        <p className="mt-1 text-sm text-red-600">{errors.instructor.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Kategori *
                      </label>
                      <select
                        {...register('category')}
                        id="category"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="">Kategori seçin</option>
                        <option value="programming">Programlama</option>
                        <option value="design">Tasarım</option>
                        <option value="business">İş & Yönetim</option>
                        <option value="marketing">Pazarlama</option>
                        <option value="data">Veri Bilimi</option>
                        <option value="other">Diğer</option>
                      </select>
                      {errors.category && (
                        <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Course Details */}
                <div className="space-y-4">
                  <h3 className="text-md font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Ders Detayları
                  </h3>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Zorluk Seviyesi *
                      </label>
                      <select
                        {...register('difficulty')}
                        id="difficulty"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="beginner">Başlangıç</option>
                        <option value="intermediate">Orta</option>
                        <option value="advanced">İleri</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="duration" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Süre (saat) *
                      </label>
                      <input
                        {...register('duration', { valueAsNumber: true })}
                        type="number"
                        id="duration"
                        min="1"
                        max="1000"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                      {errors.duration && (
                        <p className="mt-1 text-sm text-red-600">{errors.duration.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="maxStudents" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Max Öğrenci *
                      </label>
                      <input
                        {...register('maxStudents', { valueAsNumber: true })}
                        type="number"
                        id="maxStudents"
                        min="1"
                        max="1000"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                      {errors.maxStudents && (
                        <p className="mt-1 text-sm text-red-600">{errors.maxStudents.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="price" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Fiyat (₺)
                      </label>
                      <input
                        {...register('price', { valueAsNumber: true })}
                        type="number"
                        id="price"
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                      {errors.price && (
                        <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Etiketler
                      </label>
                      <input
                        {...register('tags')}
                        type="text"
                        id="tags"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="react, javascript, frontend (virgülle ayırın)"
                      />
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      {...register('isActive')}
                      type="checkbox"
                      id="isActive"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900 dark:text-white">
                      Ders aktif mi?
                    </label>
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
                    disabled={createCourseMutation.isPending}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
                  >
                    {createCourseMutation.isPending ?
                      (isEditing ? 'Güncelleniyor...' : 'Oluşturuluyor...') :
                      (isEditing ? 'Güncelle' : 'Oluştur')
                    }
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

export default CourseManagementModal;