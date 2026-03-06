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
          <div className="relative overflow-hidden rounded-[1.35rem] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(244,248,251,0.92)_100%)] px-4 py-3 shadow-[0_28px_80px_-38px_rgba(15,23,42,0.55)] backdrop-blur-2xl">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-[linear-gradient(90deg,rgba(34,197,94,0.12),rgba(59,130,246,0.08),rgba(251,191,36,0.08))]" />
            <div className="relative flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#047857_0%,#0f766e_100%)] text-white shadow-[0_16px_30px_-20px_rgba(4,120,87,0.75)]">
                <CheckCircle2 className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                {toast.title ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">{toast.title}</p>
                    <span className="rounded-full border border-emerald-200/80 bg-emerald-50/90 px-2 py-0.5 text-[10px] font-semibold tracking-[0.2em] text-emerald-700">
                      STATUS
                    </span>
                  </div>
                ) : null}
                <p className="mt-1 text-sm leading-5 text-slate-600">{toast.message}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/80 bg-white/72 p-1 text-slate-400 shadow-sm transition hover:bg-white hover:text-slate-600"
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
