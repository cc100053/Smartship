import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Coins, Leaf, PackageCheck, RefreshCcw, Sparkles } from 'lucide-react';
import { fetchStatsSummary } from '../api/shippingApi';

const POLL_INTERVAL_MS = 2000;

const formatInteger = (value) => new Intl.NumberFormat('ja-JP').format(value || 0);
const formatCurrency = (value) => `¥${new Intl.NumberFormat('ja-JP').format(value || 0)}`;

const formatCo2e = (grams) => {
  const safeValue = Number(grams) || 0;
  return `${(safeValue / 1000).toFixed(2)} kg`;
};

const formatTimestamp = (value) => {
  if (!value) return 'まだ集計されていません';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '更新時刻を取得できません';
  return new Intl.DateTimeFormat('ja-JP', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
};

const defaultSummary = {
  totalCalculations: 0,
  estimatedYenSaved: 0,
  estimatedCo2eSavedG: 0,
  itemsPacked: 0,
  updatedAt: null,
};

const cards = [
  {
    key: 'totalCalculations',
    label: '正式計算回数',
    eyebrow: 'Total Calculations',
    accent: 'from-amber-200 via-orange-100 to-white',
    ring: 'ring-amber-300/50',
    icon: Sparkles,
    formatter: formatInteger,
    suffix: '回',
  },
  {
    key: 'estimatedYenSaved',
    label: '節約した送料',
    eyebrow: 'Estimated Yen Saved',
    accent: 'from-emerald-200 via-teal-100 to-white',
    ring: 'ring-emerald-300/50',
    icon: Coins,
    formatter: formatCurrency,
  },
  {
    key: 'estimatedCo2eSavedG',
    label: '推定 CO2e 削減',
    eyebrow: 'Estimated CO2e Saved',
    accent: 'from-sky-200 via-cyan-100 to-white',
    ring: 'ring-sky-300/50',
    icon: Leaf,
    formatter: formatCo2e,
    helper: '展示用の簡易推定値',
  },
  {
    key: 'itemsPacked',
    label: '梱包アイテム数',
    eyebrow: 'Items Packed',
    accent: 'from-rose-200 via-fuchsia-100 to-white',
    ring: 'ring-rose-300/50',
    icon: PackageCheck,
    formatter: formatInteger,
    suffix: '点',
  },
];

export default function StatsDashboard() {
  const [summary, setSummary] = useState(defaultSummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let timeoutId = null;
    let activeController = null;

    const poll = async () => {
      activeController?.abort();
      activeController = new AbortController();

      try {
        const nextSummary = await fetchStatsSummary({
          signal: activeController.signal,
          timeoutMs: 8000,
        });

        if (cancelled) return;

        setSummary({
          totalCalculations: nextSummary?.totalCalculations ?? 0,
          estimatedYenSaved: nextSummary?.estimatedYenSaved ?? 0,
          estimatedCo2eSavedG: nextSummary?.estimatedCo2eSavedG ?? 0,
          itemsPacked: nextSummary?.itemsPacked ?? 0,
          updatedAt: nextSummary?.updatedAt ?? null,
        });
        setError('');
      } catch (loadError) {
        if (cancelled || activeController.signal.aborted) {
          return;
        }
        console.error('[StatsDashboard] Failed to fetch summary:', loadError);
        setError('統計データの更新に失敗しました。次回の自動更新を待機しています。');
      } finally {
        if (!cancelled) {
          setLoading(false);
          timeoutId = window.setTimeout(poll, POLL_INTERVAL_MS);
        }
      }
    };

    poll();

    return () => {
      cancelled = true;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      activeController?.abort();
    };
  }, []);

  const meta = useMemo(() => ([
    {
      label: '更新方式',
      value: `通常ポーリング (${POLL_INTERVAL_MS / 1000}秒)`,
    },
    {
      label: '最終更新',
      value: formatTimestamp(summary.updatedAt),
    },
  ]), [summary.updatedAt]);

  return (
    <div className="min-h-[100svh] overflow-hidden bg-[linear-gradient(180deg,#fff9ef_0%,#f9fbff_52%,#eef7f6_100%)] text-slate-900">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-8%] top-[-12%] h-[34rem] w-[34rem] rounded-full bg-amber-300/35 blur-[140px]" />
        <div className="absolute right-[-10%] top-[12%] h-[30rem] w-[30rem] rounded-full bg-sky-300/30 blur-[130px]" />
        <div className="absolute bottom-[-12%] left-[25%] h-[28rem] w-[32rem] rounded-full bg-emerald-300/25 blur-[150px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.03)_1px,transparent_1px)] bg-[size:42px_42px]" />
      </div>

      <div className="relative mx-auto flex min-h-[100svh] max-w-[1440px] flex-col px-4 py-5 sm:px-6 lg:px-10">
        <motion.header
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="rounded-[2rem] border border-white/70 bg-white/70 px-5 py-5 shadow-[0_24px_80px_rgba(148,163,184,0.18)] backdrop-blur-xl sm:px-7 sm:py-6"
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                <RefreshCcw className="h-3.5 w-3.5" />
                LIVE IMPACT BOARD
              </p>
              <h1 className="font-display text-4xl leading-none tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                SmartShip の
                <span className="block bg-gradient-to-r from-amber-600 via-orange-500 to-rose-500 bg-clip-text text-transparent">
                  累積インパクト
                </span>
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                「計算運費」の成功ごとに、送料の節約額と推定 CO2e 削減量をリアルタイム集計します。
                展示向けのサマリーとして、いまこの場で生まれた効果を即座に可視化します。
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {meta.map((item) => (
                <div
                  key={item.label}
                  className="rounded-[1.5rem] border border-white/70 bg-white/85 px-4 py-3 shadow-[0_16px_50px_rgba(148,163,184,0.14)]"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-700 sm:text-base">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.header>

        <main className="flex flex-1 flex-col justify-center py-6 sm:py-8">
          {error ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 rounded-[1.75rem] border border-rose-200/80 bg-rose-50/90 px-5 py-4 text-sm font-medium text-rose-700 shadow-[0_16px_50px_rgba(251,113,133,0.12)]"
            >
              {error}
            </motion.div>
          ) : null}

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {cards.map((card, index) => {
              const Icon = card.icon;
              const value = summary[card.key];
              return (
                <motion.article
                  key={card.key}
                  initial={{ opacity: 0, y: 22 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.42, delay: index * 0.05 }}
                  className={`relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-[0_25px_75px_rgba(148,163,184,0.16)] backdrop-blur-xl ring-1 ${card.ring} sm:p-6`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${card.accent} opacity-90`} />
                  <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.95),transparent_72%)]" />

                  <div className="relative flex h-full flex-col">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{card.eyebrow}</p>
                        <h2 className="mt-2 text-lg font-semibold text-slate-800">{card.label}</h2>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/80 bg-white/90 text-slate-700 shadow-sm">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>

                    <div className="mt-10">
                      <p className="font-display text-[2.6rem] leading-none tracking-tight text-slate-950 sm:text-[3.2rem]">
                        {loading ? '...' : card.formatter(value)}
                      </p>
                      {card.suffix ? (
                        <p className="mt-3 text-sm font-semibold text-slate-600">{card.suffix}</p>
                      ) : null}
                      {card.helper ? (
                        <p className="mt-3 text-xs font-medium text-slate-500">{card.helper}</p>
                      ) : (
                        <p className="mt-3 text-xs font-medium text-slate-500">
                          正式な計算イベントのみを累積しています。
                        </p>
                      )}
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </section>

          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.2 }}
            className="mt-6 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]"
          >
            <div className="rounded-[2rem] border border-white/70 bg-slate-950/92 px-6 py-6 text-white shadow-[0_30px_90px_rgba(15,23,42,0.24)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/55">Showcase Note</p>
              <p className="mt-4 text-2xl font-display leading-tight sm:text-3xl">
                小さい箱を選べたぶんだけ、
                <span className="text-amber-300">送料も CO2e も抑えられる。</span>
              </p>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-white/72 sm:text-base">
                CO2e は、推奨配送方法と次点の配送方法の最大寸法差に、実際の梱包重量を掛け合わせた展示用 proxy です。
                厳密な輸送排出量ではなく、SmartShip が小さい配送枠を見つけた価値を直感的に見せるための指標として扱います。
              </p>
            </div>

            <div className="rounded-[2rem] border border-white/70 bg-white/82 px-6 py-6 shadow-[0_24px_75px_rgba(148,163,184,0.18)] backdrop-blur-xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Status</p>
              <div className="mt-4 space-y-4 text-sm text-slate-600">
                <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-3">
                  <p className="font-semibold text-slate-700">集計対象</p>
                  <p className="mt-1 leading-6">`計算運費` ボタンの成功リクエストのみ。</p>
                </div>
                <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-3">
                  <p className="font-semibold text-slate-700">更新頻度</p>
                  <p className="mt-1 leading-6">2 秒ごとに再取得。ページを開いた直後にも最新値を読みに行きます。</p>
                </div>
                <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-3">
                  <p className="font-semibold text-slate-700">ゼロ表示</p>
                  <p className="mt-1 leading-6">まだ記録がない場合でも、4 指標はすべて 0 で安定表示します。</p>
                </div>
              </div>
            </div>
          </motion.section>
        </main>
      </div>
    </div>
  );
}
