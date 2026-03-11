const PLAN_KEY = "todo_plan_v4";
const CHECKS_KEY = "todo_checks_v4";

const el = {
  emptyState: document.getElementById("emptyState"),
  planState: document.getElementById("planState"),
  openLoadBig: document.getElementById("openLoadBig"),
  openLoadSmall: document.getElementById("openLoadSmall"),

  exportBtn: document.getElementById("exportBtn"),
  resetChecksBtn: document.getElementById("resetChecksBtn"),
  resetAllBtn: document.getElementById("resetAllBtn"),

  dotsBtn: document.getElementById("dotsBtn"),
  popover: document.getElementById("popover"),

  captureArea: document.getElementById("captureArea"),

  planTitle: document.getElementById("planTitle"),
  planSubtitle: document.getElementById("planSubtitle"),
  planMeta: document.getElementById("planMeta"),
  rows: document.getElementById("rows"),

  tipsPanel: document.getElementById("tipsPanel"),
  tipsCount: document.getElementById("tipsCount"),
  tips: document.getElementById("tips"),

  linesPanel: document.getElementById("linesPanel"),
  linesCount: document.getElementById("linesCount"),
  lines: document.getElementById("lines"),

  exportPanel: document.getElementById("exportPanel"),
  exportBox: document.getElementById("exportBox"),
  copyExportBtn: document.getElementById("copyExportBtn"),
  downloadPngBtn: document.getElementById("downloadPngBtn"),
  status: document.getElementById("status"),

  loadDlg: document.getElementById("loadDlg"),
  closeDlg: document.getElementById("closeDlg"),
  jsonInput: document.getElementById("jsonInput"),
  pasteBtn: document.getElementById("pasteBtn"),
  clearBtn: document.getElementById("clearBtn"),
  applyBtn: document.getElementById("applyBtn"),
  sampleBtn: document.getElementById("sampleBtn"),
  jsonFile: document.getElementById("jsonFile"),
  dlgStatus: document.getElementById("dlgStatus"),
};

let checksSaveRaf = 0;

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setDlgStatus(msg, ok = true) {
  el.dlgStatus.textContent = msg || "";
  el.dlgStatus.classList.toggle("good", ok);
  el.dlgStatus.classList.toggle("bad", !ok);
}

function setStatus(msg, ok = true) {
  el.status.textContent = msg || "";
  el.status.classList.toggle("good", ok);
  el.status.classList.toggle("bad", !ok);
}

function safeParseJSON(text) {
  try {
    return { ok: true, data: JSON.parse(text) };
  } catch (e) {
    return { ok: false, err: e.message };
  }
}

function normalizePlan(plan) {
  if (!plan || typeof plan !== "object") {
    throw new Error("JSON باید یک آبجکت باشد.");
  }

  const title = String(plan.title || "برنامه روزانه");
  const subtitle = String(plan.subtitle || "");
  const meta = Array.isArray(plan.meta) ? plan.meta.map(String) : [];
  const tips = Array.isArray(plan.tips) ? plan.tips.map(String) : [];
  const lines = Array.isArray(plan.lines) ? plan.lines.map(String) : [];

  if (!Array.isArray(plan.items)) {
    throw new Error("فیلد items باید آرایه باشد.");
  }

  const items = plan.items.map((it, idx) => {
    if (!it || typeof it !== "object") {
      throw new Error(`آیتم ${idx + 1} معتبر نیست.`);
    }

    return {
      time: String(it.time || ""),
      subject: String(it.subject || ""),
      topic: String(it.topic || ""),
      task: String(it.task || ""),
    };
  });

  return { title, subtitle, meta, items, tips, lines };
}

function savePlan(plan) {
  localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
}

function loadPlan() {
  const raw = localStorage.getItem(PLAN_KEY);
  if (!raw) return null;

  try {
    return normalizePlan(JSON.parse(raw));
  } catch {
    return null;
  }
}

function showState(hasPlan) {
  el.emptyState.style.display = hasPlan ? "none" : "flex";
  el.planState.style.display = hasPlan ? "block" : "none";
}

function getRows() {
  return Array.from(el.rows.querySelectorAll("tr"));
}

function saveChecksNow() {
  const state = getRows().map((tr) => {
    const cb = tr.querySelector('input[type="checkbox"]');
    return !!cb?.checked;
  });
  localStorage.setItem(CHECKS_KEY, JSON.stringify(state));
}

function saveChecks() {
  if (checksSaveRaf) cancelAnimationFrame(checksSaveRaf);
  checksSaveRaf = requestAnimationFrame(() => {
    saveChecksNow();
    checksSaveRaf = 0;
  });
}

function loadChecks() {
  const raw = localStorage.getItem(CHECKS_KEY);
  let saved = [];

  try {
    saved = raw ? JSON.parse(raw) : [];
  } catch {
    saved = [];
  }

  getRows().forEach((tr, i) => {
    const cb = tr.querySelector('input[type="checkbox"]');
    const checked = !!saved[i];
    if (cb) cb.checked = checked;
    tr.classList.toggle("done", checked);
  });
}

function resetChecks() {
  localStorage.removeItem(CHECKS_KEY);
  getRows().forEach((tr) => {
    const cb = tr.querySelector('input[type="checkbox"]');
    if (cb) cb.checked = false;
    tr.classList.remove("done");
  });
}

function attachHandlers() {
  // جلوگیری از چندبار بستن event روی tbody
  if (el.rows.dataset.bound === "1") return;

  el.rows.addEventListener("change", (e) => {
    const cb = e.target.closest('input[type="checkbox"]');
    if (!cb) return;

    const tr = cb.closest("tr");
    if (tr) tr.classList.toggle("done", cb.checked);
    saveChecks();
  });

  el.rows.dataset.bound = "1";
}

function makeCell(className, text) {
  const td = document.createElement("td");
  td.className = className;
  td.textContent = text;
  return td;
}

function render(plan) {
  el.planTitle.textContent = plan.title;
  el.planSubtitle.textContent = plan.subtitle;

  el.planMeta.innerHTML = "";
  const metaFrag = document.createDocumentFragment();
  plan.meta.forEach((m) => {
    const span = document.createElement("span");
    span.className = "pill";
    span.textContent = m;
    metaFrag.appendChild(span);
  });
  el.planMeta.appendChild(metaFrag);

  el.rows.innerHTML = "";
  const rowsFrag = document.createDocumentFragment();

  plan.items.forEach((it, i) => {
    const tr = document.createElement("tr");
    tr.dataset.index = String(i);

    const checkTd = document.createElement("td");
    checkTd.className = "checkcell";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.setAttribute("aria-label", `انجام شد - ردیف ${i + 1}`);
    checkTd.appendChild(cb);

    tr.appendChild(checkTd);
    tr.appendChild(makeCell("time", it.time));
    tr.appendChild(makeCell("subject", it.subject));
    tr.appendChild(makeCell("topic", it.topic));
    tr.appendChild(makeCell("task", it.task));

    rowsFrag.appendChild(tr);
  });

  el.rows.appendChild(rowsFrag);
  attachHandlers();
  loadChecks();

  if (plan.tips && plan.tips.length) {
    el.tipsPanel.style.display = "block";
    el.tipsCount.textContent = String(plan.tips.length);
    el.tips.innerHTML = "";

    const tipsFrag = document.createDocumentFragment();

    plan.tips.forEach((t) => {
      const div = document.createElement("div");
      div.className = "tip";

      if (t.includes(":")) {
        const [a, ...b] = t.split(":");
        div.innerHTML = `<b>${escapeHtml(a)}:</b> ${escapeHtml(b.join(":").trim())}`;
      } else {
        div.textContent = t;
      }

      tipsFrag.appendChild(div);
    });

    el.tips.appendChild(tipsFrag);
  } else {
    el.tipsPanel.style.display = "none";
    el.tips.innerHTML = "";
  }

  if (plan.lines && plan.lines.length) {
    el.linesPanel.style.display = "block";
    el.linesCount.textContent = String(plan.lines.length);
    el.lines.innerHTML = "";

    const linesFrag = document.createDocumentFragment();
    plan.lines.forEach((l) => {
      const p = document.createElement("p");
      p.textContent = l;
      linesFrag.appendChild(p);
    });
    el.lines.appendChild(linesFrag);
  } else {
    el.linesPanel.style.display = "none";
    el.lines.innerHTML = "";
  }

  el.exportPanel.style.display = "none";
  el.exportBox.textContent = "";
  setStatus("", true);

  showState(true);
}

function resetAll() {
  localStorage.removeItem(CHECKS_KEY);
  localStorage.removeItem(PLAN_KEY);
  el.rows.innerHTML = "";
  el.exportPanel.style.display = "none";
  el.exportBox.textContent = "";
  setStatus("", true);
  showState(false);
}

function buildExport() {
  const plan = loadPlan();
  if (!plan) throw new Error("برنامه‌ای برای خروجی وجود ندارد.");

  const checks = getRows().map((tr) => {
    const cb = tr.querySelector('input[type="checkbox"]');
    return !!cb?.checked;
  });

  const done = checks.filter(Boolean).length;

  return {
    exported_at: new Date().toISOString(),
    title: plan.title,
    done,
    total: checks.length,
    items: plan.items.map((it, i) => ({ ...it, done: !!checks[i] })),
  };
}

// Best-effort PNG export
async function downloadPNG() {
  const node = el.captureArea;
  if (!node) throw new Error("ناحیه خروجی پیدا نشد.");

  await new Promise((resolve) => requestAnimationFrame(resolve));

  const rect = node.getBoundingClientRect();
  const width = Math.max(1, Math.ceil(rect.width));
  const height = Math.max(1, Math.ceil(rect.height + 140));

  const clone = node.cloneNode(true);
  const exp = clone.querySelector("#exportPanel");
  if (exp) exp.remove();

  clone.querySelectorAll("details").forEach((d) => {
    d.open = true;
  });

  const wrapper = document.createElement("div");
  wrapper.style.width = `${width}px`;
  wrapper.style.boxSizing = "border-box";
  wrapper.appendChild(clone);

  const serializer = new XMLSerializer();
  const html = serializer.serializeToString(wrapper);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <foreignObject x="0" y="0" width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml">${html}</div>
      </foreignObject>
    </svg>
  `;

  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  try {
    const img = new Image();
    img.decoding = "async";

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });

    const scale = Math.min(2, window.devicePixelRatio || 1.5);
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(width * scale);
    canvas.height = Math.ceil(height * scale);

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Canvas context ساخته نشد.");

    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, width, height);

    const pngUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    const plan = loadPlan();
    const safeName = (plan?.title || "todo")
      .replace(/[^\u0600-\u06FFa-zA-Z0-9 _-]/g, "")
      .trim()
      .replace(/\s+/g, "_");

    a.download = `${safeName || "todo"}.png`;
    a.href = pngUrl;
    a.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Popover
function togglePopover(force) {
  const show =
    typeof force === "boolean"
      ? force
      : !el.popover.classList.contains("show");

  el.popover.classList.toggle("show", show);
}

document.addEventListener("click", (e) => {
  const target = e.target;

  if (target.closest("#dotsBtn")) return;
  if (target.closest("#popover")) return;

  togglePopover(false);
});

// Dialog
function openLoadDialog() {
  if (typeof el.loadDlg.showModal === "function") {
    el.loadDlg.showModal();
  } else {
    el.loadDlg.setAttribute("open", "");
  }
  setDlgStatus("", true);
}

el.openLoadBig?.addEventListener("click", openLoadDialog);

if (el.openLoadSmall) {
  el.openLoadSmall.addEventListener("click", () => {
    togglePopover(false);
    openLoadDialog();
  });
}

el.closeDlg?.addEventListener("click", () => {
  if (typeof el.loadDlg.close === "function") {
    el.loadDlg.close();
  } else {
    el.loadDlg.removeAttribute("open");
  }
});

el.dotsBtn?.addEventListener("click", () => togglePopover());

// Apply
el.applyBtn?.addEventListener("click", () => {
  const parsed = safeParseJSON(el.jsonInput.value.trim());

  if (!parsed.ok) {
    setDlgStatus("JSON نامعتبر: " + parsed.err, false);
    return;
  }

  try {
    const plan = normalizePlan(parsed.data);

    const prev = localStorage.getItem(CHECKS_KEY);
    let prevArr = null;

    try {
      prevArr = prev ? JSON.parse(prev) : null;
    } catch {
      prevArr = null;
    }

    if (!prevArr || !Array.isArray(prevArr) || prevArr.length !== plan.items.length) {
      localStorage.removeItem(CHECKS_KEY);
    }

    savePlan(plan);
    render(plan);

    setDlgStatus("اعمال شد ✅", true);

    if (typeof el.loadDlg.close === "function") {
      el.loadDlg.close();
    } else {
      el.loadDlg.removeAttribute("open");
    }
  } catch (e) {
    setDlgStatus("خطا: " + e.message, false);
  }
});

// Paste
el.pasteBtn?.addEventListener("click", async () => {
  try {
    const txt = await navigator.clipboard.readText();

    if (!txt || !txt.trim()) {
      setDlgStatus("کلیپ‌بورد خالی است.", false);
      return;
    }

    el.jsonInput.value = txt;
    setDlgStatus("Paste شد ✅", true);
  } catch {
    setDlgStatus("مرورگر اجازه Paste مستقیم نداد. دستی Paste کن.", false);
  }
});

// Clear
el.clearBtn?.addEventListener("click", () => {
  el.jsonInput.value = "";
  setDlgStatus("پاک شد.", true);
});

// Upload file
el.jsonFile?.addEventListener("change", () => {
  const file = el.jsonFile.files?.[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    el.jsonInput.value = String(reader.result || "");
    setDlgStatus("فایل بارگذاری شد ✅", true);
  };

  reader.onerror = () => {
    setDlgStatus("خواندن فایل ناموفق بود.", false);
  };

  reader.readAsText(file, "utf-8");
});

// Sample
const sample = {
  title: "برنامه روز ۱",
  subtitle: "رویکرد: از آخر به اول — تمرکز: توابع، چندجمله‌ای‌ها، دایره، هوش",
  meta: ["۸۰ سؤال / ۱۰۰ دقیقه", "قانون: هیچ سؤال > ۹۰ ثانیه"],
  items: [
    { time: "07:30–08:00", subject: "آماده‌سازی", topic: "—", task: "بیداری، صبحانه سبک، بدون موبایل" },
    { time: "08:00–08:30", subject: "هوش", topic: "گرم‌کردن", task: "۱۰ سؤال ساده (بدون تحلیل)" },
    { time: "08:30–10:00", subject: "ریاضی", topic: "توابع", task: "مرور مفاهیم + ۲۵ سؤال" },
    { time: "10:00–10:15", subject: "استراحت", topic: "—", task: "راه رفتن، آب، بدون موبایل" },
    { time: "10:15–11:45", subject: "ریاضی", topic: "چندجمله‌ای‌ها", task: "مرور هدفمند + ۳۰ سؤال" },
    { time: "12:30–13:30", subject: "هندسه", topic: "دایره", task: "خواص، مماس، زاویه‌ها + ۲۵ سؤال" }
  ],
  tips: ["قانون ۹۰ ثانیه: گیر کردی → رد."],
  lines: ["امروز قفل ندادم؛ پس جلو افتادم."]
};

el.sampleBtn?.addEventListener("click", () => {
  el.jsonInput.value = JSON.stringify(sample, null, 2);
  setDlgStatus("نمونه قرار گرفت.", true);
});

// Export & Resets
el.exportBtn?.addEventListener("click", () => {
  try {
    const rep = buildExport();
    el.exportBox.textContent = JSON.stringify(rep, null, 2);
    el.exportPanel.style.display = "block";
    el.exportPanel.open = true;
    setStatus(`انجام‌شده: ${rep.done}/${rep.total}`, true);
  } catch (e) {
    setStatus("خطا: " + e.message, false);
  }
});

el.copyExportBtn?.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(el.exportBox.textContent);
    setStatus("JSON کپی شد ✅", true);
  } catch {
    setStatus("کپی نشد. دستی کپی کن.", false);
  }
});

el.downloadPngBtn?.addEventListener("click", async () => {
  try {
    setStatus("در حال ساخت تصویر…", true);
    await downloadPNG();
    setStatus("تصویر آماده شد ✅", true);
  } catch {
    setStatus("ساخت تصویر در این مرورگر موفق نبود.", false);
  }
});

el.resetChecksBtn?.addEventListener("click", () => {
  resetChecks();
  el.exportPanel.style.display = "none";
  setStatus("تیک‌ها ریست شدند.", true);
});

el.resetAllBtn?.addEventListener("click", () => {
  togglePopover(false);
  resetAll();
});

// Init
const stored = loadPlan();
if (stored) {
  el.jsonInput.value = JSON.stringify(stored, null, 2);
  render(stored);
} else {
  el.jsonInput.value = JSON.stringify(sample, null, 2);
  showState(false);
}