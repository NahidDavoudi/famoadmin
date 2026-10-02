/**
 * Admin Panel - Student detail & parent contacts (unified API)
 * جزئیات دانش‌آموز و اطلاعات تماس والدین
 */

const { default: API } = await import(`${window.APP_CONFIG.assetUrl}/js/api.js`);
import { showAlert, escapeHtml, icon, withButtonLoading, getFormSubmitButton } from './utils.js';
import { showConfirm } from './confirm-modal.js';
import { setDetailStudentId, getDetailStudentId } from './config.js';
import {
    relationshipLabel,
    isPrimary,
    isAdmin,
    validateParentContact,
    fieldForServerError
} from './parents-logic.js';

let contacts = [];

function currentStudentId() {
    return getDetailStudentId();
}

export async function openStudentDetail(id) {
    setDetailStudentId(Number(id));
    const { navigateTo } = await import('./nav.js');
    navigateTo('student_detail');
}

export async function loadStudentDetailPage() {
    const id = currentStudentId();
    const header = document.getElementById('studentDetailHeader');

    resetForm();

    if (!id) {
        showAlert('دانش‌آموزی انتخاب نشده است', 'error');
        return;
    }

    if (header) {
        header.innerHTML = '<div class="skeleton skeleton-card" style="min-height: 96px;"></div>';
    }

    try {
        const res = await API.get(`/students/${id}`);
        renderStudentHeader(res.data || {});
    } catch (error) {
        console.error('Error loading student detail:', error);
        showAlert('خطا در بارگذاری اطلاعات دانش‌آموز', 'error');
        if (header) header.innerHTML = '';
    }

    await loadParentContacts();
}

function renderStudentHeader(student) {
    const header = document.getElementById('studentDetailHeader');
    if (!header) return;

    const isActive = Number(student.is_active) === 1;
    const statusClass = isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700';
    const statusText = isActive ? 'فعال' : 'غیرفعال';

    header.innerHTML = `
        <div class="bg-white rounded-2xl shadow p-5">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div class="flex items-center gap-3">
                    <div class="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center">
                        ${icon('user', 'icon')}
                    </div>
                    <div>
                        <h1 class="text-xl font-bold text-primary">${escapeHtml(student.name || '')}</h1>
                        <p class="text-sm text-gray-500">پایه ${escapeHtml(String(student.grade ?? '-'))} — ${escapeHtml(student.field || '-')}</p>
                    </div>
                </div>
                <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusClass}">
                    ${icon(isActive ? 'check' : 'pause', 'icon icon--xs')}
                    ${statusText}
                </span>
            </div>
            <div class="flex flex-col sm:flex-row gap-3 sm:gap-8 mt-4 text-sm">
                <div>
                    <span class="text-gray-500">تماس: </span>
                    <span dir="ltr" class="text-gray-700">${escapeHtml(student.phone || '-')}</span>
                </div>
                <div>
                    <span class="text-gray-500">کد ملی: </span>
                    <span dir="ltr" class="text-gray-700">${escapeHtml(student.national_id || '-')}</span>
                </div>
            </div>
        </div>
    `;
}

export async function loadParentContacts() {
    const id = currentStudentId();
    const skeleton = document.getElementById('parentContactsSkeleton');
    const wrap = document.querySelector('#parentContactsTable')?.closest('.table-wrap');
    const emptyState = document.getElementById('parentContactsEmptyState');
    const errorState = document.getElementById('parentContactsError');

    if (skeleton) skeleton.classList.remove('hidden');
    if (wrap) wrap.style.display = 'none';
    if (emptyState) emptyState.classList.add('hidden');
    if (errorState) errorState.classList.add('hidden');

    try {
        const res = await API.get(`/students/${id}/parent-contacts`);
        contacts = res.data || [];
        renderParentContacts();
    } catch (error) {
        console.error('Error loading parent contacts:', error);
        if (errorState) errorState.classList.remove('hidden');
        showAlert(error.message || 'خطا در بارگذاری مخاطبان', 'error');
    } finally {
        if (skeleton) skeleton.classList.add('hidden');
    }
}

function renderParentContacts() {
    const tbody = document.getElementById('parentContactsTable');
    const emptyState = document.getElementById('parentContactsEmptyState');
    const wrap = tbody?.closest('.table-wrap');

    if (!tbody) return;

    if (contacts.length === 0) {
        tbody.innerHTML = '';
        if (wrap) wrap.style.display = 'none';
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }

    if (wrap) wrap.style.display = '';
    if (emptyState) emptyState.classList.add('hidden');

    const admin = isAdmin(window.currentUserRole);

    tbody.innerHTML = contacts.map(contact => {
        const primary = isPrimary(contact.is_primary);
        const primaryBadge = primary
            ? '<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">مخاطب اصلی</span>'
            : '<span class="text-xs text-gray-400">—</span>';

        const actions = admin ? `
            <td class="px-3 py-2.5 text-center">
                <div class="flex items-center justify-center gap-1">
                    <button onclick="window.startEditParentContact(${contact.id})" class="p-1.5 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition" title="ویرایش" aria-label="ویرایش مخاطب">
                        ${icon('edit', 'icon icon--sm')}
                    </button>
                    <button onclick="window.deleteParentContact(${contact.id}, this)" class="p-1.5 rounded-lg text-red-600 hover:text-red-800 hover:bg-red-50 transition" title="حذف" aria-label="حذف مخاطب">
                        ${icon('trash-2', 'icon icon--sm')}
                    </button>
                </div>
            </td>` : '';

        return `
            <tr class="hover:bg-gray-50">
                <td class="px-3 py-2.5 font-medium">${escapeHtml(contact.parent_name || '')}</td>
                <td class="px-3 py-2.5 text-center">${escapeHtml(relationshipLabel(contact.relationship))}</td>
                <td class="px-3 py-2.5 text-center" dir="ltr">${escapeHtml(contact.phone || '-')}</td>
                <td class="px-3 py-2.5 text-center">${primaryBadge}</td>
                ${actions}
            </tr>
        `;
    }).join('');
}

export function startAddParentContact() {
    if (!isAdmin(window.currentUserRole)) return;
    const form = document.getElementById('parentContactForm');
    if (!form) return;

    form.reset();
    form.querySelector('[name="id"]').value = '';
    form.querySelector('[name="is_primary"]').checked = contacts.length === 0;
    clearFormErrors();
    form.classList.remove('hidden');
    form.querySelector('[name="parent_name"]')?.focus();
}

export function startEditParentContact(id) {
    if (!isAdmin(window.currentUserRole)) return;
    const form = document.getElementById('parentContactForm');
    if (!form) return;

    const contact = contacts.find(item => Number(item.id) === Number(id));
    if (!contact) return;

    form.querySelector('[name="id"]').value = contact.id;
    form.querySelector('[name="parent_name"]').value = contact.parent_name || '';
    form.querySelector('[name="relationship"]').value = contact.relationship || '';
    form.querySelector('[name="phone"]').value = contact.phone || '';
    form.querySelector('[name="is_primary"]').checked = isPrimary(contact.is_primary);
    clearFormErrors();
    form.classList.remove('hidden');
    form.querySelector('[name="parent_name"]')?.focus();
}

export function cancelParentContactForm() {
    resetForm();
}

function resetForm() {
    const form = document.getElementById('parentContactForm');
    if (!form) return;
    form.reset();
    form.querySelector('[name="id"]').value = '';
    clearFormErrors();
    form.classList.add('hidden');
}

function clearFormErrors() {
    document.querySelectorAll('#parentContactForm .field-error').forEach(el => {
        el.textContent = '';
        el.classList.add('hidden');
    });
}

function showFormError(field, message) {
    const el = document.querySelector(`#parentContactForm .field-error[data-error-for="${field}"]`);
    if (el) {
        el.textContent = message;
        el.classList.remove('hidden');
    }
}

export async function handleParentContactSubmit(e) {
    e.preventDefault();
    if (!isAdmin(window.currentUserRole)) return;

    const form = e.target;
    const id = currentStudentId();
    const contactId = form.querySelector('[name="id"]').value;
    const submitBtn = getFormSubmitButton(form);

    const data = {
        parent_name: form.querySelector('[name="parent_name"]').value.trim(),
        relationship: form.querySelector('[name="relationship"]').value,
        phone: form.querySelector('[name="phone"]').value.trim(),
        is_primary: form.querySelector('[name="is_primary"]').checked
    };

    clearFormErrors();
    const validation = validateParentContact(data, { creating: !contactId });
    if (validation) {
        if (validation.field) showFormError(validation.field, validation.message);
        else showAlert(validation.message, 'error');
        return;
    }

    const editing = !!contactId;

    await withButtonLoading(submitBtn, async () => {
        if (editing) {
            await API.put(`/students/${id}/parent-contacts/${contactId}`, data);
        } else {
            await API.post(`/students/${id}/parent-contacts`, data);
        }
        resetForm();
        await loadParentContacts();
        showAlert(editing ? 'مخاطب ویرایش شد' : 'مخاطب افزوده شد', 'success');
    }, 'در حال ذخیره...').catch(error => {
        if (error.code === 'VALIDATION_ERROR') {
            const field = fieldForServerError(error.message);
            if (field) showFormError(field, error.message);
            else showAlert(error.message, 'error');
        } else {
            showAlert(error.message, 'error');
        }
    });
}

export async function deleteParentContact(id, button) {
    if (!isAdmin(window.currentUserRole)) return;

    await showConfirm({
        message: 'آیا از حذف این مخاطب اطمینان دارید؟',
        confirmText: 'حذف',
        cancelText: 'انصراف',
        onConfirm: async () => {
            const btn = button || window.event?.target?.closest('button');

            await withButtonLoading(btn, async () => {
                await API.del(`/students/${currentStudentId()}/parent-contacts/${id}`);
                await loadParentContacts();
                showAlert('مخاطب حذف شد', 'success');
            }, 'در حال حذف...')
                .catch(error => showAlert(error.message, 'error'));
        }
    });
}
