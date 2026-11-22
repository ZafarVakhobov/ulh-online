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

// ==========================================
// === ULH OFFICE v3 — 16 PRO UPGRADES ===
// ==========================================
let pageOrientations = JSON.parse(localStorage.getItem("ulh_office_orients_v1") || "[]");
let pageNumConfig = JSON.parse(localStorage.getItem("ulh_office_pagenum_v1") || '{"pos":"none","align":"center"}');
let activeWordPageIdx = 0;
let selectedImgEl = null;

// 1. Круглые палитры цветов (пресеты + радуга)
const ULH_SWATCHES = ["#0F172A","#334155","#64748B","#EF4444","#F97316","#F59E0B","#10B981","#0284C7","#6366F1","#8B5CF6","#EC4899"];
function initColorPopovers() {
    [["foreColorPop","foreColor","foreColorCircle"], ["backColorPop","hiliteColor","backColorCircle"]].forEach(([popId, cmd, circId]) => {
        const pop = document.getElementById(popId);
        if (!pop) return;
        pop.innerHTML = ULH_SWATCHES.map(c => `<button type="button" class="pop-swatch" style="background:${c}" onmousedown="event.preventDefault()" onclick="pickOfficeSwatch('${cmd}','${c}','${circId}')"></button>`).join("") +
            `<label class="pop-rainbow" title="Boshqa rang"><input type="color" onchange="pickOfficeSwatch('${cmd}', this.value, '${circId}')"></label>`;
    });
}
window.toggleColorPop = (id, e) => { e.stopPropagation(); document.querySelectorAll(".color-pop-wrap").forEach(w => { if (w.id !== id) w.classList.remove("open"); }); document.getElementById(id)?.classList.toggle("open"); };
window.pickOfficeSwatch = (cmd, color, circId) => {
    document.getElementById(circId).style.background = color;
    applyOfficeColor(cmd, color);
    document.querySelectorAll(".color-pop-wrap").forEach(w => w.classList.remove("open"));
};
window.toggleSimpleDrop = (id, e) => { e.stopPropagation(); document.getElementById(id)?.classList.toggle("open"); };
document.addEventListener("click", () => document.querySelectorAll(".color-pop-wrap, #bulletMenuWrap, #lineHeightWrap, #pageNumMenuWrap").forEach(el => el.classList.remove("open")));

// 2. Буллеты и межстрочный интервал
window.applyBulletStyle = (styleType) => {
    restoreSavedSelection();
    document.execCommand("insertUnorderedList");
    const sel = window.getSelection();
    const ul = sel?.anchorNode?.parentElement?.closest("ul");
    if (ul) ul.style.listStyleType = styleType;
    document.getElementById("bulletMenuWrap")?.classList.remove("open");
    syncWordPagesFromDom(); saveCurrentOfficeDoc();
};
window.applyLineHeight = (lh) => {
    restoreSavedSelection();
    const sel = window.getSelection();
    const blk = sel?.anchorNode?.parentElement?.closest("p, div, li, h1, h2, h3");
    if (blk && !blk.classList.contains("a4-sheet")) blk.style.lineHeight = lh;
    else document.querySelectorAll(".a4-sheet").forEach(p => p.style.lineHeight = lh);
    document.getElementById("lineHeightWrap")?.classList.remove("open");
    syncWordPagesFromDom(); saveCurrentOfficeDoc();
};

// 3. Вставка графика строго по позиции курсора
window.insertChartIntoOffice = function() {
    const svg = buildOfficeChartSvg();
    const dataUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    const imgHtml = `<img src="${dataUrl}" class="office-resizable-img" alt="Grafik" style="max-width:100%; border-radius:10px; display:inline-block;">`;
    if (officeMode === "word" || officeMode === "slides") {
        restoreSavedSelection();
        document.execCommand("insertHTML", false, imgHtml);
        if (officeMode === "word") syncWordPagesFromDom();
        else { slidesData[activeSlideIdx].body = document.getElementById("slideBodyBox").innerHTML; }
    } else {
        document.getElementById("tablesChartsShelf").innerHTML += `<p>${imgHtml}</p>`;
    }
    saveCurrentOfficeDoc();
    document.getElementById("officeChartModal").classList.remove("open");
};

// 4. Параметры страницы (Ориентация + Поля)
let psSelectedOrient = "portrait";
window.openPageSetupModal = () => {
    document.getElementById("psTop").value = rulerMarginTop;
    document.getElementById("psLeft").value = rulerMarginLeft;
    document.getElementById("psRight").value = rulerMarginRight;
    document.getElementById("pageSetupModal").classList.add("open");
};
window.selectPageOrient = (o) => {
    psSelectedOrient = o;
    document.getElementById("psPortraitBtn").classList.toggle("active", o === "portrait");
    document.getElementById("psLandscapeBtn").classList.toggle("active", o === "landscape");
};
window.applyPageSetup = () => {
    rulerMarginTop = +document.getElementById("psTop").value || 20;
    rulerMarginLeft = +document.getElementById("psLeft").value || 20;
    rulerMarginRight = +document.getElementById("psRight").value || 20;
    const scope = document.getElementById("psScope").value;
    document.querySelectorAll(".a4-sheet").forEach((p, i) => {
        if (scope === "all" || i >= activeWordPageIdx) {
            pageOrientations[i] = psSelectedOrient;
            p.classList.toggle("landscape", psSelectedOrient === "landscape");
        }
        p.style.paddingTop = rulerMarginTop + "mm";
        p.style.paddingLeft = rulerMarginLeft + "mm";
        p.style.paddingRight = rulerMarginRight + "mm";
    });
    localStorage.setItem("ulh_office_orients_v1", JSON.stringify(pageOrientations));
    document.getElementById("pageSetupModal").classList.remove("open");
};

// 5. Конструктор таблицы (цвет шапки, зебра, фиксированный thead)
window.openTableBuilderModal = () => document.getElementById("tableBuilderModal").classList.add("open");
window.confirmInsertWordTable = () => {
    const r = Math.min(30, Math.max(1, +document.getElementById("tbRows").value || 3));
    const c = Math.min(12, Math.max(1, +document.getElementById("tbCols").value || 3));
    const hBg = document.getElementById("tbHeadBg").value;
    const hCol = document.getElementById("tbHeadColor").value;
    const zebra = document.getElementById("tbZebra").checked ? "zebra" : "";
    let html = `<table class="word-table ${zebra}"><thead><tr style="background:${hBg};color:${hCol};">${Array.from({length:c}, (_,i)=>`<th>Sarlavha ${i+1}</th>`).join("")}</tr></thead><tbody>`;
    for (let i = 1; i < r; i++) html += `<tr>${Array.from({length:c}, ()=>`<td>&nbsp;</td>`).join("")}</tr>`;
    html += `</tbody></table><p><br></p>`;
    restoreSavedSelection();
    document.execCommand("insertHTML", false, html);
    syncWordPagesFromDom(); saveCurrentOfficeDoc();
    document.getElementById("tableBuilderModal").classList.remove("open");
};

// 6. Нумерация страниц
window.setPageNumbers = (pos, align) => {
    pageNumConfig = { pos, align };
    localStorage.setItem("ulh_office_pagenum_v1", JSON.stringify(pageNumConfig));
    applyPageNumbersToSheets();
    document.getElementById("pageNumMenuWrap")?.classList.remove("open");
};
function applyPageNumbersToSheets() {
    document.querySelectorAll(".a4-sheet").forEach((p, i) => {
        p.querySelectorAll(".a4-page-num").forEach(n => n.remove());
        if (pageNumConfig.pos !== "none") {
            const num = document.createElement("div");
            num.className = `a4-page-num ${pageNumConfig.pos} ${pageNumConfig.align}`;
            num.contentEditable = "false";
            num.textContent = String(i + 1);
            p.appendChild(num);
        }
        if (pageOrientations[i] === "landscape") p.classList.add("landscape");
    });
}

// 7. Загрузка картинок (URL или локальный файл) + Ресайз + Обтекание
window.openImageInsertModal = () => document.getElementById("imageInsertModal").classList.add("open");
window.confirmInsertImageUrl = () => {
    const url = (document.getElementById("imgUrlInput").value || "").trim();
    if (url) insertConstrainedImage(url);
    document.getElementById("imageInsertModal").classList.remove("open");
};
window.handleLocalImageUpload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { insertConstrainedImage(reader.result); document.getElementById("imageInsertModal").classList.remove("open"); };
    reader.readAsDataURL(file);
    e.target.value = "";
};
function insertConstrainedImage(src) {
    restoreSavedSelection();
    document.execCommand("insertHTML", false, `<img src="${src}" class="office-resizable-img" style="max-width:100%; height:auto; border-radius:6px;">`);
    if (officeMode === "word") syncWordPagesFromDom();
    saveCurrentOfficeDoc();
}

document.addEventListener("click", (e) => {
    const img = e.target.closest(".a4-sheet img, #slideCanvas img");
    const box = document.getElementById("imgFloatControls");
    if (img && box) {
        selectedImgEl = img;
        const r = img.getBoundingClientRect();
        box.style.left = r.left + "px"; box.style.top = r.top + "px";
        box.style.width = r.width + "px"; box.style.height = r.height + "px";
        box.classList.add("active");
    } else if (!e.target.closest("#imgFloatControls")) {
        box?.classList.remove("active");
        document.getElementById("imgWrapMenu")?.classList.remove("open");
        selectedImgEl = null;
    }
});
window.toggleImgWrapMenu = (e) => { e.stopPropagation(); document.getElementById("imgWrapMenu")?.classList.toggle("open"); };
window.applyImgWrap = (mode) => {
    if (!selectedImgEl) return;
    selectedImgEl.style.float = "none"; selectedImgEl.style.display = "inline-block";
    selectedImgEl.style.position = "static"; selectedImgEl.style.zIndex = ""; selectedImgEl.style.margin = "4px";
    if (mode === "left") { selectedImgEl.style.float = "left"; selectedImgEl.style.margin = "4px 14px 8px 0"; }
    else if (mode === "right") { selectedImgEl.style.float = "right"; selectedImgEl.style.margin = "4px 0 8px 14px"; }
    else if (mode === "topbottom") { selectedImgEl.style.display = "block"; selectedImgEl.style.margin = "10px auto"; }
    else if (mode === "behind") { selectedImgEl.style.position = "relative"; selectedImgEl.style.zIndex = "-1"; }
    else if (mode === "front") { selectedImgEl.style.position = "relative"; selectedImgEl.style.zIndex = "10"; }
    document.getElementById("imgWrapMenu")?.classList.remove("open");
    syncWordPagesFromDom(); saveCurrentOfficeDoc();
};

// Ресайз картинки за угол строго в пределах линейки
document.getElementById("imgResizeCorner")?.addEventListener("mousedown", (e) => {
    e.preventDefault(); e.stopPropagation();
    if (!selectedImgEl) return;
    const startX = e.clientX, startW = selectedImgEl.offsetWidth;
    const maxW = selectedImgEl.closest(".a4-sheet, #slideCanvas")?.clientWidth - 40 || 600;
    const onMove = (ev) => {
        const nw = Math.max(60, Math.min(maxW, startW + (ev.clientX - startX)));
        selectedImgEl.style.width = nw + "px";
        const r = selectedImgEl.getBoundingClientRect();
        const box = document.getElementById("imgFloatControls");
        box.style.width = r.width + "px"; box.style.height = r.height + "px";
    };
    const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); syncWordPagesFromDom(); saveCurrentOfficeDoc(); };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
});

// 8. Уравнения
window.openEquationModal = () => document.getElementById("equationModal").classList.add("open");
window.insertEquationTemplate = (type) => {
    const map = {
        quad: `x = (−b ± √(b² − 4ac)) / 2a`,
        binom: `(x + a)ⁿ = Σ C(n, k) xᵏ aⁿ⁻ᵏ`,
        circle: `A = πr²`,
        taylor: `eˣ = 1 + x/1! + x²/2! + x³/3! + …`,
        fourier: `f(x) = a₀ + Σ (aₙ cos(nπx/L) + bₙ sin(nπx/L))`,
        frac: `a / b = c`
    };
    restoreSavedSelection();
    document.execCommand("insertHTML", false, `<span class="office-eq-box" contenteditable="true">${map[type] || "y = f(x)"}</span>&nbsp;`);
    document.getElementById("equationModal").classList.remove("open");
    syncWordPagesFromDom(); saveCurrentOfficeDoc();
};

// 9. Активные стили + ссылка/удаление ссылки в ПКМ
const ICO_LINK = `<svg class="ti" viewBox="0 0 24 24"><path d="M9 15l6 -6"/><path d="M11 6l.463 -.536a5 5 0 0 1 7.071 7.072l-.534 .464"/><path d="M13 18l-.397 .534a5.068 5.068 0 0 1 -7.127 0a4.972 4.972 0 0 1 0 -7.071l.524 -.463"/></svg>`;
const ICO_UNLINK = `<svg class="ti" viewBox="0 0 24 24"><path d="M17 22v-2"/><path d="M9 15l6 -6"/><path d="M11 6l.463 -.536a5 5 0 0 1 7.071 7.072l-.534 .464"/><path d="M13 18l-.397 .534a5.068 5.068 0 0 1 -7.127 0a4.972 4.972 0 0 1 0 -7.071l.524 -.463"/><path d="M20 17h2"/><path d="M2 7h2"/><path d="M7 2v2"/></svg>`;

document.addEventListener("contextmenu", () => {
    setTimeout(() => {
        ["Bold","Italic","Underline","Strike"].forEach(st => {
            const cmd = st === "Strike" ? "strikeThrough" : st.toLowerCase();
            document.getElementById("ctx" + st)?.classList.toggle("is-active", document.queryCommandState(cmd));
        });
        const sel = window.getSelection();
        const inLink = !!sel?.anchorNode?.parentElement?.closest("a");
        const lBtn = document.getElementById("ctxLinkBtn");
        if (lBtn) {
            lBtn.innerHTML = inLink ? ICO_UNLINK : ICO_LINK;
            lBtn.title = inLink ? "Havolani öçiriş" : "Havola qöşiş";
            lBtn.classList.toggle("is-active", inLink);
            lBtn.dataset.unlink = inLink ? "1" : "0";
        }
    }, 5);
});
window.ctxToggleLink = () => {
    const lBtn = document.getElementById("ctxLinkBtn");
    restoreSavedSelection();
    if (lBtn?.dataset.unlink === "1") document.execCommand("unlink");
    else insertOfficeLink();
    closeOfficeContextMenu();
    syncWordPagesFromDom(); saveCurrentOfficeDoc();
};

// 10. Глобальный Ctrl+A по всем страницам Word + плашки форматов сохранения
document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a" && officeMode === "word" && e.target.closest(".a4-sheet")) {
        e.preventDefault();
        const container = document.getElementById("wordPagesContainer");
        const range = document.createRange();
        range.selectNodeContents(container);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }
});

// Переопределяем плашки в меню сохранения (цветные бейджи как на основном сайте)
const _origApplyModeUI = applyOfficeModeUI;
applyOfficeModeUI = function(mode) {
    _origApplyModeUI(mode);
    const saveMenu = document.getElementById("officeSaveMenu");
    if (mode === "word") {
        saveMenu.innerHTML = `<button onclick="exportOfficeFile('doc')"><span class="ext-badge doc">.DOC</span> Word 97-2003</button><button onclick="exportOfficeFile('docx')"><span class="ext-badge docx">.DOCX</span> Word hujjat</button><button onclick="exportOfficeFile('rtf')"><span class="ext-badge rtf">.RTF</span> Rich Text</button><button onclick="exportOfficeFile('pdf')"><span class="ext-badge pdf">.PDF</span> PDF hujjat</button>`;
    } else if (mode === "slides") {
        saveMenu.innerHTML = `<button onclick="exportOfficeFile('ppt')"><span class="ext-badge ppt">.PPT</span> PowerPoint</button><button onclick="exportOfficeFile('pptx')"><span class="ext-badge pptx">.PPTX</span> Taqdimot</button><button onclick="exportOfficeFile('pdf')"><span class="ext-badge pdf">.PDF</span> PDF slaydlar</button>`;
    } else {
        saveMenu.innerHTML = `<button onclick="exportOfficeFile('xlsx')"><span class="ext-badge xlsx">.XLSX</span> Excel jadval</button><button onclick="exportOfficeFile('xls')"><span class="ext-badge xls">.XLS</span> Excel 97-2003</button><button onclick="exportOfficeFile('xml')"><span class="ext-badge xml">.XML</span> XML jadval</button><button onclick="exportOfficeFile('pdf')"><span class="ext-badge pdf">.PDF</span> PDF jadval</button>`;
    }
    applyPageNumbersToSheets();
};

document.addEventListener("DOMContentLoaded", () => {
    initColorPopovers();
    setTimeout(applyPageNumbersToSheets, 150);
});


// ==========================================
// === ULH OFFICE v4 — 11 PRECISION FIXES ===
// ==========================================

// 1. Взаимоисключающее открытие всех выпадающих меню
function closeAllOfficeMenus(exceptId = null) {
    ["officeSaveWrap", "foreColorWrap", "backColorWrap", "bulletMenuWrap", "lineHeightWrap", "pageNumMenuWrap"]
        .forEach(id => { if (id !== exceptId) document.getElementById(id)?.classList.remove("open"); });
    document.getElementById("officeContextMenu")?.classList.remove("open");
}
window.toggleOfficeSaveMenu = (e) => { e.stopPropagation(); closeAllOfficeMenus("officeSaveWrap"); document.getElementById("officeSaveWrap")?.classList.toggle("open"); };
window.toggleColorPop = (id, e) => { e.stopPropagation(); closeAllOfficeMenus(id); document.getElementById(id)?.classList.toggle("open"); };
window.toggleSimpleDrop = (id, e) => { e.stopPropagation(); closeAllOfficeMenus(id); document.getElementById(id)?.classList.toggle("open"); };

// 2. Починенная линейка (3 бегунка слева + 1 справа + вертикальная) + адаптация под ориентацию
let currentDocWidthMm = 210;
let currentDocHeightMm = 297;

function rebuildRulersForOrientation(isLandscape) {
    currentDocWidthMm = isLandscape ? 297 : 210;
    currentDocHeightMm = isLandscape ? 210 : 297;

    const wrap = document.getElementById("wordRulerWrap");
    const vwrap = document.getElementById("wordVRulerWrap");
    const ticks = document.getElementById("wordRulerTicks");
    const vticks = document.getElementById("wordVRulerTicks");
    if (!wrap || !vwrap) return;

    wrap.style.width = currentDocWidthMm + "mm";
    vwrap.style.height = currentDocHeightMm + "mm";
    if (ticks) ticks.innerHTML = Array.from({ length: Math.floor(currentDocWidthMm / 10) }, (_, i) => `<div class="ruler-cm">${i + 1}</div>`).join("");
    if (vticks) vticks.innerHTML = Array.from({ length: Math.floor(currentDocHeightMm / 10) }, (_, i) => `<div class="vruler-cm">${i + 1}</div>`).join("");
    syncAllRulerHandles();
}

function syncAllRulerHandles() {
    const hFirst = document.getElementById("rulerFirstLineHandle");
    const hHang = document.getElementById("rulerHangingHandle");
    const hBoth = document.getElementById("rulerBothHandle");
    const hRight = document.getElementById("rulerRightHandle");
    const hTop = document.getElementById("vrulerTopHandle");

    const lPct = (rulerMarginLeft / currentDocWidthMm) * 100;
    const rPct = (rulerMarginRight / currentDocWidthMm) * 100;
    const fPct = ((rulerMarginLeft + rulerFirstLine) / currentDocWidthMm) * 100;
    const tPct = (rulerMarginTop / currentDocHeightMm) * 100;

    const sL = document.getElementById("rulerShadeLeft");
    const sR = document.getElementById("rulerShadeRight");
    const sT = document.getElementById("vrulerShadeTop");
    if (sL) sL.style.width = lPct + "%";
    if (sR) sR.style.width = rPct + "%";
    if (sT) sT.style.height = tPct + "%";

    if (hFirst) hFirst.style.left = fPct + "%";
    if (hHang) hHang.style.left = lPct + "%";
    if (hBoth) hBoth.style.left = lPct + "%";
    if (hRight) hRight.style.left = (100 - rPct) + "%";
    if (hTop) hTop.style.top = tPct + "%";

    document.querySelectorAll(".a4-sheet").forEach(p => {
        p.style.paddingLeft = rulerMarginLeft + "mm";
        p.style.paddingRight = rulerMarginRight + "mm";
        p.style.paddingTop = rulerMarginTop + "mm";
        p.style.textIndent = rulerFirstLine + "mm";
    });
}

function bindFixedRulerEvents() {
    const wrap = document.getElementById("wordRulerWrap");
    const vwrap = document.getElementById("wordVRulerWrap");
    if (!wrap) return;

    const dragH = (el, mode) => {
        if (!el) return;
        el.onmousedown = (e) => {
            e.preventDefault();
            const onMove = (ev) => {
                const rect = wrap.getBoundingClientRect();
                const mm = Math.round(((ev.clientX - rect.left) / rect.width) * currentDocWidthMm);
                if (mode === "first") rulerFirstLine = Math.max(-15, Math.min(45, mm - rulerMarginLeft));
                else if (mode === "hang" || mode === "both") rulerMarginLeft = Math.max(8, Math.min(80, mm));
                else if (mode === "right") rulerMarginRight = Math.max(8, Math.min(80, currentDocWidthMm - mm));
                syncAllRulerHandles();
            };
            const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
            document.addEventListener("mousemove", onMove);
            document.addEventListener("mouseup", onUp);
        };
    };
    dragH(document.getElementById("rulerFirstLineHandle"), "first");
    dragH(document.getElementById("rulerHangingHandle"), "hang");
    dragH(document.getElementById("rulerBothHandle"), "both");
    dragH(document.getElementById("rulerRightHandle"), "right");

    const hTop = document.getElementById("vrulerTopHandle");
    if (hTop && vwrap) {
        hTop.onmousedown = (e) => {
            e.preventDefault();
            const onMove = (ev) => {
                const rect = vwrap.getBoundingClientRect();
                const mm = Math.round(((ev.clientY - rect.top) / rect.height) * currentDocHeightMm);
                rulerMarginTop = Math.max(8, Math.min(70, mm));
                syncAllRulerHandles();
            };
            const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
            document.addEventListener("mousemove", onMove);
            document.addEventListener("mouseup", onUp);
        };
    }
}

// Перехватываем applyPageSetup, чтобы линейки перестраивались под ориентацию
const _origApplyPageSetup = window.applyPageSetup;
window.applyPageSetup = function() {
    _origApplyPageSetup();
    rebuildRulersForOrientation(psSelectedOrient === "landscape");
};

// 3. Кнопки + (строка и столбец) при наведении на таблицу в Word
let hoveredWordTable = null;
document.addEventListener("mousemove", (e) => {
    const tbl = e.target.closest(".a4-sheet .word-table");
    const rowBtn = document.getElementById("tblAddRowBtn");
    const colBtn = document.getElementById("tblAddColBtn");
    if (!rowBtn || !colBtn) return;

    if (tbl) {
        hoveredWordTable = tbl;
        const r = tbl.getBoundingClientRect();
        rowBtn.style.left = (r.left + r.width / 2 - 12) + "px";
        rowBtn.style.top = (r.bottom + 6) + "px";
        colBtn.style.left = (r.right + 6) + "px";
        colBtn.style.top = (r.top + r.height / 2 - 12) + "px";
        rowBtn.classList.add("show");
        colBtn.classList.add("show");
    } else if (!e.target.closest(".tbl-float-plus")) {
        rowBtn.classList.remove("show");
        colBtn.classList.remove("show");
    }
});

window.addWordTableRow = () => {
    if (!hoveredWordTable) return;
    const tbody = hoveredWordTable.querySelector("tbody") || hoveredWordTable;
    const cols = hoveredWordTable.rows[0]?.cells.length || 3;
    const tr = document.createElement("tr");
    tr.innerHTML = Array.from({ length: cols }, () => `<td>&nbsp;</td>`).join("");
    tbody.appendChild(tr);
    syncWordPagesFromDom(); saveCurrentOfficeDoc();
};

window.addWordTableCol = () => {
    if (!hoveredWordTable) return;
    [...hoveredWordTable.rows].forEach((row, idx) => {
        const cell = document.createElement(idx === 0 && row.parentElement.tagName === "THEAD" ? "th" : "td");
        cell.innerHTML = idx === 0 && row.parentElement.tagName === "THEAD" ? `Sarlavha ${row.cells.length + 1}` : "&nbsp;";
        row.appendChild(cell);
    });
    syncWordPagesFromDom(); saveCurrentOfficeDoc();
};

// 4. Дробь с числителем и знаменателем в формулах
const _origInsertEq = window.insertEquationTemplate;
window.insertEquationTemplate = function(type) {
    if (type === "frac") {
        restoreSavedSelection();
        document.execCommand("insertHTML", false,
            `<span class="office-eq-box" contenteditable="true"><span class="math-frac"><span class="math-num">a</span><span class="math-den">b</span></span></span>&nbsp;`
        );
        document.getElementById("equationModal").classList.remove("open");
        syncWordPagesFromDom(); saveCurrentOfficeDoc();
        return;
    }
    _origInsertEq(type);
};

// 5. Кликабельные ссылки в новом окне (внутри contenteditable)
document.addEventListener("click", (e) => {
    const link = e.target.closest(".a4-sheet a, #slideCanvas a");
    if (link && link.href) {
        e.preventDefault();
        window.open(link.href, "_blank", "noopener,noreferrer");
    }
});

// 6. Фикс полей графика и удаление обводки SVG
window.renderOfficeChartRows = function() {
    document.getElementById("ocRows").innerHTML = officeChartItems.map((it, i) => `
        <div style="display:grid; grid-template-columns:minmax(0,1fr) 72px 34px 28px; gap:6px; align-items:center;">
            <input class="bib-custom-input" value="${it.label}" oninput="officeChartItems[${i}].label=this.value; renderOfficeChartPreview()">
            <input type="number" class="bib-custom-input" value="${it.val}" oninput="officeChartItems[${i}].val=+this.value||0; renderOfficeChartPreview()">
            <input type="color" value="${it.color}" style="width:34px;height:36px;border:none;padding:0;cursor:pointer;" oninput="officeChartItems[${i}].color=this.value; renderOfficeChartPreview()">
            <button type="button" class="cw-del-btn" onclick="officeChartItems.splice(${i},1); renderOfficeChartRows(); renderOfficeChartPreview()">×</button>
        </div>
    `).join("");
};
const _origBuildChart = buildOfficeChartSvg;
buildOfficeChartSvg = function() {
    return _origBuildChart().replace(/border:1px solid #E2E8F0;/g, "border:none;");
};

// 7. Произвольная обрезка изображений (Crop)
window.openImgCropModal = () => {
    if (!selectedImgEl) return;
    ["cropTop","cropBottom","cropLeft","cropRight"].forEach(id => document.getElementById(id).value = 0);
    document.getElementById("imgWrapMenu")?.classList.remove("open");
    document.getElementById("imgCropModal").classList.add("open");
    updateCropPreview();
};
window.updateCropPreview = () => {
    if (!selectedImgEl) return;
    const canvas = document.getElementById("imgCropPreview");
    const ctx = canvas.getContext("2d");
    const nw = selectedImgEl.naturalWidth || selectedImgEl.width;
    const nh = selectedImgEl.naturalHeight || selectedImgEl.height;
    const t = (+document.getElementById("cropTop").value / 100) * nh;
    const b = (+document.getElementById("cropBottom").value / 100) * nh;
    const l = (+document.getElementById("cropLeft").value / 100) * nw;
    const r = (+document.getElementById("cropRight").value / 100) * nw;
    const cw = Math.max(10, nw - l - r), ch = Math.max(10, nh - t - b);
    canvas.width = cw; canvas.height = ch;
    ctx.drawImage(selectedImgEl, l, t, cw, ch, 0, 0, cw, ch);
};
window.applyImgCrop = () => {
    if (!selectedImgEl) return;
    const canvas = document.getElementById("imgCropPreview");
    selectedImgEl.src = canvas.toDataURL("image/png");
    document.getElementById("imgCropModal").classList.remove("open");
    document.getElementById("imgFloatControls")?.classList.remove("active");
    syncWordPagesFromDom(); saveCurrentOfficeDoc();
};

// Запуск починенной линейки при загрузке
document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
        const isLand = pageOrientations[0] === "landscape";
        rebuildRulersForOrientation(isLand);
        bindFixedRulerEvents();
    }, 100);
});

// ==========================================
// === ULH OFFICE v5 — CARET INSERT, ACTIVE RULER, TABLE +, QUOTES, STATS ===
// ==========================================

// 1. Вертикальная линейка следует за активной страницей (где курсор)
function syncActivePageAndVRuler(pageEl) {
    if (!pageEl) return;
    const idx = parseInt(pageEl.dataset.pageIndex, 10);
    if (isNaN(idx)) return;
    activeWordPageIdx = idx;

    const vwrap = document.getElementById("wordVRulerWrap");
    if (vwrap) {
        vwrap.style.transform = `translateY(${pageEl.offsetTop}px)`;
    }
    const isLand = pageEl.classList.contains("landscape");
    if ((isLand && currentDocWidthMm !== 297) || (!isLand && currentDocWidthMm !== 210)) {
        rebuildRulersForOrientation(isLand);
    }
    const el = document.getElementById("officePageCounter");
    if (el && officeMode === "word") el.textContent = `Sahifa ${activeWordPageIdx + 1} / ${wordPages.length}`;
}

document.addEventListener("focusin", (e) => {
    const page = e.target.closest?.(".a4-sheet");
    if (page) syncActivePageAndVRuler(page);
});
document.addEventListener("click", (e) => {
    const page = e.target.closest?.(".a4-sheet");
    if (page) syncActivePageAndVRuler(page);
});
document.addEventListener("keyup", (e) => {
    const page = e.target.closest?.(".a4-sheet");
    if (page) syncActivePageAndVRuler(page);
});

// 2. Устойчивые кнопки + у таблиц (не исчезают при переходе курсора к ним)
let tblHideTimer = null;
document.addEventListener("mousemove", (e) => {
    const rowBtn = document.getElementById("tblAddRowBtn");
    const colBtn = document.getElementById("tblAddColBtn");
    if (!rowBtn || !colBtn) return;

    const tbl = e.target.closest(".a4-sheet .word-table");
    const onPlus = e.target.closest(".tbl-float-plus");

    if (tbl) {
        clearTimeout(tblHideTimer);
        hoveredWordTable = tbl;
        const r = tbl.getBoundingClientRect();
        rowBtn.style.left = (r.left + r.width / 2 - 12) + "px";
        rowBtn.style.top = (r.bottom + 4) + "px";
        colBtn.style.left = (r.right + 4) + "px";
        colBtn.style.top = (r.top + r.height / 2 - 12) + "px";
        rowBtn.classList.add("show");
        colBtn.classList.add("show");
        return;
    }

    if (onPlus) {
        clearTimeout(tblHideTimer);
        return;
    }

    if (hoveredWordTable) {
        const r = hoveredWordTable.getBoundingClientRect();
        const inBuffer = e.clientX >= r.left - 12 && e.clientX <= r.right + 44 &&
                         e.clientY >= r.top - 12 && e.clientY <= r.bottom + 44;
        if (inBuffer) {
            clearTimeout(tblHideTimer);
            return;
        }
        clearTimeout(tblHideTimer);
        tblHideTimer = setTimeout(() => {
            rowBtn.classList.remove("show");
            colBtn.classList.remove("show");
        }, 280);
    }
});

// 3. Строгая вставка любого HTML ровно в позицию мигающего курсора
function insertHtmlAtCursor(html) {
    let targetContainer = null;
    if (officeMode === "word") {
        targetContainer = document.querySelector(`.a4-sheet[data-page-index="${activeWordPageIdx}"]`) || document.querySelector(".a4-sheet");
    } else if (officeMode === "slides") {
        targetContainer = document.getElementById("slideBodyBox");
    }
    if (!targetContainer) return;

    targetContainer.focus();
    const sel = window.getSelection();
    let range = null;

    if (savedRange && targetContainer.contains(savedRange.commonAncestorContainer)) {
        range = savedRange.cloneRange();
    } else if (sel && sel.rangeCount > 0 && targetContainer.contains(sel.getRangeAt(0).commonAncestorContainer)) {
        range = sel.getRangeAt(0).cloneRange();
    } else {
        range = document.createRange();
        range.selectNodeContents(targetContainer);
        range.collapse(false);
    }

    sel.removeAllRanges();
    sel.addRange(range);
    range.deleteContents();

    const frag = range.createContextualFragment(html);
    const lastNode = frag.lastChild;
    range.insertNode(frag);

    if (lastNode) {
        const after = document.createRange();
        after.setStartAfter(lastNode);
        after.collapse(true);
        sel.removeAllRanges();
        sel.addRange(after);
        savedRange = after.cloneRange();
    }

    if (officeMode === "word") syncWordPagesFromDom();
    else if (officeMode === "slides") slidesData[activeSlideIdx].body = document.getElementById("slideBodyBox").innerHTML;
    saveCurrentOfficeDoc();
    updateOfficeLiveStats();
}

// Переводим все вставки на insertHtmlAtCursor
window.confirmInsertWordTable = () => {
    const r = Math.min(30, Math.max(1, +document.getElementById("tbRows").value || 3));
    const c = Math.min(12, Math.max(1, +document.getElementById("tbCols").value || 3));
    const hBg = document.getElementById("tbHeadBg").value;
    const hCol = document.getElementById("tbHeadColor").value;
    const zebra = document.getElementById("tbZebra").checked ? "zebra" : "";
    let html = `<table class="word-table ${zebra}"><thead><tr style="background:${hBg};color:${hCol};">${Array.from({length:c}, (_,i)=>`<th>Sarlavha ${i+1}</th>`).join("")}</tr></thead><tbody>`;
    for (let i = 1; i < r; i++) html += `<tr>${Array.from({length:c}, ()=>`<td>&nbsp;</td>`).join("")}</tr>`;
    html += `</tbody></table><p><br></p>`;
    insertHtmlAtCursor(html);
    document.getElementById("tableBuilderModal").classList.remove("open");
};

window.insertChartIntoOffice = function() {
    const svg = buildOfficeChartSvg();
    const dataUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    const imgHtml = `<img src="${dataUrl}" class="office-resizable-img" alt="Grafik" style="max-width:100%; border-radius:10px; display:inline-block;">`;
    if (officeMode === "tables") {
        document.getElementById("tablesChartsShelf").innerHTML += `<p>${imgHtml}</p>`;
        saveCurrentOfficeDoc();
    } else {
        insertHtmlAtCursor(imgHtml);
    }
    document.getElementById("officeChartModal").classList.remove("open");
};

window.confirmInsertImageUrl = () => {
    const url = (document.getElementById("imgUrlInput").value || "").trim();
    if (url) insertHtmlAtCursor(`<img src="${url}" class="office-resizable-img" style="max-width:100%; height:auto; border-radius:6px;">`);
    document.getElementById("imageInsertModal").classList.remove("open");
};

window.handleLocalImageUpload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        insertHtmlAtCursor(`<img src="${reader.result}" class="office-resizable-img" style="max-width:100%; height:auto; border-radius:6px;">`);
        document.getElementById("imageInsertModal").classList.remove("open");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
};

window.insertEquationTemplate = function(type) {
    const map = {
        quad: `x = (−b ± √(b² − 4ac)) / 2a`,
        binom: `(x + a)ⁿ = Σ C(n, k) xᵏ aⁿ⁻ᵏ`,
        circle: `A = πr²`,
        taylor: `eˣ = 1 + x/1! + x²/2! + x³/3! + …`,
        fourier: `f(x) = a₀ + Σ (aₙ cos(nπx/L) + bₙ sin(nπx/L))`,
        frac: `<span class="math-frac"><span class="math-num">a</span><span class="math-den">b</span></span>`
    };
    insertHtmlAtCursor(`<span class="office-eq-box" contenteditable="true">${map[type] || "y = f(x)"}</span>&nbsp;`);
    document.getElementById("equationModal").classList.remove("open");
};

// 4. Починенные буллеты (disc, circle, square, dash)
window.applyBulletStyle = (styleType) => {
    restoreSavedSelection();
    const sel = window.getSelection();
    let ul = sel?.anchorNode?.parentElement?.closest("ul");
    if (!ul) {
        document.execCommand("insertUnorderedList");
        ul = window.getSelection()?.anchorNode?.parentElement?.closest("ul");
    }
    if (ul) {
        ul.classList.remove("ul-disc", "ul-circle", "ul-square", "ul-dash");
        ul.classList.add("ul-" + styleType);
        ul.style.listStyleType = styleType === "dash" ? "none" : styleType;
    }
    document.getElementById("bulletMenuWrap")?.classList.remove("open");
    if (officeMode === "word") syncWordPagesFromDom();
    saveCurrentOfficeDoc();
};

// 5. Вставка цитаты (Iqtibos)
window.openQuoteInsertModal = () => {
    document.getElementById("quoteTextInp").value = "";
    document.getElementById("quoteAuthorInp").value = "";
    document.getElementById("quoteInsertModal").classList.add("open");
    setTimeout(() => document.getElementById("quoteTextInp")?.focus(), 80);
};

window.confirmInsertQuote = () => {
    const text = (document.getElementById("quoteTextInp").value || "").trim();
    const author = (document.getElementById("quoteAuthorInp").value || "").trim();
    if (!text) return;
    const esc = (s) => s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\n/g,"<br>");
    const authorHtml = author ? `<cite class="office-quote-author">— ${esc(author)}</cite>` : "";
    const html = `<blockquote class="office-quote-block"><p class="office-quote-text">«${esc(text)}»</p>${authorHtml}</blockquote><p><br></p>`;
    insertHtmlAtCursor(html);
    document.getElementById("quoteInsertModal").classList.remove("open");
};

// 6. Статистика текста в статусбаре и модалке
function getOfficePlainText() {
    if (officeMode === "word") {
        return [...document.querySelectorAll(".a4-sheet")].map(p => p.innerText || "").join("\n").trim();
    }
    if (officeMode === "slides") {
        return slidesData.map(s => `${s.title} ${s.body}`.replace(/<[^>]+>/g, " ")).join("\n").trim();
    }
    return Object.values(tableData.cells || {}).join(" ").trim();
}

function updateOfficeLiveStats() {
    const text = getOfficePlainText();
    const charsWith = text.length;
    const charsNo = text.replace(/\s/g, "").length;
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    const lines = text ? text.split(/\r\n|\r|\n/).length : 0;
    const paras = text ? text.split(/(?:\r\n|\r|\n)+/).filter(l => l.trim()).length : 0;

    let readTime = "0 soniya";
    if (words > 0) {
        const sec = Math.max(1, Math.ceil((words / 180) * 60));
        readTime = sec < 60 ? `~${sec} soniya` : `~${Math.floor(sec / 60)} daq ${sec % 60} son.`;
    }

    const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    const liveBtn = document.getElementById("officeLiveChars");
    if (liveBtn) liveBtn.textContent = `${fmt(charsWith)} belgi`;

    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set("offStatCharsWith", fmt(charsWith));
    set("offStatCharsNo", fmt(charsNo));
    set("offStatCardChars", `${fmt(charsWith)} / ${fmt(charsNo)}`);
    set("offStatWords", fmt(words));
    set("offStatLinesParas", `${fmt(lines)} / ${fmt(paras)}`);
    set("offStatReadTime", readTime);
}

window.openOfficeStatsModal = () => {
    updateOfficeLiveStats();
    document.getElementById("officeStatsModal").classList.add("open");
};

document.addEventListener("input", updateOfficeLiveStats);
document.addEventListener("DOMContentLoaded", () => setTimeout(updateOfficeLiveStats, 250));

// === ФИКС ПОЗИЦИИ ВЕРТИКАЛЬНОЙ И ГОРИЗОНТАЛЬНОЙ ЛИНЕЕК ===
function syncFixedHRulerTop() {
    const topbar = document.querySelector(".office-topbar");
    const hruler = document.querySelector(".word-ruler-top-row.sticky-ruler");
    if (topbar && hruler) {
        hruler.style.top = topbar.offsetHeight + "px";
        hruler.style.transform = `translateX(-50%) scale(${officeZoom})`;
    }
}

// Переопределяем привязку вертикальной линейки: считаем строго от 1-й страницы
syncActivePageAndVRuler = function(pageEl) {
    if (!pageEl) return;
    const idx = parseInt(pageEl.dataset.pageIndex, 10);
    if (isNaN(idx)) return;
    activeWordPageIdx = idx;

    const firstPage = document.querySelector(".a4-sheet");
    const vwrap = document.getElementById("wordVRulerWrap");
    if (vwrap && firstPage) {
        const relTop = Math.max(0, pageEl.offsetTop - firstPage.offsetTop);
        vwrap.style.transform = `translateY(${relTop}px)`;
    }

    const isLand = pageEl.classList.contains("landscape");
    if ((isLand && currentDocWidthMm !== 297) || (!isLand && currentDocWidthMm !== 210)) {
        rebuildRulersForOrientation(isLand);
    }

    const el = document.getElementById("officePageCounter");
    if (el && officeMode === "word") el.textContent = `Sahifa ${activeWordPageIdx + 1} / ${wordPages.length}`;
    syncFixedHRulerTop();
};

// Обновляем позицию горизонтальной линейки при зуме и ресайзе окна
const _origZoomForRuler = window.adjustOfficeZoom;
window.adjustOfficeZoom = function(d) {
    _origZoomForRuler(d);
    syncFixedHRulerTop();
};

window.addEventListener("resize", syncFixedHRulerTop);
document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
        syncFixedHRulerTop();
        const firstPage = document.querySelector(".a4-sheet");
        if (firstPage) syncActivePageAndVRuler(firstPage);
    }, 150);
});

// === ФИКС КНОПОК + У ТАБЛИЦ (НЕ ИСЧЕЗАЮТ ПРИ НАВЕДЕНИИ) ===
(function initRockSolidTablePlusButtons() {
    let activeTbl = null;
    let hideTimer = null;

    function positionAndShow(tbl) {
        const rowBtn = document.getElementById("tblAddRowBtn");
        const colBtn = document.getElementById("tblAddColBtn");
        if (!tbl || !rowBtn || !colBtn) return;

        clearTimeout(hideTimer);
        activeTbl = tbl;
        hoveredWordTable = tbl;

        const r = tbl.getBoundingClientRect();
        rowBtn.style.left = (r.left + r.width / 2 - 12) + "px";
        rowBtn.style.top = (r.bottom + 4) + "px";
        colBtn.style.left = (r.right + 4) + "px";
        colBtn.style.top = (r.top + r.height / 2 - 12) + "px";

        rowBtn.classList.add("tbl-plus-visible");
        colBtn.classList.add("tbl-plus-visible");
    }

    function scheduleHide() {
        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => {
            document.getElementById("tblAddRowBtn")?.classList.remove("tbl-plus-visible");
            document.getElementById("tblAddColBtn")?.classList.remove("tbl-plus-visible");
        }, 300);
    }

    document.addEventListener("mousemove", (e) => {
        const tbl = e.target.closest(".a4-sheet .word-table");
        if (tbl) {
            positionAndShow(tbl);
            return;
        }
        if (e.target.closest(".tbl-float-plus")) {
            clearTimeout(hideTimer);
            return;
        }
        if (activeTbl) {
            const r = activeTbl.getBoundingClientRect();
            const inZone = e.clientX >= r.left - 16 && e.clientX <= r.right + 48 &&
                           e.clientY >= r.top - 16 && e.clientY <= r.bottom + 48;
            if (inZone) {
                clearTimeout(hideTimer);
            } else {
                scheduleHide();
            }
        }
    });

    // После добавления строки/столбца сразу обновляем позицию кнопок
    const _oldAddRow = window.addWordTableRow;
    window.addWordTableRow = () => {
        if (_oldAddRow) _oldAddRow();
        if (activeTbl) positionAndShow(activeTbl);
    };

    const _oldAddCol = window.addWordTableCol;
    window.addWordTableCol = () => {
        if (_oldAddCol) _oldAddCol();
        if (activeTbl) positionAndShow(activeTbl);
    };
})();

// === ФИКС ОБРЕЗКИ ИЗОБРАЖЕНИЙ (CROP) И КРУГЛЫХ ЦВЕТОВ В ГРАФИКАХ ===
let cropTargetImg = null;

window.openImgCropModal = function() {
    if (!selectedImgEl) return;
    cropTargetImg = selectedImgEl;

    // Скрываем синюю рамку выделения, чтобы не мешала поверх модалки
    document.getElementById("imgFloatControls")?.classList.remove("active");
    document.getElementById("imgWrapMenu")?.classList.remove("open");

    ["cropTop", "cropBottom", "cropLeft", "cropRight"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = 0;
    });
    document.getElementById("imgCropModal").classList.add("open");
    updateCropPreview();
};

window.updateCropPreview = function() {
    if (!cropTargetImg) return;
    const canvas = document.getElementById("imgCropPreview");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const nw = cropTargetImg.naturalWidth || cropTargetImg.width || 400;
    const nh = cropTargetImg.naturalHeight || cropTargetImg.height || 300;
    const t = (+document.getElementById("cropTop").value / 100) * nh;
    const b = (+document.getElementById("cropBottom").value / 100) * nh;
    const l = (+document.getElementById("cropLeft").value / 100) * nw;
    const r = (+document.getElementById("cropRight").value / 100) * nw;

    const cw = Math.max(10, nw - l - r);
    const ch = Math.max(10, nh - t - b);

    canvas.width = cw;
    canvas.height = ch;
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(cropTargetImg, l, t, cw, ch, 0, 0, cw, ch);
};

window.applyImgCrop = function() {
    if (!cropTargetImg) return;
    const canvas = document.getElementById("imgCropPreview");
    try {
        cropTargetImg.src = canvas.toDataURL("image/png");
        cropTargetImg.style.height = "auto";
    } catch (_) {
        // Резервный вариант для внешних картинок с CORS-ограничением
        const t = document.getElementById("cropTop").value;
        const r = document.getElementById("cropRight").value;
        const b = document.getElementById("cropBottom").value;
        const l = document.getElementById("cropLeft").value;
        cropTargetImg.style.clipPath = `inset(${t}% ${r}% ${b}% ${l}%)`;
    }
    cropTargetImg = null;
    document.getElementById("imgCropModal").classList.remove("open");
    if (officeMode === "word") syncWordPagesFromDom();
    saveCurrentOfficeDoc();
};

// Круглые кнопки выбора цвета без обводки в окне графиков
window.renderOfficeChartRows = function() {
    document.getElementById("ocRows").innerHTML = officeChartItems.map((it, i) => `
        <div style="display:grid; grid-template-columns:minmax(0,1fr) 72px 30px 28px; gap:8px; align-items:center;">
            <input class="bib-custom-input" value="${it.label}" oninput="officeChartItems[${i}].label=this.value; renderOfficeChartPreview()">
            <input type="number" class="bib-custom-input" value="${it.val}" oninput="officeChartItems[${i}].val=+this.value||0; renderOfficeChartPreview()">
            <input type="color" class="office-round-color" value="${it.color}" oninput="officeChartItems[${i}].color=this.value; renderOfficeChartPreview()">
            <button type="button" class="cw-del-btn" onclick="officeChartItems.splice(${i},1); renderOfficeChartRows(); renderOfficeChartPreview()">×</button>
        </div>
    `).join("");
};

// === ПОЛНЫЙ ФИКС ГОРИЗОНТАЛЬНОЙ ЛИНЕЙКИ ПРИ МАСШТАБИРОВАНИИ ===
(function fixHorizontalRulerPortal() {
    function mountHRulerToBody() {
        const hruler = document.querySelector(".word-ruler-top-row.sticky-ruler");
        if (!hruler) return;

        // Выносим линейку из #officeZoomWrapper в body, чтобы transform не ломал position: fixed
        if (hruler.parentElement !== document.body) {
            document.body.appendChild(hruler);
        }
        updateFixedHRuler();
    }

    window.updateFixedHRuler = function() {
        const hruler = document.querySelector(".word-ruler-top-row.sticky-ruler");
        const topbar = document.querySelector(".office-topbar");
        if (!hruler || !topbar) return;

        if (officeMode !== "word") {
            hruler.style.display = "none";
            return;
        }

        hruler.style.display = "flex";
        hruler.style.top = topbar.offsetHeight + "px";
        hruler.style.left = "50%";
        hruler.style.transform = `translateX(-50%) scale(${officeZoom})`;
        hruler.style.transformOrigin = "top center";
    };

    // Переопределяем syncFixedHRulerTop и переключение режимов
    window.syncFixedHRulerTop = window.updateFixedHRuler;

    const _prevApplyMode = applyOfficeModeUI;
    applyOfficeModeUI = function(mode) {
        _prevApplyMode(mode);
        window.updateFixedHRuler();
    };

    const _prevZoom = window.adjustOfficeZoom;
    window.adjustOfficeZoom = function(d) {
        _prevZoom(d);
        window.updateFixedHRuler();
    };

    window.addEventListener("resize", window.updateFixedHRuler);
    document.addEventListener("DOMContentLoaded", () => {
        setTimeout(mountHRulerToBody, 120);
    });
})();

// === ИЗМЕНЕНИЕ ШИРИНЫ СТОЛБЦОВ В ULH WORD И ULH TABLES ===
(function initTableColumnResizing() {
    const EDGE_THRESHOLD = 6; // чувствительность у границы столбца (px)
    const MIN_COL_PX = 36;

    // Направляющая линия во время перетаскивания
    const guide = document.createElement("div");
    guide.className = "tbl-col-guide";
    document.body.appendChild(guide);

    let dragState = null;

    function getBorderHit(e) {
        // 1. Таблицы в ULH Word (внутри листа А4)
        const wordCell = e.target.closest?.(".a4-sheet .word-table th, .a4-sheet .word-table td");
        if (wordCell) {
            const tbl = wordCell.closest(".word-table");
            const row = wordCell.parentElement;
            const colIdx = wordCell.cellIndex;
            const totalCols = row.cells.length;
            const rect = wordCell.getBoundingClientRect();

            // Правая граница любой колонки, кроме последней (чтобы не выходить за линейку)
            if (colIdx < totalCols - 1 && Math.abs(e.clientX - rect.right) <= EDGE_THRESHOLD) {
                return { mode: "word", tbl, colIdx, rect };
            }
            // Левая граница любой колонки, кроме первой
            if (colIdx > 0 && Math.abs(e.clientX - rect.left) <= EDGE_THRESHOLD) {
                return { mode: "word", tbl, colIdx: colIdx - 1, rect };
            }
        }

        // 2. Заголовки столбцов в ULH Tables (A, B, C...)
        const sheetTh = e.target.closest?.("#ulhSpreadsheet thead th");
        if (sheetTh && sheetTh.cellIndex > 0) {
            const rect = sheetTh.getBoundingClientRect();
            if (Math.abs(e.clientX - rect.right) <= EDGE_THRESHOLD) {
                return { mode: "sheet", th: sheetTh, colIdx: sheetTh.cellIndex - 1, rect };
            }
        }

        return null;
    }

    // Подсветка курсора col-resize при наведении на границу
    document.addEventListener("mousemove", (e) => {
        if (dragState) {
            onResizeMove(e);
            return;
        }
        const hit = getBorderHit(e);
        const target = e.target.closest?.(".word-table th, .word-table td, #ulhSpreadsheet thead th");
        if (target) {
            target.style.cursor = hit ? "col-resize" : "";
        }
    });

    // Старт перетаскивания
    document.addEventListener("mousedown", (e) => {
        if (e.button !== 0) return;
        const hit = getBorderHit(e);
        if (!hit) return;

        e.preventDefault();
        e.stopPropagation();

        const zoom = (typeof officeZoom === "number" && officeZoom > 0) ? officeZoom : 1;

        if (hit.mode === "word") {
            const tbl = hit.tbl;
            const firstRow = tbl.rows[0];
            if (!firstRow) return;

            const tblRect = tbl.getBoundingClientRect();
            const widthsPx = [...firstRow.cells].map(c => c.getBoundingClientRect().width / zoom);
            const totalW = widthsPx.reduce((a, b) => a + b, 0) || 1;

            // Фиксируем текущие пропорции всех колонок перед началом движения
            [...firstRow.cells].forEach((c, i) => {
                c.style.width = ((widthsPx[i] / totalW) * 100).toFixed(2) + "%";
            });

            dragState = {
                mode: "word",
                tbl,
                firstRow,
                colIdx: hit.colIdx,
                startX: e.clientX,
                startW1: widthsPx[hit.colIdx],
                startW2: widthsPx[hit.colIdx + 1],
                totalW,
                zoom
            };

            guide.style.top = tblRect.top + "px";
            guide.style.height = tblRect.height + "px";
            guide.style.left = e.clientX + "px";
            guide.style.display = "block";
        } else {
            const tblRect = document.getElementById("ulhSpreadsheet").getBoundingClientRect();
            dragState = {
                mode: "sheet",
                th: hit.th,
                colIdx: hit.colIdx,
                startX: e.clientX,
                startW: hit.rect.width / zoom,
                zoom
            };

            guide.style.top = tblRect.top + "px";
            guide.style.height = tblRect.height + "px";
            guide.style.left = e.clientX + "px";
            guide.style.display = "block";
        }

        document.body.classList.add("col-resizing");
    });

    function onResizeMove(e) {
        if (!dragState) return;
        const dx = (e.clientX - dragState.startX) / dragState.zoom;

        if (dragState.mode === "word") {
            const pairSum = dragState.startW1 + dragState.startW2;
            const newW1 = Math.max(MIN_COL_PX, Math.min(pairSum - MIN_COL_PX, dragState.startW1 + dx));
            const newW2 = pairSum - newW1;

            const c1 = dragState.firstRow.cells[dragState.colIdx];
            const c2 = dragState.firstRow.cells[dragState.colIdx + 1];
            if (c1 && c2) {
                c1.style.width = ((newW1 / dragState.totalW) * 100).toFixed(2) + "%";
                c2.style.width = ((newW2 / dragState.totalW) * 100).toFixed(2) + "%";
            }
            guide.style.left = (dragState.startX + (newW1 - dragState.startW1) * dragState.zoom) + "px";
        } else {
            const newW = Math.max(50, Math.round(dragState.startW + dx));
            dragState.th.style.width = newW + "px";
            dragState.th.style.minWidth = newW + "px";
            if (!tableData.colWidths) tableData.colWidths = {};
            tableData.colWidths[dragState.colIdx] = newW;
            guide.style.left = (dragState.startX + (newW - dragState.startW) * dragState.zoom) + "px";
        }
    }

    document.addEventListener("mouseup", () => {
        if (!dragState) return;
        const finishedMode = dragState.mode;
        dragState = null;
        guide.style.display = "none";
        document.body.classList.remove("col-resizing");

        if (finishedMode === "word" && typeof syncWordPagesFromDom === "function") {
            syncWordPagesFromDom();
        }
        if (typeof saveCurrentOfficeDoc === "function") {
            saveCurrentOfficeDoc();
        }
    });

    // Восстанавливаем сохранённую ширину колонок в ULH Tables при перерисовке
    if (typeof renderSpreadsheet === "function") {
        const _origRenderSheet = renderSpreadsheet;
        renderSpreadsheet = function() {
            _origRenderSheet();
            if (tableData && tableData.colWidths) {
                const ths = document.querySelectorAll("#ulhSpreadsheet thead th");
                Object.keys(tableData.colWidths).forEach(idx => {
                    const th = ths[Number(idx) + 1];
                    if (th) {
                        const w = tableData.colWidths[idx] + "px";
                        th.style.width = w;
                        th.style.minWidth = w;
                    }
                });
            }
        };
    }
})();

// ==========================================
// === ПОЛНОЦЕННЫЙ ИМПОРТ .DOCX СО СТИЛЯМИ И РАЗБИВКОЙ НА СТРАНИЦЫ А4 ===
// ==========================================
function parseDocxRunHtml(runNode) {
    const rPr = runNode.getElementsByTagName("w:rPr")[0];
    const styles = [];
    let wrapTag = null;

    if (rPr) {
        const isOn = (tag) => {
            const el = rPr.getElementsByTagName(tag)[0];
            if (!el) return false;
            const v = el.getAttribute("w:val");
            return v !== "0" && v !== "false" && v !== "none";
        };
        if (isOn("w:b")) styles.push("font-weight:700");
        if (isOn("w:i")) styles.push("font-style:italic");
        if (isOn("w:u")) styles.push("text-decoration:underline");
        if (isOn("w:strike")) styles.push("text-decoration:line-through");

        const col = rPr.getElementsByTagName("w:color")[0]?.getAttribute("w:val");
        if (col && col !== "auto" && /^[0-9A-Fa-f]{6}$/.test(col)) styles.push(`color:#${col}`);

        const shd = rPr.getElementsByTagName("w:shd")[0]?.getAttribute("w:fill");
        if (shd && shd !== "auto" && /^[0-9A-Fa-f]{6}$/.test(shd)) styles.push(`background-color:#${shd}`);

        const sz = rPr.getElementsByTagName("w:sz")[0]?.getAttribute("w:val");
        if (sz && !isNaN(sz)) styles.push(`font-size:${(parseInt(sz, 10) / 2)}pt`);

        const rFonts = rPr.getElementsByTagName("w:rFonts")[0];
        const fontName = rFonts?.getAttribute("w:ascii") || rFonts?.getAttribute("w:hAnsi");
        if (fontName) styles.push(`font-family:'${fontName}', sans-serif`);

        const vAlign = rPr.getElementsByTagName("w:vertAlign")[0]?.getAttribute("w:val");
        if (vAlign === "superscript") wrapTag = "sup";
        if (vAlign === "subscript") wrapTag = "sub";
    }

    let textHtml = "";
    let hasPageBreak = false;

    for (const child of runNode.childNodes) {
        if (child.nodeName === "w:t") {
            const safe = (child.textContent || "")
                .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            textHtml += safe;
        } else if (child.nodeName === "w:tab") {
            textHtml += "&nbsp;&nbsp;&nbsp;&nbsp;";
        } else if (child.nodeName === "w:br") {
            if (child.getAttribute("w:type") === "page") hasPageBreak = true;
            else textHtml += "<br>";
        }
    }

    if (wrapTag && textHtml) textHtml = `<${wrapTag}>${textHtml}</${wrapTag}>`;
    if (styles.length && textHtml) textHtml = `<span style="${styles.join(";")}">${textHtml}</span>`;
    return { html: textHtml, hasPageBreak };
}

function parseDocxParagraphHtml(pNode) {
    const pPr = pNode.getElementsByTagName("w:pPr")[0];
    const pStyles = [];
    let tag = "p";
    let pageBreakBefore = false;

    if (pPr) {
        const pStyleVal = pPr.getElementsByTagName("w:pStyle")[0]?.getAttribute("w:val") || "";
        if (/Heading1|Title/i.test(pStyleVal)) tag = "h1";
        else if (/Heading2/i.test(pStyleVal)) tag = "h2";
        else if (/Heading3/i.test(pStyleVal)) tag = "h3";

        const jc = pPr.getElementsByTagName("w:jc")[0]?.getAttribute("w:val");
        if (jc === "center") pStyles.push("text-align:center");
        else if (jc === "right") pStyles.push("text-align:right");
        else if (jc === "both") pStyles.push("text-align:justify");

        const ind = pPr.getElementsByTagName("w:ind")[0];
        if (ind) {
            const fl = parseInt(ind.getAttribute("w:firstLine") || "0", 10);
            const lf = parseInt(ind.getAttribute("w:left") || "0", 10);
            if (fl > 0) pStyles.push(`text-indent:${(fl / 20).toFixed(1)}pt`);
            if (lf > 0) pStyles.push(`margin-left:${(lf / 20).toFixed(1)}pt`);
        }

        const sp = pPr.getElementsByTagName("w:spacing")[0];
        if (sp) {
            const before = parseInt(sp.getAttribute("w:before") || "0", 10);
            const after = parseInt(sp.getAttribute("w:after") || "0", 10);
            const line = parseInt(sp.getAttribute("w:line") || "0", 10);
            if (before > 0) pStyles.push(`margin-top:${(before / 20).toFixed(1)}pt`);
            if (after > 0) pStyles.push(`margin-bottom:${(after / 20).toFixed(1)}pt`);
            if (line > 0 && sp.getAttribute("w:lineRule") !== "exact") {
                pStyles.push(`line-height:${(line / 240).toFixed(2)}`);
            }
        }

        if (pPr.getElementsByTagName("w:pageBreakBefore")[0]) pageBreakBefore = true;
    }

    let inner = "";
    let hasPageBreak = false;

    for (const child of pNode.childNodes) {
        if (child.nodeName === "w:r") {
            const res = parseDocxRunHtml(child);
            inner += res.html;
            if (res.hasPageBreak) hasPageBreak = true;
        } else if (child.nodeName === "w:hyperlink") {
            let linkInner = "";
            for (const r of child.getElementsByTagName("w:r")) {
                linkInner += parseDocxRunHtml(r).html;
            }
            if (linkInner) inner += `<a href="#" target="_blank">${linkInner}</a>`;
        }
    }

    const styleAttr = pStyles.length ? ` style="${pStyles.join(";")}"` : "";
    return {
        html: `<${tag}${styleAttr}>${inner || "<br>"}</${tag}>`,
        pageBreakBefore,
        hasPageBreak
    };
}

function parseDocxTableHtml(tblNode) {
    let html = `<table class="word-table"><tbody>`;
    const rows = [...tblNode.childNodes].filter(n => n.nodeName === "w:tr");
    rows.forEach(tr => {
        html += "<tr>";
        const cells = [...tr.childNodes].filter(n => n.nodeName === "w:tc");
        cells.forEach(tc => {
            const shd = tc.getElementsByTagName("w:shd")[0]?.getAttribute("w:fill");
            const bg = (shd && shd !== "auto" && /^[0-9A-Fa-f]{6}$/.test(shd)) ? ` style="background:#${shd};"` : "";
            const cellParas = [...tc.childNodes].filter(n => n.nodeName === "w:p")
                .map(p => parseDocxParagraphHtml(p).html).join("");
            html += `<td${bg}>${cellParas || "&nbsp;"}</td>`;
        });
        html += "</tr>";
    });
    html += `</tbody></table>`;
    return html;
}

// Автоматическая разбивка переполненных страниц А4 на несколько листов
function paginateAllWordPages() {
    let safety = 0;
    while (safety < 60) {
        safety++;
        const sheets = [...document.querySelectorAll(".a4-sheet")];
        let didSplit = false;

        for (let i = 0; i < sheets.length; i++) {
            const page = sheets[i];
            if (page.scrollHeight > page.clientHeight + 4 && page.children.length > 1) {
                const movedNodes = [];
                while (page.scrollHeight > page.clientHeight + 4 && page.children.length > 1) {
                    const last = page.lastElementChild;
                    if (last.classList.contains("a4-page-num")) break;
                    movedNodes.unshift(last.outerHTML);
                    page.removeChild(last);
                }
                if (movedNodes.length) {
                    wordPages[i] = page.innerHTML;
                    if (i + 1 < wordPages.length) {
                        wordPages[i + 1] = movedNodes.join("") + wordPages[i + 1];
                    } else {
                        wordPages.push(movedNodes.join(""));
                    }
                    didSplit = true;
                    break;
                }
            }
        }
        if (!didSplit) break;
        renderWordPages();
    }
    if (typeof applyPageNumbersToSheets === "function") applyPageNumbersToSheets();
    if (typeof updatePageCounter === "function") updatePageCounter();
    if (typeof updateOfficeLiveStats === "function") updateOfficeLiveStats();
    saveCurrentOfficeDoc();
}

// Переопределяем открытие файлов с компьютера
window.handleOfficeFileOpen = async function(e) {
    const f = e.target.files[0];
    if (!f) return;
    const ext = f.name.split(".").pop().toLowerCase();
    document.getElementById("officeDocTitle").value = f.name.replace(/\.[^.]+$/, "");

    if (officeMode === "tables" && window.XLSX) {
        const wb = XLSX.read(await f.arrayBuffer(), { type: "array" });
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
        tableData.cells = {};
        tableData.rows = Math.max(20, rows.length + 5);
        rows.forEach((r, ri) => r.forEach((v, ci) => {
            if (ci < 26 && v !== undefined) tableData.cells[colLetter(ci) + (ri + 1)] = String(v);
        }));
        renderSpreadsheet();
        saveCurrentOfficeDoc();
    } else if (officeMode === "word" && ext === "docx" && window.JSZip) {
        const zip = await JSZip.loadAsync(await f.arrayBuffer());
        const xmlStr = await zip.file("word/document.xml")?.async("string");
        if (xmlStr) {
            const doc = new DOMParser().parseFromString(xmlStr, "application/xml");
            const body = doc.getElementsByTagName("w:body")[0];

            // Считываем ориентацию и поля документа
            const sectPr = body?.getElementsByTagName("w:sectPr")[0];
            if (sectPr) {
                const pgSz = sectPr.getElementsByTagName("w:pgSz")[0];
                const isLand = pgSz?.getAttribute("w:orient") === "landscape" ||
                    (parseInt(pgSz?.getAttribute("w:w") || "0", 10) > parseInt(pgSz?.getAttribute("w:h") || "0", 10));
                const pgMar = sectPr.getElementsByTagName("w:pgMar")[0];
                if (pgMar) {
                    const twipToMm = (attr, def) => {
                        const v = parseInt(pgMar.getAttribute(attr) || "0", 10);
                        return v > 0 ? Math.max(8, Math.min(70, Math.round(v / 56.7))) : def;
                    };
                    rulerMarginTop = twipToMm("w:top", 20);
                    rulerMarginLeft = twipToMm("w:left", 20);
                    rulerMarginRight = twipToMm("w:right", 20);
                }
                pageOrientations = [isLand ? "landscape" : "portrait"];
                if (typeof rebuildRulersForOrientation === "function") rebuildRulersForOrientation(isLand);
            }

            // Собираем страницы с учётом явных разрывов
            const pagesArr = [""];
            for (const node of body.childNodes) {
                if (node.nodeName === "w:p") {
                    const p = parseDocxParagraphHtml(node);
                    if (p.pageBreakBefore && pagesArr[pagesArr.length - 1].trim()) pagesArr.push("");
                    pagesArr[pagesArr.length - 1] += p.html;
                    if (p.hasPageBreak) pagesArr.push("");
                } else if (node.nodeName === "w:tbl") {
                    pagesArr[pagesArr.length - 1] += parseDocxTableHtml(node);
                }
            }

            wordPages = pagesArr.filter(p => p.trim().length > 0);
            if (!wordPages.length) wordPages = ["<p><br></p>"];

            renderWordPages();
            // После отрисовки в DOM разбиваем переполненные страницы на отдельные листы А4
            requestAnimationFrame(() => paginateAllWordPages());
        }
    } else {
        const txt = await f.text();
        if (officeMode === "word") {
            wordPages = [txt.includes("<") ? txt : txt.split(/\r?\n/).map(l => `<p>${l || "<br>"}</p>`).join("")];
            renderWordPages();
            requestAnimationFrame(() => paginateAllWordPages());
        }
    }

    e.target.value = "";
};

// ==========================================
// === ПОЛНОЦЕННЫЙ ИМПОРТ PPTX (SLIDES) И XLSX (TABLES) 1-К-1 ===
// ==========================================

// --- 1. ПАРСЕР POWERPOINT (.PPTX) ---
function parsePptxParagraph(pNode) {
    const pPr = pNode.getElementsByTagName("a:pPr")[0];
    const algn = pPr?.getAttribute("algn");
    const alignCss = algn === "ctr" ? "text-align:center;" : algn === "r" ? "text-align:right;" : algn === "just" ? "text-align:justify;" : "";

    let inner = "";
    for (const child of pNode.childNodes) {
        if (child.nodeName === "a:r") {
            const rPr = child.getElementsByTagName("a:rPr")[0];
            const tNode = child.getElementsByTagName("a:t")[0];
            if (!tNode) continue;

            const safeTxt = (tNode.textContent || "")
                .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            const styles = [];

            if (rPr) {
                if (rPr.getAttribute("b") === "1") styles.push("font-weight:700");
                if (rPr.getAttribute("i") === "1") styles.push("font-style:italic");
                if (rPr.getAttribute("u") && rPr.getAttribute("u") !== "none") styles.push("text-decoration:underline");
                if (rPr.getAttribute("strike") && rPr.getAttribute("strike") !== "noStrike") styles.push("text-decoration:line-through");

                const sz = parseInt(rPr.getAttribute("sz") || "0", 10);
                if (sz > 0) styles.push(`font-size:${Math.max(11, Math.min(48, Math.round(sz / 100)))}px`);

                const clr = rPr.getElementsByTagName("a:srgbClr")[0]?.getAttribute("val");
                if (clr && /^[0-9A-Fa-f]{6}$/.test(clr)) styles.push(`color:#${clr}`);

                const latin = rPr.getElementsByTagName("a:latin")[0]?.getAttribute("typeface");
                if (latin && !latin.startsWith("+")) styles.push(`font-family:'${latin}', sans-serif`);
            }
            inner += styles.length ? `<span style="${styles.join(";")}">${safeTxt}</span>` : safeTxt;
        } else if (child.nodeName === "a:br") {
            inner += "<br>";
        }
    }

    if (!inner.trim()) return "";
    return `<p style="margin:4px 0;${alignCss}">${inner}</p>`;
}

async function importPptxFile(file) {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const slidePaths = Object.keys(zip.files)
        .filter(p => /^ppt\/slides\/slide\d+\.xml$/i.test(p))
        .sort((a, b) => parseInt(a.match(/\d+/)[0], 10) - parseInt(b.match(/\d+/)[0], 10));

    if (!slidePaths.length) {
        alert("PPTX faylida slaydlar topilmadi.");
        return;
    }

    const parsedSlides = [];

    for (const sPath of slidePaths) {
        const xmlStr = await zip.file(sPath).async("string");
        const doc = new DOMParser().parseFromString(xmlStr, "application/xml");

        // Карта связей (rId -> путь к картинке)
        const relsPath = sPath.replace("ppt/slides/", "ppt/slides/_rels/") + ".rels";
        const relsMap = {};
        if (zip.file(relsPath)) {
            const relsStr = await zip.file(relsPath).async("string");
            const relsDoc = new DOMParser().parseFromString(relsStr, "application/xml");
            for (const rel of relsDoc.getElementsByTagName("Relationship")) {
                relsMap[rel.getAttribute("Id")] = rel.getAttribute("Target") || "";
            }
        }

        // Цвет фона слайда
        let bg = "#FFFFFF";
        const bgNode = doc.getElementsByTagName("p:bg")[0];
        const bgClr = bgNode?.getElementsByTagName("a:srgbClr")[0]?.getAttribute("val");
        if (bgClr && /^[0-9A-Fa-f]{6}$/.test(bgClr)) bg = "#" + bgClr;

        let titleHtml = "";
        let bodyParts = [];

        // Текстовые блоки (p:sp)
        for (const sp of doc.getElementsByTagName("p:sp")) {
            const phType = sp.getElementsByTagName("p:ph")[0]?.getAttribute("type") || "";
            const isTitle = phType === "title" || phType === "ctrTitle";
            const paras = [...sp.getElementsByTagName("a:p")].map(parsePptxParagraph).filter(Boolean).join("");
            if (!paras) continue;

            if (isTitle && !titleHtml) titleHtml = paras.replace(/^<p[^>]*>|<\/p>$/g, "");
            else bodyParts.push(paras);
        }

        // Таблицы внутри слайда (a:tbl)
        for (const tbl of doc.getElementsByTagName("a:tbl")) {
            let tHtml = `<table><tbody>`;
            for (const tr of tbl.getElementsByTagName("a:tr")) {
                tHtml += "<tr>";
                for (const tc of tr.getElementsByTagName("a:tc")) {
                    const cellHtml = [...tc.getElementsByTagName("a:p")].map(parsePptxParagraph).filter(Boolean).join("");
                    tHtml += `<td>${cellHtml || "&nbsp;"}</td>`;
                }
                tHtml += "</tr>";
            }
            tHtml += `</tbody></table>`;
            bodyParts.push(tHtml);
        }

        // Картинки внутри слайда (p:pic)
        for (const pic of doc.getElementsByTagName("p:pic")) {
            const blip = pic.getElementsByTagName("a:blip")[0];
            const rId = blip?.getAttribute("r:embed");
            if (rId && relsMap[rId]) {
                const target = relsMap[rId].replace(/^\.\.\//, "ppt/");
                const imgEntry = zip.file(target);
                if (imgEntry) {
                    const ext = target.split(".").pop().toLowerCase();
                    const mime = ext === "png" ? "image/png" : ext === "svg" ? "image/svg+xml" : ext === "gif" ? "image/gif" : "image/jpeg";
                    const b64 = await imgEntry.async("base64");
                    bodyParts.push(`<img src="data:${mime};base64,${b64}" alt="Slide image">`);
                }
            }
        }

        parsedSlides.push({
            title: titleHtml || `Slayd ${parsedSlides.length + 1}`,
            body: bodyParts.join("") || "<p><br></p>",
            bg
        });
    }

    slidesData = parsedSlides;
    activeSlideIdx = 0;
    loadActiveSlideToCanvas();
    renderSlidesSidebar();
    saveCurrentOfficeDoc();
    if (typeof updateOfficeLiveStats === "function") updateOfficeLiveStats();
}

// --- 2. ПАРСЕР EXCEL (.XLSX / .XLS / .CSV) СО СТИЛЯМИ, ФОРМУЛАМИ, MERGES И ЛИСТАМИ ---
let excelWorkbookSheets = []; // [{ name, rows, cols, cells, styles, merges, colWidths }]
let activeExcelSheetIdx = 0;

async function parseXlsxStylesMap(zip) {
    const styleMap = {}; // xfIndex -> css string
    const stylesFile = zip.file("xl/styles.xml");
    if (!stylesFile) return styleMap;

    const doc = new DOMParser().parseFromString(await stylesFile.async("string"), "application/xml");

    const fonts = [...(doc.getElementsByTagName("fonts")[0]?.getElementsByTagName("font") || [])].map(f => {
        const css = [];
        if (f.getElementsByTagName("b").length) css.push("font-weight:700");
        if (f.getElementsByTagName("i").length) css.push("font-style:italic");
        if (f.getElementsByTagName("u").length) css.push("text-decoration:underline");
        const sz = f.getElementsByTagName("sz")[0]?.getAttribute("val");
        if (sz) css.push(`font-size:${Math.round(parseFloat(sz))}pt`);
        const rgb = f.getElementsByTagName("color")[0]?.getAttribute("rgb");
        if (rgb && rgb.length >= 6) css.push(`color:#${rgb.slice(-6)}`);
        return css;
    });

    const fills = [...(doc.getElementsByTagName("fills")[0]?.getElementsByTagName("fill") || [])].map(fl => {
        const fg = fl.getElementsByTagName("fgColor")[0]?.getAttribute("rgb");
        if (fg && fg.length >= 6 && fg !== "00000000") return `background-color:#${fg.slice(-6)}`;
        return "";
    });

    const xfs = [...(doc.getElementsByTagName("cellXfs")[0]?.getElementsByTagName("xf") || [])];
    xfs.forEach((xf, idx) => {
        const parts = [];
        const fId = parseInt(xf.getAttribute("fontId") || "-1", 10);
        const fillId = parseInt(xf.getAttribute("fillId") || "-1", 10);
        if (fonts[fId]) parts.push(...fonts[fId]);
        if (fills[fillId]) parts.push(fills[fillId]);

        const align = xf.getElementsByTagName("alignment")[0];
        if (align) {
            const h = align.getAttribute("horizontal");
            if (h === "center" || h === "right" || h === "left") parts.push(`text-align:${h}`);
        }
        if (parts.length) styleMap[idx] = parts.join(";");
    });

    return styleMap;
}

async function importExcelFile(file) {
    const ab = await file.arrayBuffer();
    const wb = XLSX.read(ab, { type: "array", cellFormula: true, cellStyles: true });
    const ext = file.name.split(".").pop().toLowerCase();

    let zip = null;
    let xfStyles = {};
    if (ext === "xlsx" && window.JSZip) {
        try {
            zip = await JSZip.loadAsync(ab);
            xfStyles = await parseXlsxStylesMap(zip);
        } catch (_) {}
    }

    excelWorkbookSheets = [];

    for (let sIdx = 0; sIdx < wb.SheetNames.length; sIdx++) {
        const sName = wb.SheetNames[sIdx];
        const ws = wb.Sheets[sName];
        const ref = ws["!ref"] ? XLSX.utils.decode_range(ws["!ref"]) : { s: { r: 0, c: 0 }, e: { r: 19, c: 9 } };

        const rows = Math.max(20, ref.e.r + 5);
        const cols = Math.min(26, Math.max(10, ref.e.c + 2));
        const cells = {};
        const styles = {};

        // Извлекаем значения И формулы
        Object.keys(ws).forEach(addr => {
            if (addr.startsWith("!")) return;
            const cell = ws[addr];
            if (!cell) return;
            if (cell.f) cells[addr] = "=" + cell.f;
            else if (cell.w !== undefined) cells[addr] = String(cell.w);
            else if (cell.v !== undefined) cells[addr] = String(cell.v);
        });

        // Извлекаем точные стили ячеек из sheetN.xml
        if (zip) {
            const sheetXmlFile = zip.file(`xl/worksheets/sheet${sIdx + 1}.xml`);
            if (sheetXmlFile) {
                const sDoc = new DOMParser().parseFromString(await sheetXmlFile.async("string"), "application/xml");
                for (const cNode of sDoc.getElementsByTagName("c")) {
                    const rAddr = cNode.getAttribute("r");
                    const sId = cNode.getAttribute("s");
                    if (rAddr && sId && xfStyles[sId]) styles[rAddr] = xfStyles[sId];
                }
            }
        }

        // Ширины столбцов
        const colWidths = {};
        if (ws["!cols"]) {
            ws["!cols"].forEach((colInfo, cIdx) => {
                if (colInfo && (colInfo.wpx || colInfo.wch)) {
                    colWidths[cIdx] = Math.max(55, Math.min(360, Math.round(colInfo.wpx || colInfo.wch * 8.5)));
                }
            });
        }

        // Объединённые ячейки
        const merges = (ws["!merges"] || []).map(m => ({
            s: { r: m.s.r + 1, c: m.s.c },
            e: { r: m.e.r + 1, c: m.e.c }
        }));

        excelWorkbookSheets.push({ name: sName, rows, cols, cells, styles, merges, colWidths });
    }

    activeExcelSheetIdx = 0;
    loadActiveExcelSheet();
}

function loadActiveExcelSheet() {
    const sh = excelWorkbookSheets[activeExcelSheetIdx];
    if (!sh) return;
    tableData = {
        rows: sh.rows,
        cols: sh.cols,
        cells: sh.cells,
        styles: sh.styles || {},
        merges: sh.merges || [],
        colWidths: sh.colWidths || {}
    };
    renderSpreadsheetRich();
    renderExcelSheetTabs();
    saveCurrentOfficeDoc();
    if (typeof updateOfficeLiveStats === "function") updateOfficeLiveStats();
}

function renderExcelSheetTabs() {
    const wsBox = document.querySelector(".tables-workspace");
    if (!wsBox) return;
    let bar = document.getElementById("tablesSheetsBar");
    if (!bar) {
        bar = document.createElement("div");
        bar.id = "tablesSheetsBar";
        bar.className = "tables-sheets-bar";
        wsBox.appendChild(bar);
    }
    if (excelWorkbookSheets.length <= 1) {
        bar.style.display = "none";
        return;
    }
    bar.style.display = "flex";
    bar.innerHTML = excelWorkbookSheets.map((sh, i) => `
        <button type="button" class="sheet-tab-btn ${i === activeExcelSheetIdx ? "active" : ""}" onclick="switchExcelSheet(${i})">${sh.name}</button>
    `).join("");
}

window.switchExcelSheet = function(idx) {
    if (excelWorkbookSheets[activeExcelSheetIdx]) {
        excelWorkbookSheets[activeExcelSheetIdx] = { ...excelWorkbookSheets[activeExcelSheetIdx], ...tableData };
    }
    activeExcelSheetIdx = idx;
    loadActiveExcelSheet();
};

// Улучшенный рендер таблицы с поддержкой стилей, merges и ширин столбцов
function renderSpreadsheetRich() {
    const tbl = document.getElementById("ulhSpreadsheet");
    if (!tbl) return;

    const merges = tableData.merges || [];
    const styles = tableData.styles || {};
    const skipCells = new Set();
    const mergeStart = {};

    merges.forEach(m => {
        const key = colLetter(m.s.c) + m.s.r;
        mergeStart[key] = {
            rowspan: m.e.r - m.s.r + 1,
            colspan: m.e.c - m.s.c + 1
        };
        for (let r = m.s.r; r <= m.e.r; r++) {
            for (let c = m.s.c; c <= m.e.c; c++) {
                const k = colLetter(c) + r;
                if (k !== key) skipCells.add(k);
            }
        }
    });

    let html = `<thead><tr><th>#</th>`;
    for (let c = 0; c < tableData.cols; c++) {
        const w = tableData.colWidths && tableData.colWidths[c] ? ` style="width:${tableData.colWidths[c]}px;min-width:${tableData.colWidths[c]}px;"` : "";
        html += `<th${w}>${colLetter(c)}</th>`;
    }
    html += `</tr></thead><tbody>`;

    for (let r = 1; r <= tableData.rows; r++) {
        html += `<tr><th>${r}</th>`;
        for (let c = 0; c < tableData.cols; c++) {
            const key = colLetter(c) + r;
            if (skipCells.has(key)) continue;

            const raw = tableData.cells[key] || "";
            const display = raw.startsWith("=") ? evalFormula(raw) : raw;
            const span = mergeStart[key];
            const spanAttrs = span ? ` rowspan="${span.rowspan}" colspan="${span.colspan}"` : "";
            const stAttr = styles[key] ? ` style="${styles[key]}"` : "";

            html += `<td data-cell="${key}"${spanAttrs}${stAttr} class="${key === activeCellKey ? "active-cell" : ""}" contenteditable="true"
                onfocus="selectTableCell('${key}')" onblur="commitTableCell('${key}', this.innerText)">${display}</td>`;
        }
        html += `</tr>`;
    }
    tbl.innerHTML = html + `</tbody>`;
}

// Подменяем стандартный renderSpreadsheet на версию со стилями и merges
renderSpreadsheet = renderSpreadsheetRich;

// --- 3. ОБЪЕДИНЯЕМ В ЕДИНЫЙ handleOfficeFileOpen ---
const _prevHandleOfficeFileOpen = window.handleOfficeFileOpen;
window.handleOfficeFileOpen = async function(e) {
    const f = e.target.files[0];
    if (!f) return;
    const ext = f.name.split(".").pop().toLowerCase();
    document.getElementById("officeDocTitle").value = f.name.replace(/\.[^.]+$/, "");

    if (officeMode === "slides" && (ext === "pptx" || ext === "ppt")) {
        if (ext === "pptx") {
            await importPptxFile(f);
        } else {
            alert("Eski .ppt formati brauzerda töliq öqilmaydi. Iltimos, faylni .pptx formatida yuklang.");
        }
        e.target.value = "";
        return;
    }

    if (officeMode === "tables" && ["xlsx", "xls", "csv", "xml"].includes(ext) && window.XLSX) {
        await importExcelFile(f);
        e.target.value = "";
        return;
    }

    return _prevHandleOfficeFileOpen(e);
};

// === ПОЛНОЦЕННЫЙ CTRL+A ПО ВСЕМ СТРАНИЦАМ ULH WORD (ЛЮБАЯ РАСКЛАДКА) ===
(function initGlobalWordSelectAll() {
    let isAllWordSelected = false;

    function clearAllWordSelectionFlag() {
        if (!isAllWordSelected) return;
        isAllWordSelected = false;
        document.querySelectorAll(".a4-sheet.all-doc-selected").forEach(p => p.classList.remove("all-doc-selected"));
    }

    function selectAllWordPages() {
        const container = document.getElementById("wordPagesContainer");
        if (!container) return;

        // Снимаем фокус с отдельной страницы, чтобы браузер не ограничивал выделение одной страницей
        if (document.activeElement && document.activeElement.classList.contains("a4-sheet")) {
            document.activeElement.blur();
        }

        const range = document.createRange();
        range.selectNodeContents(container);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);

        isAllWordSelected = true;
        document.querySelectorAll(".a4-sheet").forEach(p => p.classList.add("all-doc-selected"));
    }

    // Перехватываем в фазе capture (true), чтобы сработало раньше браузера и на любой раскладке
    document.addEventListener("keydown", (e) => {
        if (officeMode !== "word") return;
        const inInput = e.target.closest("input, textarea, #officeOshaChat");
        if (inInput) return;

        // Ctrl + A (работает и на EN, и на RU, и на UZ раскладке)
        if ((e.ctrlKey || e.metaKey) && e.code === "KeyA") {
            e.preventDefault();
            e.stopPropagation();
            selectAllWordPages();
            return;
        }

        if (!isAllWordSelected) return;

        // Удаление всего документа по Backspace или Delete
        if (e.key === "Backspace" || e.key === "Delete") {
            e.preventDefault();
            wordPages = ["<p><br></p>"];
            clearAllWordSelectionFlag();
            renderWordPages();
            saveCurrentOfficeDoc();
            if (typeof updateOfficeLiveStats === "function") updateOfficeLiveStats();
            const first = document.querySelector(".a4-sheet");
            if (first) first.focus();
            return;
        }

        // Вырезание всего документа по Ctrl + X
        if ((e.ctrlKey || e.metaKey) && e.code === "KeyX") {
            e.preventDefault();
            const allText = [...document.querySelectorAll(".a4-sheet")].map(p => p.innerText).join("\n\n");
            navigator.clipboard?.writeText(allText).catch(() => {});
            wordPages = ["<p><br></p>"];
            clearAllWordSelectionFlag();
            renderWordPages();
            saveCurrentOfficeDoc();
            if (typeof updateOfficeLiveStats === "function") updateOfficeLiveStats();
            const first = document.querySelector(".a4-sheet");
            if (first) first.focus();
            return;
        }

        // При нажатии Escape или стрелок снимаем флаг
        if (e.key === "Escape" || e.key.startsWith("Arrow")) {
            clearAllWordSelectionFlag();
        }
    }, true);

    // Снимаем флаг при клике мышкой по документу
    document.addEventListener("mousedown", (e) => {
        if (!e.target.closest(".office-topbar, .office-pill-ctx")) {
            clearAllWordSelectionFlag();
        }
    });

    // Применение шрифта, размера и цвета ко ВСЕМ страницам, если выделен весь документ
    const _origFont = window.applyOfficeFont;
    window.applyOfficeFont = function(fontName) {
        if (isAllWordSelected && officeMode === "word") {
            document.querySelectorAll(".a4-sheet").forEach(p => {
                p.style.fontFamily = `'${fontName}', sans-serif`;
                p.querySelectorAll("*").forEach(el => { if (el.style.fontFamily) el.style.fontFamily = `'${fontName}', sans-serif`; });
            });
            syncWordPagesFromDom(); saveCurrentOfficeDoc();
            return;
        }
        _origFont(fontName);
    };

    const _origSize = window.applyOfficeFontSize;
    window.applyOfficeFontSize = function(px) {
        if (isAllWordSelected && officeMode === "word") {
            document.querySelectorAll(".a4-sheet").forEach(p => {
                p.style.fontSize = px + "px";
                p.querySelectorAll("*").forEach(el => { if (el.style.fontSize) el.style.fontSize = px + "px"; });
            });
            syncWordPagesFromDom(); saveCurrentOfficeDoc();
            return;
        }
        _origSize(px);
    };

    const _origColor = window.applyOfficeColor;
    window.applyOfficeColor = function(cmd, color) {
        if (isAllWordSelected && officeMode === "word") {
            document.querySelectorAll(".a4-sheet").forEach(p => {
                if (cmd === "foreColor") p.style.color = color;
            });
            syncWordPagesFromDom(); saveCurrentOfficeDoc();
            return;
        }
        _origColor(cmd, color);
    };
})();

// === ГАРАНТИРОВАННЫЙ ПОКАЗ КНОПОК УДАЛЕНИЯ СТРОКИ/СТОЛБЦА В ПКМ ===
document.addEventListener("contextmenu", (e) => {
    const targetEl = e.target.nodeType === 3 ? e.target.parentElement : e.target;
    let cell = targetEl?.closest?.(".a4-sheet table td, .a4-sheet table th");

    if (!cell) {
        const selNode = window.getSelection()?.anchorNode;
        const selEl = selNode?.nodeType === 3 ? selNode.parentElement : selNode;
        cell = selEl?.closest?.(".a4-sheet table td, .a4-sheet table th");
    }

    lastCtxTableCell = cell || null;
    const show = !!lastCtxTableCell;

    ["ctxTblSep", "ctxDelRowBtn", "ctxDelColBtn"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle("ctx-tbl-visible", show);
    });
}, true);

// === ФИКС УДАЛЕНИЯ СТРОКИ И СТОЛБЦА (ЗАЩИТА ОТ СБРОСА ЯЧЕЙКИ) ===
window.__ulhCtxTableCell = null;

function findCurrentWordTableCell(eventTarget) {
    const targetEl = eventTarget && eventTarget.nodeType === 3 ? eventTarget.parentElement : eventTarget;
    let cell = targetEl?.closest?.(".a4-sheet table td, .a4-sheet table th");
    if (!cell) {
        const selNode = window.getSelection()?.anchorNode;
        const selEl = selNode && selNode.nodeType === 3 ? selNode.parentElement : selNode;
        cell = selEl?.closest?.(".a4-sheet table td, .a4-sheet table th");
    }
    return cell || null;
}

document.addEventListener("contextmenu", (e) => {
    window.__ulhCtxTableCell = findCurrentWordTableCell(e.target);
}, true);

window.ctxDeleteTableRow = function() {
    const cell = window.__ulhCtxTableCell || findCurrentWordTableCell(null);
    if (!cell) return;

    const tr = cell.closest("tr");
    const tbl = cell.closest("table");
    if (!tr || !tbl) return;

    if (tbl.rows.length <= 1) {
        tbl.remove();
    } else {
        tr.remove();
    }

    window.__ulhCtxTableCell = null;
    document.getElementById("tblAddRowBtn")?.classList.remove("tbl-plus-visible", "show");
    document.getElementById("tblAddColBtn")?.classList.remove("tbl-plus-visible", "show");
    closeOfficeContextMenu();
    syncWordPagesFromDom();
    saveCurrentOfficeDoc();
    if (typeof updateOfficeLiveStats === "function") updateOfficeLiveStats();
};

window.ctxDeleteTableCol = function() {
    const cell = window.__ulhCtxTableCell || findCurrentWordTableCell(null);
    if (!cell) return;

    const colIdx = cell.cellIndex;
    const tbl = cell.closest("table");
    if (!tbl || colIdx < 0) return;

    const firstRowCols = tbl.rows[0]?.cells.length || 0;
    if (firstRowCols <= 1) {
        tbl.remove();
    } else {
        [...tbl.rows].forEach(row => {
            if (row.cells[colIdx]) row.deleteCell(colIdx);
        });
        const remCells = [...(tbl.rows[0]?.cells || [])];
        if (remCells.length) {
            const pct = (100 / remCells.length).toFixed(2) + "%";
            remCells.forEach(c => { c.style.width = pct; });
        }
    }

    window.__ulhCtxTableCell = null;
    document.getElementById("tblAddRowBtn")?.classList.remove("tbl-plus-visible", "show");
    document.getElementById("tblAddColBtn")?.classList.remove("tbl-plus-visible", "show");
    closeOfficeContextMenu();
    syncWordPagesFromDom();
    saveCurrentOfficeDoc();
    if (typeof updateOfficeLiveStats === "function") updateOfficeLiveStats();
};

// ==========================================
// === 1. СТРОГОЕ ВЕРТИКАЛЬНОЕ / ПРЯМОУГОЛЬНОЕ ВЫДЕЛЕНИЕ ЯЧЕЕК ТАБЛИЦЫ ===
// ==========================================
(function initStrictTableColumnSelection() {
    let isDraggingCells = false;
    let activeTbl = null;
    let startPos = null; // { r, c }

    function clearCellSelection() {
        document.querySelectorAll(".ulh-cell-selected").forEach(el => el.classList.remove("ulh-cell-selected"));
        document.querySelectorAll(".ulh-selecting-cells").forEach(el => el.classList.remove("ulh-selecting-cells"));
    }

    function getCellPos(tbl, cell) {
        const rows = [...tbl.rows];
        const r = rows.indexOf(cell.parentElement);
        return { r, c: cell.cellIndex };
    }

    function highlightCellRect(tbl, p1, p2) {
        clearCellSelection();
        tbl.classList.add("ulh-selecting-cells");
        const rMin = Math.min(p1.r, p2.r), rMax = Math.max(p1.r, p2.r);
        const cMin = Math.min(p1.c, p2.c), cMax = Math.max(p1.c, p2.c);

        const rows = [...tbl.rows];
        for (let r = rMin; r <= rMax; r++) {
            const row = rows[r];
            if (!row) continue;
            for (let c = cMin; c <= cMax; c++) {
                if (row.cells[c]) row.cells[c].classList.add("ulh-cell-selected");
            }
        }
    }

    document.addEventListener("mousedown", (e) => {
        if (e.button !== 0 || document.body.classList.contains("col-resizing")) return;
        const cell = e.target.closest?.(".a4-sheet .word-table td, .a4-sheet .word-table th");
        if (!cell) {
            if (!e.target.closest(".office-topbar, .office-pill-ctx")) clearCellSelection();
            return;
        }
        clearCellSelection();
        activeTbl = cell.closest(".word-table");
        startPos = getCellPos(activeTbl, cell);
        isDraggingCells = true;
    });

    document.addEventListener("mousemove", (e) => {
        if (!isDraggingCells || !activeTbl || !startPos || document.body.classList.contains("col-resizing")) return;
        const cell = e.target.closest?.(".a4-sheet .word-table td, .a4-sheet .word-table th");
        if (!cell || cell.closest(".word-table") !== activeTbl) return;

        const curPos = getCellPos(activeTbl, cell);
        // Включаем строгое выделение ячеек, как только курсор перешёл в другую ячейку
        if (curPos.r !== startPos.r || curPos.c !== startPos.c) {
            window.getSelection()?.removeAllRanges();
            highlightCellRect(activeTbl, startPos, curPos);
        }
    });

    document.addEventListener("mouseup", () => {
        if (!isDraggingCells) return;
        isDraggingCells = false;
        if (activeTbl) activeTbl.classList.remove("ulh-selecting-cells");
    });

    // Действия с выделенными ячейками: Delete / Backspace / Ctrl+C
    document.addEventListener("keydown", (e) => {
        const selected = [...document.querySelectorAll(".word-table .ulh-cell-selected")];
        if (!selected.length) return;

        if (e.key === "Delete" || e.key === "Backspace") {
            e.preventDefault();
            selected.forEach(c => { c.innerHTML = "&nbsp;"; });
            clearCellSelection();
            syncWordPagesFromDom();
            saveCurrentOfficeDoc();
            return;
        }

        if ((e.ctrlKey || e.metaKey) && e.code === "KeyC") {
            e.preventDefault();
            const byRow = new Map();
            selected.forEach(c => {
                const tr = c.parentElement;
                if (!byRow.has(tr)) byRow.set(tr, []);
                byRow.get(tr).push(c.innerText.trim());
            });
            const tsv = [...byRow.values()].map(arr => arr.join("\t")).join("\n");
            navigator.clipboard?.writeText(tsv).catch(() => {});
        }
    }, true);

    // Применение форматирования (жирный, курсив, выравнивание, цвет, шрифт) ко всем выделенным ячейкам столбца
    const _origExecFmt = window.execOfficeFormat;
    window.execOfficeFormat = function(cmd, val = null) {
        const selected = [...document.querySelectorAll(".word-table .ulh-cell-selected")];
        if (selected.length) {
            selected.forEach(cell => {
                if (cmd === "bold") cell.style.fontWeight = cell.style.fontWeight === "700" ? "400" : "700";
                else if (cmd === "italic") cell.style.fontStyle = cell.style.fontStyle === "italic" ? "normal" : "italic";
                else if (cmd === "underline") cell.style.textDecoration = cell.style.textDecoration.includes("underline") ? "none" : "underline";
                else if (cmd === "justifyLeft") cell.style.textAlign = "left";
                else if (cmd === "justifyCenter") cell.style.textAlign = "center";
                else if (cmd === "justifyRight") cell.style.textAlign = "right";
                else if (cmd === "justifyFull") cell.style.textAlign = "justify";
            });
            syncWordPagesFromDom();
            saveCurrentOfficeDoc();
            return;
        }
        _origExecFmt(cmd, val);
    };

    const _origApplyColor = window.applyOfficeColor;
    window.applyOfficeColor = function(cmd, color) {
        const selected = [...document.querySelectorAll(".word-table .ulh-cell-selected")];
        if (selected.length) {
            selected.forEach(cell => {
                if (cmd === "foreColor") cell.style.color = color;
                else cell.style.backgroundColor = color;
            });
            syncWordPagesFromDom();
            saveCurrentOfficeDoc();
            return;
        }
        _origApplyColor(cmd, color);
    };
})();

// ==========================================
// === 2. НАДЁЖНЫЙ CTRL+Z (UNDO) И CTRL+Y (REDO) ===
// ==========================================
(function initReliableOfficeUndoRedo() {
    const MAX_STACK = 60;
    const undoStack = [];
    const redoStack = [];
    let isRestoring = false;
    let inputTimer = null;

    function getSnapshot() {
        if (officeMode === "word") return JSON.stringify({ mode: "word", data: wordPages });
        if (officeMode === "slides") return JSON.stringify({ mode: "slides", data: slidesData, idx: activeSlideIdx });
        return JSON.stringify({ mode: "tables", data: tableData });
    }

    function pushUndoSnapshot() {
        if (isRestoring) return;
        const snap = getSnapshot();
        if (undoStack.length && undoStack[undoStack.length - 1] === snap) return;
        undoStack.push(snap);
        if (undoStack.length > MAX_STACK) undoStack.shift();
        redoStack.length = 0;
    }

    function applySnapshot(snapStr) {
        if (!snapStr) return;
        isRestoring = true;
        try {
            const parsed = JSON.parse(snapStr);
            if (parsed.mode === "word") {
                wordPages = parsed.data;
                renderWordPages();
                if (typeof applyPageNumbersToSheets === "function") applyPageNumbersToSheets();
            } else if (parsed.mode === "slides") {
                slidesData = parsed.data;
                activeSlideIdx = Math.min(parsed.idx || 0, slidesData.length - 1);
                loadActiveSlideToCanvas();
                renderSlidesSidebar();
            } else if (parsed.mode === "tables") {
                tableData = parsed.data;
                renderSpreadsheet();
            }
            if (typeof _baseSaveOfficeDoc === "function") _baseSaveOfficeDoc();
            if (typeof updateOfficeLiveStats === "function") updateOfficeLiveStats();
        } finally {
            isRestoring = false;
        }
    }

    // Оборачиваем saveCurrentOfficeDoc, чтобы каждое действие попадало в стек Undo
    const _baseSaveOfficeDoc = window.saveCurrentOfficeDoc;
    window.saveCurrentOfficeDoc = function() {
        _baseSaveOfficeDoc();
        if (!isRestoring) {
            clearTimeout(inputTimer);
            inputTimer = setTimeout(pushUndoSnapshot, 220);
        }
    };

    window.performOfficeUndo = function() {
        clearTimeout(inputTimer);
        pushUndoSnapshot(); // фиксируем текущее состояние перед откатом
        if (undoStack.length <= 1) return;
        const current = undoStack.pop();
        redoStack.push(current);
        applySnapshot(undoStack[undoStack.length - 1]);
    };

    window.performOfficeRedo = function() {
        if (!redoStack.length) return;
        const next = redoStack.pop();
        undoStack.push(next);
        applySnapshot(next);
    };

    // Перехватываем Ctrl+Z и Ctrl+Y / Ctrl+Shift+Z на любой раскладке клавиатуры
    document.addEventListener("keydown", (e) => {
        if (e.target.closest("input, textarea, #officeOshaChat")) return;
        if (!(e.ctrlKey || e.metaKey)) return;

        if (e.code === "KeyZ" && !e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            window.performOfficeUndo();
        } else if (e.code === "KeyY" || (e.code === "KeyZ" && e.shiftKey)) {
            e.preventDefault();
            e.stopPropagation();
            window.performOfficeRedo();
        }
    }, true);

    // Сохраняем стартовое состояние после загрузки
    document.addEventListener("DOMContentLoaded", () => {
        setTimeout(pushUndoSnapshot, 300);
    });
})();


// === НИЖНИЙ БЕГУНОК ВЕРТИКАЛЬНОЙ ЛИНЕЙКИ (ГРАНИЦА ПОДВАЛА) ===
let rulerMarginBottom = 20; // mm

(function initVerticalRulerBottomMargin() {
    function ensureBottomRulerNodes() {
        const vwrap = document.getElementById("wordVRulerWrap");
        if (!vwrap) return null;

        let shadeB = document.getElementById("vrulerShadeBottom");
        if (!shadeB) {
            shadeB = document.createElement("div");
            shadeB.id = "vrulerShadeBottom";
            shadeB.className = "vruler-margin-shade bottom";
            vwrap.appendChild(shadeB);
        }

        let handleB = document.getElementById("vrulerBottomHandle");
        if (!handleB) {
            handleB = document.createElement("div");
            handleB.id = "vrulerBottomHandle";
            handleB.className = "vruler-handle bottom-margin";
            handleB.title = "Pastki çegara (Podval)";
            vwrap.appendChild(handleB);
        }
        return { vwrap, shadeB, handleB };
    }

    function syncBottomMargin() {
        const nodes = ensureBottomRulerNodes();
        if (!nodes) return;

        const docH = (typeof currentDocHeightMm === "number" && currentDocHeightMm > 0) ? currentDocHeightMm : 297;
        const bPct = (rulerMarginBottom / docH) * 100;

        nodes.shadeB.style.height = bPct + "%";
        nodes.handleB.style.bottom = bPct + "%";

        document.querySelectorAll(".a4-sheet").forEach(p => {
            p.style.paddingBottom = rulerMarginBottom + "mm";
        });
    }

    function bindBottomDrag() {
        const nodes = ensureBottomRulerNodes();
        if (!nodes) return;

        nodes.handleB.onmousedown = (e) => {
            e.preventDefault();
            const onMove = (ev) => {
                const rect = nodes.vwrap.getBoundingClientRect();
                const docH = (typeof currentDocHeightMm === "number" && currentDocHeightMm > 0) ? currentDocHeightMm : 297;
                const mmFromBottom = Math.round(((rect.bottom - ev.clientY) / rect.height) * docH);
                rulerMarginBottom = Math.max(8, Math.min(70, mmFromBottom));
                syncBottomMargin();
            };
            const onUp = () => {
                document.removeEventListener("mousemove", onMove);
                document.removeEventListener("mouseup", onUp);
            };
            document.addEventListener("mousemove", onMove);
            document.addEventListener("mouseup", onUp);
        };
    }

    // Синхронизация при перестройке линеек (смена ориентации)
    if (typeof syncAllRulerHandles === "function") {
        const _origSyncAll = syncAllRulerHandles;
        syncAllRulerHandles = function() {
            _origSyncAll();
            syncBottomMargin();
        };
    }

    // Синхронизация при перерисовке страниц А4
    if (typeof renderWordPages === "function") {
        const _origRenderPages = renderWordPages;
        renderWordPages = function() {
            _origRenderPages();
            syncBottomMargin();
        };
    }

    // Синхронизация с модалкой «Sahifa parametrlari» (Pastki mm)
    if (typeof window.openPageSetupModal === "function") {
        const _origOpenPS = window.openPageSetupModal;
        window.openPageSetupModal = function() {
            _origOpenPS();
            const psB = document.getElementById("psBottom");
            if (psB) psB.value = rulerMarginBottom;
        };
    }

    if (typeof window.applyPageSetup === "function") {
        const _origApplyPS = window.applyPageSetup;
        window.applyPageSetup = function() {
            const psB = document.getElementById("psBottom");
            if (psB) rulerMarginBottom = Math.max(8, Math.min(70, +psB.value || 20));
            _origApplyPS();
            syncBottomMargin();
        };
    }

    document.addEventListener("DOMContentLoaded", () => {
        setTimeout(() => {
            bindBottomDrag();
            syncBottomMargin();
        }, 180);
    });
})();

// ==========================================
// === КОНТЕКСТНЫЕ ИНСТРУМЕНТЫ ТАБЛИЦЫ (РИСОВАНИЕ, ЛАСТИК, ЗАЛИВКА, ГРАНИЦЫ) ===
// ==========================================
(function initTableProTools() {
    let activeTableTool = null; // 'draw' | 'erase' | null
    let lastTableCell = null;
    let overflowTimer = null;

    function getCursorTableCell() {
        const sel = window.getSelection();
        const node = sel?.anchorNode;
        const el = node && node.nodeType === 3 ? node.parentElement : node;
        return el?.closest?.(".a4-sheet table td, .a4-sheet table th") || null;
    }

    function setTableToolsVisible(show) {
        const box = document.getElementById("tableContextTools");
        if (!box) return;
        if (show) {
            if (!box.classList.contains("visible")) {
                box.classList.add("visible");
                clearTimeout(overflowTimer);
                // Открываем overflow после завершения выезда, чтобы меню границ не обрезалось
                overflowTimer = setTimeout(() => box.classList.add("allow-overflow"), 320);
            }
        } else {
            clearTimeout(overflowTimer);
            box.classList.remove("allow-overflow", "visible");
            document.getElementById("tableBordersWrap")?.classList.remove("open");
            if (activeTableTool) toggleTableLineTool(activeTableTool);
        }
    }

    function syncTableToolsVisibility(targetEl) {
        if (officeMode !== "word") {
            setTableToolsVisible(false);
            return;
        }
        // Не скрываем панель, если кликнули по самой панели инструментов таблицы
        if (targetEl?.closest?.("#tableContextTools, #tableBordersWrap")) return;

        const selectedCells = document.querySelectorAll(".word-table .ulh-cell-selected");
        const cell = targetEl?.closest?.(".a4-sheet table td, .a4-sheet table th") || getCursorTableCell();

        if (cell) {
            lastTableCell = cell;
            setTableToolsVisible(true);
        } else if (selectedCells.length > 0) {
            lastTableCell = selectedCells[0];
            setTableToolsVisible(true);
        } else {
            lastTableCell = null;
            setTableToolsVisible(false);
        }
    }

    document.addEventListener("click", (e) => syncTableToolsVisibility(e.target));
    document.addEventListener("keyup", () => syncTableToolsVisibility(null));
    document.addEventListener("selectionchange", () => {
        if (officeMode === "word") {
            const cell = getCursorTableCell();
            if (cell) {
                lastTableCell = cell;
                setTableToolsVisible(true);
            }
        }
    });

    function getTargetCells() {
        const sel = [...document.querySelectorAll(".word-table .ulh-cell-selected")];
        if (sel.length) return sel;
        const cur = getCursorTableCell() || lastTableCell;
        return cur ? [cur] : [];
    }

    // 1. Заливка фоном выделенных ячеек
    window.applyTableCellFill = function(color) {
        const dot = document.getElementById("tblFillDot");
        if (dot) dot.style.background = color;
        const cells = getTargetCells();
        if (!cells.length) return;
        cells.forEach(c => { c.style.backgroundColor = color; });
        syncWordPagesFromDom();
        saveCurrentOfficeDoc();
    };

    // 2. Управление границами (все 8 режимов как в MS Word)
    const SOLID_BORDER = "1.5px solid #334155";
    const NO_BORDER = "none";

    window.applyTableBorders = function(type) {
        const cells = getTargetCells();
        if (!cells.length) return;
        const tbl = cells[0].closest("table");
        const rows = tbl ? [...tbl.rows] : [];

        // Вычисляем прямоугольник выделения для режимов outer / inner
        let rMin = Infinity, rMax = -1, cMin = Infinity, cMax = -1;
        cells.forEach(cell => {
            const r = rows.indexOf(cell.parentElement);
            const c = cell.cellIndex;
            if (r < rMin) rMin = r;
            if (r > rMax) rMax = r;
            if (c < cMin) cMin = c;
            if (c > cMax) cMax = c;
        });

        cells.forEach(cell => {
            const r = rows.indexOf(cell.parentElement);
            const c = cell.cellIndex;

            if (type === "bottom") cell.style.borderBottom = SOLID_BORDER;
            else if (type === "top") cell.style.borderTop = SOLID_BORDER;
            else if (type === "left") cell.style.borderLeft = SOLID_BORDER;
            else if (type === "right") cell.style.borderRight = SOLID_BORDER;
            else if (type === "none") cell.style.border = NO_BORDER;
            else if (type === "all") cell.style.border = SOLID_BORDER;
            else if (type === "outer") {
                if (r === rMin) cell.style.borderTop = SOLID_BORDER;
                if (r === rMax) cell.style.borderBottom = SOLID_BORDER;
                if (c === cMin) cell.style.borderLeft = SOLID_BORDER;
                if (c === cMax) cell.style.borderRight = SOLID_BORDER;
            } else if (type === "inner") {
                if (r > rMin) cell.style.borderTop = SOLID_BORDER;
                if (r < rMax) cell.style.borderBottom = SOLID_BORDER;
                if (c > cMin) cell.style.borderLeft = SOLID_BORDER;
                if (c < cMax) cell.style.borderRight = SOLID_BORDER;
            }
        });

        document.getElementById("tableBordersWrap")?.classList.remove("open");
        syncWordPagesFromDom();
        saveCurrentOfficeDoc();
    };

    // 3. Рисование линий и Ластик (клик по нужной стороне ячейки)
    window.toggleTableLineTool = function(mode) {
        activeTableTool = (activeTableTool === mode) ? null : mode;
        document.getElementById("tblDrawBtn")?.classList.toggle("tool-active", activeTableTool === "draw");
        document.getElementById("tblEraseBtn")?.classList.toggle("tool-active", activeTableTool === "erase");
        document.body.classList.toggle("tbl-mode-draw", activeTableTool === "draw");
        document.body.classList.toggle("tbl-mode-erase", activeTableTool === "erase");
    };

    document.addEventListener("mousedown", (e) => {
        if (!activeTableTool) return;
        const cell = e.target.closest?.(".a4-sheet .word-table td, .a4-sheet .word-table th");
        if (!cell) return;

        e.preventDefault();
        const rect = cell.getBoundingClientRect();
        const dTop = Math.abs(e.clientY - rect.top);
        const dBottom = Math.abs(rect.bottom - e.clientY);
        const dLeft = Math.abs(e.clientX - rect.left);
        const dRight = Math.abs(rect.right - e.clientX);
        const min = Math.min(dTop, dBottom, dLeft, dRight);

        const tbl = cell.closest("table");
        const rows = [...tbl.rows];
        const r = rows.indexOf(cell.parentElement);
        const c = cell.cellIndex;
        const val = activeTableTool === "draw" ? SOLID_BORDER : NO_BORDER;

        // Меняем границу и у текущей ячейки, и у смежной (чтобы при ластике линия исчезала полностью)
        if (min === dTop) {
            cell.style.borderTop = val;
            if (rows[r - 1]?.cells[c]) rows[r - 1].cells[c].style.borderBottom = val;
        } else if (min === dBottom) {
            cell.style.borderBottom = val;
            if (rows[r + 1]?.cells[c]) rows[r + 1].cells[c].style.borderTop = val;
        } else if (min === dLeft) {
            cell.style.borderLeft = val;
            if (rows[r]?.cells[c - 1]) rows[r].cells[c - 1].style.borderRight = val;
        } else {
            cell.style.borderRight = val;
            if (rows[r]?.cells[c + 1]) rows[r].cells[c + 1].style.borderLeft = val;
        }

        syncWordPagesFromDom();
        saveCurrentOfficeDoc();
    }, true);

    // Выход из режима рисования/ластика по Escape
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && activeTableTool) toggleTableLineTool(activeTableTool);
    });

    // Закрытие меню границ при клике вне него
    document.addEventListener("click", (e) => {
        if (!e.target.closest("#tableBordersWrap")) {
            document.getElementById("tableBordersWrap")?.classList.remove("open");
        }
    });
})();
