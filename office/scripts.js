// ==========================================
// === ULH OFFICE v2 — A4 PAGES, RULER, RIBBON, CHARTS, TABLES ===
// ==========================================
const OFFICE_AI_URL = "https://ulh-ai-helper.lanigirodesigner.workers.dev/";
const OFFICE_IZOH_URL = "https://ulh-izoh-proxy.lanigirodesigner.workers.dev/";

let officeMode = localStorage.getItem("ulh_office_active_mode") || "word";
let officeZoom = 1;
let savedRange = null;
let pendingPasteNode = null;
let rulerMarginLeft = 20;  // mm
let rulerMarginRight = 20; // mm
let rulerFirstLine = 0;    // mm
let rulerMarginTop = 20;   // mm

let wordPages = JSON.parse(localStorage.getItem("ulh_office_word_pages_v2") || "null") || [
    "<h2>ULH Word</h2><p>Bu yerda hujjatingizni yozişingiz mumkin. Sahifa tölganda avtomatik yangi A4 sahifa oçiladi.</p>"
];
let slidesData = JSON.parse(localStorage.getItem("ulh_office_slides_v1") || "null") || [
    { title: "Taqdimot sarlavhasi", body: "Slayd matnini şu yerga kiriting...", bg: "#FFFFFF" }
];
let activeSlideIdx = 0;

let tableData = JSON.parse(localStorage.getItem("ulh_office_tables_v1") || "null") || {
    rows: 20, cols: 10, cells: { "A1": "Mahsulot", "B1": "Soni", "C1": "Narx", "A2": "Kitob", "B2": "5", "C2": "45000", "A3": "Daftar", "B3": "12", "C3": "8000" }
};
let activeCellKey = "A1";

let officeChartItems = [
    { label: "Yanvar", val: 45, color: "#0284C7" },
    { label: "Fevral", val: 68, color: "#10B981" },
    { label: "Mart", val: 52, color: "#8B5CF6" },
    { label: "Aprel", val: 84, color: "#F59E0B" }
];

// Сохраняем выделение, чтобы селекты шрифта/цвета не теряли фокус
document.addEventListener("selectionchange", () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
        const node = sel.anchorNode;
        if (node && node.parentElement && node.parentElement.closest(".a4-sheet, #slideCanvas")) {
            savedRange = sel.getRangeAt(0).cloneRange();
        }
    }
});

function restoreSavedSelection() {
    if (!savedRange) return;
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(savedRange);
}

function syncWordPagesFromDom() {
    const sheets = document.querySelectorAll(".a4-sheet");
    if (sheets.length) {
        wordPages = [...sheets].map(p => p.innerHTML);
    }
}

// === 1. ЗАГРУЗКА (4 СЕКУНДЫ) И ИНИЦИАЛИЗАЦИЯ ===
function runOfficeLoader(label, color, cb) {
    const loader = document.getElementById("officeLoader");
    const fill = document.getElementById("officeLoaderFill");
    document.getElementById("officeLoaderTitle").textContent = `${label} yuklanmoqda...`;
    document.getElementById("officeLoaderSpinner").style.borderTopColor = color;
    fill.style.background = color;
    fill.style.transition = "none";
    fill.style.width = "0%";
    loader.classList.add("active");
    requestAnimationFrame(() => { fill.style.transition = "width 3.9s linear"; fill.style.width = "100%"; });
    setTimeout(() => { if (cb) cb(); loader.classList.remove("active"); }, 4000);
}

document.addEventListener("DOMContentLoaded", () => {
    initWordRuler();
    renderWordPages();
    renderSlidesSidebar();
    loadActiveSlideToCanvas();
    renderSpreadsheet();
    renderOfficeOshaHistory();

    const meta = getModeMeta(officeMode);
    runOfficeLoader(meta.label, meta.color, () => applyOfficeModeUI(officeMode));

    const sTitle = document.getElementById("slideTitleBox");
    const sBody = document.getElementById("slideBodyBox");
    [sTitle, sBody].forEach(el => {
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
    document.getElementById({ word: "paneWord", slides: "paneSlides", tables: "paneTables" }[mode])?.classList.add("active");

    const badge = document.getElementById("officeModeBadge");
    badge.textContent = getModeMeta(mode).label;
    badge.className = "office-mode-badge mode-" + mode;

    document.getElementById("officePlaySlideBtn").style.display = mode === "slides" ? "inline-flex" : "none";
    document.getElementById("rbNewPageBtn").style.display = mode === "word" ? "inline-flex" : "none";
    const rbTableBtn = document.getElementById("rbInsertTableBtn");
    if (rbTableBtn) rbTableBtn.style.display = mode === "word" ? "flex" : "none";
    document.getElementById("rbGroupParagraph").style.display = mode === "tables" ? "none" : "flex";
    document.getElementById("rbGroupStyles").style.display = mode === "tables" ? "none" : "flex";
    document.getElementById("rbGroupTablesData").style.display = mode === "tables" ? "flex" : "none";

    document.getElementById("officeDocTitle").value = localStorage.getItem("ulh_office_title_" + mode) || ("Yangi " + mode);
    updatePageCounter();

    const saveMenu = document.getElementById("officeSaveMenu");
    const fileInput = document.getElementById("officeFileInput");

    const icoDoc = `<svg class="ti ti-sm" viewBox="0 0 24 24"><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z"/></svg>`;
    const icoSheet = `<svg class="ti ti-sm" viewBox="0 0 24 24"><path d="M3 5a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-14z"/><path d="M3 10h18"/><path d="M10 3v18"/></svg>`;
    const icoSlide = `<svg class="ti ti-sm" viewBox="0 0 24 24"><path d="M3 4l18 0"/><path d="M4 4v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-10"/><path d="M12 16l0 4"/><path d="M9 20l6 0"/></svg>`;

    if (mode === "word") {
        fileInput.accept = ".doc,.docx,.rtf,.txt,.html";
        saveMenu.innerHTML = `<button onclick="exportOfficeFile('doc')">${icoDoc} .DOC</button><button onclick="exportOfficeFile('docx')">${icoDoc} .DOCX</button><button onclick="exportOfficeFile('rtf')">${icoDoc} .RTF</button><button onclick="exportOfficeFile('pdf')">${icoDoc} .PDF</button>`;
    } else if (mode === "slides") {
        fileInput.accept = ".ppt,.pptx,.html";
        saveMenu.innerHTML = `<button onclick="exportOfficeFile('ppt')">${icoSlide} .PPT</button><button onclick="exportOfficeFile('pptx')">${icoSlide} .PPTX</button><button onclick="exportOfficeFile('pdf')">${icoDoc} .PDF</button>`;
    } else {
        fileInput.accept = ".xlsx,.xls,.xml,.csv";
        saveMenu.innerHTML = `<button onclick="exportOfficeFile('xlsx')">${icoSheet} .XLSX</button><button onclick="exportOfficeFile('xls')">${icoSheet} .XLS</button><button onclick="exportOfficeFile('xml')">${icoDoc} .XML</button><button onclick="exportOfficeFile('pdf')">${icoDoc} .PDF</button>`;
    }
}

// === 2. МНОГОСТРАНИЧНЫЙ А4 (АВТО-ПЕРЕНОС И УДАЛЕНИЕ ПУСТЫХ СТРАНИЦ) ===
function renderWordPages() {
    const container = document.getElementById("wordPagesContainer");
    if (!container) return;
    container.innerHTML = "";
    wordPages.forEach((html, idx) => {
        const page = document.createElement("div");
        page.className = "a4-sheet";
        page.contentEditable = "true";
        page.spellcheck = false;
        page.dataset.pageIndex = idx;
        page.style.paddingLeft = rulerMarginLeft + "mm";
        page.style.paddingRight = rulerMarginRight + "mm";
        page.style.paddingTop = rulerMarginTop + "mm";
        page.style.textIndent = rulerFirstLine + "mm";
        page.innerHTML = html;

        page.addEventListener("input", () => {
            wordPages[idx] = page.innerHTML;
            checkPageOverflow(page, idx);
            saveCurrentOfficeDoc();
            pushOfficeHistorySnapshot();
        });
        page.addEventListener("paste", handleSmartUzbekPaste);
        page.addEventListener("keydown", (e) => {
            const plain = page.innerText.trim();
            // Backspace на пустой странице (кроме 1-й) удаляет её
            if (e.key === "Backspace" && plain === "" && wordPages.length > 1 && idx > 0) {
                e.preventDefault();
                wordPages.splice(idx, 1);
                renderWordPages();
                saveCurrentOfficeDoc();
                const prev = document.querySelector(`.a4-sheet[data-page-index="${idx - 1}"]`);
                if (prev) prev.focus();
                return;
            }
            // Delete в конце активной страницы: если следующая страница пустая — удаляет её
            if (e.key === "Delete" && idx + 1 < wordPages.length) {
                const sel = window.getSelection();
                if (sel && sel.isCollapsed) {
                    const range = sel.getRangeAt(0);
                    const afterRange = document.createRange();
                    afterRange.selectNodeContents(page);
                    afterRange.setStart(range.endContainer, range.endOffset);
                    if (afterRange.toString().trim() === "") {
                        const nextTmp = document.createElement("div");
                        nextTmp.innerHTML = wordPages[idx + 1] || "";
                        if (nextTmp.innerText.trim() === "" && !nextTmp.querySelector("img, table")) {
                            e.preventDefault();
                            wordPages.splice(idx + 1, 1);
                            renderWordPages();
                            saveCurrentOfficeDoc();
                        }
                    }
                }
            }
        });
        container.appendChild(page);
    });
    updatePageCounter();
}

function checkPageOverflow(pageEl, idx) {
    if (pageEl.scrollHeight <= pageEl.clientHeight + 2) return;
    // Переносим последний блок на следующую страницу А4
    let overflowHtml = "";
    while (pageEl.scrollHeight > pageEl.clientHeight + 2 && pageEl.lastChild) {
        const last = pageEl.lastChild;
        overflowHtml = (last.outerHTML || last.textContent) + overflowHtml;
        pageEl.removeChild(last);
    }
    wordPages[idx] = pageEl.innerHTML;
    if (idx + 1 < wordPages.length) {
        wordPages[idx + 1] = overflowHtml + wordPages[idx + 1];
    } else {
        wordPages.push(overflowHtml || "<p><br></p>");
    }
    renderWordPages();
    const nextEl = document.querySelector(`.a4-sheet[data-page-index="${idx + 1}"]`);
    if (nextEl) nextEl.focus();
}

window.addNewA4Page = function() {
    wordPages.push("<p><br></p>");
    renderWordPages();
    saveCurrentOfficeDoc();
    const last = document.querySelector(`.a4-sheet[data-page-index="${wordPages.length - 1}"]`);
    if (last) last.focus();
};

function updatePageCounter() {
    const el = document.getElementById("officePageCounter");
    if (!el) return;
    if (officeMode === "word") el.textContent = `Sahifa 1 / ${wordPages.length}`;
    else if (officeMode === "slides") el.textContent = `Slayd ${activeSlideIdx + 1} / ${slidesData.length}`;
    else el.textContent = `Katak: ${activeCellKey}`;
}

// === 3. ГОРИЗОНТАЛЬНАЯ (2 БЕГУНКА СЛЕВА + 1 СПРАВА) И ВЕРТИКАЛЬНАЯ ЛИНЕЙКИ (WORD) ===
function initWordRuler() {
    const ticks = document.getElementById("wordRulerTicks");
    if (ticks) ticks.innerHTML = Array.from({ length: 21 }, (_, i) => `<div class="ruler-cm">${i + 1}</div>`).join("");
    const vticks = document.getElementById("wordVRulerTicks");
    if (vticks) vticks.innerHTML = Array.from({ length: 29 }, (_, i) => `<div class="vruler-cm">${i + 1}</div>`).join("");

    const wrap = document.getElementById("wordRulerWrap");
    const vwrap = document.getElementById("wordVRulerWrap");
    const hFirst = document.getElementById("rulerFirstLineHandle");
    const hLeft = document.getElementById("rulerLeftHandle");
    const hRight = document.getElementById("rulerRightHandle");
    const hTop = document.getElementById("vrulerTopHandle");
    if (!wrap || !hLeft || !hRight) return;

    function syncRulers() {
        const lPct = (rulerMarginLeft / 210) * 100;
        const rPct = (rulerMarginRight / 210) * 100;
        const fPct = ((rulerMarginLeft + rulerFirstLine) / 210) * 100;
        const tPct = (rulerMarginTop / 297) * 100;

        const shadeL = document.getElementById("rulerShadeLeft");
        const shadeR = document.getElementById("rulerShadeRight");
        const shadeT = document.getElementById("vrulerShadeTop");

        if (shadeL) shadeL.style.width = lPct + "%";
        if (shadeR) shadeR.style.width = rPct + "%";
        hLeft.style.left = lPct + "%";
        if (hFirst) hFirst.style.left = fPct + "%";
        hRight.style.left = (100 - rPct) + "%";

        if (hTop) {
            if (shadeT) shadeT.style.height = tPct + "%";
            hTop.style.top = tPct + "%";
        }

        document.querySelectorAll(".a4-sheet").forEach(p => {
            p.style.paddingLeft = rulerMarginLeft + "mm";
            p.style.paddingRight = rulerMarginRight + "mm";
            p.style.paddingTop = rulerMarginTop + "mm";
            p.style.textIndent = rulerFirstLine + "mm";
        });
    }
    syncRulers();

    function bindHDrag(el, mode) {
        if (!el) return;
        el.addEventListener("mousedown", (e) => {
            e.preventDefault();
            const onMove = (ev) => {
                const rect = wrap.getBoundingClientRect();
                const mm = Math.round(((ev.clientX - rect.left) / rect.width) * 210);
                if (mode === "left") rulerMarginLeft = Math.max(8, Math.min(70, mm));
                else if (mode === "first") rulerFirstLine = Math.max(-10, Math.min(40, mm - rulerMarginLeft));
                else rulerMarginRight = Math.max(8, Math.min(70, 210 - mm));
                syncRulers();
            };
            const onUp = () => {
                document.removeEventListener("mousemove", onMove);
                document.removeEventListener("mouseup", onUp);
            };
            document.addEventListener("mousemove", onMove);
            document.addEventListener("mouseup", onUp);
        });
    }
    bindHDrag(hLeft, "left");
    bindHDrag(hFirst, "first");
    bindHDrag(hRight, "right");

    if (hTop && vwrap) {
        hTop.addEventListener("mousedown", (e) => {
            e.preventDefault();
            const onMove = (ev) => {
                const rect = vwrap.getBoundingClientRect();
                const mm = Math.round(((ev.clientY - rect.top) / rect.height) * 297);
                rulerMarginTop = Math.max(8, Math.min(70, mm));
                syncRulers();
            };
            const onUp = () => {
                document.removeEventListener("mousemove", onMove);
                document.removeEventListener("mouseup", onUp);
            };
            document.addEventListener("mousemove", onMove);
            document.addEventListener("mouseup", onUp);
        });
    }
}

// === 4. РАБОЧАЯ СМЕНА ШРИФТОВ, РАЗМЕРА, ЦВЕТА И ВСТАВКА ТАБЛИЦЫ ===
window.execOfficeFormat = function(cmd, val = null) {
    restoreSavedSelection();
    document.execCommand(cmd, false, val);
    if (officeMode === "word") syncWordPagesFromDom();
    saveCurrentOfficeDoc();
};

window.applyOfficeFont = function(fontName) {
    restoreSavedSelection();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
        document.execCommand("styleWithCSS", false, true);
        document.execCommand("fontName", false, fontName);
    } else if (officeMode === "word") {
        document.querySelectorAll(".a4-sheet").forEach(p => p.style.fontFamily = `'${fontName}', sans-serif`);
    } else if (officeMode === "slides") {
        document.getElementById("slideCanvas").style.fontFamily = `'${fontName}', sans-serif`;
    } else {
        document.getElementById("ulhSpreadsheet").style.fontFamily = `'${fontName}', sans-serif`;
    }
    if (officeMode === "word") syncWordPagesFromDom();
    saveCurrentOfficeDoc();
};

window.applyOfficeFontSize = function(px) {
    restoreSavedSelection();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
        const range = sel.getRangeAt(0);
        const span = document.createElement("span");
        span.style.fontSize = px + "px";
        span.appendChild(range.extractContents());
        range.insertNode(span);
    }
    if (officeMode === "word") syncWordPagesFromDom();
    saveCurrentOfficeDoc();
};

window.applyOfficeColor = function(cmd, color) {
    restoreSavedSelection();
    document.execCommand("styleWithCSS", false, true);
    document.execCommand(cmd, false, color);
    if (officeMode === "word") syncWordPagesFromDom();
    saveCurrentOfficeDoc();
};

window.insertWordTable = function() {
    const r = parseInt(prompt("Qatorlar soni:", "3"), 10);
    const c = parseInt(prompt("Ustunlar soni:", "3"), 10);
    if (!r || !c || r < 1 || c < 1) return;
    let html = `<table class="word-table"><tbody>`;
    for (let i = 0; i < Math.min(r, 20); i++) {
        html += `<tr>${Array.from({ length: Math.min(c, 12) }, () => `<td>&nbsp;</td>`).join("")}</tr>`;
    }
    html += `</tbody></table><p><br></p>`;
    restoreSavedSelection();
    document.execCommand("insertHTML", false, html);
    if (officeMode === "word") syncWordPagesFromDom();
    saveCurrentOfficeDoc();
};

window.insertOfficeImage = function() {
    const url = prompt("Rasm havolasini (URL) kiriting:", "https://");
    if (url && url.startsWith("http")) {
        restoreSavedSelection();
        document.execCommand("insertImage", false, url);
        if (officeMode === "word") syncWordPagesFromDom();
        saveCurrentOfficeDoc();
    }
};

window.insertOfficeLink = function() {
    const url = prompt("Havola (URL) kiriting:", "https://");
    if (url && url.startsWith("http")) {
        restoreSavedSelection();
        document.execCommand("createLink", false, url);
        if (officeMode === "word") syncWordPagesFromDom();
        saveCurrentOfficeDoc();
    }
};

// === 5. КОНСТРУКТОР ГРАФИКОВ (ВСТАВКА В WORD, SLIDES, TABLES) ===
window.openOfficeChartModal = function() {
    renderOfficeChartRows();
    renderOfficeChartPreview();
    document.getElementById("officeChartModal").classList.add("open");
};

function renderOfficeChartRows() {
    document.getElementById("ocRows").innerHTML = officeChartItems.map((it, i) => `
        <div style="display:grid; grid-template-columns:1fr 80px 34px 28px; gap:6px;">
            <input class="bib-custom-input" value="${it.label}" oninput="officeChartItems[${i}].label=this.value; renderOfficeChartPreview()">
            <input type="number" class="bib-custom-input" value="${it.val}" oninput="officeChartItems[${i}].val=+this.value||0; renderOfficeChartPreview()">
            <input type="color" value="${it.color}" style="width:34px;height:36px;border:none;" oninput="officeChartItems[${i}].color=this.value; renderOfficeChartPreview()">
            <button type="button" class="cw-del-btn" onclick="officeChartItems.splice(${i},1); renderOfficeChartRows(); renderOfficeChartPreview()">×</button>
        </div>
    `).join("");
}

window.addOfficeChartRow = function() {
    const colors = ["#0284C7", "#10B981", "#8B5CF6", "#F59E0B", "#EF4444"];
    officeChartItems.push({ label: "Yangi", val: 30, color: colors[officeChartItems.length % colors.length] });
    renderOfficeChartRows();
    renderOfficeChartPreview();
};

function buildOfficeChartSvg() {
    const title = document.getElementById("ocTitle")?.value || "Grafik";
    const type = document.getElementById("ocType")?.value || "bar";
    const W = 480, H = 220;
    if (type === "bar") {
        const max = Math.max(...officeChartItems.map(x => x.val), 1);
        const bars = officeChartItems.map((it, i) => {
            const y = 44 + i * 32;
            const bw = Math.round((it.val / max) * 280);
            return `<text x="16" y="${y + 15}" font-size="12" font-weight="700" fill="#1E293B">${it.label}</text>
                    <rect x="110" y="${y + 3}" width="${bw}" height="16" rx="6" fill="${it.color}"/>
                    <text x="${118 + bw}" y="${y + 15}" font-size="12" font-weight="800" fill="#0F172A">${it.val}</text>`;
        }).join("");
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${Math.max(H, 60 + officeChartItems.length * 32)}" viewBox="0 0 ${W} ${Math.max(H, 60 + officeChartItems.length * 32)}" style="font-family:Manrope,Arial,sans-serif;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;">
            <text x="16" y="28" font-size="16" font-weight="800" fill="#0F172A">${title}</text>${bars}</svg>`;
    } else {
        const total = officeChartItems.reduce((s, x) => s + Math.max(0, x.val), 0) || 1;
        let offset = 0;
        const r = 56, c = 2 * Math.PI * r;
        const arcs = officeChartItems.map(it => {
            const len = (Math.max(0, it.val) / total) * c;
            const el = `<circle cx="105" cy="125" r="${r}" fill="none" stroke="${it.color}" stroke-width="24" stroke-dasharray="${len} ${c}" stroke-dashoffset="${-offset}" transform="rotate(-90 105 125)"/>`;
            offset += len;
            return el;
        }).join("");
        const legend = officeChartItems.map((it, i) => `
            <circle cx="220" cy="${68 + i * 24}" r="5" fill="${it.color}"/>
            <text x="232" y="${72 + i * 24}" font-size="12" font-weight="700" fill="#1E293B">${it.label}: ${it.val}</text>`).join("");
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="font-family:Manrope,Arial,sans-serif;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;">
            <text x="16" y="28" font-size="16" font-weight="800" fill="#0F172A">${title}</text>${arcs}${legend}</svg>`;
    }
}

window.renderOfficeChartPreview = function() {
    document.getElementById("ocPreview").innerHTML = buildOfficeChartSvg();
};

window.insertChartIntoOffice = function() {
    const svg = buildOfficeChartSvg();
    const dataUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    const imgHtml = `<p><img src="${dataUrl}" alt="Grafik" style="max-width:100%; border-radius:10px;"></p>`;

    if (officeMode === "word") {
        const firstPage = document.querySelector(".a4-sheet");
        if (firstPage) { firstPage.innerHTML += imgHtml; wordPages[0] = firstPage.innerHTML; }
    } else if (officeMode === "slides") {
        slidesData[activeSlideIdx].body += imgHtml;
        loadActiveSlideToCanvas();
    } else {
        document.getElementById("tablesChartsShelf").innerHTML += imgHtml;
    }
    saveCurrentOfficeDoc();
    document.getElementById("officeChartModal").classList.remove("open");
};

// === 6. TABLES: ФОРМУЛЫ, АВТОСУММА, СОРТИРОВКА ===
function colLetter(n) { return String.fromCharCode(65 + n); }

function evalFormula(raw) {
    const str = String(raw || "").trim();
    if (!str.startsWith("=")) return str;
    try {
        let expr = str.slice(1).toUpperCase();
        const getRangeVals = (c1, r1, c2, r2) => {
            const vals = [];
            for (let c = c1.charCodeAt(0); c <= c2.charCodeAt(0); c++) {
                for (let r = +r1; r <= +r2; r++) {
                    const v = parseFloat(evalFormula(tableData.cells[String.fromCharCode(c) + r]));
                    if (!isNaN(v)) vals.push(v);
                }
            }
            return vals;
        };
        expr = expr.replace(/(SUM|AVG|COUNT|MAX|MIN)\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)/g, (_, fn, c1, r1, c2, r2) => {
            const arr = getRangeVals(c1, r1, c2, r2);
            if (!arr.length) return 0;
            if (fn === "SUM") return arr.reduce((a, b) => a + b, 0);
            if (fn === "AVG") return +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2);
            if (fn === "COUNT") return arr.length;
            if (fn === "MAX") return Math.max(...arr);
            if (fn === "MIN") return Math.min(...arr);
            return 0;
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
    tbl.innerHTML = html + `</tbody>`;
}

window.selectTableCell = function(key) {
    activeCellKey = key;
    document.getElementById("activeCellRef").textContent = key;
    document.getElementById("formulaInput").value = tableData.cells[key] || "";
    document.querySelectorAll("#ulhSpreadsheet td").forEach(td => td.classList.toggle("active-cell", td.dataset.cell === key));
    updatePageCounter();
};
window.commitTableCell = function(key, val) {
    const clean = val.trim();
    if ((tableData.cells[key] || "") !== clean) { tableData.cells[key] = clean; saveCurrentOfficeDoc(); renderSpreadsheet(); }
};
window.handleFormulaKey = function(e) {
    if (e.key === "Enter") { e.preventDefault(); tableData.cells[activeCellKey] = e.target.value; saveCurrentOfficeDoc(); renderSpreadsheet(); }
};
window.applyTableQuickFunc = function(fn) {
    const m = activeCellKey.match(/^([A-Z]+)(\d+)$/);
    if (!m) return;
    const col = m[1], row = parseInt(m[2], 10);
    const endRow = Math.max(1, row - 1);
    tableData.cells[activeCellKey] = `=${fn}(${col}1:${col}${endRow})`;
    saveCurrentOfficeDoc();
    renderSpreadsheet();
};
window.sortTableByActiveCol = function(asc) {
    const col = activeCellKey.replace(/\d+/, "");
    const rowsArr = [];
    for (let r = 2; r <= tableData.rows; r++) {
        const rowObj = {};
        let hasVal = false;
        for (let c = 0; c < tableData.cols; c++) {
            const k = colLetter(c) + r;
            if (tableData.cells[k]) { rowObj[colLetter(c)] = tableData.cells[k]; hasVal = true; }
        }
        if (hasVal) rowsArr.push(rowObj);
    }
    rowsArr.sort((a, b) => {
        const va = a[col] || "", vb = b[col] || "";
        const na = parseFloat(va), nb = parseFloat(vb);
        if (!isNaN(na) && !isNaN(nb)) return asc ? na - nb : nb - na;
        return asc ? va.localeCompare(vb) : vb.localeCompare(va);
    });
    for (let r = 2; r <= tableData.rows; r++) {
        for (let c = 0; c < tableData.cols; c++) delete tableData.cells[colLetter(c) + r];
    }
    rowsArr.forEach((rowObj, i) => {
        Object.keys(rowObj).forEach(cl => { tableData.cells[cl + (i + 2)] = rowObj[cl]; });
    });
    saveCurrentOfficeDoc();
    renderSpreadsheet();
};
window.clearActiveTableCell = function() { delete tableData.cells[activeCellKey]; saveCurrentOfficeDoc(); renderSpreadsheet(); };
window.addTableRow = function() { tableData.rows++; renderSpreadsheet(); saveCurrentOfficeDoc(); };
window.addTableCol = function() { if (tableData.cols < 26) { tableData.cols++; renderSpreadsheet(); saveCurrentOfficeDoc(); } };

// === 7. КОНТЕКСТНОЕ МЕНЮ ПКМ + КЛИКАБЕЛЬНАЯ ЗАМЕНА СИНОНИМОВ / ПЕРЕВОДА ===
let lastCtxSelectedText = "";
document.addEventListener("contextmenu", (e) => {
    const insideSheet = e.target.closest(".a4-sheet, #slideCanvas, #ulhSpreadsheet");
    const menu = document.getElementById("officeContextMenu");
    if (!insideSheet || !menu) return;

    e.preventDefault();
    lastCtxSelectedText = (window.getSelection()?.toString() || "").trim();
    const hasSel = lastCtxSelectedText.length > 0;
    const isSingleWord = hasSel && lastCtxSelectedText.split(/\s+/).filter(Boolean).length === 1;

    document.getElementById("ctxSelSep").style.display = hasSel ? "inline-block" : "none";
    document.getElementById("ctxTranslateBtn").style.display = hasSel ? "inline-flex" : "none";
    document.getElementById("ctxSynonymBtn").style.display = isSingleWord ? "inline-flex" : "none";
    document.getElementById("ctxIzohBtn").style.display = isSingleWord ? "inline-flex" : "none";

    menu.style.left = Math.max(12, Math.min(e.clientX - 120, window.innerWidth - 460)) + "px";
    menu.style.top = Math.max(12, e.clientY - 48) + "px";
    menu.classList.add("open");
});

window.closeOfficeContextMenu = function() { document.getElementById("officeContextMenu")?.classList.remove("open"); };
document.addEventListener("click", (e) => {
    if (!e.target.closest("#officeSaveWrap")) document.getElementById("officeSaveWrap")?.classList.remove("open");
    if (!e.target.closest("#officeContextMenu")) closeOfficeContextMenu();
});
window.ctxExec = function(cmd) {
    restoreSavedSelection();
    document.execCommand(cmd);
    if (officeMode === "word") syncWordPagesFromDom();
    closeOfficeContextMenu();
    saveCurrentOfficeDoc();
};
window.ctxPaste = async function() {
    try {
        const t = await navigator.clipboard.readText();
        restoreSavedSelection();
        document.execCommand("insertText", false, t);
        if (officeMode === "word") syncWordPagesFromDom();
        saveCurrentOfficeDoc();
    } catch (_) {}
    closeOfficeContextMenu();
};

window.replaceSelectedOfficeText = function(newText) {
    restoreSavedSelection();
    document.execCommand("insertText", false, newText);
    if (officeMode === "word") syncWordPagesFromDom();
    saveCurrentOfficeDoc();
    document.getElementById("officeQuickResultModal").classList.remove("open");
};

window.ctxAiAction = async function(type) {
    closeOfficeContextMenu();
    if (!lastCtxSelectedText) return;
    const modal = document.getElementById("officeQuickResultModal");
    const body = document.getElementById("officeQuickBody");
    document.getElementById("officeQuickTitle").textContent = type === "synonym" ? `Sinonim: ${lastCtxSelectedText}` : `Tarjima`;
    body.innerHTML = "Yuklanmoqda...";
    modal.classList.add("open");

    const prompt = type === "synonym"
        ? `"${lastCtxSelectedText}" sözi uçun 5 ta eng yaxşi sinonimni vergul bilan ajratib yoz. Ortiqça izoh yozma.`
        : `"${lastCtxSelectedText}" matnini özbek tiliga aniq tarjima qil. Faqat tarjimani yoz.`;

    const res = await fetch(OFFICE_AI_URL, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "custom", customPrompt: prompt, text: lastCtxSelectedText })
    });
    const data = await res.json();
    const raw = (data.result || "").trim();
    if (!raw) { body.textContent = "Natija topilmadi."; return; }

    const items = type === "synonym"
        ? raw.split(/[\n,;]+/).map(s => s.replace(/^\d+[\.\)]\s*/, "").trim()).filter(Boolean).slice(0, 6)
        : [raw];

    const copyIco = `<svg class="ti ti-sm" viewBox="0 0 24 24"><path d="M7 7m0 2.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667z"/><path d="M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1"/></svg>`;
    body.innerHTML = `<div style="font-size:11.5px; color:#64748B; font-weight:700; margin-bottom:6px;">Almaştiriş uçun ustiga bosing:</div><div class="ctx-res-list">` +
        items.map(val => {
            const safe = val.replace(/'/g, "\\'").replace(/"/g, "&quot;");
            return `<div class="ctx-res-row">
                <button type="button" class="ctx-replace-btn" onclick="replaceSelectedOfficeText('${safe}')">${val}</button>
                <button type="button" class="ctx-copy-mini" onclick="navigator.clipboard.writeText('${safe}')" title="Nusxalaş">${copyIco}</button>
            </div>`;
        }).join("") + `</div>`;
};

window.ctxIzohAction = async function() {
    closeOfficeContextMenu();
    if (!lastCtxSelectedText) return;
    const word = typeof lemmatizeUzbekWord === "function" ? lemmatizeUzbekWord(lastCtxSelectedText) : lastCtxSelectedText;
    const modal = document.getElementById("officeQuickResultModal");
    document.getElementById("officeQuickTitle").textContent = `Izohli luğat: ${word}`;
    document.getElementById("officeQuickBody").textContent = "izoh.uz bazasidan qidirilmoqda...";
    modal.classList.add("open");
    const res = await fetch(`${OFFICE_IZOH_URL}?word=${encodeURIComponent(word)}`);
    const data = await res.json();
    document.getElementById("officeQuickBody").innerHTML = (data && data.found && data.definitionHtml) ? data.definitionHtml : "Söz bazada topilmadi.";
};

// === 8. СОХРАНЕНИЕ, УМНАЯ ВСТАВКА, ТРАНСЛИТЕРАЦИЯ, ЗУМ, SLIDES, ИСТОРИЯ, ÖŞA AI ===
window.saveCurrentOfficeDoc = function() {
    localStorage.setItem("ulh_office_title_" + officeMode, document.getElementById("officeDocTitle")?.value || "Yangi hujjat");
    localStorage.setItem("ulh_office_active_mode", officeMode);
    localStorage.setItem("ulh_office_has_draft", "1");
    if (officeMode === "word") localStorage.setItem("ulh_office_word_pages_v2", JSON.stringify(wordPages));
    else if (officeMode === "slides") localStorage.setItem("ulh_office_slides_v1", JSON.stringify(slidesData));
    else localStorage.setItem("ulh_office_tables_v1", JSON.stringify(tableData));
};
window.minimizeOfficeToMain = function() { saveCurrentOfficeDoc(); window.location.href = "/"; };
window.adjustOfficeZoom = function(d) {
    officeZoom = Math.max(0.5, Math.min(2.0, +(officeZoom + d).toFixed(2)));
    document.getElementById("officeZoomWrapper").style.transform = `scale(${officeZoom})`;
    document.getElementById("officeZoomLabel").textContent = Math.round(officeZoom * 100) + "%";
};
document.addEventListener("wheel", (e) => { if (e.ctrlKey) { e.preventDefault(); adjustOfficeZoom(e.deltaY < 0 ? 0.1 : -0.1); } }, { passive: false });

function handleSmartUzbekPaste(e) {
    const txt = (e.clipboardData || window.clipboardData).getData("text/plain");
    if (!txt || txt.length < 3) return;
    const hasUzCyr = /[ўқғҳЎҚҒҲ]/.test(txt);
    const hasUzOld = /(o['‘’`ʻʼ]|g['‘’`ʻʼ]|\b(va|uchun|bilan|shahar|o'zbek)\b)/i.test(txt);
    const isRu = /[а-яё]/i.test(txt) && !hasUzCyr && /\b(что|это|как|для|или|быть)\b/i.test(txt);
    const isEn = /\b(the|and|with|from|that|this)\b/i.test(txt) && !hasUzOld;
    if (!isRu && !isEn && (hasUzCyr || hasUzOld)) {
        pendingPasteNode = e.currentTarget;
        document.getElementById("smartPasteToast")?.classList.add("show");
    }
}
window.confirmSmartPaste = function(ok) {
    document.getElementById("smartPasteToast")?.classList.remove("show");
    if (ok && pendingPasteNode) {
        transliterateElementNodes(pendingPasteNode);
        if (officeMode === "word") syncWordPagesFromDom();
        saveCurrentOfficeDoc();
    }
    pendingPasteNode = null;
};
function transliterateElementNodes(root) {
    if (!root || typeof applyReplacements !== "function") return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    let n; while ((n = w.nextNode())) { if (n.nodeValue.trim()) n.nodeValue = applyReplacements(n.nodeValue); }
}
window.transliterateWholeDocument = function() {
    if (officeMode === "word") {
        document.querySelectorAll(".a4-sheet").forEach((p, i) => { transliterateElementNodes(p); wordPages[i] = p.innerHTML; });
    } else if (officeMode === "slides") {
        slidesData.forEach(s => {
            const t = document.createElement("div"); t.innerHTML = s.title; transliterateElementNodes(t); s.title = t.innerHTML;
            const b = document.createElement("div"); b.innerHTML = s.body; transliterateElementNodes(b); s.body = b.innerHTML;
        });
        loadActiveSlideToCanvas(); renderSlidesSidebar();
    } else {
        Object.keys(tableData.cells).forEach(k => { if (!String(tableData.cells[k]).startsWith("=")) tableData.cells[k] = applyReplacements(tableData.cells[k]); });
        renderSpreadsheet();
    }
    saveCurrentOfficeDoc();
};

// Slides & Slideshow
function renderSlidesSidebar() {
    document.getElementById("slidesThumbList").innerHTML = slidesData.map((s, i) => `
        <div class="slide-thumb ${i === activeSlideIdx ? "active" : ""}" onclick="selectSlide(${i})">
            <div style="color:#EF4444; font-size:10px;">Slayd ${i + 1}</div>
            <div>${(s.title || "").replace(/<[^>]+>/g, "").slice(0, 26) || "Böş"}</div>
        </div>`).join("");
}
function loadActiveSlideToCanvas() {
    const s = slidesData[activeSlideIdx] || slidesData[0];
    document.getElementById("slideTitleBox").innerHTML = s.title;
    document.getElementById("slideBodyBox").innerHTML = s.body;
    document.getElementById("slideCanvas").style.background = s.bg || "#FFFFFF";
    document.getElementById("slideBgColor").value = s.bg || "#FFFFFF";
    updatePageCounter();
}
window.selectSlide = (i) => { activeSlideIdx = i; loadActiveSlideToCanvas(); renderSlidesSidebar(); };
window.addNewSlide = () => { slidesData.push({ title: `Slayd ${slidesData.length + 1}`, body: "Matn...", bg: "#FFFFFF" }); activeSlideIdx = slidesData.length - 1; loadActiveSlideToCanvas(); renderSlidesSidebar(); saveCurrentOfficeDoc(); };
window.duplicateCurrentSlide = () => { slidesData.splice(activeSlideIdx + 1, 0, { ...slidesData[activeSlideIdx] }); activeSlideIdx++; loadActiveSlideToCanvas(); renderSlidesSidebar(); saveCurrentOfficeDoc(); };
window.deleteCurrentSlide = () => { if (slidesData.length <= 1) return; slidesData.splice(activeSlideIdx, 1); activeSlideIdx = Math.max(0, activeSlideIdx - 1); loadActiveSlideToCanvas(); renderSlidesSidebar(); saveCurrentOfficeDoc(); };
window.updateSlideBg = (c) => { slidesData[activeSlideIdx].bg = c; document.getElementById("slideCanvas").style.background = c; saveCurrentOfficeDoc(); };

let slideshowIdx = 0;
window.startSlideshow = () => { slideshowIdx = activeSlideIdx; const ov = document.getElementById("slideshowOverlay"); ov.classList.add("active"); renderSlideshowSlide(); if (ov.requestFullscreen) ov.requestFullscreen().catch(() => {}); };
function renderSlideshowSlide() {
    const s = slidesData[slideshowIdx], st = document.getElementById("slideshowStage");
    st.style.background = s.bg || "#FFFFFF";
    st.innerHTML = `<div style="font-size:42px;font-weight:800;">${s.title}</div><div style="font-size:22px;line-height:1.6;">${s.body}</div>`;
    document.getElementById("slideshowCounter").textContent = `${slideshowIdx + 1} / ${slidesData.length}`;
}
window.navSlideshow = (d) => { slideshowIdx = Math.max(0, Math.min(slidesData.length - 1, slideshowIdx + d)); renderSlideshowSlide(); };
window.exitSlideshow = () => { document.getElementById("slideshowOverlay").classList.remove("active"); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); };

// Импорт / Экспорт / Печать
window.toggleOfficeSaveMenu = (e) => { e.stopPropagation(); document.getElementById("officeSaveWrap").classList.toggle("open"); };
window.triggerOfficeFileOpen = () => document.getElementById("officeFileInput").click();
window.handleOfficeFileOpen = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    const ext = f.name.split(".").pop().toLowerCase();
    document.getElementById("officeDocTitle").value = f.name.replace(/\.[^.]+$/, "");
    if (officeMode === "tables" && window.XLSX) {
        const wb = XLSX.read(await f.arrayBuffer(), { type: "array" });
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
        tableData.cells = {}; tableData.rows = Math.max(20, rows.length + 5);
        rows.forEach((r, ri) => r.forEach((v, ci) => { if (ci < 26 && v !== undefined) tableData.cells[colLetter(ci) + (ri + 1)] = String(v); }));
        renderSpreadsheet();
    } else if (officeMode === "word" && ext === "docx" && window.JSZip) {
        const zip = await JSZip.loadAsync(await f.arrayBuffer());
        const xml = await zip.file("word/document.xml")?.async("string");
        if (xml) {
            const paras = [...xml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)].map(m => [...m[0].matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map(t => t[1]).join("")).filter(Boolean);
            wordPages = [paras.map(p => `<p>${p}</p>`).join("")]; renderWordPages();
        }
    } else {
        const txt = await f.text();
        if (officeMode === "word") { wordPages = [txt.includes("<") ? txt : `<p>${txt.replace(/\n/g, "<br>")}</p>`]; renderWordPages(); }
    }
    saveCurrentOfficeDoc(); e.target.value = "";
};
window.exportOfficeFile = async (ext) => {
    document.getElementById("officeSaveWrap").classList.remove("open");
    const name = (document.getElementById("officeDocTitle").value || "ulh_hujjat").replace(/[^\w\-ÖĞŞÇöğşç ]/g, "_");
    if (ext === "pdf") {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF(officeMode === "slides" ? "l" : "p", "mm", "a4");
        const nodes = officeMode === "word" ? [...document.querySelectorAll(".a4-sheet")] : [document.getElementById(officeMode === "slides" ? "slideCanvas" : "ulhSpreadsheet")];
        for (let i = 0; i < nodes.length; i++) {
            if (i > 0) pdf.addPage();
            const c = await html2canvas(nodes[i], { scale: 2, backgroundColor: "#FFFFFF" });
            const pw = pdf.internal.pageSize.getWidth();
            pdf.addImage(c.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, pw, (c.height * pw) / c.width);
        }
        pdf.save(`${name}.pdf`); return;
    }
    if (officeMode === "tables" && window.XLSX) {
        const aoa = Array.from({ length: tableData.rows }, (_, r) => Array.from({ length: tableData.cols }, (_, c) => evalFormula(tableData.cells[colLetter(c) + (r + 1)] || "")));
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), "ULH Tables"); XLSX.writeFile(wb, `${name}.${ext}`); return;
    }
    const htmlBody = officeMode === "word" ? wordPages.join('<div style="page-break-after:always;"></div>') : slidesData.map(s => `<div style="page-break-after:always;padding:30px;background:${s.bg};"><h1>${s.title}</h1><div>${s.body}</div></div>`).join("");
    const blob = new Blob(["\ufeff", `<html><head><meta charset="utf-8"></head><body>${htmlBody}</body></html>`], { type: "application/octet-stream" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${name}.${ext}`; a.click();
};
window.printOfficeDocument = () => window.print();

// История и Öşa AI
function getHistKey() { return "ulh_office_hist_" + officeMode; }
function pushOfficeHistorySnapshot() {
    const content = JSON.stringify(officeMode === "word" ? wordPages : officeMode === "slides" ? slidesData : tableData);
    let arr = JSON.parse(localStorage.getItem(getHistKey()) || "[]");
    if (arr.length && arr[arr.length - 1].content === content) return;
    arr.push({ time: new Date().toLocaleTimeString("uz-UZ"), content });
    if (arr.length > 30) arr.shift();
    localStorage.setItem(getHistKey(), JSON.stringify(arr));
}
window.openOfficeHistoryModal = () => {
    const arr = JSON.parse(localStorage.getItem(getHistKey()) || "[]");
    if (!arr.length) return alert("Hali tarix saqlanmagan.");
    const sl = document.getElementById("officeHistSlider"); sl.max = arr.length - 1; sl.value = arr.length - 1;
    previewOfficeHistory(); document.getElementById("officeHistoryModal").classList.add("open");
};
window.previewOfficeHistory = () => {
    const arr = JSON.parse(localStorage.getItem(getHistKey()) || "[]"), item = arr[document.getElementById("officeHistSlider").value];
    if (!item) return;
    document.getElementById("officeHistTime").textContent = "Vaqt: " + item.time;
    document.getElementById("officeHistPreview").innerHTML = officeMode === "word" ? JSON.parse(item.content).join("<hr>") : `<pre>${item.content.slice(0, 600)}</pre>`;
};
window.restoreOfficeHistory = () => {
    const arr = JSON.parse(localStorage.getItem(getHistKey()) || "[]"), item = arr[document.getElementById("officeHistSlider").value];
    if (!item) return;
    if (officeMode === "word") { wordPages = JSON.parse(item.content); renderWordPages(); }
    else if (officeMode === "slides") { slidesData = JSON.parse(item.content); loadActiveSlideToCanvas(); renderSlidesSidebar(); }
    else { tableData = JSON.parse(item.content); renderSpreadsheet(); }
    saveCurrentOfficeDoc(); document.getElementById("officeHistoryModal").classList.remove("open");
};

let officeOshaChatHist = JSON.parse(localStorage.getItem("oshaChatHistory") || "[]");
window.toggleOfficeOsha = () => document.getElementById("officeOshaChat").classList.toggle("hidden");
window.clearOfficeOshaChat = () => {
    officeOshaChatHist = [];
    localStorage.removeItem("oshaChatHistory");
    renderOfficeOshaHistory();
};
function renderOfficeOshaHistory() {
    const box = document.getElementById("officeOshaMessages"); if (!box) return;
    box.innerHTML = officeOshaChatHist.slice(-15).map((m, idx) => `
        <div class="office-osha-msg ${m.role === "user" ? "user" : "bot"}">
            <div>${String(m.content || "").replace(/\n/g, "<br>")}</div>
            ${m.role !== "user" ? `<button type="button" class="office-osha-insert-btn" onclick="insertOshaTextToOffice(${idx})"><svg class="ti ti-xs" viewBox="0 0 24 24"><path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4"/><path d="M13.5 6.5l4 4"/></svg> Tahrirlaş</button>` : ""}
        </div>`).join("");
    box.scrollTop = box.scrollHeight;
}
window.insertOshaTextToOffice = (idx) => {
    const text = officeOshaChatHist.slice(-15)[idx]?.content || ""; if (!text) return;
    if (officeMode === "word") { wordPages[wordPages.length - 1] += `<p>${text.replace(/\n/g, "<br>")}</p>`; renderWordPages(); }
    else if (officeMode === "slides") { slidesData[activeSlideIdx].body += `<br>${text.replace(/\n/g, "<br>")}`; loadActiveSlideToCanvas(); }
    else { tableData.cells[activeCellKey] = text.slice(0, 120); renderSpreadsheet(); }
    saveCurrentOfficeDoc();
};
window.sendOfficeOsha = async () => {
    const inp = document.getElementById("officeOshaInput"), text = (inp.value || "").trim(); if (!text) return;
    inp.value = ""; officeOshaChatHist.push({ role: "user", content: text }); renderOfficeOshaHistory();
    try {
        const res = await fetch(OFFICE_AI_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "custom", customPrompt: "Sen Öşa AI yordamçisisan. Qisqa va aniq javob ber.", text }) });
        const data = await res.json();
        officeOshaChatHist.push({ role: "assistant", content: data.result || "Javob olinmadi." });
        localStorage.setItem("oshaChatHistory", JSON.stringify(officeOshaChatHist)); renderOfficeOshaHistory();
    } catch (_) {}
};
