/**
 * チャートを画像としてダウンロードするユーティリティ。React 非依存。
 *
 * 本ライブラリはスタイルをすべてインラインで持っているため、DOM を
 * そのまま SVG の <foreignObject> に包めば外部ライブラリなしで
 * 見た目を保ったまま画像化できる。
 *
 * - "svg"        … ベクターのまま保存（拡大しても劣化しない）
 * - "png" / "jpg" … SVG を <img> 経由で canvas に描いてラスタライズ
 *
 * 制約:
 * - フォントは閲覧環境のものが使われる（埋め込みはしない）
 * - Safari は foreignObject の canvas 描画に既知の不具合があり、
 *   PNG/JPG が欠けることがある。その場合は SVG を使う
 */

const SVG_NS = "http://www.w3.org/2000/svg";

/** 要素を、見た目を引き継いだ自己完結の SVG 文字列にする。 */
function buildSvg(el, background) {
  const rect = el.getBoundingClientRect();
  const width = Math.ceil(rect.width);
  const height = Math.ceil(rect.height);

  // インラインスタイルは clone に残る。継承で効いているフォント等は
  // インラインに乗らないので、計算済みスタイルをラッパーに写す
  const cs = getComputedStyle(el);
  const wrapper = document.createElement("div");
  wrapper.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  wrapper.style.cssText =
    `width:${width}px;height:${height}px;box-sizing:border-box;` +
    `font-family:${cs.fontFamily};font-size:${cs.fontSize};` +
    `line-height:${cs.lineHeight};color:${cs.color};` +
    (background ? `background:${background};` : "");
  wrapper.appendChild(el.cloneNode(true));

  const html = new XMLSerializer().serializeToString(wrapper);
  const svg =
    `<svg xmlns="${SVG_NS}" width="${width}" height="${height}" ` +
    `viewBox="0 0 ${width} ${height}">` +
    `<foreignObject width="100%" height="100%">${html}</foreignObject></svg>`;

  return { svg, width, height };
}

function download(blob, fileName) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/**
 * 要素を画像ファイルとしてダウンロードする。
 *
 * @param {HTMLElement} el  チャートのルート要素（チャートを包んだ div でよい）
 * @param {object} [options]
 * @param {"png"|"jpg"|"svg"} [options.format="png"]
 * @param {number} [options.scale=2]        ラスタライズ倍率（png/jpg のみ）
 * @param {string} [options.background="#ffffff"]  背景色。null で透過（png/svg のみ有効）
 * @param {string} [options.fileName="ninegrid-chart"]  拡張子は format から自動で付く
 * @returns {Promise<void>}
 */
export async function exportImage(el, options = {}) {
  const {
    format = "png",
    scale = 2,
    background = "#ffffff",
    fileName = "ninegrid-chart",
  } = options;

  if (!el) throw new Error("exportImage: element is required");

  // JPG に透過はないので必ず背景を塗る
  const bg = format === "jpg" ? background || "#ffffff" : background;
  const { svg, width, height } = buildSvg(el, bg);

  if (format === "svg") {
    download(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), `${fileName}.svg`);
    return;
  }

  // blob URL の SVG は foreignObject 入りだと canvas を汚染することがあるため、
  // data URI で読み込む（dom-to-image 系ライブラリと同じ手法）
  const svgUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error("exportImage: failed to rasterize the chart"));
      img.src = svgUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    if (bg) {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const mime = format === "jpg" ? "image/jpeg" : "image/png";
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("exportImage: canvas.toBlob failed"))),
        mime,
        0.92
      );
    });
    download(blob, `${fileName}.${format}`);
  }
}
