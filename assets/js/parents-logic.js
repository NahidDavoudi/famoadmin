/**
 * Admin Panel - Parent contacts pure logic (no DOM, no API)
 * منطق خالص مخاطبان والدین
 */

export const RELATIONSHIPS = ['father', 'mother', 'guardian', 'other'];

export const RELATIONSHIP_LABELS = {
    father: 'پدر',
    mother: 'مادر',
    guardian: 'سرپرست',
    other: 'سایر'
};

export function relationshipLabel(value) {
    return RELATIONSHIP_LABELS[value] || value || '';
}

export function isPrimary(value) {
    return value === 1 || value === '1' || value === true;
}

export function isAdmin(role) {
    return role === 'admin';
}

function has(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
}

function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim() !== '';
}

function isBooleanish(value) {
    return value === true || value === false || value === 0 || value === 1 || value === '0' || value === '1';
}

function stringLength(value) {
    return [...value.trim()].length;
}

export function validateParentContact(data, { creating } = {}) {
    const body = data && typeof data === 'object' ? data : {};

    if (creating && !isNonEmptyString(body.parent_name)) {
        return { field: 'parent_name', message: 'نام والد الزامی است' };
    }
    if (creating && !RELATIONSHIPS.includes(body.relationship)) {
        return { field: 'relationship', message: 'نسبت والد نامعتبر است' };
    }
    if (creating && !isNonEmptyString(body.phone)) {
        return { field: 'phone', message: 'شماره تماس الزامی است' };
    }
    if (!creating && Object.keys(body).length === 0) {
        return { field: null, message: 'حداقل یک فیلد برای ویرایش الزامی است' };
    }

    if (has(body, 'parent_name') && !isNonEmptyString(body.parent_name)) {
        return { field: 'parent_name', message: 'نام والد نمیتواند خالی باشد' };
    }
    if (has(body, 'relationship') && !RELATIONSHIPS.includes(body.relationship)) {
        return { field: 'relationship', message: 'نسبت والد نامعتبر است' };
    }
    if (has(body, 'phone') && !isNonEmptyString(body.phone)) {
        return { field: 'phone', message: 'شماره تماس نمیتواند خالی باشد' };
    }
    if (has(body, 'phone') && body.phone != null && stringLength(body.phone) > 15) {
        return { field: 'phone', message: 'شماره تماس نمیتواند بیشتر از ۱۵ کاراکتر باشد' };
    }
    if (has(body, 'is_primary') && !isBooleanish(body.is_primary)) {
        return { field: 'is_primary', message: 'مقدار مخاطب اصلی باید بولی باشد' };
    }

    const allowed = ['parent_name', 'relationship', 'phone', 'is_primary'];
    for (const field of Object.keys(body)) {
        if (!allowed.includes(field)) {
            return { field: null, message: 'فیلد ارسالی پشتیبانی نمیشود' };
        }
    }

    return null;
}

export function fieldForServerError(message) {
    if (typeof message !== 'string') return null;
    if (message.startsWith('نام والد')) return 'parent_name';
    if (message.startsWith('نسبت والد')) return 'relationship';
    if (message.startsWith('شماره تماس')) return 'phone';
    if (message.startsWith('مقدار مخاطب اصلی')) return 'is_primary';
    return null;
}
