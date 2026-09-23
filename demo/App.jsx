import { useRef, useState } from "react";
import { NineGridDashboard, exportImage } from "../src/index.js";
import { DEMO_ROWS, yen } from "./demoData.js";

export default function App() {
  const [hue, setHue] = useState(258);
  const areaRef = useRef(null);

  const saveAs = (format) =>
    exportImage(areaRef.current, { format, fileName: "ninegrid-chart" }).catch((e) =>
      alert("画像の書き出しに失敗しました: " + e.message)
    );

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
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <div style={{ fontSize: 10, letterSpacing: "0.14em", color: `hsl(${hue} 20% 55%)`, marginBottom: 6 }}>
          NINEGRID-CHART
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 6px" }}>果物の販売実績</h1>
        <p style={{ fontSize: 13, color: "hsl(40 5% 48%)", margin: "0 0 20px", lineHeight: 1.7 }}>
          「年月・産地・タイプ・品種・売上」のフラットな行データ（{DEMO_ROWS.length.toLocaleString()}行）を
          <code style={{ fontSize: 12, background: "hsl(40 15% 93%)", padding: "1px 5px", borderRadius: 3 }}>
            &lt;NineGridDashboard&gt;
          </code>
          にそのまま渡しただけ。中央8マス / 外枠8マスに使う列は下のセレクタで切り替えられる。
          マスにカーソルを合わせると月別の売れ方、クリックすると下の年別グラフが切り替わる。
        </p>

        <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap", marginBottom: 14, fontSize: 12 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: "hsl(40 5% 48%)" }}>色相</span>
            <input
              type="range"
              min={0}
              max={360}
              value={hue}
              onChange={(e) => setHue(Number(e.target.value))}
              style={{ width: 120, accentColor: `hsl(${hue} 45% 52%)` }}
            />
            <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, minWidth: 26 }}>{hue}</span>
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

        <div ref={areaRef}>
          <NineGridDashboard
            data={DEMO_ROWS}
            ymKey="ym"
            valueKey="sales"
            categoryKeys={["type", "variety", "region"]}
            categoryLabels={{ type: "タイプ", variety: "品種", region: "産地" }}
            centerLabel="全社売上"
            valueLabel="売上"
            format={yen}
            hue={hue}
          />
        </div>
      </div>
    </div>
  );
}
