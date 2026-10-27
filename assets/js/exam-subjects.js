/**
 * Admin Panel - دروس خودکار بر اساس رشته‌ی دانش‌آموز (Exam Entry)
 *
 * وقتی در صفحه‌ی «ثبت نتایج آزمون» یک دانش‌آموز انتخاب می‌شود، ردیف‌های درس
 * به‌صورت خودکار و بر اساس رشته (field) او ساخته می‌شوند.
 *
 * ── ویرایش آسان ──
 * فقط جدول SUBJECTS_BY_FIELD را تغییر بدهید. کلیدها همان مقادیر <option value>
 * فیلد «رشته» در فرم دانش‌آموز هستند: ریاضی | تجربی | انسانی | راهنمایی
 *
 * رفتار پیش‌فرض (غیرمخرب):
 *   - اگر ردیف‌ها خالی باشند → مستقیم جایگزین می‌شوند.
 *   - اگر کاربر نمره‌ای وارد کرده باشد → قبل از جایگزینی تأیید گرفته می‌شود.
 *   - اگر رشته ناشناخته باشد → هیچ ردیفی پاک/اضافه نمی‌شود، فقط اطلاع‌رسانی.
 */

/** @type {Record<string, string[]>} */
export const SUBJECTS_BY_FIELD = {
    'تجربی': ['زیست', 'ریاضی', 'فیزیک', 'شیمی'],
    'ریاضی': ['ریاضی', 'فیزیک', 'شیمی', 'گسسته', 'هندسه'],
    'انسانی': [
        'فنون ادبی', 'ریاضی', 'عربی', 'تاریخ',
        'جغرافیا', 'جامعه شناسی', 'روانشناسی', 'فلسفه',
    ],
    'راهنمایی': [
        'ریاضی', 'فارسی', 'عربی',
        'علوم (فیزیک)', 'علوم (زیست)', 'علوم (شیمی)',
    ],
};

/**
 * نام‌های جایگزین/رایج برای رشته‌ها.
 * کلید و مقدار هر دو نرمال‌سازی می‌شوند (بدون فاصله و نیم‌فاصله).
 */
const FIELD_ALIASES = {
    'ریاضیفیزیک': 'ریاضی',
    'ریاضیفیزیک': 'ریاضی',
    'علومریاضی': 'ریاضی',
    'علومتجربی': 'تجربی',
    'تجربی': 'تجربی',
    'علومانسانی': 'انسانی',
    'ادبیاتوعلومانسانی': 'انسانی',
    'انسانی': 'انسانی',
    'راهنمایی': 'راهنمایی',
    'متوسطهاول': 'راهنمایی',
    'متوسطهاول': 'راهنمایی',
    'هفتم': 'راهنمایی',
    'هشتم': 'راهنمایی',
    'نهم': 'راهنمایی',
};

/** حذف فاصله/نیم‌فاصله/تیره برای مقایسه‌ی امن */
function squash(value) {
    return String(value ?? '')
        .replace(/[\u200c\u200f\u200e]/g, '')   // نیم‌فاصله و کاراکترهای جهت
        .replace(/[\s_\-–—]/g, '')
        .trim();
}

/**
 * رشته را به یکی از کلیدهای SUBJECTS_BY_FIELD تبدیل می‌کند.
 * @param {string} field
 * @returns {string|null}
 */
export function normalizeField(field) {
    const key = squash(field);
    if (!key) return null;

    for (const canonical of Object.keys(SUBJECTS_BY_FIELD)) {
        if (squash(canonical) === key) return canonical;
    }
    return FIELD_ALIASES[key] || null;
}

/**
 * لیست دروس یک دانش‌آموز را برمی‌گرداند.
 *
 * @param {{field?: string, grade?: number|string}} student
 * @returns {{field: string|null, subjects: string[]}}
 */
export function subjectsForStudent(student = {}) {
    const field = normalizeField(student.field);

    // پایه‌های ۷ تا ۹ (متوسطه اول) عملاً همان دروس راهنمایی را دارند؛
    // اگر رشته خالی بود از پایه استفاده می‌کنیم.
    if (!field) {
        const grade = Number(student.grade);
        if (grade >= 7 && grade <= 9) {
            return { field: 'راهنمایی', subjects: [...SUBJECTS_BY_FIELD['راهنمایی']] };
        }
        return { field: null, subjects: [] };
    }

    return { field, subjects: [...SUBJECTS_BY_FIELD[field]] };
}

/** لیست دروس فعلی داخل کانتینر (برای مقایسه و جلوگیری از بازنویسی بی‌مورد) */
export function currentSubjects(container) {
    if (!container) return [];
    return [...container.querySelectorAll('.subject-row [data-field="subject"]')]
        .map(input => (input.value || '').trim())
        .filter(Boolean);
}

/**
 * آیا کاربر نمره/مبحثی وارد کرده است؟
 * نام درس‌های پیش‌فرض را «داده» حساب نمی‌کنیم تا تغییر رشته بدون مزاحمت ممکن باشد.
 *
 * @param {HTMLElement} container
 * @returns {boolean}
 */
export function hasEnteredScores(container) {
    if (!container) return false;
    const fields = ['total_q', 'correct', 'wrong', 'chapter'];
    const selector = fields.map(f => `[data-field="${f}"]`).join(',');
    return [...container.querySelectorAll(selector)]
        .some(el => String(el.value ?? '').trim() !== '');
}

/**
 * ردیف‌ها را با لیست داده‌شده از نو می‌سازد.
 * از همان <template id="subjectRowTemplate"> استفاده می‌کند تا مارک‌آپ یکسان بماند.
 *
 * @param {string[]} subjects
 * @param {{container?: HTMLElement, template?: HTMLTemplateElement}} [opts]
 * @returns {number} تعداد ردیف ساخته‌شده
 */
export function buildSubjectRows(subjects, opts = {}) {
    const container = opts.container || document.getElementById('subjectsContainer');
    const template = opts.template || document.getElementById('subjectRowTemplate');
    if (!container || !template || !Array.isArray(subjects) || subjects.length === 0) return 0;

    container.innerHTML = '';

    const frag = document.createDocumentFragment();
    subjects.forEach((name) => {
        const clone = template.content.cloneNode(true);
        const input = clone.querySelector('[data-field="subject"]');
        if (input) input.value = name;
        frag.appendChild(clone);
    });
    container.appendChild(frag);

    container.querySelectorAll('.subject-row .subject-number')
        .forEach((el, index) => { el.textContent = index + 1; });

    return subjects.length;
}

/** پیام وضعیت بالای کانتینر دروس (یک‌بار ساخته می‌شود) */
function noticeEl() {
    let el = document.getElementById('subjectsAutoFillNote');
    if (el) return el;

    el = document.createElement('div');
    el.id = 'subjectsAutoFillNote';
    el.className = 'hidden mb-3 px-3 py-2 rounded-xl text-sm';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.style.cssText = 'display:none;margin-bottom:12px;padding:8px 12px;border-radius:12px;'
        + 'font-size:13px;line-height:1.9;';

    const container = document.getElementById('subjectsContainer');
    if (container && container.parentElement) {
        container.parentElement.insertBefore(el, container);
    } else {
        document.body.appendChild(el);
    }
    return el;
}

/**
 * نمایش/پنهان کردن پیام وضعیت.
 * @param {{text?: string, tone?: 'info'|'success'|'warning', action?: {label: string, onClick: Function}}} state
 */
export function setNotice(state = {}) {
    const el = noticeEl();
    el.innerHTML = '';

    if (!state.text) {
        el.style.display = 'none';
        el.classList.add('hidden');
        return;
    }

    const tones = {
        info: 'background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe',
        success: 'background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0',
        warning: 'background:#fffbeb;color:#b45309;border:1px solid #fde68a',
    };
    el.style.cssText = 'display:block;margin-bottom:12px;padding:8px 12px;border-radius:12px;'
        + 'font-size:13px;line-height:1.9;'
        + (tones[state.tone] || tones.info);

    const text = document.createElement('span');
    text.textContent = state.text;
    el.appendChild(text);

    if (state.action?.label) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = state.action.label;
        btn.style.cssText = 'margin-inline-start:10px;padding:2px 10px;border-radius:8px;'
            + 'border:1px solid currentColor;background:transparent;color:inherit;'
            + 'font:inherit;font-size:12px;cursor:pointer';
        btn.addEventListener('click', state.action.onClick);
        el.appendChild(btn);
    }
}

/**
 * دروس دانش‌آموز را در فرم اعمال می‌کند.
 *
 * @param {{id?: number|string, name?: string, grade?: number|string, field?: string}} student
 * @param {{container?: HTMLElement, confirmFn?: (message: string) => boolean, silent?: boolean}} [opts]
 * @returns {{field: string|null, subjects: string[], applied: boolean}}
 */
export function applySubjectsForStudent(student = {}, opts = {}) {
    const confirmFn = opts.confirmFn
        || (typeof window !== 'undefined' && typeof window.confirm === 'function'
            ? window.confirm.bind(window)
            : () => true);

    const container = opts.container || document.getElementById('subjectsContainer');
    const { field, subjects } = subjectsForStudent(student);

    if (!field || subjects.length === 0) {
        if (!opts.silent) {
            setNotice({
                tone: 'warning',
                text: `رشته‌ی «${student.field || 'نامشخص'}» در فهرست دروس خودکار نیست؛ دروس را دستی اضافه کنید.`,
            });
        }
        return { field: null, subjects: [], applied: false };
    }

    const already = currentSubjects(container);
    const sameList = already.length === subjects.length
        && already.every((name, i) => name === subjects[i]);

    if (sameList) {
        if (!opts.silent) {
            setNotice({
                tone: 'success',
                text: `دروس رشته ${field} (${subjects.length} درس) آماده است.`,
            });
        }
        return { field, subjects, applied: false };
    }

    if (hasEnteredScores(container)) {
        const ok = confirmFn(
            `نمرات وارد شده پاک شود و دروس رشته ${field} (${subjects.length} درس) ساخته شود؟`
        );
        if (!ok) {
            setNotice({
                tone: 'info',
                text: `دروس فعلی حفظ شد. برای ساخت دروس رشته ${field}، دکمه‌ی «بازچینش دروس» را بزنید.`,
                action: {
                    label: 'بازچینش دروس',
                    onClick: () => applySubjectsForStudent(student, { ...opts, confirmFn: () => true }),
                },
            });
            return { field, subjects, applied: false };
        }
    }

    const count = buildSubjectRows(subjects, { container });

    // silent → بدون پیام (مثلاً هنگام ریست فرم)
    if (!opts.silent) {
        setNotice({
            tone: 'success',
            text: `دروس رشته ${field} به‌صورت خودکار اضافه شد (${count} درس).`,
            action: {
                label: 'بازچینش',
                onClick: () => applySubjectsForStudent(student, { ...opts, confirmFn: () => true }),
            },
        });
    }

    return { field, subjects, applied: count > 0 };
}
