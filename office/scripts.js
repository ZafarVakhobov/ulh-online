// ==========================================
// === ULH OFFICE — ПОЛНАЯ СТАБИЛЬНАЯ СБОРКА ===
// ==========================================
const OFFICE_AI_URL = "https://ulh-ai-helper.lanigirodesigner.workers.dev/";
const OFFICE_IZOH_URL = "https://ulh-izoh-proxy.lanigirodesigner.workers.dev/";

function safeJsonParse(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
        console.warn("ULH Office: сброс повреждённого кеша", key, e);
        try { localStorage.removeItem(key); } catch (_) {}
        return fallback;
    }
}

let officeMode = localStorage.getItem("ulh_office_active_mode") || "word";
let officeZoom = 1;
let savedRange = null;
let pendingPasteNode = null;

let rulerMarginLeft = 20;   // mm
let rulerMarginRight = 20;  // mm
let rulerFirstLine = 0;     // mm
let rulerMarginTop = 20;    // mm
let rulerMarginBottom = 20; // mm
let currentDocWidthMm = 210;
let currentDocHeightMm = 297;

let wordPages = safeJsonParse("ulh_office_word_pages_v2", [
    "<h2>ULH Word</h2><p>Bu yerda hujjatingizni yozişingiz mumkin. Sahifa tölganda avtomatik yangi A4 sahifa oçiladi.</p>"
]);
if (!Array.isArray(wordPages) || !wordPages.length) {
    wordPages = ["<p><br></p>"];
}

let slidesData = safeJsonParse("ulh_office_slides_v1", [
    { title: "Taqdimot sarlavhasi", body: "Slayd matnini şu yerga kiriting...", bg: "#FFFFFF" }
]);
if (!Array.isArray(slidesData) || !slidesData.length) {
    slidesData = [{ title: "Taqdimot sarlavhasi", body: "Slayd matnini şu yerga kiriting...", bg: "#FFFFFF" }];
}
let activeSlideIdx = 0;

let tableData = safeJsonParse("ulh_office_tables_v1", {
    rows: 20,
    cols: 10,
    cells: {
        "A1": "Mahsulot", "B1": "Soni", "C1": "Narx",
        "A2": "Kitob", "B2": "5", "C2": "45000",
        "A3": "Daftar", "B3": "12", "C3": "8000"
    }
});
if (!tableData || typeof tableData !== "object" || !tableData.cells) {
    tableData = { rows: 20, cols: 10, cells: {} };
}
let activeCellKey = "A1";

let pageOrientations = safeJsonParse("ulh_office_orients_v1", []);
let pageNumConfig = safeJsonParse("ulh_office_pagenum_v1", { pos: "none", align: "center" });
let activeWordPageIdx = 0;
let selectedImgEl = null;
let hoveredWordTable = null;
let lastCtxSelectedText = "";
let lastCtxTableCell = null;
window.__ulhCtxTableCell = null;

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
        const el = node && node.nodeType === 3 ? node.parentElement : node;
        if (el && el.closest && el.closest(".a4-sheet, #slideCanvas")) {
            savedRange = sel.getRangeAt(0).cloneRange();
        }
    }
});

function restoreSavedSelection() {
    if (!savedRange) return;
    try {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(savedRange);
    } catch (_) {}
}

function syncWordPagesFromDom() {
    const sheets = document.querySelectorAll(".a4-sheet");
    if (sheets.length) {
        wordPages = [...sheets].map(p => p.innerHTML);
    }
}

// === 1. ЗАГРУЗКА (4 СЕКУНДЫ) И БЕЗОПАСНАЯ ИНИЦИАЛИЗАЦИЯ ===
function runOfficeLoader(label, color, cb) {
    const loader = document.getElementById("officeLoader");
    const fill = document.getElementById("officeLoaderFill");
    const titleEl = document.getElementById("officeLoaderTitle");
    const spinEl = document.getElementById("officeLoaderSpinner");
    if (!loader || !fill) {
        if (cb) cb();
        return;
    }
    if (titleEl) titleEl.textContent = `${label} yuklanmoqda...`;
    if (spinEl) spinEl.style.borderTopColor = color;
    fill.style.background = color;
    fill.style.transition = "none";
    fill.style.width = "0%";
    loader.classList.add("active");
    requestAnimationFrame(() => {
        fill.style.transition = "width 3.9s linear";
        fill.style.width = "100%";
    });
    setTimeout(() => {
        try { if (cb) cb(); } catch (err) { console.error(err); }
        loader.classList.remove("active");
    }, 4000);
}

function getModeMeta(mode) {
    if (mode === "slides") return { label: "ULH Slides", color: "#EF4444" };
    if (mode === "tables") return { label: "ULH Tables", color: "#10B981" };
    return { label: "ULH Word", color: "#0284C7" };
}

document.addEventListener("DOMContentLoaded", () => {
    try {
        initColorPopovers();
        renderWordPages();
        renderSlidesSidebar();
        loadActiveSlideToCanvas();
        renderSpreadsheet();
        renderOfficeOshaHistory();

        const isLand = pageOrientations[0] === "landscape";
        rebuildRulersForOrientation(isLand);
        bindFixedRulerEvents();
        applyPageNumbersToSheets();
        updateOfficeLiveStats();
    } catch (err) {
        console.error("ULH Office init error:", err);
    }

    const meta = getModeMeta(officeMode);
    runOfficeLoader(meta.label, meta.color, () => applyOfficeModeUI(officeMode));

    const sTitle = document.getElementById("slideTitleBox");
    const sBody = document.getElementById("slideBodyBox");
    if (sTitle && sBody) {
        [sTitle, sBody].forEach(el => {
            el.addEventListener("input", () => {
                slidesData[activeSlideIdx].title = sTitle.innerHTML;
                slidesData[activeSlideIdx].body = sBody.innerHTML;
                saveCurrentOfficeDoc();
                renderSlidesSidebar();
            });
            el.addEventListener("paste", handleSmartUzbekPaste);
        });
    }
});

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
    if (badge) {
        badge.textContent = getModeMeta(mode).label;
        badge.className = "office-mode-badge mode-" + mode;
    }

    const playBtn = document.getElementById("officePlaySlideBtn");
    if (playBtn) playBtn.style.display = mode === "slides" ? "inline-flex" : "none";
    const newPageBtn = document.getElementById("rbNewPageBtn");
    if (newPageBtn) newPageBtn.style.display = mode === "word" ? "inline-flex" : "none";
    const rbTableBtn = document.getElementById("rbInsertTableBtn");
    if (rbTableBtn) rbTableBtn.style.display = mode === "word" ? "flex" : "none";

    const grpPara = document.getElementById("rbGroupParagraph");
    if (grpPara) grpPara.style.display = mode === "tables" ? "none" : "flex";
    const grpStyles = document.getElementById("rbGroupStyles");
    if (grpStyles) grpStyles.style.display = mode === "tables" ? "none" : "flex";
    const grpTables = document.getElementById("rbGroupTablesData");
    if (grpTables) grpTables.style.display = mode === "tables" ? "flex" : "none";

    const titleInp = document.getElementById("officeDocTitle");
    if (titleInp) titleInp.value = localStorage.getItem("ulh_office_title_" + mode) || ("Yangi " + mode);
    updatePageCounter();

    const saveMenu = document.getElementById("officeSaveMenu");
    const fileInput = document.getElementById("officeFileInput");
    if (saveMenu && fileInput) {
        if (mode === "word") {
            fileInput.accept = ".doc,.docx,.rtf,.txt,.html";
            saveMenu.innerHTML = `<button onclick="exportOfficeFile('doc')"><span class="ext-badge doc">.DOC</span> Word 97-2003</button><button onclick="exportOfficeFile('docx')"><span class="ext-badge docx">.DOCX</span> Word hujjat</button><button onclick="exportOfficeFile('rtf')"><span class="ext-badge rtf">.RTF</span> Rich Text</button><button onclick="exportOfficeFile('pdf')"><span class="ext-badge pdf">.PDF</span> PDF hujjat</button>`;
        } else if (mode === "slides") {
            fileInput.accept = ".ppt,.pptx,.html";
            saveMenu.innerHTML = `<button onclick="exportOfficeFile('ppt')"><span class="ext-badge ppt">.PPT</span> PowerPoint</button><button onclick="exportOfficeFile('pptx')"><span class="ext-badge pptx">.PPTX</span> Taqdimot</button><button onclick="exportOfficeFile('pdf')"><span class="ext-badge pdf">.PDF</span> PDF slaydlar</button>`;
        } else {
            fileInput.accept = ".xlsx,.xls,.xml,.csv";
            saveMenu.innerHTML = `<button onclick="exportOfficeFile('xlsx')"><span class="ext-badge xlsx">.XLSX</span> Excel jadval</button><button onclick="exportOfficeFile('xls')"><span class="ext-badge xls">.XLS</span> Excel 97-2003</button><button onclick="exportOfficeFile('xml')"><span class="ext-badge xml">.XML</span> XML jadval</button><button onclick="exportOfficeFile('pdf')"><span class="ext-badge pdf">.PDF</span> PDF jadval</button>`;
        }
    }

    applyPageNumbersToSheets();
    if (typeof window.updateFixedHRuler === "function") window.updateFixedHRuler();
}

// === 2. МНОГОСТРАНИЧНЫЙ А4 (АВТО-ПЕРЕНОС И УДАЛЕНИЕ ПУСТЫХ СТРАНИЦ) ===
function renderWordPages() {
    const container = document.getElementById("wordPagesContainer");
    if (!container) return;
    container.innerHTML = "";
    wordPages.forEach((html, idx) => {
        const page = document.createElement("div");
        page.className = "a4-sheet";
        if (pageOrientations[idx] === "landscape") page.classList.add("landscape");
        page.contentEditable = "true";
        page.spellcheck = false;
        page.dataset.pageIndex = idx;
        page.style.paddingLeft = rulerMarginLeft + "mm";
        page.style.paddingRight = rulerMarginRight + "mm";
        page.style.paddingTop = rulerMarginTop + "mm";
        page.style.paddingBottom = rulerMarginBottom + "mm";
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
            if (e.key === "Backspace" && plain === "" && wordPages.length > 1 && idx > 0) {
                e.preventDefault();
                wordPages.splice(idx, 1);
                renderWordPages();
                saveCurrentOfficeDoc();
                const prev = document.querySelector(`.a4-sheet[data-page-index="${idx - 1}"]`);
                if (prev) prev.focus();
                return;
            }
            if (e.key === "Delete" && idx + 1 < wordPages.length) {
                const sel = window.getSelection();
                if (sel && sel.isCollapsed && sel.rangeCount) {
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
    applyPageNumbersToSheets();
}

function checkPageOverflow(pageEl, idx) {
    if (pageEl.scrollHeight <= pageEl.clientHeight + 2) return;
    let overflowHtml = "";
    while (pageEl.scrollHeight > pageEl.clientHeight + 2 && pageEl.lastChild) {
        const last = pageEl.lastChild;
        if (last.classList && last.classList.contains("a4-page-num")) break;
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
    if (officeMode === "word") el.textContent = `Sahifa ${Math.min(activeWordPageIdx + 1, wordPages.length)} / ${wordPages.length}`;
    else if (officeMode === "slides") el.textContent = `Slayd ${activeSlideIdx + 1} / ${slidesData.length}`;
    else el.textContent = `Katak: ${activeCellKey}`;
}

// === 3. ЛИНЕЙКИ (ГОРИЗОНТАЛЬНАЯ + ВЕРТИКАЛЬНАЯ С ВЕРХНИМ И НИЖНИМ БЕГУНКОМ) ===
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
    const bPct = (rulerMarginBottom / currentDocHeightMm) * 100;

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

    const bNodes = ensureBottomRulerNodes();
    if (bNodes) {
        bNodes.shadeB.style.height = bPct + "%";
        bNodes.handleB.style.bottom = bPct + "%";
    }

    document.querySelectorAll(".a4-sheet").forEach(p => {
        p.style.paddingLeft = rulerMarginLeft + "mm";
        p.style.paddingRight = rulerMarginRight + "mm";
        p.style.paddingTop = rulerMarginTop + "mm";
        p.style.paddingBottom = rulerMarginBottom + "mm";
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
            const onUp = () => {
                document.removeEventListener("mousemove", onMove);
                document.removeEventListener("mouseup", onUp);
            };
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
            const onUp = () => {
                document.removeEventListener("mousemove", onMove);
                document.removeEventListener("mouseup", onUp);
            };
            document.addEventListener("mousemove", onMove);
            document.addEventListener("mouseup", onUp);
        };
    }

    const bNodes = ensureBottomRulerNodes();
    if (bNodes) {
        bNodes.handleB.onmousedown = (e) => {
            e.preventDefault();
            const onMove = (ev) => {
                const rect = bNodes.vwrap.getBoundingClientRect();
                const mmFromBottom = Math.round(((rect.bottom - ev.clientY) / rect.height) * currentDocHeightMm);
                rulerMarginBottom = Math.max(8, Math.min(70, mmFromBottom));
                syncAllRulerHandles();
            };
            const onUp = () => {
                document.removeEventListener("mousemove", onMove);
                document.removeEventListener("mouseup", onUp);
            };
            document.addEventListener("mousemove", onMove);
            document.addEventListener("mouseup", onUp);
        };
    }
}

// Портал горизонтальной линейки в body (фикс масштабирования)
(function fixHorizontalRulerPortal() {
    function mountHRulerToBody() {
        const hruler = document.querySelector(".word-ruler-top-row.sticky-ruler");
        if (!hruler) return;
        if (hruler.parentElement !== document.body) {
            document.body.appendChild(hruler);
        }
        window.updateFixedHRuler();
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

    window.addEventListener("resize", window.updateFixedHRuler);
    document.addEventListener("DOMContentLoaded", () => setTimeout(mountHRulerToBody, 120));
})();

// Вертикальная линейка следует за активной страницей
function syncActivePageAndVRuler(pageEl) {
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

    updatePageCounter();
    if (typeof window.updateFixedHRuler === "function") window.updateFixedHRuler();
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

// === 4. ВЫПАДАЮЩИЕ МЕНЮ, ПАЛИТРЫ ЦВЕТОВ И ФОРМАТИРОВАНИЕ ===
function closeAllOfficeMenus(exceptId = null) {
    ["officeSaveWrap", "foreColorWrap", "backColorWrap", "bulletMenuWrap", "lineHeightWrap", "pageNumMenuWrap", "tableBordersWrap", "textCaseWrap"]
        .forEach(id => { if (id !== exceptId) document.getElementById(id)?.classList.remove("open"); });
    document.getElementById("officeContextMenu")?.classList.remove("open");
}

window.toggleOfficeSaveMenu = (e) => { e.stopPropagation(); closeAllOfficeMenus("officeSaveWrap"); document.getElementById("officeSaveWrap")?.classList.toggle("open"); };
window.toggleColorPop = (id, e) => { e.stopPropagation(); closeAllOfficeMenus(id); document.getElementById(id)?.classList.toggle("open"); };
window.toggleSimpleDrop = (id, e) => { e.stopPropagation(); closeAllOfficeMenus(id); document.getElementById(id)?.classList.toggle("open"); };

document.addEventListener("click", (e) => {
    if (!e.target.closest(".office-dropdown-wrap")) closeAllOfficeMenus();
    if (!e.target.closest("#officeContextMenu")) closeOfficeContextMenu();
});

const ULH_SWATCHES = ["#0F172A","#334155","#64748B","#EF4444","#F97316","#F59E0B","#10B981","#0284C7","#6366F1","#8B5CF6","#EC4899"];
function initColorPopovers() {
    [["foreColorPop","foreColor","foreColorCircle"], ["backColorPop","hiliteColor","backColorCircle"]].forEach(([popId, cmd, circId]) => {
        const pop = document.getElementById(popId);
        if (!pop) return;
        pop.innerHTML = ULH_SWATCHES.map(c => `<button type="button" class="pop-swatch" style="background:${c}" onmousedown="event.preventDefault()" onclick="pickOfficeSwatch('${cmd}','${c}','${circId}')"></button>`).join("") +
            `<label class="pop-rainbow" title="Boshqa rang"><input type="color" onchange="pickOfficeSwatch('${cmd}', this.value, '${circId}')"></label>`;
    });
}

window.pickOfficeSwatch = (cmd, color, circId) => {
    const circ = document.getElementById(circId);
    if (circ) circ.style.background = color;
    applyOfficeColor(cmd, color);
    document.querySelectorAll(".color-pop-wrap").forEach(w => w.classList.remove("open"));
};

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
        ul.dataset.bulletType = styleType;
        ul.style.listStyleType = styleType === "dash" ? "none" : styleType;
    }
    document.getElementById("bulletMenuWrap")?.classList.remove("open");
    if (officeMode === "word") syncWordPagesFromDom();
    saveCurrentOfficeDoc();
};

window.applyLineHeight = (lh) => {
    restoreSavedSelection();
    const sel = window.getSelection();
    const blk = sel?.anchorNode?.parentElement?.closest("p, div, li, h1, h2, h3");
    if (blk && !blk.classList.contains("a4-sheet")) blk.style.lineHeight = lh;
    else document.querySelectorAll(".a4-sheet").forEach(p => p.style.lineHeight = lh);
    document.getElementById("lineHeightWrap")?.classList.remove("open");
    if (officeMode === "word") syncWordPagesFromDom();
    saveCurrentOfficeDoc();
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

document.addEventListener("click", (e) => {
    const link = e.target.closest(".a4-sheet a, #slideCanvas a");
    if (link && link.href) {
        e.preventDefault();
        window.open(link.href, "_blank", "noopener,noreferrer");
    }
});

// === 5. СТРОГАЯ ВСТАВКА HTML В ПОЗИЦИЮ КУРСОРА ===
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

// === 6. ПАРАМЕТРЫ СТРАНИЦЫ, ТАБЛИЦЫ, КАРТИНКИ, ГРАФИКИ, ФОРМУЛЫ, ЦИТАТЫ ===
let psSelectedOrient = "portrait";
window.openPageSetupModal = () => {
    document.getElementById("psTop").value = rulerMarginTop;
    document.getElementById("psBottom").value = rulerMarginBottom;
    document.getElementById("psLeft").value = rulerMarginLeft;
    document.getElementById("psRight").value = rulerMarginRight;
    document.getElementById("pageSetupModal").classList.add("open");
};
window.selectPageOrient = (o) => {
    psSelectedOrient = o;
    document.getElementById("psPortraitBtn")?.classList.toggle("active", o === "portrait");
    document.getElementById("psLandscapeBtn")?.classList.toggle("active", o === "landscape");
};
window.applyPageSetup = () => {
    rulerMarginTop = Math.max(8, Math.min(70, +document.getElementById("psTop").value || 20));
    rulerMarginBottom = Math.max(8, Math.min(70, +document.getElementById("psBottom").value || 20));
    rulerMarginLeft = Math.max(8, Math.min(80, +document.getElementById("psLeft").value || 20));
    rulerMarginRight = Math.max(8, Math.min(80, +document.getElementById("psRight").value || 20));
    const scope = document.getElementById("psScope").value;
    document.querySelectorAll(".a4-sheet").forEach((p, i) => {
        if (scope === "all" || i >= activeWordPageIdx) {
            pageOrientations[i] = psSelectedOrient;
            p.classList.toggle("landscape", psSelectedOrient === "landscape");
        }
    });
    localStorage.setItem("ulh_office_orients_v1", JSON.stringify(pageOrientations));
    rebuildRulersForOrientation(psSelectedOrient === "landscape");
    document.getElementById("pageSetupModal").classList.remove("open");
};

window.setPageNumbers = (pos, align) => {
    pageNumConfig = { pos, align };
    localStorage.setItem("ulh_office_pagenum_v1", JSON.stringify(pageNumConfig));
    applyPageNumbersToSheets();
    document.getElementById("pageNumMenuWrap")?.classList.remove("open");
};
function applyPageNumbersToSheets() {
    document.querySelectorAll(".a4-sheet").forEach((p, i) => {
        p.querySelectorAll(".a4-page-num").forEach(n => n.remove());
        if (pageNumConfig && pageNumConfig.pos !== "none") {
            const num = document.createElement("div");
            num.className = `a4-page-num ${pageNumConfig.pos} ${pageNumConfig.align}`;
            num.contentEditable = "false";
            num.textContent = String(i + 1);
            p.appendChild(num);
        }
        if (pageOrientations[i] === "landscape") p.classList.add("landscape");
    });
}

// Конструктор таблицы Word
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
    insertHtmlAtCursor(html);
    document.getElementById("tableBuilderModal").classList.remove("open");
};

// Картинки, ресайз, обтекание и обрезка (Crop)
window.openImageInsertModal = () => document.getElementById("imageInsertModal").classList.add("open");
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
    const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        syncWordPagesFromDom(); saveCurrentOfficeDoc();
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
});

let cropTargetImg = null;
window.openImgCropModal = function() {
    if (!selectedImgEl) return;
    cropTargetImg = selectedImgEl;
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
    canvas.width = cw; canvas.height = ch;
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

// Конструктор графиков
window.openOfficeChartModal = function() {
    renderOfficeChartRows();
    renderOfficeChartPreview();
    document.getElementById("officeChartModal").classList.add("open");
};
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
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${Math.max(H, 60 + officeChartItems.length * 32)}" viewBox="0 0 ${W} ${Math.max(H, 60 + officeChartItems.length * 32)}" style="font-family:Manrope,Arial,sans-serif;background:#FFFFFF;border:none;border-radius:12px;">
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
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="font-family:Manrope,Arial,sans-serif;background:#FFFFFF;border:none;border-radius:12px;">
            <text x="16" y="28" font-size="16" font-weight="800" fill="#0F172A">${title}</text>${arcs}${legend}</svg>`;
    }
}
window.renderOfficeChartPreview = () => { document.getElementById("ocPreview").innerHTML = buildOfficeChartSvg(); };
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

// Уравнения и Цитаты
window.openEquationModal = () => document.getElementById("equationModal").classList.add("open");
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
    insertHtmlAtCursor(`<blockquote class="office-quote-block"><p class="office-quote-text">«${esc(text)}»</p>${authorHtml}</blockquote><p><br></p>`);
    document.getElementById("quoteInsertModal").classList.remove("open");
};

// === 7. TABLES (EXCEL): ФОРМУЛЫ, СТИЛИ, MERGES, ЛИСТЫ ===
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

    const merges = tableData.merges || [];
    const styles = tableData.styles || {};
    const skipCells = new Set();
    const mergeStart = {};

    merges.forEach(m => {
        const key = colLetter(m.s.c) + m.s.r;
        mergeStart[key] = { rowspan: m.e.r - m.s.r + 1, colspan: m.e.c - m.s.c + 1 };
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
    tableData.cells[activeCellKey] = `=${fn}(${col}1:${col}${Math.max(1, row - 1)})`;
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

// === 8. КОНТЕКСТНОЕ МЕНЮ ПКМ (СТИЛИ, ССЫЛКИ, AI, УДАЛЕНИЕ СТРОКИ/СТОЛБЦА) ===
const ICO_LINK = `<svg class="ti" viewBox="0 0 24 24"><path d="M9 15l6 -6"/><path d="M11 6l.463 -.536a5 5 0 0 1 7.071 7.072l-.534 .464"/><path d="M13 18l-.397 .534a5.068 5.068 0 0 1 -7.127 0a4.972 4.972 0 0 1 0 -7.071l.524 -.463"/></svg>`;
const ICO_UNLINK = `<svg class="ti" viewBox="0 0 24 24"><path d="M17 22v-2"/><path d="M9 15l6 -6"/><path d="M11 6l.463 -.536a5 5 0 0 1 7.071 7.072l-.534 .464"/><path d="M13 18l-.397 .534a5.068 5.068 0 0 1 -7.127 0a4.972 4.972 0 0 1 0 -7.071l.524 -.463"/><path d="M20 17h2"/><path d="M2 7h2"/><path d="M7 2v2"/></svg>`;

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
    const insideSheet = e.target.closest?.(".a4-sheet, #slideCanvas, #ulhSpreadsheet");
    const menu = document.getElementById("officeContextMenu");
    if (!insideSheet || !menu) return;

    e.preventDefault();
    lastCtxSelectedText = (window.getSelection()?.toString() || "").trim();
    const hasSel = lastCtxSelectedText.length > 0;
    const isSingleWord = hasSel && lastCtxSelectedText.split(/\s+/).filter(Boolean).length === 1;

    const selSep = document.getElementById("ctxSelSep");
    if (selSep) selSep.style.display = hasSel ? "inline-block" : "none";
    document.getElementById("ctxTranslateBtn").style.display = hasSel ? "inline-flex" : "none";
    document.getElementById("ctxSynonymBtn").style.display = isSingleWord ? "inline-flex" : "none";
    document.getElementById("ctxIzohBtn").style.display = isSingleWord ? "inline-flex" : "none";

    // Кнопки удаления строки и столбца таблицы
    window.__ulhCtxTableCell = findCurrentWordTableCell(e.target);
    lastCtxTableCell = window.__ulhCtxTableCell;
    const showTbl = !!window.__ulhCtxTableCell;
    ["ctxTblSep", "ctxDelRowBtn", "ctxDelColBtn"].forEach(id => {
        document.getElementById(id)?.classList.toggle("ctx-tbl-visible", showTbl);
    });

    // Подсветка активных стилей и ссылки
    ["Bold", "Italic", "Underline", "Strike"].forEach(st => {
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

    menu.style.left = Math.max(12, Math.min(e.clientX - 120, window.innerWidth - 520)) + "px";
    menu.style.top = Math.max(12, e.clientY - 48) + "px";
    menu.classList.add("open");
}, true);

window.closeOfficeContextMenu = () => document.getElementById("officeContextMenu")?.classList.remove("open");
window.ctxExec = (cmd) => { restoreSavedSelection(); document.execCommand(cmd); if (officeMode === "word") syncWordPagesFromDom(); closeOfficeContextMenu(); saveCurrentOfficeDoc(); };
window.ctxPaste = async () => {
    try {
        const t = await navigator.clipboard.readText();
        restoreSavedSelection();
        document.execCommand("insertText", false, t);
        if (officeMode === "word") syncWordPagesFromDom();
        saveCurrentOfficeDoc();
    } catch (_) {}
    closeOfficeContextMenu();
};
window.ctxToggleLink = () => {
    const lBtn = document.getElementById("ctxLinkBtn");
    restoreSavedSelection();
    if (lBtn?.dataset.unlink === "1") document.execCommand("unlink");
    else insertOfficeLink();
    closeOfficeContextMenu();
    syncWordPagesFromDom(); saveCurrentOfficeDoc();
};
window.replaceSelectedOfficeText = (newText) => {
    restoreSavedSelection();
    document.execCommand("insertText", false, newText);
    if (officeMode === "word") syncWordPagesFromDom();
    saveCurrentOfficeDoc();
    document.getElementById("officeQuickResultModal").classList.remove("open");
};

window.ctxDeleteTableRow = function() {
    const cell = window.__ulhCtxTableCell || findCurrentWordTableCell(null);
    if (!cell) return;
    const tr = cell.closest("tr");
    const tbl = cell.closest("table");
    if (!tr || !tbl) return;
    if (tbl.rows.length <= 1) tbl.remove();
    else tr.remove();
    window.__ulhCtxTableCell = null;
    document.getElementById("tblAddRowBtn")?.classList.remove("tbl-plus-visible", "show");
    document.getElementById("tblAddColBtn")?.classList.remove("tbl-plus-visible", "show");
    closeOfficeContextMenu();
    syncWordPagesFromDom(); saveCurrentOfficeDoc(); updateOfficeLiveStats();
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
        [...tbl.rows].forEach(row => { if (row.cells[colIdx]) row.deleteCell(colIdx); });
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
    syncWordPagesFromDom(); saveCurrentOfficeDoc(); updateOfficeLiveStats();
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

    try {
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
                return `<div class="ctx-res-row"><button type="button" class="ctx-replace-btn" onclick="replaceSelectedOfficeText('${safe}')">${val}</button><button type="button" class="ctx-copy-mini" onclick="navigator.clipboard.writeText('${safe}')" title="Nusxalaş">${copyIco}</button></div>`;
            }).join("") + `</div>`;
    } catch (_) {
        body.textContent = "Xatolik yuz berdi.";
    }
};

window.ctxIzohAction = async function() {
    closeOfficeContextMenu();
    if (!lastCtxSelectedText) return;
    const word = typeof lemmatizeUzbekWord === "function" ? lemmatizeUzbekWord(lastCtxSelectedText) : lastCtxSelectedText;
    const modal = document.getElementById("officeQuickResultModal");
    document.getElementById("officeQuickTitle").textContent = `Izohli luğat: ${word}`;
    document.getElementById("officeQuickBody").textContent = "izoh.uz bazasidan qidirilmoqda...";
    modal.classList.add("open");
    try {
        const res = await fetch(`${OFFICE_IZOH_URL}?word=${encodeURIComponent(word)}`);
        const data = await res.json();
        document.getElementById("officeQuickBody").innerHTML = (data && data.found && data.definitionHtml) ? data.definitionHtml : "Söz bazada topilmadi.";
    } catch (_) {
        document.getElementById("officeQuickBody").textContent = "Xatolik yuz berdi.";
    }
};

// === 9. КНОПКИ + У ТАБЛИЦ, РЕСАЙЗ СТОЛБЦОВ, СТРОГОЕ ВЫДЕЛЕНИЕ И PRO-ИНСТРУМЕНТЫ ===
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
        const tbl = e.target.closest?.(".a4-sheet .word-table");
        if (tbl) { positionAndShow(tbl); return; }
        if (e.target.closest?.(".tbl-float-plus")) { clearTimeout(hideTimer); return; }
        if (activeTbl) {
            const r = activeTbl.getBoundingClientRect();
            const inZone = e.clientX >= r.left - 16 && e.clientX <= r.right + 48 && e.clientY >= r.top - 16 && e.clientY <= r.bottom + 48;
            if (inZone) clearTimeout(hideTimer);
            else scheduleHide();
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
        if (activeTbl) positionAndShow(activeTbl);
    };

    window.addWordTableCol = () => {
        if (!hoveredWordTable) return;
        [...hoveredWordTable.rows].forEach((row, idx) => {
            const cell = document.createElement(idx === 0 && row.parentElement.tagName === "THEAD" ? "th" : "td");
            cell.innerHTML = idx === 0 && row.parentElement.tagName === "THEAD" ? `Sarlavha ${row.cells.length + 1}` : "&nbsp;";
            row.appendChild(cell);
        });
        syncWordPagesFromDom(); saveCurrentOfficeDoc();
        if (activeTbl) positionAndShow(activeTbl);
    };
})();

// Ресайз столбцов таблиц
(function initTableColumnResizing() {
    const EDGE_THRESHOLD = 6;
    const MIN_COL_PX = 36;
    const guide = document.createElement("div");
    guide.className = "tbl-col-guide";
    document.body.appendChild(guide);
    let dragState = null;

    function getBorderHit(e) {
        const wordCell = e.target.closest?.(".a4-sheet .word-table th, .a4-sheet .word-table td");
        if (wordCell) {
            const tbl = wordCell.closest(".word-table");
            const row = wordCell.parentElement;
            const colIdx = wordCell.cellIndex;
            const totalCols = row.cells.length;
            const rect = wordCell.getBoundingClientRect();
            if (colIdx < totalCols - 1 && Math.abs(e.clientX - rect.right) <= EDGE_THRESHOLD) return { mode: "word", tbl, colIdx, rect };
            if (colIdx > 0 && Math.abs(e.clientX - rect.left) <= EDGE_THRESHOLD) return { mode: "word", tbl, colIdx: colIdx - 1, rect };
        }
        const sheetTh = e.target.closest?.("#ulhSpreadsheet thead th");
        if (sheetTh && sheetTh.cellIndex > 0) {
            const rect = sheetTh.getBoundingClientRect();
            if (Math.abs(e.clientX - rect.right) <= EDGE_THRESHOLD) return { mode: "sheet", th: sheetTh, colIdx: sheetTh.cellIndex - 1, rect };
        }
        return null;
    }

    document.addEventListener("mousemove", (e) => {
        if (dragState) {
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
            return;
        }
        const hit = getBorderHit(e);
        const target = e.target.closest?.(".word-table th, .word-table td, #ulhSpreadsheet thead th");
        if (target) target.style.cursor = hit ? "col-resize" : "";
    });

    document.addEventListener("mousedown", (e) => {
        if (e.button !== 0) return;
        const hit = getBorderHit(e);
        if (!hit) return;
        e.preventDefault(); e.stopPropagation();
        const zoom = officeZoom > 0 ? officeZoom : 1;
        if (hit.mode === "word") {
            const tbl = hit.tbl, firstRow = tbl.rows[0];
            if (!firstRow) return;
            const tblRect = tbl.getBoundingClientRect();
            const widthsPx = [...firstRow.cells].map(c => c.getBoundingClientRect().width / zoom);
            const totalW = widthsPx.reduce((a, b) => a + b, 0) || 1;
            [...firstRow.cells].forEach((c, i) => { c.style.width = ((widthsPx[i] / totalW) * 100).toFixed(2) + "%"; });
            dragState = { mode: "word", tbl, firstRow, colIdx: hit.colIdx, startX: e.clientX, startW1: widthsPx[hit.colIdx], startW2: widthsPx[hit.colIdx + 1], totalW, zoom };
            guide.style.top = tblRect.top + "px"; guide.style.height = tblRect.height + "px"; guide.style.left = e.clientX + "px"; guide.style.display = "block";
        } else {
            const tblRect = document.getElementById("ulhSpreadsheet").getBoundingClientRect();
            dragState = { mode: "sheet", th: hit.th, colIdx: hit.colIdx, startX: e.clientX, startW: hit.rect.width / zoom, zoom };
            guide.style.top = tblRect.top + "px"; guide.style.height = tblRect.height + "px"; guide.style.left = e.clientX + "px"; guide.style.display = "block";
        }
        document.body.classList.add("col-resizing");
    });

    document.addEventListener("mouseup", () => {
        if (!dragState) return;
        const finishedMode = dragState.mode;
        dragState = null;
        guide.style.display = "none";
        document.body.classList.remove("col-resizing");
        if (finishedMode === "word") syncWordPagesFromDom();
        saveCurrentOfficeDoc();
    });
})();

// Строгое вертикальное / прямоугольное выделение ячеек таблицы
(function initStrictTableColumnSelection() {
    let isDraggingCells = false, activeTbl = null, startPos = null;
    function clearCellSelection() {
        document.querySelectorAll(".ulh-cell-selected").forEach(el => el.classList.remove("ulh-cell-selected"));
        document.querySelectorAll(".ulh-selecting-cells").forEach(el => el.classList.remove("ulh-selecting-cells"));
    }
    function getCellPos(tbl, cell) { return { r: [...tbl.rows].indexOf(cell.parentElement), c: cell.cellIndex }; }
    function highlightCellRect(tbl, p1, p2) {
        clearCellSelection();
        tbl.classList.add("ulh-selecting-cells");
        const rMin = Math.min(p1.r, p2.r), rMax = Math.max(p1.r, p2.r);
        const cMin = Math.min(p1.c, p2.c), cMax = Math.max(p1.c, p2.c);
        const rows = [...tbl.rows];
        for (let r = rMin; r <= rMax; r++) {
            for (let c = cMin; c <= cMax; c++) {
                if (rows[r]?.cells[c]) rows[r].cells[c].classList.add("ulh-cell-selected");
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
    document.addEventListener("keydown", (e) => {
        const selected = [...document.querySelectorAll(".word-table .ulh-cell-selected")];
        if (!selected.length) return;
        if (e.key === "Delete" || e.key === "Backspace") {
            e.preventDefault();
            selected.forEach(c => { c.innerHTML = "&nbsp;"; });
            clearCellSelection(); syncWordPagesFromDom(); saveCurrentOfficeDoc();
        } else if ((e.ctrlKey || e.metaKey) && e.code === "KeyC") {
            e.preventDefault();
            const byRow = new Map();
            selected.forEach(c => {
                const tr = c.parentElement;
                if (!byRow.has(tr)) byRow.set(tr, []);
                byRow.get(tr).push(c.innerText.trim());
            });
            navigator.clipboard?.writeText([...byRow.values()].map(arr => arr.join("\t")).join("\n")).catch(() => {});
        }
    }, true);

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
            syncWordPagesFromDom(); saveCurrentOfficeDoc();
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
            syncWordPagesFromDom(); saveCurrentOfficeDoc();
            return;
        }
        _origApplyColor(cmd, color);
    };
})();

// Контекстные инструменты таблицы (рисование, ластик, заливка, границы, цвет границ)
(function initTableProTools() {
    let activeTableTool = null, lastTableCell = null, overflowTimer = null;
    let tableBorderColor = "#334155";
    const getSolidBorder = () => `1.5px solid ${tableBorderColor}`;
    const NO_BORDER = "none";

    window.setTableBorderColor = (color) => { tableBorderColor = color || "#334155"; };

    function getCursorTableCell() {
        const node = window.getSelection()?.anchorNode;
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
        if (officeMode !== "word") { setTableToolsVisible(false); return; }
        if (targetEl?.closest?.("#tableContextTools, #tableBordersWrap")) return;
        const selectedCells = document.querySelectorAll(".word-table .ulh-cell-selected");
        const cell = targetEl?.closest?.(".a4-sheet table td, .a4-sheet table th") || getCursorTableCell();
        if (cell) { lastTableCell = cell; setTableToolsVisible(true); }
        else if (selectedCells.length > 0) { lastTableCell = selectedCells[0]; setTableToolsVisible(true); }
        else { lastTableCell = null; setTableToolsVisible(false); }
    }

    document.addEventListener("click", (e) => syncTableToolsVisibility(e.target));
    document.addEventListener("keyup", () => syncTableToolsVisibility(null));
    document.addEventListener("selectionchange", () => {
        if (officeMode === "word") {
            const cell = getCursorTableCell();
            if (cell) { lastTableCell = cell; setTableToolsVisible(true); }
        }
    });

    function getTargetCells() {
        const sel = [...document.querySelectorAll(".word-table .ulh-cell-selected")];
        if (sel.length) return sel;
        const cur = getCursorTableCell() || lastTableCell;
        return cur ? [cur] : [];
    }

    window.applyTableCellFill = function(color) {
        const dot = document.getElementById("tblFillDot");
        if (dot) dot.style.background = color;
        const cells = getTargetCells();
        if (!cells.length) return;
        cells.forEach(c => { c.style.backgroundColor = color; });
        syncWordPagesFromDom(); saveCurrentOfficeDoc();
    };

    window.applyTableBorders = function(type) {
        const cells = getTargetCells();
        if (!cells.length) return;
        const tbl = cells[0].closest("table");
        const rows = tbl ? [...tbl.rows] : [];
        let rMin = Infinity, rMax = -1, cMin = Infinity, cMax = -1;
        cells.forEach(cell => {
            const r = rows.indexOf(cell.parentElement), c = cell.cellIndex;
            if (r < rMin) rMin = r; if (r > rMax) rMax = r;
            if (c < cMin) cMin = c; if (c > cMax) cMax = c;
        });
        cells.forEach(cell => {
            const r = rows.indexOf(cell.parentElement), c = cell.cellIndex;
            if (type === "bottom") cell.style.borderBottom = getSolidBorder();
            else if (type === "top") cell.style.borderTop = getSolidBorder();
            else if (type === "left") cell.style.borderLeft = getSolidBorder();
            else if (type === "right") cell.style.borderRight = getSolidBorder();
            else if (type === "none") cell.style.border = NO_BORDER;
            else if (type === "all") cell.style.border = getSolidBorder();
            else if (type === "outer") {
                if (r === rMin) cell.style.borderTop = getSolidBorder();
                if (r === rMax) cell.style.borderBottom = getSolidBorder();
                if (c === cMin) cell.style.borderLeft = getSolidBorder();
                if (c === cMax) cell.style.borderRight = getSolidBorder();
            } else if (type === "inner") {
                if (r > rMin) cell.style.borderTop = getSolidBorder();
                if (r < rMax) cell.style.borderBottom = getSolidBorder();
                if (c > cMin) cell.style.borderLeft = getSolidBorder();
                if (c < cMax) cell.style.borderRight = getSolidBorder();
            }
        });
        document.getElementById("tableBordersWrap")?.classList.remove("open");
        syncWordPagesFromDom(); saveCurrentOfficeDoc();
    };

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
        const dTop = Math.abs(e.clientY - rect.top), dBottom = Math.abs(rect.bottom - e.clientY);
        const dLeft = Math.abs(e.clientX - rect.left), dRight = Math.abs(rect.right - e.clientX);
        const min = Math.min(dTop, dBottom, dLeft, dRight);
        const rows = [...cell.closest("table").rows];
        const r = rows.indexOf(cell.parentElement), c = cell.cellIndex;
        const val = activeTableTool === "draw" ? getSolidBorder() : NO_BORDER;

        if (min === dTop) { cell.style.borderTop = val; if (rows[r - 1]?.cells[c]) rows[r - 1].cells[c].style.borderBottom = val; }
        else if (min === dBottom) { cell.style.borderBottom = val; if (rows[r + 1]?.cells[c]) rows[r + 1].cells[c].style.borderTop = val; }
        else if (min === dLeft) { cell.style.borderLeft = val; if (rows[r]?.cells[c - 1]) rows[r].cells[c - 1].style.borderRight = val; }
        else { cell.style.borderRight = val; if (rows[r]?.cells[c + 1]) rows[r].cells[c + 1].style.borderLeft = val; }

        syncWordPagesFromDom(); saveCurrentOfficeDoc();
    }, true);

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && activeTableTool) toggleTableLineTool(activeTableTool);
    });
})();

// === 10. СОХРАНЕНИЕ, ЗУМ, УМНАЯ ВСТАВКА, ТРАНСЛИТЕРАЦИЯ, SLIDES, СТАТИСТИКА, ÖŞA AI ===
window.saveCurrentOfficeDoc = function() {
    localStorage.setItem("ulh_office_title_" + officeMode, document.getElementById("officeDocTitle")?.value || "Yangi hujjat");
    localStorage.setItem("ulh_office_active_mode", officeMode);
    localStorage.setItem("ulh_office_has_draft", "1");
    if (officeMode === "word") localStorage.setItem("ulh_office_word_pages_v2", JSON.stringify(wordPages));
    else if (officeMode === "slides") localStorage.setItem("ulh_office_slides_v1", JSON.stringify(slidesData));
    else localStorage.setItem("ulh_office_tables_v1", JSON.stringify(tableData));
};
window.minimizeOfficeToMain = () => { saveCurrentOfficeDoc(); window.location.href = "/"; };

window.adjustOfficeZoom = function(d) {
    officeZoom = Math.max(0.5, Math.min(2.0, +(officeZoom + d).toFixed(2)));
    const zw = document.getElementById("officeZoomWrapper");
    if (zw) zw.style.transform = `scale(${officeZoom})`;
    const zl = document.getElementById("officeZoomLabel");
    if (zl) zl.textContent = Math.round(officeZoom * 100) + "%";
    if (typeof window.updateFixedHRuler === "function") window.updateFixedHRuler();
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
    const list = document.getElementById("slidesThumbList");
    if (!list) return;
    list.innerHTML = slidesData.map((s, i) => `
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

// Статистика
function getOfficePlainText() {
    if (officeMode === "word") return [...document.querySelectorAll(".a4-sheet")].map(p => p.innerText || "").join("\n").trim();
    if (officeMode === "slides") return slidesData.map(s => `${s.title} ${s.body}`.replace(/<[^>]+>/g, " ")).join("\n").trim();
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
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set("officeLiveChars", `${fmt(charsWith)} belgi`);
    set("offStatCharsWith", fmt(charsWith));
    set("offStatCharsNo", fmt(charsNo));
    set("offStatCardChars", `${fmt(charsWith)} / ${fmt(charsNo)}`);
    set("offStatWords", fmt(words));
    set("offStatLinesParas", `${fmt(lines)} / ${fmt(paras)}`);
    set("offStatReadTime", readTime);
}
window.openOfficeStatsModal = () => { updateOfficeLiveStats(); document.getElementById("officeStatsModal").classList.add("open"); };
document.addEventListener("input", updateOfficeLiveStats);

// История и Öşa AI
function getHistKey() { return "ulh_office_hist_" + officeMode; }
function pushOfficeHistorySnapshot() {
    const content = JSON.stringify(officeMode === "word" ? wordPages : officeMode === "slides" ? slidesData : tableData);
    let arr = safeJsonParse(getHistKey(), []);
    if (arr.length && arr[arr.length - 1].content === content) return;
    arr.push({ time: new Date().toLocaleTimeString("uz-UZ"), content });
    if (arr.length > 30) arr.shift();
    localStorage.setItem(getHistKey(), JSON.stringify(arr));
}
window.openOfficeHistoryModal = () => {
    const arr = safeJsonParse(getHistKey(), []);
    if (!arr.length) return alert("Hali tarix saqlanmagan.");
    const sl = document.getElementById("officeHistSlider"); sl.max = arr.length - 1; sl.value = arr.length - 1;
    previewOfficeHistory(); document.getElementById("officeHistoryModal").classList.add("open");
};
window.previewOfficeHistory = () => {
    const arr = safeJsonParse(getHistKey(), []), item = arr[document.getElementById("officeHistSlider").value];
    if (!item) return;
    document.getElementById("officeHistTime").textContent = "Vaqt: " + item.time;
    document.getElementById("officeHistPreview").innerHTML = officeMode === "word" ? JSON.parse(item.content).join("<hr>") : `<pre>${item.content.slice(0, 600)}</pre>`;
};
window.restoreOfficeHistory = () => {
    const arr = safeJsonParse(getHistKey(), []), item = arr[document.getElementById("officeHistSlider").value];
    if (!item) return;
    if (officeMode === "word") { wordPages = JSON.parse(item.content); renderWordPages(); }
    else if (officeMode === "slides") { slidesData = JSON.parse(item.content); loadActiveSlideToCanvas(); renderSlidesSidebar(); }
    else { tableData = JSON.parse(item.content); renderSpreadsheet(); }
    saveCurrentOfficeDoc(); document.getElementById("officeHistoryModal").classList.remove("open");
};

let officeOshaChatHist = safeJsonParse("oshaChatHistory", []);
window.toggleOfficeOsha = () => document.getElementById("officeOshaChat").classList.toggle("hidden");
window.clearOfficeOshaChat = () => { officeOshaChatHist = []; localStorage.removeItem("oshaChatHistory"); renderOfficeOshaHistory(); };
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

// === 11. ИМПОРТ / ЭКСПОРТ (.DOCX, .PPTX, .XLSX, .PDF) ===
window.triggerOfficeFileOpen = () => document.getElementById("officeFileInput").click();
window.printOfficeDocument = () => window.print();

window.exportOfficeFile = async (ext) => {
    document.getElementById("officeSaveWrap")?.classList.remove("open");
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

function parseDocxRunHtml(runNode) {
    const rPr = runNode.getElementsByTagName("w:rPr")[0];
    const styles = [];
    let wrapTag = null;
    if (rPr) {
        const isOn = (tag) => { const el = rPr.getElementsByTagName(tag)[0]; if (!el) return false; const v = el.getAttribute("w:val"); return v !== "0" && v !== "false" && v !== "none"; };
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
    let textHtml = "", hasPageBreak = false;
    for (const child of runNode.childNodes) {
        if (child.nodeName === "w:t") textHtml += (child.textContent || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        else if (child.nodeName === "w:tab") textHtml += "&nbsp;&nbsp;&nbsp;&nbsp;";
        else if (child.nodeName === "w:br") { if (child.getAttribute("w:type") === "page") hasPageBreak = true; else textHtml += "<br>"; }
    }
    if (wrapTag && textHtml) textHtml = `<${wrapTag}>${textHtml}</${wrapTag}>`;
    if (styles.length && textHtml) textHtml = `<span style="${styles.join(";")}">${textHtml}</span>`;
    return { html: textHtml, hasPageBreak };
}

function parseDocxParagraphHtml(pNode) {
    const pPr = pNode.getElementsByTagName("w:pPr")[0];
    const pStyles = [];
    let tag = "p", pageBreakBefore = false;
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
            if (line > 0 && sp.getAttribute("w:lineRule") !== "exact") pStyles.push(`line-height:${(line / 240).toFixed(2)}`);
        }
        if (pPr.getElementsByTagName("w:pageBreakBefore")[0]) pageBreakBefore = true;
    }
    let inner = "", hasPageBreak = false;
    for (const child of pNode.childNodes) {
        if (child.nodeName === "w:r") { const res = parseDocxRunHtml(child); inner += res.html; if (res.hasPageBreak) hasPageBreak = true; }
        else if (child.nodeName === "w:hyperlink") {
            let linkInner = "";
            for (const r of child.getElementsByTagName("w:r")) linkInner += parseDocxRunHtml(r).html;
            if (linkInner) inner += `<a href="#" target="_blank">${linkInner}</a>`;
        }
    }
    const styleAttr = pStyles.length ? ` style="${pStyles.join(";")}"` : "";
    return { html: `<${tag}${styleAttr}>${inner || "<br>"}</${tag}>`, pageBreakBefore, hasPageBreak };
}

function parseDocxTableHtml(tblNode) {
    let html = `<table class="word-table"><tbody>`;
    [...tblNode.childNodes].filter(n => n.nodeName === "w:tr").forEach(tr => {
        html += "<tr>";
        [...tr.childNodes].filter(n => n.nodeName === "w:tc").forEach(tc => {
            const shd = tc.getElementsByTagName("w:shd")[0]?.getAttribute("w:fill");
            const bg = (shd && shd !== "auto" && /^[0-9A-Fa-f]{6}$/.test(shd)) ? ` style="background:#${shd};"` : "";
            const cellParas = [...tc.childNodes].filter(n => n.nodeName === "w:p").map(p => parseDocxParagraphHtml(p).html).join("");
            html += `<td${bg}>${cellParas || "&nbsp;"}</td>`;
        });
        html += "</tr>";
    });
    return html + `</tbody></table>`;
}

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
                    if (i + 1 < wordPages.length) wordPages[i + 1] = movedNodes.join("") + wordPages[i + 1];
                    else wordPages.push(movedNodes.join(""));
                    didSplit = true;
                    break;
                }
            }
        }
        if (!didSplit) break;
        renderWordPages();
    }
    applyPageNumbersToSheets();
    updatePageCounter();
    updateOfficeLiveStats();
    saveCurrentOfficeDoc();
}

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
            const safeTxt = (tNode.textContent || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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
        } else if (child.nodeName === "a:br") inner += "<br>";
    }
    return inner.trim() ? `<p style="margin:4px 0;${alignCss}">${inner}</p>` : "";
}

async function importPptxFile(file) {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const slidePaths = Object.keys(zip.files).filter(p => /^ppt\/slides\/slide\d+\.xml$/i.test(p)).sort((a, b) => parseInt(a.match(/\d+/)[0], 10) - parseInt(b.match(/\d+/)[0], 10));
    if (!slidePaths.length) return alert("PPTX faylida slaydlar topilmadi.");
    const parsedSlides = [];
    for (const sPath of slidePaths) {
        const doc = new DOMParser().parseFromString(await zip.file(sPath).async("string"), "application/xml");
        const relsPath = sPath.replace("ppt/slides/", "ppt/slides/_rels/") + ".rels";
        const relsMap = {};
        if (zip.file(relsPath)) {
            const relsDoc = new DOMParser().parseFromString(await zip.file(relsPath).async("string"), "application/xml");
            for (const rel of relsDoc.getElementsByTagName("Relationship")) relsMap[rel.getAttribute("Id")] = rel.getAttribute("Target") || "";
        }
        let bg = "#FFFFFF";
        const bgClr = doc.getElementsByTagName("p:bg")[0]?.getElementsByTagName("a:srgbClr")[0]?.getAttribute("val");
        if (bgClr && /^[0-9A-Fa-f]{6}$/.test(bgClr)) bg = "#" + bgClr;
        let titleHtml = "", bodyParts = [];
        for (const sp of doc.getElementsByTagName("p:sp")) {
            const phType = sp.getElementsByTagName("p:ph")[0]?.getAttribute("type") || "";
            const isTitle = phType === "title" || phType === "ctrTitle";
            const paras = [...sp.getElementsByTagName("a:p")].map(parsePptxParagraph).filter(Boolean).join("");
            if (!paras) continue;
            if (isTitle && !titleHtml) titleHtml = paras.replace(/^<p[^>]*>|<\/p>$/g, "");
            else bodyParts.push(paras);
        }
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
            bodyParts.push(tHtml + `</tbody></table>`);
        }
        for (const pic of doc.getElementsByTagName("p:pic")) {
            const rId = pic.getElementsByTagName("a:blip")[0]?.getAttribute("r:embed");
            if (rId && relsMap[rId]) {
                const target = relsMap[rId].replace(/^\.\.\//, "ppt/");
                const imgEntry = zip.file(target);
                if (imgEntry) {
                    const ext = target.split(".").pop().toLowerCase();
                    const mime = ext === "png" ? "image/png" : ext === "svg" ? "image/svg+xml" : ext === "gif" ? "image/gif" : "image/jpeg";
                    bodyParts.push(`<img src="data:${mime};base64,${await imgEntry.async("base64")}" alt="Slide image">`);
                }
            }
        }
        parsedSlides.push({ title: titleHtml || `Slayd ${parsedSlides.length + 1}`, body: bodyParts.join("") || "<p><br></p>", bg });
    }
    slidesData = parsedSlides; activeSlideIdx = 0;
    loadActiveSlideToCanvas(); renderSlidesSidebar(); saveCurrentOfficeDoc(); updateOfficeLiveStats();
}

let excelWorkbookSheets = [];
let activeExcelSheetIdx = 0;

async function parseXlsxStylesMap(zip) {
    const styleMap = {};
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
        return (fg && fg.length >= 6 && fg !== "00000000") ? `background-color:#${fg.slice(-6)}` : "";
    });
    [...(doc.getElementsByTagName("cellXfs")[0]?.getElementsByTagName("xf") || [])].forEach((xf, idx) => {
        const parts = [];
        const fId = parseInt(xf.getAttribute("fontId") || "-1", 10);
        const fillId = parseInt(xf.getAttribute("fillId") || "-1", 10);
        if (fonts[fId]) parts.push(...fonts[fId]);
        if (fills[fillId]) parts.push(fills[fillId]);
        const h = xf.getElementsByTagName("alignment")[0]?.getAttribute("horizontal");
        if (h === "center" || h === "right" || h === "left") parts.push(`text-align:${h}`);
        if (parts.length) styleMap[idx] = parts.join(";");
    });
    return styleMap;
}

async function importExcelFile(file) {
    const ab = await file.arrayBuffer();
    const wb = XLSX.read(ab, { type: "array", cellFormula: true, cellStyles: true });
    const ext = file.name.split(".").pop().toLowerCase();
    let zip = null, xfStyles = {};
    if (ext === "xlsx" && window.JSZip) {
        try { zip = await JSZip.loadAsync(ab); xfStyles = await parseXlsxStylesMap(zip); } catch (_) {}
    }
    excelWorkbookSheets = [];
    for (let sIdx = 0; sIdx < wb.SheetNames.length; sIdx++) {
        const sName = wb.SheetNames[sIdx], ws = wb.Sheets[sName];
        const ref = ws["!ref"] ? XLSX.utils.decode_range(ws["!ref"]) : { s: { r: 0, c: 0 }, e: { r: 19, c: 9 } };
        const rows = Math.max(20, ref.e.r + 5), cols = Math.min(26, Math.max(10, ref.e.c + 2));
        const cells = {}, styles = {}, colWidths = {};
        Object.keys(ws).forEach(addr => {
            if (addr.startsWith("!")) return;
            const cell = ws[addr];
            if (!cell) return;
            if (cell.f) cells[addr] = "=" + cell.f;
            else if (cell.w !== undefined) cells[addr] = String(cell.w);
            else if (cell.v !== undefined) cells[addr] = String(cell.v);
        });
        if (zip) {
            const sheetXmlFile = zip.file(`xl/worksheets/sheet${sIdx + 1}.xml`);
            if (sheetXmlFile) {
                const sDoc = new DOMParser().parseFromString(await sheetXmlFile.async("string"), "application/xml");
                for (const cNode of sDoc.getElementsByTagName("c")) {
                    const rAddr = cNode.getAttribute("r"), sId = cNode.getAttribute("s");
                    if (rAddr && sId && xfStyles[sId]) styles[rAddr] = xfStyles[sId];
                }
            }
        }
        if (ws["!cols"]) {
            ws["!cols"].forEach((colInfo, cIdx) => {
                if (colInfo && (colInfo.wpx || colInfo.wch)) colWidths[cIdx] = Math.max(55, Math.min(360, Math.round(colInfo.wpx || colInfo.wch * 8.5)));
            });
        }
        const merges = (ws["!merges"] || []).map(m => ({ s: { r: m.s.r + 1, c: m.s.c }, e: { r: m.e.r + 1, c: m.e.c } }));
        excelWorkbookSheets.push({ name: sName, rows, cols, cells, styles, merges, colWidths });
    }
    activeExcelSheetIdx = 0;
    loadActiveExcelSheet();
}

function loadActiveExcelSheet() {
    const sh = excelWorkbookSheets[activeExcelSheetIdx];
    if (!sh) return;
    tableData = { rows: sh.rows, cols: sh.cols, cells: sh.cells, styles: sh.styles || {}, merges: sh.merges || [], colWidths: sh.colWidths || {} };
    renderSpreadsheet();
    const wsBox = document.querySelector(".tables-workspace");
    if (wsBox) {
        let bar = document.getElementById("tablesSheetsBar");
        if (!bar) { bar = document.createElement("div"); bar.id = "tablesSheetsBar"; bar.className = "tables-sheets-bar"; wsBox.appendChild(bar); }
        bar.style.display = excelWorkbookSheets.length <= 1 ? "none" : "flex";
        bar.innerHTML = excelWorkbookSheets.map((s, i) => `<button type="button" class="sheet-tab-btn ${i === activeExcelSheetIdx ? "active" : ""}" onclick="switchExcelSheet(${i})">${s.name}</button>`).join("");
    }
    saveCurrentOfficeDoc(); updateOfficeLiveStats();
}
window.switchExcelSheet = (idx) => {
    if (excelWorkbookSheets[activeExcelSheetIdx]) excelWorkbookSheets[activeExcelSheetIdx] = { ...excelWorkbookSheets[activeExcelSheetIdx], ...tableData };
    activeExcelSheetIdx = idx;
    loadActiveExcelSheet();
};

window.handleOfficeFileOpen = async function(e) {
    const f = e.target.files[0]; if (!f) return;
    const ext = f.name.split(".").pop().toLowerCase();
    document.getElementById("officeDocTitle").value = f.name.replace(/\.[^.]+$/, "");

    if (officeMode === "slides" && (ext === "pptx" || ext === "ppt")) {
        if (ext === "pptx") await importPptxFile(f);
        else alert("Eski .ppt formati brauzerda töliq öqilmaydi. Iltimos, faylni .pptx formatida yuklang.");
        e.target.value = ""; return;
    }
    if (officeMode === "tables" && ["xlsx", "xls", "csv", "xml"].includes(ext) && window.XLSX) {
        await importExcelFile(f);
        e.target.value = ""; return;
    }
    if (officeMode === "word" && ext === "docx" && window.JSZip) {
        const zip = await JSZip.loadAsync(await f.arrayBuffer());
        const xmlStr = await zip.file("word/document.xml")?.async("string");
        if (xmlStr) {
            const doc = new DOMParser().parseFromString(xmlStr, "application/xml");
            const body = doc.getElementsByTagName("w:body")[0];
            const sectPr = body?.getElementsByTagName("w:sectPr")[0];
            if (sectPr) {
                const pgSz = sectPr.getElementsByTagName("w:pgSz")[0];
                const isLand = pgSz?.getAttribute("w:orient") === "landscape" || (parseInt(pgSz?.getAttribute("w:w") || "0", 10) > parseInt(pgSz?.getAttribute("w:h") || "0", 10));
                const pgMar = sectPr.getElementsByTagName("w:pgMar")[0];
                if (pgMar) {
                    const twipToMm = (attr, def) => { const v = parseInt(pgMar.getAttribute(attr) || "0", 10); return v > 0 ? Math.max(8, Math.min(70, Math.round(v / 56.7))) : def; };
                    rulerMarginTop = twipToMm("w:top", 20);
                    rulerMarginLeft = twipToMm("w:left", 20);
                    rulerMarginRight = twipToMm("w:right", 20);
                }
                pageOrientations = [isLand ? "landscape" : "portrait"];
                rebuildRulersForOrientation(isLand);
            }
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

// === 12. ГЛОБАЛЬНЫЙ CTRL+A, НАДЁЖНЫЙ CTRL+Z / CTRL+Y, СИНХРОНИЗАЦИЯ ЛЕНТЫ И РЕГИСТР (Aa) ===
(function initGlobalWordSelectAll() {
    let isAllWordSelected = false;
    function clearAllWordSelectionFlag() {
        if (!isAllWordSelected) return;
        isAllWordSelected = false;
        document.querySelectorAll(".a4-sheet.all-doc-selected").forEach(p => p.classList.remove("all-doc-selected"));
    }
    document.addEventListener("keydown", (e) => {
        if (officeMode !== "word" || e.target.closest("input, textarea, #officeOshaChat")) return;
        if ((e.ctrlKey || e.metaKey) && e.code === "KeyA") {
            e.preventDefault(); e.stopPropagation();
            const container = document.getElementById("wordPagesContainer");
            if (!container) return;
            if (document.activeElement?.classList.contains("a4-sheet")) document.activeElement.blur();
            const range = document.createRange();
            range.selectNodeContents(container);
            const sel = window.getSelection();
            sel.removeAllRanges(); sel.addRange(range);
            isAllWordSelected = true;
            document.querySelectorAll(".a4-sheet").forEach(p => p.classList.add("all-doc-selected"));
            return;
        }
        if (!isAllWordSelected) return;
        if (e.key === "Backspace" || e.key === "Delete") {
            e.preventDefault();
            wordPages = ["<p><br></p>"]; clearAllWordSelectionFlag(); renderWordPages(); saveCurrentOfficeDoc(); updateOfficeLiveStats();
            document.querySelector(".a4-sheet")?.focus();
        } else if ((e.ctrlKey || e.metaKey) && e.code === "KeyX") {
            e.preventDefault();
            const allText = [...document.querySelectorAll(".a4-sheet")].map(p => p.innerText).join("\n\n");
            navigator.clipboard?.writeText(allText).catch(() => {});
            wordPages = ["<p><br></p>"]; clearAllWordSelectionFlag(); renderWordPages(); saveCurrentOfficeDoc(); updateOfficeLiveStats();
            document.querySelector(".a4-sheet")?.focus();
        } else if (e.key === "Escape" || e.key.startsWith("Arrow")) {
            clearAllWordSelectionFlag();
        }
    }, true);
    document.addEventListener("mousedown", (e) => { if (!e.target.closest(".office-topbar, .office-pill-ctx")) clearAllWordSelectionFlag(); });

    const _origFont = window.applyOfficeFont;
    window.applyOfficeFont = (f) => {
        if (isAllWordSelected && officeMode === "word") {
            document.querySelectorAll(".a4-sheet").forEach(p => { p.style.fontFamily = `'${f}', sans-serif`; p.querySelectorAll("*").forEach(el => { if (el.style.fontFamily) el.style.fontFamily = `'${f}', sans-serif`; }); });
            syncWordPagesFromDom(); saveCurrentOfficeDoc(); return;
        }
        _origFont(f);
    };
    const _origSize = window.applyOfficeFontSize;
    window.applyOfficeFontSize = (px) => {
        if (isAllWordSelected && officeMode === "word") {
            document.querySelectorAll(".a4-sheet").forEach(p => { p.style.fontSize = px + "px"; p.querySelectorAll("*").forEach(el => { if (el.style.fontSize) el.style.fontSize = px + "px"; }); });
            syncWordPagesFromDom(); saveCurrentOfficeDoc(); return;
        }
        _origSize(px);
    };
})();

(function initReliableOfficeUndoRedo() {
    const MAX_STACK = 60, undoStack = [], redoStack = [];
    let isRestoring = false, inputTimer = null;
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
            if (parsed.mode === "word") { wordPages = parsed.data; renderWordPages(); }
            else if (parsed.mode === "slides") { slidesData = parsed.data; activeSlideIdx = Math.min(parsed.idx || 0, slidesData.length - 1); loadActiveSlideToCanvas(); renderSlidesSidebar(); }
            else { tableData = parsed.data; renderSpreadsheet(); }
            _baseSaveOfficeDoc(); updateOfficeLiveStats();
        } finally { isRestoring = false; }
    }
    const _baseSaveOfficeDoc = window.saveCurrentOfficeDoc;
    window.saveCurrentOfficeDoc = function() {
        _baseSaveOfficeDoc();
        if (!isRestoring) { clearTimeout(inputTimer); inputTimer = setTimeout(pushUndoSnapshot, 220); }
    };
    window.performOfficeUndo = function() {
        clearTimeout(inputTimer); pushUndoSnapshot();
        if (undoStack.length <= 1) return;
        redoStack.push(undoStack.pop());
        applySnapshot(undoStack[undoStack.length - 1]);
    };
    window.performOfficeRedo = function() {
        if (!redoStack.length) return;
        const next = redoStack.pop(); undoStack.push(next); applySnapshot(next);
    };
    document.addEventListener("keydown", (e) => {
        if (e.target.closest("input, textarea, #officeOshaChat") || !(e.ctrlKey || e.metaKey)) return;
        if (e.code === "KeyZ" && !e.shiftKey) { e.preventDefault(); e.stopPropagation(); window.performOfficeUndo(); }
        else if (e.code === "KeyY" || (e.code === "KeyZ" && e.shiftKey)) { e.preventDefault(); e.stopPropagation(); window.performOfficeRedo(); }
    }, true);
    document.addEventListener("DOMContentLoaded", () => setTimeout(pushUndoSnapshot, 300));
})();

(function initRibbonStyleSync() {
    let syncRaf = null;
    function getSelectionElement() {
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount) return null;
        let node = sel.focusNode || sel.anchorNode;
        if (!node) return null;
        if (node.nodeType === 3) node = node.parentElement;
        return node?.closest?.(".a4-sheet, #slideCanvas") ? node : null;
    }
    function setBtnActiveByOnclick(pattern, isActive) {
        document.querySelectorAll(`.office-topbar button[onclick*="${pattern}"]`).forEach(btn => btn.classList.toggle("rb-active", !!isActive));
    }
    function syncRibbonWithSelection() {
        const el = getSelectionElement();
        if (!el) return;
        const cs = window.getComputedStyle(el);

        const primaryFont = (cs.fontFamily || "").split(",")[0].replace(/['"]/g, "").trim();
        const fontCtrl = document.getElementById("officeFontFamily");
        if (fontCtrl && primaryFont) {
            const match = [...fontCtrl.options].find(o => o.value.toLowerCase() === primaryFont.toLowerCase());
            if (match) fontCtrl.value = match.value;
        }
        const pxSize = Math.round(parseFloat(cs.fontSize) || 14);
        const sizeCtrl = document.getElementById("officeFontSize");
        if (sizeCtrl && document.activeElement !== sizeCtrl) {
            const matchSz = [...sizeCtrl.options].find(o => o.value === String(pxSize));
            if (matchSz) sizeCtrl.value = matchSz.value;
        }

        const deco = cs.textDecorationLine || cs.textDecoration || "";
        setBtnActiveByOnclick("'bold'", document.queryCommandState("bold") || parseInt(cs.fontWeight, 10) >= 600);
        setBtnActiveByOnclick("'italic'", document.queryCommandState("italic") || cs.fontStyle === "italic");
        setBtnActiveByOnclick("'underline'", document.queryCommandState("underline") || deco.includes("underline"));
        setBtnActiveByOnclick("'strikeThrough'", document.queryCommandState("strikeThrough") || deco.includes("line-through"));
        setBtnActiveByOnclick("'subscript'", document.queryCommandState("subscript") || !!el.closest("sub"));
        setBtnActiveByOnclick("'superscript'", document.queryCommandState("superscript") || !!el.closest("sup"));

        const blockEl = el.closest("p, div, h1, h2, h3, h4, li, td, th") || el;
        const align = window.getComputedStyle(blockEl).textAlign || "left";
        const isCenter = align === "center", isRight = align === "right" || align === "end", isJustify = align === "justify";
        setBtnActiveByOnclick("'justifyLeft'", !isCenter && !isRight && !isJustify);
        setBtnActiveByOnclick("'justifyCenter'", isCenter);
        setBtnActiveByOnclick("'justifyRight'", isRight);
        setBtnActiveByOnclick("'justifyFull'", isJustify);

        const ulEl = el.closest("ul"), olEl = el.closest("ol");
        document.querySelectorAll('#bulletMenuWrap > button').forEach(btn => btn.classList.toggle("rb-active", !!ulEl));
        setBtnActiveByOnclick("'insertOrderedList'", !!olEl);
        document.querySelectorAll('#bulletMenuWrap .office-dropdown-menu button').forEach(btn => btn.classList.remove("rb-active"));
        if (ulEl) {
            const listType = ulEl.dataset.bulletType || window.getComputedStyle(ulEl).listStyleType || "disc";
            document.querySelectorAll(`#bulletMenuWrap .office-dropdown-menu button[onclick*="'${listType}'"]`).forEach(btn => btn.classList.add("rb-active"));
        }

        const isHeading = !!el.closest("h1, h2, h3");
        setBtnActiveByOnclick("'H1'", isHeading);
        setBtnActiveByOnclick("'P'", !isHeading);
    }
    const scheduleSync = () => { cancelAnimationFrame(syncRaf); syncRaf = requestAnimationFrame(syncRibbonWithSelection); };
    document.addEventListener("selectionchange", scheduleSync);
    document.addEventListener("mouseup", scheduleSync);
    document.addEventListener("keyup", scheduleSync);
    document.addEventListener("click", (e) => { if (e.target.closest?.(".office-topbar")) setTimeout(scheduleSync, 30); });
})();

window.applyTextCase = function(mode) {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || sel.isCollapsed) {
        document.getElementById("textCaseWrap")?.classList.remove("open");
        return;
    }
    const range = sel.getRangeAt(0);
    const transformString = (str, type) => {
        if (type === "lower") return str.toLocaleLowerCase();
        if (type === "upper") return str.toLocaleUpperCase();
        if (type === "title") return str.toLocaleLowerCase().replace(/(^|[\s(\["«'—-])([\p{L}])/gu, (_, sep, ch) => sep + ch.toLocaleUpperCase());
        if (type === "toggle") return [...str].map(ch => ch === ch.toLocaleUpperCase() ? ch.toLocaleLowerCase() : ch.toLocaleUpperCase()).join("");
        if (type === "sentence") return str.toLocaleLowerCase().replace(/(^|[.!?…]\s+)([\p{L}])/gu, (_, sep, ch) => sep + ch.toLocaleUpperCase());
        return str;
    };
    const root = range.commonAncestorContainer, textNodes = [];
    if (root.nodeType === 3) textNodes.push(root);
    else {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
        let n; while ((n = walker.nextNode())) { if (range.intersectsNode(n)) textNodes.push(n); }
    }
    textNodes.forEach(node => {
        const start = (node === range.startContainer) ? range.startOffset : 0;
        const end = (node === range.endContainer) ? range.endOffset : node.nodeValue.length;
        if (start >= end) return;
        node.nodeValue = node.nodeValue.slice(0, start) + transformString(node.nodeValue.slice(start, end), mode) + node.nodeValue.slice(end);
    });
    document.getElementById("textCaseWrap")?.classList.remove("open");
    if (officeMode === "word") syncWordPagesFromDom();
    saveCurrentOfficeDoc();
};

// ==========================================
// === ПОИСК В РЕАЛЬНОМ ВРЕМЕНИ И ЗАМЕНА СЛОВ ===
// ==========================================
(function initFindAndReplace() {
    let findMatches = [];
    let currentMatchIdx = -1;

    function escapeRegExp(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    function getSearchRoots() {
        if (officeMode === "word") return [...document.querySelectorAll(".a4-sheet")];
        if (officeMode === "slides") return [document.getElementById("slideTitleBox"), document.getElementById("slideBodyBox")].filter(Boolean);
        return [...document.querySelectorAll("#ulhSpreadsheet td")];
    }

    // Убираем временные теги <mark>, чтобы они не сохранялись в документ
    function clearFindHighlights() {
        document.querySelectorAll("mark.ulh-find-hl").forEach(mark => {
            const parent = mark.parentNode;
            if (!parent) return;
            parent.replaceChild(document.createTextNode(mark.textContent), mark);
            parent.normalize();
        });
        findMatches = [];
        currentMatchIdx = -1;
    }

    function updateCounterLabel() {
        const el = document.getElementById("frMatchCounter");
        if (!el) return;
        if (!findMatches.length) {
            el.textContent = "Topildi: 0";
        } else {
            el.textContent = `Topildi: ${findMatches.length} (${currentMatchIdx + 1}/${findMatches.length})`;
        }
    }

    function focusMatch(idx) {
        if (!findMatches.length) return;
        findMatches.forEach(m => m.classList.remove("active-match"));
        currentMatchIdx = (idx + findMatches.length) % findMatches.length;
        const active = findMatches[currentMatchIdx];
        active.classList.add("active-match");
        active.scrollIntoView({ behavior: "smooth", block: "center" });
        updateCounterLabel();
    }

    window.toggleFindReplaceMenu = function(e) {
        if (e) e.stopPropagation();
        const wrap = document.getElementById("findReplaceWrap");
        if (!wrap) return;
        const willOpen = !wrap.classList.contains("open");
        if (typeof closeAllOfficeMenus === "function") closeAllOfficeMenus("findReplaceWrap");
        wrap.classList.toggle("open", willOpen);

        if (willOpen) {
            const status = document.getElementById("frReplaceStatus");
            if (status) status.textContent = "";
            const inp = document.getElementById("frSearchInput");
            if (inp) {
                inp.focus();
                inp.select();
                if (inp.value.trim()) window.runOfficeLiveSearch();
            }
        } else {
            clearFindHighlights();
        }
    };

    window.runOfficeLiveSearch = function() {
        clearFindHighlights();
        const query = (document.getElementById("frSearchInput")?.value || "").trim();
        const srcInp = document.getElementById("frSourceInput");
        if (srcInp && document.activeElement === document.getElementById("frSearchInput")) {
            srcInp.value = query;
        }

        if (!query) {
            updateCounterLabel();
            return;
        }

        const rx = new RegExp(escapeRegExp(query), "gi");
        const roots = getSearchRoots();

        roots.forEach(root => {
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
            const nodes = [];
            let n;
            while ((n = walker.nextNode())) {
                if (n.parentElement?.closest(".a4-page-num")) continue;
                if (n.nodeValue && rx.test(n.nodeValue)) {
                    rx.lastIndex = 0;
                    nodes.push(n);
                }
            }

            nodes.forEach(textNode => {
                const text = textNode.nodeValue;
                const frag = document.createDocumentFragment();
                let lastIdx = 0;
                let m;
                rx.lastIndex = 0;
                while ((m = rx.exec(text)) !== null) {
                    if (m.index > lastIdx) {
                        frag.appendChild(document.createTextNode(text.slice(lastIdx, m.index)));
                    }
                    const mark = document.createElement("mark");
                    mark.className = "ulh-find-hl";
                    mark.textContent = m[0];
                    frag.appendChild(mark);
                    findMatches.push(mark);
                    lastIdx = m.index + m[0].length;
                }
                if (lastIdx < text.length) {
                    frag.appendChild(document.createTextNode(text.slice(lastIdx)));
                }
                textNode.parentNode.replaceChild(frag, textNode);
            });
        });

        if (findMatches.length) focusMatch(0);
        else updateCounterLabel();
    };

    window.navFindMatch = function(dir) {
        if (!findMatches.length) return;
        focusMatch(currentMatchIdx + dir);
    };

    window.clearOfficeSearch = function() {
        const inp = document.getElementById("frSearchInput");
        if (inp) inp.value = "";
        const status = document.getElementById("frReplaceStatus");
        if (status) status.textContent = "";
        clearFindHighlights();
        updateCounterLabel();
    };

    window.executeOfficeReplace = function() {
        clearFindHighlights();
        const src = (document.getElementById("frSourceInput")?.value || "").trim();
        const dst = document.getElementById("frTargetInput")?.value ?? "";
        const status = document.getElementById("frReplaceStatus");
        if (!src) {
            if (status) status.textContent = "Asl sözni kiriting";
            return;
        }

        const rx = new RegExp(escapeRegExp(src), "gi");
        let replacedCount = 0;

        if (officeMode === "tables") {
            Object.keys(tableData.cells || {}).forEach(k => {
                const val = String(tableData.cells[k] || "");
                if (!val.startsWith("=") && rx.test(val)) {
                    rx.lastIndex = 0;
                    tableData.cells[k] = val.replace(rx, () => { replacedCount++; return dst; });
                }
            });
            renderSpreadsheet();
        } else {
            const roots = getSearchRoots();
            roots.forEach(root => {
                const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
                let n;
                while ((n = walker.nextNode())) {
                    if (n.parentElement?.closest(".a4-page-num")) continue;
                    if (n.nodeValue && rx.test(n.nodeValue)) {
                        rx.lastIndex = 0;
                        n.nodeValue = n.nodeValue.replace(rx, () => { replacedCount++; return dst; });
                    }
                }
            });
            if (officeMode === "word") syncWordPagesFromDom();
            else if (officeMode === "slides") {
                slidesData[activeSlideIdx].title = document.getElementById("slideTitleBox").innerHTML;
                slidesData[activeSlideIdx].body = document.getElementById("slideBodyBox").innerHTML;
                renderSlidesSidebar();
            }
        }

        saveCurrentOfficeDoc();
        if (typeof updateOfficeLiveStats === "function") updateOfficeLiveStats();
        if (status) status.textContent = replacedCount ? `Almaştirildi: ${replacedCount}` : "Topilmadi";

        // Перезапускаем подсветку, если поле поиска заполнено
        if ((document.getElementById("frSearchInput")?.value || "").trim()) {
            window.runOfficeLiveSearch();
        }
    };

    // Закрытие при клике вне меню + снятие подсветки
    document.addEventListener("click", (e) => {
        const wrap = document.getElementById("findReplaceWrap");
        if (wrap && wrap.classList.contains("open") && !e.target.closest("#findReplaceWrap")) {
            wrap.classList.remove("open");
            clearFindHighlights();
        }
    });

    // Горячая клавиша Ctrl + F (работает на любой раскладке)
    document.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.code === "KeyF") {
            e.preventDefault();
            const wrap = document.getElementById("findReplaceWrap");
            if (wrap && !wrap.classList.contains("open")) {
                window.toggleFindReplaceMenu();
            } else {
                document.getElementById("frSearchInput")?.focus();
                document.getElementById("frSearchInput")?.select();
            }
        } else if (e.key === "Escape") {
            const wrap = document.getElementById("findReplaceWrap");
            if (wrap?.classList.contains("open")) {
                wrap.classList.remove("open");
                clearFindHighlights();
            }
        }
    });
})();


// === ОТЗЫВЧИВОСТЬ МЕЖСТРОЧНОГО ИНТЕРВАЛА В ПАНЕЛИ ===
(function initLineHeightRibbonSync() {
    const PRESETS = [
        { val: "1", num: 1.0 },
        { val: "1.25", num: 1.25 },
        { val: "1.5", num: 1.5 },
        { val: "1.75", num: 1.75 },
        { val: "2", num: 2.0 }
    ];

    function syncLineHeightMenu() {
        const wrap = document.getElementById("lineHeightWrap");
        if (!wrap) return;

        const sel = window.getSelection();
        let node = sel?.focusNode || sel?.anchorNode;
        if (node && node.nodeType === 3) node = node.parentElement;
        if (!node || !node.closest?.(".a4-sheet, #slideCanvas")) return;

        const blockEl = node.closest("p, div, h1, h2, h3, h4, li, td, th") || node;
        const sheetEl = node.closest(".a4-sheet, #slideCanvas");

        // Берём явно заданный интервал абзаца/листа или вычисляем реальный из стилей
        let ratio = parseFloat(blockEl.style.lineHeight) || parseFloat(sheetEl?.style.lineHeight);
        if (!ratio || isNaN(ratio)) {
            const cs = window.getComputedStyle(blockEl);
            const lhPx = parseFloat(cs.lineHeight);
            const fsPx = parseFloat(cs.fontSize) || 14;
            if (!isNaN(lhPx) && fsPx > 0) ratio = lhPx / fsPx;
        }

        wrap.querySelectorAll(".office-dropdown-menu button").forEach(b => b.classList.remove("rb-active"));

        if (ratio && !isNaN(ratio)) {
            let best = PRESETS[0];
            let minDiff = Math.abs(ratio - best.num);
            for (const p of PRESETS) {
                const diff = Math.abs(ratio - p.num);
                if (diff < minDiff) {
                    minDiff = diff;
                    best = p;
                }
            }
            const targetBtn = wrap.querySelector(`.office-dropdown-menu button[onclick*="'${best.val}'"]`);
            if (targetBtn) targetBtn.classList.add("rb-active");
        }
    }

    document.addEventListener("selectionchange", syncLineHeightMenu);
    document.addEventListener("mouseup", syncLineHeightMenu);
    document.addEventListener("keyup", syncLineHeightMenu);
    document.addEventListener("click", (e) => {
        if (e.target.closest?.("#lineHeightWrap")) {
            setTimeout(syncLineHeightMenu, 20);
        }
    });
})();

// ==========================================
// === ГРАФИЧЕСКИЕ ЭЛЕМЕНТЫ (ФИГУРЫ, ЛИНИИ, СТРЕЛКИ, НАДПИСЬ) ===
// ==========================================
(function initOfficeShapesEngine() {
    let selectedShape = null;

    function getShapeHost() {
        if (officeMode === "slides") return document.getElementById("slideCanvas");
        return document.querySelector(`.a4-sheet[data-page-index="${activeWordPageIdx}"]`) || document.querySelector(".a4-sheet");
    }

    function getDashArray(style, w) {
        const sw = Math.max(1, parseInt(w, 10) || 2);
        if (style === "dashed") return `${sw * 4} ${sw * 2.5}`;
        if (style === "dotted") return `${sw} ${sw * 2}`;
        return "none";
    }

    function buildSvgMarkup(type, fill, stroke, sw, style) {
        const dash = getDashArray(style, sw);
        const uid = "arr_" + Math.random().toString(36).slice(2, 8);
        const markerEnd = `<marker id="${uid}_e" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1 L 10 5 L 0 9 z" fill="${stroke}" class="sh-arrow-head"/></marker>`;
        const markerStart = `<marker id="${uid}_s" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 10 1 L 0 5 L 10 9 z" fill="${stroke}" class="sh-arrow-head"/></marker>`;

        if (type === "line") {
            return `<svg class="ulh-shape-svg" viewBox="0 0 100 100" preserveAspectRatio="none"><line class="sh-geom" x1="4" y1="96" x2="96" y2="4" stroke="${stroke}" stroke-width="${sw}" stroke-dasharray="${dash}" vector-effect="non-scaling-stroke"/></svg>`;
        }
        if (type === "hline") {
            return `<svg class="ulh-shape-svg" viewBox="0 0 100 20" preserveAspectRatio="none"><line class="sh-geom" x1="2" y1="10" x2="98" y2="10" stroke="${stroke}" stroke-width="${sw}" stroke-dasharray="${dash}" vector-effect="non-scaling-stroke"/></svg>`;
        }
        if (type === "arrow") {
            return `<svg class="ulh-shape-svg" viewBox="0 0 100 100" preserveAspectRatio="none"><defs>${markerEnd}</defs><line class="sh-geom" x1="6" y1="94" x2="94" y2="6" stroke="${stroke}" stroke-width="${sw}" stroke-dasharray="${dash}" marker-end="url(#${uid}_e)" vector-effect="non-scaling-stroke"/></svg>`;
        }
        if (type === "double-arrow") {
            return `<svg class="ulh-shape-svg" viewBox="0 0 100 100" preserveAspectRatio="none"><defs>${markerStart}${markerEnd}</defs><line class="sh-geom" x1="8" y1="92" x2="92" y2="8" stroke="${stroke}" stroke-width="${sw}" stroke-dasharray="${dash}" marker-start="url(#${uid}_s)" marker-end="url(#${uid}_e)" vector-effect="non-scaling-stroke"/></svg>`;
        }
        if (type === "harrow") {
            return `<svg class="ulh-shape-svg" viewBox="0 0 100 24" preserveAspectRatio="none"><defs>${markerEnd}</defs><line class="sh-geom" x1="2" y1="12" x2="95" y2="12" stroke="${stroke}" stroke-width="${sw}" stroke-dasharray="${dash}" marker-end="url(#${uid}_e)" vector-effect="non-scaling-stroke"/></svg>`;
        }
        if (type === "triangle") {
            return `<svg class="ulh-shape-svg" viewBox="0 0 100 100" preserveAspectRatio="none"><polygon class="sh-geom" points="50,5 95,95 5,95" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-dasharray="${dash}" vector-effect="non-scaling-stroke"/></svg>`;
        }
        if (type === "diamond") {
            return `<svg class="ulh-shape-svg" viewBox="0 0 100 100" preserveAspectRatio="none"><polygon class="sh-geom" points="50,4 96,50 50,96 4,50" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-dasharray="${dash}" vector-effect="non-scaling-stroke"/></svg>`;
        }
        if (type === "star") {
            return `<svg class="ulh-shape-svg" viewBox="0 0 100 100" preserveAspectRatio="none"><polygon class="sh-geom" points="50,5 63,36 96,39 71,61 79,94 50,76 21,94 29,61 4,39 37,36" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-dasharray="${dash}" vector-effect="non-scaling-stroke"/></svg>`;
        }
        if (type === "block-arrow-right") {
            return `<svg class="ulh-shape-svg" viewBox="0 0 120 60" preserveAspectRatio="none"><polygon class="sh-geom" points="4,18 76,18 76,4 116,30 76,56 76,42 4,42" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-dasharray="${dash}" vector-effect="non-scaling-stroke"/></svg>`;
        }
        if (type === "block-arrow-down") {
            return `<svg class="ulh-shape-svg" viewBox="0 0 60 120" preserveAspectRatio="none"><polygon class="sh-geom" points="18,4 42,4 42,76 56,76 30,116 4,76 18,76" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-dasharray="${dash}" vector-effect="non-scaling-stroke"/></svg>`;
        }
        return "";
    }

    function positionFormatBar(shape) {
        const bar = document.getElementById("shapeFormatBar");
        if (!bar || !shape) return;
        const r = shape.getBoundingClientRect();
        bar.style.left = Math.max(12, Math.min(r.left, window.innerWidth - 360)) + "px";
        bar.style.top = Math.max(12, r.top - 48) + "px";
        bar.classList.add("active");

        const fill = shape.dataset.fill || "#E0F2FE";
        const stroke = shape.dataset.stroke || "#0284C7";
        const sw = shape.dataset.sw || "2";
        const st = shape.dataset.sstyle || "solid";

        if (fill !== "transparent") document.getElementById("sfFillColor").value = fill;
        document.getElementById("sfStrokeColor").value = stroke;
        document.getElementById("sfStrokeWidth").value = sw;
        document.getElementById("sfStrokeStyle").value = st;
    }

    function selectShape(shape) {
        document.querySelectorAll(".ulh-shape.selected").forEach(s => s.classList.remove("selected"));
        selectedShape = shape || null;
        const bar = document.getElementById("shapeFormatBar");
        if (selectedShape) {
            selectedShape.classList.add("selected");
            positionFormatBar(selectedShape);
        } else {
            bar?.classList.remove("active");
        }
    }

    window.insertOfficeShape = function(type) {
        document.getElementById("shapesMenuWrap")?.classList.remove("open");
        const host = getShapeHost();
        if (!host) return;
        if (getComputedStyle(host).position === "static") host.style.position = "relative";

        const el = document.createElement("div");
        el.className = "ulh-shape";
        el.contentEditable = "false";
        el.dataset.shape = type;

        const isLine = ["line", "hline", "arrow", "double-arrow", "harrow"].includes(type);
        const isBox = ["textbox", "rect", "round-rect", "oval"].includes(type);
        const defFill = type === "textbox" ? "#FFFFFF" : (isLine ? "transparent" : "#E0F2FE");
        const defStroke = "#0284C7";
        const defSw = "2";
        const defStyle = "solid";

        el.dataset.fill = defFill;
        el.dataset.stroke = defStroke;
        el.dataset.sw = defSw;
        el.dataset.sstyle = defStyle;

        el.style.left = "80px";
        el.style.top = "90px";

        if (type === "textbox") {
            el.style.backgroundColor = defFill;
            el.style.border = `${defSw}px ${defStyle} ${defStroke}`;
            el.innerHTML = `<div class="ulh-shape-text" contenteditable="true">Matn kiriting...</div><div class="ulh-shape-resize"></div>`;
        } else if (isBox) {
            el.style.width = "160px";
            el.style.height = "90px";
            el.style.backgroundColor = defFill;
            el.style.border = `${defSw}px ${defStyle} ${defStroke}`;
            el.innerHTML = `<div class="ulh-shape-text" contenteditable="true"></div><div class="ulh-shape-resize"></div>`;
        } else {
            el.style.width = (type === "hline" || type === "harrow" || type === "block-arrow-right") ? "180px" : (type === "block-arrow-down" ? "64px" : "120px");
            el.style.height = (type === "hline" || type === "harrow") ? "24px" : (type === "block-arrow-right" ? "64px" : (type === "block-arrow-down" ? "140px" : "110px"));
            el.innerHTML = buildSvgMarkup(type, defFill, defStroke, defSw, defStyle) + `<div class="ulh-shape-resize"></div>`;
        }

        host.appendChild(el);
        selectShape(el);

        if (type === "textbox") {
            const txt = el.querySelector(".ulh-shape-text");
            if (txt) {
                txt.focus();
                document.execCommand("selectAll", false, null);
            }
        }

        if (officeMode === "word") syncWordPagesFromDom();
        saveCurrentOfficeDoc();
    };

    window.updateSelectedShapeStyle = function(prop, val) {
        if (!selectedShape) return;
        if (prop === "fill") selectedShape.dataset.fill = val;
        if (prop === "stroke") selectedShape.dataset.stroke = val;
        if (prop === "width") selectedShape.dataset.sw = val;
        if (prop === "style") selectedShape.dataset.sstyle = val;

        const fill = selectedShape.dataset.fill || "transparent";
        const stroke = selectedShape.dataset.stroke || "#0284C7";
        const sw = selectedShape.dataset.sw || "2";
        const st = selectedShape.dataset.sstyle || "solid";
        const type = selectedShape.dataset.shape;

        if (["textbox", "rect", "round-rect", "oval"].includes(type)) {
            selectedShape.style.backgroundColor = fill;
            selectedShape.style.border = sw === "0" ? "none" : `${sw}px ${st} ${stroke}`;
        } else {
            const geom = selectedShape.querySelector(".sh-geom");
            if (geom) {
                if (geom.tagName.toLowerCase() !== "line") geom.setAttribute("fill", fill);
                geom.setAttribute("stroke", sw === "0" ? "none" : stroke);
                geom.setAttribute("stroke-width", sw);
                geom.setAttribute("stroke-dasharray", getDashArray(st, sw));
            }
            selectedShape.querySelectorAll(".sh-arrow-head").forEach(h => h.setAttribute("fill", stroke));
        }

        if (officeMode === "word") syncWordPagesFromDom();
        saveCurrentOfficeDoc();
    };

    window.deleteSelectedShape = function() {
        if (!selectedShape) return;
        selectedShape.remove();
        selectShape(null);
        if (officeMode === "word") syncWordPagesFromDom();
        saveCurrentOfficeDoc();
    };

    // Выбор, перетаскивание и изменение размера фигур
    let dragMode = null, startX = 0, startY = 0, origL = 0, origT = 0, origW = 0, origH = 0;

    document.addEventListener("mousedown", (e) => {
        if (e.target.closest("#shapeFormatBar")) return;

        const resizeHandle = e.target.closest(".ulh-shape-resize");
        if (resizeHandle) {
            const sh = resizeHandle.closest(".ulh-shape");
            if (!sh) return;
            e.preventDefault(); e.stopPropagation();
            selectShape(sh);
            dragMode = "resize";
            startX = e.clientX; startY = e.clientY;
            origW = sh.offsetWidth; origH = sh.offsetHeight;
            return;
        }

        const shape = e.target.closest(".ulh-shape");
        if (shape) {
            selectShape(shape);
            // Если кликнули по тексту внутри Надписи — даём спокойно печатать, не перетаскиваем
            if (e.target.closest(".ulh-shape-text") && shape.dataset.shape === "textbox") return;
            e.preventDefault();
            dragMode = "move";
            startX = e.clientX; startY = e.clientY;
            origL = shape.offsetLeft; origT = shape.offsetTop;
            return;
        }

        selectShape(null);
    });

    document.addEventListener("mousemove", (e) => {
        if (!dragMode || !selectedShape) return;
        const z = (typeof officeZoom === "number" && officeZoom > 0) ? officeZoom : 1;
        const dx = (e.clientX - startX) / z;
        const dy = (e.clientY - startY) / z;

        if (dragMode === "move") {
            selectedShape.style.left = Math.max(0, Math.round(origL + dx)) + "px";
            selectedShape.style.top = Math.max(0, Math.round(origT + dy)) + "px";
        } else if (dragMode === "resize") {
            selectedShape.style.width = Math.max(30, Math.round(origW + dx)) + "px";
            if (selectedShape.dataset.shape !== "textbox") {
                selectedShape.style.height = Math.max(18, Math.round(origH + dy)) + "px";
            }
        }
        positionFormatBar(selectedShape);
    });

    document.addEventListener("mouseup", () => {
        if (!dragMode) return;
        dragMode = null;
        if (officeMode === "word") syncWordPagesFromDom();
        saveCurrentOfficeDoc();
    });

    // Авто-обновление позиции панели при вводе текста в Надпись и сохранение
    document.addEventListener("input", (e) => {
        const sh = e.target.closest?.(".ulh-shape");
        if (sh) {
            positionFormatBar(sh);
            if (officeMode === "word") syncWordPagesFromDom();
            saveCurrentOfficeDoc();
        }
    });

    // Удаление выбранной фигуры клавишей Delete (если курсор не в тексте)
    document.addEventListener("keydown", (e) => {
        if (!selectedShape) return;
        if (e.key === "Delete" && !e.target.closest(".ulh-shape-text")) {
            e.preventDefault();
            window.deleteSelectedShape();
        }
    });

    window.addEventListener("scroll", () => { if (selectedShape) positionFormatBar(selectedShape); }, true);
})();

// ==========================================
// === NUSXALAR TARIXI (ИСТОРИЯ КОПИРОВАНИЙ) ===
// ==========================================
(function initOfficeCopyHistory() {
    const STORAGE_KEY = "ulh_copy_history_v1";
    const MAX_ITEMS = 40;

    function loadCopyHistory() {
        // Если на главном сайте уже есть сохранённая история, подхватываем её
        const mainKey = ["copyHistory", "ulhCopyHistory", "ulh_copy_history"].find(k => localStorage.getItem(k));
        const key = localStorage.getItem(STORAGE_KEY) ? STORAGE_KEY : (mainKey || STORAGE_KEY);
        const arr = safeJsonParse(key, []);
        return Array.isArray(arr) ? arr : [];
    }

    function saveCopyHistory(arr) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
        } catch (_) {}
    }

    function addCopiedText(rawText) {
        const text = String(rawText || "").trim();
        if (!text) return;

        const now = new Date();
        const time = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");

        let list = loadCopyHistory().filter(item => (item.text || item) !== text);
        list.unshift({ text, time, chars: text.length });
        if (list.length > MAX_ITEMS) list = list.slice(0, MAX_ITEMS);
        saveCopyHistory(list);

        if (document.getElementById("officeCopyHistDrawer")?.classList.contains("open")) {
            renderOfficeCopyHistory();
        }
    }

    function renderOfficeCopyHistory() {
        const box = document.getElementById("officeCopyHistList");
        if (!box) return;
        const list = loadCopyHistory();

        if (!list.length) {
            box.innerHTML = `<div class="copy-hist-empty">Hali nusxalangan matnlar yöq</div>`;
            return;
        }

        const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        box.innerHTML = list.map((item, idx) => {
            const txt = typeof item === "string" ? item : (item.text || "");
            const chars = item.chars || txt.length;
            const time = item.time || "";
            return `
                <button type="button" class="copy-hist-card" onclick="insertFromCopyHistory(${idx})" title="Hujjatga joylaş">
                    <div class="copy-hist-text">${esc(txt)}</div>
                    <div class="copy-hist-meta">
                        <span>${chars} ta belgi</span>
                        <span>${esc(time)}</span>
                    </div>
                </button>
            `;
        }).join("");
    }

    window.toggleOfficeCopyHistory = function(forceState) {
        const drawer = document.getElementById("officeCopyHistDrawer");
        const backdrop = document.getElementById("officeCopyHistBackdrop");
        if (!drawer || !backdrop) return;

        const willOpen = typeof forceState === "boolean" ? forceState : !drawer.classList.contains("open");
        if (willOpen) renderOfficeCopyHistory();
        drawer.classList.toggle("open", willOpen);
        backdrop.classList.toggle("open", willOpen);
    };

    window.insertFromCopyHistory = function(idx) {
        const list = loadCopyHistory();
        const item = list[idx];
        const text = typeof item === "string" ? item : (item?.text || "");
        if (!text) return;

        navigator.clipboard?.writeText(text).catch(() => {});
        window.toggleOfficeCopyHistory(false);

        if (officeMode === "tables") {
            tableData.cells[activeCellKey] = text;
            renderSpreadsheet();
            saveCurrentOfficeDoc();
            updateOfficeLiveStats();
        } else {
            const safeHtml = text
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/\r?\n/g, "<br>");
            insertHtmlAtCursor(safeHtml);
        }
    };

    window.clearOfficeCopyHistory = function() {
        saveCopyHistory([]);
        renderOfficeCopyHistory();
    };

    // Автоматически перехватываем любое копирование и вырезание (Ctrl+C / Ctrl+X / меню)
    ["copy", "cut"].forEach(evt => {
        document.addEventListener(evt, () => {
            const selText = window.getSelection()?.toString() || "";
            if (selText.trim()) addCopiedText(selText);
        });
    });

    // Закрытие по Escape
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && document.getElementById("officeCopyHistDrawer")?.classList.contains("open")) {
            window.toggleOfficeCopyHistory(false);
        }
    });
})();

// === ЗЕРКАЛЬНОЕ ОТРАЖЕНИЕ И ПОВОРОТ ФИГУР ===
(function initShapeTransformTools() {
    function getActiveShape() {
        return document.querySelector(".ulh-shape.selected");
    }

    function syncTransformUI(shape) {
        if (!shape) return;
        const rot = parseFloat(shape.dataset.rot || "0") || 0;
        const flipX = shape.dataset.flipX === "-1";
        const flipY = shape.dataset.flipY === "-1";

        const rotInp = document.getElementById("sfRotateInput");
        if (rotInp && document.activeElement !== rotInp) rotInp.value = rot;
        document.getElementById("sfFlipHBtn")?.classList.toggle("active", flipX);
        document.getElementById("sfFlipVBtn")?.classList.toggle("active", flipY);

        // Чтобы расширенная панель не уходила за правый край экрана
        const bar = document.getElementById("shapeFormatBar");
        if (bar && bar.classList.contains("active")) {
            const maxLeft = Math.max(12, window.innerWidth - bar.offsetWidth - 16);
            if (parseFloat(bar.style.left) > maxLeft) {
                bar.style.left = maxLeft + "px";
            }
        }
    }

    function applyShapeTransform(shape) {
        if (!shape) return;
        const rot = parseFloat(shape.dataset.rot || "0") || 0;
        const fx = shape.dataset.flipX === "-1" ? -1 : 1;
        const fy = shape.dataset.flipY === "-1" ? -1 : 1;

        shape.style.transformOrigin = "center center";
        shape.style.transform = `rotate(${rot}deg) scale(${fx}, ${fy})`;
        syncTransformUI(shape);

        if (officeMode === "word" && typeof syncWordPagesFromDom === "function") syncWordPagesFromDom();
        if (typeof saveCurrentOfficeDoc === "function") saveCurrentOfficeDoc();
    }

    window.toggleSelectedShapeFlip = function(axis) {
        const sh = getActiveShape();
        if (!sh) return;
        if (axis === "h") {
            sh.dataset.flipX = sh.dataset.flipX === "-1" ? "1" : "-1";
        } else {
            sh.dataset.flipY = sh.dataset.flipY === "-1" ? "1" : "-1";
        }
        applyShapeTransform(sh);
    };

    window.updateSelectedShapeRotation = function(deg) {
        const sh = getActiveShape();
        if (!sh) return;
        const num = parseFloat(deg);
        sh.dataset.rot = isNaN(num) ? "0" : String(num);
        applyShapeTransform(sh);
    };

    window.quickRotateSelectedShape = function(step = 90) {
        const sh = getActiveShape();
        if (!sh) return;
        const cur = parseFloat(sh.dataset.rot || "0") || 0;
        const next = ((cur + step) % 360 + 360) % 360;
        sh.dataset.rot = String(next);
        const rotInp = document.getElementById("sfRotateInput");
        if (rotInp) rotInp.value = next;
        applyShapeTransform(sh);
    };

    // Синхронизируем значения в панели при выборе любой фигуры
    document.addEventListener("mousedown", (e) => {
        if (e.target.closest(".ulh-shape")) {
            setTimeout(() => syncTransformUI(getActiveShape()), 0);
        }
    });
})();


// ==========================================
// === ILMIY MANBALAR MENEJERI (VAK FORMATI) ===
// ==========================================
(function initOfficeVakManager() {
    const STORAGE_KEY = "ulh_vak_sources_v1";

    function loadSources() {
        // Подхватываем сохранённые источники с главного сайта, если они там уже есть
        const altKey = ["bibSources", "ulh_bib_sources", "vakSources", "scientificSources"].find(k => localStorage.getItem(k));
        const key = localStorage.getItem(STORAGE_KEY) ? STORAGE_KEY : (altKey || STORAGE_KEY);
        const arr = safeJsonParse(key, []);
        return Array.isArray(arr) ? arr : [];
    }

    function saveSources(arr) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
        } catch (_) {}
    }

    function formatTodayDate() {
        const d = new Date();
        return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
    }

    function formatVakCitation(item) {
        const lang = item.lang || "uz";
        const author = (item.author || "").trim();
        const title = (item.title || "").trim();
        const source = (item.source || "").trim();
        const year = (item.year || "").trim();
        const pages = (item.pages || "").trim();
        const accessDate = item.accessDate || formatTodayDate();

        const isUrl = /^https?:\/\//i.test(source);
        let res = "";

        if (author) res += author + " ";
        if (title) res += title;
        if (source) res += (res ? " // " : "") + source + (isUrl ? "." : ".");

        if (isUrl) {
            const accessLabel = lang === "ru" ? "дата обращения" : lang === "en" ? "accessed" : "murojaat sanasi";
            res += ` – (${accessLabel}: ${accessDate}).`;
        } else {
            if (year) res += ` – ${year}.`;
            if (pages) {
                const pPrefix = lang === "ru" ? "Стр." : lang === "en" ? "P." : "B.";
                res += ` – ${pPrefix} ${pages}.`;
            }
        }
        return res.trim();
    }

    function renderVakSources() {
        const list = loadSources();
        const countEl = document.getElementById("vakSavedCount");
        const box = document.getElementById("vakSourcesList");
        if (countEl) countEl.textContent = `Saqlangan manbalar (${list.length})`;
        if (!box) return;

        if (!list.length) {
            box.innerHTML = `<div class="vak-empty-state">Hali ilmiy manbalar qöşilmagan</div>`;
            return;
        }

        const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        box.innerHTML = list.map((item, idx) => {
            const citation = item.formatted || formatVakCitation(item);
            const note = (item.note || "").trim();
            return `
                <div class="vak-source-card">
                    <div class="vak-card-top">
                        <div class="vak-citation-text">${esc(citation)}</div>
                        <div class="vak-card-btns">
                            <button type="button" class="vak-mini-insert" onclick="insertSingleVakToDoc(${idx})" title="Hujjatga joylaş">+ Joylaş</button>
                            <button type="button" class="vak-del-btn" onclick="deleteOfficeVakSource(${idx})" title="Öçiriş">×</button>
                        </div>
                    </div>
                    ${note ? `<div class="vak-note-box">«${esc(note)}»</div>` : ""}
                </div>
            `;
        }).join("");
    }

    window.openOfficeVakModal = function() {
        renderVakSources();
        document.getElementById("officeVakModal")?.classList.add("open");
    };

    window.addOfficeVakSource = function() {
        const lang = document.getElementById("vakLang")?.value || "uz";
        const author = (document.getElementById("vakAuthor")?.value || "").trim();
        const title = (document.getElementById("vakTitle")?.value || "").trim();
        const source = (document.getElementById("vakSource")?.value || "").trim();
        const year = (document.getElementById("vakYear")?.value || "").trim();
        const pages = (document.getElementById("vakPages")?.value || "").trim();
        const note = (document.getElementById("vakNote")?.value || "").trim();

        if (!author && !title && !source) return;

        const item = { lang, author, title, source, year, pages, note, accessDate: formatTodayDate() };
        item.formatted = formatVakCitation(item);

        const list = loadSources();
        list.unshift(item);
        saveSources(list);

        ["vakAuthor", "vakTitle", "vakSource", "vakYear", "vakPages", "vakNote"].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = "";
        });
        renderVakSources();
    };

    window.deleteOfficeVakSource = function(idx) {
        const list = loadSources();
        list.splice(idx, 1);
        saveSources(list);
        renderVakSources();
    };

    window.copyAllVakSources = function() {
        const list = loadSources();
        if (!list.length) return;
        const text = list.map((it, i) => `${i + 1}. ${it.formatted || formatVakCitation(it)}`).join("\n");
        navigator.clipboard?.writeText(text).then(() => {
            const btn = document.getElementById("vakCopyAllBtn");
            if (btn) {
                const orig = btn.textContent;
                btn.textContent = "Nusxalandi ✓";
                setTimeout(() => { btn.textContent = orig; }, 1600);
            }
        }).catch(() => {});
    };

    window.insertSingleVakToDoc = function(idx) {
        const list = loadSources();
        const item = list[idx];
        if (!item) return;
        const citation = item.formatted || formatVakCitation(item);
        const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        document.getElementById("officeVakModal")?.classList.remove("open");
        if (officeMode === "tables") {
            tableData.cells[activeCellKey] = citation;
            renderSpreadsheet(); saveCurrentOfficeDoc(); updateOfficeLiveStats();
        } else {
            insertHtmlAtCursor(`<p>${esc(citation)}</p>`);
        }
    };

    window.insertAllVakToDoc = function() {
        const list = loadSources();
        if (!list.length) return;
        const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const html = `<ol>${list.map(it => `<li>${esc(it.formatted || formatVakCitation(it))}</li>`).join("")}</ol><p><br></p>`;
        document.getElementById("officeVakModal")?.classList.remove("open");
        if (officeMode === "tables") {
            list.forEach((it, i) => { tableData.cells[`A${i + 1}`] = it.formatted || formatVakCitation(it); });
            renderSpreadsheet(); saveCurrentOfficeDoc(); updateOfficeLiveStats();
        } else {
            insertHtmlAtCursor(html);
        }
    };
})();

// ==========================================
// === АУДИОПЛЕЕР (AMBIENT + YOUTUBE + PLAYLIST) ===
// ==========================================
(function initOfficeAudioPlayer() {
    const PL_KEY = "ulh_office_music_playlist_v1";
    const AMBIENT_META = {
        ambient:  { title: "Konsentratsiya musiqasi", sub: "AI Generated Ambient" },
        rain:     { title: "Yomğir ovozi",            sub: "Tınçlantiruvçi tabiat" },
        binaural: { title: "Fokus tölqinlari",        sub: "Alpha 10Hz Binaural" },
        brown:    { title: "Tınç şovqin",             sub: "Deep Brown Noise" }
    };

    let isPlaying = false;
    let sourceType = "ambient"; // 'ambient' | 'youtube'
    let activeAmbient = "ambient";
    let activeYtId = null;
    let volumeVal = parseInt(localStorage.getItem("ulh_office_music_vol") || "70", 10);

    // Web Audio API (эмбиент без внешних файлов)
    let audioCtx = null;
    let masterGain = null;
    let activeNodes = [];

    // YouTube IFrame API
    let ytPlayer = null;
    let ytReady = false;
    let pendingYtId = null;

    function loadPlaylist() {
        // Подхватываем плейлист с главного сайта, если он уже сохранён в localStorage
        const altKey = ["ulhMusicPlaylist", "musicPlaylist", "ytPlaylist", "ulh_yt_playlist"].find(k => localStorage.getItem(k));
        const key = localStorage.getItem(PL_KEY) ? PL_KEY : (altKey || PL_KEY);
        const arr = safeJsonParse(key, []);
        return Array.isArray(arr) ? arr : [];
    }

    function savePlaylist(arr) {
        try { localStorage.setItem(PL_KEY, JSON.stringify(arr)); } catch (_) {}
    }

    function extractYtId(url) {
        const str = String(url || "").trim();
        const m = str.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{11})/);
        if (m) return m[1];
        if (/^[A-Za-z0-9_-]{11}$/.test(str)) return str;
        return null;
    }

    function ensureYouTubeApi() {
        if (window.YT && window.YT.Player) {
            if (!ytPlayer) createYtPlayer();
            return;
        }
        if (!document.getElementById("ytIframeApiScript")) {
            const tag = document.createElement("script");
            tag.id = "ytIframeApiScript";
            tag.src = "https://www.youtube.com/iframe_api";
            document.head.appendChild(tag);
        }
        const prevReady = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = function() {
            if (typeof prevReady === "function") prevReady();
            createYtPlayer();
        };
    }

    function createYtPlayer() {
        const host = document.getElementById("officeYtPlayerHost");
        if (!host || ytPlayer) return;
        ytPlayer = new YT.Player("officeYtPlayerHost", {
            height: "1",
            width: "1",
            videoId: pendingYtId || "",
            playerVars: { autoplay: 0, controls: 0, rel: 0 },
            events: {
                onReady: () => {
                    ytReady = true;
                    ytPlayer.setVolume(volumeVal);
                    if (pendingYtId) {
                        const id = pendingYtId;
                        pendingYtId = null;
                        ytPlayer.loadVideoById(id);
                        ytPlayer.playVideo();
                    }
                },
                onStateChange: (ev) => {
                    if (ev.data === YT.PlayerState.ENDED && sourceType === "youtube") {
                        playNextPlaylistTrack();
                    }
                }
            }
        });
    }

    function stopAmbientEngine() {
        activeNodes.forEach(n => {
            try { if (typeof n.stop === "function") n.stop(); } catch (_) {}
            try { n.disconnect(); } catch (_) {}
        });
        activeNodes = [];
    }

    function startAmbientEngine(mode) {
        stopAmbientEngine();
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        if (!audioCtx) {
            audioCtx = new Ctx();
            masterGain = audioCtx.createGain();
            masterGain.connect(audioCtx.destination);
        }
        if (audioCtx.state === "suspended") audioCtx.resume();
        masterGain.gain.setTargetAtTime((volumeVal / 100) * 0.28, audioCtx.currentTime, 0.08);

        if (mode === "ambient") {
            // Тёплый гармонический пэд (до-мажор септаккорд)
            const freqs = [130.81, 196.0, 246.94, 329.63];
            const filter = audioCtx.createBiquadFilter();
            filter.type = "lowpass";
            filter.frequency.value = 520;
            filter.connect(masterGain);
            activeNodes.push(filter);

            freqs.forEach((f, idx) => {
                const osc = audioCtx.createOscillator();
                const g = audioCtx.createGain();
                osc.type = idx % 2 === 0 ? "sine" : "triangle";
                osc.frequency.value = f;
                g.gain.value = 0.22 / freqs.length;
                osc.connect(g);
                g.connect(filter);
                osc.start();
                activeNodes.push(osc, g);
            });
        } else if (mode === "binaural") {
            // Мягкие альфа-волны 200 Гц + 210 Гц
            [200, 210].forEach((f, i) => {
                const osc = audioCtx.createOscillator();
                const g = audioCtx.createGain();
                osc.type = "sine";
                osc.frequency.value = f;
                g.gain.value = 0.22;
                osc.connect(g);
                g.connect(masterGain);
                osc.start();
                activeNodes.push(osc, g);
            });
        } else {
            // Шум: дождь (rain) или мягкий коричневый шум (brown)
            const bufSize = audioCtx.sampleRate * 3;
            const buffer = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
            const data = buffer.getChannelData(0);
            let lastOut = 0;
            for (let i = 0; i < bufSize; i++) {
                const white = Math.random() * 2 - 1;
                if (mode === "brown") {
                    data[i] = (lastOut + 0.02 * white) / 1.02;
                    lastOut = data[i];
                    data[i] *= 3.2;
                } else {
                    data[i] = white * 0.45;
                }
            }
            const src = audioCtx.createBufferSource();
            src.buffer = buffer;
            src.loop = true;

            const filter = audioCtx.createBiquadFilter();
            filter.type = mode === "rain" ? "bandpass" : "lowpass";
            filter.frequency.value = mode === "rain" ? 950 : 340;
            filter.Q.value = mode === "rain" ? 0.6 : 1;

            src.connect(filter);
            filter.connect(masterGain);
            src.start();
            activeNodes.push(src, filter);
        }
    }

    function updatePlayerUI() {
        const playIco = document.getElementById("omPlayIco");
        const pauseIco = document.getElementById("omPauseIco");
        const topBtn = document.getElementById("officeMusicToggleBtn");
        if (playIco) playIco.style.display = isPlaying ? "none" : "inline-block";
        if (pauseIco) pauseIco.style.display = isPlaying ? "inline-block" : "none";
        topBtn?.classList.toggle("is-playing", isPlaying);

        document.querySelectorAll(".om-mode-btn").forEach(btn => {
            btn.classList.toggle("active", sourceType === "ambient" && btn.dataset.amb === activeAmbient);
        });

        const slider = document.getElementById("omVolumeRange");
        if (slider) {
            slider.value = volumeVal;
            const trackBg = document.body.classList.contains("dark-mode") ? "#1E293B" : "#ECFDF5";
            slider.style.background = `linear-gradient(to right, #10B981 0%, #10B981 ${volumeVal}%, ${trackBg} ${volumeVal}%, ${trackBg} 100%)`;
        }
        renderPlaylist();
    }

    function setTrackHeader(title, sub) {
        const t = document.getElementById("omTrackTitle");
        const s = document.getElementById("omTrackSub");
        if (t) t.textContent = title || "Konsentratsiya musiqasi";
        if (s) s.textContent = sub || "AI Generated Ambient";
    }

    async function fetchYtMeta(id) {
        try {
            const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${id}`);
            const data = await res.json();
            return {
                title: data.title || `YouTube (${id})`,
                author: data.author_name || "YouTube Audio"
            };
        } catch (_) {
            return { title: `YouTube (${id})`, author: "YouTube Audio" };
        }
    }

    function playYouTubeById(id, title, author) {
        stopAmbientEngine();
        sourceType = "youtube";
        activeYtId = id;
        isPlaying = true;
        setTrackHeader(title || "YouTube yuklanmoqda...", author || "YouTube");

        ensureYouTubeApi();
        if (ytReady && ytPlayer && typeof ytPlayer.loadVideoById === "function") {
            ytPlayer.setVolume(volumeVal);
            ytPlayer.loadVideoById(id);
            ytPlayer.playVideo();
        } else {
            pendingYtId = id;
        }
        updatePlayerUI();
    }

    function playNextPlaylistTrack() {
        const pl = loadPlaylist();
        if (!pl.length) return;
        const idx = pl.findIndex(t => t.id === activeYtId);
        const next = pl[(idx + 1) % pl.length];
        if (next) playYouTubeById(next.id, next.title, next.author);
    }

    function renderPlaylist() {
        const box = document.getElementById("omPlaylistList");
        if (!box) return;
        const list = loadPlaylist();
        if (!list.length) {
            box.innerHTML = `<div class="om-pl-empty">Pleylist böş — YouTube havolasini qöşing</div>`;
            return;
        }
        const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        box.innerHTML = list.map((tr, i) => {
            const isCur = sourceType === "youtube" && activeYtId === tr.id;
            return `
                <div class="om-pl-item ${isCur ? "playing" : ""}" draggable="true" data-idx="${i}">
                    <span class="om-pl-drag" title="Tartibni özgartiriş">≡</span>
                    <button type="button" class="om-pl-play" onclick="playOfficePlaylistIndex(${i})" title="Oynatiş">
                        <svg class="ti ti-xs" viewBox="0 0 24 24"><path d="M7 4v16l13 -8z" fill="currentColor" stroke="none"/></svg>
                    </button>
                    <div class="om-pl-meta" onclick="playOfficePlaylistIndex(${i})">
                        <div class="om-pl-name">${esc(tr.title)}</div>
                        <div class="om-pl-author">${esc(tr.author || "YouTube")}</div>
                    </div>
                    <button type="button" class="om-pl-del" onclick="removeOfficePlaylistTrack(${i})" title="Öçiriş">×</button>
                </div>
            `;
        }).join("");

        // Drag-and-drop сортировка треков в плейлисте
        let dragIdx = null;
        box.querySelectorAll(".om-pl-item").forEach(item => {
            item.addEventListener("dragstart", () => { dragIdx = +item.dataset.idx; });
            item.addEventListener("dragover", (e) => e.preventDefault());
            item.addEventListener("drop", (e) => {
                e.preventDefault();
                const dropIdx = +item.dataset.idx;
                if (dragIdx === null || dragIdx === dropIdx) return;
                const pl = loadPlaylist();
                const [moved] = pl.splice(dragIdx, 1);
                pl.splice(dropIdx, 0, moved);
                savePlaylist(pl);
                renderPlaylist();
            });
        });
    }

    window.toggleOfficeMusicMenu = function(e) {
        if (e) e.stopPropagation();
        const wrap = document.getElementById("officeMusicWrap");
        if (!wrap) return;
        const willOpen = !wrap.classList.contains("open");
        if (typeof closeAllOfficeMenus === "function") closeAllOfficeMenus("officeMusicWrap");
        wrap.classList.toggle("open", willOpen);
        if (willOpen) updatePlayerUI();
    };

    window.toggleOfficeMusicPlay = function() {
        if (isPlaying) {
            isPlaying = false;
            stopAmbientEngine();
            if (ytReady && ytPlayer && typeof ytPlayer.pauseVideo === "function") ytPlayer.pauseVideo();
        } else {
            isPlaying = true;
            if (sourceType === "youtube" && activeYtId) {
                if (ytReady && ytPlayer && typeof ytPlayer.playVideo === "function") ytPlayer.playVideo();
                else playYouTubeById(activeYtId, document.getElementById("omTrackTitle")?.textContent, document.getElementById("omTrackSub")?.textContent);
            } else {
                const m = AMBIENT_META[activeAmbient] || AMBIENT_META.ambient;
                setTrackHeader(m.title, m.sub);
                startAmbientEngine(activeAmbient);
            }
        }
        updatePlayerUI();
    };

    window.selectOfficeAmbient = function(mode) {
        if (ytReady && ytPlayer && typeof ytPlayer.pauseVideo === "function") ytPlayer.pauseVideo();
        sourceType = "ambient";
        activeAmbient = mode;
        activeYtId = null;
        isPlaying = true;
        const m = AMBIENT_META[mode] || AMBIENT_META.ambient;
        setTrackHeader(m.title, m.sub);
        startAmbientEngine(mode);
        updatePlayerUI();
    };

    window.setOfficeMusicVolume = function(val) {
        volumeVal = Math.max(0, Math.min(100, parseInt(val, 10) || 0));
        localStorage.setItem("ulh_office_music_vol", String(volumeVal));
        if (masterGain && audioCtx) {
            masterGain.gain.setTargetAtTime((volumeVal / 100) * 0.28, audioCtx.currentTime, 0.05);
        }
        if (ytReady && ytPlayer && typeof ytPlayer.setVolume === "function") {
            ytPlayer.setVolume(volumeVal);
        }
        updatePlayerUI();
    };

    async function addTrackToPlaylist(url, autoPlay) {
        const id = extractYtId(url);
        if (!id) return alert("Töğri YouTube havolasini kiriting.");
        const meta = await fetchYtMeta(id);
        const pl = loadPlaylist();
        if (!pl.some(t => t.id === id)) {
            pl.unshift({ id, title: meta.title, author: meta.author });
            savePlaylist(pl);
        }
        if (autoPlay) playYouTubeById(id, meta.title, meta.author);
        else renderPlaylist();
    }

    window.playOfficeYtFromInput = async function() {
        const inp = document.getElementById("omYtInput");
        const url = (inp?.value || "").trim();
        if (!url) return;
        await addTrackToPlaylist(url, true);
        if (inp) inp.value = "";
    };

    window.addOfficeTrackPrompt = async function() {
        const inp = document.getElementById("omYtInput");
        const curVal = (inp?.value || "").trim();
        const url = curVal || prompt("YouTube havolasini kiriting:");
        if (!url) return;
        await addTrackToPlaylist(url, false);
        if (inp && curVal) inp.value = "";
    };

    window.playOfficePlaylistIndex = function(idx) {
        const pl = loadPlaylist();
        const tr = pl[idx];
        if (!tr) return;
        if (sourceType === "youtube" && activeYtId === tr.id && isPlaying) {
            window.toggleOfficeMusicPlay();
            return;
        }
        playYouTubeById(tr.id, tr.title, tr.author);
    };

    window.removeOfficePlaylistTrack = function(idx) {
        const pl = loadPlaylist();
        pl.splice(idx, 1);
        savePlaylist(pl);
        renderPlaylist();
    };

    window.clearOfficePlaylist = function() {
        savePlaylist([]);
        renderPlaylist();
    };

    // Закрытие окна плеера при клике вне него (музыка продолжает играть)
    document.addEventListener("click", (e) => {
        if (!e.target.closest("#officeMusicWrap")) {
            document.getElementById("officeMusicWrap")?.classList.remove("open");
        }
    });

    document.addEventListener("DOMContentLoaded", () => {
        updatePlayerUI();
    });
})();
