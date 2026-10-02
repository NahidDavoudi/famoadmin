/**
 * Reusable Jalali (Shamsi) date picker for date inputs.
 * Renders three <select> elements (year / month / day) and keeps a hidden
 * input in sync with a Gregorian "YYYY-MM-DD" value.
 */

import {
    getJalaliMonths,
    getTodayJalali,
    jalaliMonthDays,
    toGregorian,
    toJalali
} from './jalali.js';

const SELECT_CLASS = 'w-full px-3 py-3 border-2 border-gray-200 rounded-xl modern-input text-center jalali-select';
const LABEL_CLASS = 'block text-xs text-gray-400 text-center mt-1';

function pad2(n) {
    return String(n).padStart(2, '0');
}

function createSelect(labelText) {
    const wrap = document.createElement('div');

    const select = document.createElement('select');
    select.className = SELECT_CLASS;

    const label = document.createElement('span');
    label.className = LABEL_CLASS;
    label.textContent = labelText;

    wrap.appendChild(select);
    wrap.appendChild(label);

    return { wrap, select };
}

/**
 * Create (or reuse) a Jalali picker bound to a container + hidden input.
 *
 * @param {Object} options
 * @param {string} options.containerId
 * @param {string} options.hiddenInputId
 * @param {Function} [options.onChange] - called with (gregorian, controller)
 * @param {number} [options.yearsBack=2]
 * @param {number} [options.yearsForward=1]
 * @param {boolean} [options.defaultToToday=true]
 * @returns {Object|null} controller
 */
export function createJalaliPicker({
    containerId,
    hiddenInputId,
    onChange,
    yearsBack = 2,
    yearsForward = 1,
    defaultToToday = true
} = {}) {
    const container = document.getElementById(containerId);
    const hiddenInput = document.getElementById(hiddenInputId);
    if (!container || !hiddenInput) return null;

    // Idempotent: reuse an already-initialized controller.
    if (container.__jalaliPicker) return container.__jalaliPicker;

    const months = getJalaliMonths();
    const [todayYear, todayMonth, todayDay] = getTodayJalali();

    container.innerHTML = '';

    const { wrap: yearWrap, select: yearSelect } = createSelect('سال');
    const { wrap: monthWrap, select: monthSelect } = createSelect('ماه');
    const { wrap: dayWrap, select: daySelect } = createSelect('روز');

    for (let y = todayYear - yearsBack; y <= todayYear + yearsForward; y++) {
        const option = document.createElement('option');
        option.value = String(y);
        option.textContent = y;
        yearSelect.appendChild(option);
    }

    months.forEach((name, index) => {
        const option = document.createElement('option');
        option.value = String(index + 1);
        option.textContent = `${index + 1} - ${name}`;
        monthSelect.appendChild(option);
    });

    container.appendChild(yearWrap);
    container.appendChild(monthWrap);
    container.appendChild(dayWrap);

    function ensureYearOption(jy) {
        if (yearSelect.querySelector(`option[value="${jy}"]`)) return;
        const option = document.createElement('option');
        option.value = String(jy);
        option.textContent = jy;
        yearSelect.appendChild(option);
    }

    function rebuildDays() {
        const jy = parseInt(yearSelect.value, 10);
        const jm = parseInt(monthSelect.value, 10);
        const maxDays = jalaliMonthDays(jm, jy);
        const currentDay = parseInt(daySelect.value, 10) || 1;

        daySelect.innerHTML = '';
        for (let d = 1; d <= maxDays; d++) {
            const option = document.createElement('option');
            option.value = String(d);
            option.textContent = d;
            daySelect.appendChild(option);
        }

        daySelect.value = String(Math.min(currentDay, maxDays));
    }

    function writeGregorian() {
        const jy = parseInt(yearSelect.value, 10);
        const jm = parseInt(monthSelect.value, 10);
        const jd = parseInt(daySelect.value, 10);
        const [gy, gm, gd] = toGregorian(jy, jm, jd);
        const gregorian = `${gy}-${pad2(gm)}-${pad2(gd)}`;
        hiddenInput.value = gregorian;
        if (typeof onChange === 'function') onChange(gregorian, controller);
        return gregorian;
    }

    function setJalali(jy, jm, jd) {
        ensureYearOption(jy);
        yearSelect.value = String(jy);
        monthSelect.value = String(jm);
        rebuildDays();
        const maxDays = jalaliMonthDays(jm, jy);
        daySelect.value = String(Math.min(jd, maxDays));
        return writeGregorian();
    }

    function setGregorian(value) {
        if (!value || typeof value !== 'string') return undefined;
        const parts = value.split('-');
        if (parts.length !== 3) return undefined;
        const [gy, gm, gd] = parts.map(Number);
        if ([gy, gm, gd].some(n => !Number.isFinite(n))) return undefined;
        const [jy, jm, jd] = toJalali(gy, gm, gd);
        return setJalali(jy, jm, jd);
    }

    function setToday() {
        return setJalali(todayYear, todayMonth, todayDay);
    }

    const controller = {
        setToday,
        setGregorian,
        setJalali,
        getGregorian() {
            return hiddenInput.value;
        }
    };

    yearSelect.addEventListener('change', () => {
        rebuildDays();
        writeGregorian();
    });
    monthSelect.addEventListener('change', () => {
        rebuildDays();
        writeGregorian();
    });
    daySelect.addEventListener('change', writeGregorian);

    Object.defineProperty(container, '__jalaliPicker', {
        value: controller,
        enumerable: false,
        configurable: true
    });

    if (defaultToToday) {
        setToday();
    } else {
        yearSelect.value = String(todayYear);
        monthSelect.value = String(todayMonth);
        rebuildDays();
    }

    return controller;
}
