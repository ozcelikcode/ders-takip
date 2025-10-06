import { useState } from 'react';
import { motion } from 'framer-motion';
import { User as UserIcon, Camera, Save, Lock, Mail, Upload, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { authAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { useMutation } from '@tanstack/react-query';

const ProfilePage = () => {
  const { user } = useAuthStore();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [imageInputType, setImageInputType] = useState<'url' | 'file'>('url');

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    username: user?.username || '',
    profileImage: user?.profileImage || '',
    studyField: user?.preferences?.studyField || '',
  });

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const updateData: any = {
        firstName: data.firstName,
        lastName: data.lastName,
        username: data.username,
      };

      // Only include profileImage if it has a value
      if (data.profileImage) {
        updateData.profileImage = data.profileImage;
      }

      // Only include studyField if it has a value
      if (data.studyField) {
        updateData.preferences = {
          studyField: data.studyField,
        };
      }

      return authAPI.updateProfile(updateData);
    },
    onSuccess: (response) => {
      const updatedUser = response.data.data.user;
      // Update user in store directly without calling updateProfile (which makes another API call)
      useAuthStore.setState({ user: updatedUser });
      toast.success('Profil başarıyla güncellendi');
      setIsEditingProfile(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Profil güncellenirken hata oluştu');
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      return authAPI.changePassword(data);
    },
    onSuccess: () => {
      toast.success('Şifre başarıyla değiştirildi');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setIsEditingPassword(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Şifre değiştirilirken hata oluştu');
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!profileForm.firstName || !profileForm.lastName || !profileForm.username) {
      toast.error('Lütfen tüm zorunlu alanları doldurun');
      return;
    }

    updateProfileMutation.mutate(profileForm);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error('Lütfen tüm alanları doldurun');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Yeni şifreler eşleşmiyor');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error('Yeni şifre en az 6 karakter olmalıdır');
      return;
    }

    changePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  };

  const handleCancelProfile = () => {
    setProfileForm({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      username: user?.username || '',
      profileImage: user?.profileImage || '',
      studyField: user?.preferences?.studyField || '',
    });
    setIsEditingProfile(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('Dosya boyutu en fazla 5MB olabilir');
      return;
    }

    // Check file type - only allow specific image formats
    const allowedTypes = ['image/webp', 'image/jpeg', 'image/jpg', 'image/png', 'image/bmp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      toast.error('Desteklenen formatlar: WebP, JPG, JPEG, PNG, BMP');
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileForm({ ...profileForm, profileImage: reader.result as string });
      toast.success('Resim başarıyla yüklendi');
    };
    reader.onerror = () => {
      toast.error('Dosya yüklenirken hata oluştu');
    };
    reader.readAsDataURL(file);
  };

  const studyFieldOptions = [
    { value: '', label: 'Seçiniz' },
    { value: 'TYT', label: 'TYT' },
    { value: 'AYT', label: 'AYT' },
    { value: 'SAY', label: 'Sayısal' },
    { value: 'EA', label: 'Eşit Ağırlık' },
    { value: 'SOZ', label: 'Sözel' },
    { value: 'DIL', label: 'Dil' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profil</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Profil bilgilerinizi ve ayarlarınızı yönetin
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile Picture & Account Info */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-1 space-y-6"
        >
          {/* Profile Picture Card */}
          <div className="card">
            <div className="card-body text-center">
              <div className="relative inline-block">
                <div className="h-32 w-32 rounded-full bg-primary-600 flex items-center justify-center overflow-hidden mx-auto">
                  {profileForm.profileImage ? (
                    <img
                      src={profileForm.profileImage}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UserIcon className="h-16 w-16 text-white" />
                  )}
                </div>
                {isEditingProfile && (
                  <button
                    type="button"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    className="absolute bottom-0 right-0 p-2 bg-white dark:bg-gray-700 rounded-full shadow-lg border-2 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    <Camera className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                  </button>
                )}
              </div>

              <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                {user?.fullName}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">@{user?.username}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {user?.role === 'admin' ? 'Yönetici' : 'Öğrenci'}
              </p>

              {isEditingProfile && (
                <div className="mt-4 space-y-3">
                  <input
                    type="file"
                    id="file-upload"
                    accept=".webp,.jpg,.jpeg,.png,.bmp,image/webp,image/jpeg,image/png,image/bmp"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setImageInputType('file')}
                      className={`flex-1 px-3 py-1.5 text-xs rounded transition-colors ${
                        imageInputType === 'file'
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <Upload className="h-3 w-3 inline mr-1" />
                      Dosya
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageInputType('url')}
                      className={`flex-1 px-3 py-1.5 text-xs rounded transition-colors ${
                        imageInputType === 'url'
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      URL
                    </button>
                  </div>

                  {imageInputType === 'file' && (
                    <button
                      type="button"
                      onClick={() => document.getElementById('file-upload')?.click()}
                      className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary-500 dark:hover:border-primary-500 transition-colors text-sm text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
                    >
                      <Upload className="h-4 w-4 inline mr-2" />
                      Resim Seç veya Yükle
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        WebP, JPG, JPEG, PNG, BMP (Max 5MB)
                      </p>
                    </button>
                  )}

                  {imageInputType === 'url' && (
                    <input
                      type="url"
                      value={profileForm.profileImage}
                      onChange={(e) => setProfileForm({ ...profileForm, profileImage: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                      className="input text-sm"
                    />
                  )}

                  {profileForm.profileImage && (
                    <button
                      type="button"
                      onClick={() => setProfileForm({ ...profileForm, profileImage: '' })}
                      className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 flex items-center gap-1"
                    >
                      <X className="h-3 w-3" /> Resmi Kaldır
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Account Info Card */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Hesap Bilgileri
              </h3>
            </div>
            <div className="card-body space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Durum:</span>
                <span className={`font-medium ${user?.isActive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {user?.isActive ? 'Aktif' : 'Pasif'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Kayıt:</span>
                <span className="text-gray-900 dark:text-white">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('tr-TR') : '-'}
                </span>
              </div>
              {user?.lastLogin && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Son Giriş:</span>
                  <span className="text-gray-900 dark:text-white text-xs">
                    {new Date(user.lastLogin).toLocaleDateString('tr-TR')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Right Column - Profile & Password Forms */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 space-y-6"
        >
          {/* Profile Information */}
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Profil Bilgileri
              </h3>
              {!isEditingProfile && (
                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="btn btn-secondary text-sm py-1.5 px-3"
                >
                  Düzenle
                </button>
              )}
            </div>
            <div className="card-body">
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Ad *
                    </label>
                    {isEditingProfile ? (
                      <input
                        type="text"
                        value={profileForm.firstName}
                        onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                        required
                        className="input"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white py-2">{user?.firstName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Soyad *
                    </label>
                    {isEditingProfile ? (
                      <input
                        type="text"
                        value={profileForm.lastName}
                        onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                        required
                        className="input"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white py-2">{user?.lastName}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Kullanıcı Adı *
                  </label>
                  {isEditingProfile ? (
                    <input
                      type="text"
                      value={profileForm.username}
                      onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                      required
                      className="input"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white py-2">{user?.username}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    E-posta
                  </label>
                  <div className="flex items-center gap-2 py-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <p className="text-gray-900 dark:text-white">{user?.email}</p>
                    <span className="text-xs text-gray-500 dark:text-gray-400">(değiştirilemez)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Alan Bilgisi
                  </label>
                  {isEditingProfile ? (
                    <select
                      value={profileForm.studyField}
                      onChange={(e) => setProfileForm({ ...profileForm, studyField: e.target.value })}
                      className="input"
                    >
                      {studyFieldOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-gray-900 dark:text-white py-2">
                      {user?.preferences?.studyField
                        ? studyFieldOptions.find((opt) => opt.value === user.preferences.studyField)?.label
                        : 'Belirtilmemiş'}
                    </p>
                  )}
                </div>

                {isEditingProfile && (
                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={updateProfileMutation.isPending}
                      className="btn btn-primary flex items-center gap-2"
                    >
                      <Save className="h-4 w-4" />
                      {updateProfileMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelProfile}
                      disabled={updateProfileMutation.isPending}
                      className="btn btn-secondary"
                    >
                      İptal
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Change Password */}
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  Şifre Değiştir
                </h3>
              </div>
              {!isEditingPassword && (
                <button
                  onClick={() => setIsEditingPassword(true)}
                  className="btn btn-secondary text-sm py-1.5 px-3"
                >
                  Değiştir
                </button>
              )}
            </div>
            {isEditingPassword && (
              <div className="card-body">
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Mevcut Şifre *
                    </label>
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      required
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Yeni Şifre *
                    </label>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      required
                      minLength={6}
                      className="input"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      En az 6 karakter olmalıdır
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Yeni Şifre (Tekrar) *
                    </label>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      required
                      className="input"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={changePasswordMutation.isPending}
                      className="btn btn-primary flex items-center gap-2"
                    >
                      <Lock className="h-4 w-4" />
                      {changePasswordMutation.isPending ? 'Değiştiriliyor...' : 'Şifreyi Değiştir'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                        setIsEditingPassword(false);
                      }}
                      disabled={changePasswordMutation.isPending}
                      className="btn btn-secondary"
                    >
                      İptal
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ProfilePage;
