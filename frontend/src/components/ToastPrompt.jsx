import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, X } from 'lucide-react';

const MotionDiv = motion.div;

export default function ToastPrompt({ toast, onClose }) {
  return (
    <AnimatePresence>
      {toast ? (
        <MotionDiv
          initial={{ opacity: 0, y: 18, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.18 }}
          className="fixed bottom-4 right-4 z-[120] w-[min(24rem,calc(100vw-2rem))]"
          style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <div className="rounded-2xl border border-emerald-200/80 bg-white/95 px-4 py-3 shadow-[0_20px_70px_-35px_rgba(16,185,129,0.5)] backdrop-blur-xl">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
              <div className="min-w-0 flex-1">
                <p className="mt-1 text-sm leading-5 text-slate-600">{toast.message}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="通知を閉じる"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </MotionDiv>
      ) : null}
    </AnimatePresence>
  );
}
