const STORAGE_KEY = "makeworld.tracking.notes.v1";
const SYNC_API_URL = "https://script.google.com/macros/s/AKfycbzf8wAMKhFjdaG6C1_RsMWKZi9CFcQsoGKZhAhWpZJFzwz4GxkGsgxbzAEKji4JAr5Y/exec";
const SYNC_SECRET = "mw_sync_6jQ8pV3xL2rT9sD4";
const CLOUD_TYPE = "notes";
const RECORD_TYPE = "notes";

const statusLabels = {
  todo: "待處理",
  working: "處理中",
  quote: "問報價中",
  production: "生產中",
  customer_wait: "客戶沒回應中",
  vendor_wait: "等廠商回覆",
  sample: "收樣品",
  paused: "暫停",
  done: "已完成"
};

const priorityLabels = {
  low: "低",
  normal: "一般",
  high: "重要",
  urgent: "急件"
};

let notes = loadNotes();
let activeFilter = "active";
let activeSearch = "";

const form = document.querySelector("#noteForm");
const saveStatus = document.querySelector("#saveStatus");
const syncStatus = document.querySelector("#syncStatus");

document.querySelectorAll(".mode-tab").forEach((button) => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});

document.querySelector("#clearButton").addEventListener("click", clearForm);
document.querySelector("#printListButton").addEventListener("click", () => window.print());
document.querySelector("#noteSearch")?.addEventListener("input", (event) => {
  activeSearch = event.target.value.trim().toLowerCase();
  renderNotes();
});

document.querySelector("#filterBar").addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  activeFilter = button.dataset.filter;
  document.querySelectorAll(".filter-btn").forEach((item) => item.classList.toggle("active", item === button));
  renderNotes();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  saveNote();
});

renderNotes();
loadCloudNotes();

function loadNotes() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function normalizeNote(item) {
  return {
    id: String(item?.id || Date.now()),
    recordType: RECORD_TYPE,
    createdAt: item?.createdAt || item?.updatedAt || new Date().toISOString(),
    updatedAt: item?.updatedAt || item?.syncUpdatedAt || item?.createdAt || new Date().toISOString(),
    title: item?.title || "",
    target: item?.target || "",
    work: item?.work || "",
    status: item?.status || "todo",
    due: item?.due || "",
    priority: item?.priority || "normal",
    memo: item?.memo || "",
    syncUpdatedAt: item?.syncUpdatedAt || item?.updatedAt || new Date().toISOString()
  };
}

function mergeNotes(localRows, cloudRows) {
  const byId = new Map();
  [...localRows, ...cloudRows].forEach((row) => {
    if (!row || row.recordType !== RECORD_TYPE) return;
    const id = String(row.id || "");
    if (!id) return;
    if (row._deleted) {
      byId.delete(id);
      return;
    }
    const next = normalizeNote(row);
    const prev = byId.get(id);
    if (!prev || new Date(next.syncUpdatedAt || next.updatedAt) >= new Date(prev.syncUpdatedAt || prev.updatedAt)) {
      byId.set(id, next);
    }
  });
  return Array.from(byId.values()).sort(sortNotes);
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
    ...normalizeNote(item),
    recordType: RECORD_TYPE,
    syncUpdatedAt: new Date().toISOString()
  };
}

async function loadCloudNotes() {
  setSyncStatus("雲端同步中", "syncing");
  try {
    const res = await fetch(`${SYNC_API_URL}?type=${encodeURIComponent(CLOUD_TYPE)}&secret=${encodeURIComponent(SYNC_SECRET)}`);
    const json = await res.json();
    if (!json.ok || !Array.isArray(json.data)) throw new Error(json.error || "sync failed");
    notes = mergeNotes(notes.map(normalizeNote), json.data);
    persist();
    renderNotes();
    setSyncStatus("雲端已同步", "ok");
  } catch (error) {
    console.warn("cloud notes read failed", error);
    setSyncStatus("雲端同步失敗", "error");
  }
}

async function syncCloudNote(item) {
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
    console.warn("cloud notes write failed", error);
    setSyncStatus("雲端同步失敗", "error");
  }
}

function setSyncStatus(text, state = "") {
  if (!syncStatus) return;
  syncStatus.textContent = text;
  syncStatus.dataset.state = state;
}

function switchView(view) {
  document.querySelectorAll(".mode-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  document.querySelectorAll(".view").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `${view}View`);
  });
  if (view === "list") renderNotes();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function saveNote() {
  const id = fieldValue("#noteId") || String(Date.now());
  const existing = notes.find((item) => item.id === id);
  const now = new Date().toISOString();
  const record = {
    id,
    recordType: RECORD_TYPE,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    title: fieldValue("#noteTitle"),
    target: fieldValue("#noteTarget"),
    work: fieldValue("#noteWork"),
    status: fieldValue("#noteStatus") || "todo",
    due: fieldValue("#noteDue"),
    priority: fieldValue("#notePriority") || "normal",
    memo: fieldValue("#noteMemo"),
    syncUpdatedAt: now
  };

  if (existing) {
    notes = notes.map((item) => (item.id === id ? record : item));
  } else {
    notes.unshift(record);
  }
  notes = notes.map(normalizeNote).sort(sortNotes);
  persist();
  renderNotes();
  syncCloudNote(record);
  showSaved(existing ? "已更新筆記" : "已儲存筆記");
  clearForm();
  switchView("list");
}

function fieldValue(selector) {
  return document.querySelector(selector)?.value.trim() || "";
}

function clearForm() {
  form.reset();
  document.querySelector("#noteId").value = "";
  document.querySelector("#noteStatus").value = "todo";
  document.querySelector("#notePriority").value = "normal";
  document.querySelector(".primary-btn").textContent = "儲存筆記";
}

function showSaved(text) {
  saveStatus.textContent = text;
  saveStatus.dataset.state = "saved";
  setTimeout(() => {
    saveStatus.textContent = "";
  }, 2400);
}

function sortNotes(a, b) {
  const doneA = a.status === "done" ? 1 : 0;
  const doneB = b.status === "done" ? 1 : 0;
  if (doneA !== doneB) return doneA - doneB;
  const dueA = a.due ? new Date(`${a.due}T00:00:00`).getTime() : Infinity;
  const dueB = b.due ? new Date(`${b.due}T00:00:00`).getTime() : Infinity;
  if (dueA !== dueB) return dueA - dueB;
  return new Date(b.updatedAt) - new Date(a.updatedAt);
}

function renderNotes() {
  renderSummary();
  const target = document.querySelector("#noteList");
  const rows = notes.filter(matchesFilter).sort(sortNotes);
  if (!rows.length) {
    target.innerHTML = `<div class="empty">目前沒有符合條件的追蹤筆記</div>`;
    return;
  }
  target.innerHTML = rows.map(noteCard).join("");
}

function renderSummary() {
  const active = notes.filter((item) => item.status !== "done").length;
  const waiting = notes.filter((item) => ["customer_wait", "vendor_wait", "quote", "sample"].includes(item.status)).length;
  const soon = notes.filter((item) => item.status !== "done" && isDueSoon(item.due)).length;
  const done = notes.filter((item) => item.status === "done").length;
  document.querySelector("#summaryGrid").innerHTML = [
    ["未完成", active],
    ["等回覆 / 追蹤", waiting],
    ["即將到期", soon],
    ["已完成", done]
  ]
    .map(([label, value]) => `<div class="summary-card"><span>${escapeHtml(label)}</span><strong>${value}</strong></div>`)
    .join("");
}

function matchesFilter(item) {
  const statusMatch =
    activeFilter === "all" ||
    (activeFilter === "active" && item.status !== "done") ||
    (activeFilter === "waiting" && ["customer_wait", "vendor_wait", "quote", "sample"].includes(item.status)) ||
    (activeFilter === "soon" && item.status !== "done" && isDueSoon(item.due)) ||
    item.status === activeFilter;
  if (!statusMatch) return false;
  if (!activeSearch) return true;
  return [item.title, item.target, item.work, item.memo, statusLabels[item.status], priorityLabels[item.priority]]
    .join(" ")
    .toLowerCase()
    .includes(activeSearch);
}

function noteCard(item) {
  const dueInfo = dueLabel(item.due);
  return `
    <article class="note-card">
      <div class="note-head">
        <div>
          <div class="note-meta">
            <span class="status-pill">${escapeHtml(statusLabels[item.status] || item.status)}</span>
            <span class="priority-pill priority-${escapeHtml(item.priority)}">${escapeHtml(priorityLabels[item.priority] || item.priority)}</span>
            <span class="due-pill ${escapeHtml(dueInfo.className)}">${escapeHtml(dueInfo.text)}</span>
            <span>更新 ${escapeHtml(formatDateTime(item.updatedAt))}</span>
          </div>
          <div class="note-title">${escapeHtml(item.title || "未填案件內容")}</div>
          <div class="note-target">${escapeHtml(item.target || "未填對象")}</div>
        </div>
        <select class="note-status" onchange="setNoteStatus('${escapeAttr(item.id)}', this.value)">
          ${Object.entries(statusLabels).map(([value, label]) => `<option value="${value}" ${item.status === value ? "selected" : ""}>${label}</option>`).join("")}
        </select>
      </div>
      <div class="note-body">
        <div class="note-section">
          <span>工作內容</span>
          <p>${escapeHtml(item.work || "—")}</p>
        </div>
        ${item.memo ? `<div class="note-section"><span>備註</span><p>${escapeHtml(item.memo)}</p></div>` : ""}
      </div>
      <div class="note-actions">
        <button class="card-btn edit" type="button" onclick="editNote('${escapeAttr(item.id)}')">編輯</button>
        <button class="card-btn done" type="button" onclick="setNoteStatus('${escapeAttr(item.id)}','done')">完成</button>
        <button class="card-btn delete" type="button" onclick="deleteNote('${escapeAttr(item.id)}')">刪除</button>
      </div>
    </article>
  `;
}

function setNoteStatus(id, status) {
  const now = new Date().toISOString();
  let changed = null;
  notes = notes.map((item) => {
    if (item.id !== id) return item;
    changed = { ...item, status, updatedAt: now, syncUpdatedAt: now };
    return changed;
  });
  persist();
  renderNotes();
  if (changed) syncCloudNote(changed);
}

function editNote(id) {
  const item = notes.find((row) => row.id === id);
  if (!item) return;
  document.querySelector("#noteId").value = item.id;
  document.querySelector("#noteTitle").value = item.title || "";
  document.querySelector("#noteTarget").value = item.target || "";
  document.querySelector("#noteWork").value = item.work || "";
  document.querySelector("#noteStatus").value = item.status || "todo";
  document.querySelector("#noteDue").value = item.due || "";
  document.querySelector("#notePriority").value = item.priority || "normal";
  document.querySelector("#noteMemo").value = item.memo || "";
  document.querySelector(".primary-btn").textContent = "更新筆記";
  switchView("form");
}

function deleteNote(id) {
  if (!confirm("確定刪除這筆追蹤筆記？")) return;
  const tombstone = { id, recordType: RECORD_TYPE, _deleted: true, syncUpdatedAt: new Date().toISOString() };
  notes = notes.filter((item) => item.id !== id);
  persist();
  renderNotes();
  syncCloudNote(tombstone);
}

function isDueSoon(value) {
  if (!value) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${value}T00:00:00`);
  const days = Math.ceil((due - today) / 86400000);
  return days <= 3;
}

function dueLabel(value) {
  if (!value) return { text: "未設定時程", className: "" };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${value}T00:00:00`);
  const days = Math.ceil((due - today) / 86400000);
  if (days < 0) return { text: `逾期 ${Math.abs(days)} 天`, className: "due-overdue" };
  if (days === 0) return { text: "今天到期", className: "due-soon" };
  if (days <= 3) return { text: `${value} 到期`, className: "due-soon" };
  return { text: `${value} 到期`, className: "" };
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
