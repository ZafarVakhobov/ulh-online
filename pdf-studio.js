// ==========================================
// === PDF STUDIYA (MERGE, SPLIT, WATERMARK) ===
// ==========================================

let pdfMergeFiles = [];
let pdfSplitFile = null;
let pdfSplitPageCount = 0;
let pdfWmFile = null;

window.openPdfStudioModal = function(event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    document.querySelectorAll('.nav-item.has-dropdown').forEach(el => el.classList.remove('open'));
    const modal = document.getElementById('pdfStudioModalBackdrop');
    if (modal) modal.classList.add('open');
    setPdfStatus('');
};

window.closePdfStudioModal = function(event) {
    const modal = document.getElementById('pdfStudioModalBackdrop');
    if (!modal) return;
    if (event && event.target && event.target !== modal) return;
    modal.classList.remove('open');
};

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePdfStudioModal();
});

window.switchPdfTab = function(tabName, btnEl) {
    document.querySelectorAll('.pdf-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.pdf-tab-pane').forEach(p => p.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');

    const map = { merge: 'pdfTabMerge', split: 'pdfTabSplit', watermark: 'pdfTabWatermark' };
    const pane = document.getElementById(map[tabName]);
    if (pane) pane.classList.add('active');
    setPdfStatus('');
};

function setPdfStatus(msg, color = '#0284C7') {
    const el = document.getElementById('pdfStudioStatus');
    if (!el) return;
    el.style.color = color;
    el.textContent = msg;
}

function triggerPdfDownload(bytes, filename) {
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
}

// --- 1. СКЛЕИВАНИЕ (MERGE) ---
window.handlePdfMergeSelect = function(input) {
    if (!input.files || !input.files.length) return;
    Array.from(input.files).forEach(f => {
        if (f.name.toLowerCase().endsWith('.pdf')) pdfMergeFiles.push(f);
    });
    input.value = '';
    renderPdfMergeList();
};

function renderPdfMergeList() {
    const list = document.getElementById('pdfMergeList');
    if (!list) return;
    list.innerHTML = '';
    pdfMergeFiles.forEach((file, idx) => {
        const row = document.createElement('div');
        row.className = 'pdf-file-item';
        row.innerHTML = `
            <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${idx + 1}. ${file.name}</span>
            <button type="button" onclick="removePdfMergeFile(${idx})">×</button>
        `;
        list.appendChild(row);
    });
}

window.removePdfMergeFile = function(idx) {
    pdfMergeFiles.splice(idx, 1);
    renderPdfMergeList();
};

window.runPdfMerge = async function() {
    if (typeof PDFLib === 'undefined') return setPdfStatus('PDF kutubxonasi yuklanmadi!', '#EF4444');
    if (pdfMergeFiles.length < 2) return setPdfStatus('Kamida 2 ta PDF fayl tanlang!', '#F59E0B');

    const btn = document.getElementById('pdfMergeRunBtn');
    btn.disabled = true;
    setPdfStatus('Fayllar birlaştirilmoqda...');

    try {
        const mergedPdf = await PDFLib.PDFDocument.create();
        for (const file of pdfMergeFiles) {
            const bytes = await file.arrayBuffer();
            const pdf = await PDFLib.PDFDocument.load(bytes);
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            copiedPages.forEach(page => mergedPdf.addPage(page));
        }
        const outBytes = await mergedPdf.save();
        triggerPdfDownload(outBytes, 'ulh_birlashtirilgan.pdf');
        setPdfStatus('Tayyor! Fayl yuklab olindi ✓', '#10B981');
    } catch (err) {
        setPdfStatus('Xatolik: ' + err.message, '#EF4444');
    } finally {
        btn.disabled = false;
    }
};

// --- 2. ИЗВЛЕЧЕНИЕ СТРАНИЦ (SPLIT) ---
window.handlePdfSplitSelect = async function(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    pdfSplitFile = file;
    const label = document.getElementById('pdfSplitFileLabel');
    try {
        const bytes = await file.arrayBuffer();
        const pdf = await PDFLib.PDFDocument.load(bytes);
        pdfSplitPageCount = pdf.getPageCount();
        if (label) label.textContent = `${file.name} (${pdfSplitPageCount} sahifa)`;
        setPdfStatus('');
    } catch (err) {
        setPdfStatus('Faylni öqib bölmadi: ' + err.message, '#EF4444');
    }
};

function parsePageRanges(rangeStr, maxPages) {
    const indices = new Set();
    const parts = rangeStr.split(',');
    for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        if (trimmed.includes('-')) {
            const [start, end] = trimmed.split('-').map(n => parseInt(n.trim(), 10));
            if (!isNaN(start) && !isNaN(end) && start <= end) {
                for (let i = Math.max(1, start); i <= Math.min(maxPages, end); i++) {
                    indices.add(i - 1);
                }
            }
        } else {
            const num = parseInt(trimmed, 10);
            if (!isNaN(num) && num >= 1 && num <= maxPages) indices.add(num - 1);
        }
    }
    return Array.from(indices).sort((a, b) => a - b);
}

window.runPdfSplit = async function() {
    if (!pdfSplitFile) return setPdfStatus('Avval PDF fayl tanlang!', '#F59E0B');
    const rangeStr = document.getElementById('pdfSplitRange').value.trim();
    if (!rangeStr) return setPdfStatus('Sahifalar oraliğini kiriting (masalan: 1-3, 5)', '#F59E0B');

    const indices = parsePageRanges(rangeStr, pdfSplitPageCount);
    if (!indices.length) return setPdfStatus(`Notöğri oraliq (1 dan ${pdfSplitPageCount} gaça)`, '#EF4444');

    const btn = document.getElementById('pdfSplitRunBtn');
    btn.disabled = true;
    setPdfStatus('Sahifalar ajratilmoqda...');

    try {
        const bytes = await pdfSplitFile.arrayBuffer();
        const srcPdf = await PDFLib.PDFDocument.load(bytes);
        const newPdf = await PDFLib.PDFDocument.create();
        const copied = await newPdf.copyPages(srcPdf, indices);
        copied.forEach(p => newPdf.addPage(p));

        const outBytes = await newPdf.save();
        triggerPdfDownload(outBytes, 'ulh_ajratilgan.pdf');
        setPdfStatus(`Tayyor! ${indices.length} ta sahifa yuklab olindi ✓`, '#10B981');
    } catch (err) {
        setPdfStatus('Xatolik: ' + err.message, '#EF4444');
    } finally {
        btn.disabled = false;
    }
};

// --- 3. ВОДЯНОЙ ЗНАК (CANVAS PNG ДЛЯ ПОДДЕРЖКИ Ö/Ğ/Ş/Ç И КИРИЛЛИЦЫ) + НУМЕРАЦИЯ ---
window.handlePdfWmSelect = function(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    pdfWmFile = file;
    const label = document.getElementById('pdfWmFileLabel');
    if (label) label.textContent = file.name;
    setPdfStatus('');
};

function createWatermarkPngBytes(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '800 58px Manrope, Arial, sans-serif';
    ctx.fillStyle = 'rgba(100, 116, 139, 0.26)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const dataUrl = canvas.toDataURL('image/png');
    const base64 = dataUrl.split(',')[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

window.runPdfWatermark = async function() {
    if (!pdfWmFile) return setPdfStatus('Avval PDF fayl tanlang!', '#F59E0B');
    const wmText = document.getElementById('pdfWmText').value.trim();
    const addNums = document.getElementById('pdfAddPageNums').checked;

    if (!wmText && !addNums) return setPdfStatus('Suv belgisi yozing yoki raqamlaşni yoqing!', '#F59E0B');

    const btn = document.getElementById('pdfWmRunBtn');
    btn.disabled = true;
    setPdfStatus('Qayta işlanmoqda...');

    try {
        const bytes = await pdfWmFile.arrayBuffer();
        const pdfDoc = await PDFLib.PDFDocument.load(bytes);
        const pages = pdfDoc.getPages();
        const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);

        let wmImage = null;
        if (wmText) {
            const pngBytes = createWatermarkPngBytes(wmText);
            wmImage = await pdfDoc.embedPng(pngBytes);
        }

        pages.forEach((page, idx) => {
            const { width, height } = page.getSize();

            if (wmImage) {
                const imgW = width * 0.75;
                const imgH = (wmImage.height / wmImage.width) * imgW;
                page.drawImage(wmImage, {
                    x: width / 2 - imgW / 2.6,
                    y: height / 2 - imgH / 2,
                    width: imgW,
                    height: imgH,
                    rotate: PDFLib.degrees(35)
                });
            }

            if (addNums) {
                const numText = `${idx + 1} / ${pages.length}`;
                page.drawText(numText, {
                    x: width - 58,
                    y: 22,
                    size: 10,
                    font: font,
                    color: PDFLib.rgb(0.4, 0.45, 0.52)
                });
            }
        });

        const outBytes = await pdfDoc.save();
        triggerPdfDownload(outBytes, 'ulh_tahrirlangan.pdf');
        setPdfStatus('Tayyor! Fayl yuklab olindi ✓', '#10B981');
    } catch (err) {
        setPdfStatus('Xatolik: ' + err.message, '#EF4444');
    } finally {
        btn.disabled = false;
    }
};
