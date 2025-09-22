import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Target, Plus, TrendingUp, Clock, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { Plan } from '../../types/planner';
import { plansAPI, studySessionsAPI } from '../../services/api';
import { useQuery } from '@tanstack/react-query';
import { format, differenceInDays, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import GoalSettingModal from './GoalSettingModal';

const GoalsOverview: React.FC = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const response = await plansAPI.getPlans({ isActive: true });
      return response.data.data.plans;
    },
  });

  const { data: sessionsData } = useQuery({
    queryKey: ['study-sessions'],
    queryFn: async () => {
      const response = await studySessionsAPI.getSessions();
      return response.data.data.sessions;
    },
  });

  const calculatePlanProgress = (plan: Plan) => {
    if (!sessionsData) return { completedHours: 0, progressPercentage: 0, sessionsCount: 0 };

    const planSessions = sessionsData.filter(
      session => session.planId === plan.id && session.status === 'completed'
    );

    const completedHours = planSessions.reduce((total, session) => total + (session.duration / 60), 0);
    const totalTargetHours = plan.goals.weeklyHours * (
      differenceInDays(parseISO(plan.endDate), parseISO(plan.startDate)) / 7
    );

    const progressPercentage = (completedHours / totalTargetHours) * 100;

    return {
      completedHours: Math.round(completedHours * 10) / 10,
      progressPercentage: Math.min(100, Math.round(progressPercentage)),
      sessionsCount: planSessions.length,
      totalTargetHours: Math.round(totalTargetHours * 10) / 10,
    };
  };

  const getDaysRemaining = (endDate: string) => {
    const days = differenceInDays(parseISO(endDate), new Date());
    return Math.max(0, days);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600 bg-green-100';
    if (percentage >= 60) return 'text-blue-600 bg-blue-100';
    if (percentage >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getStatusIcon = (plan: Plan, progress: any) => {
    const daysRemaining = getDaysRemaining(plan.endDate);

    if (daysRemaining === 0) {
      return progress.progressPercentage >= 90 ?
        <CheckCircle className="w-5 h-5 text-green-600" /> :
        <AlertCircle className="w-5 h-5 text-red-600" />;
    }

    if (progress.progressPercentage >= 80) {
      return <TrendingUp className="w-5 h-5 text-green-600" />;
    }

    if (progress.progressPercentage >= 40) {
      return <Clock className="w-5 h-5 text-blue-600" />;
    }

    return <AlertCircle className="w-5 h-5 text-yellow-600" />;
  };

  if (plansLoading) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            <div className="space-y-3">
              <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const activePlans = plansData || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Hedeflerim
          </h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            ({activePlans.length} aktif plan)
          </span>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          Yeni Hedef
        </button>
      </div>

      {/* Goals Grid */}
      {activePlans.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-12">
            <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Henüz hedef planınız yok
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Çalışma hedeflerinizi belirlemek için yeni bir plan oluşturun
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              İlk Hedefimi Oluştur
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {activePlans.map((plan) => {
            const progress = calculatePlanProgress(plan);
            const daysRemaining = getDaysRemaining(plan.endDate);

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card hover:shadow-lg transition-shadow"
              >
                <div className="card-body">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                        {plan.title}
                      </h3>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(plan.goals.priority)}`}>
                        {plan.goals.priority === 'high' ? 'Yüksek' :
                         plan.goals.priority === 'medium' ? 'Orta' : 'Düşük'} Öncelik
                      </span>
                    </div>
                    {getStatusIcon(plan, progress)}
                  </div>

                  {/* Progress */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        İlerleme
                      </span>
                      <span className={`text-sm font-semibold px-2 py-1 rounded ${getProgressColor(progress.progressPercentage)}`}>
                        {progress.progressPercentage}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress.progressPercentage}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className={`h-2 rounded-full ${
                          progress.progressPercentage >= 80 ? 'bg-green-500' :
                          progress.progressPercentage >= 60 ? 'bg-blue-500' :
                          progress.progressPercentage >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Tamamlanan:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {progress.completedHours}h / {progress.totalTargetHours}h
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Seans sayısı:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {progress.sessionsCount}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Hedef konu:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {plan.goals.targetTopics} konu
                      </span>
                    </div>
                  </div>

                  {/* Time Info */}
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {format(parseISO(plan.endDate), 'd MMM yyyy', { locale: tr })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          {daysRemaining > 0 ? `${daysRemaining} gün kaldı` : 'Süre doldu'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Goal Setting Modal */}
      <GoalSettingModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
};

export default GoalsOverview;