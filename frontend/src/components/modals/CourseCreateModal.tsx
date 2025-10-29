import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, Calculator, Globe, Brain, Heart, Code, Target, Lightbulb, Sparkles, Briefcase, Users, MoreHorizontal, GraduationCap, Tag } from 'lucide-react';
import { coursesAPI, categoriesAPI } from '../../services/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Dialog } from '@headlessui/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

interface Category {
  id: number;
  name: string;
  color: string;
  icon?: string;
}

const courseSchema = z.object({
  name: z.string().min(1, 'Ders adı gereklidir').max(100, 'Ders adı çok uzun'),
  categoryId: z.number({ required_error: 'Kategori seçiniz' }).min(1, 'Kategori seçiniz'),
  description: z.string().optional(),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Geçerli bir renk kodu girin'),
  icon: z.string().optional(),
  order: z.number().min(1, 'Sıra en az 1 olmalıdır'),
  isActive: z.boolean(),
});

type CourseForm = z.infer<typeof courseSchema>;

interface CourseCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CourseCreateModal: React.FC<CourseCreateModalProps> = ({ isOpen, onClose }) => {
  const [selectedIcon, setSelectedIcon] = useState('BookOpen');
  const queryClient = useQueryClient();

  const availableIcons = [
    { name: 'BookOpen', component: BookOpen },
    { name: 'Calculator', component: Calculator },
    { name: 'Globe', component: Globe },
    { name: 'Brain', component: Brain },
    { name: 'Heart', component: Heart },
    { name: 'Code', component: Code },
    { name: 'Target', component: Target },
    { name: 'Lightbulb', component: Lightbulb },
    { name: 'Sparkles', component: Sparkles },
    { name: 'Briefcase', component: Briefcase },
    { name: 'Users', component: Users },
    { name: 'GraduationCap', component: GraduationCap },
    { name: 'Tag', component: Tag },
    { name: 'MoreHorizontal', component: MoreHorizontal },
  ];

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await categoriesAPI.getCategories();
      return response.data.data?.categories || [];
    },
    enabled: isOpen,
  });

  const categories: Category[] = categoriesData || [];

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<CourseForm>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      name: '',
      categoryId: 0,
      description: '',
      color: '#3b82f6',
      icon: 'BookOpen',
      order: 1,
      isActive: true,
    },
  });

  const selectedCategoryId = watch('categoryId');
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  const createMutation = useMutation({
    mutationFn: (data: CourseForm) => coursesAPI.createCourse(data),
    onSuccess: () => {
      toast.success('Ders başarıyla oluşturuldu');
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      handleClose();
    },
    onError: () => {
      toast.error('Ders oluşturulurken hata oluştu');
    },
  });

  const onSubmit = (data: CourseForm) => {
    const formData = {
      ...data,
      icon: selectedIcon,
    };
    createMutation.mutate(formData);
  };

  const handleClose = () => {
    reset();
    setSelectedIcon('BookOpen');
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
              className="mx-auto max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl max-h-[90vh] flex flex-col"
            >
              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                  <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                    Yeni Ders Oluştur
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
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Kategori *
                    </label>
                    <select
                      {...register('categoryId', { valueAsNumber: true })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value={0}>Kategori seçin</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    {errors.categoryId && (
                      <p className="mt-1 text-sm text-red-600">{errors.categoryId.message}</p>
                    )}
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Ders Adı *
                    </label>
                    <input
                      {...register('name')}
                      type="text"
                      placeholder="ör. Matematik, Fizik, React"
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
                      rows={3}
                      placeholder="Ders açıklaması..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  {/* Color */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Renk *
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        {...register('color')}
                        type="color"
                        className="w-16 h-10 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer"
                      />
                      {selectedCategory && (
                        <button
                          type="button"
                          onClick={() => {
                            const colorInput = document.querySelector('input[type="color"]') as HTMLInputElement;
                            if (colorInput) {
                              colorInput.value = selectedCategory.color;
                              // Trigger change event
                              const event = new Event('input', { bubbles: true });
                              colorInput.dispatchEvent(event);
                            }
                          }}
                          className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
                        >
                          Kategori rengini kullan
                        </button>
                      )}
                    </div>
                    {errors.color && (
                      <p className="mt-1 text-sm text-red-600">{errors.color.message}</p>
                    )}
                  </div>

                  {/* Icon */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      İkon
                    </label>
                    <div className="grid grid-cols-7 gap-2">
                      {availableIcons.map((icon) => {
                        const IconComp = icon.component;
                        return (
                          <button
                            key={icon.name}
                            type="button"
                            onClick={() => setSelectedIcon(icon.name)}
                            className={`p-2 rounded-lg border-2 transition-colors ${
                              selectedIcon === icon.name
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                : 'border-gray-300 dark:border-gray-600 hover:border-primary-300'
                            }`}
                          >
                            <IconComp className="w-5 h-5 mx-auto text-gray-700 dark:text-gray-300" />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Order */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Sıra *
                    </label>
                    <input
                      {...register('order', { valueAsNumber: true })}
                      type="number"
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                    />
                    {errors.order && (
                      <p className="mt-1 text-sm text-red-600">{errors.order.message}</p>
                    )}
                  </div>

                  {/* Is Active */}
                  <div className="flex items-center gap-2">
                    <input
                      {...register('isActive')}
                      type="checkbox"
                      id="isActive"
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <label htmlFor="isActive" className="text-sm text-gray-700 dark:text-gray-300">
                      Aktif
                    </label>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
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

export default CourseCreateModal;
