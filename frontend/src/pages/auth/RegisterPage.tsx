import { Brand } from '../../components/common/Brand';
import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { contractResolver } from '../../lib/contractResolver';
import { registerSchema, type RegisterInput } from '@study-tracker/contracts';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';

type RegisterFormData = RegisterInput;

const RegisterPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { register: registerUser, isAuthenticated } = useAuthStore();
  const allowRegistration = useSettingsStore(
    (state) => state.settings.allowRegistration,
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: contractResolver(registerSchema),
  });

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      await registerUser(data);
      toast.success('Hesap başarıyla oluşturuldu');
    } catch {
      // The auth store presents a safe error without logging credentials.
    } finally {
      setIsLoading(false);
    }
  };

  if (!allowRegistration) {
    return (
      <div className="min-h-screen bg-[var(--canvas)] flex items-center justify-center py-12 px-4">
        <div
          className="panel w-full max-w-md space-y-4 p-8 text-center"
          role="status"
        >
          <div className="flex justify-center">
            <Brand />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Kayıtlar kapalı
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Yeni hesap oluşturma şu anda kapalı. Mevcut hesabınızla giriş
            yapabilirsiniz.
          </p>
          <Link to="/login" className="btn btn-secondary">
            Giriş yap
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--canvas)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full space-y-8"
      >
        <div className="text-center">
          <div className="flex justify-center">
            <Brand />
          </div>
          <h2 className="mt-6 text-[28px] font-semibold tracking-tight text-gray-900 dark:text-white">
            Kayıt Ol
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Yeni hesap oluştur
          </p>
        </div>

        <div className="panel p-6 sm:p-8">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Ad
                </label>
                <div className="mt-1">
                  <input
                    {...register('firstName')}
                    id="firstName"
                    type="text"
                    className={`input ${errors.firstName ? 'input-error' : ''}`}
                    placeholder="Adınız"
                  />
                  {errors.firstName && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.firstName.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="lastName"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Soyad
                </label>
                <div className="mt-1">
                  <input
                    {...register('lastName')}
                    id="lastName"
                    type="text"
                    className={`input ${errors.lastName ? 'input-error' : ''}`}
                    placeholder="Soyadınız"
                  />
                  {errors.lastName && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.lastName.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Kullanıcı Adı
              </label>
              <div className="mt-1">
                <input
                  {...register('username')}
                  id="username"
                  type="text"
                  className={`input ${errors.username ? 'input-error' : ''}`}
                  placeholder="kullaniciadi"
                />
                {errors.username && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.username.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                E-posta Adresi
              </label>
              <div className="mt-1">
                <input
                  {...register('email')}
                  id="email"
                  type="email"
                  autoComplete="email"
                  className={`input ${errors.email ? 'input-error' : ''}`}
                  placeholder="ornek@email.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.email.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Şifre
              </label>
              <div className="mt-1 relative">
                <input
                  {...register('password')}
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={`input pr-10 ${errors.password ? 'input-error' : ''}`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.password.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary w-full"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="spinner w-5 h-5 mr-2" />
                    Hesap oluşturuluyor...
                  </div>
                ) : (
                  'Kayıt Ol'
                )}
              </button>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Zaten hesabınız var mı?{' '}
                <Link
                  to="/login"
                  className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
                >
                  Giriş yap
                </Link>
              </p>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default RegisterPage;
