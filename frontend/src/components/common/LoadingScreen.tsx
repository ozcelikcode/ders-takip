import { motion } from 'framer-motion';

const LoadingScreen = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <div className="text-center">
        <motion.div
          className="inline-block w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="mt-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Ders Takip Sistemi
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Sistem yükleniyor...
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default LoadingScreen;