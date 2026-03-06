import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Box, Coins, Leaf, RefreshCcw, RotateCcw, Sparkles, TimerReset } from 'lucide-react';
import { fetchStatsSummary, fetchStatsVolumeTrend, resetStatsData } from '../api/shippingApi';
import { cn } from '../utils/cn';

const POLL_INTERVAL_MS = 2000;

const formatInteger = (value) => new Intl.NumberFormat('ja-JP').format(value || 0);
const formatCurrency = (value) => `¥${new Intl.NumberFormat('ja-JP').format(value || 0)}`;
const formatCompactInteger = (value) => new Intl.NumberFormat('ja-JP', { notation: 'compact' }).format(value || 0);

const formatCo2e = (grams) => {
  const safeValue = Number(grams) || 0;
  return `${(safeValue / 1000).toFixed(2)} kg`;
};

const formatSavedVolume = (cm3) => {
  const safeValue = Number(cm3) || 0;
  const liters = safeValue / 1000;

  if (liters >= 1000) {
    return `${new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 1 }).format(liters / 1000)} m3`;
  }

  if (liters >= 100) {
    return `${new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 0 }).format(liters)} L`;
  }

  return `${new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 1 }).format(liters)} L`;
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
  cumulativeVolumeSavedCm3: 0,
  updatedAt: null,
};

const getStatsErrorMessage = (error) => {
  if (error instanceof TypeError || error?.name === 'TypeError') {
    return '統計 API に接続できません。バックエンドが起動しているか確認してください。';
  }

  if (typeof error?.message === 'string' && error.message.trim()) {
    return `統計データの更新に失敗しました: ${error.message.trim()}`;
  }

  return '統計データの更新に失敗しました。次回の自動更新を待機しています。';
};

const getResetErrorMessage = (error) => {
  if (error instanceof TypeError || error?.name === 'TypeError') {
    return '統計データを初期化できません。バックエンド接続を確認してください。';
  }

  if (typeof error?.message === 'string' && error.message.trim()) {
    return `統計データを初期化できませんでした: ${error.message.trim()}`;
  }

  return '統計データを初期化できませんでした。';
};

function VolumeSparkline({ points }) {
  if (!points?.length) {
    return (
      <div className="mt-4 flex h-16 items-center justify-center rounded-2xl border border-white/60 bg-white/55 text-[11px] font-medium text-slate-500">
        まだ trend data はありません
      </div>
    );
  }

  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = Math.max(max - min, 1);
  const width = 220;
  const height = 64;

  const path = points.map((point, index) => {
    const x = (index / Math.max(points.length - 1, 1)) * width;
    const y = height - ((point - min) / range) * (height - 8) - 4;
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  const area = `${path} L ${width} ${height} L 0 ${height} Z`;
  const latest = points[points.length - 1] || 0;

  return (
    <div className="mt-4 rounded-2xl border border-white/60 bg-white/55 px-3 py-3">
      <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        <span>Recent Volume Trend</span>
        <span>{formatSavedVolume(latest)}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-16 w-full overflow-visible">
        <defs>
          <linearGradient id="volumeSparklineFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(99,102,241,0.38)" />
            <stop offset="100%" stopColor="rgba(99,102,241,0.04)" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#volumeSparklineFill)" />
        <path
          d={path}
          fill="none"
          stroke="rgb(79,70,229)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx={(Math.max(points.length - 1, 0) / Math.max(points.length - 1, 1)) * width}
          cy={height - ((latest - min) / range) * (height - 8) - 4}
          r="4"
          fill="white"
          stroke="rgb(79,70,229)"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}

const cards = [
  {
    key: 'totalCalculations',
    label: '正式計算回数',
    eyebrow: 'Total Calculations',
    group: 'Activity',
    accent: 'from-amber-200 via-orange-100 to-white',
    ring: 'ring-amber-300/50',
    chipClass: 'bg-amber-100 text-amber-700',
    iconShellClass: 'border-amber-200/80 bg-amber-50/92 text-amber-700',
    icon: Sparkles,
    formatter: formatInteger,
    suffix: '回',
    footnote: '正式な計算イベントのみ',
  },
  {
    key: 'estimatedYenSaved',
    label: '節約した送料',
    eyebrow: 'Estimated Yen Saved',
    group: 'Cost',
    accent: 'from-emerald-200 via-teal-100 to-white',
    ring: 'ring-emerald-300/50',
    chipClass: 'bg-emerald-100 text-emerald-700',
    iconShellClass: 'border-emerald-200/80 bg-emerald-50/92 text-emerald-700',
    icon: Coins,
    formatter: formatCurrency,
    footnote: '推奨案と次点案の送料差分',
  },
  {
    key: 'estimatedCo2eSavedG',
    label: '推定 CO2e 削減',
    eyebrow: 'Estimated CO2e Saved',
    group: 'Carbon',
    accent: 'from-sky-200 via-cyan-100 to-white',
    ring: 'ring-sky-300/50',
    chipClass: 'bg-sky-100 text-sky-700',
    iconShellClass: 'border-sky-200/80 bg-sky-50/92 text-sky-700',
    icon: Leaf,
    formatter: formatCo2e,
    helper: '簡易推定値',
  },
  {
    key: 'cumulativeVolumeSavedCm3',
    label: '累積節省包裝體積',
    eyebrow: 'Saved Packaging Volume',
    group: 'Volume',
    accent: 'from-violet-200 via-indigo-100 to-white',
    ring: 'ring-violet-300/50',
    chipClass: 'bg-violet-100 text-violet-700',
    iconShellClass: 'border-violet-200/80 bg-violet-50/92 text-violet-700',
    icon: Box,
    formatter: formatSavedVolume,
    helper: '次点配送枠との差分体積を累積',
    showSparkline: true,
  },
];

export default function StatsDashboard() {
  const [summary, setSummary] = useState(defaultSummary);
  const [volumeTrend, setVolumeTrend] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timeoutId = null;
    let activeController = null;

    const poll = async () => {
      activeController?.abort();
      activeController = new AbortController();

      try {
        const [nextSummary, nextTrend] = await Promise.all([
          fetchStatsSummary({
            signal: activeController.signal,
            timeoutMs: 8000,
          }),
          fetchStatsVolumeTrend({
            signal: activeController.signal,
            timeoutMs: 8000,
          }),
        ]);

        if (cancelled) return;

        setSummary({
          totalCalculations: nextSummary?.totalCalculations ?? 0,
          estimatedYenSaved: nextSummary?.estimatedYenSaved ?? 0,
          estimatedCo2eSavedG: nextSummary?.estimatedCo2eSavedG ?? 0,
          cumulativeVolumeSavedCm3: nextSummary?.cumulativeVolumeSavedCm3 ?? 0,
          updatedAt: nextSummary?.updatedAt ?? null,
        });
        setVolumeTrend(Array.isArray(nextTrend?.points) ? nextTrend.points : []);
        setError('');
      } catch (loadError) {
        if (cancelled || activeController.signal.aborted) {
          return;
        }
        console.error('[StatsDashboard] Failed to fetch summary:', loadError);
        setError(getStatsErrorMessage(loadError));
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

  const handleReset = async () => {
    if (resetting) return;

    const confirmed = window.confirm('統計データをすべてリセットします。元に戻せません。続けますか？');
    if (!confirmed) {
      return;
    }

    setResetError('');
    setResetting(true);

    try {
      await resetStatsData();
      setSummary(defaultSummary);
      setVolumeTrend([]);
      setError('');
    } catch (resetDataError) {
      console.error('[StatsDashboard] Failed to reset stats:', resetDataError);
      setResetError(getResetErrorMessage(resetDataError));
    } finally {
      setResetting(false);
    }
  };

  const meta = useMemo(() => ([
    {
      label: '更新方式',
      value: `${POLL_INTERVAL_MS / 1000} 秒ごとのライブ更新`,
      icon: TimerReset,
    },
    {
      label: '最終更新',
      value: formatTimestamp(summary.updatedAt),
      icon: RefreshCcw,
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
          className="rounded-[2rem] border border-white/70 bg-white/72 px-5 py-5 shadow-[0_24px_80px_rgba(148,163,184,0.18)] backdrop-blur-xl sm:px-7 sm:py-6"
        >
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
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
                「送料を計算」の成功ごとに、送料の節約額、推定 CO2e 削減量、そして小さい配送枠を選べたことで減らせた包裝體積をリアルタイム集計します。
                展示向けの live summary として、いまこの場で生まれた効果を即座に見せます。
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[25rem]">
              {meta.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="rounded-[1.5rem] border border-white/70 bg-white/88 px-4 py-3 shadow-[0_16px_50px_rgba(148,163,184,0.14)]"
                  >
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      <Icon className="h-3.5 w-3.5" />
                      <span>{item.label}</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-700 sm:text-base">{item.value}</p>
                  </div>
                );
              })}
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
              const numericValue = Number(value) || 0;
              return (
                <motion.article
                  key={card.key}
                  initial={{ opacity: 0, y: 22 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.42, delay: index * 0.05 }}
                  className={`relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/82 p-5 shadow-[0_25px_75px_rgba(148,163,184,0.16)] backdrop-blur-xl ring-1 ${card.ring} sm:p-6`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${card.accent} opacity-90`} />
                  <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.95),transparent_72%)]" />

                  <div className="relative flex h-full flex-col">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{card.eyebrow}</p>
                        <div className={cn('mt-3 inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]', card.chipClass)}>
                          {card.group}
                        </div>
                        <h2 className="mt-2 text-lg font-semibold text-slate-800">{card.label}</h2>
                      </div>
                      <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl border shadow-sm', card.iconShellClass)}>
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>

                    <div className="mt-8">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {loading ? 'Updating...' : `${formatCompactInteger(numericValue)} total`}
                      </p>
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
                          {card.footnote}
                        </p>
                      )}
                      {card.showSparkline ? <VolumeSparkline points={volumeTrend} /> : null}
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
            className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]"
          >
            <div className="rounded-[2rem] border border-slate-900/80 bg-slate-950/94 px-6 py-6 text-white shadow-[0_30px_90px_rgba(15,23,42,0.24)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/55">Impact Story</p>
              <p className="mt-4 text-2xl font-display leading-tight sm:text-3xl">
                SmartShip は、
                <span className="text-amber-300">より小さい配送枠を選べた価値</span>
                を 3 つの指標で見せます。
              </p>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/45">Cost</p>
                  <p className="mt-2 text-sm leading-6 text-white/80">次点配送方法との差額から、送料インパクトを累積表示。</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/45">Carbon</p>
                  <p className="mt-2 text-sm leading-6 text-white/80">最大寸法差と重量から、展示向けの CO2e proxy を算出。</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/45">Volume</p>
                  <p className="mt-2 text-sm leading-6 text-white/80">推奨配送枠と次点配送枠の体積差を積み上げ、包裝體積の節約を見せます。</p>
                </div>
              </div>
              <p className="mt-5 max-w-3xl text-sm leading-7 text-white/68 sm:text-base">
                ここでの体積は配送候補サイズの直方体体積です。物流現場の厳密な容積計算ではなく、SmartShip が「どれだけ大きい箱を避けられたか」を直感的に伝えるための showcase metric として扱います。
              </p>
            </div>

            <div className="rounded-[2rem] border border-white/70 bg-white/82 px-6 py-6 shadow-[0_24px_75px_rgba(148,163,184,0.18)] backdrop-blur-xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Metric Notes</p>
              <div className="mt-4 space-y-4 text-sm text-slate-600">
                <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-3">
                  <p className="font-semibold text-slate-700">集計対象</p>
                  <p className="mt-1 leading-6">`送料を計算` ボタンの成功リクエストのみをカウントします。</p>
                </div>
                <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-3">
                  <p className="font-semibold text-slate-700">包裝體積の定義</p>
                  <p className="mt-1 leading-6">各配送候補の `長さ × 幅 × 高さ` を比較し、推奨案が小さくなったぶんを累積します。</p>
                </div>
                <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-3">
                  <p className="font-semibold text-slate-700">ゼロ表示</p>
                  <p className="mt-1 leading-6">記録がまだない場合でも、4 指標はすべて 0 で安定表示します。</p>
                </div>
              </div>
            </div>
          </motion.section>

          {resetError ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 rounded-[1.5rem] border border-rose-200/80 bg-rose-50/90 px-4 py-3 text-sm font-medium text-rose-700 shadow-[0_12px_35px_rgba(251,113,133,0.12)]"
            >
              {resetError}
            </motion.div>
          ) : null}
        </main>
      </div>

      <div className="pointer-events-none fixed bottom-5 right-5 z-30">
        <motion.button
          type="button"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleReset}
          disabled={resetting}
          className="pointer-events-auto inline-flex min-h-12 items-center gap-3 rounded-full border border-slate-900/85 bg-slate-950/94 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(15,23,42,0.28)] transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {resetting ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
          <span>Reset Data</span>
          <BarChart3 className="h-4 w-4 text-white/70" />
        </motion.button>
      </div>
    </div>
  );
}
