import {
  profilePatchSchema,
  changePasswordSchema,
  type ProfilePatch,
  type ChangePasswordInput,
} from '@study-tracker/contracts';
import { issueMessage, serverMessage } from '../../../lib/messages';
import { shrinkProfileImage } from '../../../lib/profileImage';
import { useMutation } from '@tanstack/react-query';
import { Mail, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { authAPI } from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';
import AccountDataCard from './AccountDataCard';
import AccountInfoCard from './AccountInfoCard';
import PasswordCard from './PasswordCard';
import ProfilePictureCard from './ProfilePictureCard';
import type { PasswordFormState, ProfileFormState } from './profileForm';
import { useText } from '../../../store/languageStore';
import { useUnsavedChangesWarning } from '../../../hooks/useUnsavedChangesWarning';

/** Name, username, picture, password and the account's own data; the first tab of Settings. */
const AccountTab = () => {
  const { user } = useAuthStore();
  const text = useText().profile;
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [imageInputType, setImageInputType] = useState<'url' | 'file'>('url');
  useUnsavedChangesWarning(isEditingProfile || isEditingPassword);

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
      toast.success(text.profileUpdated);
      setIsEditingProfile(false);
    },
    onError: (error: unknown) => {
      toast.error(
        serverMessage(error) || text.profileUpdateFailed,
      );
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: ChangePasswordInput) => {
      return authAPI.changePassword(data);
    },
    onSuccess: () => {
      toast.success(text.passwordChanged);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setIsEditingPassword(false);
    },
    onError: (error: unknown) => {
      toast.error(
        serverMessage(error) || text.passwordChangeFailed,
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
        parsed.error.issues[0] ? issueMessage(parsed.error.issues[0].message) : text.checkProfile,
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
      toast.error(text.fillAll);
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error(text.passwordsMismatch);
      return;
    }

    const parsed = changePasswordSchema.safeParse({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
    if (!parsed.success) {
      toast.error(
        parsed.error.issues[0] ? issueMessage(parsed.error.issues[0].message) : text.checkPassword,
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
      toast.error(text.fileTooLarge);
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
      toast.error(text.fileTypes);
      return;
    }

    shrinkProfileImage(file).then(
      (profileImage) => {
        // Functional update: name edits typed while the picture was being prepared are kept.
        setProfileForm((current) => ({ ...current, profileImage }));
        toast.success(text.imageLoaded);
      },
      () => toast.error(text.imageFailed),
    );
  };


  return (
    <div className="space-y-6">
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
                {text.infoTitle}
              </h2>
              {!isEditingProfile && (
                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="btn btn-secondary text-sm py-1.5 px-3"
                >
                  {text.edit}
                </button>
              )}
            </div>
            <div className="p-5">
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="profile-firstName" className="mb-2 block text-sm font-medium">
                      {text.firstName}
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
                      {text.lastName}
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
                    {text.username}
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
                    {text.email}
                  </label>
                  <div className="flex items-center gap-2 py-2">
                    <Mail className="h-4 w-4 text-(--muted)" />
                    <p>
                      {user?.email}
                    </p>
                    <span className="text-xs text-(--muted)">
                      {text.emailFixed}
                    </span>
                  </div>
                </div>

                <div>
                  <label htmlFor="profile-studyField" className="mb-2 block text-sm font-medium">
                    {text.studyField}
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
                      placeholder={text.studyFieldPlaceholder}
                      className="input"
                    />
                  ) : (
                    <p className="py-2">
                      {user?.preferences?.studyField || text.notSet}
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
                        ? text.saving
                        : text.save}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelProfile}
                      disabled={updateProfileMutation.isPending}
                      className="btn btn-secondary"
                    >
                      {text.cancel}
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
          <AccountDataCard />
        </div>
      </div>
    </div>
  );
};

export default AccountTab;
