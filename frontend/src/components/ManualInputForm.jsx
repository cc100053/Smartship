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
    <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-[0_18px_45px_-40px_rgba(15,23,42,0.7)]">
      <div>
        <p className="text-xs uppercase tracking-[0.4em] text-slate-400">手動入力</p>
        <h3 className="mt-2 text-xl font-semibold text-slate-900">荷物サイズを入力</h3>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {[
          { key: 'lengthCm', label: '長さ (cm)' },
          { key: 'widthCm', label: '幅 (cm)' },
          { key: 'heightCm', label: '高さ (cm)' },
          { key: 'weightG', label: '重量 (g)', step: '1' },
        ].map((field) => (
          <label key={field.key} className="text-xs uppercase tracking-[0.2em] text-slate-400">
            {field.label}
            <input
              type="number"
              min="0"
              step={field.step || '0.1'}
              value={value[field.key]}
              onChange={(event) => handleChange(field.key, event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200/70 bg-white/90 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm outline-none transition focus:border-slate-400"
            />
          </label>
        ))}
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading}
        className="mt-6 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 disabled:opacity-40"
      >
        {loading ? '計算中...' : '送料を計算'}
      </button>
    </div>
  );
}
