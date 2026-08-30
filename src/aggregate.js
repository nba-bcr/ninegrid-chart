/**
 * 集計ロジック。React には一切依存しない純粋関数群。
 * ここを分離しておくと、テストが書きやすく、将来 Python 版や
 * Vue 版を作るときも移植の単位がはっきりする。
 */

/**
 * n×n グリッドの中心を除いた配置順を返す。
 * 上位から左上→右下の読み順で埋まる（中心は飛ばす）。
 */
export function ringOrder(size) {
  const mid = (size * size - 1) / 2;
  return Array.from({ length: size * size }, (_, i) => i).filter((i) => i !== mid);
}

/** 3×3 の配置順。後方互換のため定数としても公開している。 */
export const RING = ringOrder(3);

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
function applyLimit(list, limit, { otherLabel, strategy, skip, resort = true }) {
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

  const merged = [...head, other];
  // 並びが値の降順のときだけ、畳んだノードを順位相当の位置へ差し込み直す。
  // データ順を保つモード（sortGroups: "none"）では末尾に置いたままにする
  return resort ? merged.sort((a, b) => b.value - a.value) : merged;
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
    sortGroups = "value",
  } = options;

  const skip = new Set([groupKey, itemKey, valueKey]);
  const limitOpts = { otherLabel, strategy: otherStrategy, skip };
  // sortGroups: "value"（既定）は値の降順、"none" はデータの出現順を保つ。
  // 開店順・五十音順など、値以外の並びを使いたいときは行データを
  // その順に並べてから "none" を指定する
  const groupLimitOpts = { ...limitOpts, resort: sortGroups !== "none" };

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
  if (sortGroups !== "none") groups.sort((a, b) => b.value - a.value);
  groups = applyLimit(groups, maxGroups, groupLimitOpts);

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
 * 集計結果をブロック × セルの描画用モデルに変換する。
 * 「集計」と「配置」を分けておくと、将来 mode="edit"（手入力）を
 * 足すときにこの関数の出力形式にだけ合わせればよくなる。
 *
 * @param {object} model  aggregate() の戻り値
 * @param {string} centerLabel  中心セルのラベル
 * @param {object} [opts]
 * @param {number} [opts.blockGrid=3]  ブロックの並び（n×n）。3 なら従来の 9 ブロック、
 *   5 なら 25 ブロック（外周24グループ）。中心ブロックのセル数も n×n になる
 * @param {object} [opts.centerOverride]  中心セル（総計）に上書きするフィールド。
 *   例: 一部グループだけ描画しつつ、KPI は全体の総計を見せたい場合に
 *   { value, metrics } を渡す
 */
export function layout({ groups, total, totalMetrics }, centerLabel, opts = {}) {
  const { blockGrid = 3, centerOverride = null } = opts;
  const blockRing = ringOrder(blockGrid);
  const mid = (blockGrid * blockGrid - 1) / 2;
  const blocks = new Array(blockGrid * blockGrid).fill(null);

  // 外周ブロック: 各 group の内訳（ブロック内は常に 3×3 = 上位8アイテム）
  groups.forEach((group, rank) => {
    if (rank >= blockRing.length) return;
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

    blocks[blockRing[rank]] = { cells, levels, group };
  });

  // 中心ブロック: group のサマリ + 総計。外周と同じ並び順で n×n に配置する
  const centerCells = new Array(blockGrid * blockGrid).fill(null);
  const centerLevels = new Array(blockGrid * blockGrid).fill("group");
  groups.forEach((group, rank) => {
    if (rank < blockRing.length) centerCells[blockRing[rank]] = group;
  });
  centerCells[mid] = {
    name: centerLabel,
    value: total,
    metrics: totalMetrics,
    ...(centerOverride || {}),
  };
  centerLevels[mid] = "total";

  blocks[mid] = { cells: centerCells, levels: centerLevels, group: null };

  return blocks;
}
