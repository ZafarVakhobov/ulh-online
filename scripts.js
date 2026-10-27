const tg = (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : null;
if (tg) {
    tg.ready();
    tg.expand();

    // Скрываем блок конвертера файлов только внутри среды Telegram Mini App
    const isTelegramEnv = Boolean(tg.initData && tg.initData.length > 0);
    if (isTelegramEnv) {
        document.getElementById('converterBox').style.display = 'none';
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

/* === СКРИПТ ВЕРХНЕГО МЕНЮ И ПОГОДЫ (ACCUWEATHER + LIVE METEO) === */
const ACCUWEATHER_API_KEY = ""; // При наличии ключа AccuWeather API можно вписать сюда

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
    // partly (солнце за облаком)
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
    const current = UZ_REGIONS.find(r => r.id === selectedRegionId) || UZ_REGIONS[0];
    const accuUrl = getAccuWeatherUrl(current);

    // Обновляем мини-карточку в подменю Foydali resurslar
    document.getElementById('miniCityName').textContent = current.name;
    document.getElementById('miniTempVal').textContent = current.temp + "°";
    document.getElementById('miniCondText').textContent = current.cond;
    document.getElementById('miniWeatherIcon').innerHTML = getWeatherSvg(current.type, 34);
    document.getElementById('miniAccuLink').href = accuUrl;

    // Обновляем верхний баннер в модальном окне
    document.getElementById('modalSelectedCity').textContent = current.name;
    document.getElementById('modalSelectedTemp').textContent = current.temp + "°";
    document.getElementById('modalSelectedCondText').textContent = current.cond;
    document.getElementById('modalSelectedIcon').innerHTML = getWeatherSvg(current.type, 18);
    document.getElementById('modalBannerDecor').innerHTML = getWeatherSvg(current.type, 110);
    document.getElementById('modalAccuLink').href = accuUrl;

    // Обновляем сетку остальных регионов
    const grid = document.getElementById('weatherCitiesGrid');
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

function selectWeatherRegion(regionId) {
    selectedRegionId = regionId;
    renderWeatherUI();
    closeWeatherModal();
}

async function fetchAllRegionsWeather() {
    try {
        if (ACCUWEATHER_API_KEY) {
            const current = UZ_REGIONS.find(r => r.id === selectedRegionId) || UZ_REGIONS[0];
            const res = await fetch(`https://dataservice.accuweather.com/currentconditions/v1/${current.accuKey}?apikey=${ACCUWEATHER_API_KEY}&language=uz&metric=true`); if (res.ok) { const data = await res.json(); if (data && data[0]) { current.temp = Math.round(data[0].Temperature.Metric.Value); renderWeatherUI(); } } } // Пакетное получение актуальной погоды для всех 14 регионов Узбекистана const lats = UZ_REGIONS.map(r => r.lat).join(","); const lons = UZ_REGIONS.map(r => r.lon).join(","); const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,weather_code&timezone=auto`; const response = await fetch(url); if (!response.ok) return; const json = await response.json(); const results = Array.isArray(json) ? json : [json];  results.forEach((item, idx) => { if (item && item.current && UZ_REGIONS[idx]) { UZ_REGIONS[idx].temp = Math.round(item.current.temperature_2m); const mapped = mapWmoCodeToUzbek(item.current.weather_code); UZ_REGIONS[idx].type = mapped.type; UZ_REGIONS[idx].cond = mapped.cond; } }); renderWeatherUI(); } catch (_) { renderWeatherUI(); } }  function toggleNavDropdown(itemId, event) { if (event) event.stopPropagation(); const target = document.getElementById(itemId); const isOpen = target.classList.contains('open');  document.querySelectorAll('.nav-item.has-dropdown').forEach(el => { el.classList.remove('open'); const btn = el.querySelector('.nav-link-btn'); if (btn) btn.setAttribute('aria-expanded', 'false'); });  if (!isOpen) { target.classList.add('open'); const btn = target.querySelector('.nav-link-btn'); if (btn) btn.setAttribute('aria-expanded', 'true'); } }  function openWeatherModal(event) { if (event) event.stopPropagation(); document.querySelectorAll('.nav-item.has-dropdown').forEach(el => el.classList.remove('open')); document.getElementById('weatherModalBackdrop').classList.add('open'); }  function closeWeatherModal(event) { if (event && event.target && event.target !== document.getElementById('weatherModalBackdrop')) return; document.getElementById('weatherModalBackdrop').classList.remove('open'); }  document.addEventListener('click', () => { document.querySelectorAll('.nav-item.has-dropdown').forEach(el => el.classList.remove('open')); });  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeWeatherModal(); document.querySelectorAll('.nav-item.has-dropdown').forEach(el => el.classList.remove('open')); } });  renderWeatherUI(); fetchAllRegionsWeather();  /* === ПОЛУЧЕНИЕ КУРСОВ ВАЛЮТ С NBU (USD, EUR, RUB, CNY) === */ const CURRENCY_RATES = { USD: "11 910", EUR: "13 330", RUB: "150", CNY: "1 780" };  function formatUzPrice(num) { const val = parseFloat(String(num).replace(/[^\d.,]/g, "").replace(",", ".")); if (isNaN(val) \vert{}\vert{} val <= 0) return null; return Math.round(val).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " "); }  function updateCurrencyDOM() { ["USD", "EUR", "RUB", "CNY"].forEach(code => { const el = document.getElementById("rate" + code); if (el && CURRENCY_RATES[code]) { el.textContent = CURRENCY_RATES[code]; } }); }  async function fetchNbuCurrencyRates() { const targetCodes = ["USD", "EUR", "RUB", "CNY"];  // 1. Попытка получить данные напрямую со страницы NBU и JSON-шлюза NBU const nbuUrls = [ "https://nbu.uz/uz/exchange-rates/json/", "https://api.allorigins.win/raw?url=" + encodeURIComponent("https://nbu.uz/uz/exchange-rates/json/"), "https://api.allorigins.win/raw?url=" + encodeURIComponent("https://nbu.uz/jismoniy-shaxslar-valyutalar-kursi") ];  for (const url of nbuUrls) { try { const res = await fetch(url); if (!res.ok) continue; const text = await res.text();  // Если пришел JSON массив от NBU if (text.trim().startsWith("[")) { const data = JSON.parse(text); let updatedCount = 0; data.forEach(item => { if (targetCodes.includes(item.code)) { const rawRate = item.nbu_cell_price \vert{}\vert{} item.nbu_buy_price \vert{}\vert{} item.cb_price; const formatted = formatUzPrice(rawRate); if (formatted) { CURRENCY_RATES[item.code] = formatted; updatedCount++; } } }); if (updatedCount > 0) { updateCurrencyDOM(); return; } } else { // Парсинг HTML-таблицы со страницы https://nbu.uz/jismoniy-shaxslar-valyutalar-kursi let updatedCount = 0; targetCodes.forEach(code => { const regex = new RegExp(code + "[\\s\\S]{0,220}?(\\d[\\d\\s]{1,7}(?:[.,]\\d+)?)", "i"); const match = text.match(regex); if (match && match[1]) { const formatted = formatUzPrice(match[1]); if (formatted) { CURRENCY_RATES[code] = formatted; updatedCount++; } } }); if (updatedCount >= 2) { updateCurrencyDOM(); return; } } } catch (_) {} }  // 2. Резервный прямой источник с открытым CORS (JSON ЦБ РУз), если прокси NBU недоступен в браузере try { const cbuRes = await fetch("https://cbu.uz/uz/arkhiv-kursov-valyut/json/"); if (cbuRes.ok) { const cbuData = await cbuRes.json(); cbuData.forEach(item => { if (targetCodes.includes(item.Ccy)) { const formatted = formatUzPrice(item.Rate); if (formatted) { CURRENCY_RATES[item.Ccy] = formatted; } } }); updateCurrencyDOM(); } } catch (_) { updateCurrencyDOM(); } }  updateCurrencyDOM(); fetchNbuCurrencyRates();  /* === РЕДАКТОР И ЖИВАЯ ТРАНСЛИТЕРАЦИЯ === */ function copyEditorText() { const editor = document.getElementById('editor'); const btn = document.getElementById('copyBtn'); if (!editor.value) return;  navigator.clipboard.writeText(editor.value).then(() => { btn.innerText = 'Nusxalandi ✓'; btn.classList.add('copied'); setTimeout(() => { btn.innerText = 'Nusxa oliş'; btn.classList.remove('copied'); }, 1000); }).catch(() => { btn.innerText = 'Nusxa olinmadi'; setTimeout(() => { btn.innerText = 'Nusxa oliş'; }, 1000); }); }  function clearEditorText() { const editor = document.getElementById('editor'); const btn = document.getElementById('clearBtn');  if (editor.value.length === 0) return;  editor.value = ''; hideTooltip();  btn.innerText = 'Öçirildi'; btn.classList.add('cleared'); setTimeout(() => { btn.innerText = 'Öçiriş'; btn.classList.remove('cleared'); }, 1000); }  document.getElementById('currentYear').innerText = new Date().getFullYear();  const editor = document.getElementById('editor'); const tip = document.getElementById('popup-tip');  let replaceTargetIndex = -1; let originalPairValue = ""; let tipTimeout = null;  const russianCommonWords = new Set([ "моя", "мой", "мои", "моё", "книга", "школа", "машина", "человек", "город", "дом", "работа", "земля", "вода", "солнце", "время", "это", "как", "что", "быть", "меня", "тебя", "ему", "теперь", "когда", "только", "уже" ]);  function isRussianCommonWord(word) { if (word[0] >= 'А' && word[0] <= 'Я') { return false; } return russianCommonWords.has(word.toLowerCase()); }  function isAnyVowel(ch) { if (!ch) return false; return "аеёиоуўэюяАЕЁИОУЎЭЮЯaeiouöAEIOUÖ".indexOf(ch) !== -1; }  function cyrillicToLatin(text) { if (!text) return "";  return text.replace(/[А-Яа-яЁёҒғҚқЎўҲҳЪъЬь]+/g, function(word) { if (isRussianCommonWord(word)) { return word; }  let cleanedWord = word .replace(/([бвгғджзклмнпрстфхҳцчшБВГҒДЖЗКЛМНПРСТФХҲЦЧШ])[Ьь][Яя]/g, "$1a") .replace(/([бвгғджзклмнпрстфхҳцчшБВГҒДЖЗКЛМНПРСТФХҲЦЧШ])[Ьь][Юю]/g, "$1u") .replace(/([бвгғджзклмнпрстфхҳцчшБВГҒДЖЗКЛМНПРСТФХҲЦЧШ])[Ьь][Ёё]/g, "$1o") .replace(/([бвгғджзклмнпрстфхҳцчшБВГҒДЖЗКЛМНПРСТФХҲЦЧШ])[Ьь][Ее]/g, "$1ye");  let res = ""; for (let i = 0; i < cleanedWord.length; i++) { let ch = cleanedWord[i]; let prev = i > 0 ? cleanedWord[i - 1] : "";  if (ch === 'Ь' \vert{}\vert{} ch === 'ь') { continue; }  if (ch === 'Ъ' \vert{}\vert{} ch === 'ъ') { let nextChar = cleanedWord[i + 1] \vert{}\vert{} ""; if (nextChar === 'Е' \vert{}\vert{} nextChar === 'е') { continue; } res += '’'; continue; }  if (ch === 'Е' \vert{}\vert{} ch === 'е') { let useYe = (i === 0) \vert{}\vert{} isAnyVowel(prev) \vert{}\vert{} prev === 'Ъ' \vert{}\vert{} prev === 'ъ' \vert{}\vert{} prev === 'Ь' \vert{}\vert{} prev === 'ь'; res += useYe ? ((ch === 'Е') ? 'Ye' : 'ye') : ((ch === 'Е') ? 'E' : 'e'); continue; }  if ((ch === 'Я' \vert{}\vert{} ch === 'я') && /^октябр/i.test(word)) { res += (ch === 'Я') ? 'A' : 'a'; continue; }  if (ch === 'Ю' \vert{}\vert{} ch === 'ю') { res += (ch === 'Ю' ? 'Yu' : 'yu'); continue; } if (ch === 'Я' \vert{}\vert{} ch === 'я') { res += (ch === 'Я' ? 'Ya' : 'ya'); continue; } if (ch === 'Ё' \vert{}\vert{} ch === 'ё') { res += (ch === 'Ё' ? 'Yo' : 'yo'); continue; }  switch (ch) { case 'А': res += 'A'; break; case 'а': res += 'a'; break; case 'Б': res += 'B'; break; case 'б': res += 'b'; break; case 'В': res += 'V'; break; case 'в': res += 'v'; break; case 'Г': res += 'G'; break; case 'г': res += 'g'; break; case 'Ғ': res += 'Ğ'; break; case 'ғ': res += 'ğ'; break; case 'Д': res += 'D'; break; case 'д': res += 'd'; break; case 'Ж': res += 'J'; break; case 'ж': res += 'j'; break; case 'З': res += 'Z'; break; case 'з': res += 'z'; break; case 'И': res += 'I'; break; case 'и': res += 'i'; break; case 'Й': res += 'Y'; break; case 'й': res += 'y'; break; case 'К': res += 'K'; break; case 'к': res += 'k'; break; case 'Қ': res += 'Q'; break; case 'қ': res += 'q'; break; case 'Л': res += 'L'; break; case 'л': res += 'l'; break; case 'М': res += 'M'; break; case 'м': res += 'm'; break; case 'Н': res += 'N'; break; case 'н': res += 'n'; break; case 'О': res += 'O'; break; case 'о': res += 'o'; break; case 'П': res += 'P'; break; case 'п': res += 'p'; break; case 'Р': res += 'R'; break; case 'р': res += 'r'; break; case 'С': res += 'S'; break; case 'с': res += 's'; break; case 'Т': res += 'T'; break; case 'т': res += 't'; break; case 'У': res += 'U'; break; case 'у': res += 'u'; break; case 'Ў': res += 'Ö'; break; case 'ў': res += 'ö'; break; case 'Ф': res += 'F'; break; case 'ф': res += 'f'; break; case 'Х': res += 'X'; break; case 'х': res += 'x'; break; case 'Ҳ': res += 'H'; break; case 'ҳ': res += 'h'; break; case 'Ц': res += (i === 0) ? 'S' : 'Ts'; break; case 'ц': res += (i === 0) ? 's' : 'ts'; break; case 'Ч': res += 'Ç'; break; case 'ч': res += 'ç'; break; case 'Ш': res += 'Ş'; break; case 'ш': res += 'ş'; break; case 'Э': res += 'E'; break; case 'э': res += 'e'; break; default: res += ch; } } return res; }); }  function transliterateLiveSegment(beforeCursorText) { const wordMatch = beforeCursorText.match(/([A-Za-zÇŞĞÖçşğö’'`\u02BB\u02BCА-Яа-яЁёҒғҚқЎўҲҳЪъЬь]+)$/);
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
