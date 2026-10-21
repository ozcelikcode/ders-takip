import { useSettingsStore } from '../../store/settingsStore';

// Plain CSS keeps the first paint free of the animation library; reduced motion is honoured by index.css.
const LoadingScreen = () => {
  const { settings } = useSettingsStore();

  return (
    <div className="flex min-h-screen items-center justify-center bg-(--canvas)">
      <div className="text-center">
        <div
          aria-hidden="true"
          className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-(--line) border-t-(--solid)"
        />
        <div className="mt-4">
          <h1 className="mb-1 text-base font-medium">{settings.siteName}</h1>
          <p className="text-sm text-(--muted)">Sistem yükleniyor...</p>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
