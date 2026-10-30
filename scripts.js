// === 1. ИНИЦИАЛИЗАЦИЯ TELEGRAM MINI APP ===
const tg = (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : null;
if (tg) {
    tg.ready();
    tg.expand();

    // Скрываем блок конвертера файлов только внутри среды Telegram Mini App
    const isTelegramEnv = Boolean(tg.initData && tg.initData.length > 0);
    if (isTelegramEnv) {
        const converterBoxEl = document.getElementById('converterBox');
        if (converterBoxEl) converterBoxEl.style.display = 'none';
    }
}

function openTgLink(e) {
    if (tg && tg.openTelegramLink) {
        e.preventDefault();
        tg.openTelegramLink("https://t.me/ulh_releases");
    }
}

function openTgCustomLink(e, url) {
    if (tg && tg.openTelegramLink) {
        e.preventDefault();
        tg.openTelegramLink(url);
    }
}

// === 2. ОСНОВНОЙ РЕДАКТОР И ЖИВАЯ ТРАНСЛИТЕРАЦИЯ ===
const currentYearEl = document.getElementById('currentYear');
if (currentYearEl) {
    currentYearEl.innerText = new Date().getFullYear();
}

const editor = document.getElementById('editor');
const tip = document.getElementById('popup-tip');

let replaceTargetIndex = -1;
let originalPairValue = "";
let tipTimeout = null;

function copyEditorText() {
    const btn = document.getElementById('copyBtn');
    if (!editor || !editor.value || !btn) return;

    navigator.clipboard.writeText(editor.value).then(() => {
        const tooltipNode = btn.querySelector('.custom-tooltip');
        if (tooltipNode) tooltipNode.textContent = "Nusxalandi ✓";
        btn.classList.add('copied');

        setTimeout(() => {
            if (tooltipNode) tooltipNode.textContent = "Nusxa oliş";
            btn.classList.remove('copied');
        }, 1200);
    }).catch(() => {
        const tooltipNode = btn.querySelector('.custom-tooltip');
        if (tooltipNode) {
            tooltipNode.textContent = "Xatolik!";
            setTimeout(() => { tooltipNode.textContent = "Nusxa oliş"; }, 1200);
        }
    });
}

function clearEditorText() {
    const btn = document.getElementById('clearBtn');
    if (!editor || editor.value.length === 0 || !btn) return;

    editor.value = '';
    hideTooltip();

    btn.innerText = 'Öçirildi';
    btn.classList.add('cleared');
    setTimeout(() => {
        btn.innerText = 'Öçiriş';
        btn.classList.remove('cleared');
    }, 1000);
}

const russianCommonWords = new Set([
    "моя", "мой", "мои", "моё", "книга", "школа", "машина", "человек",
    "город", "дом", "работа", "земля", "вода", "солнце", "время",
    "это", "как", "что", "быть", "меня", "тебя", "ему", "теперь", "когда", "только", "уже"
]);

function isRussianCommonWord(word) {
    if (!word || (word[0] >= 'А' && word[0] <= 'Я')) {
        return false;
    }
    return russianCommonWords.has(word.toLowerCase());
}

function isAnyVowel(ch) {
    if (!ch) return false;
    return "аеёиоуўэюяАЕЁИОУЎЭЮЯaeiouöAEIOUÖ".indexOf(ch) !== -1;
}

function cyrillicToLatin(text) {
    if (!text) return "";

    return text.replace(/[А-Яа-яЁёҒғҚқЎўҲҳЪъЬь]+/g, function(word) {
        if (isRussianCommonWord(word)) {
            return word;
        }

        let cleanedWord = word
            .replace(/([бвгғджзклмнпрстфхҳцчшБВГҒДЖЗКЛМНПРСТФХҲЦЧШ])[Ьь][Яя]/g, "$1a")
            .replace(/([бвгғджзклмнпрстфхҳцчшБВГҒДЖЗКЛМНПРСТФХҲЦЧШ])[Ьь][Юю]/g, "$1u")
            .replace(/([бвгғджзклмнпрстфхҳцчшБВГҒДЖЗКЛМНПРСТФХҲЦЧШ])[Ьь][Ёё]/g, "$1o")
            .replace(/([бвгғджзклмнпрстфхҳцчшБВГҒДЖЗКЛМНПРСТФХҲЦЧШ])[Ьь][Ее]/g, "$1ye");

        let res = "";
        for (let i = 0; i < cleanedWord.length; i++) {
            let ch = cleanedWord[i];
            let prev = i > 0 ? cleanedWord[i - 1] : "";

            if (ch === 'Ь' || ch === 'ь') {
                continue;
            }

            if (ch === 'Ъ' || ch === 'ъ') {
                let nextChar = cleanedWord[i + 1] || "";
                if (nextChar === 'Е' || nextChar === 'е') {
                    continue;
                }
                res += '’';
                continue;
            }

            if (ch === 'Е' || ch === 'е') {
                let useYe = (i === 0) || isAnyVowel(prev) || prev === 'Ъ' || prev === 'ъ' || prev === 'Ь' || prev === 'ь';
                res += useYe ? ((ch === 'Е') ? 'Ye' : 'ye') : ((ch === 'Е') ? 'E' : 'e');
                continue;
            }

            if ((ch === 'Я' || ch === 'я') && /^октябр/i.test(word)) {
                res += (ch === 'Я') ? 'A' : 'a';
                continue;
            }

            if (ch === 'Ю' || ch === 'ю') { res += (ch === 'Ю' ? 'Yu' : 'yu'); continue; }
            if (ch === 'Я' || ch === 'я') { res += (ch === 'Я' ? 'Ya' : 'ya'); continue; }
            if (ch === 'Ё' || ch === 'ё') { res += (ch === 'Ё' ? 'Yo' : 'yo'); continue; }

            switch (ch) {
                case 'А': res += 'A'; break; case 'а': res += 'a'; break;
                case 'Б': res += 'B'; break; case 'б': res += 'b'; break;
                case 'В': res += 'V'; break; case 'в': res += 'v'; break;
                case 'Г': res += 'G'; break; case 'г': res += 'g'; break;
                case 'Ғ': res += 'Ğ'; break; case 'ғ': res += 'ğ'; break;
                case 'Д': res += 'D'; break; case 'д': res += 'd'; break;
                case 'Ж': res += 'J'; break; case 'ж': res += 'j'; break;
                case 'З': res += 'Z'; break; case 'з': res += 'z'; break;
                case 'И': res += 'I'; break; case 'и': res += 'i'; break;
                case 'Й': res += 'Y'; break; case 'й': res += 'y'; break;
                case 'К': res += 'K'; break; case 'к': res += 'k'; break;
                case 'Қ': res += 'Q'; break; case 'қ': res += 'q'; break;
                case 'Л': res += 'L'; break; case 'л': res += 'l'; break;
                case 'М': res += 'M'; break; case 'м': res += 'm'; break;
                case 'Н': res += 'N'; break; case 'н': res += 'n'; break;
                case 'О': res += 'O'; break; case 'о': res += 'o'; break;
                case 'П': res += 'P'; break; case 'п': res += 'p'; break;
                case 'Р': res += 'R'; break; case 'р': res += 'r'; break;
                case 'С': res += 'S'; break; case 'с': res += 's'; break;
                case 'Т': res += 'T'; break; case 'т': res += 't'; break;
                case 'У': res += 'U'; break; case 'у': res += 'u'; break;
                case 'Ў': res += 'Ö'; break; case 'ў': res += 'ö'; break;
                case 'Ф': res += 'F'; break; case 'ф': res += 'f'; break;
                case 'Х': res += 'X'; break; case 'х': res += 'x'; break;
                case 'Ҳ': res += 'H'; break; case 'ҳ': res += 'h'; break;
                case 'Ц': res += (i === 0) ? 'S' : 'Ts'; break;
                case 'ц': res += (i === 0) ? 's' : 'ts'; break;
                case 'Ч': res += 'Ç'; break; case 'ч': res += 'ç'; break;
                case 'Ш': res += 'Ş'; break; case 'ш': res += 'ş'; break;
                case 'Э': res += 'E'; break; case 'э': res += 'e'; break;
                default: res += ch;
            }
        }
        return res;
    });
}

function transliterateLiveSegment(beforeCursorText) {
    const wordMatch = beforeCursorText.match(/([A-Za-zÇŞĞÖçşğö’'`\u02BB\u02BCА-Яа-яЁёҒғҚқЎўҲҳЪъЬь]+)$/);
    if (!wordMatch) return beforeCursorText;

    const fullWord = wordMatch[1];
    const prefixText = beforeCursorText.substring(0, beforeCursorText.length - fullWord.length);

    if (/^[А-Яа-яЁёҒғҚқЎўҲҳЪъЬь]+$/.test(fullWord)) {
        return prefixText + cyrillicToLatin(fullWord);
    }

    let out = "";
    for (let i = 0; i < fullWord.length; i++) {
        let ch = fullWord[i];

        if (!/[А-Яа-яЁёҒғҚқЎўҲҳЪъЬь]/.test(ch)) {
            out += ch;
            continue;
        }

        let prevChar = out.length > 0 ? out[out.length - 1] : "";
        let isWordStart = (out.length === 0);

        if (ch === 'Ь' || ch === 'ь') {
            continue;
        }

        if (ch === 'Ъ' || ch === 'ъ') {
            out += '’';
            continue;
        }

        if (ch === 'Е' || ch === 'е') {
            if (prevChar === '’' && /(?:sub|ob)’$/i.test(out)) {
                out = out.slice(0, -1) + (ch === 'Е' ? 'Ye' : 'ye');
            } else if (isWordStart || isAnyVowel(prevChar)) {
                out += (ch === 'Е') ? 'Ye' : 'ye';
            } else {
                out += (ch === 'Е') ? 'E' : 'e';
            }
            continue;
        }

        if (ch === 'Ц' || ch === 'ц') {
            out += isWordStart ? (ch === 'Ц' ? 'S' : 's') : (ch === 'Ц' ? 'Ts' : 'ts');
            continue;
        }

        if (ch === 'Ю' || ch === 'ю') { out += (ch === 'Ю' ? 'Yu' : 'yu'); continue; }
        if (ch === 'Я' || ch === 'я') { out += (ch === 'Я' ? 'Ya' : 'ya'); continue; }
        if (ch === 'Ё' || ch === 'ё') { out += (ch === 'Ё' ? 'Yo' : 'yo'); continue; }

        switch (ch) {
            case 'А': out += 'A'; break; case 'а': out += 'a'; break;
            case 'Б': out += 'B'; break; case 'б': out += 'b'; break;
            case 'В': out += 'V'; break; case 'в': out += 'v'; break;
            case 'Г': out += 'G'; break; case 'г': out += 'g'; break;
            case 'Ғ': out += 'Ğ'; break; case 'ғ': out += 'ğ'; break;
            case 'Д': out += 'D'; break; case 'д': out += 'd'; break;
            case 'Ж': out += 'J'; break; case 'ж': out += 'j'; break;
            case 'З': out += 'Z'; break; case 'з': out += 'z'; break;
            case 'И': out += 'I'; break; case 'и': out += 'i'; break;
            case 'Й': out += 'Y'; break; case 'й': out += 'y'; break;
            case 'К': out += 'K'; break; case 'к': out += 'k'; break;
            case 'Қ': out += 'Q'; break; case 'қ': out += 'q'; break;
            case 'Л': out += 'L'; break; case 'л': out += 'l'; break;
            case 'М': out += 'M'; break; case 'м': out += 'm'; break;
            case 'Н': out += 'N'; break; case 'н': out += 'n'; break;
            case 'О': out += 'O'; break; case 'о': out += 'o'; break;
            case 'П': out += 'P'; break; case 'п': out += 'p'; break;
            case 'Р': out += 'R'; break; case 'р': out += 'r'; break;
            case 'С': out += 'S'; break; case 'с': out += 's'; break;
            case 'Т': out += 'T'; break; case 'т': out += 't'; break;
            case 'У': out += 'U'; break; case 'у': out += 'u'; break;
            case 'Ў': out += 'Ö'; break; case 'ў': out += 'ö'; break;
            case 'Ф': out += 'F'; break; case 'ф': out += 'f'; break;
            case 'Х': out += 'X'; break; case 'х': out += 'x'; break;
            case 'Ҳ': out += 'H'; break; case 'ҳ': out += 'h'; break;
            case 'Ч': out += 'Ç'; break; case 'ч': out += 'ç'; break;
            case 'Ш': out += 'Ş'; break; case 'ш': out += 'ş'; break;
            case 'Э': out += 'E'; break; case 'э': out += 'e'; break;
            default: out += ch;
        }
    }

    out = out.replace(/^oktyabr/i, function(m) {
        return m[0] === 'O' ? 'Oktabr' : 'oktabr';
    });

    return prefixText + out;
}

function replaceOnlyOg(str) {
    return str
        .replace(/G['`\u02BB\u2018\u2019\u02BC]/g, 'Ğ')
        .replace(/g['`\u02BB\u2018\u2019\u02BC]/g, 'ğ')
        .replace(/O['`\u02BB\u2018\u2019\u02BC]/g, 'Ö')
        .replace(/o['`\u02BB\u2018\u2019\u02BC]/g, 'ö');
}

function applyReplacements(text) {
    if (!text) return "";

    const placeholders = [];
    function savePlaceholder(content) {
        const token = "\uE000" + placeholders.length + "\uE001";
        placeholders.push(content);
        return token;
    }

    const urlRegex = /(?:https?:\/\/|ftp:\/\/|www\.|t\.me\/)[^\s"'«»“”<>()]+|\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b|\b[a-zA-Z0-9-]+\.(?:uz|com|ru|org|net|io|me|edu|gov|info|biz|tv|co|uk|de|ai|app|dev)(?:\/[^\s"'«»“”<>()]*)?\b/gi;
    let processed = text.replace(urlRegex, function(match) {
        return savePlaceholder(match);
    });

    const quoteRegex = /("[^"\n]*"|«[^»\n]*»|“[^”\n]*”|„[^“\n]*“)/g;
    processed = processed.replace(quoteRegex, function(match) {
        if (/[А-Яа-яЁёҒғҚқЎўҲҳ]/.test(match)) {
            return cyrillicToLatin(replaceOnlyOg(match));
        }
        return savePlaceholder(replaceOnlyOg(match));
    });

    processed = cyrillicToLatin(processed);

    processed = replaceOnlyOg(processed)
        .replace(/S[hH]/g, 'Ş')
        .replace(/s[hH]/g, 'ş')
        .replace(/C[hH]/g, 'Ç')
        .replace(/c[hH]/g, 'ç');

    processed = processed.replace(/\uE000(\d+)\uE001/g, function(_, index) {
        return placeholders[Number(index)];
    });

    return processed;
}

function isCursorInUrlOrQuotes(textBeforeCursor) {
    const words = textBeforeCursor.split(/\s+/);
    const currentWord = words[words.length - 1] || "";
    if (/^(https?:\/\/|ftp:\/\/|www\.|t\.me\/)/i.test(currentWord) ||
        /[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/i.test(currentWord) ||
        currentWord.includes("://") ||
        currentWord.includes("www.")) {
        return true;
    }

    const lastLine = textBeforeCursor.split('\n').pop();
    const straightQuotes = (lastLine.match(/"/g) || []).length;
    if (straightQuotes % 2 === 1) return true;

    const openGuillemets = (lastLine.match(/«/g) || []).length;
    const closeGuillemets = (lastLine.match(/»/g) || []).length;
    if (openGuillemets > closeGuillemets) return true;

    const openCurly = (lastLine.match(/[“„]/g) || []).length;
    const closeCurly = (lastLine.match(/”/g) || []).length;
    if (openCurly > closeCurly) return true;

    return false;
}

if (editor) {
    editor.addEventListener('paste', function(e) {
        e.preventDefault();
        let pastedText = (e.clipboardData || window.clipboardData).getData('text');
        let convertedPaste = applyReplacements(pastedText);

        let start = this.selectionStart;
        let end = this.selectionEnd;
        let val = this.value;

        this.value = val.substring(0, start) + convertedPaste + val.substring(end);
        this.selectionStart = this.selectionEnd = start + convertedPaste.length;
        hideTooltip();
    });

    editor.addEventListener('input', function(e) {
        if (e.inputType === 'insertFromPaste') {
            let pos = this.selectionStart;
            let before = applyReplacements(this.value.substring(0, pos));
            let after = applyReplacements(this.value.substring(pos));
            this.value = before + after;
            this.selectionStart = this.selectionEnd = before.length;
            return;
        }

        let val = this.value;
        let pos = this.selectionStart;

        if (pos < 1) return;

        let beforeCursor = val.substring(0, pos);
        let afterCursor = val.substring(pos);

        // 1. ЖИВОЙ РЕЖИМ ДЛЯ КИРИЛЛИЦЫ
        if (/[А-Яа-яЁёҒғҚқЎўҲҳЪъЬь]/.test(beforeCursor)) {
            let lastTypedChar = beforeCursor.charAt(beforeCursor.length - 1);
            let convertedBefore = transliterateLiveSegment(beforeCursor);
            this.value = convertedBefore + afterCursor;
            this.selectionStart = this.selectionEnd = convertedBefore.length;

            if (lastTypedChar === 'Ш' || lastTypedChar === 'ш') {
                showTooltip(lastTypedChar === 'Ш' ? 'Sh' : 'sh', convertedBefore.length - 1);
            } else if (lastTypedChar === 'Ч' || lastTypedChar === 'ч') {
                showTooltip(lastTypedChar === 'Ч' ? 'Ch' : 'ch', convertedBefore.length - 1);
            } else {
                hideTooltip();
            }
            return;
        }

        // 2. ЖИВОЙ РЕЖИМ ДЛЯ ЛАТИНИЦЫ (Sh -> Ş, Ch -> Ç, O' -> Ö, G' -> Ğ)
        if (pos < 2) return;
        let twoChars = val.substring(pos - 2, pos);
        let c1 = twoChars.charAt(0);
        let c2 = twoChars.charAt(1);

        let rep = "";
        let isShCh = false;
        let isApos = (c2 === "'" || c2 === "`" || c2 === "\u02BB" || c2 === "\u2018" || c2 === "\u2019" || c2 === "\u02BC");

        let inProtectedContext = isCursorInUrlOrQuotes(beforeCursor);

        if ((c1 === 's' || c1 === 'S') && (c2 === 'h' || c2 === 'H')) {
            if (inProtectedContext) return;
            rep = (c1 === 'S') ? 'Ş' : 'ş';
            isShCh = true;
        } else if ((c1 === 'c' || c1 === 'C') && (c2 === 'h' || c2 === 'H')) {
            if (inProtectedContext) return;
            rep = (c1 === 'C') ? 'Ç' : 'ç';
            isShCh = true;
        } else if ((c1 === 'g' || c1 === 'G') && isApos) {
            rep = (c1 === 'G') ? 'Ğ' : 'ğ';
        } else if ((c1 === 'o' || c1 === 'O') && isApos) {
            rep = (c1 === 'O') ? 'Ö' : 'ö';
        }

        if (rep !== "") {
            this.value = val.substring(0, pos - 2) + rep + val.substring(pos);
            let newCursorPos = pos - 1;
            this.selectionStart = this.selectionEnd = newCursorPos;

            if (isShCh) {
                showTooltip(twoChars, newCursorPos - 1);
            } else {
                hideTooltip();
            }
        }
    });
}

function showTooltip(origPair, charIdx) {
    if (!tip || !editor) return;
    replaceTargetIndex = charIdx;
    originalPairValue = origPair;

    tip.innerText = origPair;
    tip.style.display = 'block';

    let rect = editor.getBoundingClientRect();
    tip.style.left = (rect.left + 20) + 'px';
    tip.style.top = (rect.top - 12) + 'px';

    if (tipTimeout) clearTimeout(tipTimeout);
    tipTimeout = setTimeout(hideTooltip, 5000);
}

function hideTooltip() {
    if (tip) tip.style.display = 'none';
    replaceTargetIndex = -1;
    originalPairValue = "";
}

function revertText() {
    if (!editor || replaceTargetIndex < 0 || !originalPairValue) return;
    let val = editor.value;
    let targetChar = val.charAt(replaceTargetIndex);

    if (targetChar === 'ş' || targetChar === 'Ş' || targetChar === 'ç' || targetChar === 'Ç') {
        let currentCaret = editor.selectionStart;
        editor.value = val.substring(0, replaceTargetIndex) + originalPairValue + val.substring(replaceTargetIndex + 1);
        let newCaret = (currentCaret > replaceTargetIndex) ? currentCaret + 1 : replaceTargetIndex + 2;
        editor.focus();
        editor.selectionStart = editor.selectionEnd = newCaret;
    }
    hideTooltip();
}

// === 3. DRAG & DROP И КОНВЕРТЕР ОФИСНЫХ ФАЙЛОВ + PDF ===
const converterBox = document.getElementById('converterBox');

if (converterBox) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        converterBox.addEventListener(eventName, function(e) {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        converterBox.addEventListener(eventName, function() {
            converterBox.classList.add('drag-over');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        converterBox.addEventListener(eventName, function() {
            converterBox.classList.remove('drag-over');
        }, false);
    });

    converterBox.addEventListener('drop', function(e) {
        const dt = e.dataTransfer;
        if (dt && dt.files && dt.files.length > 0) {
            handleSelectedFile(dt.files[0]);
        }
    }, false);
}

let processedBlob = null;
let processedOutName = "";
let processedPdfName = "";
let processedMimeType = "application/octet-stream";

function processFile(e) {
    const file = e.target.files[0];
    if (file) {
        handleSelectedFile(file);
    }
    e.target.value = "";
}

async function handleSelectedFile(file) {
    const fileInfo = document.getElementById('fileInfo');
    const saveBtn = document.getElementById('saveBtn');
    const savePdfBtn = document.getElementById('savePdfBtn');
    const pdfStage = document.getElementById('pdfRenderStage');

    if (!fileInfo || !saveBtn || !savePdfBtn || !pdfStage) return;

    saveBtn.style.display = 'none';
    savePdfBtn.style.display = 'none';
    processedBlob = null;
    pdfStage.innerHTML = "";

    const dotIndex = file.name.lastIndexOf('.');
    const baseName = (dotIndex !== -1) ? file.name.substring(0, dotIndex) : file.name;
    processedOutName = (dotIndex !== -1)
        ? baseName + "_yangi" + file.name.substring(dotIndex)
        : "yangi_" + file.name;
    processedPdfName = baseName + "_yangi.pdf";

    const ext = file.name.split('.').pop().toLowerCase();
    fileInfo.style.color = "#3B82F6";
    fileInfo.innerText = "Konvertatsiya qilinmoqda: " + file.name + "...";

    try {
        if (ext === 'txt') {
            const text = await file.text();
            const converted = applyReplacements(text);
            processedMimeType = "text/plain;charset=utf-8";
            processedBlob = new Blob([converted], { type: processedMimeType });

            const txtDiv = document.createElement('div');
            txtDiv.className = "pdf-page-section";
            txtDiv.dataset.orientation = "portrait";
            txtDiv.style.cssText = "width: 595.3pt; min-height: 841.9pt; padding: 42pt 48pt; background: #FFFFFF; white-space: pre-wrap; font-family: 'Manrope', Arial, sans-serif; font-size: 12pt; line-height: 1.6; color: #0F172A;";
            txtDiv.textContent = converted;
            pdfStage.appendChild(txtDiv);

        } else if (ext === 'docx' || ext === 'xlsx' || ext === 'pptx') {
            const arrayBuffer = await file.arrayBuffer();
            const zip = await JSZip.loadAsync(arrayBuffer);
            const tasks = [];

            zip.forEach((relativePath, zipEntry) => {
                if (relativePath.endsWith('.xml') && !relativePath.startsWith('word/embeddings/') && !relativePath.startsWith('ppt/embeddings/')) {
                    tasks.push(
                        zipEntry.async("string").then(xmlContent => {
                            let normalizedXml = xmlContent
                                .replace(/(<[a-zA-Z0-9]+:t[^>]*>[^<]*?[SsCc])(<\/[a-zA-Z0-9]+:t>[\s\S]*?<[a-zA-Z0-9]+:t[^>]*>)([Hh])/g, "$1$3$2")
                                .replace(/(<[a-zA-Z0-9]+:t[^>]*>[^<]*?[OoGg])(<\/[a-zA-Z0-9]+:t>[\s\S]*?<[a-zA-Z0-9]+:t[^>]*>)(['`\u02BB\u2018\u2019\u02BC])/g, "$1$3$2");

                            const updatedXml = normalizedXml.replace(/>([^<]+)</g, function(match, textContent) {
                                return '>' + applyReplacements(textContent) + '<';
                            });
                            zip.file(relativePath, updatedXml);
                        })
                    );
                }
            });

            await Promise.all(tasks);

            processedMimeType = "application/octet-stream";
            if (ext === 'docx') processedMimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            if (ext === 'xlsx') processedMimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            if (ext === 'pptx') processedMimeType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

            processedBlob = await zip.generateAsync({
                type: "blob",
                mimeType: processedMimeType,
                compression: "DEFLATE"
            });

            await prepareOfficePdfStage(ext, processedBlob, zip, pdfStage);
        } else {
            fileInfo.style.color = "#E11D48";
            fileInfo.innerText = "Faqat .docx, .xlsx, .pptx yoki .txt fayllarni tanlang";
            return;
        }

        fileInfo.style.color = "#10B981";
        fileInfo.innerText = "Tayyor: " + processedOutName;
        saveBtn.style.display = 'inline-flex';
        savePdfBtn.style.display = 'inline-flex';
    } catch (err) {
        fileInfo.style.color = "#E11D48";
        fileInfo.innerText = "Xatolik yuz berdi: " + err.message;
    }
}

async function extractDocxSectionSpecs(zip) {
    const specs = [];
    try {
        const docXmlFile = zip.file("word/document.xml");
        if (!docXmlFile) return specs;
        const xmlStr = await docXmlFile.async("string");
        const xmlDoc = new DOMParser().parseFromString(xmlStr, "application/xml");
        const sectPrList = xmlDoc.getElementsByTagName("w:sectPr");

        for (let i = 0; i < sectPrList.length; i++) {
            const sect = sectPrList[i];
            const pgSz = sect.getElementsByTagName("w:pgSz")[0];
            let wPt = 595.3;
            let hPt = 841.9;
            let isLandscape = false;

            if (pgSz) {
                const wAttr = parseInt(pgSz.getAttribute("w:w") || "11906", 10);
                const hAttr = parseInt(pgSz.getAttribute("w:h") || "16838", 10);
                const orientAttr = (pgSz.getAttribute("w:orient") || "").toLowerCase();

                wPt = wAttr / 20;
                hPt = hAttr / 20;

                if (orientAttr === "landscape" || wPt > hPt) {
                    isLandscape = true;
                    if (wPt < hPt) {
                        const tmp = wPt;
                        wPt = hPt;
                        hPt = tmp;
                    }
                }
            }
            specs.push({ wPt, hPt, isLandscape });
        }
    } catch (_) {}
    return specs;
}

async function prepareOfficePdfStage(ext, blob, zip, stage) {
    stage.innerHTML = "";
    if (ext === 'docx' && window.docx) {
        const xmlSpecs = await extractDocxSectionSpecs(zip);

        await window.docx.renderAsync(blob, stage, null, {
            className: "docx",
            inWrapper: false,
            ignoreWidth: false,
            ignoreHeight: false,
            ignoreFonts: false,
            breakPages: true,
            useBase64URL: true
        });

        const renderedSections = stage.querySelectorAll("section.docx");
        renderedSections.forEach((sec, idx) => {
            let styleW = parseFloat(sec.style.width) || 0;
            let styleH = parseFloat(sec.style.minHeight || sec.style.height) || 0;
            const spec = xmlSpecs[Math.min(idx, xmlSpecs.length - 1)];

            if ((!styleW || !styleH) && spec) {
                styleW = spec.wPt;
                styleH = spec.hPt;
                sec.style.width = styleW + "pt";
                sec.style.minHeight = styleH + "pt";
            } else if (spec && spec.isLandscape && styleW < styleH) {
                styleW = spec.wPt;
                styleH = spec.hPt;
                sec.style.width = styleW + "pt";
                sec.style.minHeight = styleH + "pt";
            }

            const isLand = (styleW > styleH) || (spec && spec.isLandscape && styleW === styleH);
            sec.dataset.orientation = isLand ? "landscape" : "portrait";
            sec.dataset.widthPt = String(styleW || (isLand ? 841.9 : 595.3));
            sec.dataset.heightPt = String(styleH || (isLand ? 595.3 : 841.9));
        });

    } else if (ext === 'xlsx' && window.XLSX) {
        const ab = await blob.arrayBuffer();
        const wb = XLSX.read(ab, { type: 'array' });

        for (let idx = 0; idx < wb.SheetNames.length; idx++) {
            const sheetName = wb.SheetNames[idx];
            let isSheetLandscape = false;

            const sheetXmlFile = zip.file("xl/worksheets/sheet" + (idx + 1) + ".xml");
            if (sheetXmlFile) {
                const sheetXml = await sheetXmlFile.async("string");
                if (/orientation="landscape"/i.test(sheetXml)) {
                    isSheetLandscape = true;
                }
            }

            const sheetSec = document.createElement('div');
            sheetSec.className = "pdf-page-section xlsx-sheet-section";
            sheetSec.style.cssText = "padding: 28pt 32pt; background: #FFFFFF; font-family: 'Manrope', Arial, sans-serif;";

            const title = document.createElement('h3');
            title.style.cssText = "margin: 0 0 10px; font-size: 14pt; color: #0F172A;";
            title.textContent = sheetName;
            sheetSec.appendChild(title);

            const tableHolder = document.createElement('div');
            tableHolder.innerHTML = XLSX.utils.sheet_to_html(wb.Sheets[sheetName]);
            sheetSec.appendChild(tableHolder);

            stage.appendChild(sheetSec);

            const tbl = tableHolder.querySelector('table');
            if (tbl && tbl.scrollWidth > 720) {
                isSheetLandscape = true;
            }

            const wPt = isSheetLandscape ? 841.9 : 595.3;
            const hPt = isSheetLandscape ? 595.3 : 841.9;
            sheetSec.style.width = wPt + "pt";
            sheetSec.style.minHeight = hPt + "pt";
            sheetSec.dataset.orientation = isSheetLandscape ? "landscape" : "portrait";
            sheetSec.dataset.widthPt = String(wPt);
            sheetSec.dataset.heightPt = String(hPt);
        }

    } else if (ext === 'pptx') {
        let slideIsLandscape = true;
        const presXmlFile = zip.file("ppt/presentation.xml");
        if (presXmlFile) {
            const presXml = await presXmlFile.async("string");
            const sldSzMatch = presXml.match(/<p:sldSz[^>]*cx="(\d+)"[^>]*cy="(\d+)"/i);
            if (sldSzMatch) {
                const cx = parseInt(sldSzMatch[1], 10);
                const cy = parseInt(sldSzMatch[2], 10);
                slideIsLandscape = (cx >= cy);
            }
        }

        const slideFiles = Object.keys(zip.files)
            .filter(p => /^ppt\/slides\/slide\d+\.xml$/i.test(p))
            .sort((a, b) => {
                const na = parseInt(a.match(/\d+/)[0], 10);
                const nb = parseInt(b.match(/\d+/)[0], 10);
                return na - nb;
            });

        const wPt = slideIsLandscape ? 841.9 : 595.3;
        const hPt = slideIsLandscape ? 595.3 : 841.9;

        for (let i = 0; i < slideFiles.length; i++) {
            const xmlStr = await zip.file(slideFiles[i]).async("string");
            const xmlDoc = new DOMParser().parseFromString(xmlStr, "application/xml");
            const slideCard = document.createElement('div');
            slideCard.className = "pdf-page-section pptx-slide-card";
            slideCard.style.width = wPt + "pt";
            slideCard.style.minHeight = hPt + "pt";
            slideCard.dataset.orientation = slideIsLandscape ? "landscape" : "portrait";
            slideCard.dataset.widthPt = String(wPt);
            slideCard.dataset.heightPt = String(hPt);

            const slideHeader = document.createElement('div');
            slideHeader.className = "pptx-slide-title";
            slideHeader.textContent = "Slayd " + (i + 1);
            slideCard.appendChild(slideHeader);

            const paragraphs = xmlDoc.getElementsByTagName("a:p");
            for (let p = 0; p < paragraphs.length; p++) {
                const texts = paragraphs[p].getElementsByTagName("a:t");
                let line = "";
                for (let t = 0; t < texts.length; t++) {
                    line += texts[t].textContent;
                }
                if (line.trim()) {
                    const pEl = document.createElement('p');
                    pEl.className = "pptx-slide-p";
                    pEl.textContent = line;
                    slideCard.appendChild(pEl);
                }
            }
            stage.appendChild(slideCard);
        }
    }
}

function downloadFile() {
    if (!processedBlob) return;
    const url = URL.createObjectURL(processedBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = processedOutName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function findSafeSliceY(ctx, canvasWidth, targetY, minSearchY) {
    const scanHeight = Math.max(10, targetY - minSearchY);
    try {
        const imgData = ctx.getImageData(0, minSearchY, canvasWidth, scanHeight).data;
        for (let row = scanHeight - 1; row >= 0; row--) {
            let isRowBlank = true;
            const rowOffset = row * canvasWidth * 4;
            for (let x = 16; x < canvasWidth - 16; x += 4) {
                const idx = rowOffset + x * 4;
                const r = imgData[idx];
                const g = imgData[idx + 1];
                const b = imgData[idx + 2];
                const a = imgData[idx + 3];
                if (a > 10 && (r < 245 || g < 245 || b < 245)) {
                    isRowBlank = false;
                    break;
                }
            }
            if (isRowBlank) {
                return minSearchY + row;
            }
        }
    } catch (_) {}
    return targetY;
}

async function downloadPdfFile() {
    const stage = document.getElementById('pdfRenderStage');
    const savePdfBtn = document.getElementById('savePdfBtn');
    const fileInfo = document.getElementById('fileInfo');
    if (!stage || !stage.innerHTML.trim() || !savePdfBtn || !fileInfo) return;

    const originalBtnHtml = savePdfBtn.innerHTML;
    savePdfBtn.disabled = true;
    fileInfo.style.color = "#3B82F6";
    fileInfo.innerText = "PDF tayyorlanmoqda: " + processedPdfName + "...";

    try {
        const { jsPDF } = window.jspdf;
        let sectionNodes = Array.from(stage.querySelectorAll("section.docx, .pdf-page-section"));
        if (sectionNodes.length === 0) {
            sectionNodes = [stage];
        }

        let pdf = null;
        const PT_TO_MM = 25.4 / 72;

        for (let i = 0; i < sectionNodes.length; i++) {
            const sec = sectionNodes[i];

            let wPt = parseFloat(sec.dataset.widthPt) || parseFloat(sec.style.width) || 0;
            let hPt = parseFloat(sec.dataset.heightPt) || parseFloat(sec.style.minHeight || sec.style.height) || 0;

            if (!wPt || !hPt) {
                const isLandFallback = sec.offsetWidth > sec.offsetHeight;
                wPt = isLandFallback ? 841.9 : 595.3;
                hPt = isLandFallback ? 595.3 : 841.9;
            }

            const isLandscape = (sec.dataset.orientation === "landscape") || (wPt > hPt);
            const pageOrient = isLandscape ? "l" : "p";
            const pageWidthMm = +(wPt * PT_TO_MM).toFixed(2);
            const pageHeightMm = +(hPt * PT_TO_MM).toFixed(2);

            const canvas = await html2canvas(sec, {
                scale: 2,
                useCORS: true,
                backgroundColor: "#FFFFFF",
                logging: false
            });

            const onePageCanvasHeight = Math.round(canvas.width * (pageHeightMm / pageWidthMm));

            if (canvas.height <= onePageCanvasHeight * 1.04) {
                if (!pdf) {
                    pdf = new jsPDF({
                        orientation: pageOrient,
                        unit: "mm",
                        format: [pageWidthMm, pageHeightMm],
                        compress: true
                    });
                } else {
                    pdf.addPage([pageWidthMm, pageHeightMm], pageOrient);
                }

                const imgData = canvas.toDataURL("image/jpeg", 0.96);
                const renderedHeightMm = Math.min(pageHeightMm, (canvas.height / canvas.width) * pageWidthMm);
                pdf.addImage(imgData, "JPEG", 0, 0, pageWidthMm, renderedHeightMm, undefined, "FAST");
            } else {
                const ctx = canvas.getContext("2d");
                const topMarginMm = 12;
                const marginCanvasPx = Math.round((topMarginMm / pageHeightMm) * onePageCanvasHeight);

                let currentY = 0;
                let isFirstSliceOfSec = true;

                while (currentY < canvas.height - 16) {
                    const maxSliceHeight = isFirstSliceOfSec
                        ? (onePageCanvasHeight - marginCanvasPx)
                        : (onePageCanvasHeight - marginCanvasPx * 2);

                    let targetEndY = currentY + maxSliceHeight;

                    if (targetEndY >= canvas.height - 16) {
                        targetEndY = canvas.height;
                    } else {
                        const minSearchY = Math.max(currentY + Math.floor(maxSliceHeight * 0.75), targetEndY - 140);
                        targetEndY = findSafeSliceY(ctx, canvas.width, targetEndY, minSearchY);
                    }

                    const sliceHeight = targetEndY - currentY;
                    if (sliceHeight <= 0) break;

                    const sliceCanvas = document.createElement("canvas");
                    sliceCanvas.width = canvas.width;
                    sliceCanvas.height = sliceHeight;
                    const sliceCtx = sliceCanvas.getContext("2d");
                    sliceCtx.fillStyle = "#FFFFFF";
                    sliceCtx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
                    sliceCtx.drawImage(canvas, 0, currentY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

                    if (!pdf) {
                        pdf = new jsPDF({
                            orientation: pageOrient,
                            unit: "mm",
                            format: [pageWidthMm, pageHeightMm],
                            compress: true
                        });
                    } else {
                        pdf.addPage([pageWidthMm, pageHeightMm], pageOrient);
                    }

                    const sliceImg = sliceCanvas.toDataURL("image/jpeg", 0.96);
                    const sliceHeightMm = (sliceHeight / canvas.width) * pageWidthMm;
                    const offsetTopMm = isFirstSliceOfSec ? 0 : topMarginMm;

                    pdf.addImage(sliceImg, "JPEG", 0, offsetTopMm, pageWidthMm, sliceHeightMm, undefined, "FAST");

                    currentY = targetEndY;
                    isFirstSliceOfSec = false;
                }
            }
        }

        if (pdf) {
            pdf.save(processedPdfName);
            fileInfo.style.color = "#10B981";
            fileInfo.innerText = "Tayyor: " + processedPdfName;
        }
    } catch (err) {
        fileInfo.style.color = "#E11D48";
        fileInfo.innerText = "PDF xatolik: " + err.message;
    } finally {
        savePdfBtn.disabled = false;
        savePdfBtn.innerHTML = originalBtnHtml;
    }
}

// === 4. СКРИПТ ВЕРХНЕГО МЕНЮ И ПОГОДЫ (ACCUWEATHER + LIVE METEO) ===
const ACCUWEATHER_API_KEY = "";

const UZ_REGIONS = [
    { id: "samarqand", name: "Samarqand", lat: 39.6542, lon: 66.9597, accuKey: "355776", accuSlug: "samarkand", temp: 18, type: "partly", cond: "Bulutli" },
    { id: "toshkent_sh", name: "Toşkent ş.", lat: 41.2995, lon: 69.2401, accuKey: "351199", accuSlug: "tashkent", temp: 19, type: "cloudy", cond: "Bulutli" },
    { id: "qoraqalpogiston", name: "Qoraqalpoğiston", lat: 42.4619, lon: 59.6166, accuKey: "355666", accuSlug: "nukus", temp: 7, type: "sunny", cond: "Oçiq" },
    { id: "andijon", name: "Andijon", lat: 40.7821, lon: 72.3442, accuKey: "351828", accuSlug: "andijan", temp: 17, type: "sunny", cond: "Oçiq" },
    { id: "fargona", name: "Farğona", lat: 40.3842, lon: 71.7843, accuKey: "353238", accuSlug: "fergana", temp: 18, type: "sunny", cond: "Oçiq" },
    { id: "namangan", name: "Namangan", lat: 40.9983, lon: 71.6726, accuKey: "355095", accuSlug: "namangan", temp: 16, type: "sunny", cond: "Oçiq" },
    { id: "buxoro", name: "Buxoro", lat: 39.7747, lon: 64.4286, accuKey: "352479", accuSlug: "bukhara", temp: 18, type: "sunny", cond: "Oçiq" },
    { id: "xorazm", name: "Xorazm", lat: 41.5500, lon: 60.6333, accuKey: "356378", accuSlug: "urgench", temp: 10, type: "sunny", cond: "Oçiq" },
    { id: "surxondaryo", name: "Surxondaryo", lat: 37.2242, lon: 67.2783, accuKey: "356042", accuSlug: "termez", temp: 19, type: "cloudy", cond: "Bulutli" },
    { id: "qashqadaryo", name: "Qaşqadaryo", lat: 38.8606, lon: 65.7891, accuKey: "350541", accuSlug: "karshi", temp: 18, type: "cloudy", cond: "Bulutli" },
    { id: "jizzax", name: "Jizzax", lat: 40.1158, lon: 67.8422, accuKey: "348390", accuSlug: "jizzakh", temp: 17, type: "sunny", cond: "Oçiq" },
    { id: "sirdaryo", name: "Sirdaryo", lat: 40.4897, lon: 68.7842, accuKey: "355934", accuSlug: "gulistan", temp: 19, type: "sunny", cond: "Oçiq" },
    { id: "toshkent_vil", name: "Toşkent viloyati", lat: 41.0422, lon: 69.3567, accuKey: "351199", accuSlug: "tashkent", temp: 19, type: "cloudy", cond: "Bulutli" },
    { id: "navoiy", name: "Navoiy", lat: 40.0844, lon: 65.3792, accuKey: "355115", accuSlug: "navoiy", temp: 19, type: "sunny", cond: "Oçiq" }
];

let selectedRegionId = "samarqand";

function getWeatherSvg(type, size = 34) {
    if (type === "sunny") {
        return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`;
    }
    if (type === "cloudy") {
        return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>`;
    }
    if (type === "rain") {
        return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 13v8"/><path d="M8 13v8"/><path d="M12 15v8"/><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/></svg>`;
    }
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="M20 12h2"/><path d="m19.07 4.93-1.41 1.41"/><path d="M15.947 12.65a4 4 0 0 0-5.925-4.128"/><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"/></svg>`;
}

function mapWmoCodeToUzbek(code) {
    if (code === 0) return { type: "sunny", cond: "Oçiq" };
    if (code === 1 || code === 2) return { type: "partly", cond: "Bulutli" };
    if (code === 3 || code === 45 || code === 48) return { type: "cloudy", cond: "Bulutli" };
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return { type: "rain", cond: "Yomğirli" };
    if (code >= 71 && code <= 77) return { type: "cloudy", cond: "Qorli" };
    if (code >= 95) return { type: "rain", cond: "Momaqaldiroq" };
    return { type: "partly", cond: "Bulutli" };
}

function getAccuWeatherUrl(reg) {
    return `https://www.accuweather.com/uz/uz/${reg.accuSlug}/${reg.accuKey}/weather-forecast/${reg.accuKey}`;
}

function renderWeatherUI() {
    try {
        const current = UZ_REGIONS.find(r => r.id === selectedRegionId) || UZ_REGIONS[0];
        const accuUrl = getAccuWeatherUrl(current);

        const miniCityName = document.getElementById('miniCityName');
        const miniTempVal = document.getElementById('miniTempVal');
        const miniCondText = document.getElementById('miniCondText');
        const miniWeatherIcon = document.getElementById('miniWeatherIcon');
        const miniAccuLink = document.getElementById('miniAccuLink');

        if (miniCityName) miniCityName.textContent = current.name;
        if (miniTempVal) miniTempVal.textContent = current.temp + "°";
        if (miniCondText) miniCondText.textContent = current.cond;
        if (miniWeatherIcon) miniWeatherIcon.innerHTML = getWeatherSvg(current.type, 34);
        if (miniAccuLink) miniAccuLink.href = accuUrl;

        const modalSelectedCity = document.getElementById('modalSelectedCity');
        const modalSelectedTemp = document.getElementById('modalSelectedTemp');
        const modalSelectedCondText = document.getElementById('modalSelectedCondText');
        const modalSelectedIcon = document.getElementById('modalSelectedIcon');
        const modalBannerDecor = document.getElementById('modalBannerDecor');
        const modalAccuLink = document.getElementById('modalAccuLink');

        if (modalSelectedCity) modalSelectedCity.textContent = current.name;
        if (modalSelectedTemp) modalSelectedTemp.textContent = current.temp + "°";
        if (modalSelectedCondText) modalSelectedCondText.textContent = current.cond;
        if (modalSelectedIcon) modalSelectedIcon.innerHTML = getWeatherSvg(current.type, 18);
        if (modalBannerDecor) modalBannerDecor.innerHTML = getWeatherSvg(current.type, 110);
        if (modalAccuLink) modalAccuLink.href = accuUrl;

        const grid = document.getElementById('weatherCitiesGrid');
        if (grid) {
            grid.innerHTML = "";
            UZ_REGIONS.filter(r => r.id !== selectedRegionId).forEach(reg => {
                const btn = document.createElement('div');
                btn.className = "weather-city-item";
                btn.onclick = () => selectWeatherRegion(reg.id);
                btn.innerHTML = `
                    <div class="weather-city-item-left">
                        ${getWeatherSvg(reg.type, 20)}
                        <span class="weather-city-item-name">${reg.name}</span>
                    </div>
                    <div class="weather-city-item-temp">${reg.temp}°</div>
                `;
                grid.appendChild(btn);
            });
        }
    } catch (_) {}
}

function selectWeatherRegion(regionId) {
    selectedRegionId = regionId;
    renderWeatherUI();
    closeWeatherModal();
}

async function fetchAllRegionsWeather() {
    try {
        if (ACCUWEATHER_API_KEY) {
            const current = UZ_REGIONS.find(r => r.id === selectedRegionId) || UZ_REGIONS[0];
            const res = await fetch(`https://dataservice.accuweather.com/currentconditions/v1/${current.accuKey}?apikey=${ACCUWEATHER_API_KEY}&language=uz&metric=true`);
            if (res.ok) {
                const data = await res.json();
                if (data && data[0]) {
                    current.temp = Math.round(data[0].Temperature.Metric.Value);
                    renderWeatherUI();
                }
            }
        }
        const lats = UZ_REGIONS.map(r => r.lat).join(",");
        const lons = UZ_REGIONS.map(r => r.lon).join(",");
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,weather_code&timezone=auto`;
        const response = await fetch(url);
        if (!response.ok) return;
        const json = await response.json();
        const results = Array.isArray(json) ? json : [json];

        results.forEach((item, idx) => {
            if (item && item.current && UZ_REGIONS[idx]) {
                UZ_REGIONS[idx].temp = Math.round(item.current.temperature_2m);
                const mapped = mapWmoCodeToUzbek(item.current.weather_code);
                UZ_REGIONS[idx].type = mapped.type;
                UZ_REGIONS[idx].cond = mapped.cond;
            }
        });
        renderWeatherUI();
    } catch (_) {
        renderWeatherUI();
    }
}

function toggleNavDropdown(itemId, event) {
    if (event) event.stopPropagation();
    const target = document.getElementById(itemId);
    if (!target) return;
    const isOpen = target.classList.contains('open');

    document.querySelectorAll('.nav-item.has-dropdown').forEach(el => {
        el.classList.remove('open');
        const btn = el.querySelector('.nav-link-btn');
        if (btn) btn.setAttribute('aria-expanded', 'false');
    });

    if (!isOpen) {
        target.classList.add('open');
        const btn = target.querySelector('.nav-link-btn');
        if (btn) btn.setAttribute('aria-expanded', 'true');
    }
}

function openWeatherModal(event) {
    if (event) event.stopPropagation();
    document.querySelectorAll('.nav-item.has-dropdown').forEach(el => el.classList.remove('open'));
    const modal = document.getElementById('weatherModalBackdrop');
    if (modal) modal.classList.add('open');
}

function closeWeatherModal(event) {
    const modal = document.getElementById('weatherModalBackdrop');
    if (!modal) return;
    if (event && event.target && event.target !== modal) return;
    modal.classList.remove('open');
}

document.addEventListener('click', () => {
    document.querySelectorAll('.nav-item.has-dropdown').forEach(el => el.classList.remove('open'));
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeWeatherModal();
        document.querySelectorAll('.nav-item.has-dropdown').forEach(el => el.classList.remove('open'));
    }
});

// === 5. КУРСЫ ВАЛЮТ С NBU И ИНТЕРАКТИВНЫЙ КАЛЬКУЛЯТОР ВАЛЮТ ===
const CURRENCY_RATES = {
    USD: "12 100",
    EUR: "14 200",
    RUB: "150",
    CNY: "1 780"
};

// Числовые курсы по отношению к суму (UZS) для точных расчетов калькулятора
const CURRENCY_NUMERIC = {
    UZS: 1,
    USD: 12100,
    EUR: 14200,
    RUB: 150,
    CNY: 1780
};

const CURRENCY_META = [
    { code: "UZS", symbol: "Söm", name: "Özbek sömi" },
    { code: "USD", symbol: "$", name: "AQŞ dollari" },
    { code: "EUR", symbol: "€", name: "Yevro" },
    { code: "RUB", symbol: "₽", name: "Rossiya rubli" },
    { code: "CNY", symbol: "¥", name: "Xitoy yuani" }
];

let calcBaseCurrency = "USD";

function parseRateNumber(raw) {
    const val = parseFloat(String(raw).replace(/[^\d.,]/g, "").replace(",", "."));
    return (!isNaN(val) && val > 0) ? val : null;
}

function formatUzPrice(num) {
    const val = parseRateNumber(num);
    if (!val) return null;
    return Math.round(val).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function formatCalcResultNumber(val, code) {
    if (!isFinite(val) || val === 0) return "0";
    if (code === "UZS") {
        return Math.round(val).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    }
    if (val >= 100) {
        return val.toFixed(2).replace(/\.00$/, "").replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    }
    return val.toFixed(2).replace(/\.00$/, "");
}

function updateCurrencyDOM() {
    ["USD", "EUR", "RUB", "CNY"].forEach(code => {
        const el = document.getElementById("rate" + code);
        if (el && CURRENCY_RATES[code]) {
            el.textContent = CURRENCY_RATES[code];
        }
    });
    renderCurrencyCalculator();
}

function renderQuickChips() {
    const chipsBox = document.getElementById("calcQuickChips");
    if (!chipsBox) return;

    const presets = (calcBaseCurrency === "UZS")
        ? [
            { label: "100 ming", val: 100000 },
            { label: "500 ming", val: 500000 },
            { label: "1 mln", val: 1000000 },
            { label: "5 mln", val: 5000000 },
            { label: "10 mln", val: 10000000 }
        ]
        : [
            { label: "10", val: 10 },
            { label: "50", val: 50 },
            { label: "100", val: 100 },
            { label: "150", val: 150 },
            { label: "500", val: 500 },
            { label: "1 000", val: 1000 }
        ];

    chipsBox.innerHTML = "";
    presets.forEach(item => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "calc-chip-btn";
        btn.textContent = item.label;
        btn.onclick = () => setCalcQuickAmount(item.val);
        chipsBox.appendChild(btn);
    });
}

function setCalcQuickAmount(amount) {
    const input = document.getElementById("calcAmountInput");
    if (!input) return;
    input.value = amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    renderCurrencyCalculator();
}

function selectCalcBaseCurrency(code) {
    calcBaseCurrency = code;
    const selectEl = document.getElementById("calcBaseSelect");
    if (selectEl && selectEl.value !== code) {
        selectEl.value = code;
    }

    document.querySelectorAll(".calc-curr-tab").forEach(btn => {
        btn.classList.toggle("active", btn.getAttribute("data-curr") === code);
    });

    const input = document.getElementById("calcAmountInput");
    if (input) {
        const rawVal = parseRateNumber(input.value) || 0;
        if (code === "UZS" && rawVal <= 1000) {
            input.value = "1 000 000";
        } else if (code !== "UZS" && rawVal >= 100000) {
            input.value = "100";
        }
    }

    renderQuickChips();
    renderCurrencyCalculator();
}

function renderCurrencyCalculator() {
    const input = document.getElementById("calcAmountInput");
    const grid = document.getElementById("calcResultsGrid");
    if (!input || !grid) return;

    const cleanStr = input.value.replace(/\s+/g, "").replace(",", ".");
    const amount = parseFloat(cleanStr) || 0;
    const baseRateToUzs = CURRENCY_NUMERIC[calcBaseCurrency] || 1;
    const totalInUzs = amount * baseRateToUzs;

    grid.innerHTML = "";

    // Сортируем так, чтобы UZS всегда был главной широкой карточкой сверху
    const orderedMeta = [
        CURRENCY_META[0], // UZS
        ...CURRENCY_META.slice(1)
    ];

    orderedMeta.forEach(item => {
        const targetRate = CURRENCY_NUMERIC[item.code] || 1;
        const convertedVal = totalInUzs / targetRate;
        const formattedVal = formatCalcResultNumber(convertedVal, item.code);
        const displayWithUnit = item.code === "UZS"
            ? `${formattedVal} söm`
            : `${formattedVal} ${item.symbol}`;

        const card = document.createElement("div");
        card.className = "calc-result-card" + (item.code === "UZS" ? " uzs-main-card" : "");
        card.onclick = () => copyCalcValue(formattedVal, card, displayWithUnit);

        const subRateHint = item.code === "UZS"
            ? `1 ${calcBaseCurrency} = ${formatUzPrice(baseRateToUzs) || 1} söm`
            : `${item.name} (1 ${item.code} = ${CURRENCY_RATES[item.code]} söm)`;

        card.innerHTML = `
            <div class="calc-result-left">
                <span class="calc-result-icon">${item.symbol}</span>
                <div class="calc-result-meta">
                    <span class="calc-result-code">${item.code}</span>
                    <span class="calc-result-name">${subRateHint}</span>
                </div>
            </div>
            <div class="calc-result-value" data-orig="${displayWithUnit}">${displayWithUnit}</div>
        `;
        grid.appendChild(card);
    });
}

function copyCalcValue(valToCopy, cardEl, originalText) {
    const valNode = cardEl.querySelector(".calc-result-value");
    if (!navigator.clipboard || !valNode) return;

    navigator.clipboard.writeText(valToCopy).then(() => {
        valNode.textContent = "Nusxalandi ✓";
        valNode.style.color = "#10B981";
        setTimeout(() => {
            valNode.textContent = originalText;
            valNode.style.color = "";
        }, 900);
    }).catch(() => {});
}

function openCurrencyModal(event) {
    if (event) event.stopPropagation();
    document.querySelectorAll('.nav-item.has-dropdown').forEach(el => el.classList.remove('open'));
    const modal = document.getElementById('currencyModalBackdrop');
    if (modal) {
        modal.classList.add('open');
        renderQuickChips();
        renderCurrencyCalculator();
    }
}

function closeCurrencyModal(event) {
    const modal = document.getElementById('currencyModalBackdrop');
    if (!modal) return;
    if (event && event.target && event.target !== modal) return;
    modal.classList.remove('open');
}

// Привязка событий к полю ввода и селекту внутри калькулятора
const calcInputEl = document.getElementById("calcAmountInput");
if (calcInputEl) {
    calcInputEl.addEventListener("input", function() {
        renderCurrencyCalculator();
    });
}

const calcSelectEl = document.getElementById("calcBaseSelect");
if (calcSelectEl) {
    calcSelectEl.addEventListener("change", function() {
        selectCalcBaseCurrency(this.value);
    });
}

// Закрытие калькулятора по клавише Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeCurrencyModal();
    }
});

async function fetchNbuCurrencyRates() {
    const targetCodes = ["USD", "EUR", "RUB", "CNY"];

    // 1. Быстрая загрузка актуальных курсов по прямому каналу с поддержкой CORS
    try {
        const cbuRes = await fetch("https://cbu.uz/uz/arkhiv-kursov-valyut/json/");
        if (cbuRes.ok) {
            const cbuData = await cbuRes.json();
            cbuData.forEach(item => {
                if (targetCodes.includes(item.Ccy)) {
                    const num = parseRateNumber(item.Rate);
                    if (num) {
                        CURRENCY_NUMERIC[item.Ccy] = num;
                        CURRENCY_RATES[item.Ccy] = formatUzPrice(num);
                    }
                }
            });
            updateCurrencyDOM();
        }
    } catch (_) {}

    // 2. Уточнение коммерческих курсов с NBU.uz
    const nbuUrls = [
        "https://nbu.uz/uz/exchange-rates/json/",
        "https://api.allorigins.win/raw?url=" + encodeURIComponent("https://nbu.uz/uz/exchange-rates/json/"),
        "https://api.allorigins.win/raw?url=" + encodeURIComponent("https://nbu.uz/jismoniy-shaxslar-valyutalar-kursi")
    ];

    for (const url of nbuUrls) {
        try {
            const res = await fetch(url);
            if (!res.ok) continue;
            const text = await res.text();

            if (text.trim().startsWith("[")) {
                const data = JSON.parse(text);
                let updatedCount = 0;
                data.forEach(item => {
                    if (targetCodes.includes(item.code)) {
                        const rawRate = item.nbu_cell_price || item.nbu_buy_price || item.cb_price;
                        const num = parseRateNumber(rawRate);
                        if (num) {
                            CURRENCY_NUMERIC[item.code] = num;
                            CURRENCY_RATES[item.code] = formatUzPrice(num);
                            updatedCount++;
                        }
                    }
                });
                if (updatedCount > 0) {
                    updateCurrencyDOM();
                    return;
                }
            } else {
                let updatedCount = 0;
                targetCodes.forEach(code => {
                    const regex = new RegExp(code + "[\\s\\S]{0,220}?(\\d[\\d\\s]{1,7}(?:[.,]\\d+)?)", "i");
                    const match = text.match(regex);
                    if (match && match[1]) {
                        const num = parseRateNumber(match[1]);
                        if (num) {
                            CURRENCY_NUMERIC[code] = num;
                            CURRENCY_RATES[code] = formatUzPrice(num);
                            updatedCount++;
                        }
                    }
                });
                if (updatedCount >= 2) {
                    updateCurrencyDOM();
                    return;
                }
            }
        } catch (_) {}
    }
}

renderWeatherUI();
fetchAllRegionsWeather();
renderQuickChips();
updateCurrencyDOM();
fetchNbuCurrencyRates();

// === 6. ГЕНЕРАТОР QR-КОДОВ (PNG 1024x1024 + ВЕКТОРНЫЙ SVG) ===
let currentQrColor = "#3f51b5";
let currentQrMatrix = null;

function buildQrMatrix(text) {
    if (typeof qrcode !== "function") return null;
    try {
        // Поддержка UTF-8 для узбекского и кириллического текста
        const utf8Text = unescape(encodeURIComponent(text));
        const qr = qrcode(0, "M");
        qr.addData(utf8Text);
        qr.make();
        return qr;
    } catch (_) {
        return null;
    }
}

function generateQrSvgMarkup(qr, fgColor, sizePx) {
    const count = qr.getModuleCount();
    const margin = 2; // Белая рамка вокруг QR-кода по стандарту
    const total = count + margin * 2;
    let pathData = "";

    for (let r = 0; r < count; r++) {
        for (let c = 0; c < count; c++) {
            if (qr.isDark(r, c)) {
                pathData += `M${c + margin},${r + margin}h1v1h-1z `;
            }
        }
    }

    const sizeAttr = sizePx ? `width="${sizePx}" height="${sizePx}"` : `width="100%" height="100%"`;
    return `<svg xmlns="http://www.w3.org/2000/svg" ${sizeAttr} viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges">
        <rect width="${total}" height="${total}" fill="#FFFFFF" rx="1.5"/>
        <path d="${pathData.trim()}" fill="${fgColor}"/>
    </svg>`;
}

function renderQrCodePreview() {
    const input = document.getElementById("qrTextInput");
    const box = document.getElementById("qrPreviewBox");
    const caption = document.getElementById("qrStatusCaption");
    if (!input || !box) return;

    const rawText = input.value.trim() || "https://ulh-online.uz/";
    const qr = buildQrMatrix(rawText);
    currentQrMatrix = qr;

    if (!qr) {
        box.innerHTML = `<span style="font-size:12px;color:#E11D48;text-align:center;">Matn juda uzun yoki xatolik yuz berdi</span>`;
        return;
    }

    box.innerHTML = generateQrSvgMarkup(qr, currentQrColor, null);
    if (caption) {
        caption.style.color = "#64748B";
        caption.textContent = "Yuqori sifatli: 1024×1024 px (PNG) va vektorli (SVG)";
    }
}

function selectQrColor(colorHex) {
    currentQrColor = colorHex;
    document.querySelectorAll(".qr-color-dot").forEach(btn => {
        btn.classList.toggle("active", btn.getAttribute("data-color") === colorHex);
    });
    renderQrCodePreview();
}

function clearQrInput() {
    const input = document.getElementById("qrTextInput");
    if (!input) return;
    input.value = "";
    input.focus();
    renderQrCodePreview();
}

function getSafeQrFileName(ext) {
    const input = document.getElementById("qrTextInput");
    let raw = (input && input.value.trim()) ? input.value.trim() : "ulh-online";
    raw = raw.replace(/^https?:\/\//i, "").replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 24);
    return `qr_${raw || "code"}.${ext}`;
}

function downloadQrSvg() {
    if (!currentQrMatrix) renderQrCodePreview();
    if (!currentQrMatrix) return;

    const svgString = generateQrSvgMarkup(currentQrMatrix, currentQrColor, 1024);
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = getSafeQrFileName("svg");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);

    const caption = document.getElementById("qrStatusCaption");
    if (caption) {
        caption.style.color = "#10B981";
        caption.textContent = "SVG vektorli fayl yuklab olindi ✓";
    }
}

function downloadQrPng() {
    if (!currentQrMatrix) renderQrCodePreview();
    if (!currentQrMatrix) return;

    const count = currentQrMatrix.getModuleCount();
    const margin = 2;
    const totalModules = count + margin * 2;
    const canvasSize = 1024;
    const scale = canvasSize / totalModules;

    const canvas = document.createElement("canvas");
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    const ctx = canvas.getContext("2d");

    // Белый фон
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // Четкая отрисовка каждого модуля QR-кода
    ctx.fillStyle = currentQrColor;
    for (let r = 0; r < count; r++) {
        for (let c = 0; c < count; c++) {
            if (currentQrMatrix.isDark(r, c)) {
                const x = Math.round((c + margin) * scale);
                const y = Math.round((r + margin) * scale);
                const w = Math.ceil((c + margin + 1) * scale) - x;
                const h = Math.ceil((r + margin + 1) * scale) - y;
                ctx.fillRect(x, y, w, h);
            }
        }
    }

    canvas.toBlob(blob => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = getSafeQrFileName("png");
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1500);

        const caption = document.getElementById("qrStatusCaption");
        if (caption) {
            caption.style.color = "#10B981";
            caption.textContent = "PNG (1024×1024 px) yuklab olindi ✓";
        }
    }, "image/png");
}

function openQrModal(event) {
    if (event) event.stopPropagation();
    document.querySelectorAll('.nav-item.has-dropdown').forEach(el => el.classList.remove('open'));
    const modal = document.getElementById('qrModalBackdrop');
    if (modal) {
        modal.classList.add('open');
        renderQrCodePreview();
        setTimeout(() => {
            const input = document.getElementById("qrTextInput");
            if (input) input.focus();
        }, 120);
    }
}

function closeQrModal(event) {
    const modal = document.getElementById('qrModalBackdrop');
    if (!modal) return;
    if (event && event.target && event.target !== modal) return;
    modal.classList.remove('open');
}

const qrInputEl = document.getElementById("qrTextInput");
if (qrInputEl) {
    qrInputEl.addEventListener("input", renderQrCodePreview);
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeQrModal();
    }
});

renderQrCodePreview();


// === 7. ПАМЯТКА-ШПАРГАЛКА ПО НОВОМУ АЛФАВИТУ И БЫСТРОЕ КОПИРОВАНИЕ БУКВ ===
function copySpecialChar(charStr, btnEl, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    if (!navigator.clipboard || !btnEl) return;

    navigator.clipboard.writeText(charStr).then(() => {
        const origText = btnEl.getAttribute("data-orig") || btnEl.textContent;
        btnEl.setAttribute("data-orig", origText);
        btnEl.textContent = "✓";
        btnEl.classList.add("copied-letter");

        const miniHint = document.getElementById("alphaMiniCopyHint");
        const modalHint = document.getElementById("alphaModalCopyHint");

        if (miniHint) {
            miniHint.style.color = "#10B981";
            miniHint.textContent = "«" + charStr + "» harfi nusxalandi ✓";
        }
        if (modalHint) {
            modalHint.style.color = "#10B981";
            modalHint.textContent = "«" + charStr + "» harfi buferga nusxalandi ✓";
        }

        setTimeout(() => {
            btnEl.textContent = origText;
            btnEl.classList.remove("copied-letter");
            if (miniHint) {
                miniHint.style.color = "";
                miniHint.textContent = "Harfni nusxalaş uçun ustiga bosing";
            }
            if (modalHint) {
                modalHint.style.color = "";
                modalHint.textContent = "Harfni nusxalaş uçun yuqoridagi tugmani bosing";
            }
        }, 900);
    }).catch(() => {});
}

function openAlphabetModal(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    document.querySelectorAll('.nav-item.has-dropdown').forEach(el => el.classList.remove('open'));
    const modal = document.getElementById('alphabetModalBackdrop');
    if (modal) {
        modal.classList.add('open');
    }
}

function closeAlphabetModal(event) {
    const modal = document.getElementById('alphabetModalBackdrop');
    if (!modal) return;
    if (event && event.target && event.target !== modal) return;
    modal.classList.remove('open');
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeAlphabetModal();
    }
});

// === 8. СЧЕТЧИК СИМВОЛОВ И МОДАЛЬНОЕ ОКНО СТАТИСТИКИ ТЕКСТА (MATN STATISTIKASI) ===
function formatStatNumber(num) {
    return Number(num || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function calculateAndRenderTextStats() {
    const editorEl = document.getElementById("editor");
    const text = editorEl ? editorEl.value : "";

    // 1. Belgilar (с пробелами и без пробелов)
    const charsWithSpaces = text.length;
    const charsNoSpaces = text.replace(/\s/g, "").length;

    // 2. Sözlar (количество слов)
    const trimmed = text.trim();
    const wordsCount = trimmed.length > 0 ? trimmed.split(/\s+/).length : 0;

    // 3. Satrlar va Abzatslar (строки и непустые абзацы)
    const linesCount = text.length > 0 ? text.split(/\r\n|\r|\n/).length : 0;
    const paragraphsCount = trimmed.length > 0
        ? trimmed.split(/(?:\r\n|\r|\n)+/).filter(line => line.trim().length > 0).length
        : 0;

    // 4. Öqiş vaqti (примерное время чтения из расчета ~180 слов в минуту)
    let readingTimeStr = "0 soniya";
    if (wordsCount > 0) {
        const totalSeconds = Math.max(1, Math.ceil((wordsCount / 180) * 60));
        if (totalSeconds < 60) {
            readingTimeStr = "~" + totalSeconds + " soniya";
        } else {
            const mins = Math.floor(totalSeconds / 60);
            const secs = totalSeconds % 60;
            readingTimeStr = secs > 0
                ? "~" + mins + " daq " + secs + " son."
                : "~" + mins + " daqiqa";
        }
    }

    // Обновляем счетчик на самой кнопке рядом с "Nusxa oliş"
    const liveBtnCount = document.getElementById("liveCharCount");
    if (liveBtnCount) {
        liveBtnCount.textContent = formatStatNumber(charsWithSpaces);
    }

    // Обновляем значения внутри модального окна
    const elWithSpaces = document.getElementById("statCharsWithSpaces");
    const elNoSpaces = document.getElementById("statCharsNoSpaces");
    const elCardChars = document.getElementById("statCardChars");
    const elWords = document.getElementById("statWords");
    const elLinesParas = document.getElementById("statLinesAndParas");
    const elReadTime = document.getElementById("statReadingTime");

    if (elWithSpaces) elWithSpaces.textContent = formatStatNumber(charsWithSpaces);
    if (elNoSpaces) elNoSpaces.textContent = formatStatNumber(charsNoSpaces);
    if (elCardChars) elCardChars.textContent = formatStatNumber(charsWithSpaces) + " / " + formatStatNumber(charsNoSpaces);
    if (elWords) elWords.textContent = formatStatNumber(wordsCount);
    if (elLinesParas) elLinesParas.textContent = formatStatNumber(linesCount) + " / " + formatStatNumber(paragraphsCount);
    if (elReadTime) elReadTime.textContent = readingTimeStr;
}

function openStatsModal(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    document.querySelectorAll('.nav-item.has-dropdown').forEach(el => el.classList.remove('open'));
    calculateAndRenderTextStats();
    const modal = document.getElementById('statsModalBackdrop');
    if (modal) {
        modal.classList.add('open');
    }
}

function closeStatsModal(event) {
    const modal = document.getElementById('statsModalBackdrop');
    if (!modal) return;
    if (event && event.target && event.target !== modal) return;
    modal.classList.remove('open');
}

// Автоматическое обновление счетчика при наборе, вставке, очистке и возврате букв
if (editor) {
    editor.addEventListener("input", calculateAndRenderTextStats);
    editor.addEventListener("keyup", calculateAndRenderTextStats);
    editor.addEventListener("paste", function() {
        setTimeout(calculateAndRenderTextStats, 0);
    });
}

const clearBtnForStats = document.getElementById("clearBtn");
if (clearBtnForStats) {
    clearBtnForStats.addEventListener("click", function() {
        setTimeout(calculateAndRenderTextStats, 0);
    });
}

if (tip) {
    tip.addEventListener("mousedown", function() {
        setTimeout(calculateAndRenderTextStats, 0);
    });
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeStatsModal();
    }
});

calculateAndRenderTextStats();

// === 9. УМНЫЙ СЛАЙДЕР БАННЕРОВ ПО РАСПИСАНИЮ (UTC+5 ТАШКЕНТ) И МОДАЛЬНОЕ ОКНО РЕКЛАМЫ ===
const BANNER_CONFIG = {
    main: {
        id: "main",
        src: "./header.png",
        alt: "Uzbek Latin Helper — Asosiy banner",
        action: "link",
        href: "https://ulh-online.uz/"
    },
    ads: {
        id: "ads",
        src: "./banner-ads.png",
        alt: "Saytda reklama joylaştiriş — Tariflar bilan tanişing",
        action: "modal"
    },
    holidays: [
        {
            id: "new_year",
            name: "Yangi yil bayrami",
            src: "./banner-newyear.png",
            // С 24 декабря (00:00) по 13 января (23:59) любого года
            check: (m, d) => (m === 12 && d >= 24) || (m === 1 && d <= 13)
        },
        {
            id: "defenders_day",
            name: "14-yanvar — Vatan himoyaçilari kuni",
            src: "./banner-14jan.png",
            // Только 14 января (00:00 - 23:59)
            check: (m, d) => (m === 1 && d === 14)
        },
        {
            id: "womens_day",
            name: "8-mart — Xalqaro xotin-qizlar kuni",
            src: "./banner-8march.png",
            // Только 8 марта (00:00 - 23:59)
            check: (m, d) => (m === 3 && d === 8)
        },
        {
            id: "navruz",
            name: "21-mart — Navröz bayrami",
            src: "./banner-navruz.png",
            // Только 21 марта (00:00 - 23:59)
            check: (m, d) => (m === 3 && d === 21)
        },
        {
            id: "memory_day",
            name: "9-may — Xotira va qadrlaş kuni",
            src: "./banner-9may.png",
            // Только 9 мая (00:00 - 23:59)
            check: (m, d) => (m === 5 && d === 9)
        },
        {
            id: "independence_day",
            name: "Mustaqillik bayrami",
            src: "./banner-mustaqillik.png",
            // С 30 августа (00:00) по 2 сентября (23:59) любого года
            check: (m, d) => (m === 8 && d >= 30) || (m === 9 && d <= 2)
        },
        {
            id: "teachers_day",
            name: "1-oktabr — Öqituvçi va murabbiylar kuni",
            src: "./banner-1oct.png",
            // Только 1 октября (00:00 - 23:59)
            check: (m, d) => (m === 10 && d === 1)
        },
        {
            id: "constitution_day",
            name: "8-dekabr — Özbekiston Respublikasi Konstitutsiyasi kuni",
            src: "./banner-8dec.png",
            // Только 8 декабря (00:00 - 23:59)
            check: (m, d) => (m === 12 && d === 8)
        }
    ]
};

// Получение точной даты по часовому поясу Ташкента (UTC+5 / GMT+5)
function getTashkentDateParts() {
    const tashkentTimeMs = Date.now() + (5 * 60 * 60 * 1000);
    const tzDate = new Date(tashkentTimeMs);
    return {
        year: tzDate.getUTCFullYear(),
        month: tzDate.getUTCMonth() + 1, // 1..12
        day: tzDate.getUTCDate(),        // 1..31
        hours: tzDate.getUTCHours(),     // 0..23
        minutes: tzDate.getUTCMinutes()  // 0..59
    };
}

function getActiveSlidesList() {
    const { month, day } = getTashkentDateParts();
    const activeHoliday = BANNER_CONFIG.holidays.find(h => h.check(month, day));

    if (activeHoliday) {
        // В праздничный период: 1) Праздничный баннер, 2) Рекламный баннер, 3) Основной баннер
        return [
            {
                id: activeHoliday.id,
                src: activeHoliday.src,
                alt: activeHoliday.name,
                action: "link",
                href: "https://ulh-online.uz/"
            },
            BANNER_CONFIG.ads,
            BANNER_CONFIG.main
        ];
    }

    // В обычные дни: 1) Основной баннер, 2) Рекламный баннер
    return [
        BANNER_CONFIG.main,
        BANNER_CONFIG.ads
    ];
}

let heroSlidesData = [];
let currentHeroIndex = 0;
let heroTimer = null;
const HERO_INTERVAL_MS = 7000; // 7 секунд

function initHeroSlider() {
    const track = document.getElementById("heroSliderTrack");
    const dotsBox = document.getElementById("heroSliderDots");
    const prevBtn = document.getElementById("heroPrevBtn");
    const nextBtn = document.getElementById("heroNextBtn");
    if (!track || !dotsBox) return;

    heroSlidesData = getActiveSlidesList();
    currentHeroIndex = 0;
    track.innerHTML = "";
    dotsBox.innerHTML = "";

    heroSlidesData.forEach((slide, idx) => {
        const slideEl = document.createElement(slide.action === "link" ? "a" : "div");
        slideEl.className = "hero-slide";
        if (slide.action === "link") {
            slideEl.href = slide.href || "/";
            slideEl.setAttribute("aria-label", slide.alt);
        } else if (slide.action === "modal") {
            slideEl.setAttribute("role", "button");
            slideEl.setAttribute("tabindex", "0");
            slideEl.setAttribute("aria-label", slide.alt);
            slideEl.onclick = (e) => openAdsModal(e);
            slideEl.onkeydown = (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openAdsModal(e);
                }
            };
        }

        const img = document.createElement("img");
        img.src = slide.src;
        img.alt = slide.alt;
        // Если картинка еще не загружена на хостинг, подставляем ./header.png, чтобы не было пустой рамки
        img.onerror = function() {
            if (this.src.indexOf("header.png") === -1) {
                this.src = "./header.png";
            }
        };

        slideEl.appendChild(img);
        track.appendChild(slideEl);

        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "hero-dot" + (idx === 0 ? " active" : "");
        dot.setAttribute("aria-label", "Slayd " + (idx + 1));
        dot.onclick = (e) => {
            e.stopPropagation();
            goToHeroSlide(idx);
            restartHeroAutoPlay();
        };
        dotsBox.appendChild(dot);
    });

    const showControls = heroSlidesData.length > 1;
    if (prevBtn) prevBtn.style.display = showControls ? "inline-flex" : "none";
    if (nextBtn) nextBtn.style.display = showControls ? "inline-flex" : "none";
    dotsBox.style.display = showControls ? "inline-flex" : "none";

    updateHeroSliderPosition();
    restartHeroAutoPlay();
}

function updateHeroSliderPosition() {
    const track = document.getElementById("heroSliderTrack");
    const dotsBox = document.getElementById("heroSliderDots");
    if (!track) return;

    track.style.transform = `translateX(-${currentHeroIndex * 100}%)`;

    if (dotsBox) {
        const dots = dotsBox.querySelectorAll(".hero-dot");
        dots.forEach((d, idx) => {
            d.classList.toggle("active", idx === currentHeroIndex);
        });
    }
}

function goToHeroSlide(index) {
    if (!heroSlidesData.length) return;
    currentHeroIndex = (index + heroSlidesData.length) % heroSlidesData.length;
    updateHeroSliderPosition();
}

function changeHeroSlide(step, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    goToHeroSlide(currentHeroIndex + step);
    restartHeroAutoPlay();
}

function startHeroAutoPlay() {
    stopHeroAutoPlay();
    if (heroSlidesData.length <= 1) return;
    heroTimer = setInterval(() => {
        goToHeroSlide(currentHeroIndex + 1);
    }, HERO_INTERVAL_MS);
}

function stopHeroAutoPlay() {
    if (heroTimer) {
        clearInterval(heroTimer);
        heroTimer = null;
    }
}

function restartHeroAutoPlay() {
    stopHeroAutoPlay();
    startHeroAutoPlay();
}

// Пауза при наведении мыши и поддержка свайпов на мобильных экранах
const heroSliderBox = document.getElementById("heroSlider");
if (heroSliderBox) {
    heroSliderBox.addEventListener("mouseenter", stopHeroAutoPlay);
    heroSliderBox.addEventListener("mouseleave", startHeroAutoPlay);

    let touchStartX = 0;
    heroSliderBox.addEventListener("touchstart", (e) => {
        if (e.touches && e.touches.length > 0) {
            touchStartX = e.touches[0].clientX;
        }
        stopHeroAutoPlay();
    }, { passive: true });

    heroSliderBox.addEventListener("touchend", (e) => {
        if (e.changedTouches && e.changedTouches.length > 0) {
            const diffX = e.changedTouches[0].clientX - touchStartX;
            if (Math.abs(diffX) > 40) {
                goToHeroSlide(diffX < 0 ? currentHeroIndex + 1 : currentHeroIndex - 1);
            }
        }
        startHeroAutoPlay();
    }, { passive: true });
}

// Модальное окно рекламных тарифов
function openAdsModal(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    document.querySelectorAll('.nav-item.has-dropdown').forEach(el => el.classList.remove('open'));
    const modal = document.getElementById('adsModalBackdrop');
    if (modal) {
        modal.classList.add('open');
        stopHeroAutoPlay();
    }
}

function closeAdsModal(event) {
    const modal = document.getElementById('adsModalBackdrop');
    if (!modal) return;
    if (event && event.target && event.target !== modal) return;
    modal.classList.remove('open');
    startHeroAutoPlay();
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeAdsModal();
    }
});

// Проверка смены суток по Ташкенту каждую минуту (чтобы в 00:00 баннеры переключились сами)
let lastCheckedDayKey = "";
setInterval(() => {
    const { month, day } = getTashkentDateParts();
    const key = `${month}-${day}`;
    if (lastCheckedDayKey && lastCheckedDayKey !== key) {
        initHeroSlider();
    }
    lastCheckedDayKey = key;
}, 60000);

initHeroSlider();

// === 10. ПЕРЕКЛЮЧАТЕЛЬ ТЁМНОЙ ТЕМЫ («TUN REJIMI» / DARK MODE) ===
const THEME_STORAGE_KEY = "ulh_theme_mode";

function applySavedTheme() {
    try {
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        const isDark = (savedTheme === "dark");
        document.body.classList.toggle("dark-mode", isDark);
        updateThemeButtonA11y(isDark);
    } catch (_) {}
}

function updateThemeButtonA11y(isDark) {
    const btn = document.getElementById("themeToggleBtn");
    if (!btn) return;
    btn.setAttribute("aria-label", isDark ? "Kun rejimini yoqiş" : "Tun rejimini yoqiş");
    btn.setAttribute("title", isDark ? "Kun rejimi (Yoruğ)" : "Tun rejimi (Qoronği)");
}

function toggleDarkMode() {
    const isDarkNow = document.body.classList.toggle("dark-mode");
    updateThemeButtonA11y(isDarkNow);
    try {
        localStorage.setItem(THEME_STORAGE_KEY, isDarkNow ? "dark" : "light");
    } catch (_) {}
}

applySavedTheme();

// === 11. УМНОЕ АВТОСОХРАНЕНИЕ ЧЕРНОВИКА, ЧИСТКА ТЕКСТА И ЭКСПОРТ РЕДАКТОРА В TXT / PDF ===
const DRAFT_STORAGE_KEY = "ulh_editor_draft_v1";
let autosaveBadgeTimer = null;

function showAutosaveIndicator(customText) {
    const badge = document.getElementById("autosaveBadge");
    if (!badge) return;
    badge.textContent = customText || "Avtosaqlandi ✓";
    badge.classList.add("visible");

    if (autosaveBadgeTimer) clearTimeout(autosaveBadgeTimer);
    autosaveBadgeTimer = setTimeout(() => {
        badge.classList.remove("visible");
    }, 1800);
}

function saveEditorDraft() {
    if (!editor) return;
    try {
        localStorage.setItem(DRAFT_STORAGE_KEY, editor.value);
        if (editor.value.trim().length > 0) {
            showAutosaveIndicator("Avtosaqlandi ✓");
        }
    } catch (_) {}
}

function restoreEditorDraft() {
    if (!editor) return;
    try {
        const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (saved && saved.length > 0 && !editor.value) {
            editor.value = saved;
            if (typeof calculateAndRenderTextStats === "function") {
                calculateAndRenderTextStats();
            }
            showAutosaveIndicator("Qoralama tiklandi ✓");
        }
    } catch (_) {}
}

// Автосохранение при вводе, вставке и очистке
if (editor) {
    editor.addEventListener("input", saveEditorDraft);
    editor.addEventListener("paste", () => setTimeout(saveEditorDraft, 20));
}

const clearBtnDraftHook = document.getElementById("clearBtn");
if (clearBtnDraftHook) {
    clearBtnDraftHook.addEventListener("click", () => {
        try {
            localStorage.removeItem(DRAFT_STORAGE_KEY);
        } catch (_) {}
    });
}

// Открытие / закрытие меню «Asboblar»
function toggleEditorToolsMenu(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    const wrap = document.getElementById("editorToolsWrap");
    const btn = document.getElementById("toolsBtn");
    if (!wrap) return;

    const isOpen = wrap.classList.toggle("open");
    if (btn) btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
}

function closeEditorToolsMenu() {
    const wrap = document.getElementById("editorToolsWrap");
    const btn = document.getElementById("toolsBtn");
    if (wrap) wrap.classList.remove("open");
    if (btn) btn.setAttribute("aria-expanded", "false");
}

document.addEventListener("click", closeEditorToolsMenu);

// Инструменты чистки пробелов и смены регистра с учетом узбекского алфавита
function applyEditorTool(actionType) {
    if (!editor || !editor.value) {
        closeEditorToolsMenu();
        return;
    }

    let text = editor.value;

    if (actionType === "clean_spaces") {
        text = text
            .replace(/[ \t]+/g, " ")               // убираем двойные и множественные пробелы
            .replace(/^[ \t]+|[ \t]+$/gm, "")      // убираем пробелы по краям каждой строки
            .replace(/\s+([,.;:!?])/g, "$1")       // убираем лишний пробел перед знаками препинания
            .replace(/\n{3,}/g, "\n\n")            // оставляем максимум один пустой отступ между абзацами
            .trim();
        showAutosaveIndicator("Böşliqlar tozalandi ✓");
    } else if (actionType === "upper_case") {
        text = text.toUpperCase();
        showAutosaveIndicator("KATTA HARFLAR ✓");
    } else if (actionType === "lower_case") {
        text = text.toLowerCase();
        showAutosaveIndicator("kiçik harflar ✓");
    } else if (actionType === "sentence_case") {
        text = text.toLowerCase().replace(/(^\s*[a-zA-ZçşğöÇŞĞÖа-яА-ЯёЁўқғҳЎҚҒҲ]|[.!?]\s+[a-zA-ZçşğöÇŞĞÖа-яА-ЯёЁўқғҳЎҚҒҲ]|\n\s*[a-zA-ZçşğöÇŞĞÖа-яА-ЯёЁўқғҳЎҚҒҲ])/g, function(match) {
            return match.toUpperCase();
        });
        showAutosaveIndicator("Gap boşidan katta ✓");
    }

    editor.value = text;
    saveEditorDraft();
    if (typeof calculateAndRenderTextStats === "function") {
        calculateAndRenderTextStats();
    }
    closeEditorToolsMenu();
}

// Быстрое скачивание текста из редактора в .TXT
function exportEditorAsTxt() {
    closeEditorToolsMenu();
    if (!editor || !editor.value.trim()) {
        showAutosaveIndicator("Avval matn kiriting!");
        return;
    }

    const blob = new Blob([editor.value], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ulh_matn.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    showAutosaveIndicator(".TXT yuklab olindi ✓");
}

// Быстрое скачивание текста из редактора в .PDF (формат А4)
async function exportEditorAsPdf() {
    closeEditorToolsMenu();
    if (!editor || !editor.value.trim()) {
        showAutosaveIndicator("Avval matn kiriting!");
        return;
    }

    const stage = document.getElementById("pdfRenderStage");
    if (!stage || !window.jspdf || typeof html2canvas !== "function") return;

    showAutosaveIndicator("PDF tayyorlanmoqda...");

    try {
        stage.innerHTML = "";
        const txtDiv = document.createElement("div");
        txtDiv.className = "pdf-page-section";
        txtDiv.dataset.orientation = "portrait";
        txtDiv.style.cssText = "width: 595.3pt; min-height: 841.9pt; padding: 42pt 48pt; background: #FFFFFF; white-space: pre-wrap; word-break: break-word; font-family: 'Manrope', Arial, sans-serif; font-size: 12pt; line-height: 1.6; color: #0F172A;";
        txtDiv.textContent = editor.value;
        stage.appendChild(txtDiv);

        const { jsPDF } = window.jspdf;
        const pageWidthMm = 210;
        const pageHeightMm = 297;

        const canvas = await html2canvas(txtDiv, {
            scale: 2,
            useCORS: true,
            backgroundColor: "#FFFFFF",
            logging: false
        });

        const onePageCanvasHeight = Math.round(canvas.width * (pageHeightMm / pageWidthMm));
        const pdf = new jsPDF({
            orientation: "p",
            unit: "mm",
            format: "a4",
            compress: true
        });

        if (canvas.height <= onePageCanvasHeight * 1.04) {
            const imgData = canvas.toDataURL("image/jpeg", 0.96);
            const renderedHeightMm = Math.min(pageHeightMm, (canvas.height / canvas.width) * pageWidthMm);
            pdf.addImage(imgData, "JPEG", 0, 0, pageWidthMm, renderedHeightMm, undefined, "FAST");
        } else {
            const ctx = canvas.getContext("2d");
            const topMarginMm = 12;
            const marginCanvasPx = Math.round((topMarginMm / pageHeightMm) * onePageCanvasHeight);
            let currentY = 0;
            let isFirstPage = true;

            while (currentY < canvas.height - 16) {
                const maxSliceHeight = isFirstPage
                    ? (onePageCanvasHeight - marginCanvasPx)
                    : (onePageCanvasHeight - marginCanvasPx * 2);

                let targetEndY = currentY + maxSliceHeight;
                if (targetEndY >= canvas.height - 16) {
                    targetEndY = canvas.height;
                } else if (typeof findSafeSliceY === "function") {
                    const minSearchY = Math.max(currentY + Math.floor(maxSliceHeight * 0.75), targetEndY - 140);
                    targetEndY = findSafeSliceY(ctx, canvas.width, targetEndY, minSearchY);
                }

                const sliceHeight = targetEndY - currentY;
                if (sliceHeight <= 0) break;

                const sliceCanvas = document.createElement("canvas");
                sliceCanvas.width = canvas.width;
                sliceCanvas.height = sliceHeight;
                const sliceCtx = sliceCanvas.getContext("2d");
                sliceCtx.fillStyle = "#FFFFFF";
                sliceCtx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
                sliceCtx.drawImage(canvas, 0, currentY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

                if (!isFirstPage) pdf.addPage("a4", "p");

                const sliceImg = sliceCanvas.toDataURL("image/jpeg", 0.96);
                const sliceHeightMm = (sliceHeight / canvas.width) * pageWidthMm;
                const offsetTopMm = isFirstPage ? 0 : topMarginMm;
                pdf.addImage(sliceImg, "JPEG", 0, offsetTopMm, pageWidthMm, sliceHeightMm, undefined, "FAST");

                currentY = targetEndY;
                isFirstPage = false;
            }
        }

        pdf.save("ulh_matn.pdf");
        showAutosaveIndicator(".PDF yuklab olindi ✓");
    } catch (_) {
        showAutosaveIndicator("PDF xatolik!");
    }
}

restoreEditorDraft();


function clearEditorText() {
    const editor = document.getElementById('editor');
    const btn = document.getElementById('clearBtn');

    if (!editor || editor.value.length === 0 || !btn) return;

    editor.value = '';
    if (typeof hideTooltip === 'function') hideTooltip();

    // Заменяем текст в тултипе на "Öçirildi ✓" без удаления иконки
    const tooltipNode = btn.querySelector('.custom-tooltip');
    if (tooltipNode) tooltipNode.textContent = "Öçirildi ✓";
    btn.classList.add('cleared');

    // Если подключено автосохранение, удаляем черновик из localStorage
    try {
        localStorage.removeItem("ulh_editor_draft_v1");
    } catch (_) {}

    if (typeof calculateAndRenderTextStats === 'function') {
        calculateAndRenderTextStats();
    }

    setTimeout(() => {
        if (tooltipNode) tooltipNode.textContent = "Öçiriş";
        btn.classList.remove('cleared');
    }, 1200);
}


// === 12. ПРОЦЕДУРНЫЙ ГЕНЕРАТОР МУЗЫКИ (WEB AUDIO API) И МИНИ-ПЛЕЕР ===
let ambientAudioCtx = null;
let ambientMasterGain = null;
let ambientReverbNode = null;
let ambientIsPlaying = false;
let ambientVolume = 0.70; // 70% по умолчанию
let ambientChordTimer = null;
let ambientMelodyTimer = null;
let ambientHasStartedOnce = false;

// Аккорды для мягкого фонового пэда (Fmaj9, Dm11, Bbmaj7, C6add9)
const AMBIENT_CHORDS = [
    [174.61, 220.00, 261.63, 329.63, 392.00], // Fmaj9
    [146.83, 220.00, 261.63, 329.63, 349.23], // Dm11
    [116.54, 174.61, 220.00, 261.63, 349.23], // Bbmaj9
    [130.81, 196.00, 246.94, 293.66, 329.63]  // Cmaj9
];

// Пентатоника для мягких мелодических капель (Rhodes / Bell)
const AMBIENT_SCALE = [
    261.63, 293.66, 329.63, 349.23, 392.00, 440.00,
    523.25, 587.33, 659.25, 698.46, 783.99, 880.00
];

let currentChordIdx = 0;

// Создание мягкого пространственного ревербератора (Impulse Response)
function createAmbientReverb(ctx) {
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * 3.6; // 3.6 секунды хвоста реверберации
    const impulse = ctx.createBuffer(2, length, sampleRate);

    for (let ch = 0; ch < 2; ch++) {
        const channelData = impulse.getChannelData(ch);
        for (let i = 0; i < length; i++) {
            const decay = Math.pow(1 - i / length, 2.4);
            channelData[i] = (Math.random() * 2 - 1) * decay * 0.35;
        }
    }

    const convolver = ctx.createConvolver();
    convolver.buffer = impulse;
    return convolver;
}

function initAmbientAudioEngine() {
    if (ambientAudioCtx) return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    ambientAudioCtx = new AudioContextClass();

    // Мастер-громкость
    ambientMasterGain = ambientAudioCtx.createGain();
    ambientMasterGain.gain.value = ambientVolume * 0.45;

    // Мягкий сглаживающий фильтр на мастере
    const masterFilter = ambientAudioCtx.createBiquadFilter();
    masterFilter.type = "lowpass";
    masterFilter.frequency.value = 1800;

    // Ревербератор для глубокого эмбиент-пространства
    ambientReverbNode = createAmbientReverb(ambientAudioCtx);
    const wetGain = ambientAudioCtx.createGain();
    wetGain.gain.value = 0.55;

    const dryGain = ambientAudioCtx.createGain();
    dryGain.gain.value = 0.65;

    masterFilter.connect(dryGain);
    masterFilter.connect(ambientReverbNode);
    ambientReverbNode.connect(wetGain);

    dryGain.connect(ambientMasterGain);
    wetGain.connect(ambientMasterGain);
    ambientMasterGain.connect(ambientAudioCtx.destination);

    ambientAudioCtx._inputBus = masterFilter;
}

// Проигрывание тёплого обволакивающего аккорда (Pad)
function triggerAmbientPadChord() {
    if (!ambientIsPlaying || !ambientAudioCtx) return;

    const now = ambientAudioCtx.currentTime;
    const chord = AMBIENT_CHORDS[currentChordIdx % AMBIENT_CHORDS.length];
    currentChordIdx++;

    chord.forEach((freq, idx) => {
        const osc = ambientAudioCtx.createOscillator();
        const subOsc = ambientAudioCtx.createOscillator();
        const noteGain = ambientAudioCtx.createGain();
        const filter = ambientAudioCtx.createBiquadFilter();
        const panner = ambientAudioCtx.createStereoPanner ? ambientAudioCtx.createStereoPanner() : null;

        osc.type = "sine";
        subOsc.type = "triangle";

        // Легкий расстрой (detune) для теплоты аналогового синтезатора
        osc.frequency.setValueAtTime(freq, now);
        subOsc.frequency.setValueAtTime(freq * 0.9985, now);

        filter.type = "lowpass";
        filter.frequency.setValueAtTime(520 + idx * 90, now);

        const attack = 2.6;
        const hold = 3.2;
        const release = 4.2;
        const peakGain = 0.048 / Math.sqrt(chord.length);

        noteGain.gain.setValueAtTime(0.0001, now);
        noteGain.gain.linearRampToValueAtTime(peakGain, now + attack);
        noteGain.gain.setValueAtTime(peakGain, now + attack + hold);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, now + attack + hold + release);

        osc.connect(filter);
        subOsc.connect(filter);
        filter.connect(noteGain);

        if (panner) {
            panner.pan.setValueAtTime((idx % 2 === 0 ? -1 : 1) * 0.35, now);
            noteGain.connect(panner);
            panner.connect(ambientAudioCtx._inputBus);
        } else {
            noteGain.connect(ambientAudioCtx._inputBus);
        }

        osc.start(now);
        subOsc.start(now);
        osc.stop(now + attack + hold + release + 0.1);
        subOsc.stop(now + attack + hold + release + 0.1);
    });
}

// Проигрывание мягкой случайной ноты пентатоники (в стиле FigJam / Rhodes)
function triggerAmbientMelodyNote() {
    if (!ambientIsPlaying || !ambientAudioCtx) return;

    const now = ambientAudioCtx.currentTime;
    const freq = AMBIENT_SCALE[Math.floor(Math.random() * AMBIENT_SCALE.length)];

    const osc = ambientAudioCtx.createOscillator();
    const overtone = ambientAudioCtx.createOscillator();
    const noteGain = ambientAudioCtx.createGain();
    const overtoneGain = ambientAudioCtx.createGain();

    osc.type = "sine";
    overtone.type = "sine";

    osc.frequency.setValueAtTime(freq, now);
    overtone.frequency.setValueAtTime(freq * 2, now); // Мягкий обертон на октаву выше

    noteGain.gain.setValueAtTime(0.0001, now);
    noteGain.gain.linearRampToValueAtTime(0.042, now + 0.05);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.4);

    overtoneGain.gain.setValueAtTime(0.0001, now);
    overtoneGain.gain.linearRampToValueAtTime(0.008, now + 0.02);
    overtoneGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

    osc.connect(noteGain);
    overtone.connect(overtoneGain);
    overtoneGain.connect(noteGain);
    noteGain.connect(ambientAudioCtx._inputBus);

    osc.start(now);
    overtone.start(now);
    osc.stop(now + 3.5);
    overtone.stop(now + 1.0);

    // Планируем следующую ноту через случайный органичный интервал (1.8 — 4.2 сек)
    const nextDelay = 1800 + Math.random() * 2400;
    ambientMelodyTimer = setTimeout(triggerAmbientMelodyNote, nextDelay);
}

function startAmbientMusic() {
    initAmbientAudioEngine();
    if (!ambientAudioCtx) return;

    if (ambientAudioCtx.state === "suspended") {
        ambientAudioCtx.resume();
    }

    ambientIsPlaying = true;
    ambientHasStartedOnce = true;
    updateMusicPlayerUI();

    clearInterval(ambientChordTimer);
    clearTimeout(ambientMelodyTimer);

    triggerAmbientPadChord();
    ambientChordTimer = setInterval(triggerAmbientPadChord, 7200);
    ambientMelodyTimer = setTimeout(triggerAmbientMelodyNote, 1100);
}

function pauseAmbientMusic() {
    ambientIsPlaying = false;
    clearInterval(ambientChordTimer);
    clearTimeout(ambientMelodyTimer);
    updateMusicPlayerUI();
}

function toggleAmbientPlayback(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    if (ambientIsPlaying) {
        pauseAmbientMusic();
    } else {
        startAmbientMusic();
    }
}

function updateMusicPlayerUI() {
    const navBtn = document.getElementById("musicToggleBtn");
    const coverBtn = document.getElementById("musicPlayPauseBtn");

    if (navBtn) {
        navBtn.classList.toggle("is-playing", ambientIsPlaying);
    }
    if (coverBtn) {
        coverBtn.classList.toggle("playing", ambientIsPlaying);
    }
}

// Открытие / закрытие выпадающего окошка плеера по клику на ноту
function toggleMusicDropdown(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    const wrap = document.getElementById("navMusicWrap");
    const btn = document.getElementById("musicToggleBtn");
    if (!wrap) return;

    // Закрываем другие открытые подменю в шапке
    document.querySelectorAll(".nav-item.has-dropdown").forEach(el => el.classList.remove("open"));

    const isOpen = wrap.classList.toggle("open");
    if (btn) btn.setAttribute("aria-expanded", isOpen ? "true" : "false");

    // При самом первом открытии плеера сразу мягко запускаем музыку
    if (isOpen && !ambientHasStartedOnce) {
        startAmbientMusic();
    }
}

// Закрытие окошка плеера при клике вне его
document.addEventListener("click", (e) => {
    const wrap = document.getElementById("navMusicWrap");
    if (wrap && !wrap.contains(e.target)) {
        wrap.classList.remove("open");
        const btn = document.getElementById("musicToggleBtn");
        if (btn) btn.setAttribute("aria-expanded", "false");
    }
});

// Управление капсульным ползунком громкости (клик, перетаскивание, колесико мыши)
function setAmbientVolumeRatio(ratio) {
    const clamped = Math.max(0, Math.min(1, ratio));
    ambientVolume = clamped;
    const percent = Math.round(clamped * 100);

    const fillEl = document.getElementById("musicVolumeFill");
    const tooltipEl = document.getElementById("musicVolumeTooltip");
    const capsuleEl = document.getElementById("musicVolumeCapsule");

    if (fillEl) fillEl.style.width = percent + "%";
    if (tooltipEl) tooltipEl.textContent = percent + "%";
    if (capsuleEl) capsuleEl.setAttribute("aria-valuenow", String(percent));

    if (ambientMasterGain && ambientAudioCtx) {
        ambientMasterGain.gain.setTargetAtTime(clamped * 0.45, ambientAudioCtx.currentTime, 0.04);
    }

    // Если пользователь прибавил громкость с 0, когда музыка еще не играла — запускаем
    if (percent > 0 && !ambientIsPlaying && ambientHasStartedOnce) {
        startAmbientMusic();
    } else if (percent === 0 && ambientIsPlaying) {
        pauseAmbientMusic();
    }
}

(function initVolumeCapsuleControls() {
    const capsule = document.getElementById("musicVolumeCapsule");
    if (!capsule) return;

    let isDragging = false;

    function updateFromClientX(clientX) {
        const rect = capsule.getBoundingClientRect();
        const innerPad = 3;
        const usableWidth = Math.max(1, rect.width - innerPad * 2);
        const relX = clientX - (rect.left + innerPad);
        setAmbientVolumeRatio(relX / usableWidth);
    }

    capsule.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        isDragging = true;
        capsule.classList.add("dragging");
        if (capsule.setPointerCapture) capsule.setPointerCapture(e.pointerId);
        updateFromClientX(e.clientX);
    });

    capsule.addEventListener("pointermove", (e) => {
        if (!isDragging) return;
        updateFromClientX(e.clientX);
    });

    function endDrag(e) {
        if (!isDragging) return;
        isDragging = false;
        capsule.classList.remove("dragging");
        if (e && e.pointerId !== undefined && capsule.releasePointerCapture) {
            try { capsule.releasePointerCapture(e.pointerId); } catch (_) {}
        }
    }

    capsule.addEventListener("pointerup", endDrag);
    capsule.addEventListener("pointercancel", endDrag);

    // Регулировка громкости колесиком мыши при наведении на капсулу
    capsule.addEventListener("wheel", (e) => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.05 : -0.05;
        setAmbientVolumeRatio(ambientVolume + delta);
    }, { passive: false });

    // Поддержка клавиш стрелок влево/вправо
    capsule.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowUp") {
            e.preventDefault();
            setAmbientVolumeRatio(ambientVolume + 0.05);
        } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
            e.preventDefault();
            setAmbientVolumeRatio(ambientVolume - 0.05);
        }
    });
})();

// === 13. AI YORDAMÇI (ИСПРАВЛЕНИЕ ОШИБОК, ПОСТЫ ДЛЯ СОЦСЕТЕЙ, ЗАГОЛОВКИ И СВОЁ ЗАДАНИЕ) ===
const AI_PROXY_ENDPOINT = "https://ulh-ai-helper.lanigirodesigner.workers.dev";
let previousTextBeforeAi = "";

// Нормализация ответа ИИ под стандарты нового узбекского латинского алфавита (Ö, Ğ, Ş, Ç)
// Умная нормализация ответа ИИ с автоопределением языка (Ö, Ğ, Ş, Ç только для узбекского)
function enforceNewUzbekAlphabet(rawText) {
    if (!rawText) return "";
    let res = String(rawText);

    // 1. Если ИИ выдал текст на кириллице (русский язык), мы не применяем замены
    if (/[А-Яа-яЁё]/.test(res)) {
        return res.trim();
    }

    // 2. Если ИИ выдал текст на английском (ищем частые английские слова, чтобы не сломать "she", "change")
    const englishWordsRegex = /\b(the|and|is|are|this|that|with|for|have|has|will)\b/i;
    if (englishWordsRegex.test(res)) {
        return res.trim(); 
    }

    // 3. Во всех остальных случаях (узбекский язык) — смело применяем новый алфавит
    res = res
        .replace(/O['‘’`ʻʼ]/g, "Ö")
        .replace(/o['‘’`ʻʼ]/g, "ö")
        .replace(/G['‘’`ʻʼ]/g, "Ğ")
        .replace(/g['‘’`ʻʼ]/g, "ğ")
        .replace(/Sh/g, "Ş")
        .replace(/SH/g, "Ş")
        .replace(/sh/g, "ş")
        .replace(/Ch/g, "Ç")
        .replace(/CH/g, "Ç")
        .replace(/ch/g, "ç");

    return res.trim();
}

function toggleAiMenu(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    if (typeof closeEditorToolsMenu === "function") closeEditorToolsMenu();

    const wrap = document.getElementById("editorAiWrap");
    const btn = document.getElementById("aiHelperBtn");
    if (!wrap) return;

    const isOpen = wrap.classList.toggle("open");
    if (btn) btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
}

function closeAiMenu() {
    const wrap = document.getElementById("editorAiWrap");
    const btn = document.getElementById("aiHelperBtn");
    if (wrap) wrap.classList.remove("open");
    if (btn) btn.setAttribute("aria-expanded", "false");
}

document.addEventListener("click", (e) => {
    const wrap = document.getElementById("editorAiWrap");
    if (wrap && !wrap.contains(e.target)) {
        closeAiMenu();
    }
});

function openAiCustomModal(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    closeAiMenu();

    if (!editor || !editor.value.trim()) {
        if (typeof showAutosaveIndicator === "function") {
            showAutosaveIndicator("Avval tahrirlovçiga matn kiriting!");
        }
        if (editor) editor.focus();
        return;
    }

    const modal = document.getElementById("aiModalBackdrop");
    if (modal) {
        modal.classList.add("open");
        setTimeout(() => {
            const input = document.getElementById("aiCustomPromptInput");
            if (input) input.focus();
        }, 100);
    }
}

function closeAiCustomModal(event) {
    const modal = document.getElementById("aiModalBackdrop");
    if (!modal) return;
    if (event && event.target && event.target !== modal) return;
    modal.classList.remove("open");
}

function setAiQuickPrompt(promptText) {
    const input = document.getElementById("aiCustomPromptInput");
    if (!input) return;
    input.value = promptText;
    input.focus();
}

function submitAiCustomPrompt() {
    const input = document.getElementById("aiCustomPromptInput");
    const customTask = input ? input.value.trim() : "";
    if (!customTask) {
        if (input) input.focus();
        return;
    }
    closeAiCustomModal();
    executeAiRequest("custom", customTask);
}

function runAiPreset(presetType) {
    closeAiMenu();
    executeAiRequest(presetType, "");
}

function setAiLoadingState(isLoading) {
    const btn = document.getElementById("aiHelperBtn");
    if (!btn) return;

    btn.classList.toggle("loading", isLoading);
    const spanText = btn.querySelector("span:not(.custom-tooltip)");
    if (spanText) {
        spanText.textContent = isLoading ? "..." : "AI";
    }
}

function undoLastAiAction() {
    if (!editor || !previousTextBeforeAi) return;
    editor.value = previousTextBeforeAi;
    previousTextBeforeAi = "";

    const undoBtn = document.getElementById("aiUndoBtn");
    if (undoBtn) undoBtn.style.display = "none";

    if (typeof saveEditorDraft === "function") saveEditorDraft();
    if (typeof calculateAndRenderTextStats === "function") calculateAndRenderTextStats();
    if (typeof showAutosaveIndicator === "function") showAutosaveIndicator("Asl matn qaytarildi ✓");
    closeAiMenu();
}

// === ПОЛНОСТЬЮ ЗАМЕНИТЕ ВАШУ ФУНКЦИЮ executeAiRequest НА ЭТУ ===
async function executeAiRequest(mode, customInstruction) {
    if (!editor || !editor.value.trim()) {
        if (typeof showAutosaveIndicator === "function") {
            showAutosaveIndicator("Avval matn kiriting!");
        }
        if (editor) editor.focus();
        return;
    }

    const sourceText = editor.value.trim();

    setAiLoadingState(true);
    if (typeof showAutosaveIndicator === "function") {
        showAutosaveIndicator("AI matn ustida işlamoqda...");
    }

    try {
        const response = await fetch(AI_PROXY_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                mode: mode,
                text: sourceText,
                customPrompt: customInstruction || ""
            })
        });

        const data = await response.json();
        if (!response.ok || !data || !data.result) {
            throw new Error((data && data.error) ? data.error : "AI xatolik");
        }

        // Фильтр нового алфавита применяется ТОЛЬКО к узбекскому тексту
        const cleanResult = enforceNewUzbekAlphabet(data.result);

        let finalOutput = cleanResult;
        if (mode === "generate_titles") {
            finalOutput = cleanResult + "\n\n---\n\n" + sourceText;
        }

        // ВОТ ТА САМАЯ СТРОЧКА: Открываем новое окно визуального редактора
        openAiResultModal(finalOutput);

        // Убираем кнопку отмены, так как оригинальный текст мы больше не стираем
        const undoBtn = document.getElementById("aiUndoBtn");
        if (undoBtn) undoBtn.style.display = "none";

        if (typeof showAutosaveIndicator === "function") showAutosaveIndicator("AI vazifani bajardi ✓");
    } catch (err) {
        if (typeof showAutosaveIndicator === "function") {
            showAutosaveIndicator("AI xatolik: qayta urinib köring");
        }
        console.error("AI Helper Error:", err);
    } finally {
        setAiLoadingState(false);
    }
}

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        closeAiCustomModal();
        closeAiMenu();
    }
});

// === ДОБАВЬТЕ ЭТИ ФУНКЦИИ В РАЗДЕЛ 13 ===
// === ВИЗУАЛЬНЫЙ РЕДАКТОР ИИ (ПАРСЕР MARKDOWN, ТУЛБАР, ЭКСПОРТ) ===

// Конвертируем Markdown от ИИ в нормальный HTML (жирный, курсив, заголовки, ссылки)
function parseMarkdownToHTML(text) {
    if (!text) return "";
    let html = text
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
        .replace(/\*(.*?)\*/g, '<i>$1</i>')
        .replace(/~~(.*?)~~/g, '<strike>$1</strike>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
        .replace(/\n/g, '<br>');
    return html;
}

// Функции кнопок тулбара (Жирный, Курсив, По центру и т.д.)
function formatAiText(command) {
    document.execCommand(command, false, null);
    document.getElementById("aiResultContent").focus();
}

function addAiLink() {
    const url = prompt("Havola (URL) kiriting:", "https://");
    if (url) {
        document.execCommand("createLink", false, url);
        // Делаем добавленную ссылку открывающейся в новом окне
        const selection = window.getSelection();
        if (selection.anchorNode && selection.anchorNode.parentElement.tagName === 'A') {
            selection.anchorNode.parentElement.setAttribute('target', '_blank');
            selection.anchorNode.parentElement.setAttribute('rel', 'noopener');
        }
    }
}

// Функция смены размера текста (кегля)
function changeAiFontSize(sizeValue) {
    if (!sizeValue) return;
    
    // Применяем стандартную команду браузера для изменения размера (от 1 до 7)
    document.execCommand("fontSize", false, sizeValue);
    
    // Возвращаем фокус в редактор
    const contentDiv = document.getElementById("aiResultContent");
    if (contentDiv) contentDiv.focus();
    
    // Сбрасываем селект обратно на надпись "Ölçam", 
    // чтобы при следующем выделении можно было снова выбрать тот же размер
    const selectEl = document.querySelector(".ai-tool-select");
    if (selectEl) selectEl.value = "";
}

// Открытие окна: ИИ выдает текст, мы парсим Markdown и вставляем HTML
function openAiResultModal(rawText) {
    const modal = document.getElementById("aiResultModalBackdrop");
    const contentDiv = document.getElementById("aiResultContent");
    const refineInput = document.getElementById("aiRefineInput");
    
    if (modal && contentDiv) {
        contentDiv.innerHTML = parseMarkdownToHTML(rawText);
        if (refineInput) refineInput.value = ""; 
        modal.classList.add("open");
    }
}

function closeAiResultModal(event) {
    const modal = document.getElementById("aiResultModalBackdrop");
    if (!modal) return;
    if (event && event.target && event.target !== modal) return;
    modal.classList.remove("open");
}

// Копирование с сохранением стилей (Rich Text), чтобы вставлять красиво в Word/Telegram
function copyAiResultRichText() {
    const contentDiv = document.getElementById("aiResultContent");
    const btnSpan = document.getElementById("copyAiResultTextSpan");
    if (!contentDiv) return;

    // Создаем невидимый элемент для копирования HTML
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(contentDiv);
    selection.removeAllRanges();
    selection.addRange(range);

    try {
        document.execCommand('copy');
        const originalText = btnSpan.textContent;
        btnSpan.textContent = "Nusxalandi ✓";
        setTimeout(() => { btnSpan.textContent = originalText; }, 1500);
    } catch (e) {
        console.error("Nusxalashda xatolik:", e);
    }
    selection.removeAllRanges();
}

// Скачивание в формате .DOCX (Word Document) с сохранением жирности и стилей
function exportAiToDocx() {
    const contentHtml = document.getElementById("aiResultContent").innerHTML;
    // Оборачиваем в базовую структуру Word-документа
    const preHtml = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>ULH AI Result</title></head><body>";
    const postHtml = "</body></html>";
    const fullHtml = preHtml + contentHtml + postHtml;
    
    const blob = new Blob(['\ufeff', fullHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ulh_ai_natija.doc';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Скачивание в формате .PDF (Используем ваш встроенный html2canvas и jsPDF)
async function exportAiToPdf() {
    const contentDiv = document.getElementById("aiResultContent");
    const stage = document.getElementById("pdfRenderStage");
    if (!contentDiv || !stage || !window.jspdf || typeof html2canvas !== "function") return;

    // Копируем содержимое на скрытую сцену для рендеринга PDF (в формате А4)
    stage.innerHTML = "";
    const pdfWrap = document.createElement("div");
    pdfWrap.style.cssText = "width: 595.3pt; min-height: 841.9pt; padding: 42pt 48pt; background: #FFFFFF; font-family: 'Manrope', Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #000000;";
    pdfWrap.innerHTML = contentDiv.innerHTML;
    stage.appendChild(pdfWrap);

    try {
        const { jsPDF } = window.jspdf;
        const canvas = await html2canvas(pdfWrap, { scale: 2, backgroundColor: "#FFFFFF", logging: false });
        const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: true });
        
        const pageWidthMm = 210;
        const pageHeightMm = 297;
        const imgData = canvas.toDataURL("image/jpeg", 0.96);
        const renderedHeightMm = Math.min(pageHeightMm, (canvas.height / canvas.width) * pageWidthMm);
        
        pdf.addImage(imgData, "JPEG", 0, 0, pageWidthMm, renderedHeightMm, undefined, "FAST");
        pdf.save("ulh_ai_natija.pdf");
    } catch (e) {
        console.error("PDF xatolik:", e);
    }
}

// === ФУНКЦИЯ ДЛЯ ЧАТА ДОРАБОТКИ (MINI CHAT) В ОКНЕ ===
async function refineAiResult() {
    const contentDiv = document.getElementById("aiResultContent");
    const refineInput = document.getElementById("aiRefineInput");
    const refineBtn = document.getElementById("aiRefineBtn");
    const refineBtnText = document.getElementById("aiRefineBtnText");
    const sparkleIcon = refineBtn ? refineBtn.querySelector(".ai-sparkle-icon") : null;
    
    // Надежное получение текста из визуального редактора (кроссбраузерно)
    const sourceText = (contentDiv.innerText || contentDiv.textContent || "").trim();
    const customInstruction = (refineInput.value || "").trim();

    // Если поле с текстом пустое
    if (!sourceText) {
        alert("Tahrirlovchida matn yo'q!");
        return;
    }

    // Если пользователь не ввел команду, подсвечиваем поле ввода красным
    if (!customInstruction) {
        if (refineInput) {
            refineInput.style.border = "2px solid #E11D48";
            setTimeout(() => refineInput.style.border = "", 1500);
        }
        return;
    }

    // Включаем анимацию загрузки на кнопке
    if (refineBtn) refineBtn.style.pointerEvents = "none";
    if (refineBtnText) refineBtnText.textContent = "Kuting...";
    if (sparkleIcon) sparkleIcon.style.animation = "aiSpinPulse 1.1s linear infinite";

    try {
        const response = await fetch(AI_PROXY_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "custom", text: sourceText, customPrompt: customInstruction })
        });
        
        const data = await response.json();
        
        if (!response.ok || !data || !data.result) {
            throw new Error((data && data.error) ? data.error : "AI xatolik");
        }

        // Применяем фильтр алфавита (только для узбекского) и парсим Markdown
        const cleanResult = enforceNewUzbekAlphabet(data.result);
        contentDiv.innerHTML = parseMarkdownToHTML(cleanResult);
        
        // Очищаем строку ввода после успешного выполнения
        if (refineInput) refineInput.value = ""; 
        
        // Показываем сообщение об успехе на кнопке
        if (refineBtnText) refineBtnText.textContent = "Tayyor ✓";
        setTimeout(() => {
            if (refineBtnText) refineBtnText.textContent = "Qayta yozing";
        }, 2000);

    } catch (err) {
        console.error("AI Refine Error:", err);
        // Если произошла ошибка (например, с интернетом), кнопка покажет "Xatolik!"
        if (refineBtnText) refineBtnText.textContent = "Xatolik!";
        setTimeout(() => {
            if (refineBtnText) refineBtnText.textContent = "Qayta yozing";
        }, 2000);
    } finally {
        // Обязательно возвращаем кнопку в рабочее состояние
        if (refineBtn) refineBtn.style.pointerEvents = "auto";
        if (sparkleIcon) sparkleIcon.style.animation = "";
    }
}

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        closeAiCustomModal();
        closeAiMenu();
        closeAiResultModal(); // <-- Добавьте эту строчку
    }
});

// === МЕНЕДЖЕР СОХРАНЕННЫХ ТЕКСТОВ (ARXIV) ===
const ARCHIVE_STORAGE_KEY = "ulh_archive_v1";

function openArchiveModal(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    document.querySelectorAll('.nav-item.has-dropdown').forEach(el => el.classList.remove('open'));
    
    renderArchiveList();
    
    const modal = document.getElementById('archiveModalBackdrop');
    if (modal) modal.classList.add('open');
}

function closeArchiveModal(event) {
    const modal = document.getElementById('archiveModalBackdrop');
    if (!modal) return;
    if (event && event.target && event.target !== modal) return;
    modal.classList.remove('open');
}

// Получить список сохраненных текстов из браузера
function getArchiveNotes() {
    try {
        const stored = localStorage.getItem(ARCHIVE_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (_) {
        return [];
    }
}

// Сохранить текущий текст из редактора
function saveCurrentTextToArchive() {
    const editorEl = document.getElementById("editor");
    if (!editorEl || !editorEl.value.trim()) {
        if (typeof showAutosaveIndicator === "function") showAutosaveIndicator("Matn kiritilmagan!");
        return;
    }

    const textToSave = editorEl.value.trim();
    const notes = getArchiveNotes();
    
    // Добавляем новую заметку в начало массива
    notes.unshift({
        id: Date.now(),
        date: new Date().toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        text: textToSave
    });

    try {
        localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(notes));
        renderArchiveList();
        if (typeof showAutosaveIndicator === "function") showAutosaveIndicator("Arxivga saqlandi ✓");
    } catch (e) {
        console.error("Archive Save Error:", e);
    }
}

// Отображение списка
function renderArchiveList() {
    const container = document.getElementById("archiveListContainer");
    if (!container) return;

    const notes = getArchiveNotes();
    container.innerHTML = "";

    if (notes.length === 0) {
        container.innerHTML = `<div style="text-align:center; color:#64748B; font-size:13px; padding: 20px 0;">Arxiv böş. Hali heç qanday matn saqlanmagan.</div>`;
        return;
    }

    notes.forEach(note => {
        const card = document.createElement("div");
        card.className = "archive-item-card";
        
        card.innerHTML = `
            <div class="archive-item-header">
                <span class="archive-item-date">${note.date}</span>
            </div>
            <div class="archive-item-snippet">${note.text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
            <div class="archive-item-actions">
                <button type="button" class="archive-btn-small archive-btn-load" onclick="loadArchiveNote(${note.id})">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Tahrirlash
                </button>
                <button type="button" class="archive-btn-small archive-btn-del" onclick="deleteArchiveNote(${note.id})">
                    Öçiriş
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

// Загрузить текст обратно в редактор
function loadArchiveNote(id) {
    const notes = getArchiveNotes();
    const note = notes.find(n => n.id === id);
    const editorEl = document.getElementById("editor");
    
    if (note && editorEl) {
        editorEl.value = note.text;
        closeArchiveModal();
        if (typeof showAutosaveIndicator === "function") showAutosaveIndicator("Matn yuklandi ✓");
        if (typeof saveEditorDraft === "function") saveEditorDraft();
        if (typeof calculateAndRenderTextStats === "function") calculateAndRenderTextStats();
    }
}

// Удалить конкретную заметку
function deleteArchiveNote(id) {
    let notes = getArchiveNotes();
    notes = notes.filter(n => n.id !== id);
    localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(notes));
    renderArchiveList();
}

// Очистить весь архив
function clearAllArchive() {
    if (confirm("Barça saqlangan matnlarni öçirib taşlamoqçimisiz?")) {
        localStorage.removeItem(ARCHIVE_STORAGE_KEY);
        renderArchiveList();
    }
}

// Добавляем закрытие окна архива по клавише Escape
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        closeArchiveModal();
    }
});

// === ФУНКЦИЯ СОХРАНЕНИЯ ТЕКСТА ИЗ ОКНА ИИ В АРХИВ ===
function saveAiResultToArchive(event) {
    const contentDiv = document.getElementById("aiResultContent");
    
    // Извлекаем чистый текст без HTML-тегов, чтобы он корректно работал при загрузке в основной редактор
    const textToSave = (contentDiv.innerText || contentDiv.textContent || "").trim();
    
    if (!textToSave) return;

    // Получаем текущий архив
    const notes = getArchiveNotes();
    
    // Добавляем новую заметку
    notes.unshift({
        id: Date.now(),
        date: new Date().toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        text: textToSave
    });

    try {
        localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(notes));
        renderArchiveList(); // Фоново обновляем список в модалке архива
        
        // Красивая визуальная реакция: меняем текст тултипа на зеленый "Saqlandi ✓"
        if (event && event.currentTarget) {
            const tooltip = event.currentTarget.querySelector('.custom-tooltip');
            if (tooltip) {
                const originalText = tooltip.textContent;
                tooltip.textContent = "Saqlandi ✓";
                tooltip.style.color = "#10B981"; // Зеленый цвет успеха
                
                // Возвращаем исходный текст через 1.5 секунды
                setTimeout(() => {
                    tooltip.textContent = originalText;
                    tooltip.style.color = "";
                }, 1500);
            }
        }
    } catch (e) {
        console.error("AI Archive Save Error:", e);
    }
}

// === ГОРЯЧИЕ КЛАВИШИ (HOTKEYS) ===

// Функции управления окном справочника горячих клавиш
function openHotkeysModal(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    document.querySelectorAll('.nav-item.has-dropdown').forEach(el => el.classList.remove('open'));
    const modal = document.getElementById('hotkeysModalBackdrop');
    if (modal) modal.classList.add('open');
}

function closeHotkeysModal(event) {
    const modal = document.getElementById('hotkeysModalBackdrop');
    if (!modal) return;
    if (event && event.target && event.target !== modal) return;
    modal.classList.remove('open');
}

// Глобальный слушатель нажатий на клавиатуре
document.addEventListener('keydown', function(e) {
    // 1. Закрытие окон на ESC (Добавляем наше окно к существующим)
    if (e.key === 'Escape') {
        closeHotkeysModal();
    }

    // Проверяем, нажата ли Ctrl (Windows/Linux) или Cmd (Mac)
    const isCtrlOrCmd = e.ctrlKey || e.metaKey;

    // 2. Ctrl + S: Сохранить в .TXT
    if (isCtrlOrCmd && e.key.toLowerCase() === 's') {
        e.preventDefault(); // Отключаем стандартное сохранение страницы браузером
        
        // Если открыто окно ИИ — сохраняем результат в DOCX, иначе — главный редактор в TXT
        const aiModal = document.getElementById("aiResultModalBackdrop");
        if (aiModal && aiModal.classList.contains("open")) {
            exportAiToDocx();
        } else {
            exportEditorAsTxt();
        }
    }

    // 3. Ctrl + Shift + C: Скопировать всё из редактора
    if (isCtrlOrCmd && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        copyEditorText();
    }

    // 4. Ctrl + Enter: Вызов AI или отправка запроса
    if (isCtrlOrCmd && e.key === 'Enter') {
        e.preventDefault();
        const activeEl = document.activeElement;
        
        // Умная логика: если мы уже ввели запрос в модалке - отправляем его
        if (activeEl && activeEl.id === 'aiRefineInput') {
            refineAiResult();
        } else if (activeEl && activeEl.id === 'aiCustomPromptInput') {
            submitAiCustomPrompt();
        } else {
            // Иначе - просто открываем меню с командами
            openAiCustomModal();
        }
    }
});

// === СУММА ПРОПИСЬЮ (SONNI SÖZ BILAN YOZIŞ) ===

function convertIntToWordsUz(n) {
    if (n === 0) return "nol";
    
    // Используем строго новый алфавит
    const ones = ["", "bir", "ikki", "uç", "tört", "beş", "olti", "yetti", "sakkiz", "töqqiz"];
    const tens = ["", "ön", "yigirma", "öttiz", "qirq", "ellik", "oltmiş", "yetmiş", "sakson", "töqson"];
    const scales = ["", "ming", "million", "milliard", "trillion"];

    let word = "";
    let scaleIdx = 0; // ИСПРАВЛЕНО: Теперь счетчик начинается строго с 0

    while (n > 0) {
        let chunk = n % 1000;
        if (chunk > 0) {
            let chunkStr = "";
            let h = Math.floor(chunk / 100);
            let rem = chunk % 100;
            let t = Math.floor(rem / 10);
            let u = rem % 10;

            if (h > 0) chunkStr += ones[h] + " yuz ";
            if (t > 0) chunkStr += tens[t] + " ";
            if (u > 0) chunkStr += ones[u] + " ";

            chunkStr += scales[scaleIdx] + " ";
            word = chunkStr + word;
        }
        n = Math.floor(n / 1000);
        scaleIdx++;
    }
    return word.trim().replace(/\s+/g, ' ');
}

function getCurrencyName(curr, isFrac) {
    switch(curr) {
        case 'uzs': return isFrac ? 'tiyin' : 'söm';
        case 'usd': return isFrac ? 'sent' : 'AQŞ dollari';
        case 'eur': return isFrac ? 'yevrosent' : 'yevro';
        case 'rub': return isFrac ? 'kopeyka' : 'rubl';
        case 'foiz': return isFrac ? '' : 'foiz';
        case 'none': return '';
        default: return '';
    }
}

function numToWordsUz(numStr, currency) {
    let cleanNum = numStr.replace(/\s+/g, '').replace(/,/g, '.');
    if (!cleanNum || isNaN(cleanNum)) return "";

    let parts = cleanNum.split('.');
    let intPart = parseInt(parts[0], 10);
    // Обработка копеек (всегда берем 2 знака)
    let fracStr = parts[1] ? parts[1].substring(0, 2).padEnd(2, '0') : "00";
    let fracPart = parseInt(fracStr, 10);

    if (intPart === 0 && fracPart === 0) return "nol " + getCurrencyName(currency, false);

    let result = convertIntToWordsUz(intPart);
    if (currency !== 'none') result += " " + getCurrencyName(currency, false);

    // Добавляем тийины/центы, если они есть
    if (fracPart > 0 && currency !== 'foiz' && currency !== 'none') {
        result += " " + convertIntToWordsUz(fracPart) + " " + getCurrencyName(currency, true);
    }

    return result.trim();
}

// Форматирование поля ввода на лету (ставит красивые пробелы: 1 485 000)
function formatAndTranslateNumber(inputEl) {
    let val = inputEl.value.replace(/[^\d.,]/g, '').replace(/,/g, '.');
    let parts = val.split('.');
    
    // Защита от второй точки
    if (parts.length > 2) parts = [parts[0], parts.slice(1).join('')];
    
    // Добавляем пробелы каждые 3 цифры
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    
    inputEl.value = parts.join('.');
    updateNumberToWords();
}

// Обновление интерфейса
function updateNumberToWords() {
    const input = document.getElementById("numWordsInput").value;
    const currency = document.getElementById("numWordsCurrency").value;
    const box = document.getElementById("numWordsResultBox");
    const textEl = document.getElementById("numWordsResultText");
    const hintEl = document.getElementById("numWordsCopyHint");

    if (!input.trim()) {
        box.style.display = "none";
        return;
    }

    const words = numToWordsUz(input, currency);
    if (words) {
        textEl.textContent = words;
        hintEl.textContent = "Nusxa oliş üçün bosing";
        hintEl.style.color = "#16A34A";
        box.style.display = "block";
    } else {
        box.style.display = "none";
    }
}

// Копирование в буфер обмена по клику
function copyNumberToWords() {
    const textEl = document.getElementById("numWordsResultText");
    const hintEl = document.getElementById("numWordsCopyHint");
    if (!textEl || !textEl.textContent) return;

    navigator.clipboard.writeText(textEl.textContent).then(() => {
        hintEl.textContent = "Nusxalandi ✓";
        hintEl.style.color = "#059669";
        
        setTimeout(() => {
            hintEl.textContent = "Nusxa oliş üçün bosing";
            hintEl.style.color = "#16A34A";
        }, 1500);
    });
}

// === АВТОМАТИЧЕСКИЙ ГЕНЕРАТОР СПИСКА ЛИТЕРАТУРЫ (IQTIBOS) ===

function openBiblioModal(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    // Закрываем меню "Foydali resurslar"
    document.querySelectorAll('.nav-item.has-dropdown').forEach(el => el.classList.remove('open'));
    const modal = document.getElementById('biblioModalBackdrop');
    if (modal) {
        modal.classList.add('open');
        toggleBiblioFields(); // Настраиваем поля по умолчанию
        generateBiblio();     // Генерируем базовый плейсхолдер
    }
}

function closeBiblioModal(event) {
    const modal = document.getElementById('biblioModalBackdrop');
    if (!modal) return;
    if (event && event.target && event.target !== modal) return;
    modal.classList.remove('open');
}

// Показываем нужные поля в зависимости от типа источника (Книга, Статья, Сайт)
function toggleBiblioFields() {
    const type = document.getElementById("bibType").value;
    
    document.getElementById("bibBookFields").style.display = type === 'book' ? 'grid' : 'none';
    document.getElementById("bibJournal").style.display = type === 'article' ? 'block' : 'none';
    document.getElementById("bibUrl").style.display = type === 'web' ? 'block' : 'none';
    
    const pagesInput = document.getElementById("bibPages");
    if (type === 'book') pagesInput.placeholder = "Jami sahifalar (masalan: 250)";
    if (type === 'article') pagesInput.placeholder = "Sahifalar oraliği (masalan: 15-22)";
    if (type === 'web') pagesInput.placeholder = "Murojaat sanasi (böş bölsa bugun)";
}

// Алгоритм генерации по ГОСТ и APA
function generateBiblio() {
    const style = document.getElementById("bibStyle").value;
    const type = document.getElementById("bibType").value;
    
    const author = document.getElementById("bibAuthor").value.trim() || "[Muallif F.I.Ş.]";
    const title = document.getElementById("bibTitle").value.trim() || "[Asar sarlavhasi]";
    const city = document.getElementById("bibCity").value.trim() || "[Şahar]";
    const pub = document.getElementById("bibPublisher").value.trim() || "[Naşriyot]";
    const year = document.getElementById("bibYear").value.trim() || "[Yil]";
    const pages = document.getElementById("bibPages").value.trim() || "[Sahifalar]";
    const journal = document.getElementById("bibJournal").value.trim() || "[Jurnal nomi]";
    const url = document.getElementById("bibUrl").value.trim() || "[URL]";

    let result = "";

    if (style === 'gost') {
        // Формат ГОСТ
        if (type === 'book') {
            result = `${author}. ${title} / ${author}. – ${city}: ${pub}, ${year}. – ${pages} b.`;
        } else if (type === 'article') {
            result = `${author}. ${title} // ${journal}. – ${year}. – B. ${pages}.`;
        } else if (type === 'web') {
            const accessDate = document.getElementById("bibPages").value.trim() || new Date().toLocaleDateString('uz-UZ');
            result = `${author}. ${title} [Elektron resurs] // URL: ${url} (murojaat sanasi: ${accessDate}).`;
        }
    } else if (style === 'apa') {
        // Формат APA
        if (type === 'book') {
            result = `${author}. (${year}). ${title}. ${city}: ${pub}.`;
        } else if (type === 'article') {
            result = `${author}. (${year}). ${title}. ${journal}, ${pages}.`;
        } else if (type === 'web') {
            result = `${author}. (${year}). ${title}. Olingan manba: ${url}`;
        }
    }

    document.getElementById("bibResultText").innerHTML = result;
}

// Копирование результата по клику на карточку
function copyBiblio() {
    const textEl = document.getElementById("bibResultText");
    const hintEl = document.getElementById("bibCopyHint");
    if (!textEl || !textEl.textContent) return;

    // Копируем как чистый текст
    navigator.clipboard.writeText(textEl.textContent).then(() => {
        hintEl.textContent = "Nusxalandi ✓";
        hintEl.style.color = "#059669";
        
        setTimeout(() => {
            hintEl.textContent = "Nusxa oliş üçün bosing";
            hintEl.style.color = "#0284C7";
        }, 1500);
    });
}

// Привязка закрытия окна к Esc
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeBiblioModal();
    }
});

// Функция очистки полей библиографии
function clearBiblioFields() {
    // 1. Находим все текстовые поля внутри модалки и очищаем их
    const inputs = document.querySelectorAll('#biblioModalBackdrop input.bib-custom-input');
    inputs.forEach(input => input.value = '');
    
    // 2. Обновляем итоговый результат (возвращаем плейсхолдер)
    generateBiblio();

    // 3. Визуальный фидбек: меняем текст иконки на кнопке
    const btn = document.getElementById('bibClearBtn');
    if (!btn) return;
    
    const originalHtml = btn.innerHTML; // Запоминаем исходный HTML с корзинкой
    
    // Вставляем иконку галочки и текст "Öçirildi"
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> <span>Öçirildi</span>`;
    
    // Через 1.5 секунды возвращаем оригинальную корзинку
    setTimeout(() => {
        btn.innerHTML = originalHtml;
    }, 1500);
}

// === ЛОГИКА ФОРМЫ ЗАКАЗА РЕКЛАМЫ (TELEGRAM BOT) ===

// ВАШИ ДАННЫЕ (ВСТАВЬТЕ СВОИ ЗНАЧЕНИЯ)
const TG_BOT_TOKEN = "8720893006:AAGSev8YHwdFTyBd1y7frEeOAQDEd9ZuVnw";
const TG_CHAT_ID = "1674718";

function openAdOrderModal(event) {
    if (event) event.preventDefault();
    const modal = document.getElementById('adOrderModalBackdrop');
    if (modal) modal.classList.add('open');
}

function closeAdOrderModal() {
    const modal = document.getElementById('adOrderModalBackdrop');
    if (modal) modal.classList.remove('open');
}

// Изменение стиля кнопки при выборе картинки
function handleAdFileSelect(input) {
    const label = document.getElementById('adFileLabel');
    if (input.files && input.files[0]) {
        label.classList.add('file-selected');
        label.querySelector('span').textContent = `Fayl: ${input.files[0].name}`;
    } else {
        label.classList.remove('file-selected');
        label.querySelector('span').textContent = "Banner rasmini yuklang (PNG, JPG, GIF)";
    }
}

// Отправка формы
async function submitAdOrder(event) {
    event.preventDefault(); // Останавливаем перезагрузку страницы
    
    const fileInput = document.getElementById('adBannerFile');
    const file = fileInput.files[0];
    const submitBtn = document.getElementById('adSubmitBtn');
    
    if (!file) return alert("Iltimos, banner rasmini yuklang!");

    // 1. ПРОВЕРКА РАЗРЕШЕНИЯ КАРТИНКИ (2560x844)
    const img = new Image();
    img.src = URL.createObjectURL(file);
    
    img.onload = async function() {
        if (img.width !== 2560 || img.height !== 844) {
            alert(`Xatolik! Rasm o'lchami aynan 2560x844 px bo'lishi kerak.\nSiz yuklagan rasm: ${img.width}x${img.height} px`);
            return;
        }

        // Если разрешение правильное - начинаем отправку
        submitBtn.innerHTML = `<span>Yuborilmoqda... Kuting</span>`;
        submitBtn.style.opacity = "0.7";
        submitBtn.disabled = true;

        // Собираем данные
        const name = document.getElementById('adName').value;
        const phone = document.getElementById('adPhone').value;
        const org = document.getElementById('adOrg').value;
        const tariff = document.getElementById('adTariff').value;

        const messageText = `🔥 <b>YANGI REKLAMA BUYURTMASI</b>\n\n` +
                            `👤 <b>Ism:</b> ${name}\n` +
                            `📞 <b>Aloqa:</b> ${phone}\n` +
                            `🏢 <b>Tashkilot:</b> ${org}\n` +
                            `💰 <b>Tarif:</b> ${tariff}\n\n` +
                            `✅ <i>Shartlarga rozi bo'ldi va javobgarlikni oldi.</i>`;

        try {
            // ОТПРАВЛЯЕМ ТЕКСТ
            const textResponse = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TG_CHAT_ID,
                    text: messageText,
                    parse_mode: 'HTML'
                })
            });
            if (!textResponse.ok) throw new Error("Matn yuborishda xatolik");

            // ОТПРАВЛЯЕМ КАРТИНКУ КАК ФАЙЛ (ЧТОБЫ НЕ ПОРТИЛОСЬ КАЧЕСТВО)
            const formData = new FormData();
            formData.append('chat_id', TG_CHAT_ID);
            formData.append('document', file);

            const fileResponse = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendDocument`, {
                method: 'POST',
                body: formData
            });
            if (!fileResponse.ok) throw new Error("Fayl yuborishda xatolik");

            // Успех! Показываем галочку
            submitBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg><span>Muvaffaqiyatli yuborildi!</span>`;
            submitBtn.style.background = "#10B981";
            
            // Через 2.5 секунды всё сбрасываем и закрываем окно
            setTimeout(() => {
                document.getElementById('adOrderForm').reset();
                handleAdFileSelect(fileInput);
                closeAdOrderModal();
                
                submitBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg><span>So'rovni yuborish</span>`;
                submitBtn.style.background = "#0284C7";
                submitBtn.style.opacity = "1";
                submitBtn.disabled = false;
            }, 2500);

        } catch (error) {
            console.error(error);
            alert("Xatolik yuz berdi. Iltimos qaytadan urinib ko'ring.");
            submitBtn.innerHTML = `<span>So'rovni yuborish</span>`;
            submitBtn.style.opacity = "1";
            submitBtn.disabled = false;
        }
    };
}
