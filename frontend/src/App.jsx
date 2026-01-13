import ShippingCalculator from './pages/ShippingCalculator';

export default function App() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-6 py-12 lg:px-10">
        <header className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white/80 px-8 py-10 shadow-[0_30px_80px_-60px_rgba(15,23,42,0.7)] backdrop-blur">
          <div className="absolute -right-24 -top-28 h-52 w-52 rounded-full bg-gradient-to-br from-amber-200 via-orange-200 to-rose-200 opacity-70 blur-2xl" />
          <div className="absolute -left-20 bottom-8 h-40 w-40 rounded-full bg-gradient-to-br from-emerald-200 via-teal-200 to-cyan-200 opacity-70 blur-2xl" />

          <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.6em] text-slate-500">SmartShip</p>
              <h1 className="font-display text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
                送料の最適解を、数分で。
              </h1>
              <p className="max-w-xl text-sm text-slate-600 sm:text-base">
                売れ筋商品のサイズを組み合わせ、最安の配送方法を自動で導きます。
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="#catalog"
                  className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5"
                >
                  商品一覧へ
                </a>
                <div className="rounded-full border border-slate-200/70 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Supabase 接続済み
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-between gap-6">
              <div className="rounded-2xl border border-slate-200/70 bg-slate-900 px-5 py-4 text-white shadow-xl shadow-slate-900/30">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-300">最新カタログ</p>
                <p className="mt-3 text-3xl font-semibold">Supabase 同期</p>
                <p className="mt-2 text-sm text-slate-300">
                  商品サイズと配送ルールをリアルタイム反映。
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-white/80 px-5 py-4 text-sm text-slate-600">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">ステータス</p>
                <p className="mt-2 text-base font-semibold text-slate-900">
                  カート・手動見積り対応
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="mt-12">
          <ShippingCalculator />
        </main>
      </div>
    </div>
  );
}
