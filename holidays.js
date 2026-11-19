// Holiday banner schedule for Uzbekistan (Tashkent local calendar: UTC+5).
// Add or edit entries here; adverts.js uses this list when building the slider.
window.ULH_HOLIDAY_BANNERS = [
    {
        id: "new_year",
        name: "Yangi yil bayrami",
        src: "./banner-newyear.png",
        check: (month, day) => (month === 12 && day >= 24) || (month === 1 && day <= 13)
    },
    {
        id: "defenders_day",
        name: "14-yanvar — Vatan himoyaçilari kuni",
        src: "./banner-14jan.png",
        check: (month, day) => month === 1 && day === 14
    },
    {
        id: "womens_day",
        name: "8-mart — Xalqaro xotin-qizlar kuni",
        src: "./banner-8march.png",
        check: (month, day) => month === 3 && day >= 6 && day <= 9
    },
    {
        id: "navruz",
        name: "21-mart — Navröz bayrami",
        src: "./banner-navruz.png",
        check: (month, day) => month === 3 && day >= 19 && day <= 23
    },
    {
        id: "memory_day",
        name: "9-may — Xotira va qadrlaş kuni",
        src: "./banner-9may.png",
        check: (month, day) => month === 5 && day >= 7 && day <= 10
    },
    {
        id: "independence_day",
        name: "Mustaqillik bayrami",
        src: "./banner-mustaqillik.png",
        check: (month, day) => (month === 8 && day >= 30) || (month === 9 && day <= 3)
    },
    {
        id: "teachers_day",
        name: "1-oktabr — Öqituvçi va murabbiylar kuni",
        src: "./banner-1oct.png",
        check: (month, day) => (month === 9 && day >= 29) || (month === 10 && day <= 2)
    },
    {
        id: "constitution_day",
        name: "8-dekabr — Özbekiston Respublikasi Konstitutsiyasi kuni",
        src: "./banner-8dec.png",
        check: (month, day) => month === 12 && day >= 6 && day <= 9
    }
];