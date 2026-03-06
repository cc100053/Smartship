import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Box, Coins, Leaf, RefreshCcw, RotateCcw, Sparkles, TimerReset } from 'lucide-react';
import { fetchStatsSummary, resetStatsData } from '../api/shippingApi';
import { cn } from '../utils/cn';

const POLL_INTERVAL_MS = 2000;

const formatInteger = (value) => new Intl.NumberFormat('ja-JP').format(value || 0);
const formatCompactInteger = (value) => new Intl.NumberFormat('ja-JP', { notation: 'compact' }).format(value || 0);

const formatIntegerParts = (value) => ({
  digits: formatInteger(value),
});

const formatCurrencyParts = (value) => ({
  prefix: '¥',
  digits: formatInteger(value),
});

const formatCo2e = (grams) => {
  const safeValue = Number(grams) || 0;
  return `${(safeValue / 1000).toFixed(2)} kg`;
};

const formatCo2eParts = (grams) => {
  const safeValue = Number(grams) || 0;
  return {
    digits: (safeValue / 1000).toFixed(2),
    unit: 'kg',
  };
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

const formatSavedVolumeParts = (cm3) => {
  const safeValue = Number(cm3) || 0;
  const liters = safeValue / 1000;

  if (liters >= 1000) {
    return {
      digits: new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 1 }).format(liters / 1000),
      unit: 'm3',
    };
  }

  if (liters >= 100) {
    return {
      digits: new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 0 }).format(liters),
      unit: 'L',
    };
  }

  return {
    digits: new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 1 }).format(liters),
    unit: 'L',
  };
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

const DIGIT_CELL_HEIGHT = 1.25; // Increase height to prevent clipping of descenders like commas
const KPI_PREFIX_OFFSET_EM = -0.3;
const KPI_SUFFIX_OFFSET_EM = -0.22;
const ROLLING_PUNCTUATION_OFFSETS = {
  ',': -0.1,
  '.': -0.1,
};

const getKpiSizing = (parts, hasAffix) => {
  const digitLength = Array.from(parts?.digits ?? '').length;
  const totalLength = digitLength + (hasAffix ? 1 : 0);

  if (totalLength >= 12) {
    return {
      rowClassName: 'gap-1',
      digitsClassName: 'text-[2.02rem] sm:text-[2.45rem]',
      prefixClassName: 'text-[1.45rem] sm:text-[1.72rem]',
      suffixClassName: 'text-[1.3rem] sm:text-[1.56rem]',
    };
  }

  if (totalLength >= 10) {
    return {
      rowClassName: 'gap-1',
      digitsClassName: 'text-[2.28rem] sm:text-[2.78rem]',
      prefixClassName: 'text-[1.65rem] sm:text-[1.95rem]',
      suffixClassName: 'text-[1.45rem] sm:text-[1.75rem]',
    };
  }

  return {
    rowClassName: 'gap-1.5',
    digitsClassName: 'text-[2.75rem] sm:text-[3.3rem]',
    prefixClassName: 'text-[2rem] sm:text-[2.4rem]',
    suffixClassName: 'text-[1.8rem] sm:text-[2.2rem]',
  };
};

const buildDigitFrames = (previousDigit, nextDigit) => {
  if (!Number.isInteger(previousDigit) || !Number.isInteger(nextDigit)) {
    return [String(nextDigit ?? 0)];
  }

  const frames = [String(previousDigit)];
  let cursor = previousDigit;

  while (cursor !== nextDigit) {
    cursor = (cursor + 1) % 10;
    frames.push(String(cursor));
  }

  return frames;
};

function RollingDigit({ previousChar, nextChar, place, depth }) {
  const previousDigit = previousChar != null && /\d/.test(previousChar) ? Number(previousChar) : 0;
  const nextDigit = nextChar != null && /\d/.test(nextChar) ? Number(nextChar) : 0;
  const frames = buildDigitFrames(previousDigit, nextDigit);
  const offset = -((frames.length - 1) * DIGIT_CELL_HEIGHT);
  const duration = Math.min(2.66, Math.max(0.9, frames.length * 0.27));

  return (
    <span
      className="relative inline-flex h-[1.25em] overflow-hidden align-bottom"
      style={{ width: `${place === 0 ? 0.72 : 0.66}em` }}
    >
      <motion.span
        key={`${place}-${previousChar ?? 'x'}-${nextChar ?? 'x'}`}
        initial={{ y: 0 }}
        animate={{ y: `${offset}em` }}
        transition={{ duration, delay: depth * 0.09, ease: [0.16, 1, 0.3, 1] }}
        className="absolute left-0 top-0 flex flex-col"
      >
        {frames.map((digit, index) => (
          <span
            key={`${place}-${digit}-${index}`}
            className="flex h-[1.25em] items-center justify-center leading-none"
          >
            {digit}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

function RollingGlyph({ char }) {
  const punctuationOffset = ROLLING_PUNCTUATION_OFFSETS[char] ?? 0;

  return (
    <span
      className="inline-flex h-[1.25em] items-end leading-none align-bottom"
      style={punctuationOffset ? { transform: `translateY(${punctuationOffset}em)` } : undefined}
    >
      {char}
    </span>
  );
}

function RollingValue({ text, className, loading }) {
  const formattedValue = loading ? '...' : text;
  const [currentText, setCurrentText] = useState(formattedValue);
  const previousTextRef = useRef(formattedValue);

  useEffect(() => {
    if (formattedValue === currentText) {
      return undefined;
    }

    previousTextRef.current = currentText;
    setCurrentText(formattedValue);
  }, [formattedValue, currentText]);

  const previousText = previousTextRef.current;
  const nextChars = Array.from(currentText);
  const prevChars = Array.from(previousText);
  const maxLength = Math.max(nextChars.length, prevChars.length);

  return (
    <span className={cn('inline-flex flex-nowrap items-end overflow-visible leading-none', className)}>
      {Array.from({ length: maxLength }).map((_, index) => {
        const nextChar = nextChars[maxLength - 1 - index];
        const previousChar = prevChars[maxLength - 1 - index];
        const place = maxLength - 1 - index;
        const depth = index;

        if (nextChar == null && previousChar == null) {
          return null;
        }

        const isDigitPair = /\d/.test(nextChar ?? '') || /\d/.test(previousChar ?? '');

        return (
          <span key={`${place}-${nextChar ?? 'empty'}-${previousChar ?? 'empty'}`} className="inline-flex h-[1.25em] items-end overflow-visible">
            {isDigitPair && /\d/.test(nextChar ?? '') ? (
              <RollingDigit previousChar={previousChar} nextChar={nextChar} place={place} depth={depth} />
            ) : (
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={`${place}-${nextChar ?? 'space'}`}
                  initial={{ y: previousChar && previousChar !== nextChar ? '45%' : 0, opacity: previousChar && previousChar !== nextChar ? 0 : 1 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: '-45%', opacity: 0 }}
                  transition={{ duration: 0.72, delay: depth * 0.045 }}
                  className="inline-flex h-[1.25em] items-end overflow-visible"
                >
                  <RollingGlyph char={nextChar ?? ''} />
                </motion.span>
              </AnimatePresence>
            )}
          </span>
        );
      }).reverse()}
    </span>
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
    formatParts: formatIntegerParts,
    suffix: '回',
    note: '正式な計算イベントのみ',
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
    formatParts: formatCurrencyParts,
    note: '推奨案と次点案の送料差分',
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
    formatParts: formatCo2eParts,
    note: '簡易推定値',
  },
  {
    key: 'cumulativeVolumeSavedCm3',
    label: '包装体積削減',
    eyebrow: 'Saved Packaging Volume',
    group: 'Volume',
    accent: 'from-violet-200 via-indigo-100 to-white',
    ring: 'ring-violet-300/50',
    chipClass: 'bg-violet-100 text-violet-700',
    iconShellClass: 'border-violet-200/80 bg-violet-50/92 text-violet-700',
    icon: Box,
    formatParts: formatSavedVolumeParts,
    note: '次点配送枠との差分体積を累積',
  },
];

export default function StatsDashboard() {
  const [summary, setSummary] = useState(defaultSummary);
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
        const nextSummary = await fetchStatsSummary({
          signal: activeController.signal,
          timeoutMs: 8000,
        });

        if (cancelled) return;

        setSummary({
          totalCalculations: nextSummary?.totalCalculations ?? 0,
          estimatedYenSaved: nextSummary?.estimatedYenSaved ?? 0,
          estimatedCo2eSavedG: nextSummary?.estimatedCo2eSavedG ?? 0,
          cumulativeVolumeSavedCm3: nextSummary?.cumulativeVolumeSavedCm3 ?? 0,
          updatedAt: nextSummary?.updatedAt ?? null,
        });
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
              const parts = card.formatParts(value);
              const hasAffix = Boolean(parts.prefix || parts.unit || card.suffix);
              const kpiSizing = getKpiSizing(parts, hasAffix);
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

                    <div className="mt-8 flex min-w-0 flex-col">
                      <div className={cn('mt-2 flex min-w-0 items-end font-kpi leading-none text-slate-950', kpiSizing.rowClassName)}>
                        {!loading && parts.prefix ? (
                          <span
                            className={cn('inline-flex shrink-0 items-end font-semibold tracking-[-0.04em] opacity-80', kpiSizing.prefixClassName)}
                            style={{ transform: `translateY(${KPI_PREFIX_OFFSET_EM}em)` }}
                          >
                            {parts.prefix}
                          </span>
                        ) : null}
                        <RollingValue
                          text={parts.digits}
                          loading={loading}
                          className={cn('min-w-0 font-semibold tracking-[-0.06em]', kpiSizing.digitsClassName)}
                        />
                        {!loading && (parts.unit || card.suffix) ? (
                          <span
                            className={cn('inline-flex shrink-0 items-end font-semibold tracking-[-0.02em] opacity-80', kpiSizing.suffixClassName)}
                            style={{ transform: `translateY(${KPI_SUFFIX_OFFSET_EM}em)` }}
                          >
                            {parts.unit || card.suffix}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 self-end text-right text-xs font-medium text-slate-500">{card.note}</p>
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
            <div className="relative overflow-hidden rounded-[2rem] border border-amber-200/80 bg-[linear-gradient(145deg,rgba(255,251,235,0.98),rgba(255,255,255,0.96))] px-6 py-6 text-slate-900 shadow-[0_30px_90px_rgba(180,83,9,0.12)]">
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-200/55 blur-3xl" />
                <div className="absolute bottom-0 left-0 h-24 w-full bg-[linear-gradient(90deg,rgba(251,191,36,0.08),rgba(249,115,22,0.04),transparent)]" />
              </div>
              <div className="relative">
                <p className="inline-flex rounded-full border border-amber-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-700">
                  Impact Story
                </p>
                <div className="mt-4 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                  <div>
                    <p className="text-2xl font-display leading-tight text-slate-950 sm:text-3xl">
                      SmartShip は、
                      <span className="text-amber-700">より小さい配送枠を選べた価値</span>
                      を読み取りやすい 3 指標で見せます。
                    </p>
                    <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-700 sm:text-base">
                      送料、CO2e proxy、包裝體積を並べることで、「どれだけ無駄な大箱を避けられたか」をその場で理解できる showcase card にしています。
                    </p>
                  </div>
                  <div className="rounded-[1.6rem] border border-amber-200/80 bg-white/72 px-4 py-4 shadow-[0_18px_45px_rgba(180,83,9,0.08)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Why It Matters</p>
                    <p className="mt-3 text-sm leading-6 text-slate-700">
                      体積は配送候補サイズの直方体体積です。厳密な物流容積ではなく、
                      SmartShip が「大きすぎる箱をどれだけ避けたか」を直感的に伝える showcase metric として扱います。
                    </p>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-amber-200/70 bg-white/78 px-4 py-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">Cost</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">次点配送方法との差額から、送料インパクトを累積表示。</p>
                  </div>
                  <div className="rounded-2xl border border-sky-200/80 bg-sky-50/80 px-4 py-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">Carbon</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">最大寸法差と重量から、展示向けの CO2e proxy を算出。</p>
                  </div>
                  <div className="rounded-2xl border border-violet-200/80 bg-violet-50/80 px-4 py-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-700">Volume</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">推奨配送枠と次点配送枠の体積差を積み上げ、包裝體積の節約を見せます。</p>
                  </div>
                </div>
              </div>
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
                  <p className="font-semibold text-slate-700">碳排放計算說明</p>
                  <p className="mt-1 leading-6">推定 CO2e 削減量 (g) = 最大寸法差 (cm) × 12 × clamp(梱包重量 (kg), 0.8, 2.0)</p>
                </div>
              </div>
            </div>
          </motion.section>

          <div className="mt-8 flex flex-col items-end gap-3">
            {resetError ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full rounded-[1.5rem] border border-rose-200/80 bg-rose-50/90 px-4 py-3 text-sm font-medium text-rose-700 shadow-[0_12px_35px_rgba(251,113,133,0.12)] lg:max-w-xl"
              >
                {resetError}
              </motion.div>
            ) : null}

            <motion.button
              type="button"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleReset}
              disabled={resetting}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-300/80 bg-white/78 px-4 py-2.5 text-sm font-medium text-slate-600 shadow-[0_10px_25px_rgba(148,163,184,0.14)] backdrop-blur transition hover:border-slate-400/80 hover:bg-white/88 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RotateCcw className={cn('h-4 w-4', resetting && 'animate-spin')} />
              <span>{resetting ? 'Resetting...' : 'Reset Data'}</span>
            </motion.button>
          </div>
        </main>
      </div>
    </div>
  );
}
