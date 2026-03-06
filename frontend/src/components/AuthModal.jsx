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
        onClick={onClose}
      >
        <form
          onSubmit={handleSubmit}
          onClick={(event) => event.stopPropagation()}
          className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(246,248,252,0.92)_100%)] p-6 shadow-[0_45px_140px_-54px_rgba(15,23,42,0.6)] backdrop-blur-2xl"
        >
          <div className="pointer-events-none absolute inset-x-6 top-0 h-24 rounded-b-[2.5rem] bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.18),rgba(56,189,248,0.08)_38%,transparent_72%)]" />
          <div className="pointer-events-none absolute -right-10 top-8 h-28 w-28 rounded-full bg-amber-200/30 blur-2xl" />

          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0f172a_0%,#334155_100%)] text-white shadow-[0_14px_30px_-18px_rgba(15,23,42,0.9)] ring-1 ring-white/20">
                  <LockKeyhole className="h-5 w-5" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-400">アカウント</p>
                  <span className="rounded-full border border-indigo-200/70 bg-white/75 px-2.5 py-1 text-[10px] font-semibold tracking-[0.2em] text-indigo-600">
                    AUTO CREATE
                  </span>
                </div>
              </div>
              <h2 className="mt-4 text-[1.9rem] font-semibold leading-tight text-slate-900">ログイン</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                ID とパスワードだけで使えます。ID が見つからない場合は、そのまま新しいアカウントを作成します。
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/80 bg-white/70 p-2 text-slate-500 shadow-sm transition hover:bg-white hover:text-slate-700"
              aria-label="ログインモーダルを閉じる"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="relative mt-6 rounded-[1.75rem] border border-white/80 bg-white/72 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                  <UserRound className="h-3.5 w-3.5" />
                  ID
                </span>
                <input
                  type="text"
                  value={form.loginId}
                  onChange={(event) => handleChange('loginId', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-3.5 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-350 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                  placeholder="ID を入力"
                  autoComplete="username"
                />
              </label>

              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
                  <LockKeyhole className="h-3.5 w-3.5" />
                  パスワード
                </span>
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => handleChange('password', event.target.value)}
                  className="w-full rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-3.5 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-350 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                  placeholder="パスワードを入力"
                  autoComplete="current-password"
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-medium">リダイレクトなし</span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-medium">ID 未登録なら即作成</span>
            </div>
          </div>

          {error ? (
            <div className="relative mt-4 rounded-2xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm text-rose-700 shadow-[0_10px_24px_-18px_rgba(225,29,72,0.45)]">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="relative mt-6 flex w-full items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0f172a_0%,#312e81_55%,#1d4ed8_100%)] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_24px_50px_-24px_rgba(49,46,129,0.85)] transition hover:brightness-105 hover:shadow-[0_28px_56px_-24px_rgba(49,46,129,0.72)] disabled:opacity-50"
          >
            {loading ? '処理中...' : 'ログインして続行'}
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
