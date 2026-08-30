import { useMemo, useState, useRef, useCallback } from "react";
import { aggregate, layout } from "./aggregate.js";

/* ------------------------------------------------------------------ *
 * 色スケール
 * hue を1つだけ受け取って HSL で明度・彩度を振る。
 * パレット配列をハードコードすると使う側が必ず不満を持つので、
 * 「変えられる軸」を最小限にしてある。
 * ------------------------------------------------------------------ */
function shade(t, hue) {
  const c = Math.max(0, Math.min(1, t));
  return {
    bg: `hsl(${hue} ${18 + c * 40}% ${95 - c * 58}%)`,
    fg: c > 0.52 ? `hsl(${hue} 30% 96%)` : `hsl(${hue} 45% 22%)`,
  };
}

/* ------------------------------------------------------------------ *
 * セル
 * ------------------------------------------------------------------ */
function Cell({ node, level, intensity, hue, format, onEnter, onLeave, onClick, dense }) {
  if (!node) {
    return (
      <div
        aria-hidden="true"
        style={{
          aspectRatio: "1",
          borderRadius: 3,
          border: "1px dashed hsl(40 8% 86%)",
        }}
      />
    );
  }

  const { bg, fg } = shade(intensity, hue);
  const isTotal = level === "total";
  const clickable = Boolean(onClick);

  return (
    <div
      role={clickable ? "button" : "figure"}
      tabIndex={0}
      aria-label={`${node.name} ${format(node.value)}`}
      onMouseEnter={(e) => onEnter(node, level, e)}
      onMouseMove={(e) => onEnter(node, level, e)}
      onMouseLeave={onLeave}
      onFocus={(e) => onEnter(node, level, e)}
      onBlur={onLeave}
      onClick={clickable ? () => onClick(node, level) : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick(node, level);
              }
            }
          : undefined
      }
      style={{
        aspectRatio: "1",
        borderRadius: 3,
        background: bg,
        color: fg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        padding: "4px 3px",
        overflow: "hidden",
        cursor: clickable ? "pointer" : "default",
        outlineOffset: 2,
        boxShadow: isTotal ? "inset 0 0 0 2px hsl(0 0% 100% / 0.75)" : "none",
        fontStyle: node.isOther ? "italic" : "normal",
      }}
    >
      <span
        style={{
          fontSize: dense ? 8 : level === "item" ? 10 : 11,
          fontWeight: level === "item" ? 400 : 600,
          lineHeight: 1.2,
          textAlign: "center",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          wordBreak: "break-all",
        }}
      >
        {node.name}
      </span>
      {(!dense || isTotal) && (
        <span
          style={{
            fontSize: dense ? 8 : 9.5,
            opacity: 0.78,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {format(node.value)}
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * スパークライン（月別などの系列をツールチップ内に描く）
 * ------------------------------------------------------------------ */
function Sparkline({ series, labels, hue }) {
  const max = Math.max(...series, 1);
  const peak = series.indexOf(max);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 34 }}>
        {series.map((v, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${Math.max(4, (v / max) * 100)}%`,
              borderRadius: 1,
              background:
                i === peak ? `hsl(${hue} 55% 48%)` : `hsl(${hue} 22% 78%)`,
            }}
          />
        ))}
      </div>
      {labels && (
        <div style={{ display: "flex", gap: 2, marginTop: 3 }}>
          {labels.map((label, i) => (
            <span
              key={label}
              style={{
                flex: 1,
                fontSize: 8,
                textAlign: "center",
                color: i === peak ? "hsl(40 6% 20%)" : "hsl(40 5% 68%)",
                fontWeight: i === peak ? 600 : 400,
              }}
            >
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * ツールチップ
 * ------------------------------------------------------------------ */
const LEVEL_LABEL = { total: "総計", group: "グループ", item: "アイテム" };

function Tooltip({ hovered, hue, format, valueLabel, seriesKey, seriesLabels, metricLabels, levelLabels }) {
  if (!hovered) return null;

  const { node, level, x, y, containerWidth } = hovered;
  const metrics = node.metrics || {};
  const series = seriesKey && Array.isArray(metrics[seriesKey]) ? metrics[seriesKey] : null;

  const rows = Object.entries(metricLabels)
    .filter(([key]) => typeof metrics[key] === "number")
    .map(([key, label]) => [label, metrics[key].toLocaleString()]);

  const WIDTH = 236;
  const left = Math.max(0, Math.min(x + 14, containerWidth - WIDTH - 4));

  return (
    <div
      role="tooltip"
      style={{
        position: "absolute",
        left,
        top: y + 14,
        zIndex: 20,
        width: WIDTH,
        pointerEvents: "none",
        background: "hsl(40 20% 99%)",
        border: "1px solid hsl(40 8% 88%)",
        borderRadius: 6,
        boxShadow: "0 6px 24px hsl(40 10% 20% / 0.13)",
        padding: "10px 12px",
        color: "hsl(40 6% 16%)",
      }}
    >
      <div
        style={{
          fontSize: 9,
          letterSpacing: "0.08em",
          color: "hsl(40 5% 60%)",
          textTransform: "uppercase",
        }}
      >
        {levelLabels[level] || LEVEL_LABEL[level]}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, margin: "1px 0 6px" }}>
        {node.name}
        {node.isOther && node.memberCount ? (
          <span style={{ fontSize: 11, fontWeight: 400, color: "hsl(40 5% 58%)" }}>
            {" "}
            ({node.memberCount}件)
          </span>
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11.5,
          padding: "3px 0",
        }}
      >
        <span style={{ color: "hsl(40 5% 52%)" }}>{valueLabel}</span>
        <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
          {format(node.value)}
        </span>
      </div>

      {rows.map(([label, v]) => (
        <div
          key={label}
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 11.5,
            padding: "3px 0",
          }}
        >
          <span style={{ color: "hsl(40 5% 52%)" }}>{label}</span>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{v}</span>
        </div>
      ))}

      {series && (
        <div
          style={{
            marginTop: 8,
            paddingTop: 8,
            borderTop: "1px solid hsl(40 8% 91%)",
          }}
        >
          <Sparkline series={series} labels={seriesLabels} hue={hue} />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * 本体
 * ------------------------------------------------------------------ */
export function NineGridChart({
  data,
  groupKey = "group",
  itemKey = "item",
  valueKey = "value",
  blockGrid = 3,
  maxGroups,
  maxItems = 8,
  highlightGroups = null,
  centerOverride = null,
  otherLabel = "その他",
  otherStrategy = "merge",
  centerLabel = "総計",
  valueLabel = "値",
  hue = 258,
  seriesKey = null,
  seriesLabels = null,
  metricLabels = {},
  levelLabels = {},
  format = (v) => v.toLocaleString(),
  onCellClick = null,
  minWidth = 560,
}) {
  const [hovered, setHovered] = useState(null);
  const wrapRef = useRef(null);

  // 既定のブロック数はブロックの並びに追随する（3×3 → 8、5×5 → 24）
  const groupCap = maxGroups ?? blockGrid * blockGrid - 1;

  const model = useMemo(
    () =>
      aggregate(data, {
        groupKey,
        itemKey,
        valueKey,
        maxGroups: groupCap,
        maxItems,
        otherLabel,
        otherStrategy,
      }),
    [data, groupKey, itemKey, valueKey, groupCap, maxItems, otherLabel, otherStrategy]
  );

  const blocks = useMemo(
    () => layout(model, centerLabel, { blockGrid, centerOverride }),
    [model, centerLabel, blockGrid, centerOverride]
  );

  // 強度の分母。item と group で別スケールにしないと外周が真っ白になる。
  const maxItemValue = useMemo(
    () => Math.max(1, ...model.groups.flatMap((g) => g.children.map((c) => c.value))),
    [model]
  );
  const maxGroupValue = useMemo(
    () => Math.max(1, ...model.groups.map((g) => g.value)),
    [model]
  );

  const handleEnter = useCallback((node, level, e) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    // FocusEvent には clientX/clientY がないので、セルの中心にフォールバックする
    let cx = e.clientX;
    let cy = e.clientY;
    if (typeof cx !== "number" || Number.isNaN(cx)) {
      const cell = e.currentTarget.getBoundingClientRect();
      cx = cell.left + cell.width / 2;
      cy = cell.top + cell.height / 2;
    }
    setHovered({
      node,
      level,
      x: cx - rect.left,
      y: cy - rect.top,
      containerWidth: rect.width,
    });
  }, []);

  const handleLeave = useCallback(() => setHovered(null), []);

  return (
    <div ref={wrapRef} style={{ position: "relative", minWidth }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${blockGrid}, 1fr)`,
          gap: blockGrid > 3 ? 7 : 11,
        }}
      >
        {blocks.map((block, bi) => {
          if (!block) return <div key={bi} />;
          // 中心ブロックは blockGrid×blockGrid、外周ブロックは 3×3
          const cols = Math.round(Math.sqrt(block.cells.length));
          const dense = block.cells.length > 9;
          const highlighted = Boolean(
            highlightGroups && block.group && highlightGroups.includes(block.group.name)
          );
          return (
            <div
              key={bi}
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                gap: dense ? 2 : 3,
                outline: highlighted ? `2px solid hsl(${hue} 55% 40%)` : "none",
                outlineOffset: 2,
                borderRadius: 4,
              }}
            >
              {block.cells.map((node, ci) => {
                const level = block.levels[ci];
                const denom = level === "item" ? maxItemValue : maxGroupValue;
                const intensity =
                  level === "total" ? 1 : node ? node.value / denom : 0;
                return (
                  <Cell
                    key={ci}
                    node={node}
                    level={level}
                    intensity={intensity}
                    hue={hue}
                    format={format}
                    dense={dense}
                    onEnter={handleEnter}
                    onLeave={handleLeave}
                    onClick={
                      onCellClick
                        ? (n, l) =>
                            onCellClick(n, l, {
                              group: block.group ? block.group.name : null,
                              isOtherGroup: Boolean(block.group?.isOther),
                            })
                        : null
                    }
                  />
                );
              })}
            </div>
          );
        })}
      </div>

      <Tooltip
        hovered={hovered}
        hue={hue}
        format={format}
        valueLabel={valueLabel}
        seriesKey={seriesKey}
        seriesLabels={seriesLabels}
        metricLabels={metricLabels}
        levelLabels={levelLabels}
      />
    </div>
  );
}
