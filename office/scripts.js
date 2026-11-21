// ==========================================
// === ULH OFFICE CORE ENGINE ===
// ==========================================
const OFFICE_AI_URL = "https://ulh-ai-helper.lanigirodesigner.workers.dev/";
const OFFICE_IZOH_URL = "https://ulh-izoh-proxy.lanigirodesigner.workers.dev/";

let officeMode = localStorage.getItem("ulh_office_active_mode") || "word";
let officeZoom = 1;
let pendingPasteRaw = "";
let pendingPasteNode = null;

// Данные Slides и Tables
let slidesData = JSON.parse(localStorage.getItem("ulh_office_slides_v1") || "null") || [
    { title: "Taqdimot sarlavhasi", body: "Slayd matnini şu yerga kiriting...", bg: "#FFFFFF" }
];
let activeSlideIdx = 0;

let tableData = JSON.parse(localStorage.getItem("ulh_office_tables_v1") || "null") || {
    rows: 20, cols: 10, cells: { "A1": "Mahsulot", "B1": "Soni", "C1": "Narx", "A2": "Kitob", "B2": "5", "C2": "45000" }
};
let activeCellKey = "A1";

// === 1. ИНИЦИАЛИЗАЦИЯ И 4-СЕКУНДНАЯ ЗАГРУЗКА ===
function runOfficeLoader(modeLabel, accentColor, callback) {
    const loader = document.getElementById("officeLoader");
    const title = document.getElementById("officeLoaderTitle");
    const fill = document.getElementById("officeLoaderFill");
    const spinner = document.getElementById("officeLoaderSpinner");
    if (!loader) { if (callback) callback(); return; }

    title.textContent = `${modeLabel} yuklanmoqda...`;
    spinner.style.borderTopColor = accentColor;
    fill.style.background = accentColor;
    fill.style.transition = "none";
    fill.style.width = "0%";
    loader.classList.add("active");

    requestAnimationFrame(() => {
        fill.style.transition = "width 3.9s linear";
        fill.style.width = "100%";
    });

    setTimeout(() => {
        if (callback) callback();
        loader.classList.remove("active");
    }, 4000);
}

document.addEventListener("DOMContentLoaded", () => {
    // Загружаем сохранённый Word
    const savedWord = localStorage.getItem("ulh_office_word_v1");
    const wordEl = document.getElementById("wordEditor");
    if (savedWord && wordEl) wordEl.innerHTML = savedWord;

    const savedTitle = localStorage.getItem("ulh_office_title_" + officeMode);
    if (savedTitle) document.getElementById("officeDocTitle").value = savedTitle;

    renderSlidesSidebar();
    loadActiveSlideToCanvas();
    renderSpreadsheet();
    renderOfficeOshaHistory();

    const modeMeta = getModeMeta(officeMode);
    runOfficeLoader(modeMeta.label, modeMeta.color, () => {
        applyOfficeModeUI(officeMode);
    });

    // Автосохранение при вводе
    if (wordEl) {
        wordEl.addEventListener("input", () => {
            saveCurrentOfficeDoc();
            pushOfficeHistorySnapshot();
        });
        wordEl.addEventListener("paste", handleSmartUzbekPaste);
    }

    const sTitle = document.getElementById("slideTitleBox");
    const sBody = document.getElementById("slideBodyBox");
    [sTitle, sBody].forEach(el => {
        if (!el) return;
        el.addEventListener("input", () => {
            slidesData[activeSlideIdx].title = sTitle.innerHTML;
            slidesData[activeSlideIdx].body = sBody.innerHTML;
            saveCurrentOfficeDoc();
            renderSlidesSidebar();
        });
        el.addEventListener("paste", handleSmartUzbekPaste);
    });
});

function getModeMeta(mode) {
    if (mode === "slides") return { label: "ULH Slides", color: "#EF4444" };
    if (mode === "tables") return { label: "ULH Tables", color: "#10B981" };
    return { label: "ULH Word", color: "#0284C7" };
}

window.switchOfficeMode = function(newMode) {
    if (newMode === officeMode) return;
    saveCurrentOfficeDoc();
    officeMode = newMode;
    localStorage.setItem("ulh_office_active_mode", newMode);
    const meta = getModeMeta(newMode);
    runOfficeLoader(meta.label, meta.color, () => applyOfficeModeUI(newMode));
};

function applyOfficeModeUI(mode) {
    document.querySelectorAll(".office-pane").forEach(p => p.classList.remove("active"));
    document.querySelectorAll(".mode-dock-btn").forEach(b => b.classList.toggle("active", b.dataset.mode === mode));

    const paneMap = { word: "paneWord", slides: "paneSlides", tables: "paneTables" };
    document.getElementById(paneMap[mode])?.classList.add("active");

    const badge = document.getElementById("officeModeBadge");
    const meta = getModeMeta(mode);
    badge.textContent = meta.label;
    badge.className = "office-mode-badge mode-" + mode;

    document.getElementById("officePlaySlideBtn").style.display = mode === "slides" ? "inline-flex" : "none";
    document.getElementById("officeAddRowBtn").style.display = mode === "tables" ? "inline-flex" : "none";
    document.getElementById("officeAddColBtn").style.display = mode === "tables" ? "inline-flex" : "none";

    const savedTitle = localStorage.getItem("ulh_office_title_" + mode) || ("Yangi " + mode);
    document.getElementById("officeDocTitle").value = savedTitle;

    // Обновляем меню форматов сохранения и accept для открытия
    const saveMenu = document.getElementById("officeSaveMenu");
    const fileInput = document.getElementById("officeFileInput");
    if (mode === "word") {
        fileInput.accept = ".doc,.docx,.rtf,.txt,.html";
        saveMenu.innerHTML = `
            <button onclick="exportOfficeFile('doc')">📄 .DOC (Word)</button>
            <button onclick="exportOfficeFile('docx')">📘 .DOCX (Word)</button>
            <button onclick="exportOfficeFile('rtf')">📝 .RTF</button>
            <button onclick="exportOfficeFile('pdf')">📕 .PDF</button>`;
    } else if (mode === "slides") {
        fileInput.accept = ".ppt,.pptx,.json,.html";
        saveMenu.innerHTML = `
            <button onclick="exportOfficeFile('ppt')">📙 .PPT</button>
            <button onclick="exportOfficeFile('pptx')">📕 .PPTX</button>
            <button onclick="exportOfficeFile('pdf')">📄 .PDF</button>`;
    } else {
        fileInput.accept = ".xlsx,.xls,.xml,.csv";
        saveMenu.innerHTML = `
            <button onclick="exportOfficeFile('xlsx')">📗 .XLSX (Excel)</button>
            <button onclick="exportOfficeFile('xls')">📊 .XLS</button>
            <button onclick="exportOfficeFile('xml')">🧾 .XML</button>
            <button onclick="exportOfficeFile('pdf')">📕 .PDF</button>`;
    }
}

window.saveCurrentOfficeDoc = function() {
    const title = document.getElementById("officeDocTitle")?.value || "Yangi hujjat";
    localStorage.setItem("ulh_office_title_" + officeMode, title);
    localStorage.setItem("ulh_office_active_mode", officeMode);
    localStorage.setItem("ulh_office_has_draft", "1");

    if (officeMode === "word") {
        localStorage.setItem("ulh_office_word_v1", document.getElementById("wordEditor").innerHTML);
    } else if (officeMode === "slides") {
        localStorage.setItem("ulh_office_slides_v1", JSON.stringify(slidesData));
    } else {
        localStorage.setItem("ulh_office_tables_v1", JSON.stringify(tableData));
    }

    const st = document.getElementById("officeAutosaveText");
    if (st) {
        st.textContent = "Saqlandi ✓";
        setTimeout(() => { st.textContent = "Avtosaqlandi ✓"; }, 1200);
    }
};

window.minimizeOfficeToMain = function() {
    saveCurrentOfficeDoc();
    window.location.href = "/";
};

// === 2. МАСШТАБИРОВАНИЕ ЛИСТА (CTRL + КОЛЕСИКО МЫШИ) ===
window.adjustOfficeZoom = function(delta) {
    officeZoom = Math.max(0.5, Math.min(2.0, +(officeZoom + delta).toFixed(2)));
    const wrap = document.getElementById("officeZoomWrapper");
    if (wrap) wrap.style.transform = `scale(${officeZoom})`;
    const lbl = document.getElementById("officeZoomLabel");
    if (lbl) lbl.textContent = Math.round(officeZoom * 100) + "%";
};

document.addEventListener("wheel", (e) => {
    if (e.ctrlKey) {
        e.preventDefault();
        adjustOfficeZoom(e.deltaY < 0 ? 0.1 : -0.1);
    }
}, { passive: false });

// === 3. ФОРМАТИРОВАНИЕ И ВСТАВКА ИЗОБРАЖЕНИЙ ===
window.execOfficeFormat = function(cmd, val = null) {
    document.execCommand(cmd, false, val);
    saveCurrentOfficeDoc();
};

window.insertOfficeImage = function() {
    const url = prompt("Rasm havolasini (URL) kiriting:", "https://");
    if (url && url.startsWith("http")) {
        document.execCommand("insertImage", false, url);
        saveCurrentOfficeDoc();
    }
};

// === 4. УМНАЯ ВСТАВКА (ТОЛЬКО УЗБЕКСКИЙ) И ТРАНСЛИТЕРАЦИЯ ВСЕГО ДОКУМЕНТА ===
function looksLikeUzbekOldOrCyrillic(text) {
    if (!text || text.length < 3) return false;
    // Узбекская кириллица (ў, қ, ғ, ҳ) или старая узбекская латиница (o', g', sh, ch)
    const hasUzCyr = /[ўқғҳЎҚҒҲ]/.test(text);
    const hasUzOldLat = /(o['‘’`ʻʼ]|g['‘’`ʻʼ]|\b(va|uchun|bilan|shahar|o'zbek|qilish|bo'lib|shuning)\b)/i.test(text);
    const isPureRussian = /[а-яё]/i.test(text) && !hasUzCyr && /\b(что|это|как|для|или|при|быть|его|она)\b/i.test(text);
    const isPureEnglish = /\b(the|and|with|from|that|this|have|will)\b/i.test(text) && !hasUzOldLat;
    if (isPureRussian || isPureEnglish) return false;
    return hasUzCyr || hasUzOldLat;
}

function handleSmartUzbekPaste(e) {
    const pasted = (e.clipboardData || window.clipboardData).getData("text/plain");
    if (!pasted) return;
    if (looksLikeUzbekOldOrCyrillic(pasted)) {
        pendingPasteRaw = pasted;
        pendingPasteNode = e.currentTarget;
        document.getElementById("smartPasteToast")?.classList.add("show");
    }
}

window.confirmSmartPaste = function(shouldConvert) {
    document.getElementById("smartPasteToast")?.classList.remove("show");
    if (shouldConvert && pendingPasteNode) {
        transliterateElementNodes(pendingPasteNode);
        saveCurrentOfficeDoc();
    }
    pendingPasteRaw = "";
    pendingPasteNode = null;
};

// Безопасная транслитерация текстовых узлов (сохраняет все стили, картинки, таблицы)
function transliterateElementNodes(rootEl) {
    if (!rootEl || typeof applyReplacements !== "function") return;
    const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, null);
    let node;
    while ((node = walker.nextNode())) {
        if (node.nodeValue && node.nodeValue.trim()) {
            node.nodeValue = applyReplacements(node.nodeValue);
        }
    }
}

window.transliterateWholeDocument = function() {
    pushOfficeHistorySnapshot();
    if (officeMode === "word") {
        transliterateElementNodes(document.getElementById("wordEditor"));
    } else if (officeMode === "slides") {
        slidesData.forEach(s => {
            const tmpT = document.createElement("div"); tmpT.innerHTML = s.title; transliterateElementNodes(tmpT); s.title = tmpT.innerHTML;
            const tmpB = document.createElement("div"); tmpB.innerHTML = s.body; transliterateElementNodes(tmpB); s.body = tmpB.innerHTML;
        });
        loadActiveSlideToCanvas();
        renderSlidesSidebar();
    } else {
        Object.keys(tableData.cells).forEach(k => {
            const v = String(tableData.cells[k] || "");
            if (!v.startsWith("=") && typeof applyReplacements === "function") {
                tableData.cells[k] = applyReplacements(v);
            }
        });
        renderSpreadsheet();
    }
    saveCurrentOfficeDoc();
};

// === 5. ULH SLIDES + ПОЛНОЭКРАННАЯ ПРЕЗЕНТАЦИЯ ===
function renderSlidesSidebar() {
    const list = document.getElementById("slidesThumbList");
    if (!list) return;
    list.innerHTML = slidesData.map((s, i) => `
        <div class="slide-thumb ${i === activeSlideIdx ? "active" : ""}" onclick="selectSlide(${i})">
            <div style="color:#EF4444; font-size:10px;">Slayd ${i + 1}</div>
            <div>${(s.title || "").replace(/<[^>]+>/g, "").slice(0, 26) || "Böş slayd"}</div>
        </div>
    `).join("");
}

function loadActiveSlideToCanvas() {
    const s = slidesData[activeSlideIdx] || slidesData[0];
    document.getElementById("slideTitleBox").innerHTML = s.title;
    document.getElementById("slideBodyBox").innerHTML = s.body;
    document.getElementById("slideCanvas").style.background = s.bg || "#FFFFFF";
    document.getElementById("slideBgColor").value = s.bg || "#FFFFFF";
}

window.selectSlide = function(i) { activeSlideIdx = i; loadActiveSlideToCanvas(); renderSlidesSidebar(); };
window.addNewSlide = function() {
    slidesData.push({ title: `Slayd ${slidesData.length + 1}`, body: "Matn kiriting...", bg: "#FFFFFF" });
    activeSlideIdx = slidesData.length - 1;
    loadActiveSlideToCanvas(); renderSlidesSidebar(); saveCurrentOfficeDoc();
};
window.duplicateCurrentSlide = function() {
    slidesData.splice(activeSlideIdx + 1, 0, { ...slidesData[activeSlideIdx] });
    activeSlideIdx++;
    loadActiveSlideToCanvas(); renderSlidesSidebar(); saveCurrentOfficeDoc();
};
window.deleteCurrentSlide = function() {
    if (slidesData.length <= 1) return;
    slidesData.splice(activeSlideIdx, 1);
    activeSlideIdx = Math.max(0, activeSlideIdx - 1);
    loadActiveSlideToCanvas(); renderSlidesSidebar(); saveCurrentOfficeDoc();
};
window.updateSlideBg = function(color) {
    slidesData[activeSlideIdx].bg = color;
    document.getElementById("slideCanvas").style.background = color;
    saveCurrentOfficeDoc();
};

let slideshowIdx = 0;
window.startSlideshow = function() {
    slideshowIdx = activeSlideIdx;
    const ov = document.getElementById("slideshowOverlay");
    ov.classList.add("active");
    renderSlideshowSlide();
    if (ov.requestFullscreen) ov.requestFullscreen().catch(() => {});
};
function renderSlideshowSlide() {
    const s = slidesData[slideshowIdx];
    const st = document.getElementById("slideshowStage");
    st.style.background = s.bg || "#FFFFFF";
    st.innerHTML = `<div style="font-size:42px;font-weight:800;">${s.title}</div><div style="font-size:22px;line-height:1.6;">${s.body}</div>`;
    document.getElementById("slideshowCounter").textContent = `${slideshowIdx + 1} / ${slidesData.length}`;
}
window.navSlideshow = function(step) {
    slideshowIdx = Math.max(0, Math.min(slidesData.length - 1, slideshowIdx + step));
    renderSlideshowSlide();
};
window.exitSlideshow = function() {
    document.getElementById("slideshowOverlay").classList.remove("active");
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
};
document.addEventListener("keydown", (e) => {
    if (!document.getElementById("slideshowOverlay").classList.contains("active")) return;
    if (e.key === "ArrowRight" || e.key === " ") navSlideshow(1);
    if (e.key === "ArrowLeft") navSlideshow(-1);
    if (e.key === "Escape") exitSlideshow();
});

// === 6. ULH TABLES (ТАБЛИЦЫ + ФОРМУЛЫ) ===
function colLetter(n) { return String.fromCharCode(65 + n); }

function evalFormula(raw) {
    const str = String(raw || "").trim();
    if (!str.startsWith("=")) return str;
    try {
        let expr = str.slice(1).toUpperCase();
        expr = expr.replace(/SUM\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)/g, (_, c1, r1, c2, r2) => {
            let sum = 0;
            for (let c = c1.charCodeAt(0); c <= c2.charCodeAt(0); c++) {
                for (let r = +r1; r <= +r2; r++) {
                    sum += parseFloat(evalFormula(tableData.cells[String.fromCharCode(c) + r])) || 0;
                }
            }
            return sum;
        });
        expr = expr.replace(/\b([A-Z]+)(\d+)\b/g, (_, c, r) => parseFloat(evalFormula(tableData.cells[c + r])) || 0);
        return Function(`"use strict"; return (${expr})`)();
    } catch (_) { return "#XATO"; }
}

function renderSpreadsheet() {
    const tbl = document.getElementById("ulhSpreadsheet");
    if (!tbl) return;
    let html = `<thead><tr><th>#</th>`;
    for (let c = 0; c < tableData.cols; c++) html += `<th>${colLetter(c)}</th>`;
    html += `</tr></thead><tbody>`;
    for (let r = 1; r <= tableData.rows; r++) {
        html += `<tr><th>${r}</th>`;
        for (let c = 0; c < tableData.cols; c++) {
            const key = colLetter(c) + r;
            const raw = tableData.cells[key] || "";
            const display = raw.startsWith("=") ? evalFormula(raw) : raw;
            html += `<td data-cell="${key}" class="${key === activeCellKey ? "active-cell" : ""}" contenteditable="true"
                onfocus="selectTableCell('${key}')" onblur="commitTableCell('${key}', this.innerText)">${display}</td>`;
        }
        html += `</tr>`;
    }
    html += `</tbody>`;
    tbl.innerHTML = html;
}

window.selectTableCell = function(key) {
    activeCellKey = key;
    document.getElementById("activeCellRef").textContent = key;
    document.getElementById("formulaInput").value = tableData.cells[key] || "";
    document.querySelectorAll("#ulhSpreadsheet td").forEach(td => td.classList.toggle("active-cell", td.dataset.cell === key));
};

window.commitTableCell = function(key, val) {
    const clean = val.trim();
    if ((tableData.cells[key] || "") !== clean) {
        tableData.cells[key] = clean;
        saveCurrentOfficeDoc();
        renderSpreadsheet();
    }
};

window.handleFormulaKey = function(e) {
    if (e.key === "Enter") {
        e.preventDefault();
        tableData.cells[activeCellKey] = e.target.value;
        saveCurrentOfficeDoc();
        renderSpreadsheet();
    }
};

window.addTableRow = function() { tableData.rows++; renderSpreadsheet(); saveCurrentOfficeDoc(); };
window.addTableCol = function() { if (tableData.cols < 26) { tableData.cols++; renderSpreadsheet(); saveCurrentOfficeDoc(); } };

// === 7. ОТКРЫТИЕ, СОХРАНЕНИЕ И ПЕЧАТЬ ФАЙЛОВ ===
window.toggleOfficeSaveMenu = function(e) {
    e.stopPropagation();
    document.getElementById("officeSaveWrap").classList.toggle("open");
};
document.addEventListener("click", () => {
    document.getElementById("officeSaveWrap")?.classList.remove("open");
    document.getElementById("officeContextMenu")?.classList.remove("open");
});

window.triggerOfficeFileOpen = function() { document.getElementById("officeFileInput").click(); };

window.handleOfficeFileOpen = async function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    document.getElementById("officeDocTitle").value = file.name.replace(/\.[^.]+$/, "");

    if (officeMode === "tables" && ["xlsx", "xls", "csv", "xml"].includes(ext) && window.XLSX) {
        const ab = await file.arrayBuffer();
        const wb = XLSX.read(ab, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        tableData.cells = {};
        tableData.rows = Math.max(20, rows.length + 5);
        rows.forEach((row, rIdx) => row.forEach((val, cIdx) => {
            if (cIdx < 26 && val !== undefined) tableData.cells[colLetter(cIdx) + (rIdx + 1)] = String(val);
        }));
        renderSpreadsheet();
    } else if (officeMode === "word" && ext === "docx" && window.JSZip) {
        const zip = await JSZip.loadAsync(await file.arrayBuffer());
        const xml = await zip.file("word/document.xml")?.async("string");
        if (xml) {
            const paras = [...xml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)].map(m =>
                [...m[0].matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map(t => t[1]).join("")
            ).filter(Boolean);
            document.getElementById("wordEditor").innerHTML = paras.map(p => `<p>${p}</p>`).join("");
        }
    } else {
        const txt = await file.text();
        if (officeMode === "word") document.getElementById("wordEditor").innerHTML = txt.includes("<") ? txt : `<p>${txt.replace(/\n/g, "<br>")}</p>`;
    }
    saveCurrentOfficeDoc();
    e.target.value = "";
};

window.exportOfficeFile = async function(ext) {
    document.getElementById("officeSaveWrap").classList.remove("open");
    const name = (document.getElementById("officeDocTitle").value || "ulh_hujjat").replace(/[^\w\-ÖĞŞÇöğşç ]/g, "_");

    if (ext === "pdf") {
        const target = officeMode === "word" ? document.getElementById("wordEditor")
            : officeMode === "slides" ? document.getElementById("slideCanvas")
            : document.getElementById("ulhSpreadsheet");
        const canvas = await html2canvas(target, { scale: 2, backgroundColor: "#FFFFFF" });
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF(officeMode === "slides" ? "l" : "p", "mm", "a4");
        const pw = pdf.internal.pageSize.getWidth();
        const ph = (canvas.height * pw) / canvas.width;
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, pw, ph);
        pdf.save(`${name}.pdf`);
        return;
    }

    if (officeMode === "tables" && window.XLSX) {
        const aoa = [];
        for (let r = 1; r <= tableData.rows; r++) {
            const row = [];
            for (let c = 0; c < tableData.cols; c++) row.push(evalFormula(tableData.cells[colLetter(c) + r] || ""));
            aoa.push(row);
        }
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "ULH Tables");
        XLSX.writeFile(wb, `${name}.${ext}`);
        return;
    }

    const htmlBody = officeMode === "word"
        ? document.getElementById("wordEditor").innerHTML
        : slidesData.map((s, i) => `<div style="page-break-after:always;padding:30px;background:${s.bg};"><h1>${s.title}</h1><div>${s.body}</div></div>`).join("");

    const fullDoc = `<html><head><meta charset="utf-8"></head><body style="font-family:Manrope,Arial,sans-serif;">${htmlBody}</body></html>`;
    const blob = new Blob(["\ufeff", fullDoc], { type: "application/octet-stream" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${name}.${ext}`;
    a.click();
};

window.printOfficeDocument = function() { window.print(); };

// === 8. КОНТЕКСТНОЕ МЕНЮ (ПКМ ТОЛЬКО В ПРЕДЕЛАХ ЛИСТА) ===
let lastCtxSelectedText = "";
document.addEventListener("contextmenu", (e) => {
    const insideSheet = e.target.closest("#wordEditor, #slideCanvas, #ulhSpreadsheet");
    const menu = document.getElementById("officeContextMenu");
    if (!insideSheet || !menu) return;

    e.preventDefault();
    lastCtxSelectedText = (window.getSelection()?.toString() || "").trim();
    const selSec = document.getElementById("ctxSelectionSection");
    const izohBtn = document.getElementById("ctxIzohBtn");

    if (lastCtxSelectedText) {
        selSec.style.display = "block";
        const isSingleWord = lastCtxSelectedText.split(/\s+/).length === 1;
        izohBtn.style.display = isSingleWord ? "block" : "none";
    } else {
        selSec.style.display = "none";
    }

    menu.style.left = Math.min(e.clientX, window.innerWidth - 210) + "px";
    menu.style.top = Math.min(e.clientY, window.innerHeight - 260) + "px";
    menu.classList.add("open");
});

window.ctxExec = function(cmd) { document.execCommand(cmd); };
window.ctxPaste = async function() {
    try {
        const txt = await navigator.clipboard.readText();
        document.execCommand("insertText", false, txt);
    } catch (_) {}
};

window.ctxAiAction = async function(type) {
    if (!lastCtxSelectedText) return;
    const modal = document.getElementById("officeQuickResultModal");
    const title = document.getElementById("officeQuickTitle");
    const body = document.getElementById("officeQuickBody");
    title.textContent = type === "synonym" ? `✨ Sinonimlar: ${lastCtxSelectedText}` : `🌐 Tarjima: ${lastCtxSelectedText}`;
    body.innerHTML = "Yuklanmoqda...";
    modal.classList.add("open");

    const prompt = type === "synonym"
        ? `"${lastCtxSelectedText}" sözi uçun 5 ta eng yaxşi sinonim ber.`
        : `"${lastCtxSelectedText}" matnini özbek tiliga aniq tarjima qil.`;

    const res = await fetch(OFFICE_AI_URL, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "custom", customPrompt: prompt, text: lastCtxSelectedText })
    });
    const data = await res.json();
    body.textContent = data.result || "Natija topilmadi.";
};

window.ctxIzohAction = async function() {
    if (!lastCtxSelectedText) return;
    const word = typeof lemmatizeUzbekWord === "function" ? lemmatizeUzbekWord(lastCtxSelectedText) : lastCtxSelectedText;
    const modal = document.getElementById("officeQuickResultModal");
    const title = document.getElementById("officeQuickTitle");
    const body = document.getElementById("officeQuickBody");
    title.textContent = `📖 Izohli luğat: ${word}`;
    body.innerHTML = "izoh.uz bazasidan qidirilmoqda...";
    modal.classList.add("open");

    const res = await fetch(`${OFFICE_IZOH_URL}?word=${encodeURIComponent(word)}`);
    const data = await res.json();
    body.innerHTML = (data && data.found && data.definitionHtml) ? data.definitionHtml : "Söz bazada topilmadi.";
};

// === 9. ИСТОРИЯ ДОКУМЕНТА (TIME MACHINE) ===
function getHistKey() { return "ulh_office_hist_" + officeMode; }
function pushOfficeHistorySnapshot() {
    const content = officeMode === "word" ? document.getElementById("wordEditor").innerHTML : JSON.stringify(officeMode === "slides" ? slidesData : tableData);
    let arr = JSON.parse(localStorage.getItem(getHistKey()) || "[]");
    if (arr.length && arr[arr.length - 1].content === content) return;
    arr.push({ time: new Date().toLocaleTimeString("uz-UZ"), content });
    if (arr.length > 30) arr.shift();
    localStorage.setItem(getHistKey(), JSON.stringify(arr));
}

window.openOfficeHistoryModal = function() {
    const arr = JSON.parse(localStorage.getItem(getHistKey()) || "[]");
    if (!arr.length) return alert("Hali tarix saqlanmagan.");
    const slider = document.getElementById("officeHistSlider");
    slider.max = arr.length - 1;
    slider.value = arr.length - 1;
    previewOfficeHistory();
    document.getElementById("officeHistoryModal").classList.add("open");
};

window.previewOfficeHistory = function() {
    const arr = JSON.parse(localStorage.getItem(getHistKey()) || "[]");
    const item = arr[document.getElementById("officeHistSlider").value];
    if (!item) return;
    document.getElementById("officeHistTime").textContent = "Vaqt: " + item.time;
    document.getElementById("officeHistPreview").innerHTML = officeMode === "word" ? item.content : `<pre>${item.content.slice(0, 600)}</pre>`;
};

window.restoreOfficeHistory = function() {
    const arr = JSON.parse(localStorage.getItem(getHistKey()) || "[]");
    const item = arr[document.getElementById("officeHistSlider").value];
    if (!item) return;
    if (officeMode === "word") document.getElementById("wordEditor").innerHTML = item.content;
    else if (officeMode === "slides") { slidesData = JSON.parse(item.content); loadActiveSlideToCanvas(); renderSlidesSidebar(); }
    else { tableData = JSON.parse(item.content); renderSpreadsheet(); }
    saveCurrentOfficeDoc();
    document.getElementById("officeHistoryModal").classList.remove("open");
};

// === 10. ÖŞA AI ВНУТРИ OFFICE (КНОПКА TAHRIRLAŞ ПЕРЕБРАСЫВАЕТ ТЕКСТ В ДОКУМЕНТ) ===
let officeOshaChatHist = JSON.parse(localStorage.getItem("oshaChatHistory") || "[]");

window.toggleOfficeOsha = function() {
    document.getElementById("officeOshaChat").classList.toggle("hidden");
};

function renderOfficeOshaHistory() {
    const box = document.getElementById("officeOshaMessages");
    if (!box) return;
    box.innerHTML = officeOshaChatHist.slice(-15).map((m, idx) => `
        <div class="office-osha-msg ${m.role === "user" ? "user" : "bot"}">
            <div>${String(m.content || "").replace(/\n/g, "<br>")}</div>
            ${m.role !== "user" ? `<button type="button" class="office-osha-insert-btn" onclick="insertOshaTextToOffice(${idx})">✏️ Tahrirlaş (Hujjatga qöşiş)</button>` : ""}
        </div>
    `).join("");
    box.scrollTop = box.scrollHeight;
}

window.insertOshaTextToOffice = function(sliceIdx) {
    const list = officeOshaChatHist.slice(-15);
    const text = list[sliceIdx]?.content || "";
    if (!text) return;

    if (officeMode === "word") {
        const w = document.getElementById("wordEditor");
        w.innerHTML += `<p>${text.replace(/\n/g, "<br>")}</p>`;
    } else if (officeMode === "slides") {
        slidesData[activeSlideIdx].body += `<br>${text.replace(/\n/g, "<br>")}`;
        loadActiveSlideToCanvas();
    } else {
        tableData.cells[activeCellKey] = text.slice(0, 120);
        renderSpreadsheet();
    }
    saveCurrentOfficeDoc();
};

window.sendOfficeOsha = async function() {
    const inp = document.getElementById("officeOshaInput");
    const text = (inp.value || "").trim();
    if (!text) return;
    inp.value = "";
    officeOshaChatHist.push({ role: "user", content: text });
    renderOfficeOshaHistory();

    try {
        const res = await fetch(OFFICE_AI_URL, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "custom", customPrompt: "Sen Öşa AI yordamçisisan. Qisqa va aniq javob ber.", text })
        });
        const data = await res.json();
        officeOshaChatHist.push({ role: "assistant", content: data.result || "Javob olinmadi." });
        localStorage.setItem("oshaChatHistory", JSON.stringify(officeOshaChatHist));
        renderOfficeOshaHistory();
    } catch (_) {}
};