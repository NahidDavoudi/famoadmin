/**
 * Global Click Guard — anti-double-click + auto-loading for ALL buttons.
 *
 * این ماژول دو قابلیت فراهم می‌کند:
 *   1. `installClickGuard()` — یک capture-phase listener سراسری نصب می‌کند که:
 *      - دکمه‌ای که اخیراً کلیک شده را ذخیره می‌کند (برای استفاده در `withTriggeredButton`).
 *      - کلیک روی عناصری که در حالت loading هستند را بلاک می‌کند (ضد double-click).
 *
 *   2. `withTriggeredButton(operation, loadingText)` — برای handlerهایی که دکمه‌ی
 *      محرک را مستقیم در دسترس ندارند (مثل `onclick="loadStudents(1)"`).
 *      دکمه‌ی محرک را به‌صورت خودکار پیدا می‌کند و روی آن loading نشان می‌دهد.
 *
 * این ماژول در کنار `withButtonLoading` (از utils.js) کار می‌کند:
 *   - دکمه‌هایی که مستقیم با `withButtonLoading` کار می‌کنند: loading + anti-double-click دارند.
 *   - handlerهایی که با onclick صدا زده می‌شوند: از `withTriggeredButton` استفاده می‌کنند.
 *   - listener سراسری: جلوی double-click روی هر دکمه‌ای که در loading است را می‌گیرد.
 *
 * `installClickGuard()` باید یک‌بار هنگام startup صدا زده شود (از `events.js init()`).
 */

import { setButtonLoading } from './utils.js';

// دکمه‌ای که اخیراً کلیک شده (توسط capture-phase listener ست می‌شود).
let lastTriggerButton = null;

/**
 * نصب guard سراسری کلیک. یک‌بار در startup صدا زده شود.
 *
 * capture-phase listener:
 *   1. آخرین دکمه‌ی کلیک‌شده را ذخیره می‌کند.
 *   2. کلیک روی عناصر در حالت loading را متوقف می‌کند (anti-double-click).
 */
export function installClickGuard() {
    if (window.__clickGuardInstalled) return;
    window.__clickGuardInstalled = true;

    document.addEventListener('click', (e) => {
        const target = e.target.closest(
            'button, [role="button"], input[type="submit"], [data-trigger]'
        );
        if (!target) return;

        // Anti-double-click: کلیک روی عنصر در حالت loading را متوقف کن
        if (target.dataset.loading === '1') {
            e.preventDefault();
            e.stopImmediatePropagation();
            return;
        }

        // ذخیره‌ی دکمه‌ی محرک برای استفاده در withTriggeredButton
        lastTriggerButton = target;
    }, true); // capture phase — قبل از onclick handlers اجرا می‌شود
}

/**
 * دکمه‌ای که آخرین کلیک روی آن انجام شده.
 * null برمی‌گرداند اگر دکمه‌ای ثبت نشده یا از DOM حذف شده باشد.
 */
export function triggerButton() {
    const btn = lastTriggerButton;
    if (btn && document.contains(btn)) return btn;
    return null;
}

/**
 * اجرای یک عملیات async با loading روی دکمه‌ی محرک.
 * اگر دکمه از قبل در loading است (مثلاً via withButtonLoading در caller)،
 * فقط عملیات را اجرا می‌کند و visual را تغییر نمی‌دهد.
 *
 * @param {Function} operation - تابع async برای اجرا
 * @param {string} loadingText - متن نمایش داده شده در حالت loading
 * @returns {Promise<*>} نتیجه‌ی operation
 *
 * @example
 * export async function loadStudents(page = 1) {
 *     return withTriggeredButton(async () => {
 *         // ... body of loadStudents ...
 *     }, 'در حال بارگذاری...');
 * }
 */
export async function withTriggeredButton(operation, loadingText = 'در حال انجام...') {
    const btn = triggerButton();
    // پاک‌سازی فوری تا callهای تودرتو از همین دکمه استفاده نکنند
    lastTriggerButton = null;

    // اگر دکمه از قبل loading است (مثلاً caller از withButtonLoading استفاده کرده)
    // فقط operation را اجرا کن
    if (btn && btn.dataset.loading === '1') {
        return operation();
    }

    const cleanup = btn ? setButtonLoading(btn, true, loadingText) : () => {};
    try {
        return await operation();
    } finally {
        cleanup();
    }
}

/**
 * wrap یک click handler async با loading + anti-double-click.
 * برای زمانی که event listener مستقیم bind می‌کنید (نه onclick).
 *
 * @param {Function} handler - async event handler
 * @param {string} loadingText - متن loading
 * @returns {Function} wrapped handler
 *
 * @example
 * const btn = document.getElementById('myBtn');
 * btn.addEventListener('click', guardClick(async (e) => {
 *     await doSomething();
 * }, 'در حال انجام...'));
 */
export function guardClick(handler, loadingText = 'در حال انجام...') {
    return async function (e, ...args) {
        const btn = e?.currentTarget || e?.target?.closest('button, [role="button"]');
        if (btn?.dataset?.loading === '1') return;

        const cleanup = btn ? setButtonLoading(btn, true, loadingText) : () => {};
        try {
            return await handler.call(this, e, ...args);
        } finally {
            cleanup();
        }
    };
}
