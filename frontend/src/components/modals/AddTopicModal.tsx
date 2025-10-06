import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Clock, Target, AlertCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { topicsAPI } from '../../services/api';
import { CreateTopicRequest } from '../../types/planner';
import toast from 'react-hot-toast';

interface AddTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: number;
  courseName: string;
  existingTopics: { id: number; name: string; order: number }[];
}

const AddTopicModal: React.FC<AddTopicModalProps> = ({
  isOpen,
  onClose,
  courseId,
  courseName,
  existingTopics,
}) => {
  const [formData, setFormData] = useState<CreateTopicRequest>({
    name: '',
    courseId,
    description: '',
    estimatedTime: 60,
    difficulty: 'Orta',
    order: existingTopics.length + 1,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const queryClient = useQueryClient();

  const createTopicMutation = useMutation({
    mutationFn: topicsAPI.createTopic,
    onSuccess: () => {
      toast.success('Konu başarıyla eklendi');
      queryClient.invalidateQueries({ queryKey: ['course'] });
      queryClient.invalidateQueries({ queryKey: ['topics'] });
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error?.message || 'Konu eklenirken bir hata oluştu';
      toast.error(errorMessage);
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      courseId,
      description: '',
      estimatedTime: 60,
      difficulty: 'Orta',
      order: existingTopics.length + 1,
    });
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Konu adı gereklidir';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Konu adı en az 2 karakter olmalıdır';
    } else if (existingTopics.some(topic => topic.name.toLowerCase() === formData.name.trim().toLowerCase())) {
      newErrors.name = 'Bu isimde bir konu zaten mevcut';
    }

    if (formData.estimatedTime < 5 || formData.estimatedTime > 480) {
      newErrors.estimatedTime = 'Tahmini süre 5-480 dakika arasında olmalıdır';
    }

    if (formData.order < 1) {
      newErrors.order = 'Sıra numarası en az 1 olmalıdır';
    } else if (existingTopics.some(topic => topic.order === formData.order)) {
      newErrors.order = 'Bu sıra numarası zaten kullanılıyor';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      createTopicMutation.mutate(formData);
    }
  };

  const handleClose = () => {
    if (!createTopicMutation.isPending) {
      onClose();
      resetForm();
    }
  };

  const handleInputChange = (field: keyof CreateTopicRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

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
                  Yeni Konu Ekle
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {courseName} dersine yeni konu ekleyin
                </p>
              </div>
              <button
                onClick={handleClose}
                disabled={createTopicMutation.isPending}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Topic Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Konu Adı *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Örn: Türev Kuralları"
                  className={`input w-full ${errors.name ? 'border-red-500 focus:border-red-500' : ''}`}
                  disabled={createTopicMutation.isPending}
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
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Konu hakkında kısa açıklama..."
                  rows={3}
                  className="input w-full resize-none"
                  disabled={createTopicMutation.isPending}
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
                    value={formData.estimatedTime}
                    onChange={(e) => handleInputChange('estimatedTime', parseInt(e.target.value) || 0)}
                    className={`input w-full pl-10 ${errors.estimatedTime ? 'border-red-500 focus:border-red-500' : ''}`}
                    disabled={createTopicMutation.isPending}
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
                  value={formData.difficulty}
                  onChange={(e) => handleInputChange('difficulty', e.target.value as 'Kolay' | 'Orta' | 'Zor')}
                  className="input w-full"
                  disabled={createTopicMutation.isPending}
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
                    value={formData.order}
                    onChange={(e) => handleInputChange('order', parseInt(e.target.value) || 1)}
                    className={`input w-full pl-10 ${errors.order ? 'border-red-500 focus:border-red-500' : ''}`}
                    disabled={createTopicMutation.isPending}
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
                  Mevcut konular: {existingTopics.map(t => t.order).sort((a, b) => a - b).join(', ')}
                </p>
              </div>

              {/* Actions */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={createTopicMutation.isPending}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={createTopicMutation.isPending}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {createTopicMutation.isPending ? (
                    <div className="spinner w-4 h-4" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Konu Ekle
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

export default AddTopicModal;