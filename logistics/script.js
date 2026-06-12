const STORAGE_KEY = "makeworld.logistics.cases.v1";
const SYNC_API_URL = "https://script.google.com/macros/s/AKfycbzf8wAMKhFjdaG6C1_RsMWKZi9CFcQsoGKZhAhWpZJFzwz4GxkGsgxbzAEKji4JAr5Y/exec";
const SYNC_SECRET = "mw_sync_6jQ8pV3xL2rT9sD4";
const CLOUD_TYPE = "logistics";
const RECORD_TYPE = "logistics";

const stateLabels = {
  pending: "待處理",
  processing: "處理中",
  done: "完成"
};

let cases = loadCases();
let activeFilter = "active";
let activeSearch = "";

const form = document.querySelector("#caseForm");
const saveStatus = document.querySelector("#saveStatus");
const syncStatus = document.querySelector("#syncStatus");

document.querySelectorAll(".mode-tab").forEach((button) => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});

document.querySelector("#casePurpose").addEventListener("change", updateConditionalFields);
document.querySelector("#caseMethod").addEventListener("change", updateConditionalFields);
document.querySelector("#clearButton").addEventListener("click", clearForm);
document.querySelector("#printListButton")?.addEventListener("click", () => window.print());
document.querySelector("#caseSearch")?.addEventListener("input", (event) => {
  activeSearch = event.target.value.trim().toLowerCase();
  renderCases();
});

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
loadCloudCases();

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

function normalizeCase(item) {
  return {
    id: String(item?.id || Date.now()),
    recordType: RECORD_TYPE,
    createdAt: item?.createdAt || item?.updatedAt || new Date().toISOString(),
    updatedAt: item?.updatedAt || item?.syncUpdatedAt || item?.createdAt || new Date().toISOString(),
    reference: item?.reference || "",
    source: item?.source || "",
    sourceName: item?.sourceName || "",
    purpose: item?.purpose || "超商退件",
    purposeOther: item?.purposeOther || "",
    method: item?.method || "原超商重新寄出",
    storeName: item?.storeName || "",
    storeCode: item?.storeCode || "",
    recipientName: item?.recipientName || "",
    recipientPhone: item?.recipientPhone || "",
    recipientAddress: item?.recipientAddress || "",
    note: item?.note || "",
    status: item?.status || "pending",
    syncUpdatedAt: item?.syncUpdatedAt || item?.updatedAt || new Date().toISOString()
  };
}

function mergeCases(localRows, cloudRows) {
  const byId = new Map();
  [...localRows, ...cloudRows].forEach((row) => {
    if (!row || row.recordType !== RECORD_TYPE) return;
    const id = String(row.id || "");
    if (!id) return;
    if (row._deleted) {
      byId.delete(id);
      return;
    }
    const next = normalizeCase(row);
    const prev = byId.get(id);
    if (!prev || new Date(next.syncUpdatedAt || next.updatedAt) >= new Date(prev.syncUpdatedAt || prev.updatedAt)) {
      byId.set(id, next);
    }
  });
  return Array.from(byId.values()).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

function cloudRecord(item) {
  if (item?._deleted) {
    return {
      id: String(item.id || ""),
      recordType: RECORD_TYPE,
      _deleted: true,
      syncUpdatedAt: item.syncUpdatedAt || new Date().toISOString()
    };
  }
  return {
    ...normalizeCase(item),
    recordType: RECORD_TYPE,
    syncUpdatedAt: new Date().toISOString()
  };
}

async function loadCloudCases() {
  setSyncStatus("雲端同步中", "syncing");
  try {
    const res = await fetch(`${SYNC_API_URL}?type=${encodeURIComponent(CLOUD_TYPE)}&secret=${encodeURIComponent(SYNC_SECRET)}`);
    const json = await res.json();
    if (!json.ok || !Array.isArray(json.data)) throw new Error(json.error || "sync failed");
    cases = mergeCases(cases.map(normalizeCase), json.data);
    persist();
    renderCases();
    setSyncStatus("雲端已同步", "ok");
  } catch (error) {
    console.warn("cloud logistics read failed", error);
    setSyncStatus("雲端同步失敗", "error");
  }
}

async function syncCloudCase(item) {
  const payload = { secret: SYNC_SECRET, type: CLOUD_TYPE, record: cloudRecord(item) };
  setSyncStatus("雲端同步中", "syncing");
  try {
    await fetch(SYNC_API_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: `payload=${encodeURIComponent(JSON.stringify(payload))}`
    });
    setSyncStatus("雲端已同步", "ok");
  } catch (error) {
    console.warn("cloud logistics write failed", error);
    setSyncStatus("雲端同步失敗", "error");
  }
}

function setSyncStatus(text, state = "") {
  if (!syncStatus) return;
  syncStatus.textContent = text;
  syncStatus.dataset.state = state;
}

function switchView(view) {
  if (!document.querySelector(".mode-tab")) {
    if (view === "list") renderCases();
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
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
    recordType: RECORD_TYPE,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    reference: existing?.reference || fieldValue("#caseReference"),
    source: fieldValue("#caseSource"),
    sourceName: fieldValue("#caseSourceName"),
    purpose: fieldValue("#casePurpose"),
    purposeOther: fieldValue("#casePurposeOther"),
    method: fieldValue("#caseMethod"),
    storeName: fieldValue("#storeName"),
    storeCode: fieldValue("#storeCode"),
    recipientName: fieldValue("#recipientName"),
    recipientPhone: fieldValue("#recipientPhone"),
    recipientAddress: fieldValue("#recipientAddress"),
    note: fieldValue("#caseNote"),
    status: fieldValue("#caseStatus") || "pending",
    syncUpdatedAt: now
  };

  cases = [record, ...cases.filter((item) => item.id !== id)]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  persist();
  syncCloudCase(record).then(refreshCloudSoon);
  clearForm();
  renderCases();
  saveStatus.textContent = "已儲存案件";
  setTimeout(() => {
    saveStatus.textContent = "";
  }, 2200);
  switchView("list");
}

function fieldValue(selector) {
  return document.querySelector(selector)?.value.trim() || "";
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
    const statusMatch =
      activeFilter === "all" ||
      (activeFilter === "active" && item.status !== "done") ||
      item.status === activeFilter;
    if (!statusMatch) return false;
    if (!activeSearch) return true;
    return [
      item.source,
      item.sourceName,
      item.purpose,
      item.purposeOther,
      item.method,
      item.storeName,
      item.storeCode,
      item.recipientName,
      item.recipientPhone,
      item.recipientAddress,
      item.note
    ]
      .join(" ")
      .toLowerCase()
      .includes(activeSearch);
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
  target.innerHTML = `
    <div class="case-table-card">
      <table class="case-table">
        <thead>
          <tr>
            <th>狀態</th>
            <th>日期</th>
            <th>來源</th>
            <th>名字</th>
            <th>目的</th>
            <th>處理方式</th>
            <th>寄送資訊</th>
            <th>備註</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>${list.map(caseRow).join("")}</tbody>
      </table>
    </div>
  `;
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
  const customer = caseDisplayTitle(item);
  return `
    <article class="case-card status-${escapeHtml(item.status)}">
      <div class="case-head">
        <div>
          <div class="case-meta-row">
            <span class="case-state">${escapeHtml(stateLabels[item.status] || item.status)}</span>
            <span>${escapeHtml(formatDateTime(item.updatedAt))}</span>
          </div>
          <div class="case-title">${escapeHtml(customer)}</div>
          ${sourceLabel(item) ? `<div class="case-source">${escapeHtml(sourceLabel(item))}</div>` : ""}
        </div>
        <select class="case-status" onchange="setCaseStatus('${escapeAttr(item.id)}', this.value)">
          ${Object.entries(stateLabels).map(([value, label]) => `<option value="${value}" ${item.status === value ? "selected" : ""}>${label}</option>`).join("")}
        </select>
      </div>
      <div class="case-body">
        <div class="case-line">
          <span>目的</span>
          <strong>${escapeHtml(purpose)}</strong>
        </div>
        <div class="case-line">
          <span>處理</span>
          <strong>${escapeHtml(item.method)}</strong>
        </div>
        <div class="case-detail">${escapeHtml(methodDetails(item))}</div>
        ${item.note ? `<div class="case-note">${escapeHtml(item.note)}</div>` : ""}
      </div>
      <div class="case-actions">
        <button class="card-btn print" type="button" onclick="printCase('${escapeAttr(item.id)}')">列印</button>
        <button class="card-btn danger" type="button" onclick="deleteCase('${escapeAttr(item.id)}')">刪除</button>
        <button class="card-btn" type="button" onclick="editCase('${escapeAttr(item.id)}')">編輯</button>
      </div>
    </article>
  `;
}

function caseRow(item) {
  const purpose = item.purpose === "其他" && item.purposeOther ? `其他：${item.purposeOther}` : item.purpose;
  const delivery = methodDetails(item)
    .replaceAll("店名：", "")
    .replaceAll("店號：", "")
    .replaceAll("姓名：", "")
    .replaceAll("電話：", "")
    .replaceAll("地址：", "")
    .replaceAll("\n", " / ");
  return `
    <tr class="case-row status-${escapeHtml(item.status)}">
      <td data-label="狀態">
        <select class="case-status compact-status" onchange="setCaseStatus('${escapeAttr(item.id)}', this.value)">
          ${Object.entries(stateLabels).map(([value, label]) => `<option value="${value}" ${item.status === value ? "selected" : ""}>${label}</option>`).join("")}
        </select>
      </td>
      <td data-label="日期" class="mono">${escapeHtml(formatShortDate(item.updatedAt))}</td>
      <td data-label="來源">${escapeHtml(item.source || "—")}</td>
      <td data-label="名字"><strong>${escapeHtml(caseDisplayTitle(item))}</strong></td>
      <td data-label="目的">${escapeHtml(purpose || "—")}</td>
      <td data-label="處理方式">${escapeHtml(item.method || "—")}</td>
      <td data-label="寄送資訊" class="muted-cell">${escapeHtml(delivery || "—")}</td>
      <td data-label="備註" class="note-cell">${escapeHtml(item.note || "—")}</td>
      <td data-label="操作" class="action-cell">
        <button class="card-btn print" type="button" onclick="printCase('${escapeAttr(item.id)}')">列印</button>
        <button class="card-btn" type="button" onclick="editCase('${escapeAttr(item.id)}')">編輯</button>
        <button class="card-btn danger" type="button" onclick="deleteCase('${escapeAttr(item.id)}')">刪除</button>
      </td>
    </tr>
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
  let changed = null;
  cases = cases.map((item) => {
    if (item.id !== id) return item;
    changed = { ...item, status, updatedAt: new Date().toISOString(), syncUpdatedAt: new Date().toISOString() };
    return changed;
  });
  persist();
  if (changed) syncCloudCase(changed).then(refreshCloudSoon);
  renderCases();
}

function printCase(id) {
  const item = cases.find((record) => record.id === id);
  if (!item) return;
  const printTarget = document.querySelector("#printWorkorder");
  const originalTitle = document.title;
  printTarget.innerHTML = buildPrintWorkorder(item);
  document.title = `物流處理工作單-${safeFileName(item.reference || item.id)}`;
  document.body.classList.add("is-printing-logistics");
  requestAnimationFrame(() => {
    window.print();
    window.setTimeout(() => {
      document.body.classList.remove("is-printing-logistics");
      printTarget.innerHTML = "";
      document.title = originalTitle;
    }, 500);
  });
}

function buildPrintWorkorder(item) {
  const purpose = item.purpose === "其他" && item.purposeOther ? `其他：${item.purposeOther}` : item.purpose;
  const details = methodDetails(item)
    .split("\n")
    .filter(Boolean)
    .map((line) => `<li>${escapeHtml(line)}</li>`)
    .join("");
  return `
    <section class="workorder-sheet">
      <header class="workorder-head">
        <div>
          <p>MAKEWORLD</p>
          <h1>物流處理工作單</h1>
        </div>
        <div class="workorder-status">${escapeHtml(stateLabels[item.status] || item.status)}</div>
      </header>

      <div class="workorder-meta">
        <div><span>列印時間</span><strong>${escapeHtml(formatDateTime(new Date().toISOString()))}</strong></div>
        <div><span>建立時間</span><strong>${escapeHtml(formatDateTime(item.createdAt))}</strong></div>
        <div><span>更新時間</span><strong>${escapeHtml(formatDateTime(item.updatedAt))}</strong></div>
      </div>

      <div class="workorder-reference">
        <span>案件對象</span>
        <strong>${escapeHtml(caseDisplayTitle(item))}</strong>
      </div>

      <div class="workorder-source">
        <span>客戶來源</span>
        <strong>${escapeHtml(sourceLabel(item) || "未填")}</strong>
      </div>

      <div class="workorder-grid">
        <section>
          <h2>目的</h2>
          <p class="workorder-main">${escapeHtml(purpose || "未填")}</p>
        </section>
        <section>
          <h2>處理方式</h2>
          <p class="workorder-main">${escapeHtml(item.method || "未填")}</p>
          <ul>${details}</ul>
        </section>
      </div>

      <section class="workorder-note">
        <h2>備註</h2>
        <p>${escapeHtml(item.note || "無")}</p>
      </section>

      <footer class="workorder-footer">
        <div><span>處理人員</span><b></b></div>
        <div><span>完成確認</span><b></b></div>
      </footer>
    </section>
  `;
}

function editCase(id) {
  const item = cases.find((record) => record.id === id);
  if (!item) return;
  document.querySelector("#caseId").value = item.id;
  document.querySelector("#caseReference").value = item.reference || "";
  document.querySelector("#caseSource").value = ["官網", "FB", "LINE@", "threads", "電話", "布碼科技", "其他"].includes(item.source) ? item.source : "其他";
  document.querySelector("#caseSourceName").value = item.sourceName || "";
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
  const tombstone = { id, recordType: RECORD_TYPE, _deleted: true, syncUpdatedAt: new Date().toISOString() };
  cases = cases.filter((item) => item.id !== id);
  persist();
  syncCloudCase(tombstone).then(refreshCloudSoon);
  renderCases();
}

function refreshCloudSoon() {
  window.setTimeout(loadCloudCases, 1200);
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatShortDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function sourceLabel(item) {
  return [item.source, item.sourceName].filter(Boolean).join(" / ");
}

function caseDisplayTitle(item) {
  return item.sourceName || item.reference || "未填名字 / 帳號";
}

function safeFileName(value) {
  return String(value || "未填案件").replace(/[\\/:*?"<>|]/g, "").trim() || "未填案件";
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
