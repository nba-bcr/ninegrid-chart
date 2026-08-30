import { useState } from "react";
import { NineGridChart } from "../src/index.js";
import { DEMO_ROWS, MONTH_LABELS, yen } from "./demoData.js";

const STRATEGIES = [
  ["merge", "その他にまとめる"],
  ["drop", "切り捨てる"],
  ["none", "そのまま"],
];

export default function App() {
  const [maxGroups, setMaxGroups] = useState(8);
  const [maxItems, setMaxItems] = useState(8);
  const [strategy, setStrategy] = useState("merge");
  const [hue, setHue] = useState(258);

  const typeCount = new Set(DEMO_ROWS.map((r) => r.fruitType)).size;

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
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
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
          果物タイプ別 売上構成
        </h1>
        <p
          style={{
            fontSize: 13,
            color: "hsl(40 5% 48%)",
            margin: "0 0 24px",
            lineHeight: 1.7,
          }}
        >
          {typeCount}タイプ / {DEMO_ROWS.length}品種。売上上位から左上→右下の順に配置。
          中心ブロックがタイプ別サマリ、外周8ブロックが各タイプの品種内訳。
          マスにカーソルを合わせると受注件数と月別の売れ方が出る。
        </p>

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
          <Slider label="タイプ数" value={maxGroups} onChange={setMaxGroups} min={1} max={8} hue={hue} />
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
        </div>

        <div style={{ overflowX: "auto", paddingBottom: 8 }}>
          <NineGridChart
            data={DEMO_ROWS}
            groupKey="fruitType"
            itemKey="variety"
            valueKey="sales"
            maxGroups={maxGroups}
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
          />
        </div>
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
