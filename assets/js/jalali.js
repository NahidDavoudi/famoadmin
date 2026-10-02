/**
 * Jalali (Shamsi/Persian) Date Conversion Utility
 * Based on the jalaali-js algorithm by Jalaali (https://github.com/jalaali/jalaali-js)
 */

const JALALI_MONTHS = [
    'فروردین', 'اردیبهشت', 'خرداد',
    'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر',
    'دی', 'بهمن', 'اسفند'
];

/**
 * Convert Gregorian date to Jalali
 * @param {number} gy - Gregorian year
 * @param {number} gm - Gregorian month (1-12)
 * @param {number} gd - Gregorian day
 * @returns {[number, number, number]} [jy, jm, jd]
 */
export function toJalali(gy, gm, gd) {
    const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    let gy2 = (gm > 2) ? (gy + 1) : gy;
    let days = 355666 + (365 * gy) + Math.floor((gy2 + 3) / 4)
        - Math.floor((gy2 + 99) / 100)
        + Math.floor((gy2 + 399) / 400)
        + gd + g_d_m[gm - 1];
    let jy = -1595 + (33 * Math.floor(days / 12053));
    days %= 12053;
    jy += 4 * Math.floor(days / 1461);
    days %= 1461;
    if (days > 365) {
        jy += Math.floor((days - 1) / 365);
        days = (days - 1) % 365;
    }
    let jm, jd;
    if (days < 186) {
        jm = 1 + Math.floor(days / 31);
        jd = 1 + (days % 31);
    } else {
        jm = 7 + Math.floor((days - 186) / 30);
        jd = 1 + ((days - 186) % 30);
    }
    return [jy, jm, jd];
}

/**
 * Convert Jalali date to Gregorian
 * @param {number} jy - Jalali year
 * @param {number} jm - Jalali month (1-12)
 * @param {number} jd - Jalali day
 * @returns {[number, number, number]} [gy, gm, gd]
 */
export function toGregorian(jy, jm, jd) {
    let jy2 = jy - 979;
    let jm2 = jm - 1;
    let jd2 = jd - 1;

    let j_day_no = 365 * jy2 + Math.floor(jy2 / 33) * 8
        + Math.floor((jy2 % 33 + 3) / 4);
    for (let i = 0; i < jm2; i++) j_day_no += (i < 6) ? 31 : 30;
    j_day_no += jd2;

    let g_day_no = j_day_no + 79;
    let gy = 1600 + 400 * Math.floor(g_day_no / 146097);
    g_day_no %= 146097;

    let leap = true;
    if (g_day_no >= 36525) {
        g_day_no--;
        gy += 100 * Math.floor(g_day_no / 36524);
        g_day_no %= 36524;
        if (g_day_no >= 365) g_day_no++;
        else leap = false;
    }

    gy += 4 * Math.floor(g_day_no / 1461);
    g_day_no %= 1461;

    if (g_day_no >= 366) {
        leap = false;
        g_day_no--;
        gy += Math.floor(g_day_no / 365);
        g_day_no %= 365;
    }

    const g_d_m = [31, (leap ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let gm;
    for (gm = 0; gm < 12 && g_day_no >= g_d_m[gm]; gm++) {
        g_day_no -= g_d_m[gm];
    }

    return [gy, gm + 1, g_day_no + 1];
}

/**
 * Check if a Jalali year is a leap year
 * @param {number} jy - Jalali year
 * @returns {boolean}
 */
export function isJalaliLeap(jy) {
    const breaks = [1, 5, 9, 13, 17, 22, 26, 30];
    return breaks.includes(jy % 33);
}

/**
 * Get number of days in a Jalali month
 * @param {number} jm - month (1-12)
 * @param {number} jy - year (for leap check in month 12)
 * @returns {number}
 */
export function jalaliMonthDays(jm, jy) {
    if (jm <= 6) return 31;
    if (jm <= 11) return 30;
    return isJalaliLeap(jy) ? 30 : 29;
}

function isValidGregorian(gy, gm, gd) {
    return Number.isInteger(gy) && gy >= 1 && gy <= 9999
        && Number.isInteger(gm) && gm >= 1 && gm <= 12
        && Number.isInteger(gd) && gd >= 1 && gd <= 31;
}

/**
 * Parse many common date/time representations into explicit Gregorian parts.
 * Date instances and timestamps use local time; wall-clock strings keep the
 * given parts; anything else (ISO with Z/offset) falls back to `new Date`.
 * @param {Date|number|string|null|undefined} input
 * @returns {{gy:number,gm:number,gd:number,hours:number|null,minutes:number|null}|null}
 */
export function parseDateTimeParts(input) {
    if (input === null || input === undefined || input === '') return null;

    if (input instanceof Date) {
        if (Number.isNaN(input.getTime())) return null;
        return {
            gy: input.getFullYear(),
            gm: input.getMonth() + 1,
            gd: input.getDate(),
            hours: input.getHours(),
            minutes: input.getMinutes(),
        };
    }

    if (typeof input === 'number') {
        if (!Number.isFinite(input)) return null;
        const ms = input < 1e12 ? input * 1000 : input;
        const d = new Date(ms);
        if (Number.isNaN(d.getTime())) return null;
        return {
            gy: d.getFullYear(),
            gm: d.getMonth() + 1,
            gd: d.getDate(),
            hours: d.getHours(),
            minutes: d.getMinutes(),
        };
    }

    if (typeof input !== 'string') return null;

    const str = input.trim();
    if (!str) return null;

    let m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) {
        const gy = Number(m[1]);
        const gm = Number(m[2]);
        const gd = Number(m[3]);
        if (!isValidGregorian(gy, gm, gd)) return null;
        return { gy, gm, gd, hours: null, minutes: null };
    }

    m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})[T ](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
    if (m) {
        const gy = Number(m[1]);
        const gm = Number(m[2]);
        const gd = Number(m[3]);
        const hours = Number(m[4]);
        const minutes = Number(m[5]);
        if (!isValidGregorian(gy, gm, gd)) return null;
        if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
        return { gy, gm, gd, hours, minutes };
    }

    const d = new Date(str);
    if (Number.isNaN(d.getTime())) return null;
    return {
        gy: d.getFullYear(),
        gm: d.getMonth() + 1,
        gd: d.getDate(),
        hours: d.getHours(),
        minutes: d.getMinutes(),
    };
}

function invalidResult(input) {
    if (typeof input === 'string') {
        const str = input.trim();
        if (str && !/^\d{4}-\d{1,2}-\d{1,2}(?:[T ].*)?$/.test(str)) return str;
    }
    return '-';
}

/**
 * Format a Gregorian date (in many representations) to Jalali (YYYY/MM/DD)
 * @param {Date|number|string|null|undefined} input - e.g. "2025-02-06"
 * @returns {string} e.g. "1403/11/18"
 */
export function formatJalaliDate(input) {
    if (input === null || input === undefined || input === '') return '-';
    const parts = parseDateTimeParts(input);
    if (!parts) return invalidResult(input);
    const [jy, jm, jd] = toJalali(parts.gy, parts.gm, parts.gd);
    return `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
}

/**
 * Alias kept for backwards compatibility.
 * @param {Date|number|string|null|undefined} dateStr
 * @returns {string}
 */
export function formatGregorianToJalali(dateStr) {
    return formatJalaliDate(dateStr);
}

/**
 * Format a Gregorian date (in many representations) to human-readable Jalali
 * @param {Date|number|string|null|undefined} input - e.g. "2025-02-06"
 * @returns {string} e.g. "18 بهمن 1403"
 */
export function formatJalaliLong(input) {
    if (input === null || input === undefined || input === '') return '-';
    const parts = parseDateTimeParts(input);
    if (!parts) return invalidResult(input);
    const [jy, jm, jd] = toJalali(parts.gy, parts.gm, parts.gd);
    return `${jd} ${JALALI_MONTHS[jm - 1]} ${jy}`;
}

/**
 * Format a Gregorian date/time (in many representations) to Jalali with time.
 * Time is omitted when the input has no time component (date-only).
 * @param {Date|number|string|null|undefined} input
 * @returns {string} e.g. "1403/11/18 - 14:30"
 */
export function formatJalaliDateTime(input) {
    if (input === null || input === undefined || input === '') return '-';
    const parts = parseDateTimeParts(input);
    if (!parts) return invalidResult(input);
    const [jy, jm, jd] = toJalali(parts.gy, parts.gm, parts.gd);
    const date = `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
    if (parts.hours === null || parts.hours === undefined) return date;
    const hh = String(parts.hours).padStart(2, '0');
    const mm = String(parts.minutes ?? 0).padStart(2, '0');
    return `${date} - ${hh}:${mm}`;
}

/**
 * Get today's date as Jalali [jy, jm, jd]
 * @returns {[number, number, number]}
 */
export function getTodayJalali() {
    const now = new Date();
    return toJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/**
 * Get Jalali month names array
 * @returns {string[]}
 */
export function getJalaliMonths() {
    return [...JALALI_MONTHS];
}
