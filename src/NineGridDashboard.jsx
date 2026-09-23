import { useMemo, useState } from "react";
import { NineGridChart } from "./NineGridChart.jsx";
import { prepareRows, byYear } from "./prepare.js";

/**
 * 「年月・カテゴリ1・カテゴリ2・指標」の4列データを渡すだけで、
 * マンダラチャート + 年別の月次グラフまで一式を描くダッシュボード。
 *
 * <NineGridChart> は配置だけを担う素のチャートで、こちらは
 * 「カテゴリの選択・年フィルター・ドリルダウン」までを含む完成品。
 */

const MONTHS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
const TOTAL = { groups: null, item: null, otherItems: false, label: null };

/** 値の降順で上位 n 件の名前を Set で返す。 */
function topNames(rows, key, n) {
  const totals = new Map();
  for (const r of rows) totals.set(r[key], (totals.get(r[key]) || 0) + r.value);
  return new Set(
    [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([name]) => name)
  );
}

/* ------------------------------------------------------------------ *
 * 1年分の月別バー
 * ------------------------------------------------------------------ */
function YearCard({ year, monthly, total, sharedMax, hue, format }) {
  const peak = monthly.indexOf(Math.max(...monthly));
  return (
    <div
      style={{
        border: "1px solid hsl(40 8% 88%)",
        borderRadius: 6,
        padding: "8px 10px",
        background: "hsl(40 20% 99%)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>{year}</span>
        <span
          style={{ fontSize: 11, color: "hsl(40 5% 52%)", fontVariantNumeric: "tabular-nums" }}
        >
          {format(total)}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 40 }}>
        {monthly.map((v, i) => (
          <div
            key={i}
            title={`${MONTHS[i]}月: ${format(v)}`}
            style={{
              flex: 1,
              height: `${Math.max(3, (Math.max(0, v) / sharedMax) * 100)}%`,
              borderRadius: 1,
              background: i === peak && v > 0 ? `hsl(${hue} 55% 48%)` : `hsl(${hue} 22% 78%)`,
              transition: "background 120ms",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = `hsl(${hue} 60% 38%)`)}
            onMouseLeave={(e) =>
              (e.currentTarget.style.background =
                i === peak && v > 0 ? `hsl(${hue} 55% 48%)` : `hsl(${hue} 22% 78%)`)
            }
          />
        ))}
      </div>
      <div style={{ display: "flex", gap: 2, marginTop: 3 }}>
        {MONTHS.map((label, i) => (
          <span
            key={label}
            style={{
              flex: 1,
              fontSize: 7,
              textAlign: "center",
              color: i === peak ? "hsl(40 6% 20%)" : "hsl(40 5% 68%)",
              fontWeight: i === peak ? 600 : 400,
            }}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * 本体
 * ------------------------------------------------------------------ */
export function NineGridDashboard({
  data,
  ymKey = "ym",
  valueKey = "value",
  categoryKeys,
  categoryLabels = {},
  defaultGroupKey = null,
  defaultItemKey = null,
  defaultBlockGrid = 3,
  maxItems = 8,
  otherLabel = "その他",
  otherStrategy = "merge",
  centerLabel = "総計",
  valueLabel = "値",
  hue = 258,
  format = (v) => v.toLocaleString(),
  showControls = true,
  onCellClick = null,
}) {
  const keys = useMemo(
    () => categoryKeys || Object.keys(data?.[0] || {}).filter((k) => k !== ymKey && k !== valueKey),
    [categoryKeys, data, ymKey, valueKey]
  );

  const [groupKey, setGroupKey] = useState(defaultGroupKey || keys[0]);
  const [itemKey, setItemKey] = useState(defaultItemKey || keys[1] || keys[0]);
  const [blockGrid, setBlockGrid] = useState(defaultBlockGrid);
  const [excludedYears, setExcludedYears] = useState([]);
  const [selection, setSelection] = useState(TOTAL);

  const maxGroups = blockGrid * blockGrid - 1;

  // 4列 → (group, item, 年) の行データ
  const { rows, years } = useMemo(
    () => prepareRows(data, { ymKey, groupKey, itemKey, valueKey }),
    [data, ymKey, groupKey, itemKey, valueKey]
  );

  const selectedYears = useMemo(
    () => years.filter((y) => !excludedYears.includes(y)),
    [years, excludedYears]
  );

  // チャートに渡す行（年フィルター適用）。year 列は合算時に無視される
  const chartRows = useMemo(
    () => rows.filter((r) => selectedYears.includes(r.year)),
    [rows, selectedYears]
  );

  // クリックされた範囲の行を絞り込む
  const scopedRows = useMemo(() => {
    const { groups, item, otherItems } = selection;
    let scope = groups === null ? chartRows : chartRows.filter((r) => groups.includes(r.group));
    if (item !== null) {
      scope = scope.filter((r) => r.item === item);
    } else if (otherItems) {
      const top = topNames(scope, "item", maxItems - 1);
      scope = scope.filter((r) => !top.has(r.item));
    }
    return scope;
  }, [chartRows, selection, maxItems]);

  const yearly = useMemo(() => byYear(scopedRows), [scopedRows]);
  const sharedMax = Math.max(1, ...yearly.flatMap((y) => y.monthly));

  const handleCellClick = (node, level, context) => {
    if (onCellClick) onCellClick(node, level, context);

    if (level === "total") {
      setSelection(TOTAL);
      return;
    }
    if (level === "group") {
      if (node.isOther) {
        const top = topNames(chartRows, "group", maxGroups - 1);
        const merged = [...new Set(chartRows.map((r) => r.group))].filter((g) => !top.has(g));
        setSelection({ groups: merged, item: null, otherItems: false, label: node.name });
      } else {
        setSelection({ groups: [node.name], item: null, otherItems: false, label: node.name });
      }
      return;
    }
    if (!context?.group) return;
    const groups = context.isOtherGroup
      ? (() => {
          const top = topNames(chartRows, "group", maxGroups - 1);
          return [...new Set(chartRows.map((r) => r.group))].filter((g) => !top.has(g));
        })()
      : [context.group];
    setSelection(
      node.isOther
        ? { groups, item: null, otherItems: true, label: `${context.group} / ${node.name}` }
        : { groups, item: node.name, otherItems: false, label: `${context.group} / ${node.name}` }
    );
  };

  const labelOf = (key) => categoryLabels[key] || key;

  const swap = () => {
    setGroupKey(itemKey);
    setItemKey(groupKey);
    setSelection(TOTAL);
  };

  const toggleYear = (year) => {
    setExcludedYears((prev) =>
      prev.includes(year)
        ? prev.filter((y) => y !== year)
        : selectedYears.length <= 1
          ? prev // 最低1年は残す
          : [...prev, year]
    );
  };

  const chip = (active) => ({
    fontSize: 11.5,
    padding: "3px 10px",
    borderRadius: 13,
    border: active ? `1px solid hsl(${hue} 45% 45%)` : "1px solid hsl(40 8% 82%)",
    background: active ? `hsl(${hue} 45% 48%)` : "#fff",
    color: active ? "#fff" : "hsl(40 5% 45%)",
    cursor: "pointer",
  });

  const select = {
    fontSize: 12,
    padding: "3px 6px",
    borderRadius: 4,
    border: "1px solid hsl(40 8% 84%)",
    background: "#fff",
    color: "inherit",
  };

  return (
    <div>
      {showControls && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px 20px",
            alignItems: "center",
            padding: "12px 14px",
            marginBottom: 16,
            background: "#fff",
            border: "1px solid hsl(40 8% 90%)",
            borderRadius: 6,
            fontSize: 12,
          }}
        >
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "hsl(40 5% 48%)" }}>中央8マス</span>
            <select
              value={groupKey}
              onChange={(e) => {
                setGroupKey(e.target.value);
                setSelection(TOTAL);
              }}
              style={select}
            >
              {keys.map((k) => (
                <option key={k} value={k} disabled={k === itemKey}>
                  {labelOf(k)}
                </option>
              ))}
            </select>
          </label>

          <button
            onClick={swap}
            title="中央と外枠を入れ替える"
            style={{
              ...chip(false),
              padding: "3px 8px",
              fontSize: 13,
              lineHeight: 1.2,
            }}
          >
            ⇄
          </button>

          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "hsl(40 5% 48%)" }}>外枠8マス</span>
            <select
              value={itemKey}
              onChange={(e) => {
                setItemKey(e.target.value);
                setSelection(TOTAL);
              }}
              style={select}
            >
              {keys.map((k) => (
                <option key={k} value={k} disabled={k === groupKey}>
                  {labelOf(k)}
                </option>
              ))}
            </select>
          </label>

          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ color: "hsl(40 5% 48%)" }}>グリッド</span>
            {[3, 5].map((n) => (
              <button key={n} onClick={() => setBlockGrid(n)} style={chip(blockGrid === n)}>
                {n}×{n}
              </button>
            ))}
          </span>

          {years.length > 1 && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
              <span style={{ color: "hsl(40 5% 48%)", marginRight: 2 }}>年</span>
              {years.map((y) => (
                <button key={y} onClick={() => toggleYear(y)} style={chip(!excludedYears.includes(y))}>
                  {y}
                </button>
              ))}
            </span>
          )}
        </div>
      )}

      <div style={{ overflowX: "auto", paddingBottom: 8 }}>
        <NineGridChart
          data={chartRows}
          groupKey="group"
          itemKey="item"
          valueKey="value"
          blockGrid={blockGrid}
          maxItems={maxItems}
          otherLabel={otherLabel}
          otherStrategy={otherStrategy}
          centerLabel={centerLabel}
          valueLabel={valueLabel}
          seriesKey="monthly"
          seriesLabels={MONTHS}
          levelLabels={{ group: labelOf(groupKey), item: labelOf(itemKey) }}
          format={format}
          hue={hue}
          onCellClick={handleCellClick}
          minWidth={blockGrid > 3 ? 900 : 560}
        />
      </div>

      <div style={{ marginTop: 18, borderTop: "1px solid hsl(40 8% 88%)", paddingTop: 14 }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 10,
            marginBottom: 10,
            flexWrap: "wrap",
          }}
        >
          <h3 style={{ fontSize: 14, margin: 0, fontWeight: 600 }}>
            {selection.label || centerLabel} — 各年の月次
          </h3>
          <span style={{ fontSize: 11, color: "hsl(40 5% 55%)" }}>
            全年共通スケール（最大月 {format(sharedMax)}）／ マスをクリックで切り替え
          </span>
        </div>
        {yearly.length === 0 ? (
          <p style={{ fontSize: 12, color: "hsl(40 5% 55%)" }}>該当する実績がありません。</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
              gap: 8,
            }}
          >
            {yearly.map((y) => (
              <YearCard key={y.year} {...y} sharedMax={sharedMax} hue={hue} format={format} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
