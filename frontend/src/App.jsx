import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { LogOut, Package, UserRound } from 'lucide-react';
import ShippingCalculator from './pages/ShippingCalculator';
import ScrollToTopButton from './components/ScrollToTopButton';
import AuthModal from './components/AuthModal';
import ToastPrompt from './components/ToastPrompt';
import { fetchAuthSession, loginOrRegister, logout } from './api/shippingApi';

const MotionHeader = motion.header;
const MotionMain = motion.main;

export default function App() {
  const mainRef = useRef(null);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSession, setAuthSession] = useState({
    authenticated: false,
    accountId: null,
    loginId: null,
  });
  const [authToast, setAuthToast] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      try {
        const session = await fetchAuthSession();
        if (!cancelled) {
          setAuthSession({
            authenticated: Boolean(session?.authenticated),
            accountId: session?.accountId ?? null,
            loginId: session?.loginId ?? null,
          });
        }
      } catch (error) {
        console.error('[App] Failed to load session:', error);
      } finally {
        if (!cancelled) {
          setAuthLoading(false);
        }
      }
    };

    loadSession();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!authToast) return undefined;
    const timeoutId = window.setTimeout(() => setAuthToast(null), 4200);
    return () => window.clearTimeout(timeoutId);
  }, [authToast]);

  const handleAuthSubmit = async (form) => {
    setAuthSubmitting(true);
    setAuthError('');

    try {
      const session = await loginOrRegister(form);
      setAuthSession({
        authenticated: Boolean(session?.authenticated),
        accountId: session?.accountId ?? null,
        loginId: session?.loginId ?? null,
      });
      setAuthToast(
        session?.justRegistered
          ? {
            title: null,
            message: session?.message || 'ID が見つからなかったため、そのままアカウントを作成しました。',
          }
          : {
            title: null,
            message: `${session?.loginId || 'アカウント'}でログインしました。`,
          },
      );
      setAuthModalOpen(false);
    } catch (error) {
      if (error?.status === 401) {
        setAuthError('このユーザーIDは既に使用されているか、パスワードが正しくありません。');
      } else {
        setAuthError(error?.message || 'ログインに失敗しました。');
      }
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('[App] Failed to logout:', error);
    } finally {
      setAuthSession({
        authenticated: false,
        accountId: null,
        loginId: null,
      });
      setAuthToast({
        title: null,
        message: 'アカウントからログアウトしました。',
      });
    }
  };

  return (
    <div className="h-[100dvh] min-h-[100svh] bg-neutral-50 text-neutral-900 selection:bg-rose-500/30 overflow-hidden flex flex-col">
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] h-[70vh] w-[70vw] rounded-full bg-blue-400 mix-blend-multiply blur-[128px] animate-blob" />
        <div className="absolute top-[-20%] right-[-10%] h-[70vh] w-[70vw] rounded-full bg-purple-400 mix-blend-multiply blur-[128px] animate-blob animation-delay-2000" />
        <div className="absolute bottom-[-20%] left-[20%] h-[70vh] w-[70vw] rounded-full bg-pink-400 mix-blend-multiply blur-[128px] animate-blob animation-delay-4000" />
      </div>

      <div
        className="relative z-10 mx-auto max-w-[1400px] px-3 pb-3 pt-3 sm:px-6 sm:pb-4 sm:pt-4 lg:px-8 h-full flex flex-col w-full"
        style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}
      >
        <MotionHeader
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="flex-none mb-3 sm:mb-4 flex items-center justify-between rounded-xl sm:rounded-2xl border border-white/40 bg-white/60 px-3 py-2 sm:px-4 sm:py-3 shadow-md backdrop-blur-md"
        >
          <div className="flex items-center gap-3 sm:gap-6">
            <a href="/" className="flex items-center gap-2 transition-transform hover:scale-[1.02]">
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-slate-900 to-slate-800 text-white shadow-md">
                <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
              <div>
                <p className="font-display text-sm sm:text-base font-bold leading-none tracking-tight text-shimmer">
                  SmartShip
                </p>
                <p className="text-[0.56rem] sm:text-[0.625rem] font-medium text-slate-500">
                  メルカリ特化型配送アシスタント
                </p>
              </div>
            </a>

            <div className="vote-badge">
              <div className="vote-badge-core text-[0.65rem] sm:text-xs font-semibold">
                <span className="flex items-center gap-1 drop-shadow-sm">
                  <span className="bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent font-black tracking-wider">
                    IT21-219
                  </span>
                  <span className="text-slate-700 font-bold">に投票してね！</span>
                  <span className="text-xs ml-0.5">🙌</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <h1 className="hidden lg:block text-sm font-medium text-slate-500">
              メルカリ便・郵便の送料比較を、もっとスマートに。
            </h1>
            {authSession.authenticated ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-3 py-2 text-xs font-semibold text-slate-700">
                  <UserRound className="h-3.5 w-3.5" />
                  {authSession.loginId}
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  ログアウト
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAuthError('');
                  setAuthModalOpen(true);
                }}
                disabled={authLoading}
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 disabled:opacity-50"
              >
                <UserRound className="h-3.5 w-3.5" />
                ログイン
              </button>
            )}
          </div>
        </MotionHeader>

        <MotionMain
          ref={mainRef}
          data-scroll-container="true"
          className="flex-1 min-h-0 overflow-y-auto lg:overflow-visible flex flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="flex-1 min-h-0">
            <ShippingCalculator
              onDrawerToggle={setCartDrawerOpen}
              authSession={authSession}
              onOpenLogin={() => {
                setAuthError('');
                setAuthModalOpen(true);
              }}
            />
          </div>
        </MotionMain>

        <ScrollToTopButton scrollContainerRef={mainRef} hidden={cartDrawerOpen} />
      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => {
          if (authSubmitting) return;
          setAuthModalOpen(false);
          setAuthError('');
        }}
        onSubmit={handleAuthSubmit}
        loading={authSubmitting}
        error={authError}
      />

      <ToastPrompt
        toast={authToast}
        onClose={() => setAuthToast(null)}
      />
    </div>
  );
}
