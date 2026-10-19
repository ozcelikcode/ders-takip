import {
  profilePatchSchema,
  changePasswordSchema,
  type ProfilePatch,
  type ChangePasswordInput,
} from '@study-tracker/contracts';
import { isAxiosError } from 'axios';
import { useMutation } from '@tanstack/react-query';
import { Mail, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { authAPI } from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import { useAuthStore } from '../../store/authStore';
import AccountInfoCard from './AccountInfoCard';
import PasswordCard from './PasswordCard';
import ProfilePictureCard from './ProfilePictureCard';
import type { PasswordFormState, ProfileFormState } from './profileForm';

const ProfilePage = () => {
  const { user } = useAuthStore();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [imageInputType, setImageInputType] = useState<'url' | 'file'>('url');

  // Profile form state
  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    username: user?.username || '',
    profileImage: user?.profileImage || '',
    studyField: user?.preferences?.studyField || '',
  });

  // Password form state
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (!isEditingProfile && user) {
      setProfileForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        username: user.username || '',
        profileImage: user.profileImage || '',
        studyField: user.preferences?.studyField || '',
      });
    }
  }, [user, isEditingProfile]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfilePatch) =>
      useAuthStore.getState().updateProfile(data),
    onSuccess: () => {
      toast.success('Profil başarıyla güncellendi');
      setIsEditingProfile(false);
    },
    onError: (error: unknown) => {
      toast.error(
        (isAxiosError(error)
          ? error.response?.data?.error?.message
          : undefined) || 'Profil güncellenirken hata oluştu',
      );
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: ChangePasswordInput) => {
      return authAPI.changePassword(data);
    },
    onSuccess: () => {
      toast.success('Şifre başarıyla değiştirildi');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setIsEditingPassword(false);
    },
    onError: (error: unknown) => {
      toast.error(
        (isAxiosError(error)
          ? error.response?.data?.error?.message
          : undefined) || 'Şifre değiştirilirken hata oluştu',
      );
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const { studyField, ...fields } = profileForm;
    const parsed = profilePatchSchema.safeParse({
      ...fields,
      profileImage: fields.profileImage || null,
      preferences: { studyField: studyField || null },
    });
    if (!parsed.success) {
      toast.error(
        parsed.error.issues[0]?.message ?? 'Profil alanlarını kontrol edin',
      );
      return;
    }
    updateProfileMutation.mutate(parsed.data);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (
      !passwordForm.currentPassword ||
      !passwordForm.newPassword ||
      !passwordForm.confirmPassword
    ) {
      toast.error('Lütfen tüm alanları doldurun');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Yeni şifreler eşleşmiyor');
      return;
    }

    const parsed = changePasswordSchema.safeParse({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
    if (!parsed.success) {
      toast.error(
        parsed.error.issues[0]?.message ?? 'Şifre alanlarını kontrol edin',
      );
      return;
    }
    changePasswordMutation.mutate(parsed.data);
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
    const allowedTypes = [
      'image/webp',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/bmp',
    ];
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


  return (
    <div className="space-y-6">
      <PageHeader title="Profil" description="Profil bilgilerinizi ve ayarlarınızı yönetin" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile Picture & Account Info */}
        <div className="lg:col-span-1 space-y-6">
          <ProfilePictureCard
            user={user}
            profileForm={profileForm}
            setProfileForm={setProfileForm}
            isEditingProfile={isEditingProfile}
            imageInputType={imageInputType}
            setImageInputType={setImageInputType}
            onFileUpload={handleFileUpload}
          />
          <AccountInfoCard user={user} />
        </div>

        {/* Right Column - Profile & Password Forms */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Information */}
          <div className="panel">
            <div className="panel-heading">
              <h2 className="text-base font-medium">
                Profil Bilgileri
              </h2>
              {!isEditingProfile && (
                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="btn btn-secondary text-sm py-1.5 px-3"
                >
                  Düzenle
                </button>
              )}
            </div>
            <div className="p-5">
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="profile-firstName" className="mb-2 block text-sm font-medium">
                      Ad *
                    </label>
                    {isEditingProfile ? (
                      <input id="profile-firstName"
                        type="text"
                        value={profileForm.firstName}
                        onChange={(e) =>
                          setProfileForm({
                            ...profileForm,
                            firstName: e.target.value,
                          })
                        }
                        required
                        className="input"
                      />
                    ) : (
                      <p className="py-2">
                        {user?.firstName}
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="profile-lastName" className="mb-2 block text-sm font-medium">
                      Soyad *
                    </label>
                    {isEditingProfile ? (
                      <input id="profile-lastName"
                        type="text"
                        value={profileForm.lastName}
                        onChange={(e) =>
                          setProfileForm({
                            ...profileForm,
                            lastName: e.target.value,
                          })
                        }
                        required
                        className="input"
                      />
                    ) : (
                      <p className="py-2">
                        {user?.lastName}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="profile-username" className="mb-2 block text-sm font-medium">
                    Kullanıcı Adı *
                  </label>
                  {isEditingProfile ? (
                    <input id="profile-username"
                      type="text"
                      value={profileForm.username}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          username: e.target.value,
                        })
                      }
                      required
                      className="input"
                    />
                  ) : (
                    <p className="py-2">
                      {user?.username}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    E-posta
                  </label>
                  <div className="flex items-center gap-2 py-2">
                    <Mail className="h-4 w-4 text-[var(--muted)]" />
                    <p>
                      {user?.email}
                    </p>
                    <span className="text-xs text-[var(--muted)]">
                      (değiştirilemez)
                    </span>
                  </div>
                </div>

                <div>
                  <label htmlFor="profile-studyField" className="mb-2 block text-sm font-medium">
                    Odak alanı
                  </label>
                  {isEditingProfile ? (
                    <input
                      id="profile-studyField"
                      type="text"
                      maxLength={60}
                      value={profileForm.studyField}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          studyField: e.target.value,
                        })
                      }
                      placeholder="Örn. Yazılım, tasarım, sınav hazırlığı"
                      className="input"
                    />
                  ) : (
                    <p className="py-2">
                      {user?.preferences?.studyField || 'Belirtilmemiş'}
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
                      {updateProfileMutation.isPending
                        ? 'Kaydediliyor...'
                        : 'Kaydet'}
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

          <PasswordCard
            isEditingPassword={isEditingPassword}
            setIsEditingPassword={setIsEditingPassword}
            passwordForm={passwordForm}
            setPasswordForm={setPasswordForm}
            isPending={changePasswordMutation.isPending}
            onSubmit={handlePasswordSubmit}
          />
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
