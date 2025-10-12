import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Clock, Target, TrendingUp, Calculator, Microscope, Globe, Triangle, Atom, FlaskConical, Dna, Landmark, Map, Brain, Heart, BookText, Search, X } from 'lucide-react';
import { coursesAPI } from '../services/api';

interface Topic {
  id: number;
  name: string;
  description: string;
  estimatedTime: number;
  difficulty: 'Kolay' | 'Orta' | 'Zor';
  order: number;
}

interface Course {
  id: number;
  name: string;
  category: 'TYT' | 'AYT';
  description: string;
  color: string;
  icon: string;
  order: number;
  isActive: boolean;
  topics?: Topic[];
}

const CoursesPage = () => {
  const [searchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<'TYT' | 'AYT' | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: coursesData, isLoading, error } = useQuery({
    queryKey: ['courses', { includeTopics: true }],
    queryFn: () => coursesAPI.getCourses({ includeTopics: true }),
  });

  const courses: Course[] = coursesData?.data?.data?.courses || [];

  // Read search query from URL on mount
  useEffect(() => {
    const searchQuery = searchParams.get('search');
    if (searchQuery) {
      setSearchTerm(searchQuery);
    }
  }, [searchParams]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      // Scroll to results section
      const resultsSection = document.querySelector('[class*="grid-cols"]');
      if (resultsSection) {
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      // Blur the input to hide mobile keyboard
      e.currentTarget.blur();
    }
  };

  const getIconComponent = (iconName: string) => {
    const icons: Record<string, any> = {
      BookOpen,
      Calculator,
      Microscope,
      Globe,
      Triangle,
      Atom,
      FlaskConical,
      Dna,
      Landmark,
      Map,
      Brain,
      Heart,
      BookText,
    };
    return icons[iconName] || BookOpen;
  };

  const filteredCourses = courses
    .filter(course => selectedCategory === 'ALL' || course.category === selectedCategory)
    .filter(course => {
      if (!searchTerm.trim()) return true;

      const searchLower = searchTerm.toLowerCase().trim();

      // Ders adında ara
      if (course.name.toLowerCase().includes(searchLower)) return true;

      // Ders açıklamasında ara
      if (course.description?.toLowerCase().includes(searchLower)) return true;

      // Konu isimlerinde ara
      if (course.topics?.some(topic => topic.name.toLowerCase().includes(searchLower))) return true;

      // Konu açıklamalarında ara
      if (course.topics?.some(topic => topic.description?.toLowerCase().includes(searchLower))) return true;

      return false;
    });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Kolay': return 'text-green-600 bg-green-100';
      case 'Orta': return 'text-yellow-600 bg-yellow-100';
      case 'Zor': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTotalTopics = (category: 'TYT' | 'AYT') => {
    return courses
      .filter(course => course.category === category)
      .reduce((total, course) => total + (course.topics?.length || 0), 0);
  };

  const getTotalTime = (category: 'TYT' | 'AYT') => {
    return courses
      .filter(course => course.category === category)
      .reduce((total, course) =>
        total + (course.topics?.reduce((courseTotal, topic) => courseTotal + topic.estimatedTime, 0) || 0), 0
      );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="spinner w-8 h-8" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Dersler yüklenirken bir hata oluştu.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Dersler ve Konular
        </h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          TYT ve AYT sınavlarında başarılı olmak için hazırladığımız kapsamlı ders ve konu listesi.
          Her konunun tahmini süresini ve zorluk seviyesini görebilirsiniz.
        </p>
      </div>

      {/* Search Bar */}
      <div className="max-w-2xl mx-auto">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Ders veya konu ara... (örn: Matematik, Türkçe, Geometri)"
            className="block w-full pl-12 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        {searchTerm && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 text-center">
            <span className="font-medium text-primary-600 dark:text-primary-400">{filteredCourses.length}</span> sonuç bulundu
          </p>
        )}
      </div>

      {/* Category Filter */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
          {(['ALL', 'TYT', 'AYT'] as const).map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {category === 'ALL' ? 'Tümü' : category}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      {selectedCategory !== 'ALL' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Toplam Ders</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {filteredCourses.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Target className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Toplam Konu</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {getTotalTopics(selectedCategory)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Clock className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Tahmini Süre</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Math.round(getTotalTime(selectedCategory) / 60)}h
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.map((course, index) => (
          <motion.div
            key={course.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link
              to={`/courses/${course.id}`}
              className="block bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow group"
            >
              <div className="p-6">
                {/* Course Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-white"
                      style={{ backgroundColor: course.color }}
                    >
                      {(() => {
                        const IconComponent = getIconComponent(course.icon);
                        return <IconComponent className="w-6 h-6" />;
                      })()}
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                        {course.name}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        course.category === 'TYT'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                          : 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
                      }`}>
                        {course.category}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Course Description */}
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                  {course.description}
                </p>

                {/* Topics Summary */}
                {course.topics && course.topics.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        {course.topics.length} konu
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        ~{Math.round(course.topics.reduce((total, topic) => total + topic.estimatedTime, 0) / 60)}h
                      </span>
                    </div>

                    {/* Difficulty Distribution */}
                    <div className="flex space-x-2">
                      {['Kolay', 'Orta', 'Zor'].map(difficulty => {
                        const count = course.topics!.filter(topic => topic.difficulty === difficulty).length;
                        return count > 0 ? (
                          <span
                            key={difficulty}
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(difficulty)}`}
                          >
                            {count} {difficulty}
                          </span>
                        ) : null;
                      })}
                    </div>

                    {/* Preview Topics */}
                    <div className="space-y-1">
                      {course.topics.slice(0, 3).map(topic => (
                        <div key={topic.id} className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span className="truncate">{topic.name}</span>
                          <span>{topic.estimatedTime}dk</span>
                        </div>
                      ))}
                      {course.topics.length > 3 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-1">
                          +{course.topics.length - 3} konu daha...
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center text-primary-600 dark:text-primary-400 text-sm font-medium">
                    Konuları Görüntüle
                    <TrendingUp className="ml-1 h-4 w-4" />
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {filteredCourses.length === 0 && (
        <div className="text-center py-12">
          <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
            {searchTerm ? 'Sonuç bulunamadı' : 'Ders bulunamadı'}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searchTerm
              ? `"${searchTerm}" araması için sonuç bulunamadı. Farklı anahtar kelimeler deneyin.`
              : 'Seçilen kategoride henüz ders bulunmuyor.'}
          </p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Aramayı Temizle
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CoursesPage;