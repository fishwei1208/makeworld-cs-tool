const STORAGE_KEY = "makeworld.logistics.cases.v1";

const stateLabels = {
  pending: "待處理",
  processing: "處理中",
  done: "完成"
};

let cases = loadCases();
let activeFilter = "active";

const form = document.querySelector("#caseForm");
const saveStatus = document.querySelector("#saveStatus");

document.querySelectorAll(".mode-tab").forEach((button) => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});

document.querySelector("#casePurpose").addEventListener("change", updateConditionalFields);
document.querySelector("#caseMethod").addEventListener("change", updateConditionalFields);
document.querySelector("#clearButton").addEventListener("click", clearForm);

document.querySelector("#filterBar").addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  activeFilter = button.dataset.filter;
  document.querySelectorAll(".filter-btn").forEach((item) => item.classList.toggle("active", item === button));
  renderCases();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  saveCase();
});

updateConditionalFields();
renderCases();

function loadCases() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
}

function switchView(view) {
  document.querySelectorAll(".mode-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  document.querySelectorAll(".view").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `${view}View`);
  });
  if (view === "list") renderCases();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateConditionalFields() {
  const purpose = document.querySelector("#casePurpose").value;
  const method = document.querySelector("#caseMethod").value;
  document.querySelector("#purposeOtherWrap").classList.toggle("show", purpose === "其他");
  document.querySelector("#storeWrap").classList.toggle("show", method === "新超商重新寄出");
  document.querySelector("#deliveryWrap").classList.toggle("show", ["宅配", "取件收回"].includes(method));
}

function saveCase() {
  const id = document.querySelector("#caseId").value || String(Date.now());
  const existing = cases.find((item) => item.id === id);
  const now = new Date().toISOString();
  const record = {
    id,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    reference: fieldValue("#caseReference"),
    purpose: fieldValue("#casePurpose"),
    purposeOther: fieldValue("#casePurposeOther"),
    method: fieldValue("#caseMethod"),
    storeName: fieldValue("#storeName"),
    storeCode: fieldValue("#storeCode"),
    recipientName: fieldValue("#recipientName"),
    recipientPhone: fieldValue("#recipientPhone"),
    recipientAddress: fieldValue("#recipientAddress"),
    note: fieldValue("#caseNote"),
    status: fieldValue("#caseStatus") || "pending"
  };

  cases = [record, ...cases.filter((item) => item.id !== id)]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  persist();
  clearForm();
  renderCases();
  saveStatus.textContent = "已儲存案件";
  setTimeout(() => {
    saveStatus.textContent = "";
  }, 2200);
  switchView("list");
}

function fieldValue(selector) {
  return document.querySelector(selector).value.trim();
}

function clearForm() {
  form.reset();
  document.querySelector("#caseId").value = "";
  document.querySelector("#caseStatus").value = "pending";
  updateConditionalFields();
  document.querySelector(".primary-btn").textContent = "儲存案件";
}

function filteredCases() {
  return cases.filter((item) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "active") return item.status !== "done";
    return item.status === activeFilter;
  });
}

function renderCases() {
  renderSummary();
  const list = filteredCases();
  const target = document.querySelector("#caseList");
  if (!list.length) {
    target.innerHTML = `<div class="empty">目前沒有符合條件的物流案件</div>`;
    return;
  }
  target.innerHTML = list.map(caseCard).join("");
}

function renderSummary() {
  const counts = {
    pending: cases.filter((item) => item.status === "pending").length,
    processing: cases.filter((item) => item.status === "processing").length,
    done: cases.filter((item) => item.status === "done").length
  };
  document.querySelector("#summaryGrid").innerHTML = `
    <div class="summary-card"><span>待處理</span><strong>${counts.pending}</strong></div>
    <div class="summary-card"><span>處理中</span><strong>${counts.processing}</strong></div>
    <div class="summary-card"><span>完成</span><strong>${counts.done}</strong></div>
  `;
}

function caseCard(item) {
  const purpose = item.purpose === "其他" && item.purposeOther ? `其他：${item.purposeOther}` : item.purpose;
  return `
    <article class="case-card status-${escapeHtml(item.status)}">
      <div class="case-head">
        <div>
          <div class="case-date">${escapeHtml(formatDateTime(item.updatedAt))}</div>
          <div class="case-title">${escapeHtml(item.reference || "未填訂單 / 聯絡資訊")}</div>
        </div>
        <select class="case-status" onchange="setCaseStatus('${escapeAttr(item.id)}', this.value)">
          ${Object.entries(stateLabels).map(([value, label]) => `<option value="${value}" ${item.status === value ? "selected" : ""}>${label}</option>`).join("")}
        </select>
      </div>
      <div class="case-body">
        <div class="case-section">
          <span>目的</span>
          <strong>${escapeHtml(purpose)}</strong>
          ${item.note ? `<p>${escapeHtml(item.note)}</p>` : ""}
        </div>
        <div class="case-section">
          <span>處理方式</span>
          <strong>${escapeHtml(item.method)}</strong>
          <p>${escapeHtml(methodDetails(item))}</p>
        </div>
      </div>
      <div class="case-actions">
        <button class="card-btn danger" type="button" onclick="deleteCase('${escapeAttr(item.id)}')">刪除</button>
        <button class="card-btn" type="button" onclick="editCase('${escapeAttr(item.id)}')">編輯</button>
      </div>
    </article>
  `;
}

function methodDetails(item) {
  if (item.method === "新超商重新寄出") {
    return [`店名：${item.storeName || "未填"}`, `店號：${item.storeCode || "未填"}`].join("\n");
  }
  if (["宅配", "取件收回"].includes(item.method)) {
    return [
      `姓名：${item.recipientName || "未填"}`,
      `電話：${item.recipientPhone || "未填"}`,
      `地址：${item.recipientAddress || "未填"}`
    ].join("\n");
  }
  return "使用原超商資料重新寄出";
}

function setCaseStatus(id, status) {
  cases = cases.map((item) => item.id === id ? { ...item, status, updatedAt: new Date().toISOString() } : item);
  persist();
  renderCases();
}

function editCase(id) {
  const item = cases.find((record) => record.id === id);
  if (!item) return;
  document.querySelector("#caseId").value = item.id;
  document.querySelector("#caseReference").value = item.reference || "";
  document.querySelector("#casePurpose").value = item.purpose || "超商退件";
  document.querySelector("#casePurposeOther").value = item.purposeOther || "";
  document.querySelector("#caseMethod").value = item.method || "原超商重新寄出";
  document.querySelector("#storeName").value = item.storeName || "";
  document.querySelector("#storeCode").value = item.storeCode || "";
  document.querySelector("#recipientName").value = item.recipientName || "";
  document.querySelector("#recipientPhone").value = item.recipientPhone || "";
  document.querySelector("#recipientAddress").value = item.recipientAddress || "";
  document.querySelector("#caseNote").value = item.note || "";
  document.querySelector("#caseStatus").value = item.status || "pending";
  document.querySelector(".primary-btn").textContent = "更新案件";
  updateConditionalFields();
  switchView("form");
}

function deleteCase(id) {
  if (!confirm("確定刪除這筆物流案件？")) return;
  cases = cases.filter((item) => item.id !== id);
  persist();
  renderCases();
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}
