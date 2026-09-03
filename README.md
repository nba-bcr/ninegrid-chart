# ninegrid-chart

**フラットな行データを渡すと、9×9 の入れ子グリッドに自動で配置する React チャートコンポーネント。**

大谷翔平の目標達成シートで知られる 9×9 の形式（81マス）を、目標設定シートではなく **データ可視化のレイアウト**として使う。中心に総計、その周囲8マスに第1階層、外周の8ブロック（各8マス）に第2階層が入る。

```
┌─────┬─────┬─────┐
│ ブロ │ ブロ │ ブロ │   外周8ブロック = 各グループの内訳
│ ック │ ック │ ック │   （中心セルはそのグループ名）
├─────┼─────┼─────┤
│ ブロ │ 中心 │ ブロ │   中心ブロック = グループ別サマリ
│ ック │ ブロ │ ック │   その中心セル = 総計
├─────┼─────┼─────┤
│ ブロ │ ブロ │ ブロ │
│ ック │ ック │ ック │
└─────┴─────┴─────┘
```

配置は**値の降順**。左上が最大で、読み順（左上→右下）に並ぶ
（`sortGroups="none"` にすればデータの出現順＝任意の並びにもできる）。

## 見た目の構成

- **ブロックの並びは `blockGrid` で変えられる。** 既定は `3`（3×3 = 9ブロック、81マス）。
  `5` にすると 5×5 = 25ブロックの俯瞰表示になり、最大**24グループ**を一度に並べられる
- **1つのブロック（正方形）は常に 3×3 で固定。** 中心セルがグループ名、
  周囲8マスに上位7アイテム + 「その他」が入る
- **中心ブロックだけはブロックの並びと相似形**になる。3×3 なら 8グループ + 総計、
  5×5 なら 5×5 のミニセルに 24グループ + 総計（大KPI）が入る

## なぜこれを作ったか

既存の 9×9 グリッド実装はほぼ全部「人間が81マスを手で埋める目標設定ツール」で、
「集計済みのデータを流し込むと81マスが生成される」ものが見当たらなかった。

このコンポーネントは後者に振り切っている。

- ツリーマップと違い、**全セルが同じ大きさ** → 大小ではなく「構造」が読める
- 第1階層と第2階層が**同じ画面に同時に見える** → ドリルダウン不要
- 上位N件に自動で絞られる → ロングテールが視界を汚さない

逆に「規模感を一目で」ならツリーマップの方が向いている。用途が違うので、並べて使うのが良い。

## 何に使えるか

果物のタイプ×品種の売上、というのが最初のユースケースだったが、
「2階層 + 数値」の形なら何でも入る。

| グループ | アイテム | 値 |
|---|---|---|
| 商品カテゴリ | 商品名 | 売上 |
| 部署 | メンバー | 工数 |
| 店舗 | 担当者 | 売上 |
| 流入チャネル | ランディングページ | CV数 |
| 大目標 | アクション | 進捗率 |

## 準備するデータの形

**「年月・大カテゴリ・小カテゴリ・指標」の4列**があれば、このチャートの全機能が使える。
BI ツールやスプレッドシートから CSV で吐き出すときはこの形を目指せばいい。

| 年月 | 大カテゴリ | 小カテゴリ | 指標 |
|---|---|---|---|
| 2025-01 | ドリンク | カフェラテ | 128000 |
| 2025-01 | ドリンク | エスプレッソ | 43000 |
| 2025-01 | フード | クロワッサン | 61000 |
| 2025-02 | ドリンク | カフェラテ | 131000 |
| 2025-02 | フード | クロワッサン | 58000 |
| … | … | … | … |

事前の集計は不要。同じ「大カテゴリ × 小カテゴリ」の行が何行あっても勝手に合算される。

チャートに渡すときは、年月の列を**月別の12要素配列**に畳んでおくと、
ツールチップに季節性のスパークラインが出る。変換はこれだけ：

```js
// CSVの行 { ym: "2025-01", group: "ドリンク", item: "カフェラテ", value: 128000 }
// を { group, item, value, monthly: [12個] } に畳む
function toChartRows(csvRows) {
  const acc = new Map();
  for (const r of csvRows) {
    const key = r.group + "\u0000" + r.item;
    if (!acc.has(key)) {
      acc.set(key, { group: r.group, item: r.item, value: 0, monthly: Array(12).fill(0) });
    }
    const node = acc.get(key);
    node.value += r.value;
    node.monthly[Number(r.ym.slice(5, 7)) - 1] += r.value;
  }
  return [...acc.values()];
}
```

複数年のデータなら `(group, item, 年)` 単位で畳んで年ごとの行にしておくと、
年フィルターや「各年の月次比較」のような UI をチャートの外側に足しやすい
（チャート自体は年の列を無視してそのまま合算してくれる）。

年月がそもそも無いデータ（スナップショット1回分）なら、
`monthly` を省いて `{ group, item, value }` の3列だけでいい。

## セットアップ（ローカルで動かす）

```bash
# 1. 依存をインストール
npm install

# 2. デモを起動（http://localhost:5173）
npm run dev

# 3. ライブラリをビルド（dist/ が生成される）
npm run build

# 4. デモを静的サイトとしてビルド（dist-demo/ が生成される）
npm run build:demo
```

`npm run dev` で立ち上がるデモには、タイプ数・品種数・色相・はみ出し戦略を
その場で変えられるスライダーが付いている。挙動を確かめるのはここが一番早い。

### Cloudflare Pages に出す場合

GitHub と連携して以下を設定するだけ。

- Build command: `npm run build:demo`
- Build output directory: `dist-demo`

## 使い方

```jsx
import { NineGridChart } from "ninegrid-chart";

const rows = [
  { fruitType: "ぶどう", variety: "シャインマスカット", sales: 1650000, orders: 393, monthly: [/* 12個 */] },
  { fruitType: "ぶどう", variety: "巨峰",               sales:  620000, orders: 148, monthly: [/* 12個 */] },
  // ...
];

<NineGridChart
  data={rows}
  groupKey="fruitType"
  itemKey="variety"
  valueKey="sales"
  maxGroups={8}
  maxItems={8}
  centerLabel="全社売上"
  valueLabel="売上"
  seriesKey="monthly"
  seriesLabels={["1","2","3","4","5","6","7","8","9","10","11","12"]}
  metricLabels={{ orders: "受注件数" }}
  levelLabels={{ group: "タイプ", item: "品種" }}
  format={(v) => "¥" + v.toLocaleString()}
  hue={258}
/>
```

**事前集計は不要。** 行データをそのまま渡せば、group / item / 総計の3階層で勝手に積み上がる。

グループが8個を超えるなら `blockGrid={5}` で 5×5 の俯瞰にする：

```jsx
<NineGridChart
  data={rows}
  groupKey="store"
  itemKey="staff"
  valueKey="sales"
  blockGrid={5}          // 25ブロック（最大24グループ）
  sortGroups="none"      // 例: 行を開店順に並べておけば、ブロックも開店順になる
  centerOverride={{ value: grandTotal }}  // 一部だけ描画しても中心KPIは全体値を維持
/>
```

### 画像エクスポート（PNG / JPG / SVG）

`exportImage()` にチャートを包んだ要素を渡すと、見た目そのままの画像をダウンロードできる。
スタイルが全部インラインなので、html2canvas のような外部ライブラリは不要。

```jsx
import { useRef } from "react";
import { NineGridChart, exportImage } from "ninegrid-chart";

const ref = useRef(null);

<div ref={ref}>
  <NineGridChart data={rows} ... />
</div>
<button onClick={() => exportImage(ref.current, { format: "png" })}>
  PNGで保存
</button>
```

| オプション | 既定値 | 説明 |
|---|---|---|
| `format` | `"png"` | `"png"` / `"jpg"` / `"svg"` |
| `scale` | `2` | ラスタライズ倍率（png/jpg のみ） |
| `background` | `"#ffffff"` | 背景色。`null` で透過（png/svg のみ） |
| `fileName` | `"ninegrid-chart"` | 拡張子は自動で付く |

フォントは閲覧環境のものが使われる（埋め込みはしない）。Safari は
`foreignObject` の canvas 描画に既知の不具合があるため、PNG/JPG が
欠ける場合は SVG を使うこと。

### メトリクスの自動集計

`valueKey` 以外の**数値フィールドは自動で合算**される。さらに、
**数値配列は要素ごとに合算**される。

つまり月別売上の12要素配列を各行に持たせておくだけで、
「品種 → タイプ → 総計」の各階層で季節性が自動的に積み上がり、
ツールチップのスパークラインに反映される。ここが一番の設計上のキモ。

ツールチップに何を表示するかは `metricLabels` で宣言する。
宣言しなかった数値は集計されるが表示されない。

## Props

| Prop | 型 | 既定値 | 説明 |
|---|---|---|---|
| `data` | `object[]` | 必須 | フラットな行データ |
| `groupKey` | `string` | `"group"` | 第1階層のキー |
| `itemKey` | `string` | `"item"` | 第2階層のキー |
| `valueKey` | `string` | `"value"` | 大きさを決める数値キー |
| `blockGrid` | `number` | `3` | ブロックの並び（n×n）。`5` にすると25ブロック（外周24グループ + 中心5×5サマリ）の俯瞰表示になる |
| `maxGroups` | `number` | `blockGrid²−1` | ブロック数の上限 |
| `maxItems` | `number` | `8` | ブロック内セル数の上限（1–8） |
| `highlightGroups` | `string[] \| null` | `null` | 名前が一致するブロックを枠線で強調（選択UIの実装用） |
| `centerOverride` | `object \| null` | `null` | 中心セル（総計）に上書きするフィールド。一部グループだけ描画しつつ全体KPIを見せたい場合に `{ value, metrics }` を渡す |
| `otherLabel` | `string` | `"その他"` | 畳んだノードのラベル |
| `otherStrategy` | `"merge"\|"drop"\|"none"` | `"merge"` | 上限を超えた分の扱い |
| `sortGroups` | `"value"\|"none"` | `"value"` | ブロックの並び順。`"none"` は行データの出現順を保つ（開店順・五十音順などで並べたいときは、行データをその順にしてから指定） |
| `centerLabel` | `string` | `"総計"` | 中心セルのラベル |
| `valueLabel` | `string` | `"値"` | ツールチップでの値の見出し |
| `hue` | `number` | `258` | 色相（0–360）。彩度・明度は値から自動 |
| `seriesKey` | `string \| null` | `null` | スパークラインに使う数値配列のキー |
| `seriesLabels` | `string[] \| null` | `null` | スパークラインの目盛ラベル |
| `metricLabels` | `object` | `{}` | ツールチップに出す指標 `{ キー: 表示名 }` |
| `levelLabels` | `object` | `{}` | 階層名の表示 `{ group: "…", item: "…" }` |
| `format` | `(n) => string` | `toLocaleString` | 値の書式 |
| `onCellClick` | `(node, level, context) => void \| null` | `null` | セルクリック時のコールバック。`context.group` はクリックしたセルが属するブロックのグループ名（中心ブロックなら `null`）、`context.isOtherGroup` は「その他」ブロックかどうか |
| `minWidth` | `number` | `560` | 最小幅（下回ると横スクロール） |

### `otherStrategy` の使い分け

- **`merge`** — 上位 N−1 件を残し、残りを1つに畳む。**合計値が保たれる**ので売上構成比を見る用途はこれ
- **`drop`** — 上位 N 件だけ残して切り捨てる。合計は減る。「主要品目だけ見たい」とき
- **`none`** — 何もしない。もともと8件以下と分かっている場合の無駄処理回避

## 名前と商標について

「マンダラチャート」は一般社団法人マンダラチャート協会の登録商標です。
このパッケージは同協会とは無関係であり、`ninegrid-chart` という名前を使用しています。
README 内での言及は、形式を説明するための記述に留めています。

## ロードマップ

- [ ] `mode="edit"` — セルを手で埋める編集モード（読みと書きで同じレンダリングを共有）
- [ ] JSON エクスポート / インポート
- [x] 画像エクスポート（PNG / JPG / SVG）→ `exportImage()`
- [ ] 進捗トグル（未着手 / 進行中 / 完了）と塗り分け
- [ ] TypeScript 型定義
- [ ] AI によるセル候補提案（別パッケージとして分離予定）

## ライセンス

MIT
