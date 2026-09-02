/**
 * デモ用のダミーデータ。
 * 果物のタイプ×品種で、売上・受注件数・月別売上を持つ行データを生成する。
 * 「タイプが8を超える」「品種が8を超えるタイプがある」の両方が含まれるので、
 * その他への畳み込みの挙動が確認できる。
 */

export const MONTH_LABELS = [
  "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12",
];

// [品種名, 売上(千円), ピーク月]
const CATALOG = {
  さくらんぼ: [
    ["佐藤錦", 1420, 6], ["紅秀峰", 880, 7], ["ナポレオン", 340, 7],
    ["高砂", 210, 6], ["香夏錦", 160, 6], ["月山錦", 140, 7],
    ["南陽", 95, 7], ["正光錦", 70, 6], ["黄玉", 40, 6],
  ],
  りんご: [
    ["サンふじ", 1180, 12], ["ふじ", 960, 11], ["王林", 520, 12],
    ["シナノゴールド", 410, 11], ["ジョナゴールド", 300, 10],
    ["つがる", 260, 9], ["秋映", 180, 10], ["紅玉", 120, 10],
  ],
  ぶどう: [
    ["シャインマスカット", 1650, 9], ["巨峰", 620, 9], ["ピオーネ", 480, 9],
    ["ナガノパープル", 290, 9], ["デラウェア", 190, 7],
    ["クイーンニーナ", 130, 10], ["藤稔", 90, 9],
  ],
  洋梨: [
    ["ラ・フランス", 740, 11], ["ル レクチエ", 380, 12],
    ["バートレット", 150, 9], ["シルバーベル", 110, 12], ["オーロラ", 80, 9],
  ],
  もも: [
    ["白鳳", 560, 7], ["あかつき", 420, 8],
    ["川中島白桃", 310, 8], ["黄金桃", 170, 8],
  ],
  いちご: [
    ["あまおう", 690, 1], ["とちおとめ", 380, 2],
    ["紅ほっぺ", 240, 2], ["スカイベリー", 150, 1],
  ],
  柿: [["富有柿", 330, 11], ["平核無", 190, 10], ["太秋", 120, 10]],
  梨: [["幸水", 280, 8], ["豊水", 220, 9], ["二十世紀", 140, 9]],
  キウイ: [["ヘイワード", 130, 2], ["ゴールド", 90, 3]],
  プルーン: [["サンプルーン", 70, 9]],
  すもも: [["大石早生", 60, 7], ["ソルダム", 45, 8]],
};

/** ピーク月を中心に山なりの月別売上を作る（乱数を使わず決定的）。 */
function seasonal(total, peakMonth) {
  const weights = MONTH_LABELS.map((_, i) => {
    let d = Math.abs(i + 1 - peakMonth);
    d = Math.min(d, 12 - d); // 12月と1月は隣同士
    return Math.exp(-(d * d) / 1.9);
  });
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => Math.round((w / sum) * total));
}

export const YEARS = ["2021年", "2022年", "2023年", "2024年", "2025年"];

/** 品種名から決定的に「成長タイプ」を決める（乱数を使わない）。 */
function trendOf(name) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)) % 997;
  return h % 4; // 0=横ばい 1=成長 2=減少 3=山なり
}

function yearFactor(trend, i, n) {
  const t = i / (n - 1);
  switch (trend) {
    case 1: return 0.45 + 0.9 * t;                     // 成長
    case 2: return 1.25 - 0.8 * t;                     // 減少
    case 3: return 0.6 + 0.8 * Math.sin(Math.PI * t);  // 山なり
    default: return 0.85 + 0.1 * Math.sin(t * 6.28);   // 横ばい
  }
}

/**
 * 行データは「タイプ × 品種 × 年」の粒度。
 * チャートは year の列を無視してそのまま合算するので、この形のまま渡してよい。
 * 品種ごとに成長・減少などの年次推移が付くので、クリックで開く年次比較が面白くなる。
 */
export const DEMO_ROWS = Object.entries(CATALOG).flatMap(([type, list]) =>
  list.flatMap(([variety, sales, peak]) => {
    const trend = trendOf(variety);
    return YEARS.map((year, i) => {
      const yearSales = Math.round(sales * 1000 * yearFactor(trend, i, YEARS.length));
      return {
        fruitType: type,
        variety,
        year,
        sales: yearSales,
        orders: Math.round(yearSales / 4200),
        monthly: seasonal(yearSales, peak),
      };
    });
  })
);

export const yen = (v) =>
  "¥" + (v >= 10000 ? Math.round(v / 10000).toLocaleString() + "万" : v.toLocaleString());
