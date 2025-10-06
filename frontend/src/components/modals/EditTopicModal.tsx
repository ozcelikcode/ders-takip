import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Clock, Target, AlertCircle, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { topicsAPI } from '../../services/api';
import { UpdateTopicRequest, Topic } from '../../types/planner';
import toast from 'react-hot-toast';

interface EditTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic: Topic;
  existingTopics: { id: number; name: string; order: number }[];
}

const EditTopicModal: React.FC<EditTopicModalProps> = ({
  isOpen,
  onClose,
  topic,
  existingTopics,
}) => {
  const [formData, setFormData] = useState<UpdateTopicRequest>({
    name: topic.name,
    description: topic.description || '',
    estimatedTime: topic.estimatedTime,
    difficulty: topic.difficulty,
    order: topic.order,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const queryClient = useQueryClient();

  const updateTopicMutation = useMutation({
    mutationFn: (data: UpdateTopicRequest) => topicsAPI.updateTopic(topic.id.toString(), data),
    onSuccess: () => {
      toast.success('Konu başarıyla güncellendi');
      queryClient.invalidateQueries({ queryKey: ['course'] });
      queryClient.invalidateQueries({ queryKey: ['topics'] });
      onClose();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error?.message || 'Konu güncellenirken bir hata oluştu';
      toast.error(errorMessage);
    },
  });

  const deleteTopicMutation = useMutation({
    mutationFn: () => topicsAPI.deleteTopic(topic.id.toString()),
    onSuccess: () => {
      toast.success('Konu başarıyla silindi');
      queryClient.invalidateQueries({ queryKey: ['course'] });
      queryClient.invalidateQueries({ queryKey: ['topics'] });
      onClose();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error?.message || 'Konu silinirken bir hata oluştu';
      toast.error(errorMessage);
    },
  });

  // Reset form when topic changes
  useEffect(() => {
    if (topic) {
      setFormData({
        name: topic.name,
        description: topic.description || '',
        estimatedTime: topic.estimatedTime,
        difficulty: topic.difficulty,
        order: topic.order,
      });
      setErrors({});
    }
  }, [topic]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Konu adı gereklidir';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Konu adı en az 2 karakter olmalıdır';
    } else {
      // Check if name conflicts with other topics (excluding current topic)
      const conflictingTopic = existingTopics.find(
        t => t.id !== topic.id && t.name.toLowerCase() === formData.name.trim().toLowerCase()
      );
      if (conflictingTopic) {
        newErrors.name = 'Bu isimde başka bir konu zaten mevcut';
      }
    }

    if (formData.estimatedTime && (formData.estimatedTime < 5 || formData.estimatedTime > 480)) {
      newErrors.estimatedTime = 'Tahmini süre 5-480 dakika arasında olmalıdır';
    }

    if (formData.order && formData.order < 1) {
      newErrors.order = 'Sıra numarası en az 1 olmalıdır';
    } else if (formData.order) {
      // Check if order conflicts with other topics (excluding current topic)
      const conflictingTopic = existingTopics.find(
        t => t.id !== topic.id && t.order === formData.order
      );
      if (conflictingTopic) {
        newErrors.order = 'Bu sıra numarası başka bir konu tarafından kullanılıyor';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      // Only send changed fields
      const changedData: UpdateTopicRequest = {};
      if (formData.name !== topic.name) changedData.name = formData.name;
      if (formData.description !== (topic.description || '')) changedData.description = formData.description;
      if (formData.estimatedTime !== topic.estimatedTime) changedData.estimatedTime = formData.estimatedTime;
      if (formData.difficulty !== topic.difficulty) changedData.difficulty = formData.difficulty;
      if (formData.order !== topic.order) changedData.order = formData.order;

      if (Object.keys(changedData).length > 0) {
        updateTopicMutation.mutate(changedData);
      } else {
        toast.info('Hiçbir değişiklik yapılmadı');
        onClose();
      }
    }
  };

  const handleDelete = () => {
    deleteTopicMutation.mutate();
  };

  const handleClose = () => {
    if (!updateTopicMutation.isPending && !deleteTopicMutation.isPending) {
      onClose();
      setShowDeleteConfirm(false);
    }
  };

  const handleInputChange = (field: keyof UpdateTopicRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const isPending = updateTopicMutation.isPending || deleteTopicMutation.isPending;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Konu Düzenle
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {topic.course?.name} - {topic.name}
                </p>
              </div>
              <button
                onClick={handleClose}
                disabled={isPending}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Delete Confirmation */}
            {showDeleteConfirm && (
              <div className="p-6 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
                <div className="flex items-center mb-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-400">
                    Konuyu Sil
                  </h3>
                </div>
                <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                  Bu konuyu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isPending}
                    className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                  >
                    İptal
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isPending}
                    className="flex-1 px-3 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                  >
                    {deleteTopicMutation.isPending ? (
                      <div className="spinner w-4 h-4" />
                    ) : (
                      'Sil'
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Topic Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Konu Adı *
                </label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Örn: Türev Kuralları"
                  className={`input w-full ${errors.name ? 'border-red-500 focus:border-red-500' : ''}`}
                  disabled={isPending}
                />
                {errors.name && (
                  <p className="flex items-center text-sm text-red-600 mt-1">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Açıklama
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Konu hakkında kısa açıklama..."
                  rows={3}
                  className="input w-full resize-none"
                  disabled={isPending}
                />
              </div>

              {/* Estimated Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tahmini Süre (dakika) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="5"
                    max="480"
                    value={formData.estimatedTime || ''}
                    onChange={(e) => handleInputChange('estimatedTime', parseInt(e.target.value) || 0)}
                    className={`input w-full pl-10 ${errors.estimatedTime ? 'border-red-500 focus:border-red-500' : ''}`}
                    disabled={isPending}
                  />
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
                {errors.estimatedTime && (
                  <p className="flex items-center text-sm text-red-600 mt-1">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.estimatedTime}
                  </p>
                )}
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Zorluk Seviyesi *
                </label>
                <select
                  value={formData.difficulty || 'Orta'}
                  onChange={(e) => handleInputChange('difficulty', e.target.value as 'Kolay' | 'Orta' | 'Zor')}
                  className="input w-full"
                  disabled={isPending}
                >
                  <option value="Kolay">Kolay</option>
                  <option value="Orta">Orta</option>
                  <option value="Zor">Zor</option>
                </select>
              </div>

              {/* Order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sıra Numarası *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={formData.order || ''}
                    onChange={(e) => handleInputChange('order', parseInt(e.target.value) || 1)}
                    className={`input w-full pl-10 ${errors.order ? 'border-red-500 focus:border-red-500' : ''}`}
                    disabled={isPending}
                  />
                  <Target className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
                {errors.order && (
                  <p className="flex items-center text-sm text-red-600 mt-1">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.order}
                  </p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Mevcut konular: {existingTopics.filter(t => t.id !== topic.id).map(t => t.order).sort((a, b) => a - b).join(', ')}
                </p>
              </div>

              {/* Actions */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isPending}
                  className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50 flex items-center"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Sil
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isPending}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {updateTopicMutation.isPending ? (
                    <div className="spinner w-4 h-4" />
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Kaydet
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EditTopicModal;