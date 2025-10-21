import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Edit2, Trash2, Tag, X } from 'lucide-react';
import { categoriesAPI } from '../../services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Dialog } from '@headlessui/react';
import { AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import ConfirmDialog from '../../components/common/ConfirmDialog';

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

const AdminCategoriesPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
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

  const { data: categoriesData, isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const response = await categoriesAPI.getCategories();
      return response.data.data?.categories || [];
    },
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      description: '',
      color: '#3b82f6',
      icon: '',
      order: 1,
      isActive: true,
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: CategoryForm) => {
      await categoriesAPI.createCategory(data);
    },
    onSuccess: () => {
      toast.success('Kategori oluşturuldu');
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      handleCloseModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Kategori oluşturma başarısız');
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CategoryForm }) => {
      await categoriesAPI.updateCategory(id, data);
    },
    onSuccess: () => {
      toast.success('Kategori güncellendi');
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      handleCloseModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Kategori güncelleme başarısız');
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async ({ id, migrateToCategoryId }: { id: string; migrateToCategoryId?: number }) => {
      await categoriesAPI.deleteCategory(id, migrateToCategoryId);
    },
    onSuccess: () => {
      toast.success('Kategori silindi');
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Silme işlemi başarısız');
    },
  });

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    reset({
      name: category.name,
      description: category.description || '',
      color: category.color,
      icon: category.icon || '',
      order: category.order,
      isActive: category.isActive,
    });
    setIsCreateModalOpen(true);
  };

  const handleDeleteCategory = (categoryId: string, categoryName: string) => {
    setDeleteConfirm({
      isOpen: true,
      categoryId,
      categoryName,
    });
  };

  const confirmDeleteCategory = () => {
    deleteCategoryMutation.mutate({
      id: deleteConfirm.categoryId,
      migrateToCategoryId: deleteConfirm.migrateToCategoryId,
    });
    setDeleteConfirm({ isOpen: false, categoryId: '', categoryName: '' });
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    setEditingCategory(null);
    reset();
  };

  const onSubmit = (data: CategoryForm) => {
    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id.toString(), data });
    } else {
      createCategoryMutation.mutate(data);
    }
  };

  const filteredCategories = (categoriesData as Category[])?.filter((category) =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Kategori Yönetimi</h1>
        <p className="text-gray-600 dark:text-gray-400">İş, Eğitim, Projeler gibi görev kategorilerini yönetin</p>
      </div>

      {/* Actions Bar */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
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
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Yeni Kategori
        </button>
      </div>

      {/* Categories Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map((category) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card hover:shadow-lg transition-shadow"
            >
              <div className="card-body">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: category.color }}
                    >
                      <Tag className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{category.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Sıra: {category.order}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditCategory(category)}
                      className="p-2 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                      title="Düzenle"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category.id.toString(), category.name)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {category.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {category.description}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    category.isActive
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                    {category.isActive ? 'Aktif' : 'Pasif'}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {filteredCategories.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <Tag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Kategori bulunamadı</h3>
          <p className="text-gray-500 dark:text-gray-400">
            {searchTerm ? 'Arama kriterlerinize uygun kategori yok' : 'Henüz kategori eklenmemiş'}
          </p>
        </div>
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <Dialog
            open={isCreateModalOpen}
            onClose={handleCloseModal}
            className="relative z-50"
          >
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
              <Dialog.Panel
                as={motion.div}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mx-auto max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-xl"
              >
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                  <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                    {editingCategory ? 'Kategori Düzenle' : 'Yeni Kategori Ekle'}
                  </Dialog.Title>
                  <button
                    onClick={handleCloseModal}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Kategori Adı *
                    </label>
                    <input
                      {...register('name')}
                      type="text"
                      className="input"
                      placeholder="ör. İş, Eğitim, Projeler"
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Açıklama
                    </label>
                    <textarea
                      {...register('description')}
                      rows={3}
                      className="input"
                      placeholder="Kategori açıklaması"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Renk *
                      </label>
                      <input
                        {...register('color')}
                        type="color"
                        className="w-full h-10 rounded border border-gray-300 dark:border-gray-600"
                      />
                      {errors.color && (
                        <p className="mt-1 text-sm text-red-600">{errors.color.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Sıra *
                      </label>
                      <input
                        {...register('order', { valueAsNumber: true })}
                        type="number"
                        min="1"
                        className="input"
                      />
                      {errors.order && (
                        <p className="mt-1 text-sm text-red-600">{errors.order.message}</p>
                      )}
                    </div>
                  </div>

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

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="btn btn-secondary flex-1"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary flex-1"
                      disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                    >
                      {editingCategory ? 'Güncelle' : 'Oluştur'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </div>
          </Dialog>
        )}
      </AnimatePresence>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, categoryId: '', categoryName: '' })}
        onConfirm={confirmDeleteCategory}
        title="Kategori Sil"
        message={`"${deleteConfirm.categoryName}" kategorisini silmek istediğinizden emin misiniz? Bu kategorideki dersler "Kategorisiz" olarak işaretlenecektir.`}
        type="danger"
      />
    </div>
  );
};

export default AdminCategoriesPage;
