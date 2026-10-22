import { browserTimezone } from '../../lib/locale';
import { useText } from '../../store/languageStore';
import AuthCard from '../../components/auth/AuthCard';
import { Brand } from '../../components/common/Brand';
import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { contractResolver } from '../../lib/contractResolver';
import { registerSchema, type RegisterInput } from '@study-tracker/contracts';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';

import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';

type RegisterFormData = RegisterInput;

const RegisterPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { register: registerUser, isAuthenticated } = useAuthStore();
  const text = useText().auth;
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
      const timezone = browserTimezone();
      await registerUser({ ...data, ...(timezone ? { timezone } : {}) });
      toast.success(text.register.success);
    } catch {
      // The auth store presents a safe error without logging credentials.
    } finally {
      setIsLoading(false);
    }
  };

  if (!allowRegistration) {
    return (
      <main className="min-h-screen bg-(--canvas) flex items-center justify-center py-12 px-4">
        <div
          className="panel w-full max-w-md space-y-4 p-8 text-center"
          role="status"
        >
          <div className="flex justify-center">
            <Brand />
          </div>
          <h1 className="text-[28px] font-semibold tracking-tight">
            {text.register.closedTitle}
          </h1>
          <p className="text-sm text-(--muted)">
            {text.register.closedHint}
          </p>
          <Link to="/login" className="btn btn-secondary">
            {text.register.login}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <AuthCard title={text.register.title} description={text.register.description}>
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-sm font-medium"
                >
                  {text.register.firstName}
                </label>
                <div className="mt-1">
                  <input
                    {...register('firstName')}
                    id="firstName"
                    type="text"
                    className={`input ${errors.firstName ? 'input-error' : ''}`}
                    placeholder={text.register.firstNamePlaceholder}
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
                  className="block text-sm font-medium"
                >
                  {text.register.lastName}
                </label>
                <div className="mt-1">
                  <input
                    {...register('lastName')}
                    id="lastName"
                    type="text"
                    className={`input ${errors.lastName ? 'input-error' : ''}`}
                    placeholder={text.register.lastNamePlaceholder}
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
                className="block text-sm font-medium"
              >
                {text.register.username}
              </label>
              <div className="mt-1">
                <input
                  {...register('username')}
                  id="username"
                  type="text"
                  className={`input ${errors.username ? 'input-error' : ''}`}
                  placeholder={text.register.usernamePlaceholder}
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
                className="block text-sm font-medium"
              >
                {text.email}
              </label>
              <div className="mt-1">
                <input
                  {...register('email')}
                  id="email"
                  type="email"
                  autoComplete="email"
                  className={`input ${errors.email ? 'input-error' : ''}`}
                  placeholder={text.emailPlaceholder}
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
                className="block text-sm font-medium"
              >
                {text.password}
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
                  aria-label={showPassword ? text.hidePassword : text.showPassword}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-(--muted)" />
                  ) : (
                    <Eye className="h-5 w-5 text-(--muted)" />
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
                    {text.register.submitting}
                  </div>
                ) : (
                  text.register.submit
                )}
              </button>
            </div>

            <div className="text-center">
              <p className="text-sm text-(--muted)">
                {text.register.haveAccount}{' '}
                <Link
                  to="/login"
                  className="font-medium text-(--text) underline underline-offset-4 hover:no-underline"
                >
                  {text.register.login}
                </Link>
              </p>
            </div>
          </form>
    </AuthCard>
  );
};

export default RegisterPage;
