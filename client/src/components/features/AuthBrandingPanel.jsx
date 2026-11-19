import { motion } from 'framer-motion';
import backgroundImage from '../../assets/bongabong.webp';

export default function AuthBrandingPanel({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="relative hidden min-w-0 flex-1 flex-col justify-between overflow-hidden bg-cover bg-center p-12 text-white lg:flex xl:p-16"
      style={{
        backgroundImage: `linear-gradient(180deg, rgb(13 34 65 / 54%), rgb(13 34 65 / 72%)), url(${backgroundImage})`,
        backgroundPosition: 'center 56%',
      }}
    >
      <div aria-hidden="true" />

      <div className="relative z-10 my-auto w-full max-w-xl py-12">{children}</div>

      <div className="relative z-10 flex items-center justify-between gap-4 border-t border-white/25 pt-5 text-xs text-white/80">
        <span>Province of Oriental Mindoro</span>
        <span>Republic of the Philippines</span>
      </div>
    </motion.div>
  );
}
