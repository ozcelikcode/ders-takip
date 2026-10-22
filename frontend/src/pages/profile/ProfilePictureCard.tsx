import { Camera, Upload, User as UserIcon, X } from 'lucide-react';
import type { ChangeEvent } from 'react';
import type { User } from '../../types/auth';
import type { ProfileFormState } from './profileForm';
import { useText } from '../../store/languageStore';

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
  const { roles, profile: text } = useText();
  return (
    <div className="panel">
      <div className="space-y-4 p-5 text-center">
        <div className="relative mx-auto inline-block">
          <div className="avatar h-20 w-20">
            {profileForm.profileImage ? (
              <img src={profileForm.profileImage} alt={text.pictureAlt} className="h-full w-full object-cover" />
            ) : (
              <UserIcon className="h-8 w-8 text-(--muted)" />
            )}
          </div>
          {isEditingProfile && (
            <button
              type="button"
              onClick={() => document.getElementById('file-upload')?.click()}
              aria-label={text.choosePicture}
              className="icon-button absolute -bottom-1 -right-1 h-8 w-8 border bg-(--surface)"
            >
              <Camera className="h-4 w-4" />
            </button>
          )}
        </div>

        <div>
          <h2 className="text-base font-medium">{user?.fullName}</h2>
          <p className="text-sm text-(--muted)">@{user?.username}</p>
          <p className="mt-1 text-xs text-(--muted)">
            {user ? roles[user.role] : ''}
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
              {(['file', 'url'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setImageInputType(type)}
                  aria-pressed={imageInputType === type}
                  className={`segment flex-1 ${imageInputType === type ? 'segment-active' : ''}`}
                >
                  {type === 'file' && <Upload className="h-3 w-3" />}
                  {text.imageSources[type]}
                </button>
              ))}
            </div>

            {imageInputType === 'file' && (
              <button
                type="button"
                onClick={() => document.getElementById('file-upload')?.click()}
                className="btn btn-secondary w-full flex-col gap-0 py-2 text-sm"
              >
                {text.pickImage}
                <span className="text-xs font-normal text-(--muted)">
                  {text.imageLimits}
                </span>
              </button>
            )}

            {imageInputType === 'url' && (
              <input
                type="url"
                aria-label={text.imageUrl}
                value={profileForm.profileImage}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, profileImage: e.target.value })
                }
                placeholder={text.imageUrlPlaceholder}
                className="input text-sm"
              />
            )}

            {profileForm.profileImage && (
              <button
                type="button"
                onClick={() => setProfileForm({ ...profileForm, profileImage: '' })}
                className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 dark:text-red-400"
              >
                <X className="h-3 w-3" /> {text.removeImage}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePictureCard;
