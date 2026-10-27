/**
 * Admin Panel - نوار پیشرفت آپلود (Upload Progress)
 *
 * یک کامپوننت مشترک برای نمایش وضعیت آپلود فایل در همه فرم‌ها.
 * نوار به‌صورت خودکار زیر فیلد فایل ساخته می‌شود؛ نیازی به تغییر index.php نیست.
 *
 * دو حالت استفاده:
 *
 *  1) خودکار (توصیه‌شده):
 *       await uploadFormWithProgress(form, `${API.base}/courses/${id}`, fd, { method: 'PUT' });
 *
 *  2) دستی (وقتی خودت uploadWithProgress را صدا می‌زنی):
 *       const bar = ensureUploadProgress(form);
 *       await uploadWithProgress(url, fd, {
 *           method: 'PUT',
 *           onProgress: (pct, phase) => updateUploadProgress(bar, pct, phase),
 *       });
 *       resetUploadProgress(bar);
 *
 * نکته: پیشرفت آپلود فقط با XHR قابل اندازه‌گیری است (fetch رویداد progress آپلود ندارد)،
 * به همین دلیل از `uploadWithProgress` در utils.js استفاده می‌کنیم، نه از API.upload (که fetch است).
 */

import { uploadWithProgress } from './utils.js';

const PHASE_LABEL = {
    uploading: 'در حال آپلود فایل…',
    processing: 'آپلود شد — در حال پردازش روی سرور…',
    done: 'انجام شد',
    error: 'آپلود ناموفق بود',
};

/**
 * نوار پیشرفت را برای یک فرم می‌سازد (اگر نبود) و برمی‌گرداند.
 * زیر نزدیک‌ترین .form-group فیلد فایل درج می‌شود؛ اگر فیلد فایل نبود، انتهای فرم.
 *
 * @param {HTMLFormElement} form
 * @param {{ id?: string, anchor?: HTMLElement }} [opts]
 * @returns {HTMLElement|null}
 */
export function ensureUploadProgress(form, opts = {}) {
    if (!form) return null;

    const id = opts.id || `${form.id || 'form'}UploadProgress`;
    const existing = document.getElementById(id);
    if (existing) return existing;

    const wrap = document.createElement('div');
    wrap.id = id;
    wrap.className = 'upload-progress hidden mt-3';
    wrap.setAttribute('role', 'status');
    wrap.setAttribute('aria-live', 'polite');
    wrap.innerHTML = `
        <div class="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div data-role="fill"
                 class="h-full bg-primary rounded-full transition-all duration-150"
                 style="width:0%"></div>
        </div>
        <p data-role="text" class="text-xs text-gray-500 mt-1 text-center">0%</p>
    `;

    const fileInput = form.querySelector('input[type="file"]');
    const anchor = opts.anchor
        || fileInput?.closest('.form-group')
        || fileInput?.parentElement
        || form.querySelector('.modal-body')
        || form;
    anchor.insertAdjacentElement('afterend', wrap);

    return wrap;
}

/**
 * نوار را به‌روزرسانی می‌کند.
 *
 * @param {HTMLElement|null} wrap - خروجی ensureUploadProgress
 * @param {number} pct - درصد ۰ تا ۱۰۰
 * @param {'uploading'|'processing'|'done'|'error'} [phase='uploading']
 */
export function updateUploadProgress(wrap, pct, phase = 'uploading') {
    if (!wrap) return;

    wrap.classList.remove('hidden');

    const fill = wrap.querySelector('[data-role="fill"]');
    const text = wrap.querySelector('[data-role="text"]');
    const value = Math.max(0, Math.min(100, Math.round(Number(pct) || 0)));

    if (fill) {
        fill.style.width = `${value}%`;
        fill.classList.toggle('bg-red-500', phase === 'error');
        fill.classList.toggle('bg-primary', phase !== 'error');
    }
    if (text) {
        text.textContent = phase === 'processing' || phase === 'done' || phase === 'error'
            ? (PHASE_LABEL[phase] || `${value}%`)
            : `${PHASE_LABEL.uploading} ${value}%`;
        text.classList.toggle('text-red-500', phase === 'error');
    }
}

/** نوار را پنهان و صفر می‌کند. */
export function resetUploadProgress(wrap) {
    if (!wrap) return;
    wrap.classList.add('hidden');
    const fill = wrap.querySelector('[data-role="fill"]');
    const text = wrap.querySelector('[data-role="text"]');
    if (fill) fill.style.width = '0%';
    if (text) text.textContent = '0%';
}

/**
 * چک سریع حجم فایل سمت کلاینت — جلوی آپلود بی‌فایده‌ی فایل بزرگ را می‌گیرد
 * (وگرنه کاربر تا ۱۰۰٪ نوار را می‌بیند و بعد خطای 413 می‌گیرد).
 *
 * @param {File|null|undefined} file
 * @param {number} maxSizeMB
 * @returns {Error|null} خطای آماده‌ی نمایش، یا null
 */
export function fileSizeError(file, maxSizeMB = 10) {
    if (!file || !maxSizeMB) return null;
    if (file.size > maxSizeMB * 1024 * 1024) {
        const mb = (file.size / (1024 * 1024)).toFixed(1);
        return new Error(`حجم فایل ${mb} مگابایت است؛ حداکثر مجاز ${maxSizeMB} مگابایت.`);
    }
    return null;
}

/**
 * آپلود FormData همراه با نوار پیشرفت خودکار.
 * خطا را دوباره throw می‌کند تا caller بتواند showAlert بزند.
 *
 * @param {HTMLFormElement} form - فرمی که نوار زیرش ساخته می‌شود
 * @param {string} url - آدرس کامل endpoint
 * @param {FormData} formData
 * @param {{ method?: 'POST'|'PUT'|'PATCH', anchor?: HTMLElement, id?: string, minVisibleMs?: number, maxSizeMB?: number, file?: File }} [opts]
 *        anchor: عنصری که نوار بعد از آن درج می‌شود (پیش‌فرض: نزدیک‌ترین .form-group فیلد فایل)
 *        maxSizeMB: اگر ست شود، حجم فایل قبل از شروع آپلود بررسی می‌شود
 * @returns {Promise<{status:number, body:any}>}
 */
export async function uploadFormWithProgress(form, url, formData, {
    method = 'POST',
    anchor,
    id,
    minVisibleMs = 900,
    maxSizeMB = 0,
    file = null,
} = {}) {
    // اعتبارسنجی حجم قبل از شروع — نوار ساخته نمی‌شود اگر فایل از اول رد شود
    const sizeError = fileSizeError(file, maxSizeMB);
    if (sizeError) throw sizeError;

    const bar = ensureUploadProgress(form, { anchor, id });

    try {
        const result = await uploadWithProgress(url, formData, {
            method,
            onProgress: (pct, phase) => updateUploadProgress(bar, pct, phase),
        });
        updateUploadProgress(bar, 100, 'done');
        return result;
    } catch (error) {
        updateUploadProgress(bar, 100, 'error');
        throw error;
    } finally {
        // نوار را کوتاه‌مدت نگه می‌داریم تا کاربر بازخورد ببیند، بعد پاک می‌کنیم
        setTimeout(() => resetUploadProgress(bar), Math.max(900, minVisibleMs));
    }
}
