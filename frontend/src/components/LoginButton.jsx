import { UserRound } from 'lucide-react';

export default function LoginButton({ onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-full border border-transparent bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-slate-900/15 transition-all duration-300 ease-out hover:border-slate-200 hover:bg-white hover:text-slate-900 hover:shadow-xl hover:shadow-slate-900/10 active:scale-[0.98] disabled:opacity-50"
    >
      <UserRound className="h-3.5 w-3.5" />
      ログイン
    </button>
  );
}
