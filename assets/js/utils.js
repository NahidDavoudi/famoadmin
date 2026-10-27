/**
 * Admin Panel - Utilities (re-export ui-helpers + form helpers)
 */

export { showModal, hideModal, showAlert, escapeHtml, formatDate } from './ui-helpers.js';

export { showConfirm } from './confirm-modal.js';
export { confirmAction } from './confirm-modal.js';
export { confirmDelete } from './confirm-modal.js';

export function getElementValue(id) {
    const element = document.getElementById(id);
    return element ? element.value : '';
}

export function setFormValues(form, values) {
    Object.entries(values).forEach(([key, value]) => {
        const input = form.querySelector(`[name="${key}"]`);
        if (input) input.value = value;
    });
}

export function setElementValue(selector, value) {
    const element = document.querySelector(selector);
    if (element) element.value = value;
}

export function updateStatElement(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value || 0;
}

export function toggleElement(id, show) {
    const element = document.getElementById(id);
    if (element) {
        element.classList.toggle('hidden', !show);
    }
}

export function icon(name, className = 'icon') {
    const lucide = window.famoLucideName ? window.famoLucideName(`icon-${name}`) : name;
    return `<i data-lucide="${lucide}" class="${className}" aria-hidden="true"></i>`;
}

/**
 * اسپینر با استایل تماماً inline.
 *
 * چرا inline؟ اسپینر قبلی فقط با کلاس‌های Tailwind ساخته می‌شد
 * (`inline-block w-4 h-4 border-2 rounded-full animate-spin`). این کلاس‌ها فقط
 * داخل رشته‌های JS وجود دارند و در index.php نیستند؛ اگر css/output.css یک build
 * purge‌شده‌ی Tailwind باشد، کلاس `inline-block` در آن نیست → <span> به‌صورت
 * display:inline می‌ماند، width/height نادیده گرفته می‌شود و **اسپینر نامرئی**
 * می‌شود (دکمه انگار هیچ لودینگی ندارد). استایل inline این وابستگی را حذف می‌کند.
 *
 * @returns {string} HTML اسپینر
 */
export function spinnerHtml() {
    return '<span aria-hidden="true" style="'
        + 'display:inline-block;'
        + 'width:16px;height:16px;'
        + 'border:2px solid currentColor;'
        + 'border-top-color:transparent;'
        + 'border-radius:50%;'
        + 'vertical-align:-3px;'
        + 'animation:famo-spin .7s linear infinite;'
        + '"></span>';
}

// برای عیب‌یابی از کنسول: window.__famoSpinner
if (typeof window !== 'undefined') window.__famoSpinner = spinnerHtml();

function resolveButton(button) {
    return typeof button === 'string' ? document.querySelector(button) : button;
}

function restoreButton(btn) {
    if (!btn) return;
    if (btn.dataset.originalText !== undefined) {
        btn.disabled = btn.dataset.originalDisabled === 'true';
        btn.innerHTML = btn.dataset.originalText;
        delete btn.dataset.originalText;
        delete btn.dataset.originalDisabled;
    }
    delete btn.dataset.loading;
    btn.removeAttribute('aria-busy');
}


// keyframes اسپینر — یک‌بار تزریق می‌شود تا به Tailwind (animate-spin) وابسته نباشیم
if (typeof document !== 'undefined' && !document.getElementById('famo-spin-keyframes')) {
    const style = document.createElement('style');
    style.id = 'famo-spin-keyframes';
    style.textContent = '@keyframes famo-spin{to{transform:rotate(360deg)}}'
        + '@media (prefers-reduced-motion: reduce){[style*="famo-spin"]{animation-duration:2.4s}}';
    document.head.appendChild(style);
}

/**
 * Resolve the submit button associated with a form.
 * Modal forms often place the submit button outside the <form> and link it
 * via the `form="<id>"` attribute, so `form.querySelector` is not enough.
 * @param {HTMLFormElement} form
 * @returns {HTMLElement|null}
 */
export function getFormSubmitButton(form) {
    if (!form) return null;
    return form.querySelector('[type="submit"]')
        || (form.id ? document.querySelector(`button[type="submit"][form="${form.id}"]`) : null);
}

/**
 * Set loading state on a button
 * @param {HTMLElement|string} button - Button element or selector
 * @param {boolean} isLoading - Whether to show loading state
 * @param {string} loadingText - Text to show during loading
 * @returns {Function} Cleanup function to restore button state
 */
export function setButtonLoading(button, isLoading = true, loadingText = 'در حال انجام...') {
    const btn = resolveButton(button);
    if (!btn) return () => { };

    if (isLoading) {
        // Already loading: keep the current state and return a no-op cleanup
        if (btn.dataset.loading === '1') return () => { };

        // Store original state
        btn.dataset.originalText = btn.innerHTML;
        btn.dataset.originalDisabled = btn.disabled;
        btn.dataset.loading = '1';

        // Icon-only buttons get a spinner without any text
        const spinnerOnly = !btn.textContent.trim();
        const spinner = spinnerHtml();

        // Set loading state
        btn.disabled = true;
        btn.setAttribute('aria-busy', 'true');
        btn.innerHTML = (spinnerOnly || !loadingText)
            ? spinner
            : `${spinner}<span style="margin-inline-start:8px">${loadingText}</span>`;

        // Return cleanup function
        return () => restoreButton(btn);
    } else {
        restoreButton(btn);
        return () => { };
    }
}

/**
 * Wrap an async operation with loading state
 * @param {HTMLElement|string} button - Button element or selector
 * @param {Function} operation - Async operation to perform
 * @param {string} loadingText - Text to show during loading
 * @returns {Promise} Result of the operation
 */
export async function withButtonLoading(button, operation, loadingText = 'در حال انجام...') {
    const btn = resolveButton(button);

    // Guard against duplicate triggers while an operation is in flight
    if (btn && btn.dataset.loading === '1') return undefined;

    const cleanup = setButtonLoading(btn, true, loadingText);

    try {
        const result = await operation();
        return result;
    } finally {
        cleanup();
    }
}

// upload.js
/**
 * آپلود فایل با progress event (fetch پشتیبانی نمی‌کند → XHR).
 * @param {string} url           آدرس کامل endpoint (API.base + path)
 * @param {FormData} formData
 * @param {Object} [opts]
 * @param {'POST'|'PUT'|'PATCH'} [opts.method='POST']
 * @param {(pct:number, phase:'uploading'|'processing') => void} [opts.onProgress]
 * @param {AbortSignal} [opts.signal]
 * @returns {Promise<{status:number, body:any}>}
 */
export function uploadWithProgress(url, formData, { method = 'POST', onProgress, signal } = {}) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(method, url, true);
        // کوکی‌های احراز هویت (famo_jwt) ارسال شوند
        xhr.withCredentials = true;
        // ⚠️ Content-Type را دستی set نکنید؛ مرورگر boundary را می‌سازد
        xhr.setRequestHeader('Accept', 'application/json');

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                onProgress?.(Math.round((e.loaded / e.total) * 100), 'uploading');
            }
        };
        // ۱۰۰٪ ارسال ≠ پایان کار؛ سرور دارد پردازش می‌کند
        xhr.upload.onload = () => onProgress?.(100, 'processing');

        xhr.onload = () => {
            let body = null;
            try { body = JSON.parse(xhr.responseText); } catch { body = xhr.responseText; }
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve({ status: xhr.status, body });
            } else {
                const message = body?.error?.message || `HTTP ${xhr.status}`;
                const err = new Error(message);
                err.status = xhr.status;
                err.code = body?.error?.code;
                reject(err);
            }
        };
        xhr.onerror = () => reject(new Error('خطای شبکه در آپلود'));
        xhr.onabort = () => reject(new DOMException('آپلود لغو شد', 'AbortError'));
        signal?.addEventListener('abort', () => xhr.abort());

        xhr.send(formData);
    });
}
