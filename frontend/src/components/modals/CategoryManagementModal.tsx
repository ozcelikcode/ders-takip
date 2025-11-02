import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Edit2, Trash2, Tag, X, BookOpen, Calculator, Book, Globe, Triangle, Atom, Beaker, Dna, Building, MapPin, Brain, Heart, Bookmark, Pen, Pencil, FileText, BookMarked, GraduationCap, Award, Globe2, Clock, Music, Palette, Code, Database, BarChart3, TrendingUp, Target, Lightbulb, Sparkles, Briefcase, Users, MoreHorizontal } from 'lucide-react';
import { categoriesAPI } from '../../services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Dialog } from '@headlessui/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import ConfirmDialog from '../common/ConfirmDialog';

interface Category {
  id: number;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  order: number;
  isActive: boolean;
}

const categorySchema = z.object({
  name: z.string().min(1, 'Kategori adı gereklidir').max(100, 'Kategori adı çok uzun'),
  description: z.string().optional(),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Geçerli bir renk kodu girin'),
  icon: z.string().optional(),
  order: z.number().min(1, 'Sıra en az 1 olmalıdır'),
  isActive: z.boolean(),
});

type CategoryForm = z.infer<typeof categorySchema>;

interface CategoryManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CategoryManagementModal: React.FC<CategoryManagementModalProps> = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [selectedIcon, setSelectedIcon] = useState('Tag');
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    categoryId: string;
    categoryName: string;
    migrateToCategoryId?: number;
  }>({
    isOpen: false,
    categoryId: '',
    categoryName: '',
  });
  const queryClient = useQueryClient();

  const availableIcons = [
    { name: 'Tag', component: Tag },
    { name: 'Briefcase', component: Briefcase },
    { name: 'GraduationCap', component: GraduationCap },
    { name: 'Sparkles', component: Sparkles },
    { name: 'Heart', component: Heart },
    { name: 'Code', component: Code },
    { name: 'Users', component: Users },
    { name: 'MoreHorizontal', component: MoreHorizontal },
    { name: 'BookOpen', component: BookOpen },
    { name: 'Calculator', component: Calculator },
    { name: 'Globe', component: Globe },
    { name: 'Brain', component: Brain },
    { name: 'Target', component: Target },
    { name: 'Lightbulb', component: Lightbulb },
  ];

  const { data: categoriesData, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesAPI.getCategories(),
    enabled: isOpen,
  });

  const categories: Category[] = categoriesData?.data?.data?.categories || [];

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      description: '',
      color: '#3b82f6',
      icon: 'Tag',
      order: categories.length + 1,
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CategoryForm) => categoriesAPI.createCategory(data),
    onSuccess: () => {
      toast.success('Kategori başarıyla oluşturuldu');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      handleCloseCreateModal();
    },
    onError: () => {
      toast.error('Kategori oluşturulurken hata oluştu');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CategoryForm> }) =>
      categoriesAPI.updateCategory(id, data),
    onSuccess: () => {
      toast.success('Kategori başarıyla güncellendi');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      handleCloseCreateModal();
    },
    onError: () => {
      toast.error('Kategori güncellenirken hata oluştu');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriesAPI.deleteCategory(id),
    onSuccess: () => {
      toast.success('Kategori başarıyla silindi');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
    onError: () => {
      toast.error('Kategori silinirken hata oluştu');
    },
  });

  const onSubmit = (data: CategoryForm) => {
    const formData = {
      ...data,
      icon: selectedIcon,
    };

    if (editingCategory) {
      updateMutation.mutate({
        id: editingCategory.id.toString(),
        data: formData,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setEditingCategory(null);
    setSelectedIcon('Tag');
    reset({
      name: '',
      description: '',
      color: '#3b82f6',
      icon: 'Tag',
      order: categories.length + 1,
      isActive: true,
    });
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setSelectedIcon(category.icon || 'Tag');
    setValue('name', category.name);
    setValue('description', category.description || '');
    setValue('color', category.color);
    setValue('icon', category.icon || 'Tag');
    setValue('order', category.order);
    setValue('isActive', category.isActive);
    setIsCreateModalOpen(true);
  };

  const handleDelete = (category: Category) => {
    setDeleteConfirm({
      isOpen: true,
      categoryId: category.id.toString(),
      categoryName: category.name,
    });
  };

  const confirmDelete = () => {
    if (deleteConfirm.categoryId) {
      deleteMutation.mutate(deleteConfirm.categoryId);
      setDeleteConfirm({
        isOpen: false,
        categoryId: '',
        categoryName: '',
      });
    }
  };

  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getIconComponent = (iconName?: string) => {
    const icon = availableIcons.find((i) => i.name === iconName);
    return icon ? icon.component : Tag;
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <Dialog
            as={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            open={isOpen}
            onClose={onClose}
            className="relative z-50"
          >
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

            <div className="fixed inset-0 flex items-center justify-center p-4">
              <Dialog.Panel
                as={motion.div}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="mx-auto max-w-4xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl max-h-[90vh] flex flex-col"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                  <div>
                    <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-white">
                      Kategori Yönetimi
                    </Dialog.Title>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      İş, Eğitim, Projeler gibi görev kategorilerini yönetin
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {/* Search and Create */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Kategori ara..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                    <button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Yeni Kategori
                    </button>
                  </div>

                  {/* Categories List */}
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredCategories.map((category) => {
                        const IconComponent = getIconComponent(category.icon);
                        return (
                          <div
                            key={category.id}
                            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                <div
                                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                                  style={{ backgroundColor: category.color }}
                                >
                                  <IconComponent className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1">
                                  <h3 className="font-medium text-gray-900 dark:text-white">
                                    {category.name}
                                  </h3>
                                  {category.description && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                      {category.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleEdit(category)}
                                  className="p-2 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(category)}
                                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Dialog.Panel>
            </div>
          </Dialog>
        )}
      </AnimatePresence>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <Dialog
            as={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            open={isCreateModalOpen}
            onClose={handleCloseCreateModal}
            className="relative z-[60]"
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
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                      {editingCategory ? 'Kategoriyi Düzenle' : 'Yeni Kategori Oluştur'}
                    </Dialog.Title>
                  </div>

                  <div className="p-6 space-y-3 overflow-y-auto flex-1">
                    {/* Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Kategori Adı *
                      </label>
                      <input
                        {...register('name')}
                        type="text"
                        placeholder="ör. İş, Eğitim, Projeler"
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
                        placeholder="Kategori açıklaması..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    {/* Color */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Renk *
                      </label>
                      <input
                        {...register('color')}
                        type="color"
                        className="w-full h-10 border border-gray-300 dark:border-gray-600 rounded-lg"
                      />
                      {errors.color && (
                        <p className="mt-1 text-sm text-red-600">{errors.color.message}</p>
                      )}
                    </div>

                    {/* Icon */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        İkon
                      </label>
                      <div className="grid grid-cols-7 gap-1.5">
                        {availableIcons.map((icon) => {
                          const IconComp = icon.component;
                          return (
                            <button
                              key={icon.name}
                              type="button"
                              onClick={() => setSelectedIcon(icon.name)}
                              className={`p-1.5 rounded border-2 transition-colors ${
                                selectedIcon === icon.name
                                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                  : 'border-gray-300 dark:border-gray-600 hover:border-primary-300'
                              }`}
                            >
                              <IconComp className="w-4 h-4 mx-auto text-gray-700 dark:text-gray-300" />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Order and Active */}
                    <div className="grid grid-cols-2 gap-3">
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
                      <div className="flex items-end pb-2">
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
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0">
                    <button
                      type="button"
                      onClick={handleCloseCreateModal}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {createMutation.isPending || updateMutation.isPending
                        ? 'Kaydediliyor...'
                        : editingCategory
                        ? 'Güncelle'
                        : 'Oluştur'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </div>
          </Dialog>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() =>
          setDeleteConfirm({
            isOpen: false,
            categoryId: '',
            categoryName: '',
          })
        }
        onConfirm={confirmDelete}
        title="Kategoriyi Sil"
        message={`"${deleteConfirm.categoryName}" kategorisini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`}
        type="danger"
      />
    </>
  );
};

export default CategoryManagementModal;
