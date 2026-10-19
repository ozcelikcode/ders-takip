import { Camera, Upload, User as UserIcon, X } from 'lucide-react';
import type { ChangeEvent } from 'react';
import type { User } from '../../types/auth';
import type { ProfileFormState } from './profileForm';

interface ProfilePictureCardProps {
  user: User | null;
  profileForm: ProfileFormState;
  setProfileForm: (form: ProfileFormState) => void;
  isEditingProfile: boolean;
  imageInputType: 'url' | 'file';
  setImageInputType: (type: 'url' | 'file') => void;
  onFileUpload: (event: ChangeEvent<HTMLInputElement>) => void;
}

const ProfilePictureCard = ({
  user,
  profileForm,
  setProfileForm,
  isEditingProfile,
  imageInputType,
  setImageInputType,
  onFileUpload: handleFileUpload,
}: ProfilePictureCardProps) => {
  return (
    <div className="panel">
      <div className="space-y-4 p-5 text-center">
        <div className="relative mx-auto inline-block">
          <div className="avatar h-20 w-20">
            {profileForm.profileImage ? (
              <img src={profileForm.profileImage} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <UserIcon className="h-8 w-8 text-[var(--muted)]" />
            )}
          </div>
          {isEditingProfile && (
            <button
              type="button"
              onClick={() => document.getElementById('file-upload')?.click()}
              aria-label="Profil resmi seç"
              className="icon-button absolute -bottom-1 -right-1 h-8 w-8 border bg-[var(--surface)]"
            >
              <Camera className="h-4 w-4" />
            </button>
          )}
        </div>

        <div>
          <h2 className="text-base font-medium">{user?.fullName}</h2>
          <p className="text-sm text-[var(--muted)]">@{user?.username}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {user?.role === 'admin' ? 'Yönetici' : 'Öğrenci'}
          </p>
        </div>

        {isEditingProfile && (
          <div className="space-y-3 text-left">
            <input
              type="file"
              id="file-upload"
              accept=".webp,.jpg,.jpeg,.png,.bmp,image/webp,image/jpeg,image/png,image/bmp"
              onChange={handleFileUpload}
              className="hidden"
            />

            <div className="segmented-control flex">
              {(
                [
                  ['file', 'Dosya'],
                  ['url', 'URL'],
                ] as const
              ).map(([type, label]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setImageInputType(type)}
                  aria-pressed={imageInputType === type}
                  className={`segment flex-1 ${imageInputType === type ? 'segment-active' : ''}`}
                >
                  {type === 'file' && <Upload className="h-3 w-3" />}
                  {label}
                </button>
              ))}
            </div>

            {imageInputType === 'file' && (
              <button
                type="button"
                onClick={() => document.getElementById('file-upload')?.click()}
                className="btn btn-secondary w-full flex-col gap-0 py-2 text-sm"
              >
                Resim Seç veya Yükle
                <span className="text-xs font-normal text-[var(--muted)]">
                  WebP, JPG, JPEG, PNG, BMP (Max 5MB)
                </span>
              </button>
            )}

            {imageInputType === 'url' && (
              <input
                type="url"
                aria-label="Profil resmi URL adresi"
                value={profileForm.profileImage}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, profileImage: e.target.value })
                }
                placeholder="https://example.com/image.jpg"
                className="input text-sm"
              />
            )}

            {profileForm.profileImage && (
              <button
                type="button"
                onClick={() => setProfileForm({ ...profileForm, profileImage: '' })}
                className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 dark:text-red-400"
              >
                <X className="h-3 w-3" /> Resmi Kaldır
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePictureCard;
