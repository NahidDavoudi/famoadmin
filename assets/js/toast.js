// toast.js — Modern toast notifications (Uiverse-style, RTL-friendly)

/**
 * Toast types
 * @enum {string}
 */
const ToastType = {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info',
};

/**
 * Per-type palette (border, text, gradient overlay)
 * رنگ‌ها هماهنگ با طراحی سایت (primary #445D84 / accent #8B786D)
 */
const TOAST_PALETTE = {
    [ToastType.SUCCESS]: {
        border: '#16a34a',        // green-600
        text:   '#15803d',        // green-700
        bg:     'linear-gradient(#16a34a1a,#16a34a1a)',
        icon:   'success',
    },
    [ToastType.ERROR]: {
        border: '#f85149',
        text:   '#b22b2b',
        bg:     'linear-gradient(#f851491a,#f851491a)',
        icon:   'error',
    },
    [ToastType.WARNING]: {
        border: '#f59e0b',        // amber-500
        text:   '#b45309',        // amber-700
        bg:     'linear-gradient(#f59e0b1a,#f59e0b1a)',
        icon:   'warning',
    },
    [ToastType.INFO]: {
        border: '#445D84',
        text:   '#3a5170',
        bg:     'linear-gradient(#445D841a,#445D841a)',
        icon:   'info',
    },
};

/**
 * SVG icons as inline strings (no external deps)
 */
const TOAST_ICONS = {
    success: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="24" height="24" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>`,
    error:   `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="24" height="24" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
    warning: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="24" height="24" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
    info:    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="24" height="24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`,
};

const CLOSE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;

/**
 * Toast container (stack)
 */
class ToastContainer {
    constructor() {
        this.toasts = [];
        this.maxToasts = 4;
        this.container = null;
        this.init();
    }

    init() {
        if (document.getElementById('toast-container')) {
            this.container = document.getElementById('toast-container');
            return;
        }

        this.container = document.createElement('div');
        this.container.id = 'toast-container';
        this.container.setAttribute('role', 'region');
        this.container.setAttribute('aria-label', 'اعلان‌ها');
        this.container.setAttribute('aria-live', 'polite');

        Object.assign(this.container.style, {
            position: 'fixed',
            bottom: '16px',
            left: '16px',                 // RTL: پایین-چپ (مطابق سایت‌های فارسی)
            display: 'flex',
            flexDirection: 'column-reverse', // جدیدها پایین‌تر
            gap: '12px',
            zIndex: '9999',
            alignItems: 'flex-start',
            fontFamily: '"Vazirmatn", Tahoma, sans-serif',
            direction: 'rtl',
            pointerEvents: 'none',        // فقط توست‌ها کلیک بگیرن
        });

        document.body.appendChild(this.container);
    }

    /**
     * Show a toast notification
     * @param {string} message
     * @param {Object} options
     * @param {string} [options.type='info']
     * @param {number} [options.duration=5000]
     * @param {boolean} [options.showCloseButton=true]
     * @param {string} [options.actionText]
     * @param {Function} [options.onAction]
     * @returns {HTMLElement}
     */
    show(message, options = {}) {
        const {
            type = ToastType.INFO,
            duration = 5000,
            showCloseButton = true,
            actionText,
            onAction,
        } = options;

        const palette = TOAST_PALETTE[type] || TOAST_PALETTE[ToastType.INFO];
        const iconSvg = TOAST_ICONS[palette.icon] || TOAST_ICONS.info;

        // --- outer wrapper (the "card") ---
        const toast = document.createElement('div');
        toast.setAttribute('role', type === ToastType.ERROR ? 'alert' : 'status');
        toast.style.pointerEvents = 'auto';

        Object.assign(toast.style, {
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            justifyContent: 'center',
            width: '100%',
            maxWidth: '22rem',
            padding: '12px 16px 12px 48px',   // فضای راست برای دکمه بستن
            paddingLeft: '56px',               // فضای چپ (در RTL) برای دکمه
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: '500',
            border: `1px solid ${palette.border}`,
            color: palette.text,
            background: palette.bg,
            transition: 'all 0.5s ease',
            boxShadow: '0 6px 20px -8px rgba(0,0,0,0.15)',
            transform: 'translateX(-120%)',
            opacity: '0',
            lineHeight: '1.6',
        });

        // --- close button (right in RTL → uses `right: 1rem`) ---
        if (showCloseButton) {
            const closeBtn = document.createElement('button');
            closeBtn.type = 'button';
            closeBtn.setAttribute('aria-label', 'بستن اعلان');
            closeBtn.innerHTML = CLOSE_ICON;

            Object.assign(closeBtn.style, {
                position: 'absolute',
                right: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                padding: '4px',
                borderRadius: '6px',
                border: `1px solid ${palette.border}`,
                background: 'transparent',
                color: palette.border,
                opacity: '0.4',
                cursor: 'pointer',
                transition: 'opacity 0.2s ease',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: '0',
            });
            closeBtn.addEventListener('mouseenter', () => closeBtn.style.opacity = '1');
            closeBtn.addEventListener('mouseleave', () => closeBtn.style.opacity = '0.4');
            closeBtn.addEventListener('click', () => this.remove(toast));

            toast.appendChild(closeBtn);
        }

        // --- inner content (icon + text) ---
        const content = document.createElement('p');
        Object.assign(content.style, {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            margin: '0',
            marginRight: 'auto',
            gap: '8px',
            wordBreak: 'break-word',
            textAlign: 'right',
        });

        const iconWrap = document.createElement('span');
        iconWrap.innerHTML = iconSvg;
        Object.assign(iconWrap.style, {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: '0',
            width: '28px',
            height: '28px',
            color: palette.border,
        });
        // سایز آیکون
        const svgEl = iconWrap.querySelector('svg');
        if (svgEl) {
            svgEl.setAttribute('width', '26');
            svgEl.setAttribute('height', '26');
        }

        const messageSpan = document.createElement('span');
        messageSpan.textContent = message;
        messageSpan.style.flex = '1';

        content.appendChild(iconWrap);
        content.appendChild(messageSpan);
        toast.appendChild(content);

        // --- optional action button ---
        if (actionText && typeof onAction === 'function') {
            const actionBtn = document.createElement('button');
            actionBtn.type = 'button';
            actionBtn.textContent = actionText;
            Object.assign(actionBtn.style, {
                marginTop: '8px',
                marginRight: 'auto',
                padding: '4px 12px',
                borderRadius: '6px',
                background: 'transparent',
                color: palette.text,
                border: `1px solid ${palette.border}`,
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'opacity 0.2s ease',
                opacity: '0.85',
            });
            actionBtn.addEventListener('mouseenter', () => actionBtn.style.opacity = '1');
            actionBtn.addEventListener('mouseleave', () => actionBtn.style.opacity = '0.85');
            actionBtn.addEventListener('click', () => {
                try { onAction(); } catch (e) { console.error(e); }
                this.remove(toast);
            });
            toast.appendChild(actionBtn);
        }

        // append + animate in
        this.container.appendChild(toast);

        // Force reflow so transition runs
        // eslint-disable-next-line no-unused-expressions
        toast.offsetHeight;

        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(0)';
            toast.style.opacity = '1';
        });

        // auto-dismiss
        let timer = null;
        if (duration > 0) {
            timer = setTimeout(() => this.remove(toast), duration);
        }

        this.toasts.push({ element: toast, timer });

        // enforce max toasts
        while (this.toasts.length > this.maxToasts) {
            this.remove(this.toasts[0].element);
        }

        return toast;
    }

    /**
     * Remove a toast from the container
     * @param {HTMLElement} toastElement
     */
    remove(toastElement) {
        const entry = this.toasts.find(t => t.element === toastElement);
        if (entry && entry.timer) {
            clearTimeout(entry.timer);
        }

        if (toastElement && toastElement.parentNode) {
            toastElement.style.transform = 'translateX(-120%)';
            toastElement.style.opacity = '0';
            setTimeout(() => {
                if (toastElement.parentNode) {
                    toastElement.parentNode.removeChild(toastElement);
                }
            }, 400);
        }

        this.toasts = this.toasts.filter(t => t.element !== toastElement);
    }

    success(message, options = {}) {
        return this.show(message, { ...options, type: ToastType.SUCCESS });
    }

    error(message, options = {}) {
        return this.show(message, { ...options, type: ToastType.ERROR });
    }

    warning(message, options = {}) {
        return this.show(message, { ...options, type: ToastType.WARNING });
    }

    info(message, options = {}) {
        return this.show(message, { ...options, type: ToastType.INFO });
    }
}

// singleton
const toastContainer = new ToastContainer();
export default toastContainer;

/* ── Convenience helpers (API قبلی حفظ شده) ── */

export function showToast(message, type = ToastType.INFO, duration = 5000) {
    return toastContainer.show(message, { type, duration });
}

export function showSuccessToast(message, duration = 5000) {
    return toastContainer.success(message, { duration });
}

export function showErrorToast(message, duration = 5000) {
    return toastContainer.error(message, { duration });
}

export function showWarningToast(message, duration = 5000) {
    return toastContainer.warning(message, { duration });
}

export function showInfoToast(message, duration = 5000) {
    return toastContainer.info(message, { duration });
}