const helpAssets = [
  ["towel", "出血說明", "重要資訊不要放太邊邊角角，避免印製裁切時被切到。", "../assets/出血說明.jpg"],
  ["pillow", "貓乾比例說明", "肢體姿勢和長度會影響抱枕飽滿比例。", "../assets/貓乾比例說明.jpg"],
  ["cotton", "帽子實際顏色照片", "帽子顏色與刺繡實品參考。", "../assets/帽子實際顏色照片.JPG"],
  ["cotton", "卡其色與米白色", "帽子卡其色、米白色的近拍比較。", "../assets/卡其色與米白色.JPG"],
  ["pillow", "抱枕有白邊", "客製抱枕有白邊實拍參考。", "../assets/抱枕有白邊.jpg"],
  ["pillow", "抱枕無白邊", "客製抱枕無白邊實拍參考。", "../assets/抱枕無白邊.jpg"],
  ["towel", "毛巾浴巾照片比例", "照片比例通常比較適合浴巾。", "../assets/毛巾浴巾跟照片比例說明.jpg"],
  ["towel", "印製細緻說明", "印製細節與材質呈現說明。", "../assets/印製細緻說明.jpg"],
  ["common", "夾鏈袋包裝示意", "商品包裝方式示意。", "../assets/夾鏈袋包裝示意.JPG"],
  ["luggage", "行李箱套調整說明", "主角畫面比例範圍與成品效果說明。", "../assets/行李箱套調整說明.jpg"],
  ["tissue", "面紙說明", "面紙版面規格與示範圖。", "../assets/面紙說明.jpg"],
  ["towel", "長毛巾顏色選擇", "長毛巾色樣或顏色選擇參考。", "../assets/長毛巾顏色選ㄙㄜˊ.jpg"],
  ["kids", "小朋友印製說明", "小朋友創作印製方式說明。", "../assets/小朋友印製說明.jpeg"],
  ["towel", "毛巾材質說明 A", "環保長纖型與快乾基礎型材質比較。", "../assets/毛巾材質說明a.jpg"],
  ["towel", "毛巾材質說明 B", "毛巾內裡長短毛與材質標籤示意。", "../assets/毛巾材質說明b.jpg"]
].map(([category, title, description, file]) => ({ category, title, description, file }));

function assetSlug(asset) {
  return encodeURIComponent(asset.title.replace(/\s+/g, "-"));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function render() {
  const params = new URLSearchParams(window.location.search);
  const itemSlug = params.get("item");
  const asset = helpAssets.find((entry) => assetSlug(entry) === itemSlug);
  const title = document.querySelector("#helpTitle");
  const description = document.querySelector("#helpDescription");
  const imageCard = document.querySelector("#imageCard");
  const image = document.querySelector("#helpImage");
  const list = document.querySelector("#guideList");

  if (asset) {
    document.title = `${asset.title} - MakeWorld 說明`;
    title.textContent = asset.title;
    description.textContent = asset.description;
    image.src = asset.file;
    image.alt = asset.title;
    imageCard.hidden = false;
  }

  list.innerHTML = helpAssets.map((entry) => `
    <a href="?item=${assetSlug(entry)}">
      <strong>${escapeHtml(entry.title)}</strong>
      <span>${escapeHtml(entry.description)}</span>
    </a>
  `).join("");
}

render();
