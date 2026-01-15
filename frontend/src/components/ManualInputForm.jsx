import { useMemo, useState } from 'react';

const toNumber = (value) => {
  if (value === '' || value === null || value === undefined) return NaN;
  return Number(value);
};

export default function ManualInputForm({ value, onChange, onCalculate, loading }) {
  const [error, setError] = useState('');

  const payload = useMemo(() => {
    const weightValue = toNumber(value.weightG);
    return {
      lengthCm: toNumber(value.lengthCm),
      widthCm: toNumber(value.widthCm),
      heightCm: toNumber(value.heightCm),
      weightG: Number.isNaN(weightValue) ? weightValue : Math.round(weightValue),
    };
  }, [value]);

  const validate = () => {
    if (Object.values(payload).some((num) => Number.isNaN(num) || num <= 0)) {
      setError('サイズと重量は正の数値で入力してください。');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onCalculate(payload);
  };

  const handleChange = (key, nextValue) => {
    setError('');
    onChange({ ...value, [key]: nextValue });
  };

  return (
    <div className="rounded-xl sm:rounded-2xl border border-slate-200/70 bg-white/80 p-3 sm:p-4 shadow-[0_18px_45px_-40px_rgba(15,23,42,0.7)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[8px] sm:text-xs uppercase tracking-[0.3em] sm:tracking-[0.4em] text-slate-400">手動入力</p>
          <h3 className="mt-0.5 sm:mt-2 text-sm sm:text-xl font-semibold text-slate-900">荷物サイズ</h3>
        </div>
      </div>

      <div className="mt-3 sm:mt-4 grid grid-cols-2 gap-2 sm:gap-4">
        {[
          { key: 'lengthCm', label: '長さ', unit: 'cm' },
          { key: 'widthCm', label: '幅', unit: 'cm' },
          { key: 'heightCm', label: '高さ', unit: 'cm' },
          { key: 'weightG', label: '重量', unit: 'g', step: '1' },
        ].map((field) => (
          <label key={field.key} className="block">
            <span className="text-[9px] sm:text-xs uppercase tracking-wider text-slate-400">
              {field.label}
            </span>
            <div className="relative mt-1">
              <input
                type="number"
                min="0"
                step={field.step || '0.1'}
                value={value[field.key]}
                onChange={(event) => handleChange(field.key, event.target.value)}
                placeholder="0"
                className="w-full rounded-lg sm:rounded-xl border border-slate-200/70 bg-white/90 px-2 sm:px-3 py-1.5 sm:py-2 pr-8 sm:pr-10 text-xs sm:text-sm font-semibold text-slate-700 shadow-sm outline-none transition focus:border-slate-400"
              />
              <span className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-[10px] sm:text-xs text-slate-400">
                {field.unit}
              </span>
            </div>
          </label>
        ))}
      </div>

      {error ? (
        <div className="mt-2 sm:mt-4 rounded-lg sm:rounded-xl border border-rose-200 bg-rose-50 px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs text-rose-700">
          {error}
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading}
        className="mt-3 sm:mt-4 w-full rounded-lg sm:rounded-full bg-slate-900 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 disabled:opacity-40"
      >
        {loading ? '計算中...' : '送料を計算'}
      </button>
    </div>
  );
}
