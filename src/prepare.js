/**
 * 「年月・カテゴリ1・カテゴリ2・指標」の4列データを、チャートが食える形に畳む。
 * React に依存しない純粋関数なので、単体でテストできるし他フレームワークにも移植できる。
 */

/** "2025-01" / "2025-01-15" / Date / "2025/1" などから [年, 月index] を取り出す。 */
export function parseYearMonth(ym) {
  if (ym instanceof Date) return [String(ym.getFullYear()), ym.getMonth()];

  const s = String(ym);
  const m = s.match(/(\d{4})\D?(\d{1,2})/);
  if (!m) return [s, null]; // 年月として読めない場合は文字列をそのまま年として扱う

  const month = Number(m[2]);
  return [m[1], month >= 1 && month <= 12 ? month - 1 : null];
}

/**
 * 4列の行データを (group, item, 年) 単位に畳む。
 * 各行は月別12要素の配列 `monthly` を持つので、チャート側の
 * 「数値配列は要素ごとに合算」が効いて、どの階層でも季節性が積み上がる。
 *
 * @param {Array<object>} data     元の行データ
 * @param {object} options
 * @param {string} options.ymKey     年月の列名
 * @param {string} options.groupKey  第1階層（中央8マス）に使う列名
 * @param {string} options.itemKey   第2階層（外枠8マス）に使う列名
 * @param {string} options.valueKey  指標の列名
 * @returns {{ rows: Array<object>, years: string[] }}
 *   rows … { group, item, year, value, monthly } の配列
 *   years … 昇順の年リスト
 */
export function prepareRows(data, { ymKey, groupKey, itemKey, valueKey }) {
  const acc = new Map();
  const years = new Set();

  for (const row of data) {
    const [year, monthIndex] = parseYearMonth(row[ymKey]);
    const group = String(row[groupKey] ?? "");
    const item = String(row[itemKey] ?? "");
    const value = Number(row[valueKey]) || 0;

    years.add(year);

    const key = `${group}␟${item}␟${year}`;
    if (!acc.has(key)) {
      acc.set(key, { group, item, year, value: 0, monthly: new Array(12).fill(0) });
    }
    const node = acc.get(key);
    node.value += value;
    if (monthIndex !== null) node.monthly[monthIndex] += value;
  }

  return {
    rows: [...acc.values()],
    years: [...years].sort(),
  };
}

/** 行の集合を年ごとの月別系列に畳む（年別グラフ用）。 */
export function byYear(rows) {
  const map = new Map();
  for (const r of rows) {
    if (!map.has(r.year)) map.set(r.year, new Array(12).fill(0));
    const acc = map.get(r.year);
    r.monthly.forEach((v, i) => (acc[i] += v));
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, monthly]) => ({
      year,
      monthly,
      total: monthly.reduce((s, v) => s + v, 0),
    }));
}
