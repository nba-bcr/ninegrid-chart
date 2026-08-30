# 公開手順

OSS 公開が初めての場合、この順番でやると事故りにくい。

## 0. 名前を確保する

```bash
npm view ninegrid-chart
```

`404 Not Found` なら空いている。何か返ってきたら別名を考える。

空いていたら、**中身がまだ不完全でも先に `0.0.1` で publish して名前を押さえる**のは
よくやる手。あとから中身を差し替えればいい。

## 1. リポジトリを作る

GitHub で新規リポジトリを作成する。このとき

- **Add a license → MIT** を選ぶ（`LICENSE` を手書きしなくていい）
- `.gitignore` は Node を選ぶ（本リポジトリには同梱済み）

作ったら `package.json` の `USERNAME` を自分のアカウント名に、
`LICENSE` の `YOUR NAME` を自分の名前に置換する。

```bash
git init
git add .
git commit -m "feat: initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME/ninegrid-chart.git
git push -u origin main
```

## 2. 公開前チェック

```bash
npm run build          # dist/ が生成されるか
npm pack --dry-run     # 何が公開されるか一覧で出る
```

`npm pack --dry-run` の出力に `src/` や `node_modules/` が混ざっていたら
`package.json` の `files` が効いていない。`dist` `README.md` `LICENSE` の
3つだけが出ていれば正しい。

## 3. npm アカウントと 2FA

```bash
npm adduser     # 未登録なら
npm login
```

**2FA は先に有効化しておくこと。** npm は 2FA を迂回するトークンの制限を進めており、
アカウント変更まわりは 2026年8月、直接 publish は 2027年1月に効く予定。
最初から下記の Trusted Publishing で組んでおけば移行が不要になる。

## 4. 初回 publish

```bash
npm publish --access public
```

スコープなしパッケージなら `--access public` は省略できるが、
付けておいて損はない。

公開直後に確認：

```bash
npm view ninegrid-chart
```

## 5. GitHub Actions で自動化する（推奨）

トークンを手元に置かずに済む OIDC（Trusted Publishing）方式。
npm 側のパッケージ設定で GitHub リポジトリを Trusted Publisher に登録してから、
以下を `.github/workflows/publish.yml` に置く。

```yaml
name: publish
on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write        # OIDC に必須
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          registry-url: https://registry.npmjs.org
      - run: npm ci
      - run: npm run build
      - run: npm publish --provenance --access public
```

これで GitHub 上で Release を作るたびに自動公開される。
`--provenance` を付けると npm のページに「どのコミットからビルドされたか」が表示される。

## 6. バージョン管理

手で `version` を上げると必ず事故る。[Changesets](https://github.com/changesets/changesets) を入れておく。

```bash
npm i -D @changesets/cli
npx changeset init
```

以降は変更のたびに `npx changeset` を実行して変更内容を記録し、
リリース時に `npx changeset version` でバージョンと CHANGELOG が自動生成される。

セマンティックバージョニングの原則：

- `0.x` のうちは破壊的変更を入れてよい（まだ固まっていない宣言）
- `1.0.0` を出したら、props の削除・改名は major バンプが必要になる
- **急いで 1.0 にしない。** `0.x` のうちに API を固める

## 7. 公開後に効いてくること

優先度順。

1. **README の先頭に GIF を置く。** この手のチャートは文章100行より GIF 1枚。
   ホバーでスパークラインが出るところを録るだけでいい
2. **デモサイトを Cloudflare Pages に出して README からリンクする**
   （Build command: `npm run build:demo` / Output: `dist-demo`）
3. GitHub の **Topics** に `react` `dataviz` `chart` `visualization` を設定する。
   検索流入がここから来る
4. `CONTRIBUTING.md` と Issue テンプレートを置く
5. npm の README は publish 時点のものが固定される。
   README を直したら再 publish が必要

## チーム開発向けのメモ

分担しやすい切り口。ファイルが分かれているので並行作業しやすい。

| 作業 | 主に触るファイル |
|---|---|
| 集計ロジックの改善・テスト追加 | `src/aggregate.js` |
| 編集モード（`mode="edit"`） | 新規ファイル + `src/index.js` |
| スタイル拡張（className / テーマ） | `src/NineGridChart.jsx` |
| TypeScript 型定義 | `src/*.d.ts` |
| デモの拡充 | `demo/` |

`src/NineGridChart.jsx` は複数人が触ると衝突しやすい。
逆に言えば、コンフリクト解消の練習にはちょうどいい題材でもある。
