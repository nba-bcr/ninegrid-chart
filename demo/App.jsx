import { useMemo, useRef, useState } from "react";
import { NineGridChart, exportImage } from "../src/index.js";
import { DEMO_ROWS, MONTH_LABELS, YEARS, yen } from "./demoData.js";

const STRATEGIES = [
  ["merge", "その他にまとめる"],
  ["drop", "切り捨てる"],
  ["none", "そのまま"],
];

const TOTAL_SELECTION = { types: null, variety: null, otherVarieties: false, label: "全社" };

export default function App() {
  const [blockGrid, setBlockGrid] = useState(3);
  const [selectedYears, setSelectedYears] = useState([...YEARS]);
  const [maxItems, setMaxItems] = useState(8);
  const [strategy, setStrategy] = useState("merge");
  const [hue, setHue] = useState(258);
  const [selection, setSelection] = useState(TOTAL_SELECTION);
  const chartRef = useRef(null);

  const maxGroups = blockGrid * blockGrid - 1; // 3×3 → 8、5×5 → 24

  const saveAs = (format) =>
    exportImage(chartRef.current, { format, fileName: "ninegrid-chart" }).catch((e) =>
      alert("画像の書き出しに失敗しました: " + e.message)
    );

  // 年フィルター。チャートは year の列を無視して合算するので、絞った行をそのまま渡せる
  const rows = useMemo(
    () => DEMO_ROWS.filter((r) => selectedYears.includes(r.year)),
    [selectedYears]
  );

  const typeCount = new Set(rows.map((r) => r.fruitType)).size;
  const varietyCount = new Set(rows.map((r) => r.variety)).size;

  // 「その他」ブロックに畳まれるタイプ（上位 maxGroups-1 の外）
  const mergedTypes = useMemo(() => {
    const totals = new Map();
    for (const r of rows) totals.set(r.fruitType, (totals.get(r.fruitType) || 0) + r.sales);
    const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
    return sorted.slice(Math.max(0, maxGroups - 1));
  }, [rows, maxGroups]);

  const handleCellClick = (node, level, context) => {
    if (level === "total") {
      setSelection(TOTAL_SELECTION);
      return;
    }
    if (level === "group") {
      setSelection(
        node.isOther
          ? { types: mergedTypes, variety: null, otherVarieties: false, label: `その他（${mergedTypes.length}タイプ）` }
          : { types: [node.name], variety: null, otherVarieties: false, label: node.name }
      );
      return;
    }
    if (!context.group) return;
    const types = context.isOtherGroup ? mergedTypes : [context.group];
    const scopeLabel = context.isOtherGroup ? "その他" : context.group;
    setSelection(
      node.isOther
        ? { types, variety: null, otherVarieties: true, label: `${scopeLabel} / その他` }
        : { types, variety: node.name, otherVarieties: false, label: `${scopeLabel} / ${node.name}` }
    );
  };

  const yearLabel =
    selectedYears.length === YEARS.length
      ? "全期間"
      : selectedYears.map((y) => y.replace("年", "")).join("・") + "年";

  return (
    <div
      style={{
        fontFamily:
          "'Hiragino Sans', 'Noto Sans JP', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        background: "hsl(40 20% 98%)",
        minHeight: "100vh",
        padding: "32px 24px 64px",
        color: "hsl(40 6% 16%)",
      }}
    >
      <div style={{ maxWidth: blockGrid > 3 ? 1080 : 880, margin: "0 auto" }}>
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.14em",
            color: `hsl(${hue} 20% 55%)`,
            marginBottom: 6,
          }}
        >
          NINEGRID-CHART
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 6px" }}>
          果物タイプ別 売上構成（{yearLabel}）
        </h1>
        <p
          style={{
            fontSize: 13,
            color: "hsl(40 5% 48%)",
            margin: "0 0 20px",
            lineHeight: 1.7,
          }}
        >
          {typeCount}タイプ / {varietyCount}品種 × {YEARS.length}年分。売上上位から左上→右下の順に配置。
          中心ブロックがタイプ別サマリ、外周ブロックが各タイプの品種内訳。
          マスにカーソルを合わせると受注件数と月別の売れ方、
          <strong>クリックすると下に各年の月次比較</strong>が出る。
        </p>

        <YearFilter selectedYears={selectedYears} onChange={setSelectedYears} hue={hue} />

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 24,
            alignItems: "center",
            padding: "14px 16px",
            marginBottom: 20,
            background: "#fff",
            border: "1px solid hsl(40 8% 90%)",
            borderRadius: 6,
            fontSize: 12,
          }}
        >
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "hsl(40 5% 48%)" }}>グリッド</span>
            <span style={{ display: "flex", gap: 4 }}>
              {[3, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setBlockGrid(n)}
                  style={{
                    fontSize: 12,
                    padding: "3px 12px",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontWeight: 600,
                    border: `1px solid hsl(${hue} ${blockGrid === n ? "45% 45%" : "18% 82%"})`,
                    background: blockGrid === n ? `hsl(${hue} 45% 48%)` : "#fff",
                    color: blockGrid === n ? "#fff" : "hsl(40 5% 40%)",
                  }}
                >
                  {n}×{n}
                </button>
              ))}
            </span>
            <span style={{ color: "hsl(40 5% 62%)", fontSize: 11 }}>
              （最大{maxGroups}タイプ）
            </span>
          </label>

          <Slider label="品種数" value={maxItems} onChange={setMaxItems} min={1} max={8} hue={hue} />
          <Slider label="色相" value={hue} onChange={setHue} min={0} max={360} hue={hue} />

          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "hsl(40 5% 48%)" }}>はみ出し</span>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              style={{
                fontSize: 12,
                padding: "3px 6px",
                borderRadius: 4,
                border: "1px solid hsl(40 8% 84%)",
                background: "#fff",
              }}
            >
              {STRATEGIES.map(([v, label]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
          </label>

          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "hsl(40 5% 48%)" }}>画像で保存</span>
            {["png", "jpg", "svg"].map((format) => (
              <button
                key={format}
                onClick={() => saveAs(format)}
                style={{
                  fontSize: 11,
                  padding: "3px 10px",
                  borderRadius: 4,
                  border: `1px solid hsl(${hue} 30% 78%)`,
                  background: "#fff",
                  color: `hsl(${hue} 40% 38%)`,
                  cursor: "pointer",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                {format}
              </button>
            ))}
          </span>
        </div>

        <div style={{ overflowX: "auto", paddingBottom: 8 }} ref={chartRef}>
          <NineGridChart
            data={rows}
            groupKey="fruitType"
            itemKey="variety"
            valueKey="sales"
            blockGrid={blockGrid}
            maxItems={maxItems}
            otherStrategy={strategy}
            centerLabel="全社売上"
            valueLabel="売上"
            seriesKey="monthly"
            seriesLabels={MONTH_LABELS}
            metricLabels={{ orders: "受注件数" }}
            levelLabels={{ group: "タイプ", item: "品種" }}
            format={yen}
            hue={hue}
            minWidth={blockGrid > 3 ? 900 : 560}
            onCellClick={handleCellClick}
          />
        </div>

        <YearComparison selection={selection} maxItems={maxItems} hue={hue} />
      </div>
    </div>
  );
}

/* 年フィルターのチップ列 */
function YearFilter({ selectedYears, onChange, hue }) {
  const isAll = selectedYears.length === YEARS.length;

  const chip = (active) => ({
    fontSize: 12,
    padding: "4px 12px",
    borderRadius: 14,
    border: active ? `1px solid hsl(${hue} 45% 45%)` : "1px solid hsl(40 8% 84%)",
    background: active ? `hsl(${hue} 45% 48%)` : "#fff",
    color: active ? "#fff" : "hsl(40 6% 35%)",
    cursor: "pointer",
  });

  const toggle = (year) => {
    const next = selectedYears.includes(year)
      ? selectedYears.filter((y) => y !== year)
      : [...selectedYears, year].sort();
    if (next.length === 0) return; // 最低1年は残す
    onChange(next);
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center", marginBottom: 14 }}>
      <span style={{ fontSize: 12, color: "hsl(40 5% 48%)", marginRight: 4 }}>年</span>
      <button style={chip(isAll)} onClick={() => onChange([...YEARS])}>全期間</button>
      <span style={{ width: 1, height: 18, background: "hsl(40 8% 88%)", margin: "0 4px" }} />
      {YEARS.map((year) => (
        <button key={year} style={chip(selectedYears.includes(year))} onClick={() => toggle(year)}>
          {year.replace("年", "")}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * クリックした範囲（品種 / タイプ / 全社）の、年ごとの月次実績比較。
 * ライブラリの機能ではなく、onCellClick を使ったデモ側の実装例。
 * 年フィルターとは独立に「常に全年」を並べて比較できるようにしてある。
 * ------------------------------------------------------------------ */
function YearComparison({ selection, maxItems, hue }) {
  const yearly = useMemo(() => {
    let scope =
      selection.types === null
        ? DEMO_ROWS
        : DEMO_ROWS.filter((r) => selection.types.includes(r.fruitType));
    if (selection.variety !== null) {
      scope = scope.filter((r) => r.variety === selection.variety);
    } else if (selection.otherVarieties) {
      const totals = new Map();
      for (const r of scope) totals.set(r.variety, (totals.get(r.variety) || 0) + r.sales);
      const top = new Set(
        [...totals.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, Math.max(0, maxItems - 1))
          .map(([v]) => v)
      );
      scope = scope.filter((r) => !top.has(r.variety));
    }
    const byYear = new Map();
    for (const r of scope) {
      if (!byYear.has(r.year)) byYear.set(r.year, new Array(12).fill(0));
      const acc = byYear.get(r.year);
      r.monthly.forEach((v, i) => (acc[i] += v));
    }
    return [...byYear.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([year, monthly]) => ({ year, monthly, total: monthly.reduce((s, v) => s + v, 0) }));
  }, [selection, maxItems]);

  const sharedMax = Math.max(1, ...yearly.flatMap((y) => y.monthly));

  return (
    <div style={{ marginTop: 20, borderTop: "1px solid hsl(40 8% 88%)", paddingTop: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 15, margin: 0 }}>{selection.label} — 各年の月次比較</h2>
        <span style={{ fontSize: 11, color: "hsl(40 5% 55%)" }}>
          全年共通スケール（最大月 {yen(sharedMax)}）／ マスをクリックで切り替え
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 }}>
        {yearly.map((y) => (
          <YearBars key={y.year} {...y} sharedMax={sharedMax} hue={hue} />
        ))}
      </div>
    </div>
  );
}

function YearBars({ year, monthly, total, sharedMax, hue }) {
  const peak = monthly.indexOf(Math.max(...monthly));
  return (
    <div style={{ border: "1px solid hsl(40 8% 88%)", borderRadius: 6, padding: "8px 10px", background: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>{year}</span>
        <span style={{ fontSize: 11, color: "hsl(40 5% 52%)", fontVariantNumeric: "tabular-nums" }}>
          {yen(total)}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 40 }}>
        {monthly.map((v, i) => (
          <div
            key={i}
            title={`${MONTH_LABELS[i]}月: ${yen(v)}`}
            style={{
              flex: 1,
              height: `${Math.max(3, (v / sharedMax) * 100)}%`,
              borderRadius: 1,
              background: i === peak && v > 0 ? `hsl(${hue} 55% 48%)` : `hsl(${hue} 22% 78%)`,
            }}
          />
        ))}
      </div>
      <div style={{ display: "flex", gap: 2, marginTop: 3 }}>
        {MONTH_LABELS.map((label, i) => (
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

function Slider({ label, value, onChange, min, max, hue }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ color: "hsl(40 5% 48%)" }}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: 100, accentColor: `hsl(${hue} 45% 52%)` }}
      />
      <span
        style={{
          fontVariantNumeric: "tabular-nums",
          fontWeight: 600,
          minWidth: 26,
        }}
      >
        {value}
      </span>
    </label>
  );
}
