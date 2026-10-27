/**
 * توابع فرار (escape) امن برای HTML — مشترک بین فرانت‌اند
 * HTML escape helper for safe rendering
 */

/**
 * فرار کاراکترهای خطرناک برای محتوای HTML (متن داخل تگ).
 * HTML-escape a string for use as element text content.
 *
 * @param {string} text
 * @returns {string}
 */
export function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * فرار کاراکترها برای استفاده در مقدار attribute (مثل src، alt، class).
 * Attribute-escape a string for safe use inside HTML attributes.
 *
 * @param {string} text
 * @returns {string}
 */
export function escapeAttr(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
