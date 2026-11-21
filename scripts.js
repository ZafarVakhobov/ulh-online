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
    const pdfStage = document.getElementById('pdfRenderStage');
    const saveMenuWrap = document.getElementById('fileSaveMenuWrap'); // Наше новое меню

    if (!fileInfo || !pdfStage) return;

    // Прячем меню перед новой обработкой
    if (saveMenuWrap) saveMenuWrap.style.display = 'none';
    
    processedBlob = null;
    window.extractedFileText = ""; 
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
            
            if (typeof prepareOfficePdfStage === "function") {
                await prepareOfficePdfStage(ext, processedBlob, zip, pdfStage);
            }

        } else if (['png', 'jpg', 'jpeg'].includes(ext)) {
            // === МАГИЯ РАСПОЗНАВАНИЯ КАРТИНОК (OCR) ===
            fileInfo.style.color = "#3B82F6";
            fileInfo.innerText = "Rasm o'qilmoqda (AI OCR), kuting...";
            
            const result = await Tesseract.recognize(file, 'uzb_cyrl+uzb+rus', {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        fileInfo.innerText = `Skanner qilinmoqda: ${Math.round(m.progress * 100)}%`;
                    } else if (m.status === 'loading tesseract core') {
                        fileInfo.innerText = `AI yadrosi ishga tushmoqda...`;
                    }
                }
            });
            
            const extractedText = result.data.text;
            const convertedText = applyReplacements(extractedText);
            
            const editorEl = document.getElementById('editor');
            if (editorEl) {
                const currentVal = editorEl.value.trim();
                editorEl.value = currentVal ? currentVal + "\n\n" + convertedText : convertedText;
                
                if (typeof saveEditorDraft === "function") saveEditorDraft();
                if (typeof calculateAndRenderTextStats === "function") calculateAndRenderTextStats();
                if (typeof showAutosaveIndicator === "function") showAutosaveIndicator("Rasm matnga ögirildi ✓");
            }
            
            fileInfo.style.color = "#10B981";
            fileInfo.innerText = "Rasm muvaffaqiyatli öqildi ✓";
            
            setTimeout(() => {
                fileInfo.style.color = "#64748B";
                fileInfo.innerText = "Yuklab bölaydigan fayllar formati: .docx, .xlsx, .pptx, .txt, .png, .jpg";
            }, 3000);
            
            return; 
        } else {
            throw new Error("Noto'g'ri format");
        }

        // --- УСПЕШНАЯ КОНВЕРТАЦИЯ - ОТОБРАЖАЕМ МЕНЮ ---
        fileInfo.style.color = "#10B981";
        fileInfo.innerText = "Tayyor: " + processedOutName;
        
        if (saveMenuWrap) {
            saveMenuWrap.style.display = 'inline-flex';
            
            // Динамически меняем бейджик расширения (цвет и текст)
            const extBadge = document.getElementById('saveOriginalExt');
            const iconBadge = document.getElementById('saveOriginalBadge');
            
            if (extBadge && iconBadge) {
                extBadge.textContent = "." + ext.toUpperCase();
                
                if (ext === 'docx') {
                    extBadge.style.background = "#0284C7"; // Синий Word
                    iconBadge.style.background = "#E0F2FE";
                    iconBadge.style.color = "#0284C7";
                } else if (ext === 'xlsx') {
                    extBadge.style.background = "#10B981"; // Зеленый Excel
                    iconBadge.style.background = "#ECFDF5";
                    iconBadge.style.color = "#10B981";
                } else if (ext === 'pptx') {
                    extBadge.style.background = "#EA580C"; // Оранжевый PowerPoint
                    iconBadge.style.background = "#FFEDD5";
                    iconBadge.style.color = "#EA580C";
                } else if (ext === 'txt') {
                    extBadge.style.background = "#7C3AED"; // Фиолетовый Текст
                    iconBadge.style.background = "#F3E8FF";
                    iconBadge.style.color = "#7C3AED";
                }
            }
        }

        // Отправка системного уведомления
        let fileBtnClass = "n-btn-neutral";
        if (ext === 'docx') fileBtnClass = "n-btn-docx";
        else if (ext === 'xlsx') fileBtnClass = "n-btn-xlsx";
        else if (ext === 'pptx') fileBtnClass = "n-btn-pptx";
        else if (ext === 'txt') fileBtnClass = "n-btn-txt";

        if (typeof addNotification === "function") {
            addNotification({
                type: 'file',
                title: 'Fayl konvertatsiya qilindi',
                desc: `${file.name} muvaffaqiyatli ögirildi. Yuklab olişingiz mumkin.`,
                iconBg: '#E0F2FE', iconColor: '#0284C7',
                iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
                actions: [
                    { label: 'Faylni saqlaş', colorClass: fileBtnClass, onClick: 'downloadFile()' },
                    { label: 'PDF saqlaş', colorClass: 'n-btn-pdf', onClick: 'downloadPdfFile()' }
                ]
            });
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
    const fileInfo = document.getElementById('fileInfo');
    
    // ИСПРАВЛЕНИЕ: Убрана жесткая привязка к старой кнопке savePdfBtn
    if (!stage || !stage.innerHTML.trim() || !fileInfo) return;

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

// Изменения курсов (Diff) из API ЦБ для информера
window.CURRENCY_DIFFS = {};

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
                    window.CURRENCY_DIFFS[item.Ccy] = parseFloat(item.Diff) || 0;
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

// === ГЕНЕРАТОР PNG-ИНФОРМЕРА КУРСОВ ВАЛЮТ ===
window.toggleCurrencyExportMenu = function(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    const wrap = document.getElementById("currExportWrap");
    if (wrap) wrap.classList.toggle("open");
};

document.addEventListener("click", (e) => {
    const wrap = document.getElementById("currExportWrap");
    if (wrap && !wrap.contains(e.target)) {
        wrap.classList.remove("open");
    }
});

function formatInformerPrice(val) {
    const num = Number(val) || 0;
    const parts = num.toFixed(2).split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return parts.join(",");
}

window.downloadCurrencyInformer = async function(theme) {
    const wrap = document.getElementById("currExportWrap");
    const btn = document.getElementById("currExportBtn");
    const stage = document.getElementById("currencyInformerStage");
    if (wrap) wrap.classList.remove("open");
    if (!stage || typeof html2canvas !== "function") return;

    const btnSpan = btn ? btn.querySelector("span") : null;
    const origText = btnSpan ? btnSpan.textContent : "Rasm yuklaş";
    if (btnSpan) btnSpan.textContent = "Tayyorlanmoqda...";
    if (btn) btn.disabled = true;

    try {
        // Актуальная дата по Ташкенту (UTC+5)
        const tzDate = new Date(Date.now() + 5 * 60 * 60 * 1000);
        const dd = String(tzDate.getUTCDate()).padStart(2, "0");
        const mm = String(tzDate.getUTCMonth() + 1).padStart(2, "0");
        const yyyy = tzDate.getUTCFullYear();
        const dateStr = `${dd}.${mm}.${yyyy}`;

        const logoPath = theme === "dark" ? "/logo-dark.svg" : "/logo.svg";
        const diffs = window.CURRENCY_DIFFS || {};

        const items = [
            { code: "USD", sym: "$", rate: CURRENCY_NUMERIC.USD, diff: diffs.USD },
            { code: "EUR", sym: "€", rate: CURRENCY_NUMERIC.EUR, diff: diffs.EUR },
            { code: "RUB", sym: "₽", rate: CURRENCY_NUMERIC.RUB, diff: diffs.RUB },
            { code: "CNY", sym: "¥", rate: CURRENCY_NUMERIC.CNY, diff: diffs.CNY }
        ];

        const rowsHtml = items.map(item => {
            const hasDiff = typeof item.diff === "number" && !isNaN(item.diff);
            const diffClass = !hasDiff || item.diff === 0 ? "flat" : (item.diff > 0 ? "up" : "down");
            const arrow = diffClass === "up" ? "↑" : (diffClass === "down" ? "↓" : "•");
            const diffVal = hasDiff ? Math.abs(item.diff).toFixed(2).replace(".", ",") : "0,00";

            const diffBlock = hasDiff ? `
                <div class="curr-inf-diff ${diffClass}">
                    <span class="curr-inf-diff-num">${diffVal}</span>
                    <div class="curr-inf-arrow">${arrow}</div>
                </div>
            ` : "";

            return `
                <div class="curr-inf-row">
                    <div class="curr-inf-left">
                        <div class="curr-inf-code">${item.code}</div>
                        <div class="curr-inf-sym">${item.sym}</div>
                        <div class="curr-inf-val">${formatInformerPrice(item.rate)}<span>söm</span></div>
                    </div>
                    ${diffBlock}
                </div>
            `;
        }).join("");

        stage.innerHTML = `
            <div class="curr-inf-card ${theme}" id="currInfCardNode">
                <div class="curr-inf-top">
                    <div>
                        <h2 class="curr-inf-title">VALYUTALAR KURSI</h2>
                        <div class="curr-inf-date">${dateStr} holatiga köra</div>
                    </div>
                    <img src="${logoPath}" alt="Logo" class="curr-inf-logo" id="currInfLogoImg">
                </div>
                <div class="curr-inf-accent-line"></div>
                <div class="curr-inf-rows">${rowsHtml}</div>
                <div class="curr-inf-footer">
                    <span>Özbekiston Markaziy banki ma'lumotlari</span>
                    <span>ulh-online.uz</span>
                </div>
            </div>
        `;

        // Ждём загрузки SVG-логотипа и шрифта Manrope перед рендером
        const logoImg = document.getElementById("currInfLogoImg");
        if (logoImg && !logoImg.complete) {
            await new Promise(resolve => {
                logoImg.onload = resolve;
                logoImg.onerror = resolve;
            });
        }
        if (document.fonts && document.fonts.ready) {
            await document.fonts.ready;
        }

        const cardNode = document.getElementById("currInfCardNode");
        const canvas = await html2canvas(cardNode, {
            scale: 2,
            useCORS: true,
            backgroundColor: null,
            logging: false
        });

        const link = document.createElement("a");
        link.download = `valyuta_kursi_${dd}-${mm}-${yyyy}_${theme}.png`;
        link.href = canvas.toDataURL("image/png");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        stage.innerHTML = "";
    } catch (err) {
        console.error("Currency Informer Error:", err);
        alert("Rasmni yaratişda xatolik yuz berdi.");
    } finally {
        if (btnSpan) btnSpan.textContent = origText;
        if (btn) btn.disabled = false;
    }
};

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

        // [ВСТАВИТЬ СЮДА]:
        const qrInput = document.getElementById("qrTextInput");
        if (qrInput && qrInput.value.trim().length > 0) {
            addNotification({
                type: 'qr',
                title: 'QR-kod tayyor',
                desc: `Qiymat: ${qrInput.value.substring(0, 30)}...`,
                iconBg: '#E2E8F0', iconColor: '#0F172A',
                iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
                actions: [
                    { label: 'Oçiş', colorClass: 'n-btn-neutral', onClick: "document.getElementById('navResourcesItem').querySelector('button').click(); setTimeout(()=>openQrModal(null), 100);" },
                    { label: 'PNG', colorClass: 'n-btn-xlsx', onClick: 'downloadQrPng()' },
                    { label: 'SVG', colorClass: 'n-btn-docx', onClick: 'downloadQrSvg()' }
                ]
            });
        }
        
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

    // === СБРОС ===
    const aiResultsBox = document.getElementById('aiStatsResults');
    if (aiResultsBox) aiResultsBox.style.display = 'none';
    // ===================================
    
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
    
    // Мгновенно перерисовываем иконки уведомлений при смене темы
    if (typeof renderNotifications === "function") {
        renderNotifications();
    }
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

// Инструменты чистки пробелов, смены регистра и УМНОЙ ТИПОГРАФИКИ
function applyEditorTool(actionType) {
    if (!editor || !editor.value) {
        closeEditorToolsMenu();
        return;
    }

    let text = editor.value;

    if (actionType === "clean_spaces") {
        text = text
            .replace(/[ \t]+/g, " ")               
            .replace(/^[ \t]+|[ \t]+$/gm, "")      
            .replace(/\s+([,.;:!?])/g, "$1")       
            .replace(/\n{3,}/g, "\n\n")            
            .trim();
        showAutosaveIndicator("Böşliqlar tozalandi ✓");
        
    } else if (actionType === "smart_typography") {
        // === УМНЫЙ ТИПОГРАФ (AQLLI TIPOGRAFIKA) ===
        
        // 1. Убираем лишние пробелы (базовая гигиена)
        text = text.replace(/[ \t]+/g, " ");
        
        // 2. Двойные дефисы (--) и дефисы, окруженные пробелами ( - ), превращаем в длинное тире (—)
        text = text.replace(/\s+-\s+/g, " — ").replace(/--+/g, "—");
        
        // 3. Привязываем короткие слова и союзы к следующему слову неразрывным пробелом (\u00A0)
        // Это предотвратит висячие предлоги в конце строк (va, u, bu, shu, o'z + 1-2 буквенные слова)
        text = text.replace(/(^|\s+)([A-Za-zÇŞĞÖçşğöА-Яа-яЁёЎўҚқҒғҲҳ]{1,2}|va|ham|shu|bu|u)\s+/gi, "$1$2\u00A0");
        
        // 4. Приклеиваем знаки препинания к словам и добавляем пробел ПОСЛЕ них (если его нет)
        text = text.replace(/\s+([,.;:!?])/g, "$1");
        text = text.replace(/([,;:!?])([^\s"»\)])/g, "$1 $2");
        
        // 5. Убираем пробелы внутри скобок: ( matn ) -> (matn)
        text = text.replace(/\(\s+/g, "(").replace(/\s+\)/g, ")");
        
        // 6. Умная замена обычных кавычек ("") на французские «ёлочки» («»)
        let quoteOpen = true;
        text = text.replace(/"/g, function() {
            let repl = quoteOpen ? "«" : "»";
            quoteOpen = !quoteOpen;
            return repl;
        });

        showAutosaveIndicator("Matn tipografiyasi sozlandi ✓");
        
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

    editor.value = text.trim();
    
    // Делаем снимок для Машины Времени, чтобы можно было отменить изменения
    if (typeof saveTimeMachineSnapshot === "function") saveTimeMachineSnapshot(true);
    
    saveEditorDraft();
    if (typeof calculateAndRenderTextStats === "function") calculateAndRenderTextStats();
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
let ambientVolume = 0.70; 
let ambientHasStartedOnce = false;

// Таймеры и узлы для разных пресетов
let ambientChordTimer = null;
let ambientMelodyTimer = null;
let rainNoiseNode = null;
let brownNoiseNode = null;
let vinylCracklesTimer = null;

let currentAmbientPreset = 'soft_pad'; // 'soft_pad', 'rain', 'brown_noise', 'vinyl'

// Аккорды и скейлы для soft_pad
const AMBIENT_CHORDS = [
    [174.61, 220.00, 261.63, 329.63, 392.00], 
    [146.83, 220.00, 261.63, 329.63, 349.23], 
    [116.54, 174.61, 220.00, 261.63, 349.23], 
    [130.81, 196.00, 246.94, 293.66, 329.63]  
];
const AMBIENT_SCALE = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 523.25, 587.33, 659.25, 698.46, 783.99, 880.00];
let currentChordIdx = 0;

// Инициализация мастер-шины
function initAmbientAudioEngine() {
    if (ambientAudioCtx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    ambientAudioCtx = new AudioContextClass();
    ambientMasterGain = ambientAudioCtx.createGain();
    ambientMasterGain.gain.value = ambientVolume * 0.45;

    const masterFilter = ambientAudioCtx.createBiquadFilter();
    masterFilter.type = "lowpass";
    masterFilter.frequency.value = 1800;

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

function createAmbientReverb(ctx) {
    const length = ctx.sampleRate * 3.6; 
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
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

// -----------------------------------------------------------------
// ГЕНЕРАТОРЫ ЗВУКА
// -----------------------------------------------------------------

// 1. Soft Pad
function triggerAmbientPadChord() {
    if (!ambientIsPlaying || currentAmbientPreset !== 'soft_pad') return;
    const now = ambientAudioCtx.currentTime;
    const chord = AMBIENT_CHORDS[currentChordIdx % AMBIENT_CHORDS.length];
    currentChordIdx++;

    chord.forEach((freq, idx) => {
        const osc = ambientAudioCtx.createOscillator();
        const noteGain = ambientAudioCtx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);
        
        const attack = 2.6, hold = 3.2, release = 4.2;
        const peakGain = 0.048 / Math.sqrt(chord.length);
        
        noteGain.gain.setValueAtTime(0.0001, now);
        noteGain.gain.linearRampToValueAtTime(peakGain, now + attack);
        noteGain.gain.setValueAtTime(peakGain, now + attack + hold);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, now + attack + hold + release);
        
        osc.connect(noteGain);
        noteGain.connect(ambientAudioCtx._inputBus);
        
        osc.start(now);
        osc.stop(now + attack + hold + release + 0.1);
    });
}

function triggerAmbientMelodyNote() {
    if (!ambientIsPlaying || currentAmbientPreset !== 'soft_pad') return;
    const now = ambientAudioCtx.currentTime;
    const freq = AMBIENT_SCALE[Math.floor(Math.random() * AMBIENT_SCALE.length)];
    const osc = ambientAudioCtx.createOscillator();
    const noteGain = ambientAudioCtx.createGain();
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);
    
    noteGain.gain.setValueAtTime(0.0001, now);
    noteGain.gain.linearRampToValueAtTime(0.042, now + 0.05);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.4);
    
    osc.connect(noteGain);
    noteGain.connect(ambientAudioCtx._inputBus);
    
    osc.start(now);
    osc.stop(now + 3.5);
    
    ambientMelodyTimer = setTimeout(triggerAmbientMelodyNote, 1800 + Math.random() * 2400);
}

// Утилита генерации буфера шума
function createNoiseBuffer(ctx) {
    const bufferSize = ctx.sampleRate * 2; // 2 секунды
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1; // Белый шум
    }
    return buffer;
}

// 2. Rain (Дождь - Pink Noise + LPF)
function startRainNoise() {
    if (!ambientAudioCtx) return;
    const noiseBuffer = createNoiseBuffer(ambientAudioCtx);
    rainNoiseNode = ambientAudioCtx.createBufferSource();
    rainNoiseNode.buffer = noiseBuffer;
    rainNoiseNode.loop = true;
    
    const filter = ambientAudioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600; // Срезаем верха для имитации тяжелого дождя
    
    // Небольшая модуляция (гроза вдалеке)
    const lfo = ambientAudioCtx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.1; 
    const lfoGain = ambientAudioCtx.createGain();
    lfoGain.gain.value = 200;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    rainNoiseNode.connect(filter);
    filter.connect(ambientAudioCtx._inputBus);
    rainNoiseNode.start();
}

// 3. Brown Noise (Гул кофейни/самолета)
function startBrownNoise() {
    if (!ambientAudioCtx) return;
    const noiseBuffer = createNoiseBuffer(ambientAudioCtx);
    brownNoiseNode = ambientAudioCtx.createBufferSource();
    brownNoiseNode.buffer = noiseBuffer;
    brownNoiseNode.loop = true;
    
    const filter = ambientAudioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200; // Очень низкий срез для коричневого шума
    filter.Q.value = 0.5;

    brownNoiseNode.connect(filter);
    filter.connect(ambientAudioCtx._inputBus);
    brownNoiseNode.start();
}

// 4. Vinyl Crackles (Винил - короткие всплески высокочастотного шума)
function triggerVinylCrackle() {
    if (!ambientIsPlaying || currentAmbientPreset !== 'vinyl') return;
    
    const now = ambientAudioCtx.currentTime;
    const osc = ambientAudioCtx.createOscillator();
    const gain = ambientAudioCtx.createGain();
    
    // Резкий щелчок
    osc.type = 'square';
    osc.frequency.setValueAtTime(3000 + Math.random() * 5000, now);
    
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
    
    const filter = ambientAudioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2000;
    
    osc.connect(gain);
    gain.connect(filter);
    filter.connect(ambientAudioCtx._inputBus);
    
    osc.start(now);
    osc.stop(now + 0.05);

    // Добавляем фоновый очень тихий белый шум
    if (!brownNoiseNode) {
        const noiseBuffer = createNoiseBuffer(ambientAudioCtx);
        brownNoiseNode = ambientAudioCtx.createBufferSource();
        brownNoiseNode.buffer = noiseBuffer;
        brownNoiseNode.loop = true;
        const noiseGain = ambientAudioCtx.createGain();
        noiseGain.gain.value = 0.02; // Едва слышно
        brownNoiseNode.connect(noiseGain);
        noiseGain.connect(ambientAudioCtx._inputBus);
        brownNoiseNode.start();
    }
    
    vinylCracklesTimer = setTimeout(triggerVinylCrackle, 50 + Math.random() * 800);
}

// -----------------------------------------------------------------
// УПРАВЛЕНИЕ ВОСПРОИЗВЕДЕНИЕМ
// -----------------------------------------------------------------

function stopAllGenerators() {
    clearInterval(ambientChordTimer);
    clearTimeout(ambientMelodyTimer);
    clearTimeout(vinylCracklesTimer);
    
    if (rainNoiseNode) { rainNoiseNode.stop(); rainNoiseNode.disconnect(); rainNoiseNode = null; }
    if (brownNoiseNode) { brownNoiseNode.stop(); brownNoiseNode.disconnect(); brownNoiseNode = null; }
}

function startAmbientMusic() {
    initAmbientAudioEngine();
    if (!ambientAudioCtx) return;
    if (ambientAudioCtx.state === "suspended") ambientAudioCtx.resume();
    
    ambientIsPlaying = true;
    ambientHasStartedOnce = true;
    updateMusicPlayerUI();
    stopAllGenerators();

    switch (currentAmbientPreset) {
        case 'soft_pad':
            triggerAmbientPadChord();
            ambientChordTimer = setInterval(triggerAmbientPadChord, 7200);
            ambientMelodyTimer = setTimeout(triggerAmbientMelodyNote, 1100);
            break;
        case 'rain':
            startRainNoise();
            break;
        case 'brown_noise':
            startBrownNoise();
            break;
        case 'vinyl':
            triggerVinylCrackle();
            break;
    }
}

function pauseAmbientMusic() {
    ambientIsPlaying = false;
    stopAllGenerators();
    updateMusicPlayerUI();
}

window.setAmbientPreset = function(preset) {
    currentAmbientPreset = preset;
    
    // Обновляем UI кнопок
    document.querySelectorAll('.ambient-preset-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Находим нажатую кнопку по onclick атрибуту
    const clickedBtn = document.querySelector(`.ambient-preset-btn[onclick="setAmbientPreset('${preset}')"]`);
    if (clickedBtn) clickedBtn.classList.add('active');

    // Если музыка уже играет, перезапускаем с новым пресетом
    if (ambientIsPlaying) {
        stopAllGenerators();
        startAmbientMusic();
    }
};

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

    // ИСПРАВЛЕНИЕ: Запускаем эмбиент только если НЕ включен режим YouTube-плеера!
    if (percent > 0 && !ambientIsPlaying && ambientHasStartedOnce && !isCustomMusicMode) {
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

function updateMusicPlayerUI() {
    const navBtn = document.getElementById("musicToggleBtn");
    const coverBtn = document.getElementById("musicPlayPauseBtn");
    const dockBtn = document.getElementById("dockMainBtn");
    const titleEl = document.getElementById("musicTitleText");
    const subtitleEl = document.getElementById("musicSubtitleText");

    if (navBtn) {
        navBtn.classList.toggle("is-playing", ambientIsPlaying);
    }
    if (coverBtn) {
        coverBtn.classList.toggle("playing", ambientIsPlaying);
    }
    
    // Обновляем текст в зависимости от выбранного пресета, если мы в AI-режиме
    if (!isCustomMusicMode) {
        if (titleEl) {
            if (currentAmbientPreset === 'soft_pad') titleEl.textContent = "Konsentratsiya musiqasi";
            else if (currentAmbientPreset === 'rain') titleEl.textContent = "Yomg'ir ovozi";
            else if (currentAmbientPreset === 'brown_noise') titleEl.textContent = "Kofe xona shovqini";
            else if (currentAmbientPreset === 'vinyl') titleEl.textContent = "Vinil shiqirlashi";
        }
        if (subtitleEl) subtitleEl.textContent = "AI Generated Ambient";
    }
    
    // Управление центральной кнопкой (светящаяся "Ö")
    if (dockBtn && !isCustomMusicMode) {
        dockBtn.classList.toggle("music-active", ambientIsPlaying);
        
        if (ambientHasStartedOnce) {
            const titleText = ambientIsPlaying ? "Musiqani töxtatiş" : "Musiqani davom ettiriş";
            dockBtn.title = titleText;
            dockBtn.setAttribute('data-ulh-title', titleText); 
        }
    }
}

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
    
    // ДЕЛАЕМ СНИМОК ДЛЯ МАШИНЫ ВРЕМЕНИ ПЕРЕД РАБОТОЙ ИИ
    if (typeof saveTimeMachineSnapshot === "function") {
        saveTimeMachineSnapshot(true);
    }

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

        // [ВСТАВИТЬ СЮДА]: Уведомление ИИ
        addNotification({
            type: 'ai',
            title: 'AI Yordamchi vazifani bajardi',
            desc: `So'rov: ${mode === 'custom' ? customInstruction.substring(0,40) : mode}...`,
            iconBg: '#EDE9FE', iconColor: '#4F46E5',
            iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z"/></svg>`,
            actions: [{ label: 'Natijani köriş', colorClass: 'n-btn-neutral', onClick: "document.getElementById('aiResultModalBackdrop').classList.add('open')" }]
        });
        
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
        alert("Tahrirlovçida matn yöq!");
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

// === ИНТЕГРАЦИЯ YOUTUBE ПЛЕЕРА И ПЛЕЙЛИСТА (QUEUE + DRAG&DROP) ===

let isCustomMusicMode = false;
let ytPlayer = null;
let isYtPlaying = false;
let ytProgressInterval = null;
const MUSIC_PLAYLIST_KEY = "ulh_music_playlist_v2";
let currentYtTrackUrl = ""; // Отслеживает, какой трек сейчас играет

// Функция переключения показа поля ввода
window.toggleMusicInputRow = function() {
    const inputRow = document.getElementById("musicCustomInputRow");
    const inputField = document.getElementById("customMusicUrl");
    
    if (inputRow.style.display === "none") {
        inputRow.style.display = "flex";
        setTimeout(() => inputField.focus(), 50); // Фокус на поле ввода
    } else {
        inputRow.style.display = "none";
    }
};

// Устанавливаем режим контроллеров (AI = 100% громкость, YT = 70/30 с таймлайном)
function setPlayerUI_Mode(mode) {
    const controlsRow = document.getElementById("musicControlsRow");
    const ytVideoBtn = document.getElementById("openYtVideoBtn");
    const inputRow = document.getElementById("musicCustomInputRow");
    
    if (!controlsRow) return;

    if (mode === 'yt') {
        controlsRow.classList.remove('ai-mode');
        controlsRow.classList.add('yt-mode');
        if (ytVideoBtn) ytVideoBtn.style.display = "inline-flex";
        // При переходе в режим YT прячем поле ввода, пользователь вызовет его кнопкой "+"
        if (inputRow) inputRow.style.display = "none"; 
    } else {
        controlsRow.classList.remove('yt-mode');
        controlsRow.classList.add('ai-mode');
        if (ytVideoBtn) ytVideoBtn.style.display = "none";
        // В AI-режиме поле ввода всегда видно по умолчанию
        if (inputRow) inputRow.style.display = "flex";
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

// Обработчик кнопки Плей/Пауза (и центральной кнопки Ö на ПК)
window.togglePlaybackHandler = function(event) {
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
        if (typeof ambientIsPlaying !== 'undefined') {
            if (ambientIsPlaying) pauseAmbientMusic();
            else startAmbientMusic();
        }
    }
};

// --- ЛОГИКА ПЛАВАЮЩЕГО ОКНА ВИДЕО И РЕЖИМА КИНОТЕАТРА ---
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

window.closeYtVideoModal = function() {
    const modal = document.getElementById("ytFloatingModal");
    if (modal) {
        modal.classList.add("hidden-player");
    }
    
    const overlay = document.getElementById("cinemaOverlay");
    const btn = document.getElementById("cinemaToggleBtn");
    if (overlay && overlay.classList.contains("active")) {
        overlay.classList.remove("active");
    }
    if (btn && btn.classList.contains("active")) {
        btn.classList.remove("active");
    }
};

(function initDraggableModal() {
    const modal = document.getElementById("ytFloatingModal");
    const header = document.getElementById("ytModalHeader");
    if (!modal || !header) return;

    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    header.addEventListener("mousedown", (e) => {
        isDragging = true;
        const rect = modal.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        modal.style.right = "auto"; 
    });

    document.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        modal.style.left = (e.clientX - offsetX) + "px";
        modal.style.top = (e.clientY - offsetY) + "px";
    });

    document.addEventListener("mouseup", () => {
        isDragging = false;
    });
})();

// --- ОСНОВНАЯ ЛОГИКА ДОБАВЛЕНИЯ И ЗАПУСКА ТРЕКОВ ---
window.loadCustomYoutube = async function(urlFromList = null) {
    const inputEl = document.getElementById("customMusicUrl");
    let rawUrl = urlFromList || (inputEl ? inputEl.value.trim() : "");
    if (!rawUrl) return;

    const videoId = getYoutubeId(rawUrl);
    if (!videoId) {
        alert("Notöğri YouTube havolasi! Iltimos, tekşirib qaytadan kiriting.");
        return;
    }

    if (inputEl && !urlFromList) {
        inputEl.value = "Qidirilmoqda...";
        inputEl.disabled = true;
    }

    // 1. Если трек добавляется ВРУЧНУЮ через форму
    if (!urlFromList) {
        try {
            const res = await fetch(`https://noembed.com/embed?dataType=json&url=https://www.youtube.com/watch?v=${videoId}`);
            const data = await res.json();
            let title = data.title || "Noma'lum trek";
            let author = data.author_name || "YouTube";
            
            addTrackToPlaylist(rawUrl, title, author); 
            
            if (inputEl) { 
                inputEl.value = ""; 
                inputEl.disabled = false; 
                // Если сейчас играет музыка, прячем поле после добавления трека
                if (isCustomMusicMode) document.getElementById("musicCustomInputRow").style.display = "none";
            }
            if (!isCustomMusicMode) playPlaylistItem(rawUrl, title, author);
        } catch(e) {
            addTrackToPlaylist(rawUrl, "Yangi trek", "YouTube");
            if (inputEl) { 
                inputEl.value = ""; 
                inputEl.disabled = false; 
                if (isCustomMusicMode) document.getElementById("musicCustomInputRow").style.display = "none";
            }
            if (!isCustomMusicMode) playPlaylistItem(rawUrl, "Yangi trek", "YouTube");
        }
    } 
    // 2. Если кликнули по треку из плейлиста
    else {
        playPlaylistItem(rawUrl);
    }
};

function playPlaylistItem(url, title = "Yuklanmoqda...", author = "YouTube") {
    const videoId = getYoutubeId(url);
    if (!videoId) return;

    currentYtTrackUrl = url;
    if (typeof ambientIsPlaying !== 'undefined' && ambientIsPlaying) {
        pauseAmbientMusic();
    }

    isCustomMusicMode = true;
    
    // Прячем старую форму ввода (если она была открыта кнопкой +)
    document.getElementById("musicCustomInputRow").style.display = "none";
    document.getElementById("musicProgressRow").style.display = "flex"; 
    document.getElementById("backToAiMusicBtn").style.display = "inline-flex";
    
    setPlayerUI_Mode('yt');
    
    const pl = JSON.parse(localStorage.getItem(MUSIC_PLAYLIST_KEY)) || [];
    const existing = pl.find(t => getYoutubeId(t.url) === videoId);
    if (existing) { title = existing.title; author = existing.author; }

    document.getElementById("musicTitleText").textContent = truncateText(title, 40);
    document.getElementById("musicSubtitleText").textContent = truncateText(author, 40);
    const floatTitle = document.getElementById("ytModalFloatTitle");
    if(floatTitle) floatTitle.textContent = truncateText(title, 40);

    if (ytPlayer && typeof ytPlayer.loadVideoById === "function") {
        ytPlayer.loadVideoById(videoId);
    } else {
        ytPlayer = new YT.Player('yt-player-container', {
            height: '100%',
            width: '100%',
            videoId: videoId,
            playerVars: { 'autoplay': 1, 'controls': 1 },
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange
            }
        });
    }
    renderMusicHistory(); 
}

function onPlayerReady(event) {
    if (typeof ambientVolume !== 'undefined') {
        event.target.setVolume(Math.round(ambientVolume * 100));
    }
    event.target.playVideo();
}

function onPlayerStateChange(event) {
    const coverBtn = document.getElementById("musicPlayPauseBtn");
    const navBtn = document.getElementById("musicToggleBtn");
    const dockBtn = document.getElementById("dockMainBtn");
    
    if (event.data == YT.PlayerState.PLAYING) {
        isYtPlaying = true;
        if(coverBtn) coverBtn.classList.add("playing");
        if(navBtn) navBtn.classList.add("is-playing");
        if (dockBtn) {
            dockBtn.classList.add("music-active");
            dockBtn.title = "Musiqani töxtatiş";
            dockBtn.setAttribute('data-ulh-title', "Musiqani töxtatiş");
        }
        startProgressInterval();
        
        if (document.getElementById("musicTitleText").textContent === "Yangi trek") {
            fetchYtMetadataAndUpdate();
        }

    } else if (event.data == YT.PlayerState.ENDED) {
        playNextTrack();
    } else {
        isYtPlaying = false;
        if(coverBtn) coverBtn.classList.remove("playing");
        if(navBtn) navBtn.classList.remove("is-playing");
        if (dockBtn) {
            dockBtn.classList.remove("music-active");
            dockBtn.title = "Musiqani davom ettiriş";
            dockBtn.setAttribute('data-ulh-title', "Musiqani davom ettiriş");
        }
        clearInterval(ytProgressInterval);
    }
}

function playNextTrack() {
    let playlist = JSON.parse(localStorage.getItem(MUSIC_PLAYLIST_KEY)) || [];
    if (playlist.length === 0) return;
    
    let currentIndex = playlist.findIndex(item => getYoutubeId(item.url) === getYoutubeId(currentYtTrackUrl));
    if (currentIndex !== -1 && currentIndex < playlist.length - 1) {
        let nextTrack = playlist[currentIndex + 1];
        playPlaylistItem(nextTrack.url, nextTrack.title, nextTrack.author);
    } else {
        switchToAiMusic();
    }
}

function fetchYtMetadataAndUpdate() {
    if (!ytPlayer || typeof ytPlayer.getVideoData !== 'function') return;
    const data = ytPlayer.getVideoData();
    if (data && data.title) {
        const title = truncateText(data.title, 40);
        const author = truncateText(data.author || "YouTube", 40);
        
        document.getElementById("musicTitleText").textContent = title;
        document.getElementById("musicSubtitleText").textContent = author;
        
        let playlist = JSON.parse(localStorage.getItem(MUSIC_PLAYLIST_KEY)) || [];
        let trackIndex = playlist.findIndex(item => getYoutubeId(item.url) === getYoutubeId(currentYtTrackUrl));
        if (trackIndex !== -1) {
            playlist[trackIndex].title = title;
            playlist[trackIndex].author = author;
            localStorage.setItem(MUSIC_PLAYLIST_KEY, JSON.stringify(playlist));
            renderMusicHistory();
        }
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

const sb = document.getElementById("musicSeekbar");
if(sb) {
    sb.addEventListener("input", function(e) {
        if (isCustomMusicMode && ytPlayer && typeof ytPlayer.getDuration === 'function') {
            const duration = ytPlayer.getDuration();
            const seekToTime = (e.target.value / 100) * duration;
            ytPlayer.seekTo(seekToTime, true);
            document.getElementById("musicTimeDisplay").textContent = `${formatTime(seekToTime)} / ${formatTime(duration)}`;
        }
    });
}

// Возврат к оригинальной музыке концентрации
window.switchToAiMusic = function() {
    if (ytPlayer && typeof ytPlayer.pauseVideo === 'function') ytPlayer.pauseVideo();
    isCustomMusicMode = false;
    isYtPlaying = false;
    currentYtTrackUrl = "";
    clearInterval(ytProgressInterval);

    if (typeof closeYtVideoModal === "function") closeYtVideoModal();

    document.getElementById("musicCustomInputRow").style.display = "flex";
    document.getElementById("musicProgressRow").style.display = "none";
    document.getElementById("backToAiMusicBtn").style.display = "none";
    setPlayerUI_Mode('ai'); 
    
    document.getElementById("musicTitleText").textContent = "Konsentratsiya uçun musiqa";
    document.getElementById("musicSubtitleText").textContent = "AI Generated Music by LANIGIRO";
    
    renderMusicHistory(); 
    if (typeof startAmbientMusic === "function") startAmbientMusic();
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

// --- УПРАВЛЕНИЕ ПЛЕЙЛИСТОМ (ДОБАВЛЕНИЕ, УДАЛЕНИЕ, DRAG & DROP) ---
function addTrackToPlaylist(url, title, author) {
    const cleanUrl = url.split('&')[0]; 
    let playlist = JSON.parse(localStorage.getItem(MUSIC_PLAYLIST_KEY)) || [];
    
    if (!playlist.find(item => getYoutubeId(item.url) === getYoutubeId(cleanUrl))) {
        playlist.push({ url: cleanUrl, title, author }); 
        localStorage.setItem(MUSIC_PLAYLIST_KEY, JSON.stringify(playlist));
        renderMusicHistory();

        if (typeof addNotification === "function") {
            addNotification({
                type: 'yt', title: 'Pleylistga qöşildi', desc: title,
                iconBg: '#FEE2E2', iconColor: '#EF4444',
                iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>`,
                actions: [{ label: 'Tinglaş', colorClass: 'n-btn-play', onClick: `loadCustomYoutube('${cleanUrl}')` }]
            });
        }
    }
}

window.removePlaylistTrack = function(event, index) {
    event.preventDefault(); event.stopPropagation();
    let playlist = JSON.parse(localStorage.getItem(MUSIC_PLAYLIST_KEY)) || [];
    
    // Если удаляем трек, который сейчас играет
    if (isCustomMusicMode && getYoutubeId(playlist[index].url) === getYoutubeId(currentYtTrackUrl)) {
        if (playlist.length > 1) {
            playNextTrack(); // Переключаем на следующий
        } else {
            switchToAiMusic(); // Или возвращаемся к AI, если он был последним
        }
    }

    playlist.splice(index, 1); 
    localStorage.setItem(MUSIC_PLAYLIST_KEY, JSON.stringify(playlist));
    renderMusicHistory();
};

let draggedPlaylistIndex = null;

function renderMusicHistory() {
    const list = document.getElementById("musicHistoryList");
    if (!list) return;

    let playlist = JSON.parse(localStorage.getItem(MUSIC_PLAYLIST_KEY)) || [];
    list.innerHTML = "";
    
    if (playlist.length === 0) {
        list.innerHTML = `<div style="text-align: center; color: #94A3B8; font-size: 11.5px; padding: 10px 0;">Pleylist böş</div>`;
        return;
    }
    
    playlist.forEach((item, index) => {
        const isPlaying = isCustomMusicMode && (getYoutubeId(currentYtTrackUrl) === getYoutubeId(item.url));
        
        const itemEl = document.createElement("div");
        itemEl.className = `music-history-item ${isPlaying ? 'active-track' : ''}`;
        itemEl.draggable = true; 
        itemEl.dataset.index = index;

        itemEl.innerHTML = `
            <div class="music-drag-handle" title="Tepaga/pastga suriş">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
            </div>
            <div class="music-history-item-icon" style="cursor: pointer;" onclick="loadCustomYoutube('${item.url}')">
                ${isPlaying && isYtPlaying ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"></rect><rect x="14" y="4" width="4" height="16" rx="1"></rect></svg>` : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`}
            </div>
            <div class="music-history-item-text" style="cursor: pointer;" onclick="loadCustomYoutube('${item.url}')">
                <div class="music-history-item-title">${item.title}</div>
                <div class="music-history-item-sub">${item.author}</div>
            </div>
            <div class="music-del-btn" onclick="removePlaylistTrack(event, ${index})" title="Öçiriş">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </div>
        `;
        
        itemEl.addEventListener('dragstart', function(e) {
            draggedPlaylistIndex = index;
            e.dataTransfer.effectAllowed = "move";
            setTimeout(() => this.classList.add('dragging'), 0);
        });
        itemEl.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('drag-over');
        });
        itemEl.addEventListener('dragleave', function(e) {
            this.classList.remove('drag-over');
        });
        itemEl.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('drag-over');
            const targetIndex = index;
            if (draggedPlaylistIndex === null || draggedPlaylistIndex === targetIndex) return;

            let hist = JSON.parse(localStorage.getItem(MUSIC_PLAYLIST_KEY)) || [];
            const draggedItem = hist.splice(draggedPlaylistIndex, 1)[0];
            hist.splice(targetIndex, 0, draggedItem);
            localStorage.setItem(MUSIC_PLAYLIST_KEY, JSON.stringify(hist));
            
            renderMusicHistory();
        });
        itemEl.addEventListener('dragend', function() {
            this.classList.remove('dragging');
            draggedPlaylistIndex = null;
        });

        list.appendChild(itemEl);
    });
}

window.toggleMusicHistoryConfirm = function(event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    const confirmBox = document.getElementById("musicHistoryConfirm");
    if (confirmBox) {
        confirmBox.classList.toggle("show");
    }
};

window.clearMusicHistory = function(event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    localStorage.removeItem(MUSIC_PLAYLIST_KEY);
    switchToAiMusic(); // Выключаем музыку при очистке плейлиста
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
        
        // === VAQT MASHINASI UCHUN MATNNI SAQLASH ===
        if (typeof saveTimeMachineSnapshot === "function") {
            saveTimeMachineSnapshot(true);
        }
        // ============================================

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

    // === VAQT MASHINASI UCHUN MATNNI SAQLASH ===
    if (typeof saveTimeMachineSnapshot === "function") {
        saveTimeMachineSnapshot(true);
    }
    // ============================================

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
    // ИСПРАВЛЕНИЕ: Вернули оптимальный лимит 4500. 10000 символов "вешали" сервер по таймауту
    const text = (window.extractedFileText || "").substring(0, 4500).trim(); 
    if (!text) {
        alert("Fayl içidan matn topilmadi!");
        return;
    }

    if (typeof setAiLoadingState === "function") setAiLoadingState(true);
    if (typeof showAutosaveIndicator === "function") showAutosaveIndicator("Fayl o'qilmoqda...");

    const promptText = `Sen professional tahlilchisan. Har xil tillarni 100 foiz mukammal va erkin bilasan. Quyidagi matnni diqqat bilan o'qib chiqib, uning qisqacha mazmunini (konspekt) 5-7 ta eng muhim tezislar ko'rinishida yozib ber. 
Javobingni qulay va chiroyli formatda, sarlavha va ro'yxat (bullet points) shaklida taqdim et. Sening javobing berilgan asl matn tilida bo'lishi shart.
Matn: "${text}"`;

    try {
        const response = await fetch(AI_PROXY_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "custom", text: text, customPrompt: promptText })
        });

        // Улучшенный перехват ошибок
        if (!response.ok) {
            const errInfo = await response.text();
            throw new Error(`${response.status} - ${errInfo}`);
        }
        
        const data = await response.json();
        
        let rawResult = "";
        if (typeof data === "string") rawResult = data;
        else if (data && data.result) rawResult = data.result;
        else if (data && data.response) rawResult = data.response;
        else rawResult = JSON.stringify(data);

        let cleanResult = typeof enforceNewUzbekAlphabet === "function" ? enforceNewUzbekAlphabet(rawResult) : rawResult;

        if (typeof openAiResultModal === "function") {
            openAiResultModal(cleanResult);
        }

        if (typeof showAutosaveIndicator === "function") showAutosaveIndicator("Xulosa tayyor ✓");
    } catch (err) {
        console.error("Summary Error:", err);
        alert(`Tahlil qilişda xatolik yuz berdi.\nSabab: ${err.message}\nInternetni tekşiring yoki server band bölişi mumkin.`);
    } finally {
        if (typeof setAiLoadingState === "function") setAiLoadingState(false);
    }
};

// Функция: AI-Оппонент (Тренажер защиты статьи)
window.runAiOpponent = async function() {
    // ИСПРАВЛЕНИЕ: Снизили лимит до 4500 символов
    const text = (window.extractedFileText || "").substring(0, 4500).trim(); 
    if (!text) {
        alert("Fayl ichidan matn topilmadi!");
        return;
    }

    if (typeof setAiLoadingState === "function") setAiLoadingState(true);
    if (typeof showAutosaveIndicator === "function") showAutosaveIndicator("Opponent matnni o'rganmoqda...");

    const promptText = `Sen Oliy Attestatsiya Komissiyasining (VAK) juda qattiqqo'l, talabchan va tanqidiy fikrlaydigan a'zosisan (opponent). Quyidagi ilmiy matnni diqqat bilan o'qib chiq. 
Sening vazifang — muallifni ilmiy himoyaga tayyorlash uchun matndagi metodologiya, xulosalar, dalillar yoki mantiqiy zaif tomonlarini topish.
Shu matn asosida muallifga 3 ta eng qiyin, noqulay va bahsli savol ber.
Javobingni sarlavha va ro'yxat shaklida, fayldagi matnning tilida taqdim et. Har bir savoldan so'ng qisqacha "Nima uchun bu savol berildi? (Zaif nuqta)" degan izoh qo'sh. Ushbu izoh ham fayldagi matnning tiliga asosan berilishi lozim!
Matn: "${text}"`;

    try {
        const response = await fetch(AI_PROXY_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "custom", text: text, customPrompt: promptText })
        });

        if (!response.ok) {
            const errInfo = await response.text();
            throw new Error(`${response.status} - ${errInfo}`);
        }
        
        const data = await response.json();
        
        let rawResult = "";
        if (typeof data === "string") rawResult = data;
        else if (data && data.result) rawResult = data.result;
        else if (data && data.response) rawResult = data.response;
        else rawResult = JSON.stringify(data);

        let cleanResult = typeof enforceNewUzbekAlphabet === "function" ? enforceNewUzbekAlphabet(rawResult) : rawResult;

        if (typeof openAiResultModal === "function") {
            openAiResultModal(cleanResult);
        }

        if (typeof showAutosaveIndicator === "function") showAutosaveIndicator("Savollar tayyor ✓");
    } catch (err) {
        console.error("Opponent Error:", err);
        alert(`Tahlil qilişda xatolik yuz berdi.\nSabab: ${err.message}\nInternetni tekşiring yoki server band bölişi mumkin.`);
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

    const promptText = `Sen tajribali o'qituvchi va repetitorsan. Berilgan matn (xohlagan tilda bo'lishi mumkin) asosida bilimni tekshirish uchun quyidagilarni tuzib ber:
1. 5 ta yopiq test savoli (A, B, C, D variantlari bilan). To'g'ri javoblarni **qalin (bold)** qilib belgilab ko'rsat.
2. 5 ta qisqa "Savol - Javob" (flesh-kartochkalar uchun).
Javobing aniq, tushunarli va Markdown formatida bo'lsin.
Matn: "${text.substring(0, 4500)}"`;

    try {
        const response = await fetch(AI_PROXY_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "custom", text: text, customPrompt: promptText })
        });

        if (!response.ok) {
            const errInfo = await response.text();
            throw new Error(`${response.status} - ${errInfo}`);
        }
        
        const data = await response.json();
        
        let rawResult = "";
        if (typeof data === "string") rawResult = data;
        else if (data && data.result) rawResult = data.result;
        else if (data && data.response) rawResult = data.response;
        else rawResult = JSON.stringify(data);

        let cleanResult = typeof enforceNewUzbekAlphabet === "function" ? enforceNewUzbekAlphabet(rawResult) : rawResult;

        if (typeof openAiResultModal === "function") {
            openAiResultModal(cleanResult);
        }

        if (typeof showAutosaveIndicator === "function") showAutosaveIndicator("Testlar tayyor ✓");
    } catch (err) {
        console.error("Test Gen Error:", err);
        alert(`Test tuzishda xatolik yuz berdi.\nSabab: ${err.message}`);
    } finally {
        if (typeof setAiLoadingState === "function") setAiLoadingState(false);
    }
};

// Функция 3: Авто-Глоссарий (Словарь терминов)
window.generateGlossary = async function() {
    if (typeof closeAiMenu === "function") closeAiMenu();

    if (!editor || !editor.value.trim()) {
        if (typeof showAutosaveIndicator === "function") showAutosaveIndicator("Avval matn kiriting!");
        if (editor) editor.focus();
        return;
    }

    const text = editor.value.trim();
    if (typeof setAiLoadingState === "function") setAiLoadingState(true);
    if (typeof showAutosaveIndicator === "function") showAutosaveIndicator("Luğat tuzilmoqda...");

    const promptText = `Sen ilmiy va akademik muharrirsan. Berilgan matnni o'qib chiqib (xohlagan tilda bo'lishi mumkin), ichidan 10-15 ta eng murakkab, ilmiy yoki tor doiradagi (termin) so'zlarni ajratib ol va ularning qisqacha, tushunarli ilmiy izohini (glossariy) yozib ber. 
Javobing qulay Markdown formatida (sarlavha va ro'yxat) bo'lsin. Matn tili qanday bo'lsa, izohlar ham shu tilda bo'lsin (agar matn rus tilida bo'lsa, rus tilida javob ber).
Matn: "${text.substring(0, 4500)}"`;

    try {
        const response = await fetch(AI_PROXY_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "custom", text: text, customPrompt: promptText })
        });

        if (!response.ok) throw new Error("Server xatosi");
        
        const data = await response.json();
        let rawResult = data.result || data.response || (typeof data === "string" ? data : JSON.stringify(data));
        let cleanResult = typeof enforceNewUzbekAlphabet === "function" ? enforceNewUzbekAlphabet(rawResult) : rawResult;

        if (typeof openAiResultModal === "function") openAiResultModal(cleanResult);
        if (typeof showAutosaveIndicator === "function") showAutosaveIndicator("Luğat tayyor ✓");
    } catch (err) {
        console.error("Glossary Error:", err);
        alert(`Lug'at tuzishda xatolik yuz berdi.\nSabab: ${err.message}`);
    } finally {
        if (typeof setAiLoadingState === "function") setAiLoadingState(false);
    }
};

// ==========================================
// === 18. УМНАЯ БЕГУЩАЯ СТРОКА НОВОСТЕЙ (DUAL-ENGINE + DRAG SCROLL) ===
// ==========================================

const RSS_STORAGE_KEY = "ulh_news_sources_v1";
const DEFAULT_RSS_SOURCES = [
    { url: "https://kun.uz/news/rss?lang=uz", name: "Kun.uz" },
    { url: "https://podrobno.uz/rss/", name: "Podrobno.uz" },
    { url: "https://www.gazeta.uz/oz/feeds/", name: "Gazeta.uz" },
    { url: "https://batafsil.uz/rss/", name: "Batafsil.uz" },
    { url: "https://darakchi.uz/uz/yandex-rss", name: "Darakchi.uz" }
];

// Глобальные переменные для управления скроллом ленты
let tickerReqId;
let isTickerHovered = false;
let isTickerDragging = false;
let tickerStartX;
let tickerScrollLeft;

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
        if (isNaN(d.getTime())) return dateStr;
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
    return "./news.png"; 
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
    const primaryApi = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`;
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(primaryApi, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (res.ok) {
            const data = await res.json();
            if (data.status === "ok" && data.items) {
                return { type: "json", items: data.items };
            }
        }
    } catch (e) {
        console.warn(`RSS2JSON xatosi (${url}), AllOrigins'ga o'tilmoqda...`);
    }

    const fallbackApi = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(fallbackApi, { signal: controller.signal, cache: "no-store" });
        clearTimeout(timeoutId);

        if (res.ok) {
            const data = await res.json();
            if (data.contents && (data.contents.includes('<rss') || data.contents.includes('<feed'))) {
                return { type: "xml", content: data.contents };
            }
        }
    } catch (e) {
        console.warn(`AllOrigins xatosi (${url})`);
    }

    throw new Error("Manbadan ma'lumot olib bölmadi");
}

// === РЕНДЕР И ФИЗИКА ДВИЖЕНИЯ ===
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
    
    trackEl.innerHTML = htmlContent + htmlContent;
    initDragAndScrollTicker();
}

function initDragAndScrollTicker() {
    const area = document.querySelector('.news-ticker-scroll-area');
    const track = document.getElementById('newsTickerTrack');
    if (!area || !track) return;

    if (tickerReqId) cancelAnimationFrame(tickerReqId);
    area.scrollLeft = 0;
    
    // Секретное оружие против бага с дробными пикселями:
    let exactScroll = 0; 
    
    isTickerHovered = false;
    isTickerDragging = false;

    // Логика захвата мышью
    area.onmousedown = (e) => {
        isTickerDragging = true;
        isTickerHovered = true; 
        tickerStartX = e.pageX - area.offsetLeft;
        tickerScrollLeft = area.scrollLeft;
        exactScroll = area.scrollLeft;
        area.style.cursor = 'grabbing';
    };
    
    area.onmouseleave = () => {
        isTickerDragging = false;
        isTickerHovered = false;
        area.style.cursor = 'grab';
    };
    
    area.onmouseup = () => {
        isTickerDragging = false;
        isTickerHovered = false;
        area.style.cursor = 'grab';
    };
    
    area.onmousemove = (e) => {
        if (!isTickerDragging) return;
        e.preventDefault(); 
        
        const x = e.pageX - area.offsetLeft;
        const walk = (tickerStartX - x) * 1.2; // Чувствительность перетаскивания
        exactScroll = tickerScrollLeft + walk;
        
        const halfWidth = track.scrollWidth / 2;
        if (exactScroll >= halfWidth) {
            exactScroll -= halfWidth;
            tickerStartX = e.pageX - area.offsetLeft;
            tickerScrollLeft = exactScroll;
        } else if (exactScroll <= 0) {
            exactScroll += halfWidth;
            tickerStartX = e.pageX - area.offsetLeft;
            tickerScrollLeft = exactScroll;
        }
        area.scrollLeft = exactScroll;
    };

    area.onmouseenter = () => {
        if (!isTickerDragging) isTickerHovered = true;
    };

    // Движок плавного автоскролла (теперь работает с любыми дробями!)
    function scrollStep() {
        if (!isTickerHovered && !isTickerDragging) {
            
            exactScroll += 0.5; // ВАША СКОРОСТЬ ЗДЕСЬ (меняйте как угодно: 0.3, 0.5, 1.2)
            
            if (exactScroll >= track.scrollWidth / 2) {
                exactScroll = 0;
            }
            area.scrollLeft = exactScroll; 
        } else {
            // Если мы остановили ленту, синхронизируем значения
            exactScroll = area.scrollLeft;
        }
        tickerReqId = requestAnimationFrame(scrollStep);
    }
    scrollStep(); 
}

// === УПРАВЛЕНИЕ ПОПАПАМИ ===
window.showGlobalNewsPopup = function(el, e) {
    if (isTickerDragging) return;

    let popup = document.getElementById("globalNewsPopup");
    
    if (!popup) {
        popup = document.createElement("div");
        popup.id = "globalNewsPopup";
        popup.className = "news-popup-global";
        document.body.appendChild(popup);

        popup.onmouseenter = () => {
            popup.style.opacity = "1";
            popup.style.visibility = "visible";
            isTickerHovered = true; 
        };
        popup.onmouseleave = () => {
            window.hideGlobalNewsPopup();
        };
    }

    isTickerHovered = true; 

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
    isTickerHovered = false;
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
        if (now - parseInt(cacheTime) < 10 * 60 * 1000) { 
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
                for (let i = 0; i < Math.min(result.items.length, 5); i++) {
                    const item = result.items[i];
                    let snippet = (item.description || "").replace(/<[^>]*>?/gm, '').trim();
                    let image = item.thumbnail || (item.enclosure && item.enclosure.link) || "./news.png";
                    
                    if (image === "./news.png" && item.description && item.description.includes("<img")) {
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



// ==========================================
// === IMMERSIVE FOCUS ROOM (ZEN MODE 2.0) ===
// ==========================================

let isZenMode = false;
let wasYtPlayingBeforeZen = false; // Запоминаем, играла ли музыка из плеера

window.toggleZenMode = function() {
    isZenMode = !isZenMode;
    const body = document.body;
    
    if (isZenMode) {
        body.classList.add('zen-mode-active');
        document.getElementById('zenIconExpand').style.display = 'none';
        document.getElementById('zenIconCollapse').style.display = 'inline-block';
        document.getElementById('zenTooltip').textContent = "Fokus-xonadan çiqiş";
        
        // --- УМНАЯ МУЗЫКА: Пауза плеера при входе ---
        if (typeof ytPlayer !== 'undefined' && ytPlayer && isYtPlaying) {
            wasYtPlayingBeforeZen = true;
            ytPlayer.pauseVideo();
        } else {
            wasYtPlayingBeforeZen = false;
        }

        // --- АВТОЗАПУСК ФОНА ---
        // Надежная проверка: смотрим, есть ли в src слово "youtube"
        const videoEl = document.getElementById('zenBgVideo');
        const bgContainer = document.getElementById('zenBackground');
        const currentSrc = videoEl.src || "";
        
        if (!currentSrc.includes('youtube') && !bgContainer.style.backgroundImage.includes('url')) {
            const firstBtn = document.querySelector('.zen-bg-btn');
            setZenBackground('lofi', firstBtn);
        }
        
        if (typeof addNotification === "function") {
            addNotification({
                type: 'system', title: 'Fokus-Xona faollaşdi', 
                desc: 'Diqqatni jamlang. Orqa fonni ekrandagi tugmalar orqali özgartirişingiz mumkin.',
                iconBg: '#EDE9FE', iconColor: '#7C3AED',
                iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5v14M7 5v14M22 8v8M2 8v8"/></svg>`
            });
        }
    } else {
        body.classList.remove('zen-mode-active');
        document.getElementById('zenIconExpand').style.display = 'inline-block';
        document.getElementById('zenIconCollapse').style.display = 'none';
        document.getElementById('zenTooltip').textContent = "Zen rejimi (Fokus)";
        
        // Очищаем видеофон при выходе
        document.getElementById('zenBgVideo').src = "";
        document.querySelectorAll('.zen-bg-btn').forEach(b => b.classList.remove('active'));

        // --- УМНАЯ МУЗЫКА: Возобновление плеера при выходе ---
        if (wasYtPlayingBeforeZen && typeof ytPlayer !== 'undefined' && ytPlayer) {
            ytPlayer.playVideo();
            wasYtPlayingBeforeZen = false; // Сбрасываем флаг
        }
    }
};

window.setZenBackground = function(type, btnElement) {
    const bgContainer = document.getElementById('zenBackground');
    const videoEl = document.getElementById('zenBgVideo');
    
    document.querySelectorAll('.zen-bg-btn').forEach(btn => btn.classList.remove('active'));
    if(btnElement) btnElement.classList.add('active');

    // Настройки: автоплей, зациклено, без контроллеров.
    // УБРАН mute=1, чтобы звук играл. Мы задаем громкость через JS API, если нужно, но проще оставить звук в самом видео.
    // Параметр volume не работает напрямую в URL iframe, поэтому звук будет по умолчанию (зависит от видео).
    // Чтобы гарантированно было тихо, добавим параметры YouTube.
    const ytParams = "?autoplay=1&controls=0&showinfo=0&autohide=1&loop=1&playsinline=1&modestbranding=1&playlist=";

    if (type === 'lofi') {
        videoEl.src = "https://www.youtube.com/embed/rFZHOHl-L8A" + ytParams + "rFZHOHl-L8A";
        bgContainer.style.backgroundImage = "none";
    } else if (type === 'rain') {
        videoEl.src = "https://www.youtube.com/embed/c0_ejQQcrwI" + ytParams + "c0_ejQQcrwI";
        bgContainer.style.backgroundImage = "none";
    } else if (type === 'hogwarts') {
        videoEl.src = "https://www.youtube.com/embed/R68KY-dBg2M" + ytParams + "R68KY-dBg2M";
        bgContainer.style.backgroundImage = "none";
    } else if (type === 'samarkand') {
        videoEl.src = "https://www.youtube.com/embed/jxeorC_f6qw" + ytParams + "jxeorC_f6qw";
        bgContainer.style.backgroundImage = "none";
    }
};

// ==========================================
// === 20. ИИ-АНАЛИЗ КАЧЕСТВА ТЕКСТА (READABILITY & TONE) ===
// ==========================================

window.runTextQualityAnalysis = async function() {
    const editorEl = document.getElementById("editor");
    const btn = document.getElementById('runAiStatsBtn');
    const resultsBox = document.getElementById('aiStatsResults');
    const adviceBox = document.getElementById('aiStatsAdvice');
    const btnText = btn.querySelector('span');
    const btnIcon = btn.querySelector('svg');
    
    if (!editorEl || !editorEl.value.trim()) {
        alert("Iltimos, tahlil qiliş uçun avval matn kiriting!");
        return;
    }
    
    const text = editorEl.value.trim();

    // 1. Включаем UI загрузки
    btn.style.pointerEvents = "none";
    btnText.textContent = "Tahlil qilinmoqda... Kuting";
    btnIcon.style.animation = "aiSpinPulse 1.1s linear infinite";
    
    // Показываем блок результатов, но сбрасываем ползунки на 0%
    resultsBox.style.display = "flex";
    ['Acad', 'Water', 'Read'].forEach(type => {
        document.getElementById(`bar${type}`).style.width = "0%";
        document.getElementById(`score${type}`).textContent = "0%";
    });
    adviceBox.textContent = "AI matnni öqimoqda va baholamoqda...";

    // 2. Строгий промпт, требующий ТОЛЬКО JSON ответ
    const promptText = `Sen professional ilmiy redaktorsan. Har bir tilda tahlil qilaolasan. Poliglotsan. Quyidagi matnni tahlil qilib, uning 3 ta ko'rsatkichini foizda (0 dan 100 gacha) bahola:
1. "academic" - Matnning ilmiylik, rasmiylik va jiddiylik darajasi.
2. "water" - Matndagi ortiqcha so'zlar, takroriylik va ma'nosiz jumlalar ("suv") darajasi.
3. "readability" - Matnning o'qishga qulayligi va oson tushunilishi.
Shuningdek, matnni yaxshilash uchun 1 ta qisqa gap bilan "advice" (tavsiya) yoz.
Javobni FAQAT toza JSON formatida ber. Hech qanday markdown (\`\`\`json) yoki boshqa so'z ishlatma.
Format: {"academic": 85, "water": 10, "readability": 90, "advice": "Matnni yaxşilaş uçun tavsiya..."}
Matn: "${text.substring(0, 3000)}"`;

    try {
        const response = await fetch(AI_PROXY_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "custom", text: text, customPrompt: promptText })
        });

        if (!response.ok) throw new Error("Server xatosi");

        const data = await response.json();
        let rawResult = data.result || data.response || (typeof data === "string" ? data : JSON.stringify(data));
        
        // 3. Безопасный парсинг JSON из ответа ИИ
        let cleanJson = rawResult.replace(/```json/gi, '').replace(/```/g, '').trim();
        const startIdx = cleanJson.indexOf('{');
        const endIdx = cleanJson.lastIndexOf('}');
        if (startIdx !== -1 && endIdx !== -1) {
            cleanJson = cleanJson.substring(startIdx, endIdx + 1);
        }
        
        const parsed = JSON.parse(cleanJson);
        
        // Переводим совет в новый алфавит, если это узбекский язык
        let finalAdvice = parsed.advice || "Tahlil yakunlandi.";
        if (typeof enforceNewUzbekAlphabet === "function") {
            finalAdvice = enforceNewUzbekAlphabet(finalAdvice);
        }
        
        // 4. Плавно анимируем заполнение ползунков
        setTimeout(() => {
            const acad = parseInt(parsed.academic) || 0;
            const water = parseInt(parsed.water) || 0;
            const read = parseInt(parsed.readability) || 0;

            document.getElementById('barAcad').style.width = `${acad}%`;
            document.getElementById('scoreAcad').textContent = `${acad}%`;
            
            document.getElementById('barWater').style.width = `${water}%`;
            document.getElementById('scoreWater').textContent = `${water}%`;
            
            document.getElementById('barRead').style.width = `${read}%`;
            document.getElementById('scoreRead').textContent = `${read}%`;
            
            adviceBox.textContent = finalAdvice;
        }, 100);

    } catch (err) {
        console.error("Stats AI Error:", err);
        adviceBox.textContent = "Tahlil qilişda xatolik yuz berdi. Internetni tekşiring yoki qayta urinib köring.";
    } finally {
        // 5. Возвращаем кнопку в исходное состояние
        btn.style.pointerEvents = "auto";
        btnText.textContent = "Qayta tahlil qiliş";
        btnIcon.style.animation = "none";
    }
};

// ==========================================
// === 21. УМНЫЙ БУФЕР ОБМЕНА (SMART CLIPBOARD) ===
// ==========================================

const CLIPBOARD_STORAGE_KEY = "ulh_clipboard_history_v1";
const MAX_CLIP_ITEMS = 15; // Храним последние 15 копирований

// 1. Открытие / Закрытие панели
const clipToggleBtn = document.getElementById('clipboard-toggle-btn');
if (clipToggleBtn) {
    clipToggleBtn.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        document.getElementById('clipboard-panel').classList.add('open');
        document.getElementById('clipboard-overlay').classList.add('open');
        renderClipboardHistory();
    });
}

window.closeClipboardPanel = function(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    document.getElementById('clipboard-panel').classList.remove('open');
    document.getElementById('clipboard-overlay').classList.remove('open');
};

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeClipboardPanel();
});

// 2. Хак-перехватчик: ловим всё, что копируется кнопками на сайте
const originalWriteText = navigator.clipboard.writeText;
navigator.clipboard.writeText = function(text) {
    if (text && text.trim().length > 0) {
        saveToClipboardDB(text.trim());
    }
    // Выполняем оригинальное копирование в систему
    return originalWriteText.apply(this, arguments);
};

// 3. Ловим обычное копирование мышкой (Ctrl+C) внутри редактора и окон ИИ
document.addEventListener('copy', (e) => {
    const selection = document.getSelection().toString().trim();
    if (selection.length > 0) {
        saveToClipboardDB(selection);
    }
});

// 4. Логика сохранения в базу LocalStorage
function saveToClipboardDB(text) {
    let history = [];
    try {
        const stored = localStorage.getItem(CLIPBOARD_STORAGE_KEY);
        if (stored) history = JSON.parse(stored);
    } catch(e) {}

    // Если такой текст уже есть в начале списка, не дублируем
    if (history.length > 0 && history[0].text === text) return;

    // Иначе добавляем в начало с текущим временем
    history.unshift({
        id: Date.now(),
        time: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
        text: text
    });

    // Обрезаем до 15 элементов
    if (history.length > MAX_CLIP_ITEMS) {
        history = history.slice(0, MAX_CLIP_ITEMS);
    }

    localStorage.setItem(CLIPBOARD_STORAGE_KEY, JSON.stringify(history));
    
    // Если панель открыта прямо сейчас — обновляем в реальном времени
    if (document.getElementById('clipboard-panel').classList.contains('open')) {
        renderClipboardHistory();
    }
}

// 5. Отрисовка списка
function renderClipboardHistory() {
    const container = document.getElementById('clipboard-list');
    if (!container) return;
    
    let history = [];
    try {
        const stored = localStorage.getItem(CLIPBOARD_STORAGE_KEY);
        if (stored) history = JSON.parse(stored);
    } catch(e) {}

    container.innerHTML = "";

    if (history.length === 0) {
        container.innerHTML = `<div style="text-align:center; color:#94A3B8; font-size:12px; margin-top:20px;">Hali heç narsa nusxalanmadi.</div>`;
        return;
    }

    history.forEach(item => {
        const card = document.createElement("div");
        card.className = "clip-item-card";
        
        // Защита от HTML-инъекций при выводе
        const safeText = item.text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const charCount = item.text.length;

        card.innerHTML = `
            <div class="clip-item-text">${safeText}</div>
            <div class="clip-item-meta">
                <span>${charCount} ta belgi</span>
                <span>${item.time}</span>
            </div>
        `;

        // При клике на карточку — вставляем текст прямо в редактор
        card.onclick = () => {
            const editorEl = document.getElementById('editor');
            if (editorEl) {
                const start = editorEl.selectionStart;
                const end = editorEl.selectionEnd;
                editorEl.value = editorEl.value.substring(0, start) + item.text + editorEl.value.substring(end);
                
                editorEl.focus();
                editorEl.selectionStart = editorEl.selectionEnd = start + item.text.length;
                
                // Триггерим события для счетчика слов и автосохранения
                if (typeof calculateAndRenderTextStats === "function") calculateAndRenderTextStats();
                if (typeof saveEditorDraft === "function") saveEditorDraft();
                if (typeof showAutosaveIndicator === "function") showAutosaveIndicator("Matn joylandi ✓");
                
                closeClipboardPanel();
            }
        };

        container.appendChild(card);
    });
}

// 6. Очистка истории
window.clearClipboardHistory = function() {
    localStorage.removeItem(CLIPBOARD_STORAGE_KEY);
    renderClipboardHistory();
};

// ==========================================
// === 22. МИНИ-БРАУЗЕР (TEZKOR QIDIRUV) ===
// ==========================================

// 1. Открытие / Закрытие панели
const browserToggleBtn = document.getElementById('browser-toggle-btn');
if (browserToggleBtn) {
    browserToggleBtn.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        
        if (typeof closeClipboardPanel === 'function') closeClipboardPanel();
        
        document.getElementById('browser-panel').classList.add('open');
        document.getElementById('browser-overlay').classList.add('open');
        
        setTimeout(() => document.getElementById('browserSearchInput').focus(), 350);
    });
}

window.closeBrowserPanel = function(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    document.getElementById('browser-panel').classList.remove('open');
    document.getElementById('browser-overlay').classList.remove('open');
};

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeBrowserPanel();
});

// 2. Логика выполнения поиска (Wikipedia)
window.executeMiniSearch = function() {
    const inputEl = document.getElementById('browserSearchInput');
    const query = inputEl.value.trim();
    if (!query) return;
    
    const frame = document.getElementById('miniBrowserFrame');
    const loader = document.getElementById('browserLoader');
    
    loader.style.display = "flex";
    frame.style.opacity = "0.2";
    
    const searchUrl = `https://uz.m.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(query)}`;

    addNotification({
        type: 'wiki',
        title: 'Tezkor qidiruv',
        desc: `Qidiruv sörovi: "${query}"`,
        iconBg: '#F1F5F9', iconColor: '#334155',
        iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`,
        actions: [{ label: 'Qayta oçiş', colorClass: 'n-btn-neutral', onClick: "document.getElementById('browser-toggle-btn').click();" }]
    });
    
    frame.src = searchUrl;
    
    frame.onload = function() {
        loader.style.display = "none";
        frame.style.opacity = "1";
    };
};

// ==========================================
// === ПЕРЕХВАТ КЛИКА ЦЕНТРАЛЬНОЙ КНОПКИ Ö ===
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const dockMainBtn = document.getElementById("dockMainBtn");
    const dockContainer = document.querySelector(".glass-dock-container");
    
    if (dockMainBtn) {
        dockMainBtn.addEventListener("click", function(e) {
            // НА МОБИЛЬНОМ: Кнопка работает как открытие меню (Floating Action Button)
            if (window.innerWidth <= 768) {
                e.preventDefault(); 
                e.stopPropagation();
                if (dockContainer) dockContainer.classList.toggle("menu-open");
                return;
            }
            
            // НА ПК: Кнопка управляет музыкой (если она включена)
            if ((typeof ambientHasStartedOnce !== 'undefined' && ambientHasStartedOnce) || 
                (typeof isCustomMusicMode !== 'undefined' && isCustomMusicMode)) {
                e.preventDefault(); 
                if (typeof togglePlaybackHandler === "function") togglePlaybackHandler(e);
            }
        });
    }
    
    // Закрытие парящего меню инструментов на мобильном при клике мимо него
    document.addEventListener("click", (e) => {
        if (window.innerWidth <= 768 && dockContainer && dockContainer.classList.contains("menu-open")) {
            if (!dockContainer.contains(e.target)) {
                dockContainer.classList.remove("menu-open");
            }
        }
    });
});

// ==========================================
// === 23. ÖŞA AI WIDGET (ЧАТ-БОТ) ===
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const chatBtn = document.getElementById('osha-btn');
    const closeBtn = document.getElementById('osha-close');
    const chatModal = document.getElementById('osha-chat');
    const bubble = document.getElementById('osha-bubble');
    const messagesContainer = document.getElementById('osha-messages');
    const inputField = document.getElementById('osha-input');
    const sendBtn = document.getElementById('osha-send');
    const infoBtn = document.getElementById('osha-info-btn');
    const infoPopup = document.getElementById('osha-info-popup');
    const infoOkBtn = document.getElementById('osha-info-ok');

    const WORKER_URL = 'https://ulh-ai-helper.lanigirodesigner.workers.dev/'; 
    const SYSTEM_PROMPT = "Sen ULH (Uzbek Latin Helper) loyihasining rasmiy yordamchisi - Öşa'san. Ushbu loyihaning yaratuvchisi va dasturchisi Zafar Vakhobov (LANIGIRO) hisoblanadi. Foydalanuvchilar loyiha muallifi yoki yaratuvchisi haqida so'rashsa, har doim faxr bilan Zafar Vakhobov ekanligini aytasan. Matnlarni tahrirlaysan, xatolarni to'g'rilaysan. Doim do'stona, qisqa va aniq javob ber.";

    let chatHistory = JSON.parse(localStorage.getItem('oshaChatHistory')) || [];

    if (!chatBtn) return;

    // --- НОВАЯ ФУНКЦИЯ ДЛЯ ЧТЕНИЯ ФАЙЛОВ ---
    window.triggerOshaFileMode = function(fileText, fileName) {
        // Открываем чат
        chatModal.classList.remove('osha-hidden');
        if (bubble) {
            bubble.style.opacity = '0';
            bubble.style.visibility = 'hidden';
        }

        // Сохраняем текст файла в специальную временную память вкладки (макс. 5000 символов)
        sessionStorage.setItem('osha_file_context', fileText.substring(0, 5000));
        sessionStorage.setItem('osha_file_name', fileName);

        // Показываем красивое сообщение от бота (Оно не уходит на сервер, только для визуала)
        appendMessage('assistant', `📄 <b>${fileName}</b> fayli qabul qilindi! Men matnni öqib çiqdim. Uşbu hujjat böyiça savollar berişingiz, xulosa yozdirişingiz yoki qidirayotgan ma'lumotingizni söraşingiz mumkin.`);
        
        setTimeout(() => inputField.focus(), 300);
    };

    chatBtn.addEventListener('click', () => {
        chatModal.classList.remove('osha-hidden');
        bubble.style.opacity = '0';
        bubble.style.visibility = 'hidden';
        renderMessages();
        setTimeout(() => inputField.focus(), 300);
    });

    closeBtn.addEventListener('click', () => {
        chatModal.classList.add('osha-hidden');
        // Показываем облачко только на ПК (если ширина экрана больше 768px)
        if (window.innerWidth > 768) {
            setTimeout(() => {
                bubble.style.opacity = '1';
                bubble.style.visibility = 'visible';
            }, 300);
        }
    });

    inputField.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight < 96 ? this.scrollHeight : 96) + 'px';
    });

    function renderMessages() {
        messagesContainer.innerHTML = '';
        if (chatHistory.length === 0) {
            appendMessage('assistant', "Salom! Men Öşaman. Matningizni tekşiriş, xatolarni töğrilaş yoki yangi alifbo böyiça savollaringiz bölsa, yozing!");
        }
        chatHistory.forEach(msg => {
            if (msg.role !== 'system') appendMessage(msg.role, msg.content, false);
        });
        scrollToBottom();
    }

    function appendMessage(role, content, save = true) {
        const wrapDiv = document.createElement('div');
        wrapDiv.className = `osha-msg-wrapper ${role === 'user' ? 'osha-msg-user-wrap' : 'osha-msg-bot-wrap'}`;
        
        const containerDiv = document.createElement('div');
        containerDiv.className = 'osha-msg-container';

        const msgDiv = document.createElement('div');
        msgDiv.className = `osha-msg ${role === 'user' ? 'osha-msg-user' : 'osha-msg-bot'}`;
        
        let formattedContent = content
            .replace(/^###\s+(.*?)(?:\r?\n|$)/gm, '<div style="font-size: 14px; font-weight: 800; margin-top: 8px; margin-bottom: 4px;">$1</div>')
            .replace(/^##\s+(.*?)(?:\r?\n|$)/gm, '<div style="font-size: 15px; font-weight: 800; margin-top: 10px; margin-bottom: 4px;">$1</div>')
            .replace(/^#\s+(.*?)(?:\r?\n|$)/gm, '<div style="font-size: 16.5px; font-weight: 800; margin-top: 12px; margin-bottom: 6px;">$1</div>')
            .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color: #3b82f6; text-decoration: underline;">$1</a>')
            .replace(/(^|[^"'])(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener" style="color: #3b82f6; text-decoration: underline;">$2</a>')
            .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
            .replace(/__(.*?)__/g, '<u>$1</u>')
            .replace(/\*(.*?)\*/g, '<i>$1</i>')
            .replace(/~~(.*?)~~/g, '<strike>$1</strike>')
            .replace(/\n/g, '<br>');

        msgDiv.innerHTML = formattedContent;
        containerDiv.appendChild(msgDiv);

        // Создаем кнопки Копирования и Редактирования и для бота, и для пользователя
        const copyBtn = document.createElement('button');
        copyBtn.className = 'osha-copy-msg-btn';
        copyBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            <span class="osha-tooltip">Nusxa oliş</span>
        `;
        copyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const cleanText = content.replace(/<[^>]*>?/gm, '');
            navigator.clipboard.writeText(cleanText).then(() => {
                const tooltip = copyBtn.querySelector('.osha-tooltip');
                if (tooltip) {
                    tooltip.textContent = "Nusxalandi ✓";
                    setTimeout(() => { tooltip.textContent = "Nusxa oliş"; }, 1400);
                }
            }).catch(() => {});
        });

        const editBtn = document.createElement('button');
        editBtn.className = 'osha-edit-msg-btn';
        editBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
            <span class="osha-tooltip">Tahrirlaş</span>
        `;
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (role === 'user') {
                // Если это сообщение пользователя — возвращаем текст в поле ввода чата для быстрого редактирования
                inputField.value = content.replace(/<[^>]*>?/gm, '');
                inputField.focus();
                inputField.dispatchEvent(new Event('input'));
            } else {
                // Если это ответ ИИ — открываем в большом визуальном редакторе
                const editorField = document.getElementById('aiResultContent'); 
                if (editorField) editorField.innerHTML = content.replace(/\n/g, '<br>'); 
                const editorModal = document.getElementById('aiResultModalBackdrop');
                if (editorModal) editorModal.classList.add('open'); 
            }
        });

        containerDiv.appendChild(editBtn);
        containerDiv.appendChild(copyBtn);
        
        wrapDiv.appendChild(containerDiv);
        messagesContainer.appendChild(wrapDiv);
        scrollToBottom();

        if (save) {
            chatHistory.push({ role, content });
            localStorage.setItem('oshaChatHistory', JSON.stringify(chatHistory));
        }
    }

    function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    async function handleSend() {
        const text = inputField.value.trim();
        if (!text) return;

        inputField.value = '';
        inputField.style.height = '42px';
        sendBtn.disabled = true;

        if (typeof enforceNewUzbekAlphabet === "function") {
            appendMessage('user', enforceNewUzbekAlphabet(text));
        } else {
            appendMessage('user', text);
        }

        const typingId = 'typing-' + Date.now();
        const wrapDiv = document.createElement('div');
        wrapDiv.id = typingId;
        wrapDiv.className = 'osha-msg-wrapper osha-msg-bot-wrap';
        
        const typingDiv = document.createElement('div');
        typingDiv.className = 'osha-msg osha-msg-bot';
        typingDiv.style.display = 'flex';
        typingDiv.style.gap = '4px';
        typingDiv.style.alignItems = 'center';
        typingDiv.style.padding = '14px';
        typingDiv.innerHTML = `
            <div class="typing-dot"></div>
            <div class="typing-dot" style="animation-delay: 0.15s"></div>
            <div class="typing-dot" style="animation-delay: 0.3s"></div>
        `;
        wrapDiv.appendChild(typingDiv);
        messagesContainer.appendChild(wrapDiv);
        scrollToBottom();

        // 1. Формируем контекст ИИ
        let currentSysPrompt = SYSTEM_PROMPT;
        
        // 2. ИНЖЕКЦИЯ ФАЙЛА В ПАМЯТЬ БОТА
        const fileContext = sessionStorage.getItem('osha_file_context');
        const fileName = sessionStorage.getItem('osha_file_name');
        if (fileContext) {
            currentSysPrompt += `\n\nDIQQAT! Foydalanuvchi senga "${fileName}" nomli hujjatni yubordi. Ushbu hujjatning matni quyida keltirilgan. Agar foydalanuvchining savoli hujjatga tegishli bo'lsa, shu matnga asoslanib aniq javob ber:\n\n---\n${fileContext}\n---\n`;
        }

        let apiMessages = [{ role: 'system', content: currentSysPrompt }];
        const recentHistory = chatHistory.slice(-10); // Оставляем 10 последних сообщений
        apiMessages = apiMessages.concat(recentHistory);

        let fallbackTextFormat = apiMessages.map(m => `${m.role}: ${m.content}`).join('\n');

        try {
            const response = await fetch(WORKER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'qwen/qwen3.8-27b', // Используем твою модель
                    messages: apiMessages,
                    temperature: 0.5,
                    max_tokens: 16384,
                    mode: 'chat',
                    text: fallbackTextFormat,
                    customPrompt: currentSysPrompt
                })
            });

            const data = await response.json();
            document.getElementById(typingId).remove();
            
            let replyContent = "";
            if (data.choices && data.choices[0] && data.choices[0].message) {
                replyContent = data.choices[0].message.content;
            } else if (data.result) {
                replyContent = data.result;
            } else if (data.error) {
                const errMsg = typeof data.error === 'string' ? data.error : (data.error.message || JSON.stringify(data.error));
                replyContent = "Xatolik yuz berdi: " + errMsg;
            } else if (data.message) {
                replyContent = data.message;
            } else {
                replyContent = "Keçirasiz, noma'lum xatolik yuz berdi.";
            }

            if (typeof enforceNewUzbekAlphabet === "function") {
                appendMessage('assistant', enforceNewUzbekAlphabet(replyContent));
            } else {
                appendMessage('assistant', replyContent);
            }
            
        } catch (error) {
            document.getElementById(typingId).remove();
            appendMessage('assistant', "Internet ulanişida xatolik: " + error.message);
        }

        sendBtn.disabled = false;
        inputField.focus();
    }

    sendBtn.addEventListener('click', handleSend);
    inputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });

    const clearBtn = document.getElementById('osha-clear-btn');
    const clearConfirm = document.getElementById('osha-clear-confirm');
    const confirmYes = document.getElementById('osha-confirm-yes');
    const confirmNo = document.getElementById('osha-confirm-no');

    if (clearBtn && clearConfirm) {
        clearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            clearConfirm.classList.toggle('show');
        });
        confirmNo.addEventListener('click', (e) => {
            e.stopPropagation();
            clearConfirm.classList.remove('show');
        });
        confirmYes.addEventListener('click', (e) => {
            e.stopPropagation();
            chatHistory = [];
            localStorage.removeItem('oshaChatHistory');
            
            // ВАЖНО: При очистке чата также удаляем память о файле!
            sessionStorage.removeItem('osha_file_context');
            sessionStorage.removeItem('osha_file_name');
            
            clearConfirm.classList.remove('show');
            renderMessages();
        });
        document.addEventListener('click', (e) => {
            if (clearConfirm.classList.contains('show') && !clearConfirm.contains(e.target) && e.target !== clearBtn) {
                clearConfirm.classList.remove('show');
            }
        });
    }
    
    if (infoBtn && infoPopup) {
        infoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (clearConfirm) clearConfirm.classList.remove('show');
            infoPopup.classList.toggle('show');
        });
        if (infoOkBtn) {
            infoOkBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                infoPopup.classList.remove('show');
            });
        }
        document.addEventListener('click', (e) => {
            if (infoPopup.classList.contains('show') && !infoPopup.contains(e.target) && e.target !== infoBtn) {
                infoPopup.classList.remove('show');
            }
        });
    }

    const exportBtn = document.getElementById('osha-export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!chatHistory || chatHistory.length === 0) {
                alert("Chat tarixi hozircha bo'sh!");
                return;
            }
            let htmlContent = `
                <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
                <head>
                    <meta charset='utf-8'>
                    <title>Öşa AI - Çat Tarixi</title>
                    <style>
                        body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.5; color: #1e293b; padding: 20px; }
                        h2 { color: #0284c7; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
                        .msg { margin-bottom: 14px; padding: 10px 14px; border-radius: 8px; }
                        .user { background-color: #e0f2fe; text-align: right; }
                        .assistant { background-color: #f8fafc; border: 1px solid #e2e8f0; }
                        .role { font-weight: bold; font-size: 12px; margin-bottom: 4px; color: #64748b; }
                    </style>
                </head>
                <body>
                <h2>Öşa AI — Çat Tarixi (ULH Online)</h2>
            `;
            chatHistory.forEach(msg => {
                if (msg.role === 'system') return;
                const roleName = msg.role === 'user' ? 'Foydalanuvçi' : 'Öşa AI (Öşa)';
                const cssClass = msg.role === 'user' ? 'user' : 'assistant';
                const formattedText = msg.content.replace(/\n/g, '<br>');
                htmlContent += `
                    <div class="msg ${cssClass}">
                        <div class="role">${roleName}:</div>
                        <div>${formattedText}</div>
                    </div>
                `;
            });
            htmlContent += `</body></html>`;
            const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Öşa_AI_Tarix_${new Date().toISOString().slice(0, 10)}.doc`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            if (infoPopup) infoPopup.classList.remove('show');
        });
    }
});



// ==========================================
// === 25. КАЛЕНДАРЬ И МЕРОПРИЯТИЯ (ORGANIZER) ===
// ==========================================

const CALENDAR_STORAGE_KEY = "ulh_calendar_events_v1";

let calCurrentDate = new Date();
let calSelectedDate = new Date();
let calEvents = [];
let calCurrentPage = 1;
const CAL_ITEMS_PER_PAGE = 4;
let calEditingEventId = null;

const UZ_MONTHS = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];
const UZ_MONTHS_SHORT = ["Yan", "Fev", "Mar", "Apr", "May", "Iyun", "Iyul", "Avg", "Sen", "Okt", "Noy", "Dek"];

// 1. Инициализация и открытие окна
document.addEventListener('DOMContentLoaded', () => {
    loadCalEvents();
    checkTodayEventsForDockIcon();
    
    // Запускаем проверку будильников каждую минуту (в 00 секунд)
    setInterval(checkCalendarAlarms, 60000);
    setTimeout(checkCalendarAlarms, 2000); // Проверка при старте

    const calBtn = document.getElementById('calendar-toggle-btn');
    if (calBtn) {
        calBtn.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            if (typeof closeClipboardPanel === 'function') closeClipboardPanel();
            
            // Если у вас работает custom-select, инициализируем его для селекта событий
            const sel = document.getElementById('calEventType');
            if (sel && typeof initCustomSelects === 'function' && !sel.nextElementSibling?.classList.contains('custom-select-wrapper')) {
                initCustomSelects();
            }

            const modal = document.getElementById('calendarModalBackdrop');
            if (modal) {
                modal.classList.add('open');
                calCurrentDate = new Date();
                calSelectedDate = new Date();
                renderCalendar();
                updateCalDateInput();
                renderCalEventsList();
            }
        });
    }
});

window.closeCalendarModal = function(e) {
    const modal = document.getElementById('calendarModalBackdrop');
    if (!modal) return;
    if (e && e.target && e.target !== modal) return;
    
    // Сбрасываем режим редактирования при закрытии
    calEditingEventId = null;
    const btnSpan = document.querySelector('.calendar-left-col .ai-submit-modal-btn span');
    if (btnSpan) btnSpan.textContent = "Saqlaş";
    
    modal.classList.remove('open');
};

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeCalendarModal();
});

// 2. Логика рендера календаря (Месяц / Год)
window.changeCalMonth = function(step) {
    calCurrentDate.setMonth(calCurrentDate.getMonth() + step);
    renderCalendar();
};

function renderCalendar() {
    const monthYearEl = document.getElementById("calMonthYear");
    const gridEl = document.getElementById("calDaysGrid");
    if (!monthYearEl || !gridEl) return;

    const year = calCurrentDate.getFullYear();
    const month = calCurrentDate.getMonth();
    
    monthYearEl.textContent = `${UZ_MONTHS[month]} ${year}`;
    gridEl.innerHTML = "";

    // Получаем первый день месяца (0 - Воскресенье, 1 - Понедельник...)
    let firstDayIdx = new Date(year, month, 1).getDay();
    // Адаптируем под Понедельник как первый день недели
    firstDayIdx = firstDayIdx === 0 ? 6 : firstDayIdx - 1;
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Пустые ячейки до начала месяца
    for (let i = 0; i < firstDayIdx; i++) {
        const emptyDiv = document.createElement("div");
        emptyDiv.className = "cal-day-cell empty";
        gridEl.appendChild(emptyDiv);
    }

    const today = new Date();
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dayDiv = document.createElement("div");
        dayDiv.className = "cal-day-cell";
        dayDiv.textContent = day;

        // Проверка на "Сегодня"
        if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            dayDiv.classList.add("today");
        }

        // Проверка наличия событий в этот день (чтобы нарисовать точки и определить тип)
        const dateStr = `${String(day).padStart(2, '0')}.${String(month + 1).padStart(2, '0')}.${year}`;
        const dayEvents = calEvents.filter(e => e.dateStr === dateStr);
        let hasBirthday = false;

        if (dayEvents.length > 0) {
            hasBirthday = dayEvents.some(e => e.type === "birthday");
            const dot = document.createElement("div");
            dot.className = `cal-event-dot ${hasBirthday ? 'birthday' : ''}`;
            dayDiv.appendChild(dot);
        }

        // Проверка на "Выбранный день"
        if (day === calSelectedDate.getDate() && month === calSelectedDate.getMonth() && year === calSelectedDate.getFullYear()) {
            dayDiv.classList.add("selected");
            // Если выбранный день содержит День Рождения, добавляем класс для оранжевого цвета
            if (hasBirthday) {
                dayDiv.classList.add("birthday-event");
            }
        }

        dayDiv.onclick = () => {
            calSelectedDate = new Date(year, month, day);
            renderCalendar();
            updateCalDateInput();
        };

        gridEl.appendChild(dayDiv);
    }
}

// 3. Управление полями ввода
function updateCalDateInput() {
    const inp = document.getElementById("calDateInput");
    if (!inp) return;
    const d = String(calSelectedDate.getDate()).padStart(2, '0');
    const m = String(calSelectedDate.getMonth() + 1).padStart(2, '0');
    const y = calSelectedDate.getFullYear();
    inp.value = `${d}.${m}.${y}`;
}

window.formatCalDateInput = function(input) {
    let val = input.value.replace(/\D/g, "");
    if (val.length > 2) val = val.substring(0, 2) + "." + val.substring(2);
    if (val.length > 5) val = val.substring(0, 5) + "." + val.substring(5, 9);
    input.value = val;

    if (val.length === 10) {
        const parts = val.split(".");
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const y = parseInt(parts[2], 10);
        
        const dateObj = new Date(y, m, d);
        if (dateObj.getFullYear() === y && dateObj.getMonth() === m && dateObj.getDate() === d) {
            calSelectedDate = dateObj;
            calCurrentDate = new Date(y, m, 1);
            renderCalendar();
        }
    }
};

window.formatCalTimeInput = function(input) {
    let val = input.value.replace(/\D/g, "");
    if (val.length >= 3) {
        val = val.substring(0, 2) + ":" + val.substring(2, 4);
    }
    
    // Валидация часов и минут
    if (val.length >= 2) {
        let hrs = parseInt(val.substring(0, 2));
        if (hrs > 23) val = "23" + val.substring(2);
    }
    if (val.length === 5) {
        let mins = parseInt(val.substring(3, 5));
        if (mins > 59) val = val.substring(0, 3) + "59";
    }
    input.value = val;
};

window.toggleCalNotifyUI = function(checkbox) {
    const ui = document.getElementById("calNotifyUI");
    if (!ui) return;
    if (checkbox.checked) {
        ui.classList.add("active");
        ui.querySelector("span").textContent = "Ha";
    } else {
        ui.classList.remove("active");
        ui.querySelector("span").textContent = "Yöq";
    }
};

window.updateCalPlaceholder = function() {
    const type = document.getElementById("calEventType").value;
    const nameInp = document.getElementById("calEventName");
    if (!nameInp) return;
    
    if (type === "birthday") {
        nameInp.placeholder = "Tuğilgan kun egasi ismi";
    } else {
        nameInp.placeholder = "Tadbir nomi";
    }
};

// 4. Сохранение, загрузка и рендер списка
function loadCalEvents() {
    try {
        const stored = localStorage.getItem(CALENDAR_STORAGE_KEY);
        calEvents = stored ? JSON.parse(stored) : [];
    } catch(e) {
        calEvents = [];
    }
}

function saveCalEvents() {
    localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(calEvents));
    checkTodayEventsForDockIcon();
}

window.editCalEvent = function(id) {
    const evt = calEvents.find(e => e.id === id);
    if (!evt) return;

    // 1. Заполняем форму данными из события
    document.getElementById("calDateInput").value = evt.dateStr;
    document.getElementById("calTimeInput").value = evt.timeStr;
    
    const notifyCheck = document.getElementById("calNotifyCheck");
    notifyCheck.checked = evt.notify;
    toggleCalNotifyUI(notifyCheck);

    const typeSelect = document.getElementById("calEventType");
    typeSelect.value = evt.type;
    
    // Если селект кастомизирован, обновляем визуальную часть кнопки
    const customTriggerText = typeSelect.nextElementSibling?.querySelector('.custom-select-text');
    if (customTriggerText) {
        customTriggerText.textContent = typeSelect.options[typeSelect.selectedIndex].text;
    }
    updateCalPlaceholder();

    document.getElementById("calEventName").value = evt.name;
    document.getElementById("calEventNote").value = evt.note;

    // 2. Включаем режим редактирования
    calEditingEventId = id; 

    // 3. Меняем текст кнопки на "Сохранить изменения"
    const btnSpan = document.querySelector('.calendar-left-col .ai-submit-modal-btn span');
    if (btnSpan) btnSpan.textContent = "Özgarişlarni saqlaş";

    // 4. Перекидываем календарь на эту дату
    jumpToCalDate(evt.dateStr);
};

window.saveCalendarEvent = function() {
    const dateStr = document.getElementById("calDateInput").value;
    const timeStr = document.getElementById("calTimeInput").value || "00:00";
    const type = document.getElementById("calEventType").value;
    const name = document.getElementById("calEventName").value.trim();
    const note = document.getElementById("calEventNote").value.trim();
    const notify = document.getElementById("calNotifyCheck").checked;

    if (dateStr.length !== 10) return alert("Iltimos, sanani töliq kiriting (DD.MM.YYYY).");
    if (!name) return alert("Iltimos, tadbir nomini kiriting.");

    const timestamp = parseDateStrToTimestamp(dateStr, timeStr);

    if (calEditingEventId) {
        // Редактируем существующее событие
        const evtIndex = calEvents.findIndex(e => e.id === calEditingEventId);
        if (evtIndex !== -1) {
            calEvents[evtIndex] = {
                ...calEvents[evtIndex],
                dateStr, timeStr, type, name, note, notify, timestamp,
                _alarmTriggered: false // Сбрасываем будильник при изменении
            };
        }
        calEditingEventId = null; // Выключаем режим редактирования
        
        // Возвращаем текст кнопки обратно
        const btnSpan = document.querySelector('.calendar-left-col .ai-submit-modal-btn span');
        if (btnSpan) btnSpan.textContent = "Saqlaş";
    } else {
        // Создаем новое событие
        const newEvent = {
            id: Date.now().toString(),
            dateStr, timeStr, type, name, note, notify, timestamp
        };
        calEvents.push(newEvent);
    }

    // Сортировка и сохранение
    calEvents.sort((a, b) => a.timestamp - b.timestamp);
    saveCalEvents();
    
    // Очистка формы
    document.getElementById("calEventName").value = "";
    document.getElementById("calEventNote").value = "";
    document.getElementById("calTimeInput").value = "";
    
    calCurrentPage = 1; 
    renderCalendar();
    renderCalEventsList();
};

function parseDateStrToTimestamp(dStr, tStr) {
    const parts = dStr.split(".");
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const y = parseInt(parts[2], 10);
    
    const tParts = tStr.split(":");
    const hr = parseInt(tParts[0], 10) || 0;
    const mn = parseInt(tParts[1], 10) || 0;

    return new Date(y, m, d, hr, mn).getTime();
}

window.deleteCalEvent = function(id) {
    calEvents = calEvents.filter(e => e.id !== id);
    saveCalEvents();
    
    // Проверка пагинации при удалении
    const maxPages = Math.ceil(calEvents.length / CAL_ITEMS_PER_PAGE);
    if (calCurrentPage > maxPages && maxPages > 0) calCurrentPage = maxPages;
    
    renderCalendar();
    renderCalEventsList();
};

window.jumpToCalDate = function(dStr) {
    const parts = dStr.split(".");
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const y = parseInt(parts[2], 10);
    
    calSelectedDate = new Date(y, m, d);
    calCurrentDate = new Date(y, m, 1);
    
    updateCalDateInput();
    renderCalendar();
};

window.changeCalPage = function(pageNum) {
    calCurrentPage = pageNum;
    renderCalEventsList();
};

function renderCalEventsList() {
    const listEl = document.getElementById("calEventsList");
    const pagEl = document.getElementById("calPagination");
    if (!listEl || !pagEl) return;

    listEl.innerHTML = "";
    pagEl.innerHTML = "";

    if (calEvents.length === 0) {
        listEl.innerHTML = `<div style="text-align:center; color:#94A3B8; font-size:13px; padding-top:40px;">Heç qanday tadbir saqlanmagan.</div>`;
        return;
    }

    // Пагинация
    const totalPages = Math.ceil(calEvents.length / CAL_ITEMS_PER_PAGE);
    const startIdx = (calCurrentPage - 1) * CAL_ITEMS_PER_PAGE;
    const currentEvents = calEvents.slice(startIdx, startIdx + CAL_ITEMS_PER_PAGE);

    currentEvents.forEach(evt => {
        const parts = evt.dateStr.split(".");
        const d = parts[0];
        const m = UZ_MONTHS_SHORT[parseInt(parts[1], 10) - 1];

        const card = document.createElement("div");
        card.className = `cal-event-card ${evt.type === 'birthday' ? 'birthday' : ''}`;
        
        let bellHtml = "";
        if (evt.notify) {
            bellHtml = `<div class="cal-evt-bell" style="color: ${evt.type==='birthday'?'#D97706':'#0284C7'};">🔔 Uyğoniş</div>`;
        }

        card.innerHTML = `
            <div class="cal-event-date-col">
                <div class="cal-evt-d">${d}</div>
                <div class="cal-evt-m">${m}</div>
                <div class="cal-evt-t">${evt.timeStr}</div>
                ${bellHtml}
            </div>
            <div class="cal-event-content-col">
                <div class="cal-evt-title">${evt.name}</div>
                <div class="cal-evt-note">${evt.note}</div>
            </div>
            <div class="cal-evt-action" style="flex-direction: column; gap: 8px; justify-content: space-between; align-items: flex-end;">
                <!-- Блок кнопок Редактировать и Удалить в одной строке -->
                <div style="display: flex; gap: 4px;">
                    <button class="cal-edit-btn" onclick="editCalEvent('${evt.id}')" title="Tahrirlaş">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                    </button>
                    <button class="cal-del-btn" onclick="deleteCalEvent('${evt.id}')" title="Öçiriş">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
                <!-- Кнопка перехода к дате -->
                <button class="cal-jump-btn" onclick="jumpToCalDate('${evt.dateStr}')" title="Sanaga ötiş">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
            </div>
        `;
        listEl.appendChild(card);
    });

    // Рендер кнопок пагинации
    if (totalPages > 1) {
        for (let i = 1; i <= totalPages; i++) {
            const pBtn = document.createElement("button");
            pBtn.className = `cal-page-btn ${i === calCurrentPage ? 'active' : ''}`;
            pBtn.textContent = i;
            pBtn.onclick = () => changeCalPage(i);
            pagEl.appendChild(pBtn);
        }
    }
}

// 5. Логика Иконки Дока и Аудио-Уведомлений
function checkTodayEventsForDockIcon() {
    const dockBtn = document.getElementById("calendar-toggle-btn");
    if (!dockBtn) return;

    const today = new Date();
    const todayStr = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
    
    const todayEvents = calEvents.filter(e => e.dateStr === todayStr);

    dockBtn.classList.remove("has-event-other", "has-event-birthday");

    if (todayEvents.length > 0) {
        const hasBirthday = todayEvents.some(e => e.type === "birthday");
        if (hasBirthday) {
            dockBtn.classList.add("has-event-birthday");
        } else {
            dockBtn.classList.add("has-event-other");
        }
    }
}

function checkCalendarAlarms() {
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    calEvents.forEach(evt => {
        // Если дата, время совпадают, включено уведомление и мы еще не пищали для этого ID
        if (evt.notify && evt.dateStr === dateStr && evt.timeStr === timeStr && !evt._alarmTriggered) {
            evt._alarmTriggered = true; // Ставим флаг в runtime-объекте, чтобы не пищать 60 раз за 1 минуту
            playCalendarBeepSequence();
            
            // Всплывающее системное окно браузера для надежности (если разрешено)
            if (Notification.permission === "granted") {
                new Notification(evt.name, { body: evt.note, icon: "/favicon.ico" });
            } else if (Notification.permission !== "denied") {
                Notification.requestPermission();
            }
        }
    });
}

// 3 сигнала с интервалом в 2 секунды
function playCalendarBeepSequence() {
    let beeps = 0;
    
    function beep() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            osc.type = 'square'; // Более резкий звук для будильника
            osc.frequency.setValueAtTime(600, ctx.currentTime);
            
            gainNode.gain.setValueAtTime(0.1, ctx.currentTime); // Громкость 10%
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

            osc.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            osc.start();
            osc.stop(ctx.currentTime + 0.5); 
        } catch (e) {
            console.log("Audio API not supported");
        }
    }

    // Делаем 3 гудка
    beep();
    beeps++;
    const interval = setInterval(() => {
        if (beeps < 3) {
            beep();
            beeps++;
        } else {
            clearInterval(interval);
        }
    }, 2000); // Раз в 2 секунды
}


// ==========================================
// === 26. СТУДИЯ КАСТОМИЗАЦИИ (MENING USLUBIM) ===
// ==========================================
const THEME_ACCENT_KEY = "ulh_custom_accent_v1";
const THEME_BG_KEY = "ulh_custom_bg_v1";

// 1. Открытие / закрытие панели
const themeStudioBtn = document.getElementById('themeStudioBtn');
if (themeStudioBtn) {
    themeStudioBtn.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        
        // Закрываем другие выезжающие панели
        if (typeof closeClipboardPanel === 'function') closeClipboardPanel();
        if (typeof closeBrowserPanel === 'function') closeBrowserPanel();
        
        document.getElementById('themeStudioPanel').classList.add('open');
        document.getElementById('themeStudioOverlay').classList.add('open');
    });
}

window.closeThemeStudioPanel = function(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const panel = document.getElementById('themeStudioPanel');
    const overlay = document.getElementById('themeStudioOverlay');
    if (panel) panel.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
};

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeThemeStudioPanel();
});

// 2. Установка акцентного цвета
window.setAccentColor = function(color, hoverColor, lightBgColor) {
    try {
        localStorage.setItem(THEME_ACCENT_KEY, JSON.stringify({ color, hoverColor, lightBgColor }));
    } catch(_) {}

    applyAccentColorToDOM(color, hoverColor, lightBgColor);

    // Обновляем визуальное состояние кнопок (кружков)
    document.querySelectorAll('.theme-color-option').forEach(btn => {
        const isActive = btn.getAttribute('data-color') === color;
        btn.classList.toggle('active', isActive);
        // Обновляем цвет рамки активного кружка, чтобы он соответствовал цвету
        if (isActive) {
            btn.style.boxShadow = `0 0 0 3px var(--bg-color, #FFFFFF), 0 0 0 5px ${color}`;
        } else {
            btn.style.boxShadow = `0 2px 6px rgba(0,0,0,0.1)`;
        }
    });
};

// 3. Динамическая инъекция CSS-переменных и стилей
function applyAccentColorToDOM(color, hoverColor, lightBgColor) {
    let customStyleTag = document.getElementById("dynamicAccentStyles");
    if (!customStyleTag) {
        customStyleTag = document.createElement("style");
        customStyleTag.id = "dynamicAccentStyles";
        document.head.appendChild(customStyleTag);
    }

    // ВАЖНО: Конвертируем HEX в RGB, чтобы делать красивые тени и прозрачность
    const hexToRgb = (hex) => {
        let r = 0, g = 0, b = 0;
        if (hex.length === 7) {
            r = parseInt(hex.substring(1, 3), 16);
            g = parseInt(hex.substring(3, 5), 16);
            b = parseInt(hex.substring(5, 7), 16);
        }
        return `${r}, ${g}, ${b}`;
    };
    const rgb = hexToRgb(color);

    // Разделяем стили для светлой и тёмной темы, используем rgba для гармонии
    customStyleTag.innerHTML = `
        /* СВЕТЛАЯ ТЕМА */
        body:not(.dark-mode) .copy-link { background-color: ${lightBgColor} !important; color: ${color} !important; }
        body:not(.dark-mode) .copy-link:hover, body:not(.dark-mode) .copy-link.copied { background-color: ${color} !important; color: #FFFFFF !important; }
        body:not(.dark-mode) .copy-icon-btn { background-color: ${lightBgColor} !important; color: ${color} !important; }
        body:not(.dark-mode) .copy-icon-btn:hover, body:not(.dark-mode) .copy-icon-btn.copied { background-color: ${color} !important; color: #FFFFFF !important; }
        body:not(.dark-mode) .ads-tg-order-btn { background-color: ${lightBgColor} !important; color: ${color} !important; }
        body:not(.dark-mode) .ads-tg-order-btn:hover { background-color: ${color} !important; color: #FFFFFF !important; }
        body:not(.dark-mode) .nav-link-btn.active { background-color: ${lightBgColor} !important; color: ${color} !important; }

        /* ТЁМНАЯ ТЕМА */
        body.dark-mode .copy-link { background-color: rgba(${rgb}, 0.18) !important; color: ${color} !important; }
        body.dark-mode .copy-link:hover, body.dark-mode .copy-link.copied { background-color: ${color} !important; color: #FFFFFF !important; }
        body.dark-mode .copy-icon-btn { background-color: rgba(${rgb}, 0.18) !important; color: ${color} !important; }
        body.dark-mode .copy-icon-btn:hover, body.dark-mode .copy-icon-btn.copied { background-color: ${color} !important; color: #FFFFFF !important; }
        body.dark-mode .ads-tg-order-btn { background-color: rgba(${rgb}, 0.18) !important; color: ${color} !important; }
        body.dark-mode .ads-tg-order-btn:hover { background-color: ${color} !important; color: #FFFFFF !important; }
        body.dark-mode .nav-link-btn.active { background-color: rgba(${rgb}, 0.15) !important; color: ${color} !important; }

        /* ОБЩИЕ ЭЛЕМЕНТЫ (Тени и обводки) */
        .browser-input:focus { border-color: ${color} !important; box-shadow: 0 0 0 3px rgba(${rgb}, 0.15) !important; }
        .browser-search-btn { background: ${color} !important; }
        .browser-search-btn:hover { background: ${hoverColor} !important; }
        .calc-input-row:focus-within { border-color: ${color} !important; box-shadow: 0 0 0 3px rgba(${rgb}, 0.15) !important; }
        .calc-curr-tab.active { background: ${color} !important; border-color: ${color} !important; }
        .calc-result-card.uzs-main-card .calc-result-value { color: ${color} !important; }
        textarea:focus { border-color: ${color} !important; box-shadow: 0 0 0 3px rgba(${rgb}, 0.12) !important; }
        
        /* Кнопки с тенью (Тень теперь формируется из акцентного цвета) */
        .pill-btn { background-color: ${color} !important; box-shadow: 0 4px 12px rgba(${rgb}, 0.28) !important; }
        .pill-btn:hover { opacity: 0.85; }
        
        .dropdown-link:hover { color: ${color} !important; }
        .alpha-letter-pill:hover { background: ${color} !important; border-color: ${color} !important; }
        .alpha-copy-btn:hover { background: ${color} !important; border-color: ${color} !important; }
        .cal-day-cell.selected:not(.birthday-event) { background: ${color} !important; box-shadow: 0 4px 10px rgba(${rgb}, 0.3) !important; }
        .cal-day-cell.selected:not(.birthday-event):hover { background: ${hoverColor} !important; }
        .cal-event-dot:not(.birthday) { background: ${color} !important; }
        .clipboard-header svg { stroke: ${color} !important; }
    `;
}

// 4. Установка фоновых обоев
window.setCustomBackground = function(bgValue, nameKey) {
    try {
        localStorage.setItem(THEME_BG_KEY, JSON.stringify({ bgValue, nameKey }));
    } catch(_) {}

    applyBackgroundToDOM(bgValue);

    document.querySelectorAll('.theme-bg-option').forEach(btn => {
        const isMatch = btn.textContent.includes(nameKey);
        btn.classList.toggle('active', isMatch);
        const statusSpan = btn.querySelector('span:last-child');
        if (statusSpan) {
            statusSpan.textContent = isMatch ? "Tanlangan" : "Oçiş";
        }
    });
};

function applyBackgroundToDOM(bgValue) {
    if (bgValue.includes("back.png") || bgValue === "default") {
        // Очищаем инлайн стили! CSS сам подхватит нужный фон для тёмной или светлой темы
        document.body.style.backgroundImage = "";
        document.body.style.backgroundColor = "";
    } else if (bgValue.startsWith("linear-gradient")) {
        document.body.style.backgroundImage = bgValue;
    } else {
        // Сплошной цвет
        document.body.style.backgroundImage = "none";
        document.body.style.backgroundColor = bgValue;
    }
}

// 5. Сброс к настройкам по умолчанию
window.resetThemeDefaults = function() {
    localStorage.removeItem(THEME_ACCENT_KEY);
    localStorage.removeItem(THEME_BG_KEY);
    
    // Очищаем инлайн-стили перед перезагрузкой
    document.body.style.backgroundImage = "";
    document.body.style.backgroundColor = "";

    const customStyleTag = document.getElementById("dynamicAccentStyles");
    if (customStyleTag) customStyleTag.remove();

    // Обновляем UI панели на значения по умолчанию
    setAccentColor('#0284C7', '#0369A1', '#D9F0FC');
    setCustomBackground('./back.png', 'Default');
    
    // Перезагружаем страницу для идеального сброса
    setTimeout(() => {
        window.location.reload();
    }, 150);
};

// 6. Автозагрузка сохраненных настроек при старте сайта
document.addEventListener('DOMContentLoaded', () => {
    try {
        const savedAccent = localStorage.getItem(THEME_ACCENT_KEY);
        if (savedAccent) {
            const parsed = JSON.parse(savedAccent);
            applyAccentColorToDOM(parsed.color, parsed.hoverColor, parsed.lightBgColor);
            
            // Подсветка нужного кружка
            document.querySelectorAll('.theme-color-option').forEach(btn => {
                const isActive = btn.getAttribute('data-color') === parsed.color;
                btn.classList.toggle('active', isActive);
                if (isActive) {
                    btn.style.boxShadow = `0 0 0 3px var(--bg-color, #FFFFFF), 0 0 0 5px ${parsed.color}`;
                }
            });
        }

        const savedBg = localStorage.getItem(THEME_BG_KEY);
        if (savedBg) {
            const parsed = JSON.parse(savedBg);
            applyBackgroundToDOM(parsed.bgValue);
            
            // Подсветка нужной кнопки обоев
            document.querySelectorAll('.theme-bg-option').forEach(btn => {
                const isMatch = btn.textContent.includes(parsed.nameKey);
                btn.classList.toggle('active', isMatch);
                const statusSpan = btn.querySelector('span:last-child');
                if (statusSpan) {
                    statusSpan.textContent = isMatch ? "Tanlangan" : "Oçiş";
                }
            });
        }
    } catch(_) {}
});



// ==========================================
// === 27. AQLLI ANDOZALAR (КОНСТРУКТОР ДОКУМЕНТОВ) ===
// ==========================================

// Конфигурация полей для каждого типа документа
const ANDOZA_FIELDS = {
    ariza: [
        { id: "andTo", placeholder: "Kimning nomiga (masalan: Universitet rektori F.I.Ş.)" },
        { id: "andFrom", placeholder: "Kimdan (Sizning F.I.Ş. va lavozimingiz/guruh)" },
        { id: "andReason", placeholder: "Nima maqsadda? (masalan: Betobligim sababli 3 kunga javob)" }
    ],
    tushuntirish: [
        { id: "andTo", placeholder: "Kimning nomiga (Rahbar F.I.Ş.)" },
        { id: "andFrom", placeholder: "Kimdan (Sizning F.I.Ş.)" },
        { id: "andReason", placeholder: "Nima yuz berdi? (masalan: Darsga keç qoldim, sababi transport)" }
    ],
    malumotnoma: [
        { id: "andTo", placeholder: "Qayerga taqdim etiladi? (masalan: İşt joyiga)" },
        { id: "andFrom", placeholder: "Kimga berilmoqda? (Şaxsning F.I.Ş.)" },
        { id: "andReason", placeholder: "Qanday ma'lumot? (masalan: Haqiqatan ham universitetda öqiydi)" }
    ],
    tavsiyanoma: [
        { id: "andFrom", placeholder: "Kimga tavsiyanoma yozilmoqda? (F.I.Ş. va lavozim)" },
        { id: "andReason", placeholder: "Xodimning yutuqlari va xarakteri (qisqaça)" }
    ]
};

window.openAndozaModal = function(event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    document.querySelectorAll('.nav-item.has-dropdown').forEach(el => el.classList.remove('open'));
    
    // Инициализируем кастомный селект, если он еще не готов
    const sel = document.getElementById('andozaType');
    if (sel && typeof initCustomSelects === 'function' && !sel.nextElementSibling?.classList.contains('custom-select-wrapper')) {
        initCustomSelects();
    }
    
    toggleAndozaFields();
    const modal = document.getElementById('andozaModalBackdrop');
    if (modal) modal.classList.add('open');
};

window.closeAndozaModal = function(event) {
    const modal = document.getElementById('andozaModalBackdrop');
    if (!modal) return;
    if (event && event.target && event.target !== modal) return;
    modal.classList.remove('open');
};

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAndozaModal();
});

// Динамическое обновление полей ввода
window.toggleAndozaFields = function() {
    const type = document.getElementById("andozaType").value;
    const container = document.getElementById("andozaDynamicFields");
    if (!container) return;

    container.innerHTML = "";
    const fields = ANDOZA_FIELDS[type];
    
    fields.forEach(field => {
        let input;
        if (field.id === "andReason") {
            input = document.createElement("textarea");
            input.style.height = "70px";
            input.style.resize = "none";
        } else {
            input = document.createElement("input");
            input.type = "text";
        }
        input.id = field.id;
        input.className = "bib-custom-input";
        input.placeholder = field.placeholder;
        container.appendChild(input);
    });
};

window.generateAndozaDocument = async function() {
    const type = document.getElementById("andozaType").value;
    const btnText = document.getElementById("andozaBtnText");
    const submitBtn = document.getElementById("andozaSubmitBtn");
    const sparkleIcon = submitBtn.querySelector(".ai-sparkle-icon");

    // Сбор данных из полей
    const to = document.getElementById("andTo") ? document.getElementById("andTo").value.trim() : "";
    const from = document.getElementById("andFrom") ? document.getElementById("andFrom").value.trim() : "";
    const reason = document.getElementById("andReason") ? document.getElementById("andReason").value.trim() : "";

    if (!from || !reason) {
        alert("Iltimos, kerakli ma'lumotlarni kiriting!");
        return;
    }

    // Состояние загрузки
    submitBtn.style.pointerEvents = "none";
    btnText.textContent = "Hujjat şakllantirilmoqda...";
    if (sparkleIcon) sparkleIcon.style.animation = "aiSpinPulse 1.1s linear infinite";

    // Формирование точного промпта для ИИ
    const promptText = `Sen professional yurist va kadrlari bo'limi mutaxassisisan. Quyidagi ma'lumotlar (kiritilgan matn tilidan qat'i nazar) asosida rasmiy idoraviy hujjat tuzib ber.
Hujjat turi: ${type.toUpperCase()}.
KIMGA: ${to}
KIMDAN / KIM HAQIDA: ${from}
MAZMUNI / SABABI: ${reason}

QOIDALAR:
1. Hujjat rasmiy, sipo va xatosiz o'zbek tilida yozilsin (yangi alifbo asosida).
2. Sahifaning o'ng yuqori burchagida yoziladigan qismni (Kimga va Kimdan) to'g'ri joylashtir.
3. Hujjat nomi (ARIZA, TUSHUNTIRISH XATI) matn o'rtasida katta harflar bilan yozilsin.
4. Javobni chiroyli Markdown formatida ber (bold va abzaslar bilan).
5. Imzo va sana uchun matn oxirida joy qoldir. Hujjat tayyor bo'lgach, faqat hujjat matnini yubor, ortiqcha izoh yozma.`;

    try {
        const response = await fetch(AI_PROXY_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "custom", text: "Hujjat yarating", customPrompt: promptText })
        });

        if (!response.ok) throw new Error("Server xatosi");

        const data = await response.json();
        let rawResult = data.result || data.response || (typeof data === "string" ? data : JSON.stringify(data));
        
        let cleanResult = typeof enforceNewUzbekAlphabet === "function" ? enforceNewUzbekAlphabet(rawResult) : rawResult;

        // Открываем готовый ИИ-редактор с нашим документом
        closeAndozaModal();
        if (typeof openAiResultModal === "function") {
            openAiResultModal(cleanResult);
        }

    } catch (err) {
        console.error("Andoza Error:", err);
        alert(`Hujjat yaratishda xatolik: ${err.message}`);
    } finally {
        submitBtn.style.pointerEvents = "auto";
        btnText.textContent = "Hujjatni yaratiş";
        if (sparkleIcon) sparkleIcon.style.animation = "none";
    }
};


// ==========================================
// === 28. МАШИНА ВРЕМЕНИ (MATN TARIXI) ===
// ==========================================
const TIME_MACHINE_KEY = "ulh_time_machine_v1";
const TM_MAX_SNAPSHOTS = 50; // Храним до 50 версий текста (этого хватит на несколько дней)
let tmSnapshots = [];
let tmSaveInterval = null;

function initTimeMachine() {
    try {
        const stored = localStorage.getItem(TIME_MACHINE_KEY);
        tmSnapshots = stored ? JSON.parse(stored) : [];
    } catch(e) {
        tmSnapshots = [];
    }

    // Незаметно делаем снимок текста каждые 5 минут, ЕСЛИ он изменился
    tmSaveInterval = setInterval(() => {
        saveTimeMachineSnapshot(false);
    }, 5 * 60 * 1000);

    // Делаем первый снимок через 3 секунды после открытия сайта (если там есть текст)
    setTimeout(() => {
        if (editor && editor.value.trim().length > 0 && tmSnapshots.length === 0) {
            saveTimeMachineSnapshot(true);
        }
    }, 3000);
}

// Функция создания слепка текста
window.saveTimeMachineSnapshot = function(force = false) {
    if (!editor) return;
    const currentText = editor.value.trim();
    if (!currentText) return;

    // Не плодим одинаковые слепки, если текст не менялся
    if (tmSnapshots.length > 0 && !force) {
        const lastSnapshot = tmSnapshots[tmSnapshots.length - 1];
        if (lastSnapshot.text === currentText) return;
    }

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const dateStr = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    tmSnapshots.push({
        time: `${timeStr} (${dateStr})`,
        timestamp: now.getTime(),
        text: currentText
    });

    // Удаляем самые старые версии, чтобы не перегружать память
    if (tmSnapshots.length > TM_MAX_SNAPSHOTS) {
        tmSnapshots.shift(); 
    }

    try {
        localStorage.setItem(TIME_MACHINE_KEY, JSON.stringify(tmSnapshots));
    } catch(e) {
        console.error("Time machine save error:", e);
    }
};

window.openTimeMachineModal = function(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    
    // Делаем актуальный снимок прямо перед открытием окна, на всякий случай
    saveTimeMachineSnapshot(false);

    if (tmSnapshots.length === 0) {
        alert("Hali saqlangan tarix yöq. Matn yozilgaç, har 5 daqiqada avtomatik saqlanadi.");
        return;
    }

    document.querySelectorAll('.nav-item.has-dropdown').forEach(el => el.classList.remove('open'));
    
    const modal = document.getElementById("timeMachineModalBackdrop");
    const slider = document.getElementById("tmSlider");
    
    if (modal && slider) {
        slider.max = tmSnapshots.length - 1;
        slider.value = tmSnapshots.length - 1; // Устанавливаем ползунок в конец (самая свежая версия)
        updateTimeMachinePreview();
        modal.classList.add("open");
    }
};

window.closeTimeMachineModal = function(e) {
    const modal = document.getElementById("timeMachineModalBackdrop");
    if (!modal) return;
    if (e && e.target && e.target !== modal) return;
    modal.classList.remove("open");
};

// Обновление предпросмотра при движении ползунка
window.updateTimeMachinePreview = function() {
    const slider = document.getElementById("tmSlider");
    const preview = document.getElementById("tmPreview");
    const timeLabel = document.getElementById("tmTimeLabel");
    const charCount = document.getElementById("tmCharCount");

    if (!slider || !preview || !timeLabel || tmSnapshots.length === 0) return;

    const idx = parseInt(slider.value, 10);
    const snapshot = tmSnapshots[idx];

    if (snapshot) {
        preview.value = snapshot.text;
        timeLabel.textContent = `Vaqt: ${snapshot.time}`;
        charCount.textContent = `${snapshot.text.length} belgi`;
    }
};

// Восстановление текста
window.restoreTimeMachineVersion = function() {
    const preview = document.getElementById("tmPreview");
    if (!editor || !preview) return;

    // Сохраняем текущую "испорченную" версию в бэкап, вдруг пользователь передумает
    saveTimeMachineSnapshot(true);

    const restoredText = preview.value;
    editor.value = restoredText;
    
    if (typeof saveEditorDraft === "function") saveEditorDraft();
    if (typeof calculateAndRenderTextStats === "function") calculateAndRenderTextStats();
    
    closeTimeMachineModal();
    
    if (typeof showAutosaveIndicator === "function") {
        setTimeout(() => showAutosaveIndicator("Matn tiklandi ✓"), 300);
    }
};

window.clearTimeMachineHistory = function() {
    if (confirm("Butun tarixni öçirib taşlamoqçimisiz?")) {
        tmSnapshots = [];
        localStorage.removeItem(TIME_MACHINE_KEY);
        closeTimeMachineModal();
        if (typeof showAutosaveIndicator === "function") showAutosaveIndicator("Tarix tozalandi");
    }
};

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeTimeMachineModal();
});

// Запускаем движок при загрузке
document.addEventListener('DOMContentLoaded', initTimeMachine);

// ==========================================
// === 29. ASMR MEXANIK KLAVIATURA OVOZI (CUSTOM SAMPLES) ===
// ==========================================
const ASMR_STORAGE_KEY = "ulh_asmr_mode_v1";
let isAsmrEnabled = false;
let asmrAudioCtx = null;
let asmrSamplesLoaded = false;

// ПУТИ К ТВОИМ ЗВУКАМ (можно указать 1 файл или несколько для обычных клавиш)
const ASMR_SOUND_PATHS = {
    normal: [
        "./sounds/key1.wav",
        "./sounds/key2.wav", 
        "./sounds/key3.wav"
    ],
    space: "./sounds/space.wav",
    backspace: "./sounds/backspace.wav"
};

const ASMR_VOLUME = 1.0; // Громкость от 0.1 до 1.0
const asmrBuffers = { normal: [], space: null, backspace: null };

// Инициализация аудио и фоновая загрузка сэмплов в память
async function initAsmrAudio() {
    if (!asmrAudioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) asmrAudioCtx = new AudioContextClass();
    }
    if (asmrAudioCtx && asmrAudioCtx.state === 'suspended') {
        await asmrAudioCtx.resume();
    }
    if (!asmrSamplesLoaded && asmrAudioCtx) {
        asmrSamplesLoaded = true;
        await loadAsmrSamples();
    }
}

async function fetchAudioBuffer(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const arrayBuffer = await res.arrayBuffer();
        return await asmrAudioCtx.decodeAudioData(arrayBuffer);
    } catch (e) {
        console.warn("ASMR sound load error:", url, e);
        return null;
    }
}

async function loadAsmrSamples() {
    const normalPromises = ASMR_SOUND_PATHS.normal.map(url => fetchAudioBuffer(url));
    const loadedNormals = await Promise.all(normalPromises);
    asmrBuffers.normal = loadedNormals.filter(Boolean);

    asmrBuffers.space = await fetchAudioBuffer(ASMR_SOUND_PATHS.space);
    asmrBuffers.backspace = await fetchAudioBuffer(ASMR_SOUND_PATHS.backspace);
}

// Загрузка сохраненного состояния при старте
document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem(ASMR_STORAGE_KEY);
    const checkbox = document.getElementById("asmrToggleInput");
    if (saved === "1") {
        isAsmrEnabled = true;
        if (checkbox) checkbox.checked = true;
    }
});

// Переключатель в боковой панели "Sayt dizayni"
window.toggleAsmrMode = async function(checkbox) {
    isAsmrEnabled = checkbox.checked;
    localStorage.setItem(ASMR_STORAGE_KEY, isAsmrEnabled ? "1" : "0");
    
    if (isAsmrEnabled) {
        await initAsmrAudio();
        playAsmrSound('space'); // Тестовый клик при включении
    }
};

// Воспроизведение загруженного сэмпла
function playAsmrSound(keyType) {
    if (!isAsmrEnabled || !asmrAudioCtx) return;

    let buffer = null;
    if (keyType === 'space') {
        buffer = asmrBuffers.space;
    } else if (keyType === 'backspace') {
        buffer = asmrBuffers.backspace;
    } else if (asmrBuffers.normal.length > 0) {
        // Берем случайный звук из набора для обычных клавиш
        const idx = Math.floor(Math.random() * asmrBuffers.normal.length);
        buffer = asmrBuffers.normal[idx];
    }

    if (!buffer) return;

    const source = asmrAudioCtx.createBufferSource();
    source.buffer = buffer;

    // Лёгкая вариация тона (±4%) для живого звучания при быстрой печати
    source.playbackRate.value = 0.96 + Math.random() * 0.08;

    const gainNode = asmrAudioCtx.createGain();
    gainNode.gain.value = ASMR_VOLUME;

    source.connect(gainNode);
    gainNode.connect(asmrAudioCtx.destination);
    source.start(0);
}

// Перехватчик нажатий клавиш в текстовых полях
document.addEventListener('keydown', (e) => {
    if (!isAsmrEnabled) return;
    
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'INPUT' || activeEl.getAttribute('contenteditable') === 'true')) {
        if (!asmrAudioCtx || !asmrSamplesLoaded) {
            initAsmrAudio();
        }

        const ignoredKeys = [
            'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight',
            'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight', 'CapsLock', 'Tab', 'Escape'
        ];
        if (ignoredKeys.includes(e.code)) return;

        if (e.code === 'Space') {
            playAsmrSound('space');
        } else if (e.code === 'Backspace' || e.code === 'Delete') {
            playAsmrSound('backspace');
        } else {
            playAsmrSound('normal');
        }
    }
});


// ==========================================
// === 30. SOG'LOM KO'ZLAR (20-20-20 QOIDASI) ===
// ==========================================
let eyeCareActiveTime = 0;   // Время активности в секундах
let eyeCareIdleTime = 0;     // Время простоя в секундах
let eyeCareInterval = null;
let isEyeCareResting = false;

// НАСТРОЙКИ ПРАВИЛА
const WORK_TIME_LIMIT = 20 * 60; // 20 минут работы (в секундах)
const REST_TIME_LIMIT = 20;      // 20 секунд отдыха
const IDLE_RESET_LIMIT = 5 * 60; // Если 5 минут нет активности, глаза отдохнули сами, сбрасываем таймер

// Отслеживаем физическую активность пользователя (печать, мышь, скролл)
const resetIdleTime = () => {
    eyeCareIdleTime = 0;
};
document.addEventListener('mousemove', resetIdleTime);
document.addEventListener('keydown', resetIdleTime);
document.addEventListener('scroll', resetIdleTime);
document.addEventListener('click', resetIdleTime);

function initEyeCareTimer() {
    eyeCareInterval = setInterval(() => {
        if (isEyeCareResting) return; // Во время самого отдыха время не считаем

        eyeCareIdleTime++;

        // Если простой меньше 5 минут, считаем что пользователь активно работает
        if (eyeCareIdleTime < IDLE_RESET_LIMIT) {
            eyeCareActiveTime++;
        } else {
            // Если пользователь отошел на 5+ минут, сбрасываем счетчик работы (он уже отдохнул)
            eyeCareActiveTime = 0;
        }

        // Наступило время отдыха (прошло 20 минут чистой активности)
        if (eyeCareActiveTime >= WORK_TIME_LIMIT) {
            triggerEyeCareRest();
        }
    }, 1000);
}

let restCountdownInterval = null;

function triggerEyeCareRest() {
    isEyeCareResting = true;
    const overlay = document.getElementById('eyeCareOverlay');
    const timerEl = document.getElementById('eyeCareTimer');
    if (!overlay || !timerEl) return;

    // Звуковое оповещение (используем функцию гудка из календаря, если она есть)
    if (typeof playCalendarBeepSequence === "function") {
        playCalendarBeepSequence();
    }

    overlay.classList.add('active');
    
    let timeLeft = REST_TIME_LIMIT;
    timerEl.textContent = timeLeft;

    restCountdownInterval = setInterval(() => {
        timeLeft--;
        timerEl.textContent = timeLeft;

        if (timeLeft <= 0) {
            finishEyeCareRest();
            // Короткий звук "Дзинь" в конце отдыха
            if (typeof playCalendarBeepSequence === "function") playCalendarBeepSequence();
        }
    }, 1000);
}

window.finishEyeCareRest = function() {
    clearInterval(restCountdownInterval);
    const overlay = document.getElementById('eyeCareOverlay');
    if (overlay) overlay.classList.remove('active');
    
    eyeCareActiveTime = 0;
    eyeCareIdleTime = 0;
    isEyeCareResting = false;
};

window.skipEyeCare = function() {
    finishEyeCareRest();
};

// Запускаем умный таймер сразу после загрузки сайта
document.addEventListener('DOMContentLoaded', initEyeCareTimer);

// Функция ДЛЯ ТЕСТИРОВАНИЯ (позволяет проверить фичу без ожидания 20 минут)
// Нажмите в консоли браузера: testEyeCare()
window.testEyeCare = function() {
    eyeCareActiveTime = (20 * 60) - 2; // Перематываем время до 19 минут 58 секунд
    console.log("Diqqat! 2 soniyadan söng 20-20-20 oynasi oçiladi.");
};


// ==========================================
// === 31. SO'Z BULUTI (WORD CLOUD GENERATOR) ===
// ==========================================

// Список стоп-слов (предлоги, союзы, местоимения, которые нужно отбросить)
const STOP_WORDS_UZ_RU = new Set([
    // Узбекские
    "va", "yoki", "bilan", "uchun", "ham", "bu", "o'sha", "shu", "u", "ular", 
    "dan", "ga", "da", "ni", "ning", "kabi", "deb", "ekan", "edi", "emas", "lekin",
    "biroq", "ammo", "chunki", "shuning", "til", "etish", "qilish", "haqida",
    // Русские
    "и", "в", "во", "не", "что", "он", "на", "я", "с", "со", "как", "а", "то", 
    "все", "она", "так", "его", "но", "да", "ты", "к", "у", "же", "вы", "за", 
    "бы", "по", "только", "ее", "мне", "было", "вот", "от", "меня", "еще", "нет",
    // Английские
    "the", "and", "to", "a", "of", "in", "is", "it", "you", "that", "he", "was", "for", "on"
]);

window.generateWordCloud = function() {
    const editorEl = document.getElementById("editor");
    const previewBox = document.getElementById("wordCloudPreviewBox");
    const downloadBtn = document.getElementById("downloadCloudBtn");
    const canvas = document.getElementById("wordCloudCanvas");
    const miniCanvas = document.getElementById("wordCloudMiniCanvas");

    if (!editorEl || !editorEl.value.trim()) {
        alert("Iltimos, avval matn kiriting!");
        return;
    }

    const text = editorEl.value.trim();

    const wordsArray = text.toLowerCase()
        .replace(/[0-9.,/#!$%^&*;:{}=\-_`~()«»""''?![\]+]/g, " ")
        .split(/\s+/)
        .map(w => w.trim())
        .filter(w => w.length > 2 && !STOP_WORDS_UZ_RU.has(w));

    if (wordsArray.length === 0) {
        alert("Matnda tahlil qiliş uçun yetarli sözlar topilmadi.");
        return;
    }

    const frequencyMap = {};
    wordsArray.forEach(word => {
        frequencyMap[word] = (frequencyMap[word] || 0) + 1;
    });

    let wordList = Object.keys(frequencyMap).map(word => {
        const cleanWord = (typeof enforceNewUzbekAlphabet === "function") ? enforceNewUzbekAlphabet(word) : word;
        return [cleanWord, frequencyMap[word] * 45];
    });

    wordList.sort((a, b) => b[1] - a[1]);
    wordList = wordList.slice(0, 80);

    previewBox.style.display = "flex";
    downloadBtn.style.display = "inline-flex";

    const isDark = document.body.classList.contains("dark-mode");
    const bgCol = isDark ? '#0F172A' : '#FFFFFF';

    // 1. Генерируем полноразмерное облако для скачивания (1920x1080)
    WordCloud(canvas, {
        list: wordList,
        gridSize: Math.round(18 * canvas.width / 1920),
        weightFactor: 1.5,
        fontFamily: 'Manrope, Arial, sans-serif',
        color: function() {
            const palette = isDark 
                ? ['#38BDF8', '#34D399', '#A5B4FC', '#F472B6', '#FBBF24'] 
                : ['#0284C7', '#10B981', '#7C3AED', '#0D9488', '#2563EB'];
            return palette[Math.floor(Math.random() * palette.length)];
        },
        rotateRatio: 0.35,
        rotationSteps: 2,
        backgroundColor: bgCol,
        shape: 'cardioid'
    });

    // 2. Денерерируем уменьшенную копию для мини-превью квадратика (100x100)
    WordCloud(miniCanvas, {
        list: wordList,
        gridSize: Math.round(8 * miniCanvas.width / 100),
        weightFactor: 0.7,
        fontFamily: 'Manrope, Arial, sans-serif',
        color: function() {
            const palette = isDark 
                ? ['#38BDF8', '#34D399', '#A5B4FC', '#F472B6', '#FBBF24'] 
                : ['#0284C7', '#10B981', '#7C3AED', '#0D9488', '#2563EB'];
            return palette[Math.floor(Math.random() * palette.length)];
        },
        rotateRatio: 0.3,
        rotationSteps: 2,
        backgroundColor: bgCol,
        shape: 'cardioid'
    });
    // [ВСТАВИТЬ СЮДА]: Уведомление об облаке слов
    addNotification({
        type: 'cloud',
        title: 'Söz buluti yaratildi',
        desc: 'Matningiz asosida grafik bulut tayyor. Uni saqlab olişingiz mumkin.',
        iconBg: '#F3E8FF', iconColor: '#7C3AED',
        iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>`,
        actions: [{ label: 'PNG yuklab olish', colorClass: 'n-btn-xlsx', onClick: 'downloadWordCloud()' }]
    });
};

// Функция скачивания (берет данные из большого скрытого холста 1920x1080)
window.downloadWordCloud = function() {
    const canvas = document.getElementById("wordCloudCanvas");
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = 'ulh_soz_buluti.png';
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (typeof showAutosaseIndicator === "function" || typeof showAutosaveIndicator === "function") {
        showAutosaveIndicator("Söz buluti yuklab olindi ✓");
    }
};

// Функция скачивания облака слов в формате PNG
window.downloadWordCloud = function() {
    const canvas = document.getElementById("wordCloudCanvas");
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = 'ulh_soz_buluti.png';
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (typeof showAutosaveIndicator === "function") {
        showAutosaveIndicator("Söz buluti yuklab olindi ✓");
    }
};

// Открытие модального окна просмотра облака слов
window.openWordCloudModal = function() {
    const modal = document.getElementById("wordCloudModalBackdrop");
    const sourceCanvas = document.getElementById("wordCloudCanvas");
    const modalCanvas = document.getElementById("wordCloudModalCanvas");
    
    if (!modal || !sourceCanvas || !modalCanvas) return;

    // Копируем картинку из скрытого Full HD холста на холст модального окна
    const ctx = modalCanvas.getContext("2d");
    ctx.clearRect(0, 0, modalCanvas.width, modalCanvas.height);
    ctx.drawImage(sourceCanvas, 0, 0);

    modal.classList.add("open");
};

window.closeWordCloudModal = function(event) {
    const modal = document.getElementById("wordCloudModalBackdrop");
    if (!modal) return;
    if (event && event.target && event.target !== modal) return;
    modal.classList.remove("open");
};

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeWordCloudModal();
});


// ==========================================
// === 32. ЦЕНТР УВЕДОМЛЕНИЙ (NOTIFICATIONS) ===
// ==========================================
const NOTIFY_KEY = "ulh_notifications_v1";
let notifications = JSON.parse(localStorage.getItem(NOTIFY_KEY)) || [];
let currentNotifyTab = 'all'; // 'all' (новые) или 'read' (прочитанные)

// 1. Главная функция добавления уведомления
function addNotification(config) {
    const newNotif = {
        id: Date.now().toString(),
        time: new Date().getTime(),
        isRead: false,
        ...config
    };
    notifications.unshift(newNotif);
    
    // Храним максимум 50 старых уведомлений
    if (notifications.length > 50) notifications = notifications.slice(0, 50);
    
    saveNotifications();
    updateBellIcon();
    const wrap = document.getElementById('navNotifyWrap');
    if (wrap && wrap.classList.contains('open')) {
        renderNotifications();
    }
}

function saveNotifications() {
    localStorage.setItem(NOTIFY_KEY, JSON.stringify(notifications.filter(n => n.type !== 'dynamic')));
}

function updateBellIcon() {
    const unreadCount = notifications.filter(n => !n.isRead).length;
    const btn = document.getElementById('notifyToggleBtn');
    const dot = document.getElementById('notifyDot');
    if (!btn || !dot) return;

    if (unreadCount > 0) {
        dot.style.display = 'block';
        btn.classList.add('has-new');
    } else {
        dot.style.display = 'none';
        btn.classList.remove('has-new');
    }
}

// 2. Управление вкладками и рендер
window.switchNotifyTab = function(tabName) {
    currentNotifyTab = (tabName === 'read') ? 'read' : 'all';
    
    // Жестко переключаем класс active по конкретным ID
    const tabNew = document.getElementById('tabNotifyNew');
    const tabRead = document.getElementById('tabNotifyRead');
    
    if (tabNew && tabRead) {
        if (currentNotifyTab === 'all') {
            tabNew.classList.add('active');
            tabRead.classList.remove('active');
        } else {
            tabNew.classList.remove('active');
            tabRead.classList.add('active');
        }
    }
    
    // Показываем/скрываем кнопку очистки прочитанных
    const clearWrap = document.getElementById('notifyClearAllWrap');
    if (clearWrap) clearWrap.style.display = currentNotifyTab === 'read' ? 'block' : 'none';
    
    renderNotifications();
};

window.markAsRead = function(id) {
    const n = notifications.find(x => x.id === id);
    if (n) { n.isRead = true; saveNotifications(); updateBellIcon(); renderNotifications(); }
};

window.deleteNotification = function(id) {
    notifications = notifications.filter(x => x.id !== id);
    saveNotifications(); updateBellIcon(); renderNotifications();
};

window.clearReadNotifications = function() {
    notifications = notifications.filter(x => !x.isRead);
    saveNotifications(); updateBellIcon(); renderNotifications();
};

window.markNotificationsViewed = function() {
    const dot = document.getElementById('notifyDot');
    if (dot) dot.style.display = 'none';
    renderNotifications();
};

// Функция "Прочитать все"
window.markAllNotificationsAsRead = function() {
    let hasChanges = false;
    
    // Меняем статус в самой базе данных уведомлений
    notifications.forEach(n => {
        if (!n.isRead) {
            n.isRead = true;
            hasChanges = true;
        }
    });

    // Если были новые уведомления - сохраняем и обновляем интерфейс
    if (hasChanges) {
        saveNotifications();
        updateBellIcon();
        renderNotifications();
    }
};

// 3. Функция отрисовки + Динамический подхват из Календаря и Канбана
function renderNotifications() {
    const container = document.getElementById('notifyListContainer');
    if (!container) return;

    let displayList = [...notifications];

    if (currentNotifyTab === 'all') {
        // Подхватываем Канбан
        let kanbanTasks = [];
        try { kanbanTasks = JSON.parse(localStorage.getItem('ulh-kanban-tasks')) || []; } catch(e){}
        const activeTasks = kanbanTasks.filter(t => t.status === 'todo' || t.status === 'inprogress');
        if (activeTasks.length > 0) {
            displayList.unshift({
                id: 'dyn_kanban', type: 'dynamic', isRead: false,
                title: 'Kanban: Faol vazifalar', desc: `Sizda bajarilişi kutilayotgan ${activeTasks.length} ta vazifa bor.`,
                iconBg: '#FEF3C7', iconColor: '#D97706',
                iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h6v6h-6v-6"></path><path d="M14 4h6v6h-6v-6"></path><path d="M4 14h6v6h-6v-6"></path><path d="M14 17h6m-3 -3v6"></path></svg>`,
                actions: [{ label: 'Doskani oçiş', colorClass: 'n-btn-neutral', onClick: "document.getElementById('kanban-toggle-btn').click();" }],
                time: new Date().getTime()
            });
        }

        // Подхватываем Календарь (Сегодня + 2 дня)
        const today = new Date();
        const datesToCheck = [0, 1, 2].map(offset => {
            const d = new Date(today); d.setDate(today.getDate() + offset);
            return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
        });
        
        let cEvents = [];
        try { cEvents = JSON.parse(localStorage.getItem('ulh_calendar_events_v1')) || []; } catch(e){}
        const upcomingEvents = cEvents.filter(e => datesToCheck.includes(e.dateStr));
        
        upcomingEvents.forEach(evt => {
            const isToday = evt.dateStr === datesToCheck[0];
            displayList.unshift({
                id: 'dyn_cal_' + evt.id, type: 'dynamic', isRead: false,
                title: isToday ? `Bugun: ${evt.name}` : `Yaqinlaşmoqda: ${evt.name}`,
                desc: `${evt.dateStr} soat ${evt.timeStr}. ${evt.note || ''}`,
                iconBg: evt.type === 'birthday' ? '#FEE2E2' : '#E0F2FE',
                iconColor: evt.type === 'birthday' ? '#EF4444' : '#0284C7',
                iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
                actions: [{ label: 'Taqvimda köriş', colorClass: 'n-btn-neutral', onClick: `document.getElementById('calendar-toggle-btn').click(); setTimeout(()=>jumpToCalDate('${evt.dateStr}'), 100);` }],
                time: evt.timestamp || new Date().getTime()
            });
        });
    }

    // Проверяем именно класс 'dark-mode', который используется на сайте
    const isDarkMode = document.body.classList.contains('dark-mode');

    // Функция превращения HEX-цвета иконки в мягкий полупрозрачный фон для темной темы
    function getHarmoniousDarkIconStyle(iconBg, iconColor) {
        let hex = (iconColor || '#38BDF8').trim();
        const brightMap = {
            '#D97706': '#FBBF24', // Канбан (янтарный)
            '#7C3AED': '#A78BFA', // Фокус-комната / Текст (фиолетовый)
            '#4F46E5': '#818CF8', // AI Помощник (индиго)
            '#0284C7': '#38BDF8', // Файлы / Календарь (голубой)
            '#EF4444': '#F87171', // YouTube / ДР / PDF (кораллово-красный)
            '#0F172A': '#38BDF8', // QR-код
            '#334155': '#94A3B8'  // Быстрый поиск (Википедия)
        };
        const upperHex = hex.toUpperCase();
        const finalColor = brightMap[upperHex] || hex;

        if (finalColor.startsWith('#') && finalColor.length === 7) {
            const r = parseInt(finalColor.slice(1, 3), 16);
            const g = parseInt(finalColor.slice(3, 5), 16);
            const b = parseInt(finalColor.slice(5, 7), 16);
            return {
                bg: `rgba(${r}, ${g}, ${b}, 0.16)`,
                color: finalColor,
                border: `1px solid rgba(${r}, ${g}, ${b}, 0.28)`
            };
        }
        return {
            bg: 'rgba(56, 189, 248, 0.15)',
            color: '#38BDF8',
            border: '1px solid rgba(56, 189, 248, 0.28)'
        };
    }

    displayList = displayList.filter(n => currentNotifyTab === 'all' ? !n.isRead : n.isRead);

    container.innerHTML = "";
    if (displayList.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding: 30px 0; color: #94A3B8; font-size: 12px; font-weight: 600;">Hozirça böş</div>`;
        return;
    }

    displayList.sort((a, b) => b.time - a.time);

    displayList.forEach(item => {
        const d = new Date(item.time);
        const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

        // Вычисляем гармоничные цвета квадратика и иконки для текущей темы
        let iconBgStyle = item.iconBg;
        let iconColorStyle = item.iconColor;
        let iconBorderStyle = 'none';

        if (isDarkMode) {
            const darkStyle = getHarmoniousDarkIconStyle(item.iconBg, item.iconColor);
            iconBgStyle = darkStyle.bg;
            iconColorStyle = darkStyle.color;
            iconBorderStyle = darkStyle.border;
        }

        let actionsHtml = "";
        if (item.actions && item.actions.length > 0) {
            actionsHtml = `<div class="notify-actions">` + item.actions.map(btn => {
                const clickAttr = `onclick="event.stopPropagation(); ${btn.onClick.replace(/"/g, '&quot;')}"`;
                return `<button type="button" class="notify-btn ${btn.colorClass}" ${clickAttr}>${btn.label}</button>`;
            }).join('') + `</div>`;
        }

        let ctrlBtn = "";
        if (item.type !== 'dynamic') {
            if (currentNotifyTab === 'all') {
                ctrlBtn = `<button class="notify-mark-btn" title="Öqildi qilib belgilaş" onclick="event.stopPropagation(); markAsRead('${item.id}')">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></button>`;
            } else {
                ctrlBtn = `<button class="notify-mark-btn notify-del-btn" title="Öçiriş" onclick="event.stopPropagation(); deleteNotification('${item.id}')">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>`;
            }
        }

        const card = document.createElement('div');
        card.className = "notify-card";
        card.innerHTML = `
            <div class="notify-icon" style="background: ${iconBgStyle}; color: ${iconColorStyle}; border: ${iconBorderStyle};">
                ${item.iconSvg}
            </div>
            <div class="notify-content">
                <div class="notify-title-row">
                    <span class="notify-title">${item.title}</span>
                    <span class="notify-time">${timeStr}</span>
                </div>
                <div class="notify-desc">${item.desc}</div>
                ${actionsHtml}
            </div>
            ${ctrlBtn}
        `;
        container.appendChild(card);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    updateBellIcon();
});


// ==========================================
// === 34. ГЕНЕРАТОР SMM-ЦИТАТ (IQTIBOS DIZAYNERI) ===
// ==========================================
window.currentQuoteDataUrl = "";

window.openQuoteModal = function() {
    if (typeof closeEditorToolsMenu === "function") closeEditorToolsMenu();

    const editorEl = document.getElementById("editor");
    if (!editorEl) return;

    let selectedText = editorEl.value.substring(editorEl.selectionStart, editorEl.selectionEnd).trim();
    
    if (!selectedText) {
        selectedText = editorEl.value.trim();
        if (!selectedText) {
            if (typeof showAutosaveIndicator === "function") showAutosaveIndicator("Matn kiriting yoki ajrating!");
            return;
        }
        if (selectedText.length > 350) {
            selectedText = selectedText.substring(0, 350) + "...";
        }
    } else {
        if (selectedText.length > 450) {
            selectedText = selectedText.substring(0, 450) + "...";
        }
    }

    const modal = document.getElementById("quoteModalBackdrop");
    const textStage = document.getElementById("quoteRenderText");
    const imgPreview = document.getElementById("quotePreviewImg");
    const loader = document.getElementById("quoteLoader");

    if (!modal || !textStage || !imgPreview) return;

    textStage.innerHTML = selectedText.replace(/\n/g, "<br>");
    
    imgPreview.style.display = "none";
    loader.style.display = "block";
    loader.textContent = "Kartoçka yasalmoqda...";
    modal.classList.add("open");

    setTimeout(async () => {
        const stage = document.getElementById("quoteRenderStage");
        try {
            const canvas = await html2canvas(stage, {
                scale: 1,
                backgroundColor: null,
                useCORS: true,
                logging: false
            });
            
            const imgDataUrl = canvas.toDataURL("image/png");
            imgPreview.src = imgDataUrl;
            loader.style.display = "none";
            imgPreview.style.display = "block";
            
            window.currentQuoteDataUrl = imgDataUrl;
            
            if (typeof addNotification === "function") {
                addNotification({
                    type: 'smm',
                    title: 'Iqtibos kartoçkasi tayyor',
                    desc: 'SMM dizayn muvaffaqiyatli yaratildi.',
                    iconBg: '#FEF3C7', iconColor: '#D97706',
                    iconSvg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`,
                    actions: [{ label: 'PNG yuklab oliş', colorClass: 'n-btn-xlsx', onClick: 'downloadQuotePng()' }]
                });
            }
        } catch (e) {
            loader.textContent = "Xatolik yuz berdi!";
            console.error("Quote Render Error:", e);
        }
    }, 150);
};

window.closeQuoteModal = function(event) {
    const modal = document.getElementById("quoteModalBackdrop");
    if (!modal) return;
    if (event && event.target && event.target !== modal) return;
    modal.classList.remove("open");
};

window.downloadQuotePng = function() {
    if (!window.currentQuoteDataUrl) return;
    const a = document.createElement("a");
    a.href = window.currentQuoteDataUrl;
    a.download = `ulh_iqtibos_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (typeof showAutosaveIndicator === "function") {
        showAutosaveIndicator("Iqtibos PNG yuklab olindi ✓");
    }
};

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeQuoteModal();
});


// ==========================================
// === 35. ИНТЕРАКТИВНАЯ МИНИ-КАРТА (AVTO-MUNDARIJA) ===
// ==========================================
window.closeMinimapPanel = function() {
    const panel = document.getElementById("minimapReportBox");
    const converterBox = document.getElementById("converterBox");
    
    if (panel) {
        panel.style.display = "none";
    }
    
    if (converterBox) {
        const tg = (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : null;
        const isTelegramEnv = Boolean(tg && tg.initData && tg.initData.length > 0);
        if (!isTelegramEnv) {
            converterBox.style.display = "flex";
        }
    }
    
    if (editor) {
        editor.removeEventListener("input", updateMinimapContent);
    }
};

window.toggleMinimapPanel = function() {
    if (typeof closeEditorToolsMenu === "function") closeEditorToolsMenu();
    
    const panelExists = document.getElementById("minimapReportBox");
    if (panelExists && panelExists.style.display !== "none") {
        closeMinimapPanel();
        return;
    }
    
    const uniquenessPanel = document.getElementById("uniquenessReportBox");
    if (uniquenessPanel) uniquenessPanel.style.display = "none";
    const translatorPanel = document.getElementById("translatorReportBox");
    if (translatorPanel) translatorPanel.style.display = "none";
    
    const converterBox = document.getElementById("converterBox");
    const workspace = document.querySelector(".workspace");
    
    if (converterBox) converterBox.style.display = "none";
    
    let panel = document.getElementById("minimapReportBox");
    if (!panel) {
        panel = document.createElement("div");
        panel.id = "minimapReportBox";
        if (workspace) workspace.appendChild(panel);
        else editor.parentNode.insertBefore(panel, editor.nextSibling);
    }
    
    panel.className = "minimap-right-panel";
    panel.style.display = "flex";
    
    const closeBtnHtml = `<button onclick="closeMinimapPanel()" style="position: absolute; top: 12px; right: 12px; background: rgba(0,0,0,0.04); border: none; width: 28px; height: 28px; border-radius: 50%; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #64748B; transition: all 0.2s ease; z-index: 10;" onmouseover="this.style.background='rgba(239,68,68,0.1)'; this.style.color='#EF4444'" onmouseout="this.style.background='rgba(0,0,0,0.04)'; this.style.color='#64748B'" title="Yopiş">×</button>`;
    
    panel.innerHTML = `
        ${closeBtnHtml}
        <div class="minimap-header">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0284C7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
            <span>Avto-Mundarija</span>
        </div>
        <div id="minimapContentBox" class="minimap-content custom-scrollbar"></div>
    `;
    
    updateMinimapContent();
    
    if (editor) {
        editor.addEventListener("input", updateMinimapContent);
    }
};

window.updateMinimapContent = function() {
    const contentBox = document.getElementById("minimapContentBox");
    if (!contentBox || !editor) return;
    
    const text = editor.value;
    if (!text.trim()) {
        contentBox.innerHTML = `<div style="text-align:center; color:#94A3B8; font-size:12px; margin-top:30px;">Sarlavhalarni topiş uçun matn yozing.<br><br><i>Sarlavhalar BUTUNLAY KATTA HARFDA yoki # belgisi bilan yozişi kerak.</i></div>`;
        return;
    }
    
    const lines = text.split('\n');
    let headings = [];
    let currentIndex = 0;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        const lengthWithNewline = line.length + 1;
        
        let level = 0;
        let titleText = "";
        
        const mdMatch = trimmed.match(/^(#{1,3})\s+(.+)/);
        if (mdMatch) {
            level = mdMatch[1].length;
            titleText = mdMatch[2];
        } else if (trimmed.length > 2 && trimmed.length < 80 && trimmed === trimmed.toUpperCase() && /[A-ZÖĞŞÇА-ЯЁЎҚҒҲ]/.test(trimmed)) {
            level = 1;
            titleText = trimmed;
        }
        
        if (level > 0) {
            headings.push({
                text: titleText,
                level: level,
                index: currentIndex
            });
        }
        
        currentIndex += lengthWithNewline;
    }
    
    if (headings.length === 0) {
        contentBox.innerHTML = `<div style="text-align:center; color:#94A3B8; font-size:12px; margin-top:30px;">Sarlavhalar topilmadi.<br><br>Sarlavhalarni <b>BUTUNLAY KATTA HARFLARDA</b> yozing yoki oldiga <b>#</b> belgisini qöying.</div>`;
        return;
    }
    
    contentBox.innerHTML = "";
    headings.forEach(h => {
        const item = document.createElement("div");
        item.className = `minimap-item minimap-level-${h.level}`;
        item.textContent = h.text;
        item.title = h.text;
        
        item.onclick = () => {
            editor.focus();
            editor.setSelectionRange(h.index, h.index + h.text.length);
            
            const textBefore = editor.value.substring(0, h.index);
            const lineNumbers = textBefore.split('\n').length;
            
            const isZen = document.body.classList.contains("zen-mode-active");
            const lineHeight = isZen ? 26 : 21; 
            
            editor.scrollTo({
                top: Math.max(0, (lineNumbers - 1) * lineHeight - 40),
                behavior: 'smooth'
            });
        };
        
        contentBox.appendChild(item);
    });
};


// ==========================================
// === 36. АВТО-СЕРТИФИКАТ (МАССОВЫЙ ГЕНЕРАТОР ГРАМОТ И БЕЙДЖЕЙ) ===
// ==========================================
let uploadedCertTemplate = null;

window.openCertModal = function(event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    document.querySelectorAll('.nav-item.has-dropdown').forEach(el => el.classList.remove('open'));
    
    const sel = document.getElementById('certType');
    if (sel && typeof initCustomSelects === 'function' && !sel.nextElementSibling?.classList.contains('custom-select-wrapper')) {
        initCustomSelects();
    }
    
    const dateInput = document.getElementById("certDate");
    if (dateInput && !dateInput.value) {
        const today = new Date();
        dateInput.value = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
    }

    const modal = document.getElementById('certModalBackdrop');
    if (modal) modal.classList.add('open');
};

window.closeCertModal = function(event) {
    const modal = document.getElementById('certModalBackdrop');
    if (!modal) return;
    if (event && event.target && event.target !== modal) return;
    modal.classList.remove('open');
};

window.toggleCertFields = function() {
    const type = document.getElementById("certType").value;
    document.getElementById("certFieldsStudent").classList.toggle("active", type === "student");
    document.getElementById("certFieldsStaff").classList.toggle("active", type === "staff");
    document.getElementById("certFieldsGuest").classList.toggle("active", type === "guest");
};

window.handleCertTemplateSelect = function(input) {
    const label = document.getElementById("certTemplateLabel");
    if (input.files && input.files[0]) {
        uploadedCertTemplate = input.files[0];
        label.classList.add("loaded");
        label.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-bottom: 8px;"><polyline points="20 6 9 17 4 12"/></svg><span style="font-weight: 800; font-size: 13px;">Şablon yuklandi: ${input.files[0].name}</span>`;
    }
};

function drawSvgToCanvas(svgString, ctx, x, y, size) {
    return new Promise((resolve) => {
        const img = new Image();
        const svg64 = btoa(unescape(encodeURIComponent(svgString)));
        const b64Start = 'data:image/svg+xml;base64,';
        img.onload = function() {
            ctx.drawImage(img, x, y, size, size);
            resolve();
        };
        img.src = b64Start + svg64;
    });
}

window.processCertificates = async function() {
    const btn = document.getElementById("certGenerateBtn");
    const btnText = document.getElementById("certGenerateText");
    const icon = btn.querySelector(".ai-sparkle-icon");

    const namesRaw = document.getElementById("certNamesList").value.trim();
    const eventName = document.getElementById("certEventName").value.trim();
    const dateStr = document.getElementById("certDate").value.trim();
    const lastRegNumStr = document.getElementById("certLastNum").value.trim();
    const type = document.getElementById("certType").value;

    if (!namesRaw || !uploadedCertTemplate) {
        alert("Iltimos, ismlar röyxatini kiriting va şablonni yuklang!");
        return;
    }

    let lastRegNum = parseInt(lastRegNumStr, 10);
    if (isNaN(lastRegNum)) lastRegNum = 0;

    btn.style.pointerEvents = "none";
    btnText.textContent = "AI ma'lumotlarni tahlil qilmoqda...";
    if (icon) icon.style.animation = "aiSpinPulse 1.1s linear infinite";

    const promptText = `Sen matn muharririsan. Berilgan ro'yxatdagi ismlarni bosh harflar bilan to'g'rilab, lotin alifbosiga o'gir va har bir qatorda bittadan ism qoldir. Hech qanday qo'shimcha so'z yozma. \nRo'yxat: \n${namesRaw}`;
    
    let cleanNames = [];
    try {
        const response = await fetch(AI_PROXY_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "custom", text: namesRaw, customPrompt: promptText })
        });
        const data = await response.json();
        let aiParsed = data.result || data.response || (typeof data === "string" ? data : "");
        aiParsed = (typeof enforceNewUzbekAlphabet === "function") ? enforceNewUzbekAlphabet(aiParsed) : aiParsed;
        cleanNames = aiParsed.split('\n').map(n => n.trim()).filter(n => n.length > 0);
    } catch (e) {
        console.warn("AI formatlaşda xato, asl röyxatdan foydalanilmoqda.");
        cleanNames = namesRaw.split('\n').map(n => n.trim()).filter(n => n.length > 0);
    }

    if (cleanNames.length === 0) {
        alert("Ismlar röyxati notöğri!");
        btn.style.pointerEvents = "auto";
        btnText.textContent = "Sertifikatlarni yaratiş";
        if (icon) icon.style.animation = "none";
        return;
    }

    btnText.textContent = `Grafika render qilinmoqda (0/${cleanNames.length})...`;

    let metaText = "";
    if (type === "student") {
        const gr = document.getElementById("certGroup").value.trim();
        const cr = document.getElementById("certCourse").value.trim();
        metaText = [cr, gr].filter(Boolean).join(", ");
    } else if (type === "staff") {
        const pos = document.getElementById("certPosition").value.trim();
        const dept = document.getElementById("certDept").value.trim();
        metaText = [pos, dept].filter(Boolean).join(", ");
    } else {
        metaText = document.getElementById("certCustomText").value.trim();
    }

    let qrDatePrefix = "00-00-00";
    if (dateStr.length === 10) {
        const parts = dateStr.split(".");
        qrDatePrefix = `${parts[0]}-${parts[1]}-${parts[2].slice(-2)}`;
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    
    const imgUrl = URL.createObjectURL(uploadedCertTemplate);
    const templateImg = new Image();
    
    await new Promise((resolve) => {
        templateImg.onload = () => {
            canvas.width = templateImg.width;
            canvas.height = templateImg.height;
            resolve();
        };
        templateImg.src = imgUrl;
    });

    const zip = new JSZip();
    const folder = zip.folder("Sertifikatlar");
    let singleBlob = null;

    for (let i = 0; i < cleanNames.length; i++) {
        const name = cleanNames[i];
        lastRegNum++;
        
        const regCode = `REG-${qrDatePrefix}-${String(lastRegNum).padStart(4, '0')}`;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(templateImg, 0, 0);

        const nameSize = Math.max(40, Math.floor(canvas.width * 0.05));
        const metaSize = Math.max(20, Math.floor(canvas.width * 0.025));
        const smallSize = Math.max(16, Math.floor(canvas.width * 0.015));

        const centerX = canvas.width / 2;
        const centerY = canvas.height * 0.45;

        ctx.textAlign = "center";
        ctx.fillStyle = "#0F172A";
        ctx.font = `bold ${nameSize}px "Monotype Corsiva", "Dancing Script", cursive, serif`;
        ctx.fillText(name, centerX, centerY);

        ctx.font = `bold ${metaSize}px "Manrope", sans-serif`;
        ctx.fillStyle = "#334155";
        if (metaText) {
            ctx.fillText(metaText, centerX, centerY + (nameSize * 0.8));
        }

        ctx.fillStyle = "#0284C7";
        if (eventName) {
            ctx.fillText(eventName, centerX, centerY + (nameSize * 1.5));
        }

        if (typeof buildQrMatrix === "function" && typeof generateQrSvgMarkup === "function") {
            const qrMatrix = buildQrMatrix(regCode);
            if (qrMatrix) {
                const qrSize = Math.floor(canvas.width * 0.12);
                const qrX = canvas.width * 0.08;
                const qrY = canvas.height - (qrSize + canvas.height * 0.08);
                
                const svgString = generateQrSvgMarkup(qrMatrix, "#000000", qrSize);
                await drawSvgToCanvas(svgString, ctx, qrX, qrY, qrSize);

                ctx.font = `bold ${smallSize}px "Manrope", sans-serif`;
                ctx.fillStyle = "#64748B";
                ctx.textAlign = "left";
                ctx.fillText(regCode, qrX, qrY + qrSize + (smallSize * 1.2));
            }
        }

        if (dateStr) {
            ctx.textAlign = "right";
            ctx.font = `bold ${metaSize}px "Manrope", sans-serif`;
            ctx.fillStyle = "#0F172A";
            ctx.fillText(dateStr, canvas.width - (canvas.width * 0.08), canvas.height - (canvas.height * 0.08));
        }

        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        
        if (cleanNames.length === 1) {
            singleBlob = blob;
        } else {
            folder.file(`${name.replace(/[^a-zA-ZçşğöÇŞĞÖ\s]/g, "")}_${regCode}.png`, blob);
        }

        btnText.textContent = `Grafika render qilinmoqda (${i+1}/${cleanNames.length})...`;
    }

    btnText.textContent = "Yuklanmoqda...";
    
    if (cleanNames.length === 1 && singleBlob) {
        const url = URL.createObjectURL(singleBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Sertifikat_${cleanNames[0].replace(/[^a-zA-ZçşğöÇŞĞÖ\s]/g, "")}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } else {
        const zipBlob = await zip.generateAsync({ type: "blob", compression: "STORE" });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ULH_Sertifikatlar_Arxiv.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    if (typeof showAutosaveIndicator === "function") showAutosaveIndicator("Sertifikatlar tayyor ✓");
    
    btn.style.pointerEvents = "auto";
    btnText.textContent = "Sertifikatlarni yaratiş";
    if (icon) icon.style.animation = "none";
    closeCertModal();
};

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeCertModal();
});


// ==========================================
// === 37. ВИЗУАЛЬНЫЙ СКАНЕР ИЗМЕНЕНИЙ (TEXT DIFF) ===
// ==========================================
window.openDiffModal = function(event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    if (typeof closeEditorToolsMenu === "function") closeEditorToolsMenu();
    
    const modal = document.getElementById("diffModalBackdrop");
    if (modal) {
        modal.classList.add("open");
        
        const newTextArea = document.getElementById("diffNewText");
        if (editor && editor.value.trim().length > 0 && newTextArea && !newTextArea.value) {
            newTextArea.value = editor.value;
        }
    }
};

window.closeDiffModal = function(event) {
    const modal = document.getElementById("diffModalBackdrop");
    if (!modal) return;
    if (event && event.target && event.target !== modal) return;
    modal.classList.remove("open");
};

window.resetDiffView = function() {
    document.getElementById("diffInputArea").style.display = "grid";
    document.getElementById("diffResultArea").style.display = "none";
    
    document.getElementById("diffRunBtn").style.display = "flex";
    document.getElementById("diffBackBtn").style.display = "none";
    
    document.getElementById("diffResultBox").innerHTML = "";
};

window.executeTextDiff = function() {
    if (typeof Diff === "undefined") {
        alert("Kutubxona yuklanmoqda... Iltimos bir oz kuting.");
        return;
    }
    
    const oldText = document.getElementById("diffOldText").value.trim();
    const newText = document.getElementById("diffNewText").value.trim();
    
    if (!oldText || !newText) {
        alert("Iltimos, soliştiriş uçun ikkala maydonni ham töldiring!");
        return;
    }
    
    document.getElementById("diffInputArea").style.display = "none";
    document.getElementById("diffResultArea").style.display = "block";
    
    document.getElementById("diffRunBtn").style.display = "none";
    document.getElementById("diffBackBtn").style.display = "flex";
    
    const resultBox = document.getElementById("diffResultBox");
    resultBox.innerHTML = "<div style='text-align:center; padding: 40px; color:#64748B;'>Tahlil qilinmoqda... Kuting.</div>";
    
    setTimeout(() => {
        const diff = Diff.diffWords(oldText, newText);
        let html = "";
        
        diff.forEach((part) => {
            const textWithBreaks = escapeHTML(part.value).replace(/\n/g, "<br>");
            
            if (part.added) {
                html += `<span class="diff-add">${textWithBreaks}</span>`;
            } else if (part.removed) {
                html += `<span class="diff-remove">${textWithBreaks}</span>`;
            } else {
                html += `<span class="diff-unchanged">${textWithBreaks}</span>`;
            }
        });
        
        resultBox.innerHTML = html;
    }, 150); 
};

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDiffModal();
});


// ==========================================
// === 38. P2P ПЕРЕДАЧА ТЕКСТА ЧЕРЕЗ ХЭШ (#) С ЗАЩИТОЙ QR ===
// ==========================================

window.openP2pModal = function(event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    if (typeof closeEditorToolsMenu === "function") closeEditorToolsMenu();

    if (!editor || !editor.value.trim()) {
        alert("Iltimos, uzatiş uçun avval matn kiriting!");
        if (editor) editor.focus();
        return;
    }

    const modal = document.getElementById("p2pModalBackdrop");
    const qrBox = document.getElementById("p2pQrBox");
    const hint = document.getElementById("p2pSizeHint");
    
    if (!modal || !qrBox) return;

    const rawText = editor.value.trim();
    
    // 1. Сжимаем текст алгоритмом LZ-String
    const compressed = LZString.compressToEncodedURIComponent(rawText);
    
    // 2. Формируем локальную ссылку с хэшем (#)
    const currentBaseUrl = window.location.origin + window.location.pathname;
    const shareUrl = `${currentBaseUrl}#${compressed}`;

    window.currentP2pShareUrl = shareUrl;

    // 3. Умная проверка длины: если текст больше 500 символов, QR-код будет слишком плотным.
    // В таком случае показываем предупреждение вместо «шумного» квадрата.
    const MAX_QR_SAFE_LENGTH = 500;

    if (rawText.length > MAX_QR_SAFE_LENGTH) {
        qrBox.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #D97706; font-size: 13px; font-weight: 700; line-height: 1.5;">
                ⚠️ Matn juda uzun (${rawText.length} belgi). <br><br>
                <span style="font-size: 11.5px; color: #64748B; font-weight: 600;">Katta hajmdagi matnlar uçun QR-kod öqilmasligi mumkin. Iltimos, quyidagi tugma orqali havolani nusxalab yuboring!</span>
            </div>
        `;
        if (hint) {
            hint.textContent = `Asl matn: ${rawText.length} belgi (Faqat havolani nusxalaş tavsiya etiladi)`;
            hint.style.color = "#D97706";
        }
    } else {
        // Если текст компактный — генерируем красивый, чистый и крупный QR-код
        try {
            const qr = qrcode(0, "L"); 
            qr.addData(shareUrl);
            qr.make();
            
            const count = qr.getModuleCount();
            let pathData = "";
            for (let r = 0; r < count; r++) {
                for (let c = 0; c < count; c++) {
                    if (qr.isDark(r, c)) {
                        pathData += `M${c},${r}h1v1h-1z `;
                    }
                }
            }
            
            qrBox.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 ${count} ${count}" shape-rendering="crispEdges">
                <rect width="${count}" height="${count}" fill="#FFFFFF"/>
                <path d="${pathData.trim()}" fill="#0F172A"/>
            </svg>`;
            
            if (hint) {
                hint.textContent = `Asl matn: ${rawText.length} belgi | QR-kod öqişga qulay`;
                hint.style.color = "#10B981";
            }
        } catch (e) {
            console.error("P2P QR Error:", e);
        }
    }

    modal.classList.add("open");
};

window.closeP2pModal = function(event) {
    const modal = document.getElementById("p2pModalBackdrop");
    if (!modal) return;
    if (event && event.target && event.target !== modal) return;
    modal.classList.remove("open");
};

window.copyP2pLink = function() {
    if (!window.currentP2pShareUrl) return;
    navigator.clipboard.writeText(window.currentP2pShareUrl).then(() => {
        if (typeof showAutosaveIndicator === "function") {
            showAutosaveIndicator("P2P havola nusxalandi");
        }
    });
};

// 4. Автоматический перехватчик: ловит данные из хэша (#) при открытии сайта на смартфоне
document.addEventListener('DOMContentLoaded', () => {
    const hashData = window.location.hash.substring(1); // Берём всё после '#'
    
    if (hashData && editor) {
        try {
            const decompressed = LZString.decompressFromEncodedURIComponent(hashData);
            if (decompressed) {
                editor.value = decompressed;
                
                if (typeof saveEditorDraft === "function") saveEditorDraft();
                if (typeof calculateAndRenderTextStats === "function") calculateAndRenderTextStats();
                
                // Аккуратно очищаем хэш из адресной строки
                history.replaceState(null, null, window.location.pathname);
                
                setTimeout(() => {
                    if (typeof showAutosaveIndicator === "function") {
                        showAutosaveIndicator("Telefondan matn qabul qilindi");
                    }
                }, 500);
            }
        } catch (e) {
            console.error("P2P Decompress Error:", e);
        }
    }
});

// ==========================================
// === 39. ИНТЕРАКТИВНЫЙ ТЕСТ / ВИКТОРИНА ===
// ==========================================

let currentQuizData = [];
let quizUserScore = 0;
let quizAnsweredCount = 0;

window.openInteractiveTestModal = async function() {
    if (typeof closeAiMenu === "function") closeAiMenu();

    if (!editor || !editor.value.trim()) {
        alert("Iltimos, test tuziş uçun avval matn kiriting!");
        if (editor) editor.focus();
        return;
    }

    const text = editor.value.trim();
    const modal = document.getElementById("quizModalBackdrop");
    const container = document.getElementById("quizBodyContainer");
    const resultBox = document.getElementById("quizResultBox");
    const restartBtn = document.getElementById("quizRestartBtn");
    const subTitle = document.getElementById("quizSub");

    if (!modal || !container) return;

    // Сброс состояния
    container.innerHTML = `<div style="text-align: center; padding: 40px; color: #0284C7; font-weight: 700;">AI matnni tahlil qilib, test tuzmoqda... Kuting...</div>`;
    resultBox.style.display = "none";
    if (restartBtn) restartBtn.style.display = "none";
    subTitle.textContent = "Matn asosida savollar tayyorlanmoqda...";
    
    quizUserScore = 0;
    quizAnsweredCount = 0;
    currentQuizData = [];

    modal.classList.add("open");

    // Строгий промпт для получения JSON ответа от ИИ
    const promptText = `Sen tajribali o'qituvchi va metodistsan. Berilgan matn asosida 5 ta test savoli tuz. Savollar tili asl matndagi tilga asosan bo'lishi shart!
Javobni FAQAT toza JSON formatida ber, hech qanday markdown (\`\`\`json) yoki boshqa so'z yozma.
Format:
[
  {
    "question": "Savol matni?",
    "options": ["Variant A", "Variant B", "Variant C", "Variant D"],
    "correct_index": 0
  }
]
Bu yerda "correct_index" — töğri javobning massivdagi indeksi (0 dan 3 gacha).
Matn: "${text.substring(0, 4000)}"`;

    try {
        const response = await fetch(AI_PROXY_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "custom", text: text, customPrompt: promptText })
        });

        if (!response.ok) throw new Error("Server xatosi");

        const data = await response.json();
        let rawResult = data.result || data.response || (typeof data === "string" ? data : JSON.stringify(data));

        let cleanJson = rawResult.replace(/```json/gi, '').replace(/```/g, '').trim();
        const startIdx = cleanJson.indexOf('[');
        const endIdx = cleanJson.lastIndexOf(']');
        if (startIdx !== -1 && endIdx !== -1) {
            cleanJson = cleanJson.substring(startIdx, endIdx + 1);
        }

        currentQuizData = JSON.parse(cleanJson);

        if (!Array.isArray(currentQuizData) || currentQuizData.length === 0) {
            throw new Error("Savollar topilmadi");
        }

        subTitle.textContent = `Jami ${currentQuizData.length} ta savol. Özingizni sinab köring!`;
        renderQuizQuestions();

    } catch (err) {
        console.error("Quiz Gen Error:", err);
        container.innerHTML = `<div style="text-align: center; color: #EF4444; font-weight: 700; padding: 20px;">Test tuzişda xatolik yuz berdi. Qaytadan urinib köring.</div>`;
        subTitle.textContent = "Xatolik yuz berdi";
    }
};

window.closeQuizModal = function(event) {
    const modal = document.getElementById("quizModalBackdrop");
    if (!modal) return;
    if (event && event.target && event.target !== modal) return;
    modal.classList.remove("open");
};

function renderQuizQuestions() {
    const container = document.getElementById("quizBodyContainer");
    if (!container) return;

    container.innerHTML = "";

    currentQuizData.forEach((q, qIndex) => {
        const card = document.createElement("div");
        card.className = "quiz-question-card";
        card.id = `quiz-card-${qIndex}`;

        let optionsHtml = "";
        q.options.forEach((opt, optIndex) => {
            const safeOpt = (typeof enforceNewUzbekAlphabet === "function") ? enforceNewUzbekAlphabet(opt) : opt;
            optionsHtml += `
                <button type="button" class="quiz-opt-btn" onclick="handleQuizAnswer(${qIndex}, ${optIndex}, this)">
                    ${optIndex + 1}. ${safeOpt}
                </button>
            `;
        });

        const safeQuestion = (typeof enforceNewUzbekAlphabet === "function") ? enforceNewUzbekAlphabet(q.question) : q.question;

        card.innerHTML = `
            <div class="quiz-q-title">${qIndex + 1}. ${safeQuestion}</div>
            <div class="quiz-options-grid">${optionsHtml}</div>
        `;
        container.appendChild(card);
    });
}

window.handleQuizAnswer = function(qIndex, selectedOptIndex, btnEl) {
    const questionObj = currentQuizData[qIndex];
    const card = document.getElementById(`quiz-card-${qIndex}`);
    if (!card) return;

    // Блокируем все кнопки в этом вопросе, чтобы нельзя было кликнуть повторно
    const allButtons = card.querySelectorAll(".quiz-opt-btn");
    allButtons.forEach((b, idx) => {
        b.disabled = true;
        if (idx === questionObj.correct_index) {
            b.classList.add("correct"); // Подсвечиваем правильный зеленым
        }
    });

    // Если выбор пользователя неверный, подсвечиваем его красным
    if (selectedOptIndex === questionObj.correct_index) {
        quizUserScore++;
    } else {
        btnEl.classList.add("wrong");
    }

    quizAnsweredCount++;

    // Проверяем, ответил ли пользователь на все вопросы
    if (quizAnsweredCount === currentQuizData.length) {
        showQuizFinalScore();
    }
};

function showQuizFinalScore() {
    const resultBox = document.getElementById("quizResultBox");
    const scoreText = document.getElementById("quizScoreText");
    const scoreComment = document.getElementById("quizScoreComment");
    const restartBtn = document.getElementById("quizRestartBtn");

    if (!resultBox) return;

    const total = currentQuizData.length;
    scoreText.textContent = `Töğri javob: ${quizUserScore} / ${total}`;

    let comment = "Yaxşi natija! Öqişni davom eting.";
    const ratio = quizUserScore / total;
    if (ratio === 1) comment = "Mukammal! Siz matnni 100% özlaştirgansiz 🏆";
    else if (ratio >= 0.7) comment = "Ajoyib natija! Mavzuni juda yaxşi tuşungansiz 👏";
    else if (ratio < 0.4) comment = "Yana bir bor öqib çiqiş tavsiya etiladi 📚";

    scoreComment.textContent = comment;
    resultBox.style.display = "block";
    if (restartBtn) restartBtn.style.display = "inline-flex";

    // Плавный скролл к результату
    resultBox.scrollIntoView({ behavior: 'smooth' });

    // Geymifikatsiya: viktorina natijasi uçun XP va nişonlar
    if (window.ULHGame && typeof window.ULHGame.onQuizFinished === 'function') window.ULHGame.onQuizFinished(quizUserScore, total);
}

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeQuizModal();
});

// ==========================================
// === 40. OVOZLI DIKTAT (Golosli kiritish) ===
// ==========================================
let speechRec = null;
let isDictating = false;

function initSpeechRecognition() {
    // Поддержка для Google Chrome, Safari, Edge
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Keçirasiz, sizning brauzeringiz ovozli diktatni qöllab-quvvatlamaydi. Çrome yoki Safari'dan foydalaning.");
        return false;
    }
    
    speechRec = new SpeechRecognition();
    speechRec.lang = 'uz-UZ'; // Слушаем узбекский язык
    speechRec.continuous = true; // Не отключаемся после первого предложения
    speechRec.interimResults = true; // Ловим текст на лету

    speechRec.onstart = function() {
        isDictating = true;
        const btn = document.getElementById("dictationBtn");
        const tooltip = document.getElementById("dictationTooltip");
        if (btn) btn.classList.add("recording");
        if (tooltip) tooltip.textContent = "Eşitilmoqda...";
        if (typeof showAutosaveIndicator === "function") showAutosaveIndicator("Mikrofon yoniq 🎙️");
    };

    speechRec.onresult = function(event) {
        let currentFinal = "";
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                // Если фраза закончена, забираем её
                currentFinal += event.results[i][0].transcript;
            }
        }

        if (currentFinal && editor) {
            // 1. Пропускаем текст через наш умный фильтр нового алфавита
            let cleanText = currentFinal;
            if (typeof enforceNewUzbekAlphabet === "function") {
                cleanText = enforceNewUzbekAlphabet(cleanText);
            }
            
            // 2. Делаем текст с заглавной буквы, если это начало предложения
            cleanText = cleanText.charAt(0).toUpperCase() + cleanText.slice(1);
            
            // 3. Вставляем текст туда, где стоит курсор
            const start = editor.selectionStart;
            const end = editor.selectionEnd;
            
            // Добавляем пробел перед новым словом, если его нет
            const prefix = (start > 0 && !editor.value.substring(0, start).endsWith(' ') && !editor.value.substring(0, start).endsWith('\n')) ? ' ' : '';
            
            const textToInsert = prefix + cleanText + ". ";
            editor.value = editor.value.substring(0, start) + textToInsert + editor.value.substring(end);
            
            const newPos = start + textToInsert.length;
            editor.focus();
            editor.selectionStart = editor.selectionEnd = newPos;
            
            // 4. Триггерим автосохранение и статистику
            if (typeof saveEditorDraft === "function") saveEditorDraft();
            if (typeof calculateAndRenderTextStats === "function") calculateAndRenderTextStats();
        }
    };

    speechRec.onerror = function(event) {
        console.error("Ovozli diktat xatosi:", event.error);
        if (event.error === 'not-allowed') {
            alert("Mikrofonga ruxsat berilmagan! Iltimos, brauzer sozlamalaridan ruxsat bering.");
        }
        stopDictation();
    };

    speechRec.onend = function() {
        // Если движок сам остановился (из-за тишины), но мы не выключали его вручную — перезапускаем
        if (isDictating) {
            try { speechRec.start(); } catch(e) { stopDictation(); }
        } else {
            stopDictation();
        }
    };
    
    return true;
}

window.toggleDictation = function() {
    if (!speechRec) {
        const initialized = initSpeechRecognition();
        if (!initialized) return;
    }

    if (isDictating) {
        // Если микрофон включен - выключаем
        isDictating = false;
        speechRec.stop();
        stopDictation();
    } else {
        // Если выключен - включаем
        try {
            // === МАШИНА ВРЕМЕНИ (MATN TARIXI) - Делаем снимок перед диктовкой ===
            if (typeof saveTimeMachineSnapshot === "function") saveTimeMachineSnapshot(true);
            
            speechRec.start();
        } catch (e) {
            console.error("Dictation start error:", e);
        }
    }
};

function stopDictation() {
    isDictating = false;
    const btn = document.getElementById("dictationBtn");
    const tooltip = document.getElementById("dictationTooltip");
    if (btn) btn.classList.remove("recording");
    if (tooltip) tooltip.textContent = "Ovozni matnga ögiriş";
    if (typeof showAutosaveIndicator === "function") showAutosaveIndicator("Mikrofon öçirildi");
}


// Закрытие бургер-меню при клике мимо него
document.addEventListener('click', (e) => {
    const menu = document.getElementById('mobileMenuLinks');
    const burgerBtn = document.querySelector('.mobile-burger-btn');
    if (menu && menu.classList.contains('active')) {
        if (!menu.contains(e.target) && (!burgerBtn || !burgerBtn.contains(e.target))) {
            menu.classList.remove('active');
        }
    }
});

// ==========================================
// === УПРАВЛЕНИЕ МОБИЛЬНЫМИ МЕНЮ И OVERLAY ===
// ==========================================
function toggleMobileMenuOverlay(isOpen) {
    if (window.innerWidth > 768) return;
    const overlay = document.getElementById('mobileMenuOverlay');
    if (overlay) {
        if (isOpen) {
            overlay.classList.add('open');
        } else {
            overlay.classList.remove('open');
        }
    }
}

window.closeAllMobileMenus = function() {
    document.querySelectorAll('.nav-item.has-dropdown').forEach(el => el.classList.remove('open'));
    document.querySelectorAll('.editor-tools-wrap').forEach(el => el.classList.remove('open'));
    document.querySelectorAll('.editor-ai-wrap').forEach(el => el.classList.remove('open'));
    toggleMobileMenuOverlay(false);
};

// Привязываем overlay к вашим существующим функциям
const originalToggleNavDropdown = window.toggleNavDropdown;
window.toggleNavDropdown = function(itemId, event) {
    if (originalToggleNavDropdown) originalToggleNavDropdown(itemId, event);
    const target = document.getElementById(itemId);
    toggleMobileMenuOverlay(target && target.classList.contains('open'));
};

const originalToggleEditorToolsMenu = window.toggleEditorToolsMenu;
window.toggleEditorToolsMenu = function(event) {
    if (originalToggleEditorToolsMenu) originalToggleEditorToolsMenu(event);
    const wrap = document.getElementById("editorToolsWrap");
    toggleMobileMenuOverlay(wrap && wrap.classList.contains('open'));
};

const originalToggleAiMenu = window.toggleAiMenu;
window.toggleAiMenu = function(event) {
    if (originalToggleAiMenu) originalToggleAiMenu(event);
    const wrap = document.getElementById("editorAiWrap");
    toggleMobileMenuOverlay(wrap && wrap.classList.contains('open'));
};

// ==========================================
// === ИНТЕГРАЦИЯ ФАЙЛОВ С БОТОМ ÖŞA ===
// ==========================================
window.sendFileToOsha = function() {
    const text = (window.extractedFileText || "").trim();
    if (!text) {
        alert("Fayl içida matn topilmadi!");
        return;
    }
    // Получаем оригинальное имя файла
    let fName = typeof processedOutName !== 'undefined' ? processedOutName.replace("_yangi", "") : "Hujjat";
    
    // Вызываем функцию внутри виджета Öşa
    if (typeof window.triggerOshaFileMode === 'function') {
        window.triggerOshaFileMode(text, fName);
    } else {
        alert("Öşa yordamçisi hozirça işga tuşmadi.");
    }
};

// ХАК: Чтобы кнопка появлялась после загрузки файла
document.addEventListener('change', function(e) {
    if (e.target && e.target.id === 'fileInput') {
        setTimeout(() => {
            const oshaBtn = document.getElementById('sendToOshaBtn');
            const saveBtn = document.getElementById('saveBtn');
            // Если файл успешно обработан (появилась кнопка Saqlaş), показываем и нашу кнопку
            if (oshaBtn && saveBtn && saveBtn.style.display !== 'none') {
                oshaBtn.style.display = 'inline-flex';
            }
        }, 1500); // Ждем завершения конвертации
    }
});


// ==========================================
// === УПРАВЛЕНИЕ МЕНЮ СОХРАНЕНИЯ ФАЙЛА ===
// ==========================================
window.toggleFileSaveMenu = function(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    const wrap = document.getElementById("fileSaveMenuWrap");
    if (wrap) {
        const isOpen = wrap.classList.toggle("open");
        
        // Для мобильной версии (если у нас подключен overlay)
        if (typeof toggleMobileMenuOverlay === 'function') {
            toggleMobileMenuOverlay(isOpen);
        }
    }
};

window.closeFileSaveMenu = function() {
    const wrap = document.getElementById("fileSaveMenuWrap");
    if (wrap) wrap.classList.remove("open");
    if (typeof toggleMobileMenuOverlay === 'function') {
        toggleMobileMenuOverlay(false);
    }
};

// Закрываем меню при клике в пустое место
document.addEventListener("click", (e) => {
    const wrap = document.getElementById("fileSaveMenuWrap");
    if (wrap && !wrap.contains(e.target)) {
        closeFileSaveMenu();
    }
});

// Закрываем меню по клавише ESC
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        closeFileSaveMenu();
    }
});


// Автоматический фикс темной темы для вкладок уведомлений
function fixNotifyDarkTheme() {
    const isDark = document.documentElement.classList.contains('dark-theme') || 
                   document.body.classList.contains('dark-theme') || 
                   document.documentElement.getAttribute('data-theme') === 'dark' ||
                   document.body.getAttribute('data-theme') === 'dark' ||
                   document.documentElement.classList.contains('dark') ||
                   document.body.classList.contains('dark');

    const tabsWrap = document.querySelector('.notify-tabs');
    const tabs = document.querySelectorAll('.notify-tab');

    if (isDark) {
        if (tabsWrap) {
            tabsWrap.style.background = 'rgba(255, 255, 255, 0.08)';
            tabsWrap.style.border = '1px solid rgba(255, 255, 255, 0.1)';
        }
        tabs.forEach(t => {
            if (t.classList.contains('active')) {
                t.style.background = '#1E293B'; // Тот самый темный "кирпичик"
                t.style.color = '#FFFFFF';
                t.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5)';
            } else {
                t.style.background = 'transparent';
                t.style.color = '#94A3B8';
            }
        });
    }
}

// Запускаем при открытии уведомлений и при клике на вкладки
document.addEventListener('click', (e) => {
    if (e.target.closest('#notifyToggleBtn') || e.target.closest('.notify-tab')) {
        setTimeout(fixNotifyDarkTheme, 10);
    }
});


// ==========================================
// === ЛОГИКА КОНСТРУКТОРА РАСПИСАНИЙ (ШАХМАТКА) ===
// ==========================================
const SCHEDULER_STORAGE_KEY = "ulh_scheduler_data_v1";

let scheduleData = JSON.parse(localStorage.getItem(SCHEDULER_STORAGE_KEY)) || [
    { id: "1", title: "Ma'ruza: Algoritmlar", meta: "Aud. 402 • Vaxobov T.", type: "lecture", slot: "09:00 - 10:30", stream: "streamA" },
    { id: "2", title: "Workshop: React & Vite", meta: "Kompyuter xona • Faxriy mehmon", type: "workshop", slot: "10:45 - 12:15", stream: "streamB" }
];

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('scheduler-toggle-btn');
    const modal = document.getElementById('scheduler-modal');
    const closeBtn = document.getElementById('scheduler-close-btn');

    if (modal && closeBtn) {
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                openSchedulerModal(e);
            });
        }
        closeBtn.addEventListener('click', () => modal.classList.remove('open'));
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('open');
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('open')) modal.classList.remove('open');
        });
    }
});

window.openSchedulerModal = function(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    document.querySelectorAll('.nav-item.has-dropdown').forEach(el => el.classList.remove('open'));
    
    const modal = document.getElementById('scheduler-modal');
    if (modal) {
        modal.classList.add('open');
        if (typeof renderSchedulerGrid === 'function') {
            renderSchedulerGrid();
        }
    }
};

window.addSchedulerBlock = function() {
    const title = document.getElementById('sch-title').value.trim();
    const meta = document.getElementById('sch-meta').value.trim();
    const type = document.getElementById('sch-type').value;
    let slot = document.getElementById('sch-slot').value.trim();
    const stream = document.getElementById('sch-stream').value;

    if (!title) {
        alert("Iltimos, dars yoki tadbir nomini kiriting!");
        return;
    }

    if (!slot) {
        slot = "Belgilanmagan";
    }

    // Проверка на временной конфликт в том же потоке
    const conflict = scheduleData.find(item => item.slot.toLowerCase() === slot.toLowerCase() && item.stream === stream);
    const statusBox = document.getElementById('schStatusBox');

    if (conflict) {
        if (statusBox) {
            statusBox.className = "status-box warning";
            statusBox.textContent = `⚠ Diqqat! Bu vaqtda (${slot}) uşbu oqimda allaqaçon "${conflict.title}" band!`;
        }
    } else {
        if (statusBox) {
            statusBox.className = "status-box";
            statusBox.textContent = "✓ Vaqt böyiça ziddiyatlar aniqlanmadi.";
        }
    }

    scheduleData.push({ id: Date.now().toString(), title, meta, type, slot, stream });
    localStorage.setItem(SCHEDULER_STORAGE_KEY, JSON.stringify(scheduleData));

    document.getElementById('sch-title').value = '';
    document.getElementById('sch-meta').value = '';
    document.getElementById('sch-slot').value = '';
    renderSchedulerGrid();
};

window.deleteSchedulerBlock = function(id) {
    scheduleData = scheduleData.filter(item => item.id !== id);
    localStorage.setItem(SCHEDULER_STORAGE_KEY, JSON.stringify(scheduleData));
    renderSchedulerGrid();
};

function renderSchedulerGrid() {
    const tbody = document.getElementById('schGridBody');
    if (!tbody) return;

    // Собираем все уникальные таймслоты из данных + дефолтные на случай пустого списка
    let slots = [...new Set(scheduleData.map(item => item.slot))];
    if (slots.length === 0) {
        slots = ["09:00 - 10:30"];
    }

    tbody.innerHTML = "";

    slots.forEach(slot => {
        const tr = document.createElement('tr');
        
        let html = `<td style="border: 1px solid #cbd5e1; padding: 8px; font-weight: 700; font-size: 11.5px;">${slot}</td>`;
        
        ['streamA', 'streamB', 'hall'].forEach(stream => {
            const item = scheduleData.find(d => d.slot === slot && d.stream === stream);
            if (item) {
                html += `
                    <td style="border: 1px solid #cbd5e1; padding: 6px; position: relative;">
                        <div class="grid-cell-block ${item.type}">
                            <div style="font-weight: 800; margin-bottom: 2px;">${item.title}</div>
                            <div style="font-size: 10px; opacity: 0.85;">${item.meta}</div>
                            <button onclick="deleteSchedulerBlock('${item.id}')" style="position: absolute; top: 4px; right: 4px; background: none; border: none; color: inherit; cursor: pointer; font-weight: bold; font-size: 13px;" title="Öçiriş">×</button>
                        </div>
                    </td>
                `;
            } else {
                html += `<td style="border: 1px solid #cbd5e1; padding: 8px; color: #94a3b8; font-size: 12px;">—</td>`;
            }
        });

        tr.innerHTML = html;
        tbody.appendChild(tr);
    });
}

// Экспорт расписания в PDF (только сетка, всегда в светлой теме)
window.exportSchedulerToPdf = async function() {
    const modalContent = document.querySelector('.scheduler-wrapper');
    if (!modalContent || !window.jspdf || typeof html2canvas !== "function") return;

    if (typeof showAutosaveIndicator === "function") showAutosaveIndicator("PDF tayyorlanmoqda...");

    // 1. Ищем левую панель и кнопку экспорта, чтобы скрыть их на фото
    const columnsContainer = modalContent.children[1];
    const leftPanel = columnsContainer ? columnsContainer.children[0] : null;
    const exportBtn = modalContent.querySelector('button[onclick="exportSchedulerToPdf()"]');
    
    // 2. Запоминаем, была ли включена темная тема
    const isDarkMode = document.body.classList.contains('dark-mode');

    try {
        // --- ПОДГОТОВКА К ЭКСПОРТУ (МАГИЯ) ---
        // Временно отключаем темную тему, чтобы PDF всегда был светлым
        if (isDarkMode) document.body.classList.remove('dark-mode');
        
        // Прячем левую панель ввода и саму кнопку PDF
        if (leftPanel) leftPanel.style.display = 'none';
        if (exportBtn) exportBtn.style.display = 'none';

        // Даем браузеру 50 миллисекунд, чтобы применить стили перед скриншотом
        await new Promise(resolve => setTimeout(resolve, 50));

        // --- ГЕНЕРАЦИЯ PDF ---
        const { jsPDF } = window.jspdf;
        const canvas = await html2canvas(modalContent, { 
            scale: 2, 
            backgroundColor: "#FFFFFF", 
            logging: false 
        });
        
        const pdf = new jsPDF({ orientation: "l", unit: "mm", format: "a4", compress: true });
        
        const pageWidthMm = 297;
        const pageHeightMm = 210;
        const imgData = canvas.toDataURL("image/jpeg", 0.96);
        
        // Рассчитываем пропорции (с отступами)
        const imgWidth = pageWidthMm - 20;
        const imgHeight = (canvas.height / canvas.width) * imgWidth;
        const renderedHeightMm = Math.min(pageHeightMm - 20, imgHeight);
        
        pdf.addImage(imgData, "JPEG", 10, 10, imgWidth, renderedHeightMm, undefined, "FAST");
        pdf.save("akademik_shaxmatka.pdf");

        if (typeof showAutosaveIndicator === "function") showAutosaveIndicator("PDF yuklab olindi ✓");
        
    } catch (e) {
        console.error("PDF export error:", e);
        alert("PDF eksport qilişda xatolik yuz berdi.");
    } finally {
        // --- ВОЗВРАТ ИНТЕРФЕЙСА (ОБЯЗАТЕЛЬНО) ---
        // В блоке finally мы гарантированно возвращаем всё на место, даже если была ошибка
        if (isDarkMode) document.body.classList.add('dark-mode');
        if (leftPanel) leftPanel.style.display = '';
        if (exportBtn) exportBtn.style.display = '';
    }
};

// ==========================================
// === ИЗМЕНЕНИЕ ВЫСОТЫ ОКНА ЧАТА ÖŞA AI ===
// ==========================================
// Высота хранится в CSS-переменной --osha-chat-h (её читает style.css),
// поэтому !important в стилях больше не мешает. Работает на ПК и телефонах.
document.addEventListener('DOMContentLoaded', () => {
    const chat = document.getElementById('osha-chat');
    if (!chat || chat.querySelector('.osha-resize-handle')) return;

    const KEY = 'ulh_osha_chat_height_v2';
    const MIN_H = 320;       // минимальная высота, px
    const DEFAULT_H = 520;   // «обычная» высота (как в CSS)
    const TOP_GAP = 16;      // отступ от верхнего края экрана, px

    const maxH = () => {
        const bottom = parseFloat(getComputedStyle(chat).bottom) || 105;
        return Math.max(MIN_H, window.innerHeight - bottom - TOP_GAP);
    };
    const clamp = (h) => Math.round(Math.min(Math.max(h, MIN_H), maxH()));
    const setH = (h) => { const v = clamp(h); chat.style.setProperty('--osha-chat-h', v + 'px'); return v; };
    const save = (h) => { try { localStorage.setItem(KEY, String(h)); } catch (e) {} };

    let prefH = null; // высота, выбранная пользователем

    // Ручка
    const handle = document.createElement('div');
    handle.className = 'osha-resize-handle';
    handle.title = 'Balandlikni özgartiriş uchun torting (ikki marta bosiş — maksimum)';
    handle.setAttribute('role', 'separator');
    handle.setAttribute('aria-orientation', 'horizontal');
    handle.setAttribute('aria-label', 'Çat oynasi balandligi');
    handle.tabIndex = 0;
    handle.innerHTML = '<div class="osha-resize-pill"></div>';
    chat.insertBefore(handle, chat.firstChild);

    let dragging = false, moved = false, startY = 0, startH = 0, lastTap = 0;

    handle.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();
        dragging = true;
        moved = false;
        startY = e.clientY;
        startH = chat.offsetHeight; // offsetHeight не зависит от transform: scale
        try { handle.setPointerCapture(e.pointerId); } catch (err) {}
        chat.classList.add('is-resizing');
        document.body.classList.add('osha-resizing');
    });

    handle.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const dy = startY - e.clientY; // тянем вверх — окно выше
        if (Math.abs(dy) > 3) moved = true;
        prefH = setH(startH + dy);
    });

    const endDrag = (e) => {
        if (!dragging) return;
        dragging = false;
        try { handle.releasePointerCapture(e.pointerId); } catch (err) {}
        chat.classList.remove('is-resizing');
        document.body.classList.remove('osha-resizing');

        if (moved) { if (prefH) save(prefH); return; }

        // Двойной клик / двойной тап: максимум <-> обычная высота
        const now = Date.now();
        if (now - lastTap < 350) {
            const target = (maxH() - chat.offsetHeight > 40) ? maxH() : DEFAULT_H;
            prefH = setH(target);
            save(prefH);
            lastTap = 0;
        } else {
            lastTap = now;
        }
    };
    handle.addEventListener('pointerup', endDrag);
    handle.addEventListener('pointercancel', endDrag);

    // Клавиатура: стрелки вверх/вниз
    handle.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
        e.preventDefault();
        prefH = setH(chat.offsetHeight + (e.key === 'ArrowUp' ? 24 : -24));
        save(prefH);
    });

    // Восстанавливаем сохранённую высоту
    try {
        const saved = parseInt(localStorage.getItem(KEY), 10);
        if (Number.isFinite(saved)) prefH = setH(saved);
    } catch (e) {}

    // При изменении размера окна браузера — не даём чату вылезти за экран
    window.addEventListener('resize', () => { if (prefH) setH(prefH); });
});

// ==========================================
// === 41. KUNLIK MAŞQ (GEYMIFIKATSIYA) ===
// ==========================================
// Kun sözi + kunlik topşiriq + seriya + XP + nişonlar.
// Hammasi brauzerda (localStorage) saqlanadi, serverga hech narsa yuborilmaydi.
// Lotincha yozilişlar mavjud cyrillicToLatin() orqali avtomatik hosil qilinadi,
// shuning uçun saytdagi konvertor qoidalari bilan doim mos tüşadi.
(function () {
    'use strict';

    const STORE_KEY = 'ulh_game_v1';
    const XP_PER_LEVEL = 120;
    const CORE_LETTERS = ['ö', 'ğ', 'ş', 'ç'];

    // [kirill so'z, kirill izoh] — lotincha avtomatik hosil qilinadi
    const WORDS = [
        ['ўқитувчи', 'Мактабда болаларга билим берадиган инсон'],
        ['ғалаба', 'Мусобақа ёки курашда қўлга киритилган ютуқ'],
        ['шаҳар', 'Кўп одам яшайдиган катта жой'],
        ['чироқ', 'Хонани ёритадиган нарса'],
        ['қалам', 'Ёзиш ва чизиш учун асбоб'],
        ['мактаб', 'Болалар таълим оладиган жой'],
        ['китоб', 'Саҳифаларга битилган асар'],
        ['ҳаво', 'Нафас оладиган муҳит'],
        ['оқшом', 'Кун ботган пайт, кечки вақт'],
        ['ёмғир', 'Булутдан томчи бўлиб ёғадиган сув'],
        ['қуёш', 'Ерга нур ва иссиқлик берадиган юлдуз'],
        ['дўст', 'Ишончли ва яқин одам'],
        ['тоғ', 'Ер юзининг баланд қисми'],
        ['дарё', 'Катта оқар сув'],
        ['бозор', 'Савдо қиладиган жой'],
        ['мева', 'Дарахтда пишадиган ширин егулик'],
        ['чой', 'Қайнатиб ичиладиган ичимлик'],
        ['шоир', 'Шеър ёзадиган ижодкор'],
        ['ҳикоя', 'Қисқа бадиий асар'],
        ['қўшиқ', 'Куйлаб айтиладиган асар'],
        ['ўйин', 'Қувноқ машғулот'],
        ['чақалоқ', 'Янги туғилган бола'],
        ['ҳунар', 'Қўл меҳнатига асосланган касб'],
        ['ўрмон', 'Дарахтлар кўп ўсадиган жой'],
        ['Тошкент', 'Ўзбекистоннинг пойтахти'],
        ['ёзув', 'Ҳарфлар ёрдамида фикрни ифодалаш'],
        ['ҳарф', 'Ёзувдаги белги'],
        ['алифбо', 'Ҳарфлар тизими'],
        ['маъно', 'Сўзнинг мазмуни'],
        ['шеър', 'Ритмик ва қофиядор асар'],
        ['эълон', 'Ҳамма билиши учун айтилган хабар'],
        ['санъат', 'Гўзал асар яратиш маҳорати'],
        ['шамол', 'Ҳавонинг ҳаракати'],
        ['баҳор', 'Йилнинг биринчи фасли'],
        ['юлдуз', 'Осмонда ярқираб турадиган нур'],
        ['яхши', 'Ёмоннинг акси'],
        ['ғор', 'Тоғдаги катта бўшлиқ'],
        ['чегара', 'Икки давлат орасидаги чизиқ'],
        ['қишлоқ', 'Кичик аҳоли манзили'],
        ['ўрик', 'Сариқ ширин мева'],
        ['анор', 'Қизил донли мева'],
        ['дарахт', 'Мева ва соя берадиган ўсимлик'],
        ['чизғич', 'Тўғри чизиқ чизиш асбоби'],
        ['қўғирчоқ', 'Болалар ўйинчоғи'],
        ['ғўза', 'Пахта ўсимлиги'],
        ['чўл', 'Қумли кенг ҳудуд'],
        ['ҳовли', 'Уй олдидаги очиқ жой'],
        ['ёнғоқ', 'Қаттиқ пўчоқли мағиз'],
        ['гўзал', 'Кўркам ва чиройли'],
        ['тўй', 'Оилавий қувноқ байрам'],
        ['қўшни', 'Ёнингиздаги уйда яшайдиган киши'],
        ['ўғил', 'Эркак фарзанд'],
        ['шўрва', 'Суюқ иссиқ таом'],
        ['ҳайвон', 'Тирик мавжудот'],
        ['ўқиш', 'Матнни ўзлаштириш жараёни'],
        ['Ўзбекистон', 'Ватанимиз'],
        ['ҳосил', 'Экилган экиннинг натижаси'],
        ['қанот', 'Қушнинг учиш аъзоси'],
        ['чумоли', 'Меҳнаткаш кичик ҳашарот'],
        ['ширинлик', 'Ширин таом ёки егулик'],
        ['ғишт', 'Девор қуриладиган тайёр бўлак'],
        ['қизғалдоқ', 'Баҳорда ўсадиган қизил гул'],
        ['ёрдам', 'Бировга қилинган яхшилик'],
        ['қўл', 'Инсоннинг ушлаш аъзоси'],
        ['тил', 'Мулоқот воситаси'],
        ['дафтар', 'Ёзиш учун саҳифалар'],
        ['чорва', 'Уй ҳайвонлари'],
        ['шер', 'Ёввойи йиртқич']
    ];

    // Harf juftliklari (lotin <-> kirill) + chalg'ituvçi variantlar
    const LETTERS = [
        { lat: 'Ö', cyr: 'Ў', dLat: ['O', 'U', 'Ğ'], dCyr: ['О', 'У', 'Ғ'] },
        { lat: 'Ğ', cyr: 'Ғ', dLat: ['G', 'Ö', 'Q'], dCyr: ['Г', 'Ў', 'Қ'] },
        { lat: 'Ş', cyr: 'Ш', dLat: ['S', 'Ç', 'X'], dCyr: ['С', 'Ч', 'Х'] },
        { lat: 'Ç', cyr: 'Ч', dLat: ['C', 'Ş', 'S'], dCyr: ['Ц', 'Ш', 'С'] },
        { lat: 'Q', cyr: 'Қ', dLat: ['K', 'G', 'X'], dCyr: ['К', 'Г', 'Х'] },
        { lat: 'H', cyr: 'Ҳ', dLat: ['X', 'G', 'Ğ'], dCyr: ['Х', 'Г', 'Ғ'] },
        { lat: 'X', cyr: 'Х', dLat: ['H', 'Ş', 'K'], dCyr: ['Ҳ', 'Ш', 'К'] },
        { lat: 'J', cyr: 'Ж', dLat: ['Z', 'Ç', 'Y'], dCyr: ['З', 'Ч', 'Й'] },
        { lat: 'Y', cyr: 'Й', dLat: ['J', 'I', 'Ö'], dCyr: ['Ж', 'И', 'Ў'] }
    ];

    const TIPS = { 'ў': 'ö', 'ғ': 'ğ', 'ш': 'ş', 'ч': 'ç', 'қ': 'q', 'ҳ': 'h', 'х': 'x', 'ъ': '’', 'ё': 'yo', 'ю': 'yu', 'я': 'ya', 'й': 'y', 'ж': 'j' };

    const LEVEL_TITLES = ['Yangi boşlovçi', 'Izlanuvçi', 'Bilimdon', 'Alifbo ustasi', 'Mutaxassis', 'Ustoz'];
    const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
    const WEEKDAYS = ['Yakşanba', 'Duşanba', 'Seşanba', 'Çorşanba', 'Payşanba', 'Juma', 'Şanba'];

    const BADGES = [
        { id: 'first',      icon: '🌱', title: 'Birinçi qadam',     desc: 'Birinçi kunlik topşiriqni bajardingiz',     ok: s => Object.keys(s.history).length >= 1 },
        { id: 'streak3',    icon: '🔥', title: '3 kunlik seriya',   desc: 'Ketma-ket 3 kun maşq qildingiz',            ok: s => s.best >= 3 },
        { id: 'streak7',    icon: '⚡', title: 'Haftalik seriya',   desc: 'Ketma-ket 7 kun',                           ok: s => s.best >= 7 },
        { id: 'streak30',   icon: '👑', title: 'Oylik seriya',      desc: 'Ketma-ket 30 kun',                          ok: s => s.best >= 30 },
        { id: 'perfect',    icon: '🏆', title: 'Mukammal natija',   desc: 'Topşiriqda 5/5 töğri javob',                ok: s => s.perfect >= 1 },
        { id: 'learn10',    icon: '📚', title: 'Sözlar xazinasi',   desc: '10 ta söz örgandingiz',                     ok: s => s.learned.length >= 10 },
        { id: 'alphabet',   icon: '🔤', title: 'Alifbo ustasi',     desc: 'Ö, Ğ, Ş, Ç harflarini mustahkamladingiz',   ok: s => CORE_LETTERS.every(k => (s.letters[k] || 0) >= 5) },
        { id: 'correct100', icon: '🎯', title: '100 ta töğri javob', desc: 'Jami 100 ta töğri javob berdingiz',        ok: s => s.correct >= 100 },
        { id: 'quiz',       icon: '🧠', title: 'Viktorina ustasi',  desc: 'Viktorinada 100% natija',                   ok: s => s.quizPerfect >= 1 }
    ];

    const FLAME_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>';

    // ---------- yordamçi funksiyalar ----------
    const pad = n => String(n).padStart(2, '0');
    const dayOffset = () => (window.__ulhDayOffset || 0);
    const now = () => new Date(Date.now() + dayOffset() * 86400000);
    const todayKey = () => { const d = now(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
    const keyToDays = k => { const p = k.split('-').map(Number); return Math.floor(Date.UTC(p[0], p[1] - 1, p[2]) / 86400000); };
    const toLat = s => (typeof cyrillicToLatin === 'function' ? cyrillicToLatin(s) : s);

    function mulberry32(a) {
        return function () {
            a |= 0; a = a + 0x6D2B79F5 | 0;
            let t = Math.imul(a ^ a >>> 15, 1 | a);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }
    function shuffle(arr, rnd) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(rnd() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    // ---------- saqlash ----------
    const defaultState = () => ({
        xp: 0, streak: 0, best: 0, lastDone: null, history: {},
        learned: [], correct: 0, perfect: 0, letters: {}, badges: {},
        quizXp: { day: '', xp: 0 }, quizPerfect: 0
    });
    function load() {
        try {
            const s = JSON.parse(localStorage.getItem(STORE_KEY));
            return Object.assign(defaultState(), s && typeof s === 'object' ? s : {});
        } catch (e) { return defaultState(); }
    }
    let state = load();
    function save() {
        try {
            const keys = Object.keys(state.history).sort();
            while (keys.length > 60) delete state.history[keys.shift()];
            localStorage.setItem(STORE_KEY, JSON.stringify(state));
        } catch (e) { /* private mode — jim */ }
    }

    // ---------- daraja / seriya ----------
    const levelOf = xp => Math.floor(xp / XP_PER_LEVEL) + 1;
    const levelTitle = lv => LEVEL_TITLES[Math.min(lv - 1, LEVEL_TITLES.length - 1)];
    function currentStreak() {
        if (!state.lastDone) return 0;
        return (keyToDays(todayKey()) - keyToDays(state.lastDone) <= 1) ? state.streak : 0;
    }
    const isDoneToday = () => !!state.history[todayKey()];

    // ---------- kun sözi ----------
    const wordIndexFor = days => ((days % WORDS.length) + WORDS.length) % WORDS.length;
    function tipsFor(cyr) {
        const seen = [];
        cyr.toLowerCase().split('').forEach(ch => { if (TIPS[ch] && !seen.includes(ch)) seen.push(ch); });
        return seen.slice(0, 5).map(ch => ch.toUpperCase() + ' → ' + TIPS[ch]);
    }

    // ---------- savollar ----------
    const MUT = [['ö', 'o'], ['ö', 'u'], ['ö', 'o’'], ['ğ', 'g'], ['ğ', 'g’'], ['ş', 'sh'], ['ş', 's'], ['ç', 'ch'], ['ç', 'c'],
        ['q', 'k'], ['q', 'g'], ['h', 'x'], ['x', 'h'], ['’', ''], ['y', 'j'], ['Ö', 'O'], ['Ş', 'Sh'], ['Ç', 'Ch'], ['Ğ', 'G'],
        ['yo', 'o'], ['ya', 'a'], ['yu', 'u'], ['ye', 'e']];
    const FALLBACK = { a: 'o', o: 'a', i: 'e', e: 'i', u: 'o', k: 'q', d: 't', t: 'd', b: 'p', z: 's', s: 'z', r: 'l', l: 'r', n: 'm', m: 'n', g: 'k' };

    function wrongVariants(lat, rnd) {
        const set = new Set();
        MUT.forEach(([a, b]) => {
            const i = lat.indexOf(a);
            if (i > -1) { const v = lat.slice(0, i) + b + lat.slice(i + a.length); if (v !== lat && v) set.add(v); }
        });
        const arr = shuffle(Array.from(set), rnd);
        let guard = 0;
        while (arr.length < 3 && guard++ < 60) {
            const i = Math.floor(rnd() * lat.length);
            const rep = FALLBACK[lat[i]];
            if (rep) { const v = lat.slice(0, i) + rep + lat.slice(i + 1); if (v !== lat && !arr.includes(v)) arr.push(v); }
        }
        return arr;
    }
    const coreIn = lat => CORE_LETTERS.filter(k => lat.toLowerCase().indexOf(k) > -1);

    function qWord(wi, rnd) {
        const cyr = WORDS[wi][0], lat = toLat(cyr);
        const opts = shuffle([lat].concat(wrongVariants(lat, rnd).slice(0, 3)), rnd);
        const tips = tipsFor(cyr);
        return {
            prompt: '«' + cyr + '» sözi yangi lotinda qanday yoziladi?',
            options: opts, correct: opts.indexOf(lat),
            explain: 'Töğri yozilişi: ' + lat + (tips.length ? '  ·  ' + tips.join(', ') : ''),
            letters: coreIn(lat)
        };
    }
    function qLetter(rnd, avoidIdx) {
        let idx;
        do {
            idx = rnd() < 0.7 ? Math.floor(rnd() * 4) : Math.floor(rnd() * LETTERS.length);
        } while (idx === avoidIdx);
        const L = LETTERS[idx];
        const forward = rnd() < 0.5;
        const correctText = forward ? L.lat : L.cyr;
        const opts = shuffle([correctText].concat(forward ? L.dLat : L.dCyr), rnd);
        return {
            prompt: forward
                ? 'Kirill «' + L.cyr + '» harfi yangi lotinda qaysi belgiga mos?'
                : 'Lotin «' + L.lat + '» belgisi qaysi kirill harfiga mos?',
            options: opts, correct: opts.indexOf(correctText),
            explain: L.cyr + ' ↔ ' + L.lat,
            letters: CORE_LETTERS.indexOf(L.lat.toLowerCase()) > -1 ? [L.lat.toLowerCase()] : [],
            _idx: idx
        };
    }
    function qFindError(pick, rnd) {
        const ids = [pick(), pick(), pick(), pick()];
        const lats = ids.map(i => toLat(WORDS[i][0]));
        const badPos = Math.floor(rnd() * 4);
        const wrong = wrongVariants(lats[badPos], rnd)[0];
        const opts = lats.slice();
        opts[badPos] = wrong;
        return {
            prompt: 'Qaysi söz xato yozilgan?',
            options: opts, correct: badPos,
            explain: 'Xato yozilgan: ' + wrong + '  ·  töğrisi: ' + lats[badPos],
            letters: []
        };
    }
    function buildTask(key) {
        const days = keyToDays(key);
        const rnd = mulberry32(days * 7919 + 13);
        const wi = wordIndexFor(days);
        const used = new Set([wi]);
        const pick = () => { let i; do { i = Math.floor(rnd() * WORDS.length); } while (used.has(i)); used.add(i); return i; };
        const q2 = qLetter(rnd, -1);
        return [
            qWord(wi, rnd),
            q2,
            qWord(pick(), rnd),
            qFindError(pick, rnd),
            qLetter(rnd, q2._idx)
        ];
    }

    // ---------- nişonlar ----------
    function evalBadges() {
        const fresh = [];
        BADGES.forEach(b => {
            if (!state.badges[b.id] && b.ok(state)) { state.badges[b.id] = todayKey(); fresh.push(b); }
        });
        return fresh;
    }

    // ---------- toast ----------
    function toast(html) {
        let box = document.getElementById('gmToastBox');
        if (!box) { box = document.createElement('div'); box.id = 'gmToastBox'; document.body.appendChild(box); }
        const t = document.createElement('div');
        t.className = 'gm-toast';
        t.innerHTML = html;
        box.appendChild(t);
        requestAnimationFrame(() => t.classList.add('show'));
        setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3400);
    }
    function announceBadges(list) {
        list.forEach((b, i) => setTimeout(() => toast('<span class="gm-toast-ico">' + b.icon + '</span><span><b>Yangi nişon!</b><br>' + b.title + '</span>'), 400 + i * 900));
    }

    // ---------- nav tugmasi ----------
    function refreshNav() {
        const btn = document.getElementById('gmNavBtn');
        const num = document.getElementById('gmNavStreak');
        if (num) num.textContent = currentStreak();
        if (btn) btn.classList.toggle('gm-pending', !isDoneToday());
    }

    // ---------- UI ----------
    let view = 'home', task = null, qi = 0, answers = [], lastResult = null;
    const body = () => document.getElementById('gmBody');

    function dateLabel() {
        const d = now();
        return WEEKDAYS[d.getDay()] + ', ' + d.getDate() + '-' + MONTHS[d.getMonth()];
    }

    function renderHome() {
        const key = todayKey();
        const days = keyToDays(key);
        const wi = wordIndexFor(days);
        const cyr = WORDS[wi][0], lat = toLat(cyr), mean = toLat(WORDS[wi][1]);
        const streak = currentStreak();
        const lv = levelOf(state.xp);
        const inLv = state.xp % XP_PER_LEVEL;
        const pct = Math.round(inLv / XP_PER_LEVEL * 100);
        const learned = state.learned.indexOf(wi) > -1;
        const done = state.history[key];

        let streakNote = '';
        if (!done) {
            if (streak > 0) streakNote = 'Seriyani saqlab qoliş uçun bugungi topşiriqni bajaring!';
            else if (state.streak > 0) streakNote = 'Seriya uzilgan — bugun yangidan boşlang!';
        }

        const tips = tipsFor(cyr).map(t => '<span class="gm-chip">' + t + '</span>').join('');

        const badgesHtml = BADGES.map(b => {
            const got = state.badges[b.id];
            return '<div class="gm-badge' + (got ? ' got' : '') + '" title="' + b.desc + '">' +
                '<div class="gm-badge-ico">' + (got ? b.icon : '🔒') + '</div>' +
                '<div class="gm-badge-t">' + b.title + '</div>' +
                '<div class="gm-badge-d">' + b.desc + '</div></div>';
        }).join('');

        const taskCard = done
            ? '<div class="gm-done"><div class="gm-done-ico">✓</div><div><div class="gm-done-t">Bugungi topşiriq bajarildi: ' + done.score + '/' + done.total + '</div>' +
              '<div class="gm-done-s">Ertaga yangi topşiriq böladi.</div></div></div>'
            : '<div class="gm-task-row"><div><div class="gm-task-t">5 ta savol · taxminan 1 daqiqa</div>' +
              (streakNote ? '<div class="gm-task-note">' + streakNote + '</div>' : '<div class="gm-task-s">Söz yozilişi, harflar va xatolarni topiş</div>') +
              '</div><button type="button" class="pill-btn gm-start" onclick="ULHGame.start()">Boşlaş</button></div>';

        body().innerHTML =
            '<div class="gm-hero">' +
              '<div class="gm-hero-top"><span class="gm-tag">KUNLIK MAŞQ</span><span class="gm-date">' + dateLabel() + '</span></div>' +
              '<div class="gm-stats">' +
                '<div class="gm-stat gm-stat-fire"><div class="gm-stat-num">' + FLAME_SVG + '<span>' + streak + '</span></div><div class="gm-stat-lbl">kunlik seriya</div></div>' +
                '<div class="gm-stat"><div class="gm-stat-num">' + state.xp + '</div><div class="gm-stat-lbl">tajriba (XP)</div></div>' +
                '<div class="gm-stat"><div class="gm-stat-num">' + lv + '</div><div class="gm-stat-lbl">' + levelTitle(lv) + '</div></div>' +
              '</div>' +
              '<div class="gm-bar"><div class="gm-bar-fill" style="width:' + pct + '%"></div></div>' +
              '<div class="gm-bar-cap">Keyingi darajagaçha: ' + (XP_PER_LEVEL - inLv) + ' XP</div>' +
            '</div>' +

            '<div class="gm-card">' +
              '<div class="gm-card-tag">KUN SÖZI</div>' +
              '<div class="gm-word-lat">' + lat + '</div>' +
              '<div class="gm-word-cyr">' + cyr + '</div>' +
              '<div class="gm-word-mean">' + mean + '</div>' +
              (tips ? '<div class="gm-chips">' + tips + '</div>' : '') +
              '<div class="gm-actions">' +
                '<button type="button" class="gm-btn' + (learned ? ' gm-btn-ok' : ' gm-btn-main') + '" ' + (learned ? 'disabled' : '') + ' onclick="ULHGame.learn(' + wi + ')">' + (learned ? 'Örgandim ✓' : 'Örgandim +5 XP') + '</button>' +
                '<button type="button" class="gm-btn" onclick="ULHGame.copyWord(' + wi + ')">Nusxa oliş</button>' +
                '<button type="button" class="gm-btn" onclick="ULHGame.askOsha(' + wi + ')">Öşa’dan söraş</button>' +
              '</div>' +
            '</div>' +

            '<div class="gm-card"><div class="gm-card-tag">BUGUNGI TOPŞIRIQ</div>' + taskCard + '</div>' +

            '<div class="gm-card"><div class="gm-card-tag">NIŞONLAR · ' + Object.keys(state.badges).length + '/' + BADGES.length + '</div>' +
              '<div class="gm-badges">' + badgesHtml + '</div></div>';
    }

    function renderQuestion() {
        const q = task[qi];
        const answered = answers[qi] !== undefined;
        const opts = q.options.map((o, i) => {
            let cls = 'quiz-opt-btn';
            if (answered) {
                if (i === q.correct) cls += ' correct';
                else if (i === answers[qi]) cls += ' wrong';
            }
            return '<button type="button" class="' + cls + '" ' + (answered ? 'disabled' : '') + ' onclick="ULHGame.answer(' + i + ')">' + (i + 1) + '. ' + o + '</button>';
        }).join('');

        let fb = '';
        if (answered) {
            const ok = answers[qi] === q.correct;
            fb = '<div class="gm-fb ' + (ok ? 'ok' : 'bad') + '"><b>' + (ok ? 'Töğri! +10 XP' : 'Xato.') + '</b><div>' + q.explain + '</div></div>' +
                 '<button type="button" class="pill-btn gm-next" onclick="ULHGame.next()">' + (qi === task.length - 1 ? 'Natijani köriş' : 'Keyingi →') + '</button>';
        }

        body().innerHTML =
            '<div class="gm-q-head"><button type="button" class="gm-back" onclick="ULHGame.home()">← Ortga</button>' +
            '<span class="gm-q-count">Savol ' + (qi + 1) + ' / ' + task.length + '</span></div>' +
            '<div class="gm-bar"><div class="gm-bar-fill" style="width:' + (qi / task.length * 100) + '%"></div></div>' +
            '<div class="quiz-question-card gm-qcard"><div class="quiz-q-title">' + q.prompt + '</div><div class="quiz-options-grid">' + opts + '</div></div>' + fb;
    }

    function renderResult() {
        const r = lastResult;
        let comment = 'Maşq qiling, ertaga yana urinib köring 💪';
        if (r.score === r.total) comment = 'Mukammal! 🏆';
        else if (r.score >= 4) comment = 'Ajoyib natija! 👏';
        else if (r.score >= 3) comment = 'Yaxşi, davom eting! 🙂';
        const badges = r.badges.map(b => '<div class="gm-newbadge"><span>' + b.icon + '</span> ' + b.title + '</div>').join('');
        body().innerHTML =
            '<div class="gm-result">' +
              '<div class="gm-result-score">' + r.score + ' / ' + r.total + '</div>' +
              '<div class="gm-result-c">' + comment + '</div>' +
              '<div class="gm-result-grid">' +
                '<div><b>+' + r.xp + '</b><span>XP</span></div>' +
                '<div><b>' + FLAME_SVG + ' ' + r.streak + '</b><span>kunlik seriya</span></div>' +
              '</div>' +
              (badges ? '<div class="gm-newbadges"><div class="gm-card-tag">YANGI NIŞONLAR</div>' + badges + '</div>' : '') +
              '<button type="button" class="pill-btn gm-start" onclick="ULHGame.home()">Boş sahifaga</button>' +
            '</div>';
    }

    function render() {
        if (!body()) return;
        if (view === 'quiz') renderQuestion();
        else if (view === 'result') renderResult();
        else renderHome();
        refreshNav();
    }

    // ---------- harakatlar ----------
    function finish() {
        const key = todayKey();
        const score = answers.reduce((s, a, i) => s + (a === task[i].correct ? 1 : 0), 0);
        const total = task.length;

        // Seriya
        const gap = state.lastDone ? keyToDays(key) - keyToDays(state.lastDone) : Infinity;
        state.streak = (gap === 1) ? state.streak + 1 : 1;
        state.best = Math.max(state.best, state.streak);
        state.lastDone = key;
        state.history[key] = { score: score, total: total };

        // XP
        const xp = score * 10 + 20 + Math.min(state.streak, 10) * 2;
        state.xp += xp;
        state.correct += score;
        if (score === total) state.perfect++;

        const fresh = evalBadges();
        save();
        lastResult = { score: score, total: total, xp: xp, streak: state.streak, badges: fresh };
        view = 'result';
        render();
        announceBadges(fresh);
    }

    const api = {
        open() { view = 'home'; render(); const m = document.getElementById('dailyModalBackdrop'); if (m) m.classList.add('open'); },
        close(event) {
            const m = document.getElementById('dailyModalBackdrop');
            if (!m) return;
            if (event && event.target && event.target !== m) return;
            m.classList.remove('open');
        },
        home() { view = 'home'; render(); },
        start() {
            if (isDoneToday()) return;
            task = buildTask(todayKey()); qi = 0; answers = []; view = 'quiz'; render();
        },
        answer(i) {
            if (view !== 'quiz' || answers[qi] !== undefined) return;
            const q = task[qi];
            answers[qi] = i;
            if (i === q.correct) q.letters.forEach(k => { state.letters[k] = (state.letters[k] || 0) + 1; });
            render();
        },
        next() {
            if (answers[qi] === undefined) return;
            if (qi < task.length - 1) { qi++; render(); } else finish();
        },
        learn(wi) {
            if (state.learned.indexOf(wi) > -1) return;
            state.learned.push(wi);
            state.xp += 5;
            const fresh = evalBadges();
            save(); render(); announceBadges(fresh);
        },
        copyWord(wi) {
            const text = toLat(WORDS[wi][0]);
            if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => toast('<span class="gm-toast-ico">📋</span><span>Nusxalandi: <b>' + text + '</b></span>')).catch(() => {});
        },
        askOsha(wi) {
            const btn = document.getElementById('osha-btn');
            const inp = document.getElementById('osha-input');
            if (!btn || !inp) return;
            const lat = toLat(WORDS[wi][0]);
            api.close();
            btn.click();
            setTimeout(() => {
                inp.value = '«' + lat + '» sözi nima uçun şunday yoziladi? Harflar qoidasini qisqa tuşuntirib ber.';
                inp.dispatchEvent(new Event('input'));
                inp.focus();
            }, 380);
        },
        // Mavjud AI-viktorina tugagaç çaqiriladi
        onQuizFinished(score, total) {
            if (!total) return;
            const key = todayKey();
            if (state.quizXp.day !== key) state.quizXp = { day: key, xp: 0 };
            const gain = Math.max(0, Math.min(score * 2, 30 - state.quizXp.xp)); // kuniga ko'pi bilan 30 XP
            state.quizXp.xp += gain;
            state.xp += gain;
            if (score === total && total >= 3) state.quizPerfect++;
            const fresh = evalBadges();
            save(); refreshNav(); announceBadges(fresh);
            if (gain > 0) toast('<span class="gm-toast-ico">⭐</span><span><b>+' + gain + ' XP</b><br>Viktorina uçun</span>');
        },
        // Sinov uçun (konsolda): ULHGame.debugAdvanceDay(1)
        debugAdvanceDay(n) { window.__ulhDayOffset = dayOffset() + (n || 1); render(); return todayKey(); },
        reset() { state = defaultState(); try { localStorage.removeItem(STORE_KEY); } catch (e) {} render(); }
    };

    window.ULHGame = api;
    window.openDailyModal = api.open;
    window.closeDailyModal = api.close;

    document.addEventListener('keydown', e => { if (e.key === 'Escape') api.close(); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshNav(); });
    document.addEventListener('DOMContentLoaded', refreshNav);
    if (document.readyState !== 'loading') refreshNav();
})();

// === ПОИСК ПО ИНСТРУМЕНТАМ И ИЗБРАННОЕ ===
const TOOL_FAVORITES_KEY = "ulh_tool_favorites_v1";
const ULH_TOOL_CATALOG = [
    { id: "editor", name: "Matn muharriri", description: "Jonli transliteratsiya va matnni tahrirlaş", category: "Matn", keywords: "editor text transliteratsiya transliteration кириллица латиница кирилл лотин транслитерация yozuv", focus: "#editor" },
    { id: "converter", name: "Fayl konverteri", description: "Office hujjatlari, PDF va rasmlardan matn oliş", category: "Matn", keywords: "file fayl файл файлы документ документы конвертер doc docx xls xlsx ppt pptx pdf ocr rasm image konvertatsiya", selector: "#fileInput" },
    { id: "alphabet", name: "Yangi alifbo qoidalari", description: "Ö, Ğ, Ş va Ç harflari böyiça qöllanma", category: "Matn", keywords: "alphabet alifbo harf qoida harflar letters алфавит буквы правила ö ğ ş ç", action: "openAlphabetModal" },
    { id: "stats", name: "Matn statistikasi", description: "Sözlar, belgilar va matn hajmi", category: "Matn", keywords: "statistics statistika statistika symbol belgi word soz character статистика слова символы знаки", action: "openStatsModal" },
    { id: "text-tools", name: "Matn asboblari", description: "Formatlaş, tozalaş va qöşimça amallar", category: "Matn", keywords: "tools vositalar format cleanup tozalash", selector: "#toolsBtn" },
    { id: "diff", name: "Matnlarni soliştiriş", description: "Ikki matn orasidagi farqlarni köriş", category: "Matn", keywords: "diff compare farq taqqoslash сравнить сравнение различия", action: "openDiffModal" },
    { id: "archive", name: "Matn arxivi", description: "Saqlangan matnlarni topiş va tiklaş", category: "Matn", keywords: "archive saqlangan matnlar history архив сохраненные тексты", action: "openArchiveModal" },
    { id: "time-machine", name: "Matn tarixi", description: "Oldingi tahrirlarni köriş va tiklaş", category: "Matn", keywords: "history versions vaqt machine qayta tiklash история версии восстановить", action: "openTimeMachineModal" },
    { id: "dictation", name: "Ovozli diktant", description: "Ovoz yordamida matn kiritiş", category: "Matn", keywords: "speech voice microphone diktovka govor диктовка голос микрофон", action: "toggleDictation" },
    { id: "translator", name: "AI tarjimon", description: "Matnni boşqa tilga tarjima qiliş", category: "AI", keywords: "translate tarjima translation til language перевод переводчик", action: "openTranslatorPanel" },
    { id: "ai-fix", name: "AI yordamida matnni tuzatiş", description: "Imlo va uslubni yaxşilaş", category: "AI", keywords: "proofread spelling grammar xato imlo", action: "runAiPreset", args: ["fix_errors"] },
    { id: "ai-post", name: "Ijtimoiy tarmoq uçun post", description: "Telegram va Instagram uçun matn", category: "AI", keywords: "social media telegram instagram post smm", action: "runAiPreset", args: ["social_post"] },
    { id: "glossary", name: "Atamalar luğati", description: "Matndan asosiy atamalarni ajratiş", category: "AI", keywords: "glossary terms lugat terminlar", action: "generateGlossary" },
    { id: "ai-menu", name: "AI yordamçi vositalari", description: "Tarjima, tahrirlaş, testlar va boşqa AI amallari", category: "AI", keywords: "ai assistant yordamchi suniy intellekt", selector: "#aiHelperBtn" },
    { id: "osha", name: "Öşa AI bilan suhbat", description: "Sayt yordamçisiga savol bering", category: "AI", keywords: "chat chatbot osha yordam bot", selector: "#osha-btn" },
    { id: "uniqueness", name: "Matn unikalligini tekşiriş", description: "Akademik qolip va iboralarni aniqlaş", category: "AI", keywords: "plagiarism originality uniqueness antiplagiat", action: "checkTextUniqueness" },
    { id: "daily", name: "Kunlik maşq", description: "Har kuni qisqa alifbo va söz maşqlari", category: "Örganiş", keywords: "daily practice mashq word learning streak seriya", action: "openDailyModal" },
    { id: "quiz", name: "Interaktiv viktorina", description: "Bilimingizni savollar bilan tekşiring", category: "Örganiş", keywords: "quiz test viktorina savol", action: "openInteractiveTestModal" },
    { id: "weather", name: "Ob-havo", description: "Özbekiston hududlari böyiça prognoz", category: "Foydali vositalar", keywords: "weather forecast shahar hudud погода прогноз город", action: "openWeatherModal" },
    { id: "currency", name: "Valyuta kalkulyatori", description: "Valyuta kurslari va miqdor hisoblaş", category: "Foydali vositalar", keywords: "currency money kurs dollar euro rubl валюта курс конвертер", action: "openCurrencyModal" },
    { id: "pdf-studio", name: "PDF Studiya", description: "PDF fayllarni birlaştiriş, sahifa ajratiş va watermark örnatiş", category: "Foydali vositalar", keywords: "pdf studio merge split watermark page numbers birlashtirish ajratish suv belgisi raqamlash пдф склеить объединить вырезать разделить водяной знак нумерация страницы", action: "openPdfStudioModal" },
    { id: "mindmap", name: "Aql xaritasi (Mind Map)", description: "Ğoyalar xaritasini tuziş", category: "Foydali vositalar", keywords: "mindmap mind map aql xaritasi sxema goya png svg майндмап карта мыслей схема", action: "openMindmapModal" },
    { id: "chart", name: "Grafik konstruktori", description: "Ustunli va doiraviy PNG infografika yaratiş", category: "Foydali vositalar", keywords: "grafik diagramma chart infografika statistika png ustunli doiraviy график диаграмма инфографика статистика", action: "openChartModal" },
    { id: "qr", name: "QR-kod generatori", description: "Matn yoki havoladan QR-kod yaratiş", category: "Foydali vositalar", keywords: "qr code kod link havola png svg qr код ссылка", action: "openQrModal" },
    { id: "bibliography", name: "Iqtibos va adabiyotlar", description: "Manba va bibliografik yozuv yaratiş", category: "Foydali vositalar", keywords: "citation bibliography reference vak iqtibos adabiyot", action: "openBiblioModal" },
    { id: "templates", name: "Aqlli andozalar", description: "Rasmiy hujjat andozalarini töldiriş", category: "Foydali vositalar", keywords: "template document letter ariza hujjat", action: "openAndozaModal" },
    { id: "news", name: "Yangiliklar", description: "Yangiliklar lentasi va manbalar", category: "Foydali vositalar", keywords: "news rss yangiliklar feed новости лента", action: "openNewsModal" },
    { id: "word-cloud", name: "Söz buluti", description: "Matndagi asosiy, kalit sözlarni vizuallaştiriş", category: "Foydali vositalar", keywords: "word cloud visualization bulut", action: "openWordCloudModal" },
    { id: "quote", name: "Iqtibos dizayneri", description: "Matndan bezatilgan iqtibos rasmi yaratiş", category: "Foydali vositalar", keywords: "quote design image rasm", action: "openQuoteModal" },
    { id: "certificate", name: "Sertifikat va diplomlar", description: "Sertifikatlarni tayyorlaş", category: "Foydali vositalar", keywords: "certificate diploma badge sertifikat", action: "openCertModal" },
    { id: "schedule", name: "Öquv jadvali", description: "Dars jadvali va akademik reja", category: "Rejalaştiriş", keywords: "schedule timetable class jadval dars расписание уроки", action: "openSchedulerModal" },
    { id: "calendar", name: "Taqvim va tadbirlar", description: "Tadbirlar va eslatmalarni boşqariş", category: "Rejalaştiriş", keywords: "calendar event reminder taqvim eslatma", selector: "#calendar-toggle-btn" },
    { id: "kanban", name: "Rejalar doskasi", description: "Vazifalarni doskada tartiblaş", category: "Rejalaştiriş", keywords: "kanban tasks task board reja vazifa задачи доска", selector: "#kanban-toggle-btn" },
    { id: "pomodoro", name: "Pomodoro taymeri", description: "Fokusli iş va tanaffus intervallari", category: "Rejalaştiriş", keywords: "pomodoro timer focus таймер", selector: "#pomodoro-toggle-btn" },
    { id: "scratchpad", name: "Tezkor qaydlar", description: "Brauzerda vaqtinçalik qaydlar", category: "Rejalaştiriş", keywords: "notes memo scratchpad qayd daftar заметки записи", selector: "#scratchpad-toggle-btn" },
    { id: "focus-room", name: "Fokus xonasi", description: "Tinç muhit, fon va konsentratsiya", category: "Rejalaştiriş", keywords: "focus zen relax concentration fokus", action: "toggleZenMode" },
    { id: "sources", name: "Ilmiy manbalar", description: "Saqlangan ilmiy manbalar röyxati", category: "Rejalaştiriş", keywords: "sources research scholarly ilmiy manba", selector: "#sources-toggle-btn" },
    { id: "clipboard", name: "Nusxalar tarixi", description: "Sönggi nusxalangan matnlar", category: "Rejalaştiriş", keywords: "clipboard copy history nusxa", selector: "#clipboard-toggle-btn" },
    { id: "web-search", name: "Tezkor qidiruv mini-brauzeri", description: "Sayt içidagi mini-brauzerda qidiriş", category: "Boşqa", keywords: "browser web internet google qidiruv mini", selector: "#browser-toggle-btn" },
    { id: "music", name: "Musiqa pleyeri", description: "Konsentratsiya uçun musiqa va pleylist", category: "Boşqa", keywords: "music audio youtube player musiqa", selector: "#musicToggleBtn" },
    { id: "theme", name: "Tungi va kunduzgi mavzu", description: "Sayt rang mavzusini almaştiriş", category: "Boşqa", keywords: "theme dark light tun kun rang тема темная светлая оформление", action: "toggleDarkMode" },
    { id: "design", name: "Sayt dizayni", description: "Ranglar va fonni moslaştiriş", category: "Boşqa", keywords: "customize appearance style dizayn background", selector: "#themeStudioBtn" },
    { id: "hotkeys", name: "Klaviatura tugmalari", description: "Mavjud tezkor tugmalar röyxati", category: "Boşqa", keywords: "keyboard shortcut hotkey klaviatura клавиши сочетания горячие клавиши", action: "openHotkeysModal" },
    { id: "p2p", name: "Matnni QR orqali uzatiş", description: "Qurilmalar orasida matn ulaşiş", category: "Boşqa", keywords: "p2p share transfer qr device", action: "openP2pModal" }
];

let toolSearchFavoriteIds = [];
let toolSearchActiveIndex = -1;

function loadToolSearchFavorites() {
    try {
        const saved = JSON.parse(localStorage.getItem(TOOL_FAVORITES_KEY) || "[]");
        toolSearchFavoriteIds = Array.isArray(saved) ? saved.filter(id => ULH_TOOL_CATALOG.some(tool => tool.id === id)) : [];
    } catch (_) { toolSearchFavoriteIds = []; }
}

function saveToolSearchFavorites() {
    try { localStorage.setItem(TOOL_FAVORITES_KEY, JSON.stringify(toolSearchFavoriteIds)); } catch (_) {}
}

function normalizeToolSearchText(value) {
    return String(value || "").toLocaleLowerCase().replace(/ё/g, "е").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function createToolSearchSection(title, items, resultsRoot) {
    if (!items.length) return;
    const sectionTitle = document.createElement("div");
    sectionTitle.className = "tool-search-section-title";
    sectionTitle.textContent = title;
    resultsRoot.appendChild(sectionTitle);

    items.forEach(tool => {
        const row = document.createElement("div");
        row.className = "tool-search-result-row";
        const openButton = document.createElement("button");
        openButton.type = "button";
        openButton.className = "tool-search-result";
        openButton.setAttribute("role", "option");
        openButton.setAttribute("aria-selected", "false");
        openButton.dataset.toolId = tool.id;
        openButton.dataset.searchIndex = String(toolSearchActiveIndex++);

        const icon = document.createElement("span");
        icon.className = "tool-search-result-icon";
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = tool.name.trim().charAt(0).toLocaleUpperCase();

        const copy = document.createElement("span");
        copy.className = "tool-search-result-copy";
        const name = document.createElement("span");
        name.className = "tool-search-result-name";
        name.textContent = tool.name;
        const description = document.createElement("span");
        description.className = "tool-search-result-description";
        description.textContent = tool.description;
        copy.append(name, description);
        openButton.append(icon, copy);
        openButton.addEventListener("click", () => activateSearchedTool(tool));

        const favoriteButton = document.createElement("button");
        const isFavorite = toolSearchFavoriteIds.includes(tool.id);
        favoriteButton.type = "button";
        favoriteButton.className = "tool-search-favorite" + (isFavorite ? " is-favorite" : "");
        favoriteButton.textContent = isFavorite ? "★" : "☆";
        favoriteButton.setAttribute("aria-label", isFavorite ? "Tanlanganlardan olib taşlaş" : "Tanlanganlarga qöşiş");
        favoriteButton.setAttribute("aria-pressed", String(isFavorite));
        favoriteButton.title = favoriteButton.getAttribute("aria-label");
        favoriteButton.addEventListener("click", event => {
            event.stopPropagation();
            toggleToolFavorite(tool.id);
        });
        row.append(openButton, favoriteButton);
        resultsRoot.appendChild(row);
    });
}

function renderToolSearchResults() {
    const input = document.getElementById("toolSearchInput");
    const resultsRoot = document.getElementById("toolSearchResults");
    if (!input || !resultsRoot) return;
    const query = normalizeToolSearchText(input.value).trim();
    const filtered = ULH_TOOL_CATALOG.filter(tool => {
        const searchable = normalizeToolSearchText([tool.name, tool.description, tool.category, tool.keywords].join(" "));
        return !query || searchable.includes(query);
    });
    resultsRoot.replaceChildren();
    toolSearchActiveIndex = 0;

    if (query) {
        createToolSearchSection("Qidiruv natijalari", filtered, resultsRoot);
    } else {
        const favorites = filtered.filter(tool => toolSearchFavoriteIds.includes(tool.id));
        const others = filtered.filter(tool => !toolSearchFavoriteIds.includes(tool.id));
        createToolSearchSection("Tanlanganlar", favorites, resultsRoot);
        createToolSearchSection("Barça vositalar", others, resultsRoot);
    }

    const resultButtons = resultsRoot.querySelectorAll(".tool-search-result");
    if (!resultButtons.length) {
        const empty = document.createElement("div");
        empty.className = "tool-search-empty";
        empty.textContent = query ? "Mos vosita topilmadi. Boşqa söz bilan qidirib köring." : "Vositalar topilmadi.";
        resultsRoot.appendChild(empty);
        toolSearchActiveIndex = -1;
        return;
    }
    if (query) {
        setToolSearchActiveResult(0);
    } else {
        toolSearchActiveIndex = -1;
        resultsRoot.scrollTop = 0;
    }
}

function setToolSearchActiveResult(index) {
    const buttons = Array.from(document.querySelectorAll("#toolSearchResults .tool-search-result"));
    if (!buttons.length) { toolSearchActiveIndex = -1; return; }
    if (index < 0) index = buttons.length - 1;
    if (index >= buttons.length) index = 0;
    toolSearchActiveIndex = index;
    buttons.forEach((button, i) => {
        const active = i === index;
        button.setAttribute("aria-selected", String(active));
        if (active) button.scrollIntoView({ block: "nearest" });
    });
}

function toggleToolFavorite(id) {
    if (toolSearchFavoriteIds.includes(id)) toolSearchFavoriteIds = toolSearchFavoriteIds.filter(itemId => itemId !== id);
    else toolSearchFavoriteIds.push(id);
    saveToolSearchFavorites();
    renderToolSearchResults();
    const input = document.getElementById("toolSearchInput");
    if (input) input.focus();
}

function activateSearchedTool(tool) {
    closeToolSearch(false);
    if (tool.focus) {
        const target = document.querySelector(tool.focus);
        if (target) {
            target.scrollIntoView({ behavior: "smooth", block: "center" });
            target.focus({ preventScroll: true });
        }
        return;
    }
    if (tool.selector) {
        const trigger = document.querySelector(tool.selector);
        if (trigger) trigger.click();
        return;
    }
    const action = window[tool.action];
    if (typeof action === "function") action(...(tool.args || []));
}

function openToolSearch() {
    const backdrop = document.getElementById("toolSearchBackdrop");
    const input = document.getElementById("toolSearchInput");
    if (!backdrop || !input) return;
    backdrop.classList.add("open");
    backdrop.setAttribute("aria-hidden", "false");
    input.value = "";
    renderToolSearchResults();
    requestAnimationFrame(() => input.focus());
}

function closeToolSearch(returnFocus = true) {
    const backdrop = document.getElementById("toolSearchBackdrop");
    if (!backdrop) return;
    backdrop.classList.remove("open");
    backdrop.setAttribute("aria-hidden", "true");
    if (returnFocus) document.getElementById("toolSearchOpenBtn")?.focus();
}

const toolSearchInputEl = document.getElementById("toolSearchInput");
if (toolSearchInputEl) {
    toolSearchInputEl.addEventListener("input", renderToolSearchResults);
    toolSearchInputEl.addEventListener("keydown", event => {
        if (event.key === "ArrowDown") { event.preventDefault(); setToolSearchActiveResult(toolSearchActiveIndex + 1); }
        else if (event.key === "ArrowUp") { event.preventDefault(); setToolSearchActiveResult(toolSearchActiveIndex - 1); }
        else if (event.key === "Enter") {
            const active = document.querySelector(`#toolSearchResults .tool-search-result[data-search-index="${toolSearchActiveIndex}"]`);
            if (active) { event.preventDefault(); active.click(); }
        } else if (event.key === "Escape") { event.preventDefault(); closeToolSearch(); }
    });
}

document.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === "k") {
        event.preventDefault();
        openToolSearch();
    }
    if (event.key === "Escape") {
        const backdrop = document.getElementById("toolSearchBackdrop");
        if (backdrop?.classList.contains("open")) closeToolSearch();
    }
});

loadToolSearchFavorites();

// ==========================================
// === ГЕНЕРАТОР PNG-ИНФОРМЕРА ПРОГНОЗА ПОГОДЫ ===
// ==========================================
window.toggleWeatherExportMenu = function(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    const wrap = document.getElementById("weatherExportWrap");
    if (wrap) wrap.classList.toggle("open");
};

document.addEventListener("click", (e) => {
    const wrap = document.getElementById("weatherExportWrap");
    if (wrap && !wrap.contains(e.target)) {
        wrap.classList.remove("open");
    }
});

window.downloadWeatherInformer = async function(theme) {
    const wrap = document.getElementById("weatherExportWrap");
    const btn = document.getElementById("weatherExportBtn");
    const stage = document.getElementById("currencyInformerStage");
    if (wrap) wrap.classList.remove("open");
    if (!stage || typeof html2canvas !== "function") return;

    const btnSpan = btn ? btn.querySelector("span") : null;
    const origText = btnSpan ? btnSpan.textContent : "Rasm yuklaş";
    if (btnSpan) btnSpan.textContent = "Tayyorlanmoqda...";
    if (btn) btn.disabled = true;

    try {
        const current = UZ_REGIONS.find(r => r.id === selectedRegionId) || UZ_REGIONS[0];
        const tzDate = new Date(Date.now() + 5 * 60 * 60 * 1000);
        const dd = String(tzDate.getUTCDate()).padStart(2, "0");
        const mm = String(tzDate.getUTCMonth() + 1).padStart(2, "0");
        const yyyy = tzDate.getUTCFullYear();
        const todayStr = `${dd}.${mm}.${yyyy}`;

        // Запрашиваем прогноз на 3 следующих дня для выбранного региона
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${current.lat}&longitude=${current.lon}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Asia%2FTashkent&forecast_days=4`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Ob-havo ma'lumotini olib bölmadi");
        const data = await res.json();

        const uzWeekdays = ["Yakşanba", "Duşanba", "Seşanba", "Çorşanba", "Payşanba", "Juma", "Şanba"];
        const daily = data.daily || {};
        const times = daily.time || [];
        const codes = daily.weather_code || [];
        const maxTemps = daily.temperature_2m_max || [];
        const minTemps = daily.temperature_2m_min || [];

        let forecastHtml = "";
        for (let i = 1; i <= 3; i++) {
            if (!times[i]) continue;
            const [y, m, d] = times[i].split("-").map(Number);
            const dayObj = new Date(Date.UTC(y, m - 1, d));
            const dayName = uzWeekdays[dayObj.getUTCDay()];
            const dayDate = `${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")}`;
            const mapped = mapWmoCodeToUzbek(codes[i]);
            const tMax = Math.round(maxTemps[i]);
            const tMin = Math.round(minTemps[i]);

            forecastHtml += `
                <div class="weather-inf-day">
                    <div class="weather-inf-day-name">${dayName}</div>
                    <div class="weather-inf-day-date">${dayDate}</div>
                    <div style="margin: 2px 0;">${getWeatherSvg(mapped.type, 40)}</div>
                    <div class="weather-inf-day-cond">${mapped.cond}</div>
                    <div class="weather-inf-day-temps">
                        <span>${tMax > 0 ? "+" + tMax : tMax}°</span>
                        <span class="weather-inf-day-min">${tMin > 0 ? "+" + tMin : tMin}°</span>
                    </div>
                </div>
            `;
        }

        const logoPath = theme === "dark" ? "/logo-dark.svg" : "/logo.svg";
        const nowTemp = current.temp > 0 ? `+${current.temp}°` : `${current.temp}°`;

        stage.innerHTML = `
            <div class="curr-inf-card ${theme}" id="weatherInfCardNode">
                <div class="curr-inf-top">
                    <div>
                        <h2 class="curr-inf-title">OB-HAVO PROGNOZI</h2>
                        <div class="curr-inf-date">${todayStr} holatiga köra</div>
                    </div>
                    <img src="${logoPath}" alt="Logo" class="curr-inf-logo" id="weatherInfLogoImg">
                </div>
                <div class="weather-inf-accent-line"></div>
                <div class="weather-inf-hero">
                    <div>
                        <div class="weather-inf-city">${current.name}</div>
                        <div class="weather-inf-cond">Bugun • ${current.cond}</div>
                    </div>
                    <div class="weather-inf-now-right">
                        ${getWeatherSvg(current.type, 56)}
                        <div class="weather-inf-temp">${nowTemp}</div>
                    </div>
                </div>
                <div class="weather-inf-grid">${forecastHtml}</div>
                <div class="curr-inf-footer">
                    <span>3 kunlik ob-havo prognozi</span>
                    <span>ulh-online.uz</span>
                </div>
            </div>
        `;

        const logoImg = document.getElementById("weatherInfLogoImg");
        if (logoImg && !logoImg.complete) {
            await new Promise(resolve => {
                logoImg.onload = resolve;
                logoImg.onerror = resolve;
            });
        }
        if (document.fonts && document.fonts.ready) {
            await document.fonts.ready;
        }

        const cardNode = document.getElementById("weatherInfCardNode");
        const canvas = await html2canvas(cardNode, {
            scale: 2,
            useCORS: true,
            backgroundColor: null,
            logging: false
        });

        const link = document.createElement("a");
        link.download = `ob_havo_${current.id}_${dd}-${mm}-${yyyy}_${theme}.png`;
        link.href = canvas.toDataURL("image/png");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        stage.innerHTML = "";
    } catch (err) {
        console.error("Weather Informer Error:", err);
        alert("Ob-havo rasmini yaratişda xatolik yuz berdi.");
    } finally {
        if (btnSpan) btnSpan.textContent = origText;
        if (btn) btn.disabled = false;
    }
};

// ==========================================
// === КОНСТРУКТОР МИНИ-ГРАФИКОВ (PNG) ===
// ==========================================
const CHART_PALETTE = [
    "#0284C7", "#10B981", "#F59E0B", "#8B5CF6",
    "#EF4444", "#EC4899", "#14B8A6", "#6366F1",
    "#F97316", "#84CC16", "#06B6D4", "#D946EF",
    "#E11D48", "#3B82F6", "#22C55E", "#A855F7"
];

let chartState = {
    type: "bar",     // "bar" | "donut"
    theme: "light",  // "light" | "dark"
    rows: [
        { label: "Samarqand", value: 42 },
        { label: "Toşkent", value: 31 },
        { label: "Buxoro", value: 18 },
        { label: "Xiva", value: 9 }
    ]
};

window.openChartModal = function(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    document.querySelectorAll('.nav-item.has-dropdown').forEach(el => el.classList.remove('open'));
    const modal = document.getElementById("chartModalBackdrop");
    if (modal) {
        modal.classList.add("open");
        renderChartRowsInputs();
        renderChartPreview();
    }
};

window.closeChartModal = function(event) {
    const modal = document.getElementById("chartModalBackdrop");
    if (!modal) return;
    if (event && event.target && event.target !== modal) return;
    modal.classList.remove("open");
};

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeChartModal();
});

window.setChartType = function(type) {
    chartState.type = type;
    document.querySelectorAll("#chartTypeGroup .chart-seg-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.type === type);
    });
    renderChartPreview();
};

window.setChartTheme = function(theme) {
    chartState.theme = theme;
    document.querySelectorAll("#chartThemeGroup .chart-seg-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.theme === theme);
    });
    renderChartPreview();
};

window.addChartRow = function() {
    if (chartState.rows.length >= 20) return;
    chartState.rows.push({ label: `Körsatkiç ${chartState.rows.length + 1}`, value: 1 });
    renderChartRowsInputs();
    renderChartPreview();
};

window.removeChartRow = function(idx) {
    if (chartState.rows.length <= 2) return;
    chartState.rows.splice(idx, 1);
    renderChartRowsInputs();
    renderChartPreview();
};

window.updateChartRow = function(idx, field, val) {
    if (!chartState.rows[idx]) return;
    chartState.rows[idx][field] = field === "value" ? (parseFloat(val) || 0) : val;
    renderChartPreview();
};

function renderChartRowsInputs() {
    const box = document.getElementById("chartRowsContainer");
    if (!box) return;
    box.innerHTML = chartState.rows.map((row, idx) => `
        <div class="chart-data-row">
            <span class="chart-row-dot" style="background:${CHART_PALETTE[idx % CHART_PALETTE.length]};"></span>
            <input type="text" class="bib-custom-input" value="${escapeHTML(row.label)}" placeholder="Nomi" oninput="updateChartRow(${idx}, 'label', this.value)">
            <input type="number" class="bib-custom-input" value="${row.value}" placeholder="0" oninput="updateChartRow(${idx}, 'value', this.value)">
            <button type="button" class="chart-del-row-btn" onclick="removeChartRow(${idx})" title="Öçiriş">×</button>
        </div>
    `).join("");
}

function buildChartCardHTML(isExport) {
    const title = (document.getElementById("chartTitleInput")?.value || "STATISTIKA").trim();
    const sub = (document.getElementById("chartSubInput")?.value || "").trim();
    const unit = (document.getElementById("chartUnitInput")?.value || "").trim();
    const theme = chartState.theme;
    const logoPath = theme === "dark" ? "/logo-dark.svg" : "/logo.svg";

    const validRows = chartState.rows.filter(r => r.label.trim() !== "");
    const total = validRows.reduce((sum, r) => sum + Math.max(0, Number(r.value) || 0), 0) || 1;
    const maxVal = Math.max(...validRows.map(r => Math.max(0, Number(r.value) || 0)), 1);

    let bodyHtml = "";

    if (chartState.type === "bar") {
        bodyHtml = `<div class="chart-bars-wrap">` + validRows.map((row, idx) => {
            const val = Math.max(0, Number(row.value) || 0);
            const pct = Math.max(3, Math.round((val / maxVal) * 100));
            const color = CHART_PALETTE[idx % CHART_PALETTE.length];
            const valText = unit ? `${val}${unit === "%" ? "%" : " " + unit}` : `${val}`;
            return `
                <div class="chart-bar-item">
                    <div class="chart-bar-head">
                        <span>${escapeHTML(row.label)}</span>
                        <span class="chart-bar-val" style="color:${color};">${valText}</span>
                    </div>
                    <div class="chart-bar-track">
                        <div class="chart-bar-fill" style="width:${pct}%; background:${color};"></div>
                    </div>
                </div>
            `;
        }).join("") + `</div>`;
    } else {
        // Кольцевая диаграмма на чистом SVG
        const radius = 70;
        const circumference = 2 * Math.PI * radius;
        let offset = 0;

        const circlesHtml = validRows.map((row, idx) => {
            const val = Math.max(0, Number(row.value) || 0);
            const segLen = (val / total) * circumference;
            const color = CHART_PALETTE[idx % CHART_PALETTE.length];
            const circle = `<circle cx="95" cy="95" r="${radius}" fill="none" stroke="${color}" stroke-width="26" stroke-dasharray="${segLen.toFixed(2)} ${circumference.toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}"></circle>`;
            offset += segLen;
            return circle;
        }).join("");

        const legendHtml = validRows.map((row, idx) => {
            const val = Math.max(0, Number(row.value) || 0);
            const color = CHART_PALETTE[idx % CHART_PALETTE.length];
            const valText = unit ? `${val}${unit === "%" ? "%" : " " + unit}` : `${val}`;
            return `
                <div class="chart-legend-row">
                    <div class="chart-legend-left">
                        <span class="chart-legend-dot" style="background:${color};"></span>
                        <span>${escapeHTML(row.label)}</span>
                    </div>
                    <span class="chart-legend-val">${valText}</span>
                </div>
            `;
        }).join("");

        const totalDisplay = Number.isInteger(total) ? total : total.toFixed(1);
        bodyHtml = `
            <div class="chart-donut-wrap">
                <div class="chart-donut-svg-box">
                    <svg width="190" height="190" viewBox="0 0 190 190">
                        <g transform="rotate(-90 95 95)">${circlesHtml}</g>
                    </svg>
                    <div class="chart-donut-center">
                        <div class="chart-donut-total">${totalDisplay}${unit === "%" ? "%" : ""}</div>
                        <div class="chart-donut-lbl">Jami</div>
                    </div>
                </div>
                <div class="chart-donut-legend">${legendHtml}</div>
            </div>
        `;
    }

    const idAttr = isExport ? 'id="chartInfCardNode"' : '';
    const logoId = isExport ? 'id="chartInfLogoImg"' : '';

    return `
        <div class="curr-inf-card ${theme}" ${idAttr}>
            <div class="curr-inf-top">
                <div>
                    <h2 class="curr-inf-title">${escapeHTML(title)}</h2>
                    ${sub ? `<div class="curr-inf-date">${escapeHTML(sub)}</div>` : ""}
                </div>
                <img src="${logoPath}" alt="Logo" class="curr-inf-logo" ${logoId}>
            </div>
            <div class="chart-inf-accent-line"></div>
            ${bodyHtml}
            <div class="curr-inf-footer">
                <span>ULH Infografika</span>
                <span>ulh-online.uz</span>
            </div>
        </div>
    `;
}

function renderChartPreview() {
    const frame = document.getElementById("chartPreviewFrame");
    if (!frame) return;
    frame.innerHTML = buildChartCardHTML(false);
}

window.downloadChartInformer = async function() {
    const stage = document.getElementById("currencyInformerStage");
    const btn = document.getElementById("chartDownloadBtn");
    if (!stage || typeof html2canvas !== "function") return;

    const btnSpan = btn ? btn.querySelector("span") : null;
    const origText = btnSpan ? btnSpan.textContent : "PNG yuklab oliş";
    if (btnSpan) btnSpan.textContent = "Tayyorlanmoqda...";
    if (btn) btn.disabled = true;

    try {
        stage.innerHTML = buildChartCardHTML(true);

        const logoImg = document.getElementById("chartInfLogoImg");
        if (logoImg && !logoImg.complete) {
            await new Promise(resolve => {
                logoImg.onload = resolve;
                logoImg.onerror = resolve;
            });
        }
        if (document.fonts && document.fonts.ready) {
            await document.fonts.ready;
        }

        const cardNode = document.getElementById("chartInfCardNode");
        const canvas = await html2canvas(cardNode, {
            scale: 2,
            useCORS: true,
            backgroundColor: null,
            logging: false
        });

        const link = document.createElement("a");
        link.download = `ulh_grafik_${chartState.type}_${chartState.theme}.png`;
        link.href = canvas.toDataURL("image/png");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        stage.innerHTML = "";
    } catch (err) {
        console.error("Chart Informer Error:", err);
        alert("Grafikni yaratişda xatolik yuz berdi.");
    } finally {
        if (btnSpan) btnSpan.textContent = origText;
        if (btn) btn.disabled = false;
    }
};

// === МЕНЮ И ЭКСПОРТ ГРАФИКОВ В SVG ===
window.toggleChartExportMenu = function(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    const wrap = document.getElementById("chartExportWrap");
    if (wrap) wrap.classList.toggle("open");
};

window.closeChartExportMenu = function() {
    const wrap = document.getElementById("chartExportWrap");
    if (wrap) wrap.classList.remove("open");
};

document.addEventListener("click", (e) => {
    const wrap = document.getElementById("chartExportWrap");
    if (wrap && !wrap.contains(e.target)) {
        wrap.classList.remove("open");
    }
});

function escapeChartSvgXml(str) {
    return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

async function getChartLogoSvg(logoPath, x, y, targetWidth) {
    try {
        const res = await fetch(logoPath);
        if (!res.ok) return "";
        const text = await res.text();
        const doc = new DOMParser().parseFromString(text, "image/svg+xml");
        const svgEl = doc.querySelector("svg");
        if (!svgEl) return "";

        const vb = svgEl.getAttribute("viewBox");
        let w = parseFloat(svgEl.getAttribute("width")) || 185;
        let h = parseFloat(svgEl.getAttribute("height")) || 40;
        if (vb) {
            const p = vb.trim().split(/[\s,]+/).map(Number);
            if (p.length === 4 && p[2] > 0) { w = p[2]; h = p[3]; }
        }
        const targetHeight = Math.round((h / w) * targetWidth);
        return `<svg x="${x}" y="${y}" width="${targetWidth}" height="${targetHeight}" viewBox="${vb || `0 0 ${w} ${h}`}">${svgEl.innerHTML}</svg>`;
    } catch (_) {
        return "";
    }
}

window.downloadChartInformerSVG = async function() {
    const title = (document.getElementById("chartTitleInput")?.value || "STATISTIKA").trim();
    const sub = (document.getElementById("chartSubInput")?.value || "").trim();
    const unit = (document.getElementById("chartUnitInput")?.value || "").trim();
    const theme = chartState.theme;
    const isDark = theme === "dark";
    const textCol = isDark ? "#F8FAFC" : "#0F172A";
    const trackBg = isDark ? "rgba(255,255,255,0.1)" : "#E2E8F0";

    const validRows = chartState.rows.filter(r => r.label.trim() !== "");
    const total = validRows.reduce((s, r) => s + Math.max(0, Number(r.value) || 0), 0) || 1;
    const maxVal = Math.max(...validRows.map(r => Math.max(0, Number(r.value) || 0)), 1);

    const logoSvg = await getChartLogoSvg(isDark ? "/logo-dark.svg" : "/logo.svg", 381, 34, 185);
    let bodySvg = "";
    let svgHeight = 420;

    if (chartState.type === "bar") {
        svgHeight = 148 + validRows.length * 54 + 62;
        bodySvg = validRows.map((row, idx) => {
            const val = Math.max(0, Number(row.value) || 0);
            const barW = Math.max(16, Math.round((val / maxVal) * 532));
            const color = CHART_PALETTE[idx % CHART_PALETTE.length];
            const valText = unit ? `${val}${unit === "%" ? "%" : " " + unit}` : `${val}`;
            const y = 148 + idx * 54;
            return `
                <text x="34" y="${y + 14}" font-size="15" font-weight="700" fill="${textCol}">${escapeChartSvgXml(row.label)}</text>
                <text x="566" y="${y + 14}" text-anchor="end" font-size="16" font-weight="800" fill="${color}">${escapeChartSvgXml(valText)}</text>
                <rect x="34" y="${y + 24}" width="532" height="14" rx="7" fill="${trackBg}"/>
                <rect x="34" y="${y + 24}" width="${barW}" height="14" rx="7" fill="${color}"/>
            `;
        }).join("");
    } else {
        const radius = 70;
        const circumference = 2 * Math.PI * radius;
        const legendHeight = validRows.length * 30;
        svgHeight = Math.max(410, 160 + legendHeight + 70);
        const donutCy = 148 + Math.max(95, legendHeight / 2);

        let offset = 0;
        const circlesSvg = validRows.map((row, idx) => {
            const val = Math.max(0, Number(row.value) || 0);
            const segLen = (val / total) * circumference;
            const color = CHART_PALETTE[idx % CHART_PALETTE.length];
            const c = `<circle cx="132" cy="${donutCy}" r="${radius}" fill="none" stroke="${color}" stroke-width="26" stroke-dasharray="${segLen.toFixed(2)} ${circumference.toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 132 ${donutCy})"/>`;
            offset += segLen;
            return c;
        }).join("");

        const legendStartY = donutCy - (legendHeight / 2) + 18;
        const legendSvg = validRows.map((row, idx) => {
            const val = Math.max(0, Number(row.value) || 0);
            const color = CHART_PALETTE[idx % CHART_PALETTE.length];
            const valText = unit ? `${val}${unit === "%" ? "%" : " " + unit}` : `${val}`;
            const y = legendStartY + idx * 30;
            return `
                <circle cx="268" cy="${y - 5}" r="5.5" fill="${color}"/>
                <text x="284" y="${y}" font-size="14" font-weight="700" fill="${textCol}">${escapeChartSvgXml(row.label)}</text>
                <text x="566" y="${y}" text-anchor="end" font-size="14" font-weight="800" fill="${textCol}">${escapeChartSvgXml(valText)}</text>
            `;
        }).join("");

        const totalDisplay = Number.isInteger(total) ? total : total.toFixed(1);
        bodySvg = `
            ${circlesSvg}
            <text x="132" y="${donutCy + 2}" text-anchor="middle" font-size="24" font-weight="800" fill="${textCol}">${totalDisplay}${unit === "%" ? "%" : ""}</text>
            <text x="132" y="${donutCy + 20}" text-anchor="middle" font-size="11" font-weight="700" fill="${textCol}" opacity="0.65">JAMI</text>
            ${legendSvg}
        `;
    }

    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="${svgHeight}" viewBox="0 0 600 ${svgHeight}" style="font-family: Manrope, Arial, sans-serif;">
        <defs>
            <linearGradient id="ulhChartBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="${isDark ? "#0F172A" : "#FFFFFF"}"/>
                <stop offset="55%" stop-color="${isDark ? "#111827" : "#F8FAFC"}"/>
                <stop offset="100%" stop-color="${isDark ? "#0B1120" : "#F1F5F9"}"/>
            </linearGradient>
            <linearGradient id="ulhChartLine" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#0284C7"/>
                <stop offset="100%" stop-color="#6366F1"/>
            </linearGradient>
        </defs>
        <rect width="600" height="${svgHeight}" fill="url(#ulhChartBg)"/>
        <text x="34" y="64" font-size="28" font-weight="800" fill="${textCol}">${escapeChartSvgXml(title)}</text>
        ${sub ? `<text x="34" y="92" font-size="16" font-weight="600" fill="${textCol}" opacity="0.78">${escapeChartSvgXml(sub)}</text>` : ""}
        ${logoSvg}
        <rect x="34" y="114" width="140" height="3" rx="1.5" fill="url(#ulhChartLine)"/>
        ${bodySvg}
        <text x="34" y="${svgHeight - 26}" font-size="13" font-weight="600" fill="${textCol}" opacity="0.65">ULH Infografika</text>
        <text x="566" y="${svgHeight - 26}" text-anchor="end" font-size="13" font-weight="600" fill="${textCol}" opacity="0.65">ulh-online.uz</text>
    </svg>`;

    const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `ulh_grafik_${chartState.type}_${theme}.svg`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// ==========================================
// === AQL XARITASI (MIND MAP -> PNG / SVG) ===
// ==========================================
const MM_STORAGE_KEY = "ulh_mindmap_v1";
const MM_COLORS = ["#0284C7", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444", "#EC4899"];

let mmState = {
    theme: "light",
    selectedId: "root",
    nodes: []
};

let mmDrag = { active: false, id: null, offsetX: 0, offsetY: 0 };

function getDefaultMindmapNodes() {
    return [
        { id: "root", parentId: null, text: "Asosiy mavzu", x: 480, y: 270, color: "#0284C7" },
        { id: "n1", parentId: "root", text: "1-yönaliş", x: 240, y: 150, color: "#10B981" },
        { id: "n2", parentId: "root", text: "2-yönaliş", x: 720, y: 150, color: "#8B5CF6" },
        { id: "n3", parentId: "root", text: "3-yönaliş", x: 240, y: 390, color: "#F59E0B" },
        { id: "n4", parentId: "root", text: "4-yönaliş", x: 720, y: 390, color: "#EC4899" },
        { id: "n1a", parentId: "n1", text: "Tafsilot", x: 110, y: 90, color: "#10B981" }
    ];
}

function loadMindmapData() {
    try {
        const saved = JSON.parse(localStorage.getItem(MM_STORAGE_KEY) || "null");
        if (saved && Array.isArray(saved.nodes) && saved.nodes.length) {
            mmState.nodes = saved.nodes;
            mmState.theme = saved.theme || "light";
            return;
        }
    } catch (_) {}
    mmState.nodes = getDefaultMindmapNodes();
}

function saveMindmapData() {
    try {
        localStorage.setItem(MM_STORAGE_KEY, JSON.stringify({
            theme: mmState.theme,
            nodes: mmState.nodes
        }));
    } catch (_) {}
}

window.openMindmapModal = function(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    document.querySelectorAll('.nav-item.has-dropdown').forEach(el => el.classList.remove('open'));
    loadMindmapData();
    const modal = document.getElementById("mindmapModalBackdrop");
    if (modal) {
        modal.classList.add("open");
        setMindmapTheme(mmState.theme);
        selectMindmapNode("root");
        renderMindmap();
    }
};

window.closeMindmapModal = function(event) {
    const modal = document.getElementById("mindmapModalBackdrop");
    if (!modal) return;
    if (event && event.target && event.target !== modal) return;
    modal.classList.remove("open");
};

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMindmapModal();
});

window.setMindmapTheme = function(theme) {
    mmState.theme = theme;
    const wrap = document.getElementById("mindmapCanvasWrap");
    if (wrap) {
        wrap.classList.toggle("light", theme === "light");
        wrap.classList.toggle("dark", theme === "dark");
    }
    document.querySelectorAll("#mmThemeGroup .chart-seg-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.theme === theme);
    });
    saveMindmapData();
    renderMindmap();
};

function selectMindmapNode(id) {
    const node = mmState.nodes.find(n => n.id === id) || mmState.nodes[0];
    if (!node) return;
    mmState.selectedId = node.id;

    const input = document.getElementById("mmNodeTextInput");
    if (input) input.value = node.text;

    const delBtn = document.getElementById("mmDeleteBtn");
    if (delBtn) delBtn.disabled = (node.id === "root");

    const colorBox = document.getElementById("mmColorPicker");
    if (colorBox) {
        const isCustom = !MM_COLORS.includes(node.color);
        colorBox.innerHTML = MM_COLORS.map(c => `
            <button type="button" class="mm-color-dot ${node.color === c ? "active" : ""}"
                style="background:${c};" onclick="setMindmapNodeColor('${c}')"></button>
        `).join("") + `
            <label class="qr-custom-color-wrap ${isCustom ? "active-custom" : ""}" title="Boşqa rang tanlaş">
                <input type="color" value="${node.color}" oninput="setMindmapCustomColor(this.value)">
                <span class="qr-custom-color-icon">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </span>
            </label>
        `;
    }
    renderMindmap();
}

window.updateSelectedMindmapText = function(val) {
    const node = mmState.nodes.find(n => n.id === mmState.selectedId);
    if (!node) return;
    node.text = val;
    saveMindmapData();
    renderMindmap();
};

window.setMindmapNodeColor = function(color) {
    const node = mmState.nodes.find(n => n.id === mmState.selectedId);
    if (!node) return;
    node.color = color;
    saveMindmapData();
    selectMindmapNode(node.id);
};

window.setMindmapCustomColor = function(color) {
    const node = mmState.nodes.find(n => n.id === mmState.selectedId);
    if (!node) return;
    node.color = color;
    saveMindmapData();
    renderMindmap();

    document.querySelectorAll("#mmColorPicker .mm-color-dot").forEach(btn => btn.classList.remove("active"));
    const customWrap = document.querySelector("#mmColorPicker .qr-custom-color-wrap");
    if (customWrap) customWrap.classList.add("active-custom");
};

window.addMindmapChild = function() {
    const parent = mmState.nodes.find(n => n.id === mmState.selectedId) || mmState.nodes[0];
    if (!parent) return;

    const siblings = mmState.nodes.filter(n => n.parentId === parent.id);
    const angle = (siblings.length * 1.15) - 0.6;
    const dist = parent.id === "root" ? 210 : 145;
    const nx = Math.max(85, Math.min(875, Math.round(parent.x + Math.cos(angle) * dist)));
    const ny = Math.max(50, Math.min(490, Math.round(parent.y + Math.sin(angle) * dist)));

    const newColor = parent.id === "root"
        ? MM_COLORS[(siblings.length + 1) % MM_COLORS.length]
        : parent.color;

    const newNode = {
        id: "n_" + Date.now().toString(36),
        parentId: parent.id,
        text: "Yangi ğoya",
        x: nx,
        y: ny,
        color: newColor
    };
    mmState.nodes.push(newNode);
    saveMindmapData();
    selectMindmapNode(newNode.id);

    const input = document.getElementById("mmNodeTextInput");
    if (input) { input.focus(); input.select(); }
};

window.deleteSelectedMindmapNode = function() {
    if (mmState.selectedId === "root") return;
    const toRemove = new Set([mmState.selectedId]);
    let added = true;
    while (added) {
        added = false;
        mmState.nodes.forEach(n => {
            if (n.parentId && toRemove.has(n.parentId) && !toRemove.has(n.id)) {
                toRemove.add(n.id);
                added = true;
            }
        });
    }
    mmState.nodes = mmState.nodes.filter(n => !toRemove.has(n.id));
    saveMindmapData();
    selectMindmapNode("root");
};

window.autoLayoutMindmap = function() {
    const root = mmState.nodes.find(n => n.id === "root");
    if (!root) return;
    root.x = 480;
    root.y = 270;

    const level1 = mmState.nodes.filter(n => n.parentId === "root");
    level1.forEach((node, idx) => {
        const angle = (idx / Math.max(1, level1.length)) * Math.PI * 2 - Math.PI / 2;
        node.x = Math.round(480 + Math.cos(angle) * 235);
        node.y = Math.round(270 + Math.sin(angle) * 150);

        const level2 = mmState.nodes.filter(n => n.parentId === node.id);
        level2.forEach((child, cIdx) => {
            const spread = (cIdx - (level2.length - 1) / 2) * 0.45;
            const cAngle = angle + spread;
            child.x = Math.max(85, Math.min(875, Math.round(node.x + Math.cos(cAngle) * 145)));
            child.y = Math.max(45, Math.min(495, Math.round(node.y + Math.sin(cAngle) * 100)));
        });
    });

    saveMindmapData();
    renderMindmap();
};

window.resetMindmapDemo = function() {
    mmState.nodes = getDefaultMindmapNodes();
    saveMindmapData();
    selectMindmapNode("root");
};

function getNodeDims(node) {
    const isRoot = node.id === "root";
    const text = node.text || " ";
    const charW = isRoot ? 10 : 8.4;
    const w = Math.max(isRoot ? 140 : 96, Math.min(270, text.length * charW + (isRoot ? 40 : 30)));
    const h = isRoot ? 48 : 38;
    return { w, h, isRoot };
}

function buildMindmapSvgInner(isExport) {
    const isDark = mmState.theme === "dark";
    const nodeBg = isDark ? "#1E293B" : "#FFFFFF";
    const textCol = isDark ? "#F8FAFC" : "#0F172A";
    const footerCol = isDark ? "rgba(248,250,252,0.5)" : "rgba(15,23,42,0.45)";

    let bgHtml = "";
    if (isExport) {
        const bgFill = isDark ? "#0F172A" : "#F8FAFC";
        bgHtml = `
            <rect width="960" height="540" fill="${bgFill}" rx="0"/>
            <text x="936" y="518" text-anchor="end" font-family="Manrope, Arial, sans-serif" font-size="13" font-weight="700" fill="${footerCol}">ulh-online.uz • Aql xaritasi</text>
        `;
    }

    // 1. Кривые Безье между узлами
    const edgesHtml = mmState.nodes.map(node => {
        if (!node.parentId) return "";
        const parent = mmState.nodes.find(p => p.id === node.parentId);
        if (!parent) return "";
        const mx = (parent.x + node.x) / 2;
        const d = `M ${parent.x} ${parent.y} C ${mx} ${parent.y}, ${mx} ${node.y}, ${node.x} ${node.y}`;
        return `<path d="${d}" fill="none" stroke="${node.color}" stroke-width="${parent.id === "root" ? 3 : 2.2}" stroke-opacity="0.72" stroke-linecap="round"/>`;
    }).join("");

    // 2. Сами узлы
    const nodesHtml = mmState.nodes.map(node => {
        const { w, h, isRoot } = getNodeDims(node);
        const rx = isRoot ? 16 : 12;
        const isSel = !isExport && node.id === mmState.selectedId;
        const fill = isRoot ? node.color : nodeBg;
        const labelColor = isRoot ? "#FFFFFF" : textCol;
        const stroke = isSel ? "#38BDF8" : node.color;
        const strokeW = isSel ? 3 : (isRoot ? 0 : 2);
        const safeText = escapeHTML(node.text || "...");

        return `
            <g class="mm-node-group" data-id="${node.id}" transform="translate(${node.x}, ${node.y})">
                <rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="${rx}"
                    fill="${fill}" stroke="${stroke}" stroke-width="${strokeW}"/>
                <text x="0" y="1" text-anchor="middle" dominant-baseline="middle"
                    font-family="Manrope, Arial, sans-serif" font-size="${isRoot ? 16 : 13.5}"
                    font-weight="${isRoot ? 800 : 700}" fill="${labelColor}" style="pointer-events:none;">${safeText}</text>
            </g>
        `;
    }).join("");

    return bgHtml + edgesHtml + nodesHtml;
}

function renderMindmap() {
    const svg = document.getElementById("mindmapSvg");
    if (!svg) return;
    svg.innerHTML = buildMindmapSvgInner(false);
}

// Перетаскивание узлов (мышь + тач)
(function initMindmapDrag() {
    const svg = document.getElementById("mindmapSvg");
    if (!svg) return;

    function getSvgPoint(e) {
        const rect = svg.getBoundingClientRect();
        return {
            x: ((e.clientX - rect.left) / rect.width) * 960,
            y: ((e.clientY - rect.top) / rect.height) * 540
        };
    }

    svg.addEventListener("pointerdown", (e) => {
        const group = e.target.closest(".mm-node-group");
        if (!group) return;
        const id = group.getAttribute("data-id");
        const node = mmState.nodes.find(n => n.id === id);
        if (!node) return;

        selectMindmapNode(id);
        const pt = getSvgPoint(e);
        mmDrag = { active: true, id, offsetX: node.x - pt.x, offsetY: node.y - pt.y };
        svg.setPointerCapture(e.pointerId);
    });

    svg.addEventListener("pointermove", (e) => {
        if (!mmDrag.active) return;
        const node = mmState.nodes.find(n => n.id === mmDrag.id);
        if (!node) return;
        const pt = getSvgPoint(e);
        node.x = Math.max(70, Math.min(890, Math.round(pt.x + mmDrag.offsetX)));
        node.y = Math.max(36, Math.min(504, Math.round(pt.y + mmDrag.offsetY)));
        renderMindmap();
    });

    svg.addEventListener("pointerup", () => {
        if (mmDrag.active) {
            mmDrag.active = false;
            saveMindmapData();
        }
    });
})();

function getExportMindmapSvgString() {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">${buildMindmapSvgInner(true)}</svg>`;
}

// Экспорт в чистый векторный SVG
window.downloadMindmapSVG = function() {
    const svgStr = getExportMindmapSvgString();
    const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `ulh_mindmap_${mmState.theme}.svg`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// Экспорт в PNG высокого разрешения (1920x1080) с логотипом
window.downloadMindmapPNG = async function() {
    const btn = document.getElementById("mmPngBtn");
    const btnSpan = btn ? btn.querySelector("span") : null;
    const origText = btnSpan ? btnSpan.textContent : "PNG yuklab oliş";
    if (btnSpan) btnSpan.textContent = "Tayyorlanmoqda...";
    if (btn) btn.disabled = true;

    try {
        const svgStr = getExportMindmapSvgString();
        const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
        const svgUrl = URL.createObjectURL(svgBlob);

        const img = new Image();
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = svgUrl;
        });

        const canvas = document.createElement("canvas");
        canvas.width = 1920;
        canvas.height = 1080;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, 1920, 1080);
        URL.revokeObjectURL(svgUrl);

        // Дорисовываем логотип сайта в левый нижний угол
        const logoImg = new Image();
        logoImg.crossOrigin = "anonymous";
        logoImg.src = mmState.theme === "dark" ? "/logo-dark.svg" : "/logo.svg";
        await new Promise(resolve => {
            logoImg.onload = () => {
                const lw = 240;
                const lh = (logoImg.naturalHeight / (logoImg.naturalWidth || 1)) * lw;
                ctx.drawImage(logoImg, 44, 1080 - lh - 36, lw, lh);
                resolve();
            };
            logoImg.onerror = resolve;
        });

        const link = document.createElement("a");
        link.download = `ulh_mindmap_${mmState.theme}.png`;
        link.href = canvas.toDataURL("image/png");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (err) {
        console.error("Mindmap PNG Error:", err);
        alert("PNG yaratişda xatolik yuz berdi.");
    } finally {
        if (btnSpan) btnSpan.textContent = origText;
        if (btn) btn.disabled = false;
    }
};
