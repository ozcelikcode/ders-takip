import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Edit2, Trash2, BookOpen, Eye, MoreVertical, Calculator, Book, Globe, Triangle, Atom, Beaker, Dna, Building, MapPin, Brain, Heart, Bookmark, Pen, Pencil, FileText, BookMarked, GraduationCap, Award, Globe2, Clock, Music, Palette, Code, Database, BarChart3, TrendingUp, Target, Lightbulb, Sparkles } from 'lucide-react';
import { coursesAPI, categoriesAPI } from '../../services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Menu } from '@headlessui/react';
import toast from 'react-hot-toast';
import { Dialog } from '@headlessui/react';
import { X } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import ConfirmDialog from '../../components/common/ConfirmDialog';

interface Category {
  id: number;
  name: string;
  color: string;
  icon?: string;
}

interface Course {
  id: number;
  name: string;
  categoryId: number;
  category?: Category;
  description?: string;
  color: string;
  icon?: string;
  order: number;
  isActive: boolean;
  isGlobal: boolean;
  userId?: number | null;
}

const courseSchema = z.object({
  name: z.string().min(1, 'Ders adı gereklidir').max(100, 'Ders adı çok uzun'),
  categoryId: z.number({ required_error: 'Kategori seçiniz' }).min(1, 'Kategori seçiniz'),
  description: z.string().optional(),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Geçerli bir renk kodu girin'),
  icon: z.string().optional(),
  order: z.number().min(1, 'Sıra en az 1 olmalıdır'),
  isActive: z.boolean(),
  isGlobal: z.boolean(),
});

type CourseForm = z.infer<typeof courseSchema>;

const AdminCoursesPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; courseId: string; courseName: string }>({
    isOpen: false,
    courseId: '',
    courseName: '',
  });
  const queryClient = useQueryClient();

  const { data: categoriesData } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const response = await categoriesAPI.getCategories();
      return response.data.data?.categories || [];
    },
  });

  const { data: coursesData, isLoading } = useQuery({
    queryKey: ['admin-courses'],
    queryFn: async () => {
      const response = await coursesAPI.getCourses();
      return response.data.data?.courses || [];
    },
  });

  const deleteCourseMutation = useMutation({
    mutationFn: async (courseId: string) => {
      await coursesAPI.deleteCourse(courseId);
    },
    onSuccess: () => {
      toast.success('Ders silindi');
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Silme işlemi başarısız');
    },
  });

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course);
    setIsCreateModalOpen(true);
  };

  const handleDeleteCourse = (courseId: string, courseName: string) => {
    setDeleteConfirm({
      isOpen: true,
      courseId,
      courseName,
    });
  };

  const confirmDeleteCourse = () => {
    deleteCourseMutation.mutate(deleteConfirm.courseId);
    setDeleteConfirm({ isOpen: false, courseId: '', courseName: '' });
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    setEditingCourse(null);
  };

  const filteredCourses = (coursesData as Course[])?.filter((course) =>
    course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.category?.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Icon mapping for rendering
  const iconComponents: Record<string, React.ComponentType<any>> = {
    BookOpen, Calculator, Book, Globe, Triangle, Atom, Beaker, Dna,
    Building, MapPin, Brain, Heart, Bookmark, Pen, Pencil, FileText, BookMarked,
    GraduationCap, Award, Globe2, Clock, Music, Palette, Code,
    Database, BarChart3, TrendingUp, Target, Lightbulb, Sparkles
  };

  const iconList = Object.keys(iconComponents);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ders Yönetimi</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Toplam {coursesData?.length || 0} ders
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          Yeni Zorunlu Ders
        </button>
      </div>

      {/* Search */}
      <div className="card">
        <div className="card-body">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Ders adı veya kategori ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Courses List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCourses.length === 0 ? (
          <div className="col-span-full card">
            <div className="card-body text-center py-12">
              <div className="text-gray-400 mb-4">
                <BookOpen className="w-12 h-12 mx-auto mb-4" />
                <p>
                  {searchTerm ? 'Arama kriterlerine uygun ders bulunamadı' : 'Henüz ders eklenmemiş'}
                </p>
              </div>
              {!searchTerm && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  İlk dersi ekle
                </button>
              )}
            </div>
          </div>
        ) : (
          filteredCourses.map((course, index) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="card hover:shadow-lg dark:hover:shadow-primary-900/20 hover:border-primary-300 dark:hover:border-primary-700 transition-all"
            >
              <div className="card-body">
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-white"
                    style={{ backgroundColor: course.color }}
                  >
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <Menu as="div" className="relative">
                    <Menu.Button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </Menu.Button>
                    <Menu.Items className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                      <div className="py-1">
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={() => handleEditCourse(course)}
                              className={`flex items-center gap-2 w-full px-4 py-2 text-sm text-left ${active ? 'bg-gray-100 dark:bg-gray-700' : ''
                                } text-gray-700 dark:text-gray-300`}
                            >
                              <Edit2 className="w-4 h-4" />
                              Düzenle
                            </button>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={() => handleDeleteCourse(course.id.toString(), course.name)}
                              className={`flex items-center gap-2 w-full px-4 py-2 text-sm text-left ${active ? 'bg-gray-100 dark:bg-gray-700' : ''
                                } text-red-600 dark:text-red-400`}
                            >
                              <Trash2 className="w-4 h-4" />
                              Sil
                            </button>
                          )}
                        </Menu.Item>
                      </div>
                    </Menu.Items>
                  </Menu>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {course.name}
                  </h3>

                  <div className="flex items-center gap-2">
                    {course.category && (
                      <span
                        className="px-2 py-1 rounded-full text-xs font-medium border"
                        style={{
                          backgroundColor: `${course.category.color}20`,
                          borderColor: course.category.color,
                          color: course.category.color
                        }}
                      >
                        {course.category.name}
                      </span>
                    )}
                    {course.isGlobal && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-600 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800">
                        Zorunlu
                      </span>
                    )}
                    {!course.isActive && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700">
                        Pasif
                      </span>
                    )}
                  </div>

                  {course.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {course.description}
                    </p>
                  )}

                  <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                    Sıra: {course.order}
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Course Modal */}
      <CourseModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseModal}
        editingCourse={editingCourse}
        iconList={iconList}
        categories={categoriesData as Category[] || []}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, courseId: '', courseName: '' })}
        onConfirm={confirmDeleteCourse}
        title="Dersi Sil"
        message={`"${deleteConfirm.courseName}" dersini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve dersin tüm konularını da silecektir.`}
        type="danger"
      />
    </div>
  );
};

// Course Modal Component
interface CourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCourse: Course | null;
  iconList: string[];
  categories: Category[];
}

const CourseModal: React.FC<CourseModalProps> = ({ isOpen, onClose, editingCourse, iconList, categories }) => {
  const queryClient = useQueryClient();
  const isEditing = !!editingCourse;
  const [selectedIcon, setSelectedIcon] = useState(editingCourse?.icon || 'BookOpen');

  // Icon mapping
  const iconComponents: Record<string, React.ComponentType<any>> = {
    BookOpen, Calculator, Book, Globe, Triangle, Atom, Beaker, Dna,
    Building, MapPin, Brain, Heart, Bookmark, Pen, Pencil, FileText, BookMarked,
    GraduationCap, Award, Globe2, Clock, Music, Palette, Code,
    Database, BarChart3, TrendingUp, Target, Lightbulb, Sparkles
  };

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CourseForm>({
    resolver: zodResolver(courseSchema),
    defaultValues: editingCourse ? {
      name: editingCourse.name,
      categoryId: editingCourse.categoryId,
      description: editingCourse.description,
      color: editingCourse.color,
      icon: editingCourse.icon || 'BookOpen',
      order: editingCourse.order,
      isActive: editingCourse.isActive,
      isGlobal: editingCourse.isGlobal,
    } : {
      categoryId: categories[0]?.id || 0,
      color: '#3b82f6',
      icon: 'BookOpen',
      order: 1,
      isActive: true,
      isGlobal: true,
    },
  });

  React.useEffect(() => {
    if (editingCourse) {
      reset({
        name: editingCourse.name,
        categoryId: editingCourse.categoryId,
        description: editingCourse.description,
        color: editingCourse.color,
        icon: editingCourse.icon || 'BookOpen',
        order: editingCourse.order,
        isActive: editingCourse.isActive,
        isGlobal: editingCourse.isGlobal,
      });
      setSelectedIcon(editingCourse.icon || 'BookOpen');
    } else {
      reset({
        categoryId: categories[0]?.id || 0,
        color: '#3b82f6',
        icon: 'BookOpen',
        order: 1,
        isActive: true,
        isGlobal: true,
      });
      setSelectedIcon('BookOpen');
    }
  }, [editingCourse, reset, categories]);

  const createCourseMutation = useMutation({
    mutationFn: async (data: CourseForm) => {
      if (isEditing) {
        const response = await coursesAPI.updateCourse(editingCourse.id.toString(), data);
        return response.data;
      } else {
        const response = await coursesAPI.createCourse(data);
        return response.data;
      }
    },
    onSuccess: () => {
      toast.success(isEditing ? 'Ders güncellendi' : 'Ders oluşturuldu');
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
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
              className="mx-auto max-w-lg w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl max-h-[90vh] overflow-y-auto"
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

              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Ders Adı *
                  </label>
                  <input
                    {...register('name')}
                    type="text"
                    id="name"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Örn: Türkçe, Matematik"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Kategori *
                  </label>
                  <select
                    {...register('categoryId', { valueAsNumber: true })}
                    id="categoryId"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Kategori seçin</option>
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

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Açıklama
                  </label>
                  <textarea
                    {...register('description')}
                    id="description"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Ders hakkında kısa açıklama..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="color" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Renk *
                    </label>
                    <input
                      {...register('color')}
                      type="color"
                      id="color"
                      className="w-full h-10 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
                    />
                    {errors.color && (
                      <p className="mt-1 text-sm text-red-600">{errors.color.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="order" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Sıra *
                    </label>
                    <input
                      {...register('order', { valueAsNumber: true })}
                      type="number"
                      id="order"
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                    {errors.order && (
                      <p className="mt-1 text-sm text-red-600">{errors.order.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    İkon Seç
                  </label>
                  <div className="grid grid-cols-6 gap-2 p-3 border border-gray-300 dark:border-gray-600 rounded-md max-h-48 overflow-y-auto">
                    {iconList.map((iconName) => {
                      const IconComponent = iconComponents[iconName];
                      return (
                        <button
                          key={iconName}
                          type="button"
                          onClick={() => {
                            setSelectedIcon(iconName);
                            setValue('icon', iconName);
                          }}
                          className={`p-2 rounded-md border-2 transition-all ${selectedIcon === iconName
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                            }`}
                          title={iconName}
                        >
                          {IconComponent && <IconComponent className="w-5 h-5 mx-auto text-gray-700 dark:text-gray-300" />}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Seçili: {selectedIcon}
                  </p>
                </div>

                <div className="flex items-center gap-6">
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

                  <div className="flex items-center">
                    <input
                      {...register('isGlobal')}
                      type="checkbox"
                      id="isGlobal"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isGlobal" className="ml-2 block text-sm text-gray-900 dark:text-white">
                      Zorunlu ders mi?
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
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
                    {createCourseMutation.isPending
                      ? (isEditing ? 'Güncelleniyor...' : 'Oluşturuluyor...')
                      : (isEditing ? 'Güncelle' : 'Oluştur')
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

export default AdminCoursesPage;