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
        btn.innerText = 'Nusxalandi ✓';
        btn.classList.add('copied');
        setTimeout(() => {
            btn.innerText = 'Nusxa oliş';
            btn.classList.remove('copied');
        }, 1000);
    }).catch(() => {
        btn.innerText = 'Nusxa olinmadi';
        setTimeout(() => { btn.innerText = 'Nusxa oliş'; }, 1000);
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
