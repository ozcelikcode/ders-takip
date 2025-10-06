import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Edit2, Trash2, BookOpen, Eye, MoreVertical } from 'lucide-react';
import { coursesAPI } from '../../services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Menu } from '@headlessui/react';
import toast from 'react-hot-toast';
import { Dialog } from '@headlessui/react';
import { X } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

interface Course {
  id: number;
  name: string;
  category: 'TYT' | 'AYT';
  description?: string;
  color: string;
  icon?: string;
  order: number;
  isActive: boolean;
}

const courseSchema = z.object({
  name: z.string().min(1, 'Ders adı gereklidir').max(100, 'Ders adı çok uzun'),
  category: z.enum(['TYT', 'AYT'], { required_error: 'Kategori seçiniz' }),
  description: z.string().optional(),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Geçerli bir renk kodu girin'),
  icon: z.string().optional(),
  order: z.number().min(1, 'Sıra en az 1 olmalıdır'),
  isActive: z.boolean(),
});

type CourseForm = z.infer<typeof courseSchema>;

const AdminCoursesPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const queryClient = useQueryClient();

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
    if (confirm(`"${courseName}" dersini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve dersin tüm konularını da silecektir.`)) {
      deleteCourseMutation.mutate(courseId);
    }
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    setEditingCourse(null);
  };

  const filteredCourses = (coursesData as Course[])?.filter((course) =>
    course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.category.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getCategoryColor = (category: string) => {
    return category === 'TYT'
      ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400'
      : 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400';
  };

  const iconList = ['BookOpen', 'Calculator', 'Microscope', 'Globe', 'Triangle', 'Atom', 'FlaskConical', 'Dna', 'Landmark', 'Map', 'Brain', 'Heart', 'BookText'];

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
          Yeni Ders
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
              className="card hover:shadow-lg transition-shadow"
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
                              className={`flex items-center gap-2 w-full px-4 py-2 text-sm text-left ${
                                active ? 'bg-gray-100 dark:bg-gray-700' : ''
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
                              className={`flex items-center gap-2 w-full px-4 py-2 text-sm text-left ${
                                active ? 'bg-gray-100 dark:bg-gray-700' : ''
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
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(course.category)}`}>
                      {course.category}
                    </span>
                    {!course.isActive && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-700 dark:text-gray-400">
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
}

const CourseModal: React.FC<CourseModalProps> = ({ isOpen, onClose, editingCourse, iconList }) => {
  const queryClient = useQueryClient();
  const isEditing = !!editingCourse;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CourseForm>({
    resolver: zodResolver(courseSchema),
    defaultValues: editingCourse || {
      category: 'TYT',
      color: '#3b82f6',
      icon: 'BookOpen',
      order: 1,
      isActive: true,
    },
  });

  React.useEffect(() => {
    if (editingCourse) {
      reset(editingCourse);
    } else {
      reset({
        category: 'TYT',
        color: '#3b82f6',
        icon: 'BookOpen',
        order: 1,
        isActive: true,
      });
    }
  }, [editingCourse, reset]);

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
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Kategori *
                  </label>
                  <select
                    {...register('category')}
                    id="category"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="TYT">TYT</option>
                    <option value="AYT">AYT</option>
                  </select>
                  {errors.category && (
                    <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
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
                  <label htmlFor="icon" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    İkon
                  </label>
                  <select
                    {...register('icon')}
                    id="icon"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    {iconList.map((icon) => (
                      <option key={icon} value={icon}>
                        {icon}
                      </option>
                    ))}
                  </select>
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