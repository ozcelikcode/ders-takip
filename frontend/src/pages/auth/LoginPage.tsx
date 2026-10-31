import AuthCard from '../../components/auth/AuthCard';
import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { returnPath } from '../../lib/returnPath';
import { useForm } from 'react-hook-form';
import { contractResolver } from '../../lib/contractResolver';
import { loginSchema, type LoginInput } from '@study-tracker/contracts';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';

import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useText } from '../../store/languageStore';

type LoginFormData = LoginInput;

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated } = useAuthStore();
  const location = useLocation();
  const text = useText().auth;
  const allowRegistration = useSettingsStore(
    (state) => state.settings.allowRegistration,
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: contractResolver(loginSchema),
  });

  if (isAuthenticated) {
    return <Navigate to={returnPath(location.state)} replace />;
  }

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await login(data);
      toast.success(text.login.success);
    } catch {
      // The auth store presents a safe error without logging credentials.
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthCard title={text.login.title} description={text.login.description}>
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
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
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium"
                >
                  {text.password}
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-(--muted) underline underline-offset-4 hover:text-(--text)"
                >
                  {text.login.forgotPassword}
                </Link>
              </div>
              <div className="mt-1 relative">
                <input
                  {...register('password')}
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
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
                    {text.login.submitting}
                  </div>
                ) : (
                  text.login.submit
                )}
              </button>
            </div>

            {allowRegistration && (
              <div className="text-center">
                <p className="text-sm text-(--muted)">
                  {text.login.noAccount}{' '}
                  <Link
                    to="/register"
                    className="font-medium text-(--text) underline underline-offset-4 hover:no-underline"
                  >
                    {text.login.register}
                  </Link>
                </p>
              </div>
            )}
          </form>
    </AuthCard>
  );
};

export default LoginPage;
