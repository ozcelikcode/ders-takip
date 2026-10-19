import { motion } from 'framer-motion';
import { useSettingsStore } from '../../store/settingsStore';

const LoadingScreen = () => {
  const { settings } = useSettingsStore();

  return (
    <div className="min-h-screen bg-[var(--canvas)] flex items-center justify-center">
      <div className="text-center">
        <motion.div
          className="inline-block h-8 w-8 rounded-full border-2 border-[var(--line)] border-t-[var(--solid)]"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="mt-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h1 className="mb-1 text-base font-medium">
            {settings.siteName}
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Sistem yükleniyor...
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default LoadingScreen;