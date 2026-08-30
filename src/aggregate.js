/**
 * 集計ロジック。React には一切依存しない純粋関数群。
 * ここを分離しておくと、テストが書きやすく、将来 Python 版や
 * Vue 版を作るときも移植の単位がはっきりする。
 */

/** 中心(index 4)を除いた配置順。上位から左上→右下の読み順で埋まる。 */
export const RING = [0, 1, 2, 3, 5, 6, 7, 8];

/**
 * row の数値フィールドを target に加算する。
 * 数値は素直に加算、数値配列は要素ごとに加算（月別売上などを想定）。
 * それ以外の型は無視する。
 */
function mergeMetrics(target, source, skip) {
  for (const key of Object.keys(source)) {
    if (skip.has(key)) continue;
    const v = source[key];
    if (typeof v === "number") {
      target[key] = (target[key] || 0) + v;
    } else if (Array.isArray(v) && v.every((n) => typeof n === "number")) {
      const acc = target[key] || new Array(v.length).fill(0);
      for (let i = 0; i < v.length; i++) acc[i] += v[i];
      target[key] = acc;
    }
  }
}

/**
 * 上位 limit 件に収まらない要素を処理する。
 *
 * strategy:
 *   "merge" … 上位 limit-1 件を残し、残りを1つにまとめる（デフォルト）
 *   "drop"  … 上位 limit 件だけ残し、残りは捨てる
 *   "none"  … 何もしない（limit を超えた分は描画時に切れる）
 */
function applyLimit(list, limit, { otherLabel, strategy, skip }) {
  if (strategy === "none" || list.length <= limit) return list;
  if (strategy === "drop") return list.slice(0, limit);

  const head = list.slice(0, limit - 1);
  const tail = list.slice(limit - 1);

  const other = {
    name: otherLabel,
    value: 0,
    isOther: true,
    metrics: {},
    children: [],
    memberCount: 0,
  };
  for (const node of tail) {
    other.value += node.value;
    other.memberCount += 1;
    other.children.push(...(node.children || [node]));
    mergeMetrics(other.metrics, node.metrics, skip);
  }

  return [...head, other].sort((a, b) => b.value - a.value);
}

/** 同名ノードを1つにまとめ直す（「その他」ブロック内の再集計用）。 */
function rollup(nodes, skip) {
  const map = new Map();
  for (const n of nodes) {
    if (!map.has(n.name)) {
      map.set(n.name, { name: n.name, value: 0, metrics: {} });
    }
    const target = map.get(n.name);
    target.value += n.value;
    mergeMetrics(target.metrics, n.metrics, skip);
  }
  return [...map.values()].sort((a, b) => b.value - a.value);
}

/**
 * フラットな行データを 2 階層の木構造に集計する。
 *
 * @param {Array<object>} data     行データ
 * @param {object} options
 * @param {string} options.groupKey      第1階層のキー（例: "fruitType"）
 * @param {string} options.itemKey       第2階層のキー（例: "variety"）
 * @param {string} options.valueKey      大きさを決める数値キー（例: "sales"）
 * @param {number} options.maxGroups     ブロック数の上限（1..8）
 * @param {number} options.maxItems      各ブロック内のセル数の上限（1..8）
 * @param {string} options.otherLabel    畳んだノードのラベル
 * @param {string} options.otherStrategy "merge" | "drop" | "none"
 *
 * @returns {{ groups: Array, total: number, totalMetrics: object }}
 */
export function aggregate(data, options) {
  const {
    groupKey,
    itemKey,
    valueKey,
    maxGroups = 8,
    maxItems = 8,
    otherLabel = "その他",
    otherStrategy = "merge",
  } = options;

  const skip = new Set([groupKey, itemKey, valueKey]);
  const limitOpts = { otherLabel, strategy: otherStrategy, skip };

  // --- 1. group -> item の 2 段で積む ---
  const byGroup = new Map();
  for (const row of data) {
    const g = row[groupKey];
    if (!byGroup.has(g)) byGroup.set(g, new Map());

    const items = byGroup.get(g);
    const i = row[itemKey];
    if (!items.has(i)) items.set(i, { name: i, value: 0, metrics: {} });

    const cell = items.get(i);
    cell.value += Number(row[valueKey]) || 0;
    mergeMetrics(cell.metrics, row, skip);
  }

  // --- 2. 各 group の中で item を上位に絞る ---
  let groups = [...byGroup.entries()].map(([name, items]) => {
    const children = applyLimit(
      [...items.values()].sort((a, b) => b.value - a.value),
      maxItems,
      limitOpts
    );

    const metrics = {};
    let value = 0;
    for (const c of children) {
      value += c.value;
      mergeMetrics(metrics, c.metrics, skip);
    }
    return { name, value, metrics, children };
  });

  // --- 3. group 自体を上位に絞る ---
  groups.sort((a, b) => b.value - a.value);
  groups = applyLimit(groups, maxGroups, limitOpts);

  // --- 4. 「その他」ブロックは複数 group の子が混ざるので畳み直す ---
  for (const g of groups) {
    if (g.isOther) {
      g.children = applyLimit(rollup(g.children, skip), maxItems, limitOpts);
    }
  }

  // --- 5. 総計 ---
  const total = groups.reduce((sum, g) => sum + g.value, 0);
  const totalMetrics = {};
  for (const g of groups) mergeMetrics(totalMetrics, g.metrics, skip);

  return { groups, total, totalMetrics };
}

/**
 * 集計結果を 9 ブロック × 9 セルの描画用モデルに変換する。
 * 「集計」と「配置」を分けておくと、将来 mode="edit"（手入力）を
 * 足すときにこの関数の出力形式にだけ合わせればよくなる。
 */
export function layout({ groups, total, totalMetrics }, centerLabel) {
  const blocks = new Array(9).fill(null);

  // 外周8ブロック: 各 group の内訳
  groups.forEach((group, rank) => {
    if (rank >= RING.length) return;
    const cells = new Array(9).fill(null);
    const levels = new Array(9).fill("item");

    group.children.forEach((child, i) => {
      if (i < RING.length) cells[RING[i]] = child;
    });
    cells[4] = {
      name: group.name,
      value: group.value,
      metrics: group.metrics,
      isOther: group.isOther,
    };
    levels[4] = "group";

    blocks[RING[rank]] = { cells, levels, group };
  });

  // 中心ブロック: group のサマリ + 総計
  const centerCells = new Array(9).fill(null);
  const centerLevels = new Array(9).fill("group");
  groups.forEach((group, rank) => {
    if (rank < RING.length) centerCells[RING[rank]] = group;
  });
  centerCells[4] = { name: centerLabel, value: total, metrics: totalMetrics };
  centerLevels[4] = "total";

  blocks[4] = { cells: centerCells, levels: centerLevels, group: null };

  return blocks;
}
