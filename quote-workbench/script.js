const shirtPricing = {
  printstar: { name: "Printstar 00085-CVT", white: 84, color: 93, large: 20 },
  gildan: { name: "Gildan 76000 短T", white: 60, color: 70, large: 15 },
  crossrunner: { name: "Crossrunner 3900 排汗衫", white: 52, color: 52, large: 10 },
  ua: { name: "UA35001", white: 107, color: 107, large: 30 },
  custom: { name: "其他，自填成本", white: 0, color: 0, large: 0 }
};

const towelPricing = {
  basic_white: { name: "素色毛巾 30x60cm", white: 45, color: 55 },
  basic_large: { name: "素色毛巾 34x76cm", white: 60, color: 70 },
  sport: { name: "運動毛巾 20x100cm", white: 55, color: 65 },
  bath: { name: "浴巾 70x140cm", white: 90, color: 110 }
};

const companies = {
  deshui: { name: "得水實業", docType: "發票", taxType: "invoice" },
  chimei: { name: "奇美廣告", docType: "收據", taxType: "receipt" },
  buma: { name: "布碼科技", docType: "收據", taxType: "receipt" }
};

const state = {
  view: "workspace",
  step: "customer",
  productType: "shirt",
  company: "deshui",
  editingId: null,
  items: []
};

const $ = (id) => document.getElementById(id);
const money = (value) => `NT$ ${Math.round(value || 0).toLocaleString()}`;
const numberValue = (id) => Number($(id)?.value || 0);
const textValue = (id) => ($(id)?.value || "").trim();
const escapeHtml = (value) =>
  String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

function init() {
  setDefaultDates();
  bindEvents();
  renderPricing();
  updateProductVisibility();
  render();
}

function bindEvents() {
  document.querySelectorAll("input, select, textarea").forEach((el) => {
    el.addEventListener("input", render);
    el.addEventListener("change", render);
  });

  $("viewNav").addEventListener("click", (event) => {
    const button = event.target.closest("[data-view]");
    if (button) setView(button.dataset.view);
  });

  document.querySelectorAll("[data-step]").forEach((button) => {
    button.addEventListener("click", () => setStep(button.dataset.step));
  });

  document.querySelectorAll("[data-type]").forEach((button) => {
    button.addEventListener("click", () => {
      state.productType = button.dataset.type;
      state.editingId = null;
      updateProductVisibility();
      render();
    });
  });

  document.querySelectorAll("[data-company]").forEach((button) => {
    button.addEventListener("click", () => {
      state.company = button.dataset.company;
      document.querySelectorAll("[data-company]").forEach((el) => el.classList.toggle("active", el === button));
      render();
    });
  });

  $("newItemButton").addEventListener("click", startNewItem);
  $("commitItemButton").addEventListener("click", commitCurrentItem);
  $("commitTopButton").addEventListener("click", commitCurrentItem);
  $("addManualItemButton").addEventListener("click", addManualItem);
  $("quoteItems").addEventListener("click", handleItemAction);
  $("saveButton").addEventListener("click", saveCurrentQuote);
  $("resetButton").addEventListener("click", resetAll);
  $("printButton").addEventListener("click", () => window.print());
  $("mailButton").addEventListener("click", openMailDraft);
  $("historySearch").addEventListener("input", renderHistory);
  $("historyList").addEventListener("click", handleHistoryAction);
}

function setView(view) {
  state.view = view;
  document.querySelectorAll("[data-view]").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  document.querySelectorAll(".view").forEach((panel) => panel.classList.remove("active"));
  $(`${view}View`).classList.add("active");
  $("pageTitle").textContent = view === "workspace" ? "新增報價" : view === "history" ? "歷史報價" : "價格資料";
  if (view === "history") renderHistory();
}

function setStep(step) {
  state.step = step;
  document.querySelectorAll("[data-step]").forEach((button) => button.classList.toggle("active", button.dataset.step === step));
  document.querySelectorAll(".step-panel").forEach((panel) => panel.classList.remove("active"));
  $(`step${step[0].toUpperCase()}${step.slice(1)}`).classList.add("active");
}

function setDefaultDates() {
  const today = new Date();
  const valid = new Date();
  valid.setMonth(valid.getMonth() + 3);
  $("quoteDate").valueAsDate = today;
  $("validUntil").valueAsDate = valid;
}

function updateProductVisibility() {
  document.querySelectorAll("[data-type]").forEach((button) => button.classList.toggle("active", button.dataset.type === state.productType));
  ["shirt", "towel", "other"].forEach((type) => $(`${type}Form`).classList.toggle("active", type === state.productType));
  $("customShirtCostWrap").classList.toggle("hidden", $("shirtBrand").value !== "custom");
  $("shirtProcessingArea").classList.toggle("hidden", state.productType !== "shirt");
  $("shirtAddonsCard").classList.toggle("hidden", state.productType !== "shirt");
  $("processingUnavailable").classList.toggle("hidden", state.productType === "shirt");
  document.querySelector('[data-step="processing"]').classList.toggle("hidden", state.productType !== "shirt");
  $("flowStrip").classList.toggle("processing-hidden", state.productType !== "shirt");
  if (state.productType !== "shirt" && state.step === "processing") setStep("pricing");
  updateProcessingFields();
  $("editingLabel").textContent = `目前編輯：${state.editingId ? "既有" : "新"}${productTypeLabel()}品項`;
}

function updateProcessingFields() {
  ["front", "back", "arm"].forEach((prefix) => {
    const method = $(`${prefix}Method`)?.value;
    const width = numberValue(`${prefix}Width`);
    const height = numberValue(`${prefix}Height`);
    const isScreen = method === "screen";
    const isCustom = method === "custom";
    const plate = isScreen ? (Math.max(width, height) >= 30 ? 650 : 450) : 0;
    if ($(`${prefix}Plate`)) $(`${prefix}Plate`).value = isScreen ? plate : "";
    document.querySelector(`[data-plate-field="${prefix}"]`)?.classList.toggle("hidden", !isScreen);
    document.querySelector(`[data-colors-field="${prefix}"]`)?.classList.toggle("hidden", !isScreen);
    document.querySelector(`[data-custom-field="${prefix}"]`)?.classList.toggle("hidden", !isCustom);
  });
}

function productTypeLabel() {
  return state.productType === "shirt" ? "衣服" : state.productType === "towel" ? "毛巾" : "其他";
}

function getCurrentItem() {
  const product = getProduct();
  const processing = state.productType === "shirt" ? getShirtProcessing(product.qty) : { unit: 0, total: 0, details: [] };
  const addOns = getAddOns(product.qty);
  const unitCost = product.unitBase + product.extraUnit + processing.unit + addOns.totalUnit;
  const pricing = getPricing(unitCost);
  const subtotal = pricing.unitPrice * product.qty;
  const costTotal = unitCost * product.qty;

  return {
    id: state.editingId || makeId(),
    productType: state.productType,
    product,
    processing,
    addOns,
    pricing,
    unitCost,
    unitPrice: pricing.unitPrice,
    costTotal,
    subtotal,
    profit: subtotal - costTotal,
    form: captureItemForm()
  };
}

function getProduct() {
  if (state.productType === "shirt") return getShirtProduct();
  if (state.productType === "towel") return getTowelProduct();
  return getOtherProduct();
}

function getShirtProduct() {
  const brandKey = $("shirtBrand").value;
  const brand = shirtPricing[brandKey];
  const color = $("shirtColor").value;
  const regularQty = numberValue("shirtQtyRegular");
  const largeQty = numberValue("shirtQtyLarge");
  const qty = regularQty + largeQty;
  const base = brandKey === "custom" ? numberValue("customShirtCost") : brand[color];
  const regularCost = regularQty * base;
  const largeCost = largeQty * (base + brand.large);
  const total = regularCost + largeCost;
  return {
    type: "衣服",
    name: textValue("shirtQuoteName") || "客製化短T",
    internalName: brand.name,
    spec: `${color === "white" ? "白色" : "彩色"} / S-XL ${regularQty} 件 / 2L+ ${largeQty} 件`,
    qty,
    unitBase: qty ? total / qty : 0,
    extraUnit: 0,
    details: [["衣服成本", qty ? total / qty : 0]]
  };
}

function getTowelProduct() {
  const item = towelPricing[$("towelType").value];
  const color = $("towelColor").value;
  const qty = numberValue("towelQty");
  const unit = item[color];
  const extraUnit = numberValue("towelExtraCost");
  return {
    type: "毛巾",
    name: textValue("towelQuoteName") || "客製化毛巾",
    internalName: item.name,
    spec: color === "white" ? "白色" : "彩色",
    qty,
    unitBase: unit,
    extraUnit,
    details: [["毛巾成本", unit], ["毛巾加工 / 附加成本", extraUnit]]
  };
}

function getOtherProduct() {
  const qty = numberValue("otherQty");
  const unit = numberValue("otherCost");
  const extraUnit = numberValue("otherExtraCost");
  return {
    type: "其他",
    name: textValue("otherQuoteName") || textValue("otherName") || "其他客製商品",
    internalName: textValue("otherName") || "其他客製商品",
    spec: textValue("otherSpec") || "客製規格",
    qty,
    unitBase: unit,
    extraUnit,
    details: [["商品成本", unit], ["附加成本", extraUnit]]
  };
}

function getShirtProcessing(qty) {
  const positions = [
    getPositionCost("front", "正面", qty),
    getPositionCost("back", "背面", qty),
    getPositionCost("arm", armSideLabel(), qty)
  ].filter(Boolean);
  const unit = positions.reduce((sum, item) => sum + item.unit, 0);
  return {
    unit,
    total: unit * qty,
    details: positions.map((item) => [item.label, item.unit]),
    positions
  };
}

function getPositionCost(prefix, label, qty) {
  if (!$(`${prefix}Enabled`).checked) return null;
  const method = $(`${prefix}Method`).value;
  const width = numberValue(`${prefix}Width`);
  const height = numberValue(`${prefix}Height`);
  const colors = Math.max(1, numberValue(`${prefix}Colors`) || 1);
  const plate = method === "screen" ? (Math.max(width, height) >= 30 ? 650 : 450) : 0;
  const custom = numberValue(`${prefix}CustomCost`);
  let unit = 0;
  let methodLabel = "";
  let formula = "";

  if (method === "dtf") {
    unit = width && height ? width * height * 0.02 + 7 : 7;
    methodLabel = "抖粉";
    formula = `${width} x ${height} x 0.02 + 人工 7`;
  } else if (method === "screen") {
    const ink = 10 + (colors >= 2 ? 5 : 0) + (colors >= 3 ? (colors - 2) * 5 : 0);
    const plateShare = qty ? plate / qty : 0;
    unit = ink + plateShare;
    methodLabel = "網印";
    formula = `油墨 ${ink} + ${Math.max(width, height) >= 30 ? "大版" : "小版"} ${plate}${qty ? ` / ${qty}` : ""}`;
  } else if (method === "dtg") {
    unit = 60;
    methodLabel = "直噴";
    formula = "直噴暫估 60";
  } else {
    unit = custom;
    methodLabel = "自填";
    formula = "手動輸入";
  }

  const multiplier = prefix === "arm" && $("armSide").value === "both" ? 2 : 1;
  unit *= multiplier;
  return { label: `${label} / ${methodLabel}`, unit, methodLabel, formula, multiplier, enabled: true };
}

function armSideLabel() {
  return $("armSide").value === "both" ? "雙臂" : $("armSide").value === "right" ? "右手臂" : "左手臂";
}

function getAddOns(qty) {
  const prefix = state.productType;
  const labelMode = $(`${prefix}LabelMode`).value;
  const labelBatch = numberValue(`${prefix}LabelBatchCost`);
  const packageMode = $(`${prefix}PackageMode`).value;
  const shippingRate = numberValue(`${prefix}ShippingRate`);
  const labelUnit = labelMode === "print" ? 6 : labelMode === "sew" ? 10 + (qty ? labelBatch / qty : 0) : 0;
  const packageUnit = packageMode === "opp" ? 8 : 0;
  const shippingTotal = qty && shippingRate ? Math.ceil(qty / 100) * shippingRate : 0;
  const shippingUnit = qty ? shippingTotal / qty : 0;
  return {
    totalUnit: labelUnit + packageUnit + shippingUnit,
    details: [["標籤", labelUnit], ["包裝", packageUnit], ["運費攤提", shippingUnit]]
  };
}

function getPricing(unitCost) {
  const mode = $("profitMode").value;
  let unitPrice = 0;
  if (mode === "margin") {
    const margin = Math.min(numberValue("marginRate"), 95) / 100;
    unitPrice = margin >= 0.95 ? unitCost : unitCost / (1 - margin);
  } else if (mode === "fixed") {
    unitPrice = unitCost + numberValue("fixedProfit");
  } else {
    unitPrice = numberValue("directPrice");
  }
  const rounded = Math.ceil(unitPrice / 5) * 5;
  return { mode, rawUnitPrice: unitPrice, unitPrice: rounded, profitUnit: rounded - unitCost };
}

function captureItemForm() {
  const values = {};
  document.querySelectorAll("#stepProduct input, #stepProduct select, #stepProcessing input, #stepProcessing select, #stepPricing input, #stepPricing select").forEach((el) => {
    if (el.id) values[el.id] = el.type === "checkbox" ? el.checked : el.value;
  });
  return { productType: state.productType, values };
}

function commitCurrentItem() {
  const item = getCurrentItem();
  if (!item.product.qty) {
    showToast("請先輸入品項數量");
    setStep("product");
    return;
  }
  const index = state.items.findIndex((existing) => existing.id === item.id);
  if (index >= 0) state.items[index] = item;
  else state.items.push(item);
  state.editingId = item.id;
  render();
  showToast("品項已加入報價清單");
}

function addManualItem() {
  const name = textValue("manualName");
  const spec = textValue("manualSpec");
  const qty = numberValue("manualQty");
  const unitPrice = numberValue("manualPrice");
  if (!name || !qty || !unitPrice) {
    showToast("請填手動項目的品名、數量與單價");
    return;
  }
  state.items.push({
    id: makeId(),
    productType: "manual",
    product: {
      type: "手動項目",
      name,
      internalName: name,
      spec: spec || "手動新增",
      qty,
      unitBase: 0,
      extraUnit: 0,
      details: [["手動項目", unitPrice]]
    },
    processing: { unit: 0, total: 0, details: [], positions: [] },
    addOns: { totalUnit: 0, details: [] },
    pricing: { mode: "manual", rawUnitPrice: unitPrice, unitPrice, profitUnit: unitPrice },
    unitCost: 0,
    unitPrice,
    costTotal: 0,
    subtotal: unitPrice * qty,
    profit: unitPrice * qty,
    form: { productType: "manual", values: { manualName: name, manualSpec: spec, manualQty: String(qty), manualPrice: String(unitPrice) } }
  });
  ["manualName", "manualSpec", "manualQty", "manualPrice"].forEach((id) => {
    if ($(id)) $(id).value = "";
  });
  render();
  showToast("已加入手動報價項目");
}

function handleItemAction(event) {
  const button = event.target.closest("[data-action]");
  const row = event.target.closest("[data-id]");
  if (!button || !row) return;
  const id = row.dataset.id;
  if (button.dataset.action === "delete") {
    state.items = state.items.filter((item) => item.id !== id);
    if (state.editingId === id) state.editingId = null;
    render();
    return;
  }
  const item = state.items.find((entry) => entry.id === id);
  if (item) loadItemForEdit(item);
}

function loadItemForEdit(item) {
  state.editingId = item.id;
  state.productType = item.form.productType;
  Object.entries(item.form.values).forEach(([id, value]) => {
    const el = $(id);
    if (!el) return;
    if (el.type === "checkbox") el.checked = Boolean(value);
    else el.value = value;
  });
  updateProductVisibility();
  setStep("product");
  render();
}

function startNewItem() {
  state.editingId = null;
  state.productType = "shirt";
  resetItemFields();
  updateProductVisibility();
  setStep("product");
  render();
}

function resetItemFields() {
  document.querySelectorAll("#stepProduct input, #stepProcessing input, #stepPricing input").forEach((el) => {
    if (el.type === "checkbox") el.checked = false;
    else el.value = el.defaultValue || "";
  });
  document.querySelectorAll("#stepProduct select, #stepProcessing select, #stepPricing select").forEach((el) => {
    el.selectedIndex = 0;
  });
}

function calculateQuote() {
  const currentItem = getCurrentItem();
  const committedItems = state.items.map((item) => (item.id === currentItem.id ? currentItem : item));
  const hasCurrent = currentItem.product.qty > 0 && !committedItems.some((item) => item.id === currentItem.id);
  const itemsForPreview = hasCurrent ? [...committedItems, currentItem] : committedItems;
  const subtotal = itemsForPreview.reduce((sum, item) => sum + item.subtotal, 0);
  const costTotal = itemsForPreview.reduce((sum, item) => sum + item.costTotal, 0);
  const company = companies[state.company] || companies.deshui;
  const tax = company.taxType === "invoice" ? subtotal * 0.05 : 0;
  return {
    id: makeId(),
    createdAt: new Date().toISOString(),
    customerName: textValue("customerName"),
    contactName: textValue("contactName"),
    customerPhone: textValue("customerPhone"),
    taxId: textValue("taxId"),
    channel: textValue("channel"),
    address: textValue("address"),
    quoteDate: $("quoteDate").value,
    validUntil: $("validUntil").value,
    note: textValue("quoteNote"),
    companyKey: state.company,
    companyName: company.name,
    docType: company.docType,
    taxType: company.taxType,
    currentItem,
    items: itemsForPreview,
    subtotal,
    costTotal,
    tax,
    grandTotal: subtotal + tax,
    totalProfit: subtotal - costTotal,
    form: captureQuoteForm()
  };
}

function captureQuoteForm() {
  const values = {};
  document.querySelectorAll("#stepCustomer input, #stepQuote input, #stepQuote textarea").forEach((el) => {
    if (el.id) values[el.id] = el.value;
  });
  return { company: state.company, values };
}

function render() {
  updateProductVisibility();
  const quote = calculateQuote();
  renderPartSummaries(quote.currentItem);
  renderQuoteSheet(quote);
  $("unitCost").textContent = money(quote.currentItem.unitCost);
  $("unitPrice").textContent = money(quote.currentItem.unitPrice);
  $("grandTotal").textContent = money(quote.grandTotal);
  $("totalProfit").textContent = money(quote.totalProfit);
  $("quoteStatus").textContent = quote.items.length ? `${quote.items.length} 項` : "草稿";
  $("quotePreview").innerHTML = buildPreview(quote);
  renderItemList(quote);
}

function renderQuoteSheet(quote) {
  $("quoteSheetMeta").innerHTML = `
    <div>出單公司：${escapeHtml(quote.companyName || "")}</div>
    <div>單據類型：${escapeHtml(quote.docType || "")}</div>
    <div>報價日期：${escapeHtml(quote.quoteDate || "未設定")}</div>
    <div>有效期限：${escapeHtml(quote.validUntil || "未設定")}</div>
    <div>稅別：${quote.taxType === "invoice" ? "含 5% 營業稅" : "未稅 / 收據"}</div>
  `;

  $("quoteCustomerBlock").innerHTML = [
    ["客戶名稱", quote.customerName || "未填"],
    ["聯絡人", quote.contactName || "未填"],
    ["電話", quote.customerPhone || "未填"],
    ["統一編號", quote.taxId || "未填"],
    ["聯絡管道", quote.channel || "未填"],
    ["地址", quote.address || "未填"]
  ]
    .map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`)
    .join("");

  const rows = quote.items.length ? quote.items : [quote.currentItem];
  $("quoteTableBody").innerHTML = rows
    .map(
      (item) => `
        <tr>
          <td>
            <strong>${escapeHtml(item.product.name)}</strong>
            <small>${escapeHtml(item.product.type)}${state.items.length ? "" : "（目前編輯，尚未加入品項清單）"}</small>
          </td>
          <td>${escapeHtml(item.product.spec)}</td>
          <td class="num">${item.product.qty || 0}</td>
          <td class="num">${money(item.unitPrice)}</td>
          <td class="num">${money(item.subtotal)}</td>
        </tr>
      `
    )
    .join("");

  $("quoteTotalBox").innerHTML = `
    <div class="quote-total-line"><span>品項小計</span><strong>${money(quote.subtotal)}</strong></div>
    <div class="quote-total-line"><span>${quote.taxType === "invoice" ? "營業稅 5%" : "營業稅"}</span><strong>${money(quote.tax)}</strong></div>
    <div class="quote-total-line grand"><span>報價總額</span><strong>${money(quote.grandTotal)}</strong></div>
    <div class="quote-total-line"><span>稅別</span><strong>${quote.taxType === "invoice" ? "含稅" : "未稅"}</strong></div>
  `;
}

function renderPartSummaries(item) {
  ["front", "back", "arm"].forEach((prefix) => {
    const position = item.processing.positions?.find((entry) => {
      if (prefix === "front") return entry.label.startsWith("正面");
      if (prefix === "back") return entry.label.startsWith("背面");
      return entry.label.includes("手臂") || entry.label.includes("雙臂");
    });
    const totalEl = $(`${prefix}Subtotal`);
    const summaryEl = $(`${prefix}Summary`);
    if (!totalEl || !summaryEl) return;
    if (state.productType !== "shirt" || !$(`${prefix}Enabled`)?.checked || !position) {
      totalEl.textContent = "NT$ 0 / 件";
      summaryEl.innerHTML = `<div class="summary-line"><span>未啟用</span><strong>NT$ 0</strong></div>`;
      return;
    }
    totalEl.textContent = `${money(position.unit)} / 件`;
    summaryEl.innerHTML = [
      summaryLine("印刷方式", position.methodLabel),
      summaryLine("計算式", position.formula),
      position.multiplier > 1 ? summaryLine("倍數", `x ${position.multiplier}`) : "",
      summaryLine("每件加工成本", money(position.unit), "total")
    ].join("");
  });

  const addonsTarget = $(`${state.productType}AddonsSummary`);
  if (addonsTarget) {
    addonsTarget.innerHTML = [
    ...item.addOns.details.filter((row) => row[1] > 0).map(([label, value]) => summaryLine(label, money(value))),
    summaryLine("附加費用合計 / 件", money(item.addOns.totalUnit), "total")
    ].join("");
  }

  const productBase = item.product.unitBase + item.product.extraUnit;
  $("pricingSummary").innerHTML = [
    summaryLine("商品基礎成本 / 件", money(productBase)),
    summaryLine("衣服加工 / 件", money(item.processing.unit)),
    summaryLine("標籤、包裝、運費 / 件", money(item.addOns.totalUnit)),
    summaryLine("單件總成本", money(item.unitCost), "total"),
    summaryLine("單件利潤", money(item.pricing.profitUnit)),
    summaryLine("建議售價", money(item.unitPrice), "total")
  ].join("");
}

function summaryLine(label, value, className = "") {
  return `<div class="summary-line ${className}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function renderItemList(quote) {
  $("itemCount").textContent = `${state.items.length} 項`;
  $("quoteItems").innerHTML =
    state.items
      .map(
        (item) => `
        <article class="quote-item ${item.id === state.editingId ? "active" : ""}" data-id="${item.id}">
          <div>
            <strong>${escapeHtml(item.product.name)}</strong>
            <p>${escapeHtml(item.product.spec)} · ${item.product.qty} 件 · ${money(item.subtotal)}</p>
          </div>
          <div class="quote-item-actions">
            <button type="button" data-action="edit">編輯</button>
            <button type="button" data-action="delete">刪除</button>
          </div>
        </article>
      `
      )
      .join("") || `<div class="empty-inline">尚未加入品項。右側預覽會先顯示目前正在編輯的品項。</div>`;
}

function buildPreview(quote) {
  const rows = quote.items
    .map(
      (item) => `
      <div class="preview-row">
        <span>${escapeHtml(item.product.name)}<small>${escapeHtml(item.product.spec)}</small></span>
        <strong>${money(item.unitPrice)} x ${item.product.qty}</strong>
      </div>
    `
    )
    .join("");

  const currentDetails = [
    ...quote.currentItem.product.details,
    ...quote.currentItem.processing.details,
    ...quote.currentItem.addOns.details
  ]
    .filter((row) => row[1] > 0)
    .map(([label, value]) => `<div class="detail-row"><span>${escapeHtml(label)}</span><strong>${money(value)}</strong></div>`)
    .join("");

  return `
    <div class="preview-head">
      <div>
        <h4>報價單</h4>
        <p class="preview-meta">${escapeHtml(quote.companyName || "")} · ${escapeHtml(quote.docType || "")} · ${escapeHtml(quote.quoteDate || "")}</p>
      </div>
      <strong>${escapeHtml(quote.customerName || "未填客戶")}</strong>
    </div>
    <div class="preview-body">
      ${rows || `<div class="preview-row"><span>${escapeHtml(quote.currentItem.product.name)}<small>目前編輯，尚未加入清單</small></span><strong>${money(quote.currentItem.unitPrice)} x ${quote.currentItem.product.qty || 0}</strong></div>`}
      <div class="detail-box">
        <strong>目前品項成本明細</strong>
        ${currentDetails || '<div class="detail-row"><span>尚無費用明細</span><strong>NT$ 0</strong></div>'}
      </div>
      <div class="total-row"><span>小計</span><strong>${money(quote.subtotal)}</strong></div>
      <div class="total-row"><span>營業稅</span><strong>${money(quote.tax)}</strong></div>
      <div class="total-row grand"><span>報價總額</span><strong>${money(quote.grandTotal)}</strong></div>
      <div class="total-row"><span>有效期限</span><strong>${escapeHtml(quote.validUntil || "未設定")}</strong></div>
    </div>
  `;
}

function saveCurrentQuote() {
  const quote = calculateQuote();
  if (!quote.customerName) {
    showToast("請先填客戶名稱");
    setStep("customer");
    return;
  }
  if (!state.items.length) {
    showToast("請先把目前品項加入報價清單");
    setStep("product");
    return;
  }
  const history = getHistory();
  history.unshift({ ...quote, id: makeId(), items: state.items });
  localStorage.setItem("mw_quote_history_v3", JSON.stringify(history.slice(0, 100)));
  showToast("已儲存到歷史報價");
}

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem("mw_quote_history_v3") || "[]");
  } catch {
    return [];
  }
}

function renderHistory() {
  const keyword = textValue("historySearch").toLowerCase();
  const items = getHistory().filter((quote) => `${quote.customerName} ${quote.items?.map((item) => item.product.name).join(" ")}`.toLowerCase().includes(keyword));
  $("historyList").innerHTML =
    items
      .map(
        (quote) => `
        <article class="history-card" data-id="${quote.id}">
          <div>
            <h4>${escapeHtml(quote.customerName || "未命名客戶")}</h4>
            <p>${quote.items?.length || 0} 項 · ${money(quote.grandTotal)}</p>
            <p>${new Date(quote.createdAt).toLocaleString("zh-TW")} · ${escapeHtml(quote.companyName || "")} · ${escapeHtml(quote.docType || (quote.taxType === "invoice" ? "發票" : "收據"))}</p>
          </div>
          <div class="history-actions">
            <button class="secondary-button" type="button" data-action="load">載入</button>
            <button class="danger-button" type="button" data-action="delete">刪除</button>
          </div>
        </article>
      `
      )
      .join("") || '<article class="history-card"><p>尚無符合的歷史報價。</p></article>';
}

function handleHistoryAction(event) {
  const button = event.target.closest("[data-action]");
  const card = event.target.closest("[data-id]");
  if (!button || !card) return;
  const history = getHistory();
  const quote = history.find((item) => item.id === card.dataset.id);
  if (button.dataset.action === "delete") {
    localStorage.setItem("mw_quote_history_v3", JSON.stringify(history.filter((item) => item.id !== card.dataset.id)));
    renderHistory();
    return;
  }
  if (quote) loadQuote(quote);
}

function loadQuote(quote) {
  Object.entries(quote.form?.values || {}).forEach(([id, value]) => {
    if ($(id)) $(id).value = value;
  });
  state.company = quote.form?.company || quote.companyKey || (quote.taxType === "invoice" ? "deshui" : "chimei");
  document.querySelectorAll("[data-company]").forEach((button) => button.classList.toggle("active", button.dataset.company === state.company));
  state.items = quote.items || [];
  state.editingId = null;
  setView("workspace");
  render();
  showToast("已載入歷史報價");
}

function resetAll() {
  state.items = [];
  state.editingId = null;
  state.productType = "shirt";
  state.company = "deshui";
  document.querySelectorAll("input, textarea").forEach((el) => {
    if (el.type === "date") return;
    if (el.type === "checkbox") el.checked = false;
    else el.value = el.defaultValue || "";
  });
  document.querySelectorAll("select").forEach((el) => (el.selectedIndex = 0));
  setDefaultDates();
  document.querySelectorAll("[data-company]").forEach((button) => button.classList.toggle("active", button.dataset.company === state.company));
  setStep("customer");
  render();
}

function openMailDraft() {
  const quote = calculateQuote();
  const lines = quote.items.map((item) => `${item.product.name} ${item.product.qty} 件，單價 ${money(item.unitPrice)}，小計 ${money(item.subtotal)}`);
  window.location.href = `mailto:?subject=${encodeURIComponent(`報價單 - ${quote.customerName || ""}`)}&body=${encodeURIComponent(lines.join("\n") + `\n\n總額：${money(quote.grandTotal)}`)}`;
}

function renderPricing() {
  $("shirtPricing").innerHTML = Object.values(shirtPricing)
    .filter((item) => item.name !== "其他，自填成本")
    .map((item) => `<div class="pricing-row"><span>${item.name}</span><strong>白 ${item.white} / 彩 ${item.color}</strong></div>`)
    .join("");
  $("towelPricing").innerHTML = Object.values(towelPricing)
    .map((item) => `<div class="pricing-row"><span>${item.name}</span><strong>白 ${item.white} / 彩 ${item.color}</strong></div>`)
    .join("");
}

function makeId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2200);
}

init();
