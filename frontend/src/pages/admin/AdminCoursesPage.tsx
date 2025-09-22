import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Edit2, Trash2, Users, Clock, DollarSign, Eye, MoreVertical } from 'lucide-react';
import { coursesAPI } from '../../services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import CourseManagementModal from '../../components/admin/CourseManagementModal';
import { Menu } from '@headlessui/react';
import toast from 'react-hot-toast';

const AdminCoursesPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any>(null);
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

  const handleEditCourse = (course: any) => {
    setEditingCourse(course);
    setIsCreateModalOpen(true);
  };

  const handleDeleteCourse = (courseId: string) => {
    if (confirm('Bu dersi silmek istediğinizden emin misiniz?')) {
      deleteCourseMutation.mutate(courseId);
    }
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    setEditingCourse(null);
  };

  const filteredCourses = coursesData?.filter((course: any) =>
    course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.instructor.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.category.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800 border-green-200';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'advanced': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'Başlangıç';
      case 'intermediate': return 'Orta';
      case 'advanced': return 'İleri';
      default: return difficulty;
    }
  };

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
              placeholder="Ders adı, eğitmen veya kategori ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Courses List */}
      <div className="space-y-4">
        {filteredCourses.length === 0 ? (
          <div className="card">
            <div className="card-body text-center py-12">
              <div className="text-gray-400 mb-4">
                <Users className="w-12 h-12 mx-auto mb-4" />
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
          filteredCourses.map((course: any, index: number) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="card hover:shadow-lg transition-shadow"
            >
              <div className="card-body">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {course.title}
                      </h3>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(course.difficulty)}`}
                      >
                        {getDifficultyText(course.difficulty)}
                      </span>
                      {!course.isActive && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                          Pasif
                        </span>
                      )}
                    </div>

                    <p className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                      {course.description}
                    </p>

                    <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>Eğitmen: {course.instructor}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{course.duration} saat</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>Max {course.maxStudents} öğrenci</span>
                      </div>
                      {course.price > 0 && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          <span>{course.price} ₺</span>
                        </div>
                      )}
                    </div>

                    {course.tags && course.tags.length > 0 && (
                      <div className="flex items-center gap-2 mt-3">
                        {course.tags.slice(0, 3).map((tag: string, tagIndex: number) => (
                          <span
                            key={tagIndex}
                            className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-md"
                          >
                            {tag}
                          </span>
                        ))}
                        {course.tags.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{course.tags.length - 3} etiket
                          </span>
                        )}
                      </div>
                    )}
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
                              onClick={() => handleDeleteCourse(course.id.toString())}
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
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Course Management Modal */}
      <CourseManagementModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseModal}
        editingCourse={editingCourse}
      />
    </div>
  );
};

export default AdminCoursesPage;