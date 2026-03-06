import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LockKeyhole, UserRound, X } from 'lucide-react';

const INITIAL_FORM = {
  loginId: '',
  password: '',
};

const MotionDiv = motion.div;

function AuthModalContent({ onClose, onSubmit, loading, error }) {
  const [form, setForm] = useState(INITIAL_FORM);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
                  onClose();
                }
              };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleChange = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(form);
  };

  return (
    <>
      <MotionDiv
        className="fixed inset-0 z-[90] bg-slate-900/45 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <MotionDiv
        className="fixed inset-0 z-[100] flex items-center justify-center px-4"
        initial={{ opacity: 0, scale: 0.98, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 18 }}
        transition={{ duration: 0.2 }}
      >
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-[0_40px_120px_-48px_rgba(15,23,42,0.55)] backdrop-blur-xl"
        >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-400">アカウント</p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">ログイン / アカウント作成</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    ID とパスワードだけで利用できます。ID が見つからない場合は、そのままアカウントを作成します。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                  aria-label="ログインモーダルを閉じる"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-6 space-y-4">
                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                    <UserRound className="h-3.5 w-3.5" />
                    ID
                  </span>
                  <input
                    type="text"
                    value={form.loginId}
                    onChange={(event) => handleChange('loginId', event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-slate-400"
                    placeholder="ID を入力"
                    autoComplete="username"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                    <LockKeyhole className="h-3.5 w-3.5" />
                    パスワード
                  </span>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(event) => handleChange('password', event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-slate-400"
                    placeholder="パスワードを入力"
                    autoComplete="current-password"
                  />
                </label>
              </div>

              {error ? (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="mt-6 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 disabled:opacity-50"
              >
                {loading ? '処理中...' : 'ログイン / そのまま作成'}
              </button>
        </form>
      </MotionDiv>
    </>
  );
}

export default function AuthModal({ isOpen, onClose, onSubmit, loading, error }) {
  return (
    <AnimatePresence>
      {isOpen ? (
        <AuthModalContent
          key="auth-modal-content"
          onClose={onClose}
          onSubmit={onSubmit}
          loading={loading}
          error={error}
        />
      ) : null}
    </AnimatePresence>
  );
}
