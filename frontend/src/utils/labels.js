export const CATEGORY_LABELS = {
  Books: '本・メディア',
  Games: 'ゲーム',
  Fashion: 'ファッション',
  Electronics: '電子機器',
  Other: 'その他',
};

export const getCategoryLabel = (category) => CATEGORY_LABELS[category] || category;
