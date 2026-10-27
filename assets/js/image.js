/**
 * رندر آواتار/تصویر با fallback امن
 * Avatar image with safe fallback when src is missing or fails to load.
 */

import { escapeAttr, escapeHtml } from './htmlEscape.js';

/**
 * Placeholder پیش‌فرض برای زمانی که تصویر موجود نیست.
 * Default placeholder shown when no avatar is set.
 *
 * @param {string} iconSize - کلاس‌های اندازه آیکون lucide (مثل 'w-10 h-10')
 * @returns {string} HTML
 */
export function renderImagePlaceholder(iconSize = 'w-10 h-10') {
    return `<div class="image-fallback w-full h-full flex items-center justify-center text-muted/40">
    <i data-lucide="image" class="${iconSize}" aria-hidden="true"></i>
  </div>`;
}

/**
 * رندر تصویر با fallback در صورت خطای بارگذاری.
 * Renders an <img> with a graceful fallback when the image is missing or fails.
 *
 * @param {Object} options
 * @param {string} options.src - URL تصویر (خالی = فقط placeholder)
 * @param {string} options.alt - متن جایگزین
 * @param {string} options.imgClass - کلاس‌های تصویر (پیش‌فرض: w-full h-full object-cover)
 * @param {string} options.iconSize - اندازه آیکون placeholder
 * @returns {string} HTML
 */
export function renderImageWithFallback({
    src = '',
    alt = '',
    imgClass = 'w-full h-full object-cover',
    iconSize = 'w-10 h-10',
}) {
    const safeAlt = escapeAttr(alt);
    const safeSrc = escapeAttr(src);
    if (!src) return renderImagePlaceholder(iconSize);

    return `<img src="${safeSrc}" alt="${safeAlt}" class="${imgClass}"
    onerror="this.classList.add('hidden');this.parentElement.querySelector('.image-fallback')?.classList.remove('hidden')">
  <div class="image-fallback hidden absolute inset-0 flex items-center justify-center text-muted/40 bg-[#f5f5f7]">
    <i data-lucide="image" class="${iconSize}" aria-hidden="true"></i>
  </div>`;
}
