import { changePasswordSchema, profilePatchSchema, type ChangePasswordInput } from '@study-tracker/contracts';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { authAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import type { ProfileUpdate } from '../../types/auth';

/** Profile name and password form state for the settings page; it outlives tab switches. */
export const useProfileSettings = () => {
  const { user, updateProfile } = useAuthStore();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const email = user?.email || '';
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    if (user?.fullName) {
      setFullName(user.fullName);
    }
  }, [user?.fullName]);

  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileUpdate) => updateProfile(data),
    onSuccess: () => {
      toast.success('Profil başarıyla güncellendi');
    },
    onError: () => {
      toast.error('Profil güncellenirken bir hata oluştu');
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: ChangePasswordInput) => authAPI.changePassword(data),
    onSuccess: () => {
      toast.success('Şifre başarıyla değiştirildi');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
    },
    onError: () => {
      toast.error('Şifre değiştirilirken bir hata oluştu');
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const [firstName, ...parts] = fullName.trim().split(/\s+/);
    const lastName = parts.join(' ');
    if (!firstName || !lastName) { toast.error('Ad ve soyad girin'); return; }
    const parsed = profilePatchSchema.safeParse({ firstName, lastName });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? 'Profil alanlarını kontrol edin'); return; }
    updateProfileMutation.mutate(parsed.data);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('Yeni şifreler eşleşmiyor');
      return;
    }

    const parsed = changePasswordSchema.safeParse({ currentPassword, newPassword });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Şifre alanlarını kontrol edin');
      return;
    }

    changePasswordMutation.mutate(parsed.data);
  };

  return {
    fullName,
    setFullName,
    email,
    showPasswordForm,
    setShowPasswordForm,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    showCurrentPassword,
    setShowCurrentPassword,
    showNewPassword,
    setShowNewPassword,
    updateProfileMutation,
    changePasswordMutation,
    handleProfileSubmit,
    handlePasswordSubmit,
  };
};
