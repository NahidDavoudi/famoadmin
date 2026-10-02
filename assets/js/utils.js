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
        const spinner = '<span class="inline-block w-4 h-4 border-2 rounded-full animate-spin" style="border-color: currentColor; border-top-color: transparent;"></span>';

        // Set loading state
        btn.disabled = true;
        btn.setAttribute('aria-busy', 'true');
        btn.innerHTML = (spinnerOnly || !loadingText) ? spinner : `${spinner}<span class="mr-2">${loadingText}</span>`;

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
