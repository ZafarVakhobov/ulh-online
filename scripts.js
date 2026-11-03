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

window.extractedFileText = ""; // Глобальная переменная для хранения текста

async function handleSelectedFile(file) {
    const fileInfo = document.getElementById('fileInfo');
    const saveBtn = document.getElementById('saveBtn');
    const savePdfBtn = document.getElementById('savePdfBtn');
    const plagiatBtn = document.getElementById('plagiatResultBtn');
    const plagiatToggle = document.getElementById('plagiatToggleInput');
    const pdfStage = document.getElementById('pdfRenderStage');

    if (!fileInfo || !saveBtn || !savePdfBtn || !pdfStage) return;

    saveBtn.style.display = 'none';
    savePdfBtn.style.display = 'none';
    if (plagiatBtn) plagiatBtn.style.display = 'none';
    
    processedBlob = null;
    window.extractedFileText = ""; // Очищаем перед новым файлом
    pdfStage.innerHTML = "";

    const dotIndex = file.name.lastIndexOf('.');
    const baseName = (dotIndex !== -1) ? file.name.substring(0, dotIndex) : file.name;
    processedOutName = (dotIndex !== -1) ? baseName + "_yangi" + file.name.substring(dotIndex) : "yangi_" + file.name;
    processedPdfName = baseName + "_yangi.pdf";

    const ext = file.name.split('.').pop().toLowerCase();
    fileInfo.style.color = "#3B82F6";
    fileInfo.innerText = "Konvertatsiya qilinmoqda: " + file.name + "...";

    try {
        if (ext === 'txt') {
            const text = await file.text();
            window.extractedFileText = text; // Сохраняем для антиплагиата
            const converted = applyReplacements(text);
            processedMimeType = "text/plain;charset=utf-8";
            processedBlob = new Blob([converted], { type: processedMimeType });

            const txtDiv = document.createElement('div');
            txtDiv.className = "pdf-page-section";
            txtDiv.style.cssText = "width: 595.3pt; min-height: 841.9pt; padding: 42pt 48pt; background: #FFFFFF; white-space: pre-wrap; color: #0F172A;";
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
                            // ИЗВЛЕЧЕНИЕ ТЕКСТА: Собираем текст из XML тегов без разметки
                            const textMatches = xmlContent.match(/>([^<]+)</g);
                            if (textMatches && window.extractedFileText.length < 8000) { 
                                // Ограничиваем до 8000 символов, чтобы не перегрузить ИИ
                                window.extractedFileText += textMatches.map(m => m.slice(1, -1)).join(' ') + " ";
                            }

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

            processedBlob = await zip.generateAsync({ type: "blob", mimeType: processedMimeType, compression: "DEFLATE" });
            await prepareOfficePdfStage(ext, processedBlob, zip, pdfStage);
        } else {
            throw new Error("Noto'g'ri format");
        }

        // ... (код конвертации файла) ...
        
        fileInfo.style.color = "#10B981";
        fileInfo.innerText = "Tayyor: " + processedOutName;
        saveBtn.style.display = 'inline-flex';
        savePdfBtn.style.display = 'inline-flex';
        
        // НОВОЕ: Показываем кнопку конспекта
        const summaryBtn = document.getElementById('summaryResultBtn');
        if (summaryBtn) summaryBtn.style.display = 'inline-flex';
        
        if (plagiatToggle && plagiatToggle.checked && plagiatBtn) {
            plagiatBtn.style.display = 'inline-flex';
        }

    } catch (err) {
        fileInfo.style.color = "#E11D48";
        fileInfo.innerText = "Xatolik: " + err.message;
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
    
    // Снимаем класс "active" с обычных цветных точек
    document.querySelectorAll(".qr-color-dot").forEach(btn => {
        btn.classList.toggle("active", btn.getAttribute("data-color") === colorHex);
    });
    
    // Снимаем подсветку с круглой кнопки кастомной палитры
    const customWrap = document.querySelector(".qr-custom-color-wrap");
    if (customWrap) customWrap.classList.remove("active-custom");

    // Синхронизируем выбранный цвет со скрытым полем ввода типа color
    const colorInput = document.getElementById("qrCustomColorInput");
    if (colorInput) colorInput.value = colorHex;

    renderQrCodePreview();
}

// Функция обработки выбора кастомного цвета через палитру
function selectCustomQrColor(colorHex) {
    currentQrColor = colorHex;

    // Снимаем активность со всех стандартных круглых точек (синей, черной и т.д.)
    document.querySelectorAll(".qr-color-dot").forEach(btn => {
        btn.classList.remove("active");
    });

    // Добавляем красивую рамку-обводку на градиентную кнопку палитры
    const customWrap = document.querySelector(".qr-custom-color-wrap");
    if (customWrap) customWrap.classList.add("active-custom");

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
    // 1. ОСНОВНОЙ БАННЕР (Отображается по умолчанию, когда нет праздников)
    main: {
        id: "main",
        src: "./header.png",
        alt: "Uzbek Latin Helper — Asosiy banner",
        action: "link",
        href: "https://ulh-online.uz/"
    },

    // 2. БАННЕР ВАШЕГО БОТА
    bot: {
        id: "bot",
        src: "./banner-bot.png",
        alt: "Uzbek Latin Helper Telegram boti",
        action: "link",
        href: "https://t.me/UzbekLatinAppBot",
        target: "_blank"
    },
    
    // 3. БАННЕР "ЗАКАЗАТЬ РЕКЛАМУ" (Всегда последний, открывает окно тарифов)
    ads: {
        id: "ads",
        src: "./banner-ads.png",
        alt: "Saytda reklama joylaştiriş — Tariflar bilan tanişing",
        action: "modal"
    },

    // 4. ЗАКАЗНЫЕ БАННЕРЫ ОТ КЛИЕНТОВ (Платная реклама с автоматическим снятием)
    customAds: [
        {
            id: "ad_client1",
            src: "./banner-client1.png",      // Картинка баннера (загрузите в корень сайта)
            alt: "Dastur",       // Описание для слепых и поисковиков
            action: "link",
            href: "https://t.me/ulh_releases/16",   // Ссылка на сайт или канал клиента
            target: "_blank",                 // Открывать в новом окне
            startDate: "2026-10-31",          // Дата НАЧАЛА показа (включительно, ГГГГ-ММ-ДД)
            endDate: "2026-12-31"             // Дата ОКОНЧАНИЯ показа (включительно, ГГГГ-ММ-ДД)
        }
    ],

    // 5. ПРАЗДНИКИ УЗБЕКИСТАНА (Авто-замена основного баннера по датам)
    holidays: [
        {
            id: "new_year",
            name: "Yangi yil bayrami",
            src: "./banner-newyear.png",
            // С 24 декабря (00:00) по 13 января (23:59)
            check: (m, d) => (m === 12 && d >= 24) || (m === 1 && d <= 13)
        },
        {
            id: "defenders_day",
            name: "14-yanvar — Vatan himoyaçilari kuni",
            src: "./banner-14jan.png",
            // Только 14 января
            check: (m, d) => (m === 1 && d === 14)
        },
        {
            id: "womens_day",
            name: "8-mart — Xalqaro xotin-qizlar kuni",
            src: "./banner-8march.png",
            // С 6 по 9 марта
            check: (m, d) => m === 3 && (d >= 6 && d <= 9)
        },
        {
            id: "navruz",
            name: "21-mart — Navröz bayrami",
            src: "./banner-navruz.png",
            // С 19 по 23 марта
            check: (m, d) => m === 3 && (d >= 19 && d <= 23)
        },
        {
            id: "memory_day",
            name: "9-may — Xotira va qadrlaş kuni",
            src: "./banner-9may.png",
            // С 7 по 10 мая
            check: (m, d) => m === 5 && (d >= 7 && d <= 10)
        },
        {
            id: "independence_day",
            name: "Mustaqillik bayrami",
            src: "./banner-mustaqillik.png",
            // С 30 августа (00:00) по 3 сентября (23:59)
            check: (m, d) => (m === 8 && d >= 30) || (m === 9 && d <= 3)
        },
        {
            id: "teachers_day",
            name: "1-oktabr — Öqituvçi va murabbiylar kuni",
            src: "./banner-1oct.png",
            // С 29 сентября по 2 октября
            check: (m, d) => (m === 9 && d >= 29) || (m === 10 && d <= 2)
        },
        {
            id: "constitution_day",
            name: "8-dekabr — Özbekiston Respublikasi Konstitutsiyasi kuni",
            src: "./banner-8dec.png",
            // С 6 по 9 декабря
            check: (m, d) => m === 12 && (d >= 6 && d <= 9)
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
    // Получаем текущую дату по Ташкенту
    const { year, month, day } = getTashkentDateParts();
    
    // Формируем сегодняшнюю дату в формате "YYYY-MM-DD" для сравнения с заказными баннерами
    const todayStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // Ищем активный праздник на сегодня
    const activeHoliday = BANNER_CONFIG.holidays.find(h => h.check(month, day));

    // Выбираем платные баннеры, у которых сегодня входит в срок аренды
    const activeCustomAds = (BANNER_CONFIG.customAds || []).filter(ad => {
        return todayStr >= ad.startDate && todayStr <= ad.endDate;
    });

    let slides = []; 

    // СЛАЙД 1: Праздничный (если есть) ИЛИ Основной
    if (activeHoliday) {
        slides.push({
            id: activeHoliday.id,
            src: activeHoliday.src,
            alt: activeHoliday.name,
            action: "link",
            href: "https://ulh-online.uz/"
        });
    } else {
        slides.push(BANNER_CONFIG.main);
    }

    // СЛАЙД 2: Ваш Telegram-бот
    slides.push(BANNER_CONFIG.bot);

    // СЛАЙД 3 (и далее): Оплаченная реклама клиентов (если их даты актуальны)
    slides = slides.concat(activeCustomAds);

    // ПОСЛЕДНИЙ СЛАЙД: Кнопка "Заказать рекламу"
    slides.push(BANNER_CONFIG.ads);

    return slides;
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
            
            // Если в настройках баннера указан target, применяем его
            if (slide.target) {
                slideEl.setAttribute("target", slide.target);
                slideEl.setAttribute("rel", "noopener"); // для безопасности
            }
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
        case 'cny': return isFrac ? 'fin' : 'yuan';
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

// Ваши точные данные
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

async function submitAdOrder(event) {
    event.preventDefault(); 
    
    const fileInput = document.getElementById('adBannerFile');
    const file = fileInput.files[0];
    const submitBtn = document.getElementById('adSubmitBtn');
    
    if (!file) return alert("Iltimos, banner rasmini yuklang!");

    const img = new Image();
    img.src = URL.createObjectURL(file);
    
    img.onload = async function() {
        if (img.width !== 2560 || img.height !== 844) {
            alert(`Xatolik! Rasm ölçami aynan 2560x844 px bölişi kerak.\nSiz yuklagan rasm: ${img.width}x${img.height} px`);
            return;
        }

        submitBtn.innerHTML = `<span>Yuborilmoqda... Kuting</span>`;
        submitBtn.style.opacity = "0.7";
        submitBtn.disabled = true;

        const name = document.getElementById('adName').value;
        const phone = document.getElementById('adPhone').value;
        const org = document.getElementById('adOrg').value;
        const url = document.getElementById('adUrl').value; // <-- Получаем ссылку
        const tariff = document.getElementById('adTariff').value;

        const messageText = `🔥 <b>YANGI REKLAMA BUYURTMASI</b>\n\n` +
                            `👤 <b>Ism:</b> ${name}\n` +
                            `📞 <b>Aloqa:</b> ${phone}\n` + 
                            `🏢 <b>Taşkilot:</b> ${org}\n` +
                            `🔗 <b>Havola:</b> ${url}\n` + // <-- Вставляем ссылку в сообщение 
                            `💰 <b>Tarif:</b> ${tariff}\n\n` +
                            `✅ <i>Şartlarga rozi böldi va javobgarlikni oldi.</i>`;

        try {
            // Отправляем текст
            const textResponse = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TG_CHAT_ID,
                    text: messageText,
                    parse_mode: 'HTML'
                })
            });
            
            if (!textResponse.ok) {
                const errData = await textResponse.json();
                throw new Error(`Telegram API xatosi (Matn): ${errData.description}`);
            }

            // Отправляем файл
            const formData = new FormData();
            formData.append('chat_id', TG_CHAT_ID);
            formData.append('document', file);

            const fileResponse = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendDocument`, {
                method: 'POST',
                body: formData
            });
            
            if (!fileResponse.ok) {
                const errData = await fileResponse.json();
                throw new Error(`Telegram API xatosi (Fayl): ${errData.description}`);
            }

            // Визуальный успех
            submitBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg><span>Muvaffaqiyatli yuborildi!</span>`;
            submitBtn.style.background = "#10B981";
            
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
            console.error("Yuborishda xatolik:", error);
            alert("Xatolik yuz berdi. Iltimos qaytadan urinib köring.\nSabab: " + error.message);
            submitBtn.innerHTML = `<span>Sörovni yuborish</span>`;
            submitBtn.style.opacity = "1";
            submitBtn.disabled = false;
        }
    };
}

// === АВТО-КАСТОМИЗАЦИЯ ВСЕХ ВЫПАДАЮЩИХ СПИСКОВ (<SELECT>) ===
function initCustomSelects() {
    // Находим все селекты на сайте
    const selects = document.querySelectorAll('select');

    selects.forEach(select => {
        // Если уже кастомизирован - пропускаем
        if (select.nextElementSibling && select.nextElementSibling.classList.contains('custom-select-wrapper')) return;

        // Скрываем стандартный селект, но оставляем его в DOM для работы ваших функций
        select.style.display = 'none';

        // Создаем обертку
        const wrapper = document.createElement('div');
        wrapper.className = 'custom-select-wrapper';
        
// Если у селекта есть класс calc-currency-select (в калькуляторе) или num-words-select (для суммы),
// не даем скрипту растягивать его на 100%
if (select.classList.contains('ai-tool-select') || select.classList.contains('calc-currency-select') || select.classList.contains('num-words-select')) {
    wrapper.style.width = 'auto';
} else {
    wrapper.style.width = select.style.width || '100%';
}
        
        if (select.style.flexShrink) wrapper.style.flexShrink = select.style.flexShrink;

        // Визуальная кнопка (копирует ВАШИ классы и стили оригинала)
        const trigger = document.createElement('div');
        trigger.className = select.className; // Наследуем классы (например, bib-custom-input)
        trigger.classList.add('custom-select-trigger');
        trigger.style.cssText = select.style.cssText; // Наследуем инлайн-стили
        trigger.style.display = 'flex'; // Принудительно ставим flex для текста
        
        const selectedText = select.options[select.selectedIndex]?.text || "";
        trigger.innerHTML = `<span class="custom-select-text">${selectedText}</span>`;

        // Выпадающее меню
        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'custom-select-options';

        // Заполняем вариантами
        Array.from(select.options).forEach(option => {
            // Пропускаем некликабельные плейсхолдеры (например, "Tarifni tanlang")
            if (option.disabled && !option.value) return; 
            
            const optDiv = document.createElement('div');
            optDiv.className = 'custom-select-option';
            optDiv.textContent = option.text;
            
            optDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // Меняем значение в оригинальном скрытом селекте
                select.value = option.value;
                trigger.querySelector('.custom-select-text').textContent = option.text;
                optionsDiv.classList.remove('open');
                
                // Эмулируем стандартное событие onchange для запуска ваших функций
                select.dispatchEvent(new Event('change', { bubbles: true }));
            });
            optionsDiv.appendChild(optDiv);
        });

        // Открытие/закрытие меню
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            // Закрываем другие открытые меню
            document.querySelectorAll('.custom-select-options.open').forEach(el => {
                if (el !== optionsDiv) el.classList.remove('open');
            });
            optionsDiv.classList.toggle('open');
        });

        // Вставляем новые элементы на страницу
        wrapper.appendChild(trigger);
        wrapper.appendChild(optionsDiv);
        select.parentNode.insertBefore(wrapper, select.nextSibling);

        // Умная синхронизация: если ваш скрипт меняет select.value извне, обновляем текст кнопки
        const originalSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
        Object.defineProperty(select, 'value', {
            set: function(val) {
                originalSetter.call(this, val);
                const newText = this.options[this.selectedIndex]?.text || "";
                trigger.querySelector('.custom-select-text').textContent = newText;
            },
            get: function() {
                return Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').get.call(this);
            }
        });
    });

    // Закрываем меню при клике в любое пустое место сайта
    document.addEventListener('click', () => {
        document.querySelectorAll('.custom-select-options.open').forEach(el => el.classList.remove('open'));
    });
}

// Запускаем скрипт сразу и для подстраховки после загрузки контента
initCustomSelects();
document.addEventListener('DOMContentLoaded', initCustomSelects);

// Открытие / закрытие кастомной палитры QR
function toggleQrCustomPalette(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    const wrap = document.getElementById("qrCustomColorWrap");
    if (wrap) wrap.classList.toggle("open");
}

// Закрытие палитры при клике вне её
document.addEventListener("click", (e) => {
    const wrap = document.getElementById("qrCustomColorWrap");
    if (wrap && !wrap.contains(e.target)) {
        wrap.classList.remove("open");
    }
});

// Применение цвета из текстового инпута (HEX)
function applyHexColorFromInput(hexVal) {
    if (!hexVal.startsWith("#")) hexVal = "#" + hexVal;
    if (/^#[0-9A-Fa-f]{6}$/.test(hexVal)) {
        currentQrColor = hexVal;
        
        // Снимаем активность с точек
        document.querySelectorAll(".qr-color-dot").forEach(b => b.classList.remove("active"));
        const btn = document.querySelector(".qr-custom-color-btn");
        if (btn) btn.classList.add("active-custom");

        // Синхронизируем с нативным пикером
        const nativePicker = document.getElementById("qrNativeColorPicker");
        if (nativePicker) nativePicker.value = hexVal;

        renderQrCodePreview();
    }
}

// Применение цвета через встроенный выбор палитры
function applyNativeColorPicker(hexVal) {
    const hexInput = document.getElementById("qrHexInput");
    if (hexInput) hexInput.value = hexVal;
    applyHexColorFromInput(hexVal);
}

// Клик по готовому пресету в палитре
function selectPresetHex(hexVal) {
    const hexInput = document.getElementById("qrHexInput");
    const nativePicker = document.getElementById("qrNativeColorPicker");
    if (hexInput) hexInput.value = hexVal;
    if (nativePicker) nativePicker.value = hexVal;
    applyHexColorFromInput(hexVal);
    
    // Закрываем палитру после выбора
    const wrap = document.getElementById("qrCustomColorWrap");
    if (wrap) wrap.classList.remove("open");
}


document.addEventListener('DOMContentLoaded', () => {
    // Создаем тултип
    const tooltip = document.createElement('div');
    tooltip.id = 'ulh-tooltip';
    document.body.appendChild(tooltip);

    // Находим все элементы с title
    const elementsWithTitle = document.querySelectorAll('[title]');

    elementsWithTitle.forEach(el => {
        el.addEventListener('mouseenter', function(e) {
            const titleText = this.getAttribute('title');
            if (titleText) {
                // Прячем системный title
                this.setAttribute('data-ulh-title', titleText);
                this.removeAttribute('title');
                
                // УМНАЯ ПРОВЕРКА ТЕМЫ: 
                // Смотрим, есть ли класс dark у самого элемента, его родителей, тега html или body
                // Также проверяем атрибут data-theme (часто используется в современных фреймворках)
                const isDark = this.closest('.dark') !== null || 
                               document.documentElement.classList.contains('dark') || 
                               document.documentElement.getAttribute('data-theme') === 'dark' ||
                               document.body.classList.contains('dark');
                
                if (isDark) {
                    tooltip.classList.add('ulh-dark-mode');
                } else {
                    tooltip.classList.remove('ulh-dark-mode');
                }
                
                tooltip.textContent = titleText;
                tooltip.classList.add('show');
                updatePosition(e);
            }
        });

        el.addEventListener('mousemove', (e) => {
            requestAnimationFrame(() => updatePosition(e));
        });

        el.addEventListener('mouseleave', function() {
            const storedTitle = this.getAttribute('data-ulh-title');
            if (storedTitle) {
                // Возвращаем системный title на место
                this.setAttribute('title', storedTitle);
                this.removeAttribute('data-ulh-title');
                
                tooltip.classList.remove('show');
            }
        });
    });

    function updatePosition(e) {
        // Отступ 15px, чтобы мышка не перекрывала текст
        tooltip.style.transform = `translate(${e.clientX + 15}px, ${e.clientY + 15}px)`;
    }
});

/* ========================================== */
/* === ЛОГИКА KANBAN ДОСКИ (ОКНО + ЗАДАЧИ) === */
/* ========================================== */
document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. ЛОГИКА ОТКРЫТИЯ/ЗАКРЫТИЯ ОКНА ---
    const kanbanBtn = document.getElementById('kanban-toggle-btn');
    const kanbanModal = document.getElementById('kanban-modal');
    const kanbanCloseBtn = document.getElementById('kanban-close-btn');

    if (kanbanBtn && kanbanModal && kanbanCloseBtn) {
        kanbanBtn.addEventListener('click', () => kanbanModal.classList.add('open'));
        kanbanCloseBtn.addEventListener('click', () => kanbanModal.classList.remove('open'));
        kanbanModal.addEventListener('click', (e) => {
            if (e.target === kanbanModal) kanbanModal.classList.remove('open');
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && kanbanModal.classList.contains('open')) {
                kanbanModal.classList.remove('open');
            }
        });
    }

    // --- 2. ЛОГИКА ДОСКИ И ПЕРЕТАСКИВАНИЯ ---
    let tasks = JSON.parse(localStorage.getItem('ulh-kanban-tasks')) || [];

    const renderTasks = () => {
        document.querySelectorAll('.task-list').forEach(list => list.innerHTML = '');
        const counts = { todo: 0, inprogress: 0, done: 0 };

        tasks.forEach(task => {
            counts[task.status]++;
            const taskEl = document.createElement('div');
            taskEl.className = `kanban-task ${task.status}`;
            taskEl.draggable = true;
            taskEl.dataset.id = task.id;
            taskEl.innerHTML = `
                ${task.text}
                <span class="delete-task" title="Öçiriş">×</span>
            `;
            
            taskEl.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', task.id);
                setTimeout(() => taskEl.style.opacity = '0.4', 0);
            });
            
            taskEl.addEventListener('dragend', () => taskEl.style.opacity = '1');

            taskEl.querySelector('.delete-task').addEventListener('click', () => {
                tasks = tasks.filter(t => t.id !== task.id);
                saveAndRender();
            });

            const targetList = document.getElementById(`list-${task.status}`);
            if (targetList) targetList.appendChild(taskEl);
        });

        document.getElementById('count-todo').innerText = counts.todo;
        document.getElementById('count-inprogress').innerText = counts.inprogress;
        document.getElementById('count-done').innerText = counts.done;
    };

    const saveAndRender = () => {
        localStorage.setItem('ulh-kanban-tasks', JSON.stringify(tasks));
        renderTasks();
    };

    document.querySelectorAll('.task-list').forEach(list => {
        list.addEventListener('dragover', (e) => {
            e.preventDefault();
            list.classList.add('drag-over');
        });
        list.addEventListener('dragleave', () => list.classList.remove('drag-over'));
        list.addEventListener('drop', (e) => {
            e.preventDefault();
            list.classList.remove('drag-over');
            const taskId = e.dataTransfer.getData('text/plain');
            const newStatus = list.parentElement.dataset.status;
            
            const taskIndex = tasks.findIndex(t => t.id === taskId);
            if (taskIndex !== -1 && tasks[taskIndex].status !== newStatus) {
                tasks[taskIndex].status = newStatus;
                saveAndRender();
            }
        });
    });

    document.querySelectorAll('.add-task-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const status = btn.parentElement.dataset.status;
            const text = prompt("Yangi vazifani kiriting:");
            if (text && text.trim() !== '') {
                tasks.push({
                    id: Date.now().toString(),
                    text: text.trim(),
                    status: status
                });
                saveAndRender();
            }
        });
    });

    renderTasks();
});


/* ========================================== */
/* === ЛОГИКА МЕНЕДЖЕРА ИСТОЧНИКОВ (MANBALAR) === */
/* ========================================== */
document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. Открытие/Закрытие окна ---
    const srcBtn = document.getElementById('sources-toggle-btn');
    const srcModal = document.getElementById('sources-modal');
    const srcCloseBtn = document.getElementById('sources-close-btn');

    if (srcBtn && srcModal && srcCloseBtn) {
        srcBtn.addEventListener('click', () => srcModal.classList.add('open'));
        srcCloseBtn.addEventListener('click', () => srcModal.classList.remove('open'));
        srcModal.addEventListener('click', (e) => {
            if (e.target === srcModal) srcModal.classList.remove('open');
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && srcModal.classList.contains('open')) srcModal.classList.remove('open');
        });
    }

    // --- 2. Динамическое переключение полей (Print vs Web) ---
    const journalInput = document.getElementById('src-journal');
    const printFields = document.getElementById('print-fields');
    const webFields = document.getElementById('web-fields');
    const dateInput = document.getElementById('src-date');

    if (journalInput && printFields && webFields && dateInput) {
        journalInput.addEventListener('input', (e) => {
            const val = e.target.value.trim().toLowerCase();
            // Если введено http:// или https://
            if (val.startsWith('http://') || val.startsWith('https://')) {
                printFields.style.display = 'none';
                webFields.style.display = 'block';
                // Если дата еще не выбрана, ставим сегодняшнюю
                if (!dateInput.value) {
                    dateInput.valueAsDate = new Date();
                }
            } else {
                printFields.style.display = 'flex';
                webFields.style.display = 'none';
            }
        });
    }

    // --- Функция правильного форматирования текста (ВАК) ---
    const formatSourceText = (src) => {
        let text = `${src.author ? src.author + ' ' : ''}${src.title} // ${src.journal}.`;
        
        if (src.isWeb) {
            // Форматируем дату из YYYY-MM-DD в DD.MM.YYYY
            let dateStr = src.accessDate || '';
            if (dateStr.includes('-')) {
                const parts = dateStr.split('-');
                dateStr = `${parts[2]}.${parts[1]}.${parts[0]}`; 
            }
            
            // Подставляем язык для даты обращения
            let accessText = `(murojaat qilingan sana: ${dateStr})`;
            if (src.lang === 'ru') accessText = `(дата обращения: ${dateStr})`;
            else if (src.lang === 'en') accessText = `(accessed: ${dateStr})`;
            
            text += ` – ${accessText}.`;
        } else {
            // Подставляем язык для страниц
            let pagePrefix = 'S.';
            if (src.lang === 'ru') pagePrefix = 'Стр.';
            else if (src.lang === 'en') pagePrefix = 'P.';
            
            text += ` – ${src.year}.` + (src.pages ? ` – ${pagePrefix} ${src.pages}.` : '');
        }
        return text;
    };

    // --- 3. База данных и Отрисовка ---
    let academicSources = JSON.parse(localStorage.getItem('ulh-academic-sources')) || [];
    
    const renderSources = () => {
        const list = document.getElementById('sources-list');
        if (!list) return;
        
        list.innerHTML = '';
        const countEl = document.getElementById('sources-count');
        if (countEl) countEl.innerText = academicSources.length;

        [...academicSources].reverse().forEach(src => {
            const card = document.createElement('div');
            card.className = 'source-card dark:bg-slate-800 dark:border-slate-700';
            card.style.position = 'relative'; 
            card.style.padding = '12px';
            card.style.paddingRight = '36px'; 
            card.style.background = '#ffffff';
            card.style.border = '1px solid #e2e8f0';
            card.style.borderRadius = '8px';
            card.style.marginBottom = '12px';
            card.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
            
            // Получаем отформатированный текст через нашу функцию
            const vakFormat = formatSourceText(src);
            
            let quoteHtml = '';
            if (src.quote) {
                quoteHtml = `<div style="margin-top: 8px; padding: 8px; background: #f1f5f9; border-left: 3px solid #3b82f6; font-size: 12px; color: #475569; font-style: italic;" class="dark:bg-slate-900 dark:text-slate-400 dark:border-blue-500">«${src.quote}»</div>`;
            }

            card.innerHTML = `
                <div style="font-size: 13px; font-weight: 600; color: #1e293b; line-height: 1.4;" class="dark:text-white">${vakFormat}</div>
                ${quoteHtml}
                <button class="delete-src-btn" data-id="${src.id}" style="position: absolute; top: 12px; right: 12px; background: rgba(239, 68, 68, 0.1); border: none; color: #ef4444; cursor: pointer; font-size: 16px; font-weight: bold; width: 24px; height: 24px; border-radius: 6px; display: flex; align-items: center; justify-content: center; line-height: 1; transition: background 0.2s;">×</button>
            `;
            list.appendChild(card);
        });

        document.querySelectorAll('.delete-src-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                academicSources = academicSources.filter(s => s.id !== id);
                localStorage.setItem('ulh-academic-sources', JSON.stringify(academicSources));
                renderSources();
            });
        });
    };

    // --- 4. Сохранение ---
    const saveBtn = document.getElementById('save-source-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const lang = document.getElementById('src-lang').value; 
            const author = document.getElementById('src-author').value.trim();
            const title = document.getElementById('src-title').value.trim();
            const journal = document.getElementById('src-journal').value.trim();
            const year = document.getElementById('src-year').value.trim();
            const pages = document.getElementById('src-pages').value.trim();
            const quote = document.getElementById('src-quote').value.trim();
            
            // Определяем, был ли это веб-источник
            const isWeb = webFields && webFields.style.display === 'block';
            const accessDate = dateInput ? dateInput.value : '';

            if (!title) {
                alert("Iltimos, maqola yoki kitob nomini kiriting!");
                return;
            }

            const newSource = {
                id: Date.now().toString(),
                lang, author, title, journal, year, pages, quote, isWeb, accessDate
            };

            academicSources.push(newSource);
            localStorage.setItem('ulh-academic-sources', JSON.stringify(academicSources));
            renderSources();

            // Очищаем форму
            document.querySelectorAll('.src-input:not(#src-lang)').forEach(input => input.value = '');
            // Возвращаем поля в исходное состояние (печатный вид)
            if (printFields && webFields) {
                printFields.style.display = 'flex';
                webFields.style.display = 'none';
            }
        });
    }

    // --- 5. Экспорт ---
    const exportBtn = document.getElementById('export-vak-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            if (academicSources.length === 0) return;
            
            const sortedSources = [...academicSources].sort((a, b) => {
                const nameA = a.author || a.title;
                const nameB = b.author || b.title;
                return nameA.localeCompare(nameB);
            });

            let finalList = "FOYDALANILGAN ADABIYOTLAR RÖYXATI:\n\n";
            sortedSources.forEach((src, index) => {
                finalList += `${index + 1}. ${formatSourceText(src)}\n`;
            });

            navigator.clipboard.writeText(finalList).then(() => {
                const originalText = exportBtn.innerText;
                exportBtn.innerText = "Nusxalandi! ✓";
                exportBtn.style.background = "#059669";
                setTimeout(() => {
                    exportBtn.innerText = originalText;
                    exportBtn.style.background = "#10B981";
                }, 2000);
            });
        });
    }

    renderSources();
});

/* ========================================== */
/* === ЛОГИКА POMODORO ТАЙМЕРА === */
/* ========================================== */
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Окно таймера
    const pomBtn = document.getElementById('pomodoro-toggle-btn');
    const pomModal = document.getElementById('pomodoro-modal');
    const pomCloseBtn = document.getElementById('pomodoro-close-btn');

    if (pomBtn && pomModal && pomCloseBtn) {
        pomBtn.addEventListener('click', () => pomModal.classList.add('open'));
        pomCloseBtn.addEventListener('click', () => pomModal.classList.remove('open'));
        pomModal.addEventListener('click', (e) => {
            if (e.target === pomModal) pomModal.classList.remove('open');
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && pomModal.classList.contains('open')) pomModal.classList.remove('open');
        });
    }

    // 2. Логика самого времени
    let timerInterval = null;
    let timeLeft = 25 * 60; // 25 минут в секундах
    let isRunning = false;
    let currentDuration = 25 * 60;

    const display = document.getElementById('pomodoro-display');
    const startBtn = document.getElementById('pom-start-btn');
    const resetBtn = document.getElementById('pom-reset-btn');
    const modeBtns = document.querySelectorAll('.pom-mode-btn');

    // Функция звукового сигнала (использует встроенный синтезатор браузера)
    const playBeep = () => {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            osc.type = 'sine'; // Мягкий звук
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.3); // Звучит 0.3 секунды
        } catch (e) {
            console.log("Audio API is not supported in this browser");
        }
    };

    const updateDisplay = () => {
        if (!display) return;
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        // Добавляем нули, если цифра меньше 10
        display.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        // Также обновляем заголовок вкладки браузера, чтобы было видно время, даже если окно свернуто!
        if (isRunning) {
            document.title = `(${display.textContent}) ULH Online`;
        } else {
            document.title = `ULH Online`;
        }
    };

    const stopTimer = () => {
        clearInterval(timerInterval);
        isRunning = false;
        if(startBtn) {
            startBtn.textContent = 'Boşlaş';
            startBtn.style.background = '#ef4444';
        }
        document.title = `ULH Online`;
    };

    const startTimer = () => {
        if (isRunning) {
            stopTimer(); // Если уже идет - ставим на паузу
            return;
        }
        
        isRunning = true;
        if(startBtn) {
            startBtn.textContent = 'Töxtatiş';
            startBtn.style.background = '#f59e0b'; // Желтый цвет для паузы
        }

        timerInterval = setInterval(() => {
            if (timeLeft > 0) {
                timeLeft--;
                updateDisplay();
            } else {
                // Время вышло!
                stopTimer();
                playBeep();
                // Возвращаем изначальное время текущего режима
                timeLeft = currentDuration; 
                updateDisplay();
                alert("Vaqt tugadi! Dam oling yoki işni davom ettiring."); // Уведомление
            }
        }, 1000);
    };

    if (startBtn) startBtn.addEventListener('click', startTimer);
    
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            stopTimer();
            timeLeft = currentDuration;
            updateDisplay();
        });
    }

    // Переключение режимов (25, 5, 15)
    modeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Убираем класс active у всех и даем нажатой
            modeBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');

            // Меняем время
            const mins = parseInt(e.target.getAttribute('data-time'));
            currentDuration = mins * 60;
            timeLeft = currentDuration;
            
            stopTimer();
            updateDisplay();
        });
    });

    // Первичная отрисовка
    updateDisplay();
});

/* ========================================== */
/* === ЛОГИКА БЫСТРЫХ ЗАМЕТОК (RICH TEXT) === */
/* ========================================== */
document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. Открытие/Закрытие окна ---
    const scBtn = document.getElementById('scratchpad-toggle-btn');
    const scModal = document.getElementById('scratchpad-modal');
    const scCloseBtn = document.getElementById('scratchpad-close-btn');

    if (scBtn && scModal && scCloseBtn) {
        scBtn.addEventListener('click', () => {
            scModal.classList.add('open');
            renderNotesList(); 
        });
        scCloseBtn.addEventListener('click', () => scModal.classList.remove('open'));
        scModal.addEventListener('click', (e) => {
            if (e.target === scModal) scModal.classList.remove('open');
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && scModal.classList.contains('open')) scModal.classList.remove('open');
        });
    }

    // --- 2. База данных ---
    let notes = JSON.parse(localStorage.getItem('ulh-scratch-notes')) || [];
    let activeNoteId = localStorage.getItem('ulh-scratch-active-id') || null;

    const notesListContainer = document.getElementById('notes-list');
    const titleInput = document.getElementById('note-title-input');
    const contentInput = document.getElementById('note-content-input');
    const statusText = document.getElementById('autosave-status');
    const addBtn = document.getElementById('add-note-btn');

    if (notes.length === 0) {
        const defaultNote = {
            id: Date.now().toString(),
            title: "Yangi qayd",
            content: "Bu yerda siz tezkor qaydlarni yozişingiz mumkin. Yozgan matnlaringiz <b>avtomatik tarzda saqlanadi...</b>"
        };
        notes.push(defaultNote);
        activeNoteId = defaultNote.id;
        localStorage.setItem('ulh-scratch-notes', JSON.stringify(notes));
        localStorage.setItem('ulh-scratch-active-id', activeNoteId);
    } else if (!activeNoteId) {
        activeNoteId = notes[0].id;
    }

    const renderNotesList = () => {
        if (!notesListContainer) return;
        notesListContainer.innerHTML = '';

        [...notes].reverse().forEach(note => {
            const item = document.createElement('div');
            item.className = `scratch-item ${note.id === activeNoteId ? 'active' : ''}`;
            item.dataset.id = note.id;

            // В превью убираем HTML теги, чтобы показывать чистый текст
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = note.content || '';
            let plainText = tempDiv.innerText || '';
            const snippet = plainText ? plainText.substring(0, 45) : 'Böş qayd...';

            item.innerHTML = `
                <div class="scratch-item-title">${note.title || 'Mavzusiz'}</div>
                <div class="scratch-item-preview">${snippet}</div>
                <button class="delete-note-btn" title="Öçiriş" data-id="${note.id}">×</button>
            `;

            item.addEventListener('click', (e) => {
                if (e.target.classList.contains('delete-note-btn')) return;
                selectNote(note.id);
            });

            notesListContainer.appendChild(item);
        });

        document.querySelectorAll('.delete-note-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteNote(e.target.getAttribute('data-id'));
            });
        });
    };

    const selectNote = (id) => {
        activeNoteId = id;
        localStorage.setItem('ulh-scratch-active-id', activeNoteId);
        
        const activeNote = notes.find(n => n.id === activeNoteId);
        if (activeNote) {
            titleInput.value = activeNote.title;
            contentInput.innerHTML = activeNote.content; // ИСПОЛЬЗУЕМ innerHTML
            if (statusText) statusText.innerHTML = "Özgarişlar saqlandi ✓";
        }
        renderNotesList();
    };

    const deleteNote = (id) => {
        if (notes.length <= 1) {
            alert("Kamida bitta qayd bölişi kerak!");
            return;
        }
        notes = notes.filter(n => n.id !== id);
        if (activeNoteId === id) {
            activeNoteId = notes[0].id;
            localStorage.setItem('ulh-scratch-active-id', activeNoteId);
        }
        localStorage.setItem('ulh-scratch-notes', JSON.stringify(notes));
        selectNote(activeNoteId);
    };

    if (addBtn) {
        addBtn.addEventListener('click', () => {
            const newNote = { id: Date.now().toString(), title: "Yangi qayd", content: "" };
            notes.push(newNote);
            localStorage.setItem('ulh-scratch-notes', JSON.stringify(notes));
            selectNote(newNote.id);
        });
    }

    let autoSaveTimeout = null;
    const triggerAutoSave = () => {
        if (statusText) statusText.innerHTML = "Saqlanmoqda... ⏳";

        const activeNoteIndex = notes.findIndex(n => n.id === activeNoteId);
        if (activeNoteIndex !== -1) {
            notes[activeNoteIndex].title = titleInput.value;
            notes[activeNoteIndex].content = contentInput.innerHTML; // ИСПОЛЬЗУЕМ innerHTML
        }

        const activeItem = document.querySelector(`.scratch-item[data-id="${activeNoteId}"]`);
        if (activeItem) {
            const titleEl = activeItem.querySelector('.scratch-item-title');
            const previewEl = activeItem.querySelector('.scratch-item-preview');
            
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = contentInput.innerHTML;
            let plainText = tempDiv.innerText || '';

            if (titleEl) titleEl.innerText = titleInput.value || 'Mavzusiz';
            if (previewEl) previewEl.innerText = plainText.substring(0, 45) || 'Böş qayd...';
        }

        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = setTimeout(() => {
            localStorage.setItem('ulh-scratch-notes', JSON.stringify(notes));
            if (statusText) statusText.innerHTML = "Saqlandi📋";
        }, 300);
    };

    if (titleInput && contentInput) {
        titleInput.addEventListener('input', triggerAutoSave);
        contentInput.addEventListener('input', triggerAutoSave); // Слушает ввод текста
    }

    // --- 3. Логика кнопок визуального форматирования (С ТУМБЛЕРОМ) ---
    const mdButtons = document.querySelectorAll('.md-btn');
    
    mdButtons.forEach(btn => {
        // Предотвращаем потерю фокуса с редактора при клике на кнопки панели
        btn.addEventListener('mousedown', (e) => {
            e.preventDefault(); 
        });
        
        btn.addEventListener('click', () => {
            if (!contentInput) return;
            
            const cmd = btn.getAttribute('data-cmd');
            const val = btn.getAttribute('data-val') || null;
            
            if (cmd) {
                // Если команда связана с созданием блока (Цитата, Код, Заголовок)
                if (cmd === 'formatBlock') {
                    // 1. Проверяем, находится ли курсор уже внутри этого блока
                    let node = document.getSelection().anchorNode;
                    let isAlreadyInBlock = false;
                    
                    while (node && node !== contentInput) {
                        if (node.nodeName === val) { 
                            isAlreadyInBlock = true; 
                            break; 
                        }
                        node = node.parentNode;
                    }
                    
                    // 2. Если внутри — выключаем его (превращаем обратно в обычный текст DIV)
                    if (isAlreadyInBlock) {
                        document.execCommand('formatBlock', false, 'DIV');
                    } 
                    // 3. Если нет — включаем
                    else {
                        document.execCommand('formatBlock', false, val);
                    }
                } 
                // Для всех остальных кнопок (жирный, списки) стандартное поведение
                else {
                    document.execCommand(cmd, false, val);
                }
                
                triggerAutoSave();
            }
        });
    });

    selectNote(activeNoteId);
});

// === ИНТЕГРАЦИЯ YOUTUBE ПЛЕЕРА И ИСТОРИЯ ПРОСЛУШИВАНИЙ ===

let isCustomMusicMode = false;
let ytPlayer = null;
let isYtPlaying = false;
let ytProgressInterval = null;
const MUSIC_HISTORY_KEY = "ulh_music_history";

// Устанавливаем режим контроллеров (AI = 100% громкость, YT = 70/30 с таймлайном)
function setPlayerUI_Mode(mode) {
    const controlsRow = document.getElementById("musicControlsRow");
    const ytVideoBtn = document.getElementById("openYtVideoBtn");
    if (!controlsRow) return;

    if (mode === 'yt') {
        controlsRow.classList.remove('ai-mode');
        controlsRow.classList.add('yt-mode');
        if (ytVideoBtn) ytVideoBtn.style.display = "inline-flex";
    } else {
        controlsRow.classList.remove('yt-mode');
        controlsRow.classList.add('ai-mode');
        if (ytVideoBtn) ytVideoBtn.style.display = "none";
    }
}

// Инициализация YouTube API
function loadYoutubeAPI() {
    if (window.YT) return;
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}
loadYoutubeAPI();

function getYoutubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// Ограничение в 40 символов
function truncateText(str, maxLength = 40) {
    if (!str) return "";
    return str.length > maxLength ? str.substring(0, maxLength - 3) + "..." : str;
}

function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function togglePlaybackHandler(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    if (isCustomMusicMode && ytPlayer) {
        if (isYtPlaying) {
            ytPlayer.pauseVideo();
        } else {
            ytPlayer.playVideo();
        }
    } else {
        if (typeof toggleAmbientPlayback === "function") {
            toggleAmbientPlayback();
        }
    }
}

// --- ЛОГИКА ПЛАВАЮЩЕГО ОКНА ВИДЕО И РЕЖИМА КИНОТЕАТРА ---

// Включение / выключение режима кинотеатра
window.toggleCinemaMode = function(event) {
    if (event) {
        event.stopPropagation();
    }
    const overlay = document.getElementById("cinemaOverlay");
    const btn = document.getElementById("cinemaToggleBtn");
    
    if (overlay) {
        const isActive = overlay.classList.toggle("active");
        if (btn) btn.classList.toggle("active", isActive);
    }
};

// Открываем окно с видео
window.openYtVideoModal = function() {
    const modal = document.getElementById("ytFloatingModal");
    const dropdown = document.getElementById("navMusicWrap");
    
    if (modal) {
        modal.classList.remove("hidden-player");
        if (!modal.style.top || modal.style.top === "-9999px") {
            modal.style.top = "80px";
            modal.style.left = "auto";
            modal.style.right = "24px";
        }
    }
    if (dropdown) {
        dropdown.classList.remove("open");
        const btn = document.getElementById("musicToggleBtn");
        if (btn) btn.setAttribute("aria-expanded", "false");
    }
};

// Закрываем окно с видео (прячем его за экран) И ВЫКЛЮЧАЕМ СВЕТ
window.closeYtVideoModal = function() {
    const modal = document.getElementById("ytFloatingModal");
    if (modal) {
        modal.classList.add("hidden-player");
    }
    
    // Плавное отключение режима кинотеатра, если он был включен
    const overlay = document.getElementById("cinemaOverlay");
    const btn = document.getElementById("cinemaToggleBtn");
    if (overlay && overlay.classList.contains("active")) {
        overlay.classList.remove("active");
    }
    if (btn && btn.classList.contains("active")) {
        btn.classList.remove("active");
    }
};

// Скрипт перетаскивания (Drag & Drop) модального окна за шапку
(function initDraggableModal() {
    const modal = document.getElementById("ytFloatingModal");
    const header = document.getElementById("ytModalHeader");
    if (!modal || !header) return;

    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    header.addEventListener("mousedown", (e) => {
        isDragging = true;
        // Вычисляем смещение мыши относительно левого верхнего угла модалки
        const rect = modal.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        modal.style.right = "auto"; // Отключаем привязку к правому краю
    });

    document.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        // Двигаем окно за мышью
        modal.style.left = (e.clientX - offsetX) + "px";
        modal.style.top = (e.clientY - offsetY) + "px";
    });

    document.addEventListener("mouseup", () => {
        isDragging = false;
    });
})();

// --- ЗАГРУЗКА ВИДЕО ---
window.loadCustomYoutube = function(urlFromHistory = null) {
    const inputEl = document.getElementById("customMusicUrl");
    let rawUrl = urlFromHistory || (inputEl ? inputEl.value.trim() : "");
    if (!rawUrl) return;

    const videoId = getYoutubeId(rawUrl);
    if (!videoId) {
        alert("Notöğri YouTube havolasi! Iltimos, tekşirib qaytadan kiriting.");
        return;
    }

    if (typeof ambientIsPlaying !== 'undefined' && ambientIsPlaying) {
        pauseAmbientMusic();
    }

    isCustomMusicMode = true;

    document.getElementById("musicCustomInputRow").style.display = "none";
    document.getElementById("musicProgressRow").style.display = "flex"; 
    document.getElementById("backToAiMusicBtn").style.display = "inline-flex";
    
    setPlayerUI_Mode('yt');

    document.getElementById("musicTitleText").textContent = "Yuklanmoqda...";
    document.getElementById("musicSubtitleText").textContent = "YouTube...";
    document.getElementById("ytModalFloatTitle").textContent = "Yuklanmoqda...";
    
    if (ytPlayer && typeof ytPlayer.loadVideoById === "function") {
        ytPlayer.loadVideoById(videoId);
    } else {
        ytPlayer = new YT.Player('yt-player-container', {
            // Размеры задаст CSS через aspect-ratio (100% ширины модалки)
            height: '100%',
            width: '100%',
            videoId: videoId,
            playerVars: { 'autoplay': 1, 'controls': 1 }, // Включаем controls, чтобы видео можно было мотать в окне
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange
            }
        });
    }

    if (!urlFromHistory && inputEl) {
        inputEl.value = ""; 
    }
};

function onPlayerReady(event) {
    if (typeof ambientVolume !== 'undefined') {
        event.target.setVolume(Math.round(ambientVolume * 100));
    }
    event.target.playVideo();
    fetchYtMetadata();
}

function onPlayerStateChange(event) {
    const coverBtn = document.getElementById("musicPlayPauseBtn");
    const navBtn = document.getElementById("musicToggleBtn");
    
    if (event.data == YT.PlayerState.PLAYING) {
        isYtPlaying = true;
        coverBtn.classList.add("playing");
        navBtn.classList.add("is-playing");
        startProgressInterval();
        fetchYtMetadata();
    } else {
        isYtPlaying = false;
        coverBtn.classList.remove("playing");
        navBtn.classList.remove("is-playing");
        clearInterval(ytProgressInterval);
    }
}

function fetchYtMetadata() {
    if (!ytPlayer || typeof ytPlayer.getVideoData !== 'function') return;
    const data = ytPlayer.getVideoData();
    if (data && data.title) {
        const title = truncateText(data.title, 40);
        const author = truncateText(data.author || "YouTube", 40);
        
        document.getElementById("musicTitleText").textContent = title;
        document.getElementById("musicSubtitleText").textContent = author;
        document.getElementById("ytModalFloatTitle").textContent = title; // Заголовок в плавающем окне
        
        saveToMusicHistory(ytPlayer.getVideoUrl(), title, author);
    }
}

function startProgressInterval() {
    clearInterval(ytProgressInterval);
    const seekbar = document.getElementById("musicSeekbar");
    const timeDisplay = document.getElementById("musicTimeDisplay");
    
    ytProgressInterval = setInterval(() => {
        if (ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
            const current = ytPlayer.getCurrentTime();
            const duration = ytPlayer.getDuration();
            
            if (duration > 0) {
                seekbar.value = (current / duration) * 100;
                timeDisplay.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
            }
        }
    }, 1000);
}

document.getElementById("musicSeekbar").addEventListener("input", function(e) {
    if (isCustomMusicMode && ytPlayer && typeof ytPlayer.getDuration === 'function') {
        const duration = ytPlayer.getDuration();
        const seekToTime = (e.target.value / 100) * duration;
        ytPlayer.seekTo(seekToTime, true);
        document.getElementById("musicTimeDisplay").textContent = `${formatTime(seekToTime)} / ${formatTime(duration)}`;
    }
});

// Возврат к оригинальной музыке концентрации
window.switchToAiMusic = function() {
    if (ytPlayer && typeof ytPlayer.pauseVideo === 'function') {
        ytPlayer.pauseVideo();
    }
    isCustomMusicMode = false;
    isYtPlaying = false;
    clearInterval(ytProgressInterval);

    // Прячем видео окно и плавно выключаем свет, если он был включен
    closeYtVideoModal();

    document.getElementById("musicCustomInputRow").style.display = "flex";
    document.getElementById("musicProgressRow").style.display = "none";
    document.getElementById("backToAiMusicBtn").style.display = "none";
    
    setPlayerUI_Mode('ai'); 
    
    document.getElementById("musicTitleText").textContent = "Konsentratsiya uçun musiqa";
    document.getElementById("musicSubtitleText").textContent = "AI Generated Music by LANIGIRO";
    
    if (typeof startAmbientMusic === "function") {
        startAmbientMusic();
    }
};

if (typeof setAmbientVolumeRatio === "function") {
    const originalVolumeFunc = setAmbientVolumeRatio;
    window.setAmbientVolumeRatio = function(ratio) {
        originalVolumeFunc(ratio); 
        if (isCustomMusicMode && ytPlayer && typeof ytPlayer.setVolume === 'function') {
            ytPlayer.setVolume(Math.round(ambientVolume * 100)); 
        }
    };
}

// --- ИСТОРИЯ ПРОСЛУШИВАНИЙ ---
function saveToMusicHistory(url, title, author) {
    const cleanUrl = url.split('&')[0]; 
    let history = JSON.parse(localStorage.getItem(MUSIC_HISTORY_KEY)) || [];
    
    history = history.filter(item => getYoutubeId(item.url) !== getYoutubeId(cleanUrl));
    history.unshift({ url: cleanUrl, title, author });
    if (history.length > 3) history = history.slice(0, 3);
    
    localStorage.setItem(MUSIC_HISTORY_KEY, JSON.stringify(history));
    renderMusicHistory();
}

function renderMusicHistory() {
    const list = document.getElementById("musicHistoryList");
    if (!list) return;
    
    let history = JSON.parse(localStorage.getItem(MUSIC_HISTORY_KEY)) || [];
    list.innerHTML = "";
    
    if (history.length === 0) {
        list.innerHTML = `<div style="text-align: center; color: #94A3B8; font-size: 11.5px; padding: 10px 0;">Hozirça böş</div>`;
        return;
    }
    
    history.forEach(item => {
        const itemEl = document.createElement("div");
        itemEl.className = "music-history-item";
        itemEl.onclick = () => loadCustomYoutube(item.url);
        itemEl.innerHTML = `
            <div class="music-history-item-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            </div>
            <div class="music-history-item-text">
                <div class="music-history-item-title">${item.title}</div>
                <div class="music-history-item-sub">${item.author}</div>
            </div>
        `;
        list.appendChild(itemEl);
    });
}

window.toggleMusicHistoryConfirm = function(event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    const confirmBox = document.getElementById("musicHistoryConfirm");
    if (confirmBox) confirmBox.classList.toggle("show");
};

window.clearMusicHistory = function(event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    localStorage.removeItem(MUSIC_HISTORY_KEY);
    renderMusicHistory();
    const confirmBox = document.getElementById("musicHistoryConfirm");
    if (confirmBox) confirmBox.classList.remove("show");
};

document.addEventListener("click", (e) => {
    const confirmBox = document.getElementById("musicHistoryConfirm");
    const clearBtn = document.getElementById("musicHistoryClearBtn");
    if (confirmBox && confirmBox.classList.contains("show") && !confirmBox.contains(e.target) && e.target !== clearBtn && !clearBtn.contains(e.target)) {
        confirmBox.classList.remove("show");
    }
});

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    setPlayerUI_Mode('ai');
    renderMusicHistory();
});


// ==========================================
// === ТОЧНЫЙ УНИВЕРСАЛЬНЫЙ AI-СЛОВАРЬ СИНОНИМОВ И ПЕРЕВОДЧИК ===
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const floatingMenu = document.getElementById("aiFloatingMenu");
    const dropdown = document.getElementById("aiSynonymDropdown");
    
    if (!floatingMenu || !dropdown) return;

    let selectedData = { text: "", element: null, type: "", start: 0, end: 0 };

    document.addEventListener("mouseup", checkActiveSelection);
    document.addEventListener("keyup", checkActiveSelection);
    document.addEventListener("selectionchange", checkActiveSelection);

    function checkActiveSelection() {
        const activeEl = document.activeElement;
        if (!activeEl) {
            hideAiFloatingMenu();
            return;
        }

        let selectedText = "";
        let rect = null;

        // 1. Проверяем обычные textarea и input
        if (activeEl.tagName === "TEXTAREA" || (activeEl.tagName === "INPUT" && activeEl.type === "text")) {
            const start = activeEl.selectionStart;
            const end = activeEl.selectionEnd;
            if (start !== undefined && start !== end && (end - start) <= 40) {
                selectedText = activeEl.value.substring(start, end).trim();
                if (selectedText.length > 0) {
                    selectedData = { text: selectedText, element: activeEl, type: "textarea", start, end };
                    
                    rect = activeEl.getBoundingClientRect();
                    // ИСПРАВЛЕНИЕ: Добавлено имя функции
                    showAiFloatingMenuNearSelection(rect, selectedText);
                    return;
                }
            }
        } 
        // 2. Проверяем блоки contenteditable (редакторы, блокноты)
        else if (activeEl.getAttribute("contenteditable") === "true" || activeEl.closest("[contenteditable='true']")) {
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const text = selection.toString().trim();
                if (text.length > 0 && text.length <= 40 && !/\s{2,}/.test(text)) {
                    selectedData = { text: text, element: selection.getRangeAt(0), type: "contenteditable" };
                    
                    const rangeRect = selection.getRangeAt(0).getBoundingClientRect();
                    if (rangeRect && rangeRect.width > 0) {
                        // ИСПРАВЛЕНИЕ: Добавлено имя функции
                        showAiFloatingMenuNearSelection(rangeRect, text);
                        return;
                    }
                }
            }
        }

        hideAiFloatingMenu();
    }

    function showAiFloatingMenuNearSelection(targetRect, text) {
        // Ширина плашки с ДВУМЯ кнопками (Синоним и Перевод)
        const menuWidth = 195; 
        const centerX = targetRect.left + (targetRect.width / 2) - (menuWidth / 2);
        const topPos = targetRect.top - 40;

        floatingMenu.style.top = (window.scrollY + topPos) + "px";
        floatingMenu.style.left = (window.scrollX + centerX) + "px";
        floatingMenu.classList.add("visible");
    }

    function hideAiFloatingMenu() {
        if (!dropdown.classList.contains("open")) {
            floatingMenu.classList.remove("visible");
        }
    }

    document.addEventListener("mousedown", (e) => {
        if (!floatingMenu.contains(e.target)) {
            dropdown.classList.remove("open");
            floatingMenu.classList.remove("visible");
        }
    });

    // === ФУНКЦИЯ 1: ЗАПРОС СИНОНИМОВ ===
    window.fetchSynonymsForSelection = async function(event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        if (!selectedData.text) return;

        dropdown.innerHTML = `<div class="ai-syn-loading">Qidirilmoqda...</div>`;
        dropdown.classList.add("open");
        floatingMenu.classList.add("visible");

        const targetWord = selectedData.text;
        
        let fullContext = "";
        if (selectedData.type === "textarea" && selectedData.element) {
            fullContext = selectedData.element.value;
        } else if (selectedData.type === "contenteditable" && selectedData.element) {
            fullContext = document.activeElement.textContent || "";
        }
        if (fullContext.length > 500) fullContext = fullContext.substring(0, 500);

        const promptText = `Senga umumiy matn konteksti va shu matn ichidan ajratib olingan so'z beriladi. 
Kontekstga asoslanib, shu so'zning tilini (rus, ingliz, o'zbek yoki boshqa tillar) aniqlagin va aynan o'sha tilda 3-4 ta eng yaxshi sinonim (almashtirish varianti) topib ber. 
Faqat sinonimlarni vergul bilan yoki ro'yxat shaklida yoz, ortiqcha gap yozma.
Kontekst: "${fullContext}"
Ajratib olingan so'z: "${targetWord}"`;

        try {
            const response = await fetch(AI_PROXY_ENDPOINT, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mode: "custom", text: targetWord, customPrompt: promptText })
            });

            if (!response.ok) throw new Error("Server xatosi");

            const data = await response.json();
            const rawResult = (data && data.result) ? data.result : "";

            let synonyms = rawResult
                .split(/[\n,;-]+/)
                .map(s => s.replace(/^\d+[\.\)]\s*/, '').trim())
                .filter(s => s.length > 0 && s.toLowerCase() !== targetWord.toLowerCase());

            synonyms = [...new Set(synonyms)].slice(0, 4);

            if (synonyms.length === 0) {
                dropdown.innerHTML = `<div class="ai-syn-loading">Sinonim topilmadi</div>`;
                return;
            }

            dropdown.innerHTML = "";
            synonyms.forEach(syn => {
                let finalSyn = syn;
                const isUzbekText = /[o'g'shchöğşçўқғҳ'`]/i.test(targetWord) || /[o'g'shchöğşçўқғҳ'`]/i.test(fullContext);
                const isEnglishWord = /^[a-zA-Z]+$/.test(targetWord) && !/[o'g'shchöğşçўқғҳ]/i.test(targetWord);

                if (isUzbekText && !isEnglishWord && typeof enforceNewUzbekAlphabet === "function") {
                    finalSyn = enforceNewUzbekAlphabet(syn);
                }

                // Обертка для двух кнопок
                const optWrap = document.createElement("div");
                optWrap.className = "ai-syn-option-wrap";

                // Кнопка 1: Замена текста
                const opt = document.createElement("button");
                opt.type = "button";
                opt.className = "ai-syn-option";
                opt.textContent = finalSyn;
                opt.onclick = (e) => {
                    e.preventDefault(); e.stopPropagation();
                    replaceWordInActiveField(opt.textContent);
                };

                // Кнопка 2: Копирование в буфер
                const copyBtn = document.createElement("button");
                copyBtn.type = "button";
                copyBtn.className = "ai-syn-copy-btn";
                copyBtn.title = "Nusxalaş";
                copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
                copyBtn.onclick = (e) => {
                    e.preventDefault(); e.stopPropagation();
                    navigator.clipboard.writeText(finalSyn).then(() => {
                        copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`;
                        setTimeout(() => {
                            copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
                        }, 1500);
                    });
                };

                optWrap.appendChild(opt);
                optWrap.appendChild(copyBtn);
                dropdown.appendChild(optWrap);
            });

        } catch (err) {
            console.error("Synonyms Error:", err);
            dropdown.innerHTML = `<div class="ai-syn-loading">Xatolik yuz berdi</div>`;
        }
    };

    // === ФУНКЦИЯ 2: ЗАПРОС ПЕРЕВОДА (ДОБАВЛЕНО) ===
    window.fetchTranslationForSelection = async function(event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        if (!selectedData.text) return;

        dropdown.innerHTML = `<div class="ai-syn-loading">Tarjima qilinmoqda...</div>`;
        dropdown.classList.add("open");
        floatingMenu.classList.add("visible");

        const targetText = selectedData.text;

        const promptText = `Iltimos, quyidagi matnni O'zbek tiliga tarjima qiling.
Faqat va faqat tarjimani yozing, hech qanday qo'shimcha so'zlar, izohlar yoki qo'shtirnoqlar ishlatmang.
Matn: "${targetText}"`;

        try {
            const response = await fetch(AI_PROXY_ENDPOINT, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mode: "custom", text: targetText, customPrompt: promptText })
            });

            if (!response.ok) throw new Error("Server xatosi");

            const data = await response.json();
            let rawResult = "";
            if (typeof data === "string") rawResult = data;
            else if (data && data.result) rawResult = data.result;
            else if (data && data.response) rawResult = data.response;
            else rawResult = JSON.stringify(data);

            rawResult = rawResult.replace(/^["']|["']$/g, '').trim();

            if (!rawResult) {
                dropdown.innerHTML = `<div class="ai-syn-loading">Tarjima topilmadi</div>`;
                return;
            }

            let finalTranslation = rawResult;
            if (typeof enforceNewUzbekAlphabet === "function") {
                finalTranslation = enforceNewUzbekAlphabet(finalTranslation);
            }

            dropdown.innerHTML = `
                <div style="font-size: 10px; font-weight: 800; color: #64748B; text-transform: uppercase; padding: 6px 10px 4px; letter-spacing: 0.05em;">
                    Tarjima (Almashtirish uchun bosing):
                </div>
            `;
            
            // Обертка
            const optWrap = document.createElement("div");
            optWrap.className = "ai-syn-option-wrap";

            // Кнопка 1: Замена текста
            const opt = document.createElement("button");
            opt.type = "button";
            opt.className = "ai-syn-option";
            opt.textContent = finalTranslation;
            opt.onclick = (e) => {
                e.preventDefault(); e.stopPropagation();
                replaceWordInActiveField(opt.textContent);
            };

            // Кнопка 2: Копирование в буфер
            const copyBtn = document.createElement("button");
            copyBtn.type = "button";
            copyBtn.className = "ai-syn-copy-btn";
            copyBtn.title = "Nusxalaş";
            copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
            copyBtn.onclick = (e) => {
                e.preventDefault(); e.stopPropagation();
                navigator.clipboard.writeText(finalTranslation).then(() => {
                    copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`;
                    setTimeout(() => {
                        copyBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
                    }, 1500);
                });
            };
            
            optWrap.appendChild(opt);
            optWrap.appendChild(copyBtn);
            dropdown.appendChild(optWrap);

        } catch (err) {
            console.error("Translation Error:", err);
            dropdown.innerHTML = `<div class="ai-syn-loading">Xatolik yuz berdi</div>`;
        }
    };

    function replaceWordInActiveField(newWord) {
        if (selectedData.type === "textarea" && selectedData.element) {
            const el = selectedData.element;
            const start = selectedData.start;
            const end = selectedData.end;
            
            el.value = el.value.substring(0, start) + newWord + el.value.substring(end);
            el.focus();
            el.selectionStart = el.selectionEnd = start + newWord.length;

            if (el.id === "editor") {
                if (typeof saveEditorDraft === "function") saveEditorDraft();
                if (typeof calculateAndRenderTextStats === "function") calculateAndRenderTextStats();
                if (typeof showAutosaveIndicator === "function") showAutosaveIndicator("Almashtirildi ✓");
            }
        } 
        else if (selectedData.type === "contenteditable") {
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                range.deleteContents();
                range.insertNode(document.createTextNode(newWord));

                const editableBox = selection.anchorNode.parentElement.closest("[contenteditable='true']");
                if (editableBox) {
                    editableBox.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
        }

        dropdown.classList.remove("open");
        floatingMenu.classList.remove("visible");
    }
});

// ==========================================
// Функция для закрытия панели антиплагиата и ВОЗВРАТА конвертера файлов
// (Оставляем только одну правильную версию функции)
// ==========================================
window.closeUniquenessReport = function() {
    const reportBox = document.getElementById("uniquenessReportBox");
    const converterBox = document.getElementById("converterBox");
    
    // Прячем отчет
    if (reportBox) {
        reportBox.style.display = "none";
        reportBox.innerHTML = "";
    }
    
    // Возвращаем конвертер (учитываем, что в Telegram Mini App он должен быть скрыт)
    if (converterBox) {
        const tg = (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : null;
        const isTelegramEnv = Boolean(tg && tg.initData && tg.initData.length > 0);
        if (!isTelegramEnv) {
            converterBox.style.display = "flex";
        }
    }
};

// ==========================================
// === 14. МОДУЛЬ ПРОВЕРКИ УНИКАЛЬНОСТИ И КЛИШЕ ===
// ==========================================
window.checkTextUniqueness = async function() {
    if (typeof closeAiMenu === "function") closeAiMenu();

    if (!editor || !editor.value.trim()) {
        if (typeof showAutosaveIndicator === "function") {
            showAutosaveIndicator("Avval matn kiriting!");
        }
        if (editor) editor.focus();
        return;
    }

    const text = editor.value.trim();
    const converterBox = document.getElementById("converterBox");
    const workspace = document.querySelector(".workspace");

    // Прячем блок загрузки файлов
    if (converterBox) {
        converterBox.style.display = "none";
    }

    // Создаем блок отчета и помещаем его в правую колонку (.workspace)
    let reportBox = document.getElementById("uniquenessReportBox");
    if (!reportBox) {
        reportBox = document.createElement("div");
        reportBox.id = "uniquenessReportBox";
        if (workspace) {
            workspace.appendChild(reportBox);
        } else {
            editor.parentNode.insertBefore(reportBox, editor.nextSibling);
        }
    }
    reportBox.style.display = "block";

    // HTML код для кнопки закрытия (использует новую функцию)
    const closeBtnHtml = `<button onclick="closeUniquenessReport()" style="position: absolute; top: 12px; right: 12px; background: rgba(0,0,0,0.04); border: none; width: 28px; height: 28px; border-radius: 50%; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #64748B; transition: all 0.2s ease; z-index: 10;" onmouseover="this.style.background='rgba(239,68,68,0.1)'; this.style.color='#EF4444'" onmouseout="this.style.background='rgba(0,0,0,0.04)'; this.style.color='#64748B'" title="Yopish">×</button>`;

    // Состояние 1: Загрузка (добавлен класс uniqueness-right-panel)
    reportBox.innerHTML = `
        <div class="uniqueness-report-container uniqueness-right-panel" style="position: relative;">
            ${closeBtnHtml}
            <div class="uniqueness-header" style="color: #0284C7; margin: 0; padding-right: 32px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" style="animation: aiSpinPulse 1.1s linear infinite;"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z"/></svg>
                <span style="margin-left: 6px;">Matn tahlil qilinmoqda, iltimos kuting...</span>
            </div>
        </div>
    `;

    const promptText = `Sen professional ilmiy va akademik muharrirsan. Xohlagan tilda tahrir qila olasan.
Quyidagi matnni tahlil qilib, undagi eskirgan akademik shtamplar, qolip iboralar (klishelar), kantselyarizmlar va takroriy konstruksiyalarni top.
Har bir topilgan shtamp uchun matn uslubiga mos keladigan 2-3 ta tabiiy, original muqobil variantlarni taklif qil.
MUHIM: Javobing FAQAT toza JSON massiv formatida bo'lsin, hech qanday markdown (\`\`\`json) yoki tushuntirish yozma.
Format:
[
  { "cliche": "topilgan ibora", "variants": ["muqobil 1", "muqobil 2"] }
]
Agar matnda shtamplar bo'lmasa, bo'sh massiv qaytar: []
Matn: "${text.substring(0, 3000)}"`;

    try {
        const response = await fetch(AI_PROXY_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "custom", text: text, customPrompt: promptText })
        });

        if (!response.ok) throw new Error("Server xatosi: " + response.status);

        const data = await response.json();
        let rawResult = "";
        if (typeof data === "string") rawResult = data;
        else if (data && data.result) rawResult = data.result;
        else if (data && data.response) rawResult = data.response;
        else rawResult = JSON.stringify(data);

        let clichesList = [];
        try {
            let clean = rawResult.replace(/```json/gi, '').replace(/```/g, '').trim();
            const startIdx = clean.indexOf('[');
            const endIdx = clean.lastIndexOf(']');
            if (startIdx !== -1 && endIdx !== -1) {
                clean = clean.substring(startIdx, endIdx + 1);
            }
            clichesList = JSON.parse(clean);
        } catch (parseErr) {
            console.error("JSON parse error:", parseErr, rawResult);
            clichesList = [];
        }

        // Состояние 2: Идеальный текст (нет штампов)
        if (!Array.isArray(clichesList) || clichesList.length === 0) {
            reportBox.innerHTML = `
                <div class="uniqueness-report-container uniqueness-right-panel" style="border-left: 4px solid #10B981; position: relative;">
                    ${closeBtnHtml}
                    <div class="uniqueness-header" style="color: #10B981; margin: 0; padding-right: 32px;">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        <span>Ajoyib! Matnda eskirgan akademik ştamplar va klişelar topilmadi.</span>
                    </div>
                </div>
            `;
            return;
        }

        // Состояние 3: Результаты найдены
        let html = `
            <div class="uniqueness-report-container uniqueness-right-panel" style="position: relative;">
                ${closeBtnHtml}
                <div class="uniqueness-header" style="color: #D97706; padding-right: 32px; margin-bottom: 16px; flex-shrink: 0;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
                    <span>Topilgan akademik ştamplar (Almaştiriş uçun ustiga bosing):</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px;">
        `;

        clichesList.forEach((item, index) => {
            const rawCliche = item.cliche || "";
            if (!rawCliche) return;

            const displayCliche = (typeof enforceNewUzbekAlphabet === "function") ? enforceNewUzbekAlphabet(rawCliche) : rawCliche;

            let variantsButtons = "";
            if (Array.isArray(item.variants)) {
                item.variants.forEach(variant => {
                    const cleanVariant = (typeof enforceNewUzbekAlphabet === "function") ? enforceNewUzbekAlphabet(variant) : variant;
                    const safeCliche = rawCliche.replace(/'/g, "\\'").replace(/"/g, '&quot;');
                    const safeVar = cleanVariant.replace(/'/g, "\\'").replace(/"/g, '&quot;');

                    variantsButtons += `<button type="button" class="variant-badge-btn" onclick="replaceClicheInEditor('${safeCliche}', '${safeVar}', this)">${cleanVariant}</button>`;
                });
            }

            html += `
                <div class="cliche-item" id="cliche-item-${index}">
                    <span class="cliche-word">${displayCliche}</span>
                    <div class="variants-wrapper">
                        <span style="font-size: 11px; color: #64748B; font-weight: 700;">Tavsiya:</span>
                        ${variantsButtons}
                    </div>
                </div>
            `;
        });

        html += `</div></div>`;
        reportBox.innerHTML = html;

    } catch (err) {
        // Состояние 4: Ошибка
        console.error("Uniqueness Check Error:", err);
        reportBox.innerHTML = `
            <div class="uniqueness-report-container uniqueness-right-panel" style="border-left: 4px solid #EF4444; position: relative;">
                ${closeBtnHtml}
                <div class="uniqueness-header" style="color: #EF4444; margin: 0; padding-right: 32px;">
                    Tahlil qilişda xatolik yuz berdi: ${err.message}
                </div>
            </div>
        `;
    }
};

// Функция замены найденного клише прямо в textarea
window.replaceClicheInEditor = function(cliche, replacement, btnEl) {
    if (!editor) return;

    const currentText = editor.value;
    const escaped = cliche.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');

    if (regex.test(currentText)) {
        editor.value = currentText.replace(regex, replacement);

        const card = btnEl.closest('.cliche-item');
        if (card) {
            card.style.opacity = '0.65';
            card.style.pointerEvents = 'none';
            const wordEl = card.querySelector('.cliche-word');
            if (wordEl) {
                wordEl.style.textDecoration = 'none';
                wordEl.style.background = 'rgba(16, 185, 129, 0.15)';
                wordEl.style.color = '#10B981';
                wordEl.textContent = replacement + " (Almaştirildi ✓)";
            }
        }

        if (typeof saveEditorDraft === "function") saveEditorDraft();
        if (typeof calculateAndRenderTextStats === "function") calculateAndRenderTextStats();
        if (typeof showAutosaveIndicator === "function") showAutosaveIndicator("Ştamp almaştirildi ✓");
    } else {
        alert("Bu söz matnda topilmadi (ehtimol allaqaçon özgartirilgan).");
    }
};

// ==========================================
// === 15. ПОЛНОЦЕННЫЙ AI-ПЕРЕВОДЧИК В ПРАВОЙ ПАНЕЛИ ===
// ==========================================

// Закрытие панели переводчика и возврат конвертера
window.closeTranslatorPanel = function() {
    const panel = document.getElementById("translatorReportBox");
    const converterBox = document.getElementById("converterBox");
    
    if (panel) {
        panel.style.display = "none";
        panel.innerHTML = "";
    }
    if (converterBox) {
        const tg = (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : null;
        const isTelegramEnv = Boolean(tg && tg.initData && tg.initData.length > 0);
        if (!isTelegramEnv) {
            converterBox.style.display = "flex";
        }
    }
};

// Открытие панели переводчика и запуск перевода
window.openTranslatorPanel = function() {
    if (typeof closeAiMenu === "function") closeAiMenu();

    if (!editor || !editor.value.trim()) {
        if (typeof showAutosaveIndicator === "function") showAutosaveIndicator("Avval matn kiriting!");
        if (editor) editor.focus();
        return;
    }

    // Если открыта панель уникальности - прячем её
    const uniquenessPanel = document.getElementById("uniquenessReportBox");
    if (uniquenessPanel) uniquenessPanel.style.display = "none";

    const converterBox = document.getElementById("converterBox");
    const workspace = document.querySelector(".workspace");

    if (converterBox) converterBox.style.display = "none";

    let panel = document.getElementById("translatorReportBox");
    if (!panel) {
        panel = document.createElement("div");
        panel.id = "translatorReportBox";
        if (workspace) workspace.appendChild(panel);
        else editor.parentNode.insertBefore(panel, editor.nextSibling);
    }
    
    panel.className = "translator-right-panel";
    panel.style.display = "flex";

    const closeBtnHtml = `<button onclick="closeTranslatorPanel()" style="position: absolute; top: 12px; right: 12px; background: rgba(0,0,0,0.04); border: none; width: 28px; height: 28px; border-radius: 50%; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #64748B; transition: all 0.2s ease; z-index: 10;" onmouseover="this.style.background='rgba(239,68,68,0.1)'; this.style.color='#EF4444'" onmouseout="this.style.background='rgba(0,0,0,0.04)'; this.style.color='#64748B'" title="Yopish">×</button>`;

    // Внедряем дизайнерский класс bib-custom-input для селекта
    panel.innerHTML = `
        ${closeBtnHtml}
        <div class="translator-header" style="margin-bottom: 12px; padding-right: 28px; display: flex; align-items: center; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 6px; flex: 1;">
                <span id="transSourceLang" style="color: #64748B; font-size: 11px; font-weight: 800; text-transform: uppercase;">Aniqlanmoqda...</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:#94A3B8;"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                
                <div style="flex: 1; max-width: 160px;">
                    <select id="transTargetLang" class="bib-custom-input" style="height: 34px; padding: 0 32px 0 10px; font-size: 12.5px; border-radius: 8px; margin: 0; color: #0284C7; font-weight: 800; cursor: pointer;" onchange="executeFullTranslation()">
                        <option value="O'zbek tili" selected>Özbekça</option>
                        <option value="Rus tili">Русский</option>
                        <option value="Ingliz tili">English</option>
                        <option value="Xitoy tili">中文 (Xitoy)</option>
                        <option value="Koreys tili">한국어 (Koreys)</option>
                        <option value="Yapon tili">日本語 (Yapon)</option>
                        <option value="Turk tili">Türkçe (Turk)</option>
                        <option value="Arab tili">العربية (Arab)</option>
                        <option value="Tojik tili">Тоҷикӣ (Tojik)</option>
                    </select>
                </div>
            </div>
        </div>
        
        <div id="transContent" class="translator-content custom-scrollbar"></div>
        
        <div class="translator-actions">
            <button class="translator-btn translator-btn-replace" onclick="replaceWithTranslation()">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                <span>Matnni almaştirish</span>
            </button>
            <button class="translator-btn translator-btn-copy" onclick="copyTranslatedText(this)" title="Nusxalaş">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                <span>Nusxalaş</span>
            </button>
        </div>
    `;

    // Важно: Инициализируем ваш кастомный скрипт селектов, чтобы превратить обычный <select> в красивое меню
    if (typeof initCustomSelects === "function") {
        initCustomSelects();
    }

    executeFullTranslation();
};

// Функция перевода
window.executeFullTranslation = async function() {
    const contentBox = document.getElementById("transContent");
    const langSelect = document.getElementById("transTargetLang");
    const sourceLangLabel = document.getElementById("transSourceLang");
    
    if (!contentBox || !langSelect || !editor) return;

    const text = editor.value.trim();
    const targetLang = langSelect.value;

    contentBox.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px; color: #0284C7; font-weight: 700; font-size: 13px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" style="animation: aiSpinPulse 1.1s linear infinite;"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z"/></svg>
            Tarjima qilinmoqda, iltimos kuting...
        </div>
    `;

    const promptText = `Sen professional tarjimonsan.
Vazifalar:
1. Berilgan matn qaysi tilda yozilganini aniqla (masalan: "Rus tili", "Ingliz tili", "O'zbek tili").
2. Matnni ma'nosi va stilini yo'qotmagan holda "${targetLang}" tiliga aniq tarjima qil.
Javobni FAQAT toza JSON formatida ber, markdown (\`\`\`json) yoki qo'shimcha so'zlar qo'shma.
Format:
{
  "detected_lang": "aniqlangan til nomi",
  "translation": "tarjima qilingan matn"
}
Matn: "${text.substring(0, 3000)}"`;

    try {
        const response = await fetch(AI_PROXY_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "custom", text: text, customPrompt: promptText })
        });

        if (!response.ok) throw new Error("Server xatosi");

        const data = await response.json();
        let rawResult = "";
        if (typeof data === "string") rawResult = data;
        else if (data && data.result) rawResult = data.result;
        else if (data && data.response) rawResult = data.response;
        else rawResult = JSON.stringify(data);

        let parsed = null;
        try {
            let clean = rawResult.replace(/```json/gi, '').replace(/```/g, '').trim();
            const startIdx = clean.indexOf('{');
            const endIdx = clean.lastIndexOf('}');
            if (startIdx !== -1 && endIdx !== -1) {
                clean = clean.substring(startIdx, endIdx + 1);
            }
            parsed = JSON.parse(clean);
        } catch(e) {
            console.error("JSON parse error:", e, rawResult);
            throw new Error("Tarjimani o'qishda xatolik.");
        }

        if (sourceLangLabel && parsed.detected_lang) {
            sourceLangLabel.textContent = parsed.detected_lang;
        }

        let finalTranslation = parsed.translation || "";

        // Применяем новый узбекский алфавит ТОЛЬКО если целевой язык - узбекский
        if (targetLang === "O'zbek tili" && typeof enforceNewUzbekAlphabet === "function") {
            finalTranslation = enforceNewUzbekAlphabet(finalTranslation);
        }

        // Сохраняем "чистый" текст для копирования, а выводим с тегами <br> для переносов
        contentBox.dataset.rawTranslation = finalTranslation;
        contentBox.innerHTML = finalTranslation.replace(/\n/g, "<br>");

    } catch (err) {
        contentBox.innerHTML = `<span style="color: #EF4444; font-weight: 700;">Xatolik yuz berdi: ${err.message}</span>`;
    }
};

// Функция копирования
window.copyTranslatedText = function(btnEl) {
    const contentBox = document.getElementById("transContent");
    if (!contentBox) return;
    const textToCopy = contentBox.dataset.rawTranslation || contentBox.innerText;
    
    if (!textToCopy) return;

    navigator.clipboard.writeText(textToCopy).then(() => {
        const origHtml = btnEl.innerHTML;
        btnEl.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> <span>Nusxalandi</span>`;
        setTimeout(() => { btnEl.innerHTML = origHtml; }, 1500);
    });
};

// Функция замены текста в редакторе
window.replaceWithTranslation = function() {
    const contentBox = document.getElementById("transContent");
    if (!contentBox || !editor) return;
    
    const textToInsert = contentBox.dataset.rawTranslation || contentBox.innerText;
    if (!textToInsert) return;

    editor.value = textToInsert;
    if (typeof saveEditorDraft === "function") saveEditorDraft();
    if (typeof calculateAndRenderTextStats === "function") calculateAndRenderTextStats();
    if (typeof showAutosaveIndicator === "function") showAutosaveIndicator("Tarjima joylandi ✓");
    
    closeTranslatorPanel();
};

// ==========================================
// === 16. МОДУЛЬ АНТИПЛАГИАТА ДЛЯ ФАЙЛОВ ===
// ==========================================

window.openPlagiatModal = function() {
    const modal = document.getElementById('plagiatModalBackdrop');
    if (!modal) return;
    modal.classList.add('open');
    runPlagiarismCheck();
};

window.closePlagiatModal = function(event) {
    const modal = document.getElementById('plagiatModalBackdrop');
    if (!modal) return;
    if (event && event.target && event.target !== modal) return;
    modal.classList.remove('open');
};

async function runPlagiarismCheck() {
    const listEl = document.getElementById("plagiatSourcesList");
    const scoreNum = document.getElementById("plagiatScoreNum");
    const fillBar = document.getElementById("plagiatProgressFill");
    
    // Очистка и лоадер
    listEl.innerHTML = `<div style="text-align:center; color:#0284C7; font-weight:700; padding:20px;">AI faylni öqimoqda va manbalarni qidirmoqda... Kuting...</div>`;
    scoreNum.textContent = "Hisoblanmoqda...";
    scoreNum.style.color = "#94A3B8";
    fillBar.style.width = "0%";
    fillBar.style.background = "#CBD5E1";

    const textToCheck = (window.extractedFileText || "").substring(0, 4500).trim();
    if (!textToCheck) {
        listEl.innerHTML = `<div style="text-align:center; color:#EF4444; font-weight:700;">Fayl içidan matn topilmadi.</div>`;
        return;
    }

    // Обновленный промпт: жестко требуем URL
    const promptText = `Sen professional antiplagiat tizimisan. Berilgan matnni chuqur tahlil qilib, uning qanchalik original ekanligini (foizda) va qaysi qismlari boshqa manbalardan (internet, kitoblar, maqolalar) olinganini aniqla. Matn har qanday tilda bo'lishi mumkin.
Javobni FAQAT toza JSON formatida qaytar, hech qanday qo'shimcha so'z qo'shma.
Format:
{
  "originality_percentage": 75,
  "sources": [
    { 
      "fragment": "köçirilgan matn qismi...", 
      "source_name": "Manba nomi (masalan: Wikipedia, Kun.uz)",
      "source_url": "https://..."
    }
  ]
}
Agar aniq URL manzil topolmasang, "source_url" maydonini bo'sh qoldir.
Matn: "${textToCheck}"`;

    try {
        const response = await fetch(AI_PROXY_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "custom", text: textToCheck, customPrompt: promptText })
        });

        if (!response.ok) throw new Error("Server xatosi");

        const data = await response.json();
        let rawResult = "";
        if (typeof data === "string") rawResult = data;
        else if (data && data.result) rawResult = data.result;
        else if (data && data.response) rawResult = data.response;
        else rawResult = JSON.stringify(data);

        let parsed = null;
        try {
            let clean = rawResult.replace(/```json/gi, '').replace(/```/g, '').trim();
            const startIdx = clean.indexOf('{');
            const endIdx = clean.lastIndexOf('}');
            if (startIdx !== -1 && endIdx !== -1) {
                clean = clean.substring(startIdx, endIdx + 1);
            }
            parsed = JSON.parse(clean);
        } catch(e) {
            throw new Error("AI javobini öqişda xatolik.");
        }

        const score = parseInt(parsed.originality_percentage) || 0;
        
        // Анимация прогресс-бара
        scoreNum.textContent = score + "%";
        fillBar.style.width = score + "%";
        
        // Цвет в зависимости от процента оригинальности
        if (score >= 80) {
            scoreNum.style.color = "#10B981"; 
            fillBar.style.background = "linear-gradient(90deg, #10B981 0%, #34D399 100%)";
        } else if (score >= 50) {
            scoreNum.style.color = "#F59E0B"; 
            fillBar.style.background = "linear-gradient(90deg, #F59E0B 0%, #FBBF24 100%)";
        } else {
            scoreNum.style.color = "#EF4444"; 
            fillBar.style.background = "linear-gradient(90deg, #EF4444 0%, #F87171 100%)";
        }

        listEl.innerHTML = "";
        
        if (!parsed.sources || parsed.sources.length === 0) {
            listEl.innerHTML = `<div style="text-align:center; color:#10B981; font-weight:700; padding:10px;">Ajoyib! Heç qanday köçirma topilmadi. Matn noyob.</div>`;
            return;
        }

        parsed.sources.forEach(src => {
            const card = document.createElement("div");
            card.className = "plagiat-source-card";
            
            let sourceHtml = "";
            
            // Если ИИ выдал точную ссылку
            if (src.source_url && src.source_url.startsWith("http")) {
                sourceHtml = `<a href="${src.source_url}" target="_blank" rel="noopener" class="plagiat-source-link">${src.source_name || src.source_url}</a>`;
            } 
            // Если ссылки нет (или она битая), генерируем поиск фразы в Google
            else {
                // Берем первые 20 слов фрагмента для точного поиска в кавычках
                const searchSnippet = src.fragment.split(" ").slice(0, 20).join(" ");
                const searchUrl = `https://www.google.com/search?q=${encodeURIComponent('"' + searchSnippet + '"')}`;
                
                sourceHtml = `
                    <span style="font-weight:800; font-size: 13px; color:#0F172A;">${src.source_name || "Noma'lum manba"}</span>
                    <a href="${searchUrl}" target="_blank" rel="noopener" class="plagiat-source-link" style="margin-left: 8px; font-weight: 600;">(Google'dan qidirish ↗)</a>
                `;
            }

            card.innerHTML = `
                <div class="plagiat-source-text">"${src.fragment}"</div>
                <div style="display:flex; align-items:center; gap:6px; margin-top:4px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2.5" style="flex-shrink: 0;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                    <div style="min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${sourceHtml}
                    </div>
                </div>
            `;
            listEl.appendChild(card);
        });

    } catch (err) {
        scoreNum.textContent = "Xato";
        fillBar.style.width = "0%";
        listEl.innerHTML = `<div style="text-align:center; color:#EF4444; font-weight:700;">Tahlil qilişda xatolik yuz berdi: ${err.message}</div>`;
    }
}

// Слушатель для свитчера, чтобы прятать/показывать кнопку динамически, если файл уже загружен
const pToggle = document.getElementById('plagiatToggleInput');
if (pToggle) {
    pToggle.addEventListener('change', (e) => {
        const pBtn = document.getElementById('plagiatResultBtn');
        const saveBtn = document.getElementById('saveBtn');
        // Показываем кнопку антиплагиата только если свитчер включен И файл уже обработан (кнопка сохранения видна)
        if (pBtn && saveBtn && saveBtn.style.display !== 'none') {
            pBtn.style.display = e.target.checked ? 'inline-flex' : 'none';
        }
    });
}

// ==========================================
// === 17. AI-КОНСПЕКТ ФАЙЛА И ГЕНЕРАТОР ТЕСТОВ ===
// ==========================================

// Функция 1: Краткое содержание извлеченного файла
window.executeFileSummary = async function() {
    const text = (window.extractedFileText || "").substring(0, 10000).trim(); // Берем до 10 000 символов
    if (!text) {
        alert("Fayl içidan matn topilmadi!");
        return;
    }

    if (typeof setAiLoadingState === "function") setAiLoadingState(true);
    if (typeof showAutosaveIndicator === "function") showAutosaveIndicator("Fayl öqilmoqda...");

    // Промпт: просим выделить 5-7 главных мыслей
    const promptText = `Sen professional tahlilchisan. Har xil tillarni 100 foiz mukammal va erkin bilasan. Quyidagi matnni diqqat bilan o'qib chiqib, uning qisqacha mazmunini (konspekt) 5-7 ta eng muhim tezislar ko'rinishida yozib ber. 
Javobingni qulay va chiroyli formatda, sarlavha va ro'yxat (bullet points) shaklida taqdim et. Sening javobing berilgan asl matn tilida bo'lishi shart.
Matn: "${text}"`;

    try {
        const response = await fetch(AI_PROXY_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "custom", text: text, customPrompt: promptText })
        });

        if (!response.ok) throw new Error("Server xatosi");
        const data = await response.json();
        
        let rawResult = "";
        if (typeof data === "string") rawResult = data;
        else if (data && data.result) rawResult = data.result;
        else if (data && data.response) rawResult = data.response;
        else rawResult = JSON.stringify(data);

        // Применяем новый алфавит
        let cleanResult = typeof enforceNewUzbekAlphabet === "function" ? enforceNewUzbekAlphabet(rawResult) : rawResult;

        // Открываем существующее мощное окно результатов ИИ!
        if (typeof openAiResultModal === "function") {
            openAiResultModal(cleanResult);
        }

        if (typeof showAutosaveIndicator === "function") showAutosaveIndicator("Xulosa tayyor ✓");
    } catch (err) {
        console.error("Summary Error:", err);
        alert("Tahlil qilişda xatolik yuz berdi. Internetni tekşiring.");
    } finally {
        if (typeof setAiLoadingState === "function") setAiLoadingState(false);
    }
};

// Функция 2: Генератор тестов и карточек из редактора
window.generateAiTests = async function() {
    if (typeof closeAiMenu === "function") closeAiMenu();

    if (!editor || !editor.value.trim()) {
        if (typeof showAutosaveIndicator === "function") showAutosaveIndicator("Avval matn kiriting!");
        if (editor) editor.focus();
        return;
    }

    const text = editor.value.trim();
    if (typeof setAiLoadingState === "function") setAiLoadingState(true);
    if (typeof showAutosaveIndicator === "function") showAutosaveIndicator("Testlar tuzilmoqda...");

    // Промпт: 5 тестов (ABCD) и 5 карточек (вопрос-ответ)
    const promptText = `Sen tajribali o'qituvchi va repetitorsan. Berilgan matn (xohlagan tilda bo'lishi mumkin) asosida bilimni tekshirish uchun quyidagilarni tuzib ber:
1. 5 ta yopiq test savoli (A, B, C, D variantlari bilan). To'g'ri javoblarni **qalin (bold)** qilib belgilab ko'rsat.
2. 5 ta qisqa "Savol - Javob" (flesh-kartochkalar uchun).
Javobing aniq, tushunarli va Markdown formatida (chiroyli sarlavhalar bilan) bo'lsin.
Matn: "${text.substring(0, 5000)}"`;

    try {
        const response = await fetch(AI_PROXY_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "custom", text: text, customPrompt: promptText })
        });

        if (!response.ok) throw new Error("Server xatosi");
        const data = await response.json();
        
        let rawResult = "";
        if (typeof data === "string") rawResult = data;
        else if (data && data.result) rawResult = data.result;
        else if (data && data.response) rawResult = data.response;
        else rawResult = JSON.stringify(data);

        // Применяем новый алфавит
        let cleanResult = typeof enforceNewUzbekAlphabet === "function" ? enforceNewUzbekAlphabet(rawResult) : rawResult;

        // Открываем существующее мощное окно результатов ИИ
        if (typeof openAiResultModal === "function") {
            openAiResultModal(cleanResult);
        }

        if (typeof showAutosaveIndicator === "function") showAutosaveIndicator("Testlar tayyor ✓");
    } catch (err) {
        console.error("Test Gen Error:", err);
        alert("Test tuzişda xatolik yuz berdi. Internetni tekşiring.");
    } finally {
        if (typeof setAiLoadingState === "function") setAiLoadingState(false);
    }
};

// ==========================================
// === 18. УМНАЯ БЕГУЩАЯ СТРОКА НОВОСТЕЙ (DUAL-ENGINE) ===
// ==========================================

const RSS_STORAGE_KEY = "ulh_news_sources_v1";
const DEFAULT_RSS_SOURCES = [
    { url: "https://kun.uz/news/rss?lang=uz", name: "Kun.uz" },
    { url: "https://podrobno.uz/rss/", name: "Podrobno.uz" },
    { url: "https://www.gazeta.uz/oz/feeds/", name: "Gazeta.uz" },
    { url: "https://batafsil.uz/rss/", name: "Batafsil.uz" },
    { url: "https://darakchi.uz/uz/yandex-rss", name: "Darakchi.uz" }
];

function getNewsSources() {
    try {
        const stored = localStorage.getItem(RSS_STORAGE_KEY);
        return stored ? JSON.parse(stored) : DEFAULT_RSS_SOURCES;
    } catch (e) {
        return DEFAULT_RSS_SOURCES;
    }
}

function saveNewsSources(sources) {
    localStorage.setItem(RSS_STORAGE_KEY, JSON.stringify(sources));
}

function formatRssDate(dateStr) {
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr; // Если дата не парсится
        const day = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const hours = d.getHours().toString().padStart(2, '0');
        const mins = d.getMinutes().toString().padStart(2, '0');
        return `${hours}:${mins}, ${day}.${month}`;
    } catch(e) {
        return dateStr;
    }
}

// === УТИЛИТЫ ДЛЯ РЕЗЕРВНОГО XML-ПАРСЕРА ===
function extractImageFromNode(itemNode) {
    const enclosure = itemNode.querySelector("enclosure[type^='image']");
    if (enclosure && enclosure.getAttribute("url")) return enclosure.getAttribute("url");
    
    const mediaContent = itemNode.getElementsByTagNameNS("*", "content");
    for (let i = 0; i < mediaContent.length; i++) {
        if (mediaContent[i].getAttribute("url") && mediaContent[i].getAttribute("medium") === "image") {
            return mediaContent[i].getAttribute("url");
        }
    }
    
    const descNode = itemNode.querySelector("description");
    if (descNode) {
        const imgMatch = descNode.textContent.match(/<img[^>]+src="([^">]+)"/);
        if (imgMatch && imgMatch[1]) return imgMatch[1];
    }
    return "./header.png"; 
}

function extractSnippet(itemNode) {
    const descNode = itemNode.querySelector("description");
    if (!descNode) return "";
    return descNode.textContent.replace(/<[^>]*>?/gm, '').trim();
}

function escapeHTML(str) {
    if(!str) return "";
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag]));
}

// === БРОНЕБОЙНЫЙ DUAL-ENGINE ЗАГРУЗЧИК ===
async function fetchRssBulletproof(url) {
    // 1. Основной двигатель: RSS2JSON (Быстрый, обходит Cloudflare, отдает готовый JSON)
    const primaryApi = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`;
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(primaryApi, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (res.ok) {
            const data = await res.json();
            if (data.status === "ok" && data.items) {
                return { type: "json", items: data.items }; // Успех!
            }
        }
    } catch (e) {
        console.warn(`RSS2JSON xatosi (${url}), AllOrigins'ga o'tilmoqda...`);
    }

    // 2. Резервный двигатель: AllOrigins (Отдает сырой XML)
    const fallbackApi = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(fallbackApi, { signal: controller.signal, cache: "no-store" });
        clearTimeout(timeoutId);

        if (res.ok) {
            const data = await res.json();
            if (data.contents && (data.contents.includes('<rss') || data.contents.includes('<feed'))) {
                return { type: "xml", content: data.contents }; // Успех резерва!
            }
        }
    } catch (e) {
        console.warn(`AllOrigins xatosi (${url})`);
    }

    throw new Error("Manbadan ma'lumot olib bölmadi");
}

// === РЕНДЕР И ЛОГИКА ===
// === ОБНОВЛЕННЫЙ РЕНДЕР С ДИНАМИЧЕСКОЙ СКОРОСТЬЮ ===
function renderNewsToDOM(newsArray, trackEl) {
    let htmlContent = "";
    newsArray.forEach(news => {
        htmlContent += `
            <div class="news-item"
                data-title="${escapeHTML(news.title)}"
                data-link="${escapeHTML(news.link)}"
                data-source="${escapeHTML(news.sourceName)}"
                data-image="${escapeHTML(news.image)}"
                data-snippet="${escapeHTML(news.snippet)}"
                data-date="${escapeHTML(news.date)}"
                data-category="${escapeHTML(news.category)}"
                onmouseenter="showGlobalNewsPopup(this, event)"
                onmouseleave="hideGlobalNewsPopup()"
            >
                <span class="news-item-source">${news.sourceName}</span>
                <span>— ${news.title.substring(0, 60)}${news.title.length > 60 ? '...' : ''}</span>
            </div>
        `;
    });
    
    // Дублируем контент для бесконечной прокрутки
    trackEl.innerHTML = htmlContent + htmlContent;

    // СЕКРЕТНЫЙ ИНГРЕДИЕНТ: Динамическая скорость
    // Даем ровно по 6 секунд на каждую загруженную новость
    // Чем больше новостей, тем больше времени будет длиться анимация, а скорость останется постоянной!
    const timePerItem = 6; 
    const totalDuration = newsArray.length * timePerItem;
    
    // Применяем вычисленное время напрямую к элементу
    trackEl.style.animationDuration = `${totalDuration}s`;
}

window.showGlobalNewsPopup = function(el, e) {
    let popup = document.getElementById("globalNewsPopup");
    
    if (!popup) {
        popup = document.createElement("div");
        popup.id = "globalNewsPopup";
        popup.className = "news-popup-global";
        document.body.appendChild(popup);

        popup.onmouseenter = () => {
            popup.style.opacity = "1";
            popup.style.visibility = "visible";
            const track = document.getElementById("newsTickerTrack");
            if (track) track.style.animationPlayState = 'paused';
        };
        popup.onmouseleave = () => {
            window.hideGlobalNewsPopup();
        };
    }

    const track = document.getElementById("newsTickerTrack");
    if (track) track.style.animationPlayState = 'paused';

    popup.innerHTML = `
        <div class="news-popup-header">
            <div class="news-popup-title-col">
                <a href="${el.dataset.link}" target="_blank" rel="noopener" class="news-popup-source-link">${el.dataset.source} ↗</a>
                <div class="news-popup-title">${el.dataset.title}</div>
            </div>
            <a href="${el.dataset.link}" target="_blank" rel="noopener">
                <img src="${el.dataset.image}" alt="Rasm" class="news-popup-image" onerror="this.src='./news.png'">
            </a>
        </div>
        <div class="news-popup-snippet">${el.dataset.snippet || "Batafsil ma'lumotni saytda öqing..."}</div>
        <div class="news-popup-footer">
            <span>${el.dataset.date}</span>
            <span style="color:#0284C7; background:#E0F2FE; padding:3px 8px; border-radius:6px;">${el.dataset.category}</span>
        </div>
    `;

    const wrapper = document.querySelector(".news-ticker-wrapper");
    const rect = wrapper.getBoundingClientRect();

    let leftPos = e.clientX;
    const popupWidth = 350; 
    
    if (leftPos < popupWidth / 2 + 20) leftPos = popupWidth / 2 + 20;
    if (leftPos > window.innerWidth - popupWidth / 2 - 20) leftPos = window.innerWidth - popupWidth / 2 - 20;

    popup.style.top = (rect.bottom + window.scrollY + 8) + "px"; 
    popup.style.left = leftPos + "px";
    popup.style.transform = "translateX(-50%)"; 
    popup.style.opacity = "1";
    popup.style.visibility = "visible";
};

window.hideGlobalNewsPopup = function() {
    const popup = document.getElementById("globalNewsPopup");
    if (popup) {
        popup.style.opacity = "0";
        popup.style.visibility = "hidden";
    }
    const track = document.getElementById("newsTickerTrack");
    if (track) track.style.animationPlayState = 'running';
};

// === СБОРКА НОВОСТЕЙ ===
async function fetchAndRenderNews() {
    const track = document.getElementById("newsTickerTrack");
    if (!track) return;

    const sources = getNewsSources();
    const sourcesStr = JSON.stringify(sources);
    
    const cacheData = sessionStorage.getItem("ulh_news_cache");
    const cacheTime = sessionStorage.getItem("ulh_news_time");
    const cacheSources = sessionStorage.getItem("ulh_news_sources");

    if (cacheData && cacheTime && cacheSources === sourcesStr) {
        const now = new Date().getTime();
        if (now - parseInt(cacheTime) < 10 * 60 * 1000) { // 10 минут кэша
            renderNewsToDOM(JSON.parse(cacheData), track);
            return;
        }
    }

    track.innerHTML = `<div style="color: #64748B; font-size: 13px; font-weight: 700; padding-left: 14px;">Yangiliklar yuklanmoqda... Kuting...</div>`;
    
    let allNews = [];

    const fetchPromises = sources.map(async (src) => {
        try {
            const result = await fetchRssBulletproof(src.url);
            
            if (result.type === "json") {
                // Если отработал основной API RSS2JSON
                for (let i = 0; i < Math.min(result.items.length, 5); i++) {
                    const item = result.items[i];
                    let snippet = (item.description || "").replace(/<[^>]*>?/gm, '').trim();
                    let image = item.thumbnail || (item.enclosure && item.enclosure.link) || "./news.png";
                    
                    if (image === "./header.png" && item.description && item.description.includes("<img")) {
                         const imgMatch = item.description.match(/<img[^>]+src="([^">]+)"/);
                         if (imgMatch && imgMatch[1]) image = imgMatch[1];
                    }

                    allNews.push({
                        sourceName: src.name,
                        title: item.title,
                        link: item.link,
                        date: item.pubDate ? formatRssDate(item.pubDate) : "",
                        category: (item.categories && item.categories.length > 0) ? item.categories[0] : "Yangiliklar",
                        image: image,
                        snippet: snippet
                    });
                }
            } else if (result.type === "xml") {
                // Если отработал резервный XML-парсер AllOrigins
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(result.content, "text/xml");
                const items = xmlDoc.querySelectorAll("item");
                
                for (let i = 0; i < Math.min(items.length, 5); i++) {
                    const item = items[i];
                    const titleNode = item.querySelector("title");
                    const linkNode = item.querySelector("link");
                    
                    if (titleNode && linkNode) {
                        const pubDateNode = item.querySelector("pubDate");
                        const categoryNode = item.querySelector("category");
                        allNews.push({
                            sourceName: src.name,
                            title: titleNode.textContent,
                            link: linkNode.textContent,
                            date: pubDateNode ? formatRssDate(pubDateNode.textContent) : "",
                            category: categoryNode ? categoryNode.textContent : "Yangiliklar",
                            image: extractImageFromNode(item),
                            snippet: extractSnippet(item)
                        });
                    }
                }
            }
        } catch (err) {
            console.error(`RSS Xatolik (${src.name}):`, err);
        }
    });

    await Promise.all(fetchPromises);

    if (allNews.length === 0) {
        track.innerHTML = `<div style="color: #EF4444; font-size: 13px; font-weight: 700; padding-left: 14px;">Yangiliklarni yuklaşda xatolik yuz berdi. Internetni tekşiring.</div>`;
        return;
    }

    // Перемешиваем новости случайным образом
    for (let i = allNews.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allNews[i], allNews[j]] = [allNews[j], allNews[i]];
    }

    sessionStorage.setItem("ulh_news_cache", JSON.stringify(allNews));
    sessionStorage.setItem("ulh_news_time", new Date().getTime().toString());
    sessionStorage.setItem("ulh_news_sources", sourcesStr);

    renderNewsToDOM(allNews, track);
}

// === УПРАВЛЕНИЕ МОДАЛЬНЫМ ОКНОМ ===
window.openNewsModal = function(event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    const modal = document.getElementById("newsModalBackdrop");
    if (modal) modal.classList.add("open");
    renderNewsSourcesList();
};

window.closeNewsModal = function(event) {
    const modal = document.getElementById("newsModalBackdrop");
    if (!modal) return;
    if (event && event.target && event.target !== modal) return;
    modal.classList.remove("open");
};

function renderNewsSourcesList() {
    const grid = document.getElementById("newsSourcesGrid");
    if (!grid) return;
    const sources = getNewsSources();
    
    grid.innerHTML = "";
    sources.forEach((src, index) => {
        const card = document.createElement("div");
        card.className = "news-source-card";
        card.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:2px; flex:1; min-width:0;">
                <span style="font-size:13px; font-weight:800;">${src.name}</span>
                <span style="font-size:11px; color:#64748B; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${src.url}</span>
            </div>
            <button onclick="removeNewsSource(${index})" style="background:rgba(239,68,68,0.1); border:none; width:30px; height:30px; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#EF4444; cursor:pointer; flex-shrink:0;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
        `;
        grid.appendChild(card);
    });
}

window.removeNewsSource = function(index) {
    let sources = getNewsSources();
    sources.splice(index, 1);
    saveNewsSources(sources);
    sessionStorage.removeItem("ulh_news_time"); 
    renderNewsSourcesList();
    
    document.getElementById("newsTickerTrack").innerHTML = `<div style="color: #64748B; font-size: 13px; font-weight: 700; padding-left: 14px;">Yangilanmoqda...</div>`;
    fetchAndRenderNews(); 
};

window.addCustomNewsSource = function() {
    const input = document.getElementById("newRssInput");
    if (!input || !input.value.trim()) return;
    
    let url = input.value.trim();
    if (!url.startsWith("http")) url = "https://" + url;

    let domain = url;
    try {
        const urlObj = new URL(url);
        domain = urlObj.hostname.replace("www.", "");
        domain = domain.charAt(0).toUpperCase() + domain.slice(1);
    } catch(e) {}

    let sources = getNewsSources();
    sources.push({ url: url, name: domain });
    saveNewsSources(sources);
    sessionStorage.removeItem("ulh_news_time"); 
    
    input.value = "";
    renderNewsSourcesList();
    
    document.getElementById("newsTickerTrack").innerHTML = `<div style="color: #64748B; font-size: 13px; font-weight: 700; padding-left: 14px;">Yangilanmoqda...</div>`;
    fetchAndRenderNews(); 
};

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeNewsModal();
});

// Запуск
fetchAndRenderNews();
