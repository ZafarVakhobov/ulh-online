// Advertising banner slider and ad-order form.
// Load after holidays.js and scripts.js, using defer in index.html.
(function () {
    "use strict";

    const BANNER_CONFIG = {
        main: {
            id: "main",
            src: "./header.png",
            alt: "Uzbek Latin Helper — Asosiy banner",
            action: "link",
            href: "https://ulh-online.uz/"
        },
        bot: {
            id: "bot",
            src: "./banner-bot.png",
            alt: "Uzbek Latin Helper Telegram boti",
            action: "link",
            href: "https://t.me/UzbekLatinAppBot",
            target: "_blank"
        },
        ads: {
            id: "ads",
            src: "./banner-ads.png",
            alt: "Saytda reklama joylaştiriş — Tariflar bilan tanişing",
            action: "modal"
        },
        customAds: [
            {
                id: "ad_client1",
                src: "./banner-client1.png",
                alt: "Dastur",
                action: "link",
                href: "https://t.me/ulh_releases/16",
                target: "_blank",
                startDate: "2026-10-31",
                endDate: "2026-12-31"
            },
            {
                id: "ad_client2",
                src: "./walls-banner.png",
                alt: "Wallpapers Pack 01",
                action: "link",
                href: "https://drive.google.com/drive/folders/1P9yTHe0HV6yMt7peiYwUn_LfN5kKmoVY?usp=sharing",
                target: "_blank",
                startDate: "2026-11-05",
                endDate: "2026-12-05"
            }
        ]
    };

    let heroSlidesData = [];
    let currentHeroIndex = 0;
    let heroTimer = null;
    let lastCheckedDayKey = "";
    const HERO_INTERVAL_MS = 7000;

    function getTashkentDateParts() {
        const tzDate = new Date(Date.now() + 5 * 60 * 60 * 1000);
        return {
            year: tzDate.getUTCFullYear(),
            month: tzDate.getUTCMonth() + 1,
            day: tzDate.getUTCDate(),
            hours: tzDate.getUTCHours(),
            minutes: tzDate.getUTCMinutes()
        };
    }

    function getActiveSlidesList() {
        const { year, month, day } = getTashkentDateParts();
        const todayStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const holidays = Array.isArray(window.ULH_HOLIDAY_BANNERS) ? window.ULH_HOLIDAY_BANNERS : [];
        const activeHoliday = holidays.find(holiday => holiday.check(month, day));
        const activeCustomAds = BANNER_CONFIG.customAds.filter(ad =>
            todayStr >= ad.startDate && todayStr <= ad.endDate
        );

        const slides = [activeHoliday ? {
            id: activeHoliday.id,
            src: activeHoliday.src,
            alt: activeHoliday.name,
            action: "link",
            href: "https://ulh-online.uz/"
        } : BANNER_CONFIG.main];

        slides.push(BANNER_CONFIG.bot, ...activeCustomAds, BANNER_CONFIG.ads);
        return slides;
    }

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
                if (slide.target) {
                    slideEl.target = slide.target;
                    slideEl.rel = "noopener";
                }
            } else if (slide.action === "modal") {
                slideEl.setAttribute("role", "button");
                slideEl.tabIndex = 0;
                slideEl.setAttribute("aria-label", slide.alt);
                slideEl.addEventListener("click", openAdsModal);
                slideEl.addEventListener("keydown", event => {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openAdsModal(event);
                    }
                });
            }

            const img = document.createElement("img");
            img.src = slide.src;
            img.alt = slide.alt;
            img.onerror = function () {
                if (!this.src.includes("header.png")) this.src = "./header.png";
            };
            slideEl.appendChild(img);
            track.appendChild(slideEl);

            const dot = document.createElement("button");
            dot.type = "button";
            dot.className = "hero-dot" + (idx === 0 ? " active" : "");
            dot.setAttribute("aria-label", "Slayd " + (idx + 1));
            dot.addEventListener("click", event => {
                event.stopPropagation();
                goToHeroSlide(idx);
                restartHeroAutoPlay();
            });
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
            dotsBox.querySelectorAll(".hero-dot").forEach((dot, idx) => {
                dot.classList.toggle("active", idx === currentHeroIndex);
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
        heroTimer = setInterval(() => goToHeroSlide(currentHeroIndex + 1), HERO_INTERVAL_MS);
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

    function openAdsModal(event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        document.querySelectorAll(".nav-item.has-dropdown").forEach(el => el.classList.remove("open"));
        const modal = document.getElementById("adsModalBackdrop");
        if (modal) {
            modal.classList.add("open");
            stopHeroAutoPlay();
        }
    }

    function closeAdsModal(event) {
        const modal = document.getElementById("adsModalBackdrop");
        if (!modal || (event && event.target && event.target !== modal)) return;
        modal.classList.remove("open");
        startHeroAutoPlay();
    }

    const heroSliderBox = document.getElementById("heroSlider");
    if (heroSliderBox) {
        heroSliderBox.addEventListener("mouseenter", stopHeroAutoPlay);
        heroSliderBox.addEventListener("mouseleave", startHeroAutoPlay);
        let touchStartX = 0;
        heroSliderBox.addEventListener("touchstart", event => {
            if (event.touches.length) touchStartX = event.touches[0].clientX;
            stopHeroAutoPlay();
        }, { passive: true });
        heroSliderBox.addEventListener("touchend", event => {
            if (event.changedTouches.length) {
                const diffX = event.changedTouches[0].clientX - touchStartX;
                if (Math.abs(diffX) > 40) goToHeroSlide(diffX < 0 ? currentHeroIndex + 1 : currentHeroIndex - 1);
            }
            startHeroAutoPlay();
        }, { passive: true });
    }

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") closeAdsModal();
    });

    window.initHeroSlider = initHeroSlider;
    window.changeHeroSlide = changeHeroSlide;
    window.openAdsModal = openAdsModal;
    window.closeAdsModal = closeAdsModal;

    const AD_WORKER_URL = "https://ulh-tg-sender.lanigirodesigner.workers.dev/";

    function openAdOrderModal(event) {
        if (event) event.preventDefault();
        const modal = document.getElementById("adOrderModalBackdrop");
        if (modal) modal.classList.add("open");
    }

    function closeAdOrderModal(event) {
        const modal = document.getElementById("adOrderModalBackdrop");
        if (!modal || (event && event.target && event.target !== modal)) return;
        modal.classList.remove("open");
    }

    function handleAdFileSelect(input) {
        const label = document.getElementById("adFileLabel");
        if (!label || !input) return;
        if (input.files && input.files[0]) {
            label.classList.add("file-selected");
            const labelText = label.querySelector("span");
            if (labelText) labelText.textContent = `Fayl: ${input.files[0].name}`;
        } else {
            label.classList.remove("file-selected");
            const labelText = label.querySelector("span");
            if (labelText) labelText.textContent = "Banner rasmini yuklang (PNG, JPG, GIF)";
        }
    }

    async function submitAdOrder(event) {
        event.preventDefault();
        const fileInput = document.getElementById("adBannerFile");
        const file = fileInput && fileInput.files[0];
        const submitBtn = document.getElementById("adSubmitBtn");
        if (!file) return alert("Iltimos, banner rasmini yuklang!");

        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = async function () {
            URL.revokeObjectURL(img.src);
            if (img.width !== 2560 || img.height !== 844) {
                alert(`Xatolik! Rasm ölçami aynan 2560x844 px bölişi kerak.\nSiz yuklagan rasm: ${img.width}x${img.height} px`);
                return;
            }

            submitBtn.innerHTML = "<span>Yuborilmoqda... Kuting</span>";
            submitBtn.style.opacity = "0.7";
            submitBtn.disabled = true;

            const formData = new FormData();
            formData.append("name", document.getElementById("adName").value);
            formData.append("phone", document.getElementById("adPhone").value);
            formData.append("org", document.getElementById("adOrg").value);
            formData.append("url", document.getElementById("adUrl").value);
            formData.append("tariff", document.getElementById("adTariff").value);
            formData.append("file", file);

            try {
                const response = await fetch(AD_WORKER_URL, { method: "POST", body: formData });
                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.error || "Server xatosi");
                }
                submitBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg><span>Muvaffaqiyatli yuborildi!</span>';
                submitBtn.style.background = "#10B981";
                setTimeout(() => {
                    document.getElementById("adOrderForm").reset();
                    handleAdFileSelect(fileInput);
                    closeAdOrderModal();
                    submitBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg><span>Sörovni yuboriş</span>';
                    submitBtn.style.background = "#0284C7";
                    submitBtn.style.opacity = "1";
                    submitBtn.disabled = false;
                }, 2500);
            } catch (error) {
                console.error("Yuborişda xatolik:", error);
                alert("Xatolik yuz berdi. Iltimos qaytadan urinib köring.\nSabab: " + error.message);
                submitBtn.innerHTML = "<span>Sörovni yuboriş</span>";
                submitBtn.style.opacity = "1";
                submitBtn.disabled = false;
            }
        };
    }

    window.openAdOrderModal = openAdOrderModal;
    window.closeAdOrderModal = closeAdOrderModal;
    window.handleAdFileSelect = handleAdFileSelect;
    window.submitAdOrder = submitAdOrder;

    let lastDayKey = "";
    window.setInterval(() => {
        const { month, day } = getTashkentDateParts();
        const key = `${month}-${day}`;
        if (lastDayKey && lastDayKey !== key) initHeroSlider();
        lastDayKey = key;
    }, 60000);

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initHeroSlider, { once: true });
    } else {
        initHeroSlider();
    }
})();