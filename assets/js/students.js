/**
 * Admin Panel - Students CRUD (unified API)
 */

const { default: API } = await import(`${window.APP_CONFIG.assetUrl}/js/api.js`);
import { showAlert, showModal, hideModal, escapeHtml, getElementValue, setFormValues, icon, withButtonLoading, getFormSubmitButton } from './utils.js';
import { showConfirm } from './confirm-modal.js';
import * as config from './config.js';
import { studentsNeedingStatusChange, studentsWithoutAccount, summarizeResults } from './students-bulk-logic.js';

const PAGE_SIZE = 20;
let currentPage = 1;
let totalPages = 1;
let totalRecords = 0;

const selectedIds = new Set();
let currentStudents = [];
let bulkRunning = false;

function isAdminUser() {
    return window.currentUserRole === 'admin';
}

function invalidateStudentsCache() {
    try { localStorage.removeItem('students_list_cache'); } catch (_) {}
}

export async function loadStudents(page = 1) {
    const search = getElementValue('filterSearch');
    const field = getElementValue('filterField');
    const grade = getElementValue('filterGrade');
    const status = document.getElementById('filterStatus')?.value || '';

    currentPage = page;
    selectedIds.clear();

    const skeleton = document.getElementById('studentsSkeleton');
    const tableWrap = document.querySelector('#studentsTable')?.closest('.table-wrap');
    const emptyState = document.getElementById('studentsEmptyState');

    if (skeleton) skeleton.classList.remove('hidden');
    if (tableWrap) tableWrap.style.display = 'none';
    if (emptyState) emptyState.classList.add('hidden');

    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (field) params.set('field', field);
    if (grade) params.set('grade', grade);
    if (status === 'active') params.set('status', '1');
    else if (status === 'inactive') params.set('status', '0');
    params.set('page', String(currentPage));
    params.set('perPage', String(PAGE_SIZE));

    try {
        const res = await API.get(`/students?${params.toString()}`);
        const students = res.data || [];
        currentStudents = students;
        totalPages = res.pagination?.total_pages || 1;
        totalRecords = res.pagination?.total || 0;
        renderStudentsTable(students);
        renderPagination();
    } catch (error) {
        console.error('Error loading students:', error);
        showAlert('خطا در بارگذاری دانش‌آموزان', 'error');
    } finally {
        if (skeleton) skeleton.classList.add('hidden');
    }
}

function renderStudentsTable(students) {
    const tbody = document.getElementById('studentsTable');
    const emptyState = document.getElementById('studentsEmptyState');
    const tableWrap = tbody?.closest('.table-wrap');
    const paginationContainer = document.getElementById('studentsPagination');

    if (!tbody) return;

    if (students.length === 0) {
        tbody.innerHTML = '';
        if (tableWrap) tableWrap.style.display = 'none';
        if (emptyState) emptyState.classList.remove('hidden');
        if (paginationContainer) paginationContainer.classList.add('hidden');
        updateBulkBar();
        return;
    }

    if (tableWrap) tableWrap.style.display = '';
    if (emptyState) emptyState.classList.add('hidden');

    const admin = isAdminUser();

    tbody.innerHTML = students.map(s => {
        const isActive = Number(s.is_active) === 1;
        const hasAccount = !!s.user_id;
        const statusClass = isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700';
        const statusText = isActive ? 'فعال' : 'غیرفعال';
        const statusIcon = isActive ? 'check' : 'pause';
        const checkboxCell = admin ? `
                <td class="px-3 py-2.5 text-center">
                    <input type="checkbox" class="student-select-checkbox" data-id="${s.id}" ${selectedIds.has(Number(s.id)) ? 'checked' : ''} onchange="window.toggleStudentSelection(${s.id}, this.checked)" aria-label="انتخاب ${escapeHtml(s.name)}">
                </td>` : '';

        return `
            <tr class="hover:bg-gray-50">
                ${checkboxCell}
                <td class="px-3 py-2.5 font-medium">${escapeHtml(s.name)}</td>
                <td class="px-3 py-2.5 text-left" dir="ltr">
                    <div class="flex flex-col gap-0.5 text-xs">
                        <span class="text-gray-700">${escapeHtml(s.phone || '-')}</span>
                        <span class="text-gray-400">${escapeHtml(s.national_id || '-')}</span>
                    </div>
                </td>
                <td class="px-3 py-2.5 text-center">
                    <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        پایه ${s.grade}
                    </span>
                </td>
                <td class="px-3 py-2.5 text-center">
                    <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${s.field === 'ریاضی' ? 'bg-blue-100 text-blue-700' : s.field === 'تجربی' ? 'bg-green-100 text-green-700' : s.field === 'انسانی' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}">
                        ${escapeHtml(s.field)}
                    </span>
                </td>
                <td class="px-3 py-2.5 text-center">
                    <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusClass}" title="${statusText}">
                        ${icon(statusIcon, 'icon icon--xs')}
                        ${statusText}
                    </span>
                </td>
                <td class="px-3 py-2.5 text-center">
                    <div class="flex items-center justify-center gap-1">
                        <button onclick="window.openStudentDetail(${s.id})" class="p-1.5 rounded-lg text-primary hover:text-[#5a779e] hover:bg-gray-50 transition" title="جزئیات" aria-label="جزئیات دانش‌آموز ${escapeHtml(s.name)}">
                            ${icon('eye', 'icon icon--sm')}
                        </button>
                        <button onclick="window.editStudent(${s.id}, '${escapeHtml(s.name)}', ${s.grade}, '${escapeHtml(s.field)}', '${escapeHtml(s.phone || '')}', '${escapeHtml(s.national_id || '')}')" class="p-1.5 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition" title="ویرایش" aria-label="ویرایش دانش‌آموز ${escapeHtml(s.name)}">
                            ${icon('edit', 'icon icon--sm')}
                        </button>
                        ${hasAccount ? `
                            <button onclick="window.resetStudentPassword(${s.id}, this)" class="p-1.5 rounded-lg text-amber-600 hover:text-amber-800 hover:bg-amber-50 transition" title="بازنشانی رمز" aria-label="بازنشانی رمز دانش‌آموز ${escapeHtml(s.name)}">
                                ${icon('key', 'icon icon--sm')}
                            </button>
                        ` : `
                            <button onclick="window.createStudentAccount(${s.id}, this)" class="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 transition" title="ایجاد حساب" aria-label="ایجاد حساب ${escapeHtml(s.name)}">
                                ${icon('user-plus', 'icon icon--sm')}
                            </button>
                        `}
                        <button onclick="window.toggleStudentStatus(${s.id}, this)" class="p-1.5 rounded-lg ${isActive ? 'text-red-600' : 'text-green-600'} transition cursor-pointer" title="${isActive ? 'غیرفعال کردن' : 'فعال کردن'} دانش‌آموز ${escapeHtml(s.name)}">
                            ${icon(isActive ? 'minus' : 'plus', 'icon icon--sm')}
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    if (paginationContainer) paginationContainer.classList.remove('hidden');
    updateBulkBar();
}

function updateBulkBar() {
    const bar = document.getElementById('studentsBulkBar');
    const countEl = document.getElementById('studentsBulkCount');
    const selectAll = document.getElementById('studentsSelectAll');
    if (!bar) return;

    if (!isAdminUser()) {
        bar.classList.add('hidden');
        return;
    }

    const count = selectedIds.size;
    const total = currentStudents.length;

    if (countEl) countEl.textContent = `${count} مورد انتخاب شده`;
    bar.classList.toggle('hidden', count === 0);

    if (selectAll) {
        selectAll.checked = total > 0 && count === total;
        selectAll.indeterminate = count > 0 && count < total;
    }
}

export function toggleStudentSelection(id, checked) {
    if (checked) selectedIds.add(Number(id));
    else selectedIds.delete(Number(id));
    updateBulkBar();
}

export function toggleSelectAllStudents(checked) {
    if (!isAdminUser()) return;
    if (checked) currentStudents.forEach(s => selectedIds.add(Number(s.id)));
    else selectedIds.clear();

    document.querySelectorAll('#studentsTable .student-select-checkbox').forEach(cb => {
        cb.checked = checked;
    });
    updateBulkBar();
}

export function clearStudentSelection() {
    selectedIds.clear();
    document.querySelectorAll('#studentsTable .student-select-checkbox').forEach(cb => {
        cb.checked = false;
    });
    updateBulkBar();
}

async function runBulkOperation(label, ids, task) {
    if (bulkRunning) {
        showAlert('یک عملیات گروهی دیگر در حال انجام است', 'warning');
        return;
    }

    bulkRunning = true;
    clearStudentSelection();
    showAlert(`در حال ${label} ${ids.length} مورد... عملیات در پس‌زمینه انجام می‌شود`, 'info');

    let summary;
    try {
        const results = await Promise.allSettled(ids.map(id => task(id)));
        summary = summarizeResults(results);
    } finally {
        bulkRunning = false;
    }

    invalidateStudentsCache();

    if (summary.failed === 0) {
        showAlert(`${summary.succeeded} مورد با موفقیت انجام شد`, 'success');
    } else if (summary.succeeded === 0) {
        showAlert(`عملیات برای ${summary.failed} مورد ناموفق بود`, 'error');
    } else {
        showAlert(`${summary.succeeded} مورد با موفقیت و ${summary.failed} مورد ناموفق انجام شد`, 'warning');
    }

    if (config.currentPage === 'students') {
        loadStudents(currentPage);
    }
}

export function bulkDeleteStudents() {
    if (!isAdminUser()) return;

    const ids = [...selectedIds];
    if (!ids.length) {
        showAlert('ابتدا حداقل یک دانش‌آموز را انتخاب کنید', 'warning');
        return;
    }

    showConfirm({
        message: `آیا از حذف ${ids.length} دانش‌آموز و حساب‌های مرتبط اطمینان دارید؟`,
        confirmText: 'حذف',
        cancelText: 'انصراف',
        onConfirm: () => runBulkOperation('حذف', ids, id => API.del(`/students/${id}`))
    });
}

export function bulkSetStudentStatus(active) {
    if (!isAdminUser()) return;

    const selected = currentStudents.filter(s => selectedIds.has(Number(s.id)));
    const ids = studentsNeedingStatusChange(selected, active);

    if (!ids.length) {
        showAlert(active ? 'همهٔ موارد انتخاب‌شده هم‌اکنون فعال هستند' : 'همهٔ موارد انتخاب‌شده هم‌اکنون غیرفعال هستند', 'warning');
        return;
    }

    const run = () => runBulkOperation(active ? 'فعال‌سازی' : 'غیرفعال‌سازی', ids, id => API.post(`/students/${id}/toggle-status`));

    if (active) {
        run();
    } else {
        showConfirm({
            message: `آیا از غیرفعال‌سازی ${ids.length} دانش‌آموز اطمینان دارید؟`,
            confirmText: 'غیرفعال‌سازی',
            cancelText: 'انصراف',
            onConfirm: run
        });
    }
}

export function bulkCreateStudentAccounts() {
    if (!isAdminUser()) return;

    const selected = currentStudents.filter(s => selectedIds.has(Number(s.id)));
    const ids = studentsWithoutAccount(selected);

    if (!ids.length) {
        showAlert('همهٔ موارد انتخاب‌شده از قبل حساب کاربری دارند', 'warning');
        return;
    }

    showConfirm({
        message: `برای ${ids.length} دانش‌آموز حساب کاربری با رمز پیش‌فرض 1234 ایجاد شود؟`,
        confirmText: 'ایجاد حساب',
        cancelText: 'انصراف',
        onConfirm: () => runBulkOperation('ایجاد حساب', ids, id => API.post(`/students/${id}/create-account`))
    });
}

function renderPagination() {
    const container = document.getElementById('studentsPagination');
    if (!container) return;

    if (totalPages <= 1) {
        container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');

    let pagesHtml = '';
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
        pagesHtml += `<button onclick="loadStudents(1)" class="btn btn-sm btn-secondary" aria-label="صفحه اول">${icon('arrow-right', 'icon icon--sm')}</button>`;
        pagesHtml += `<button onclick="loadStudents(${currentPage - 1})" class="btn btn-sm btn-secondary" aria-label="صفحه قبلی">${icon('chevron-right', 'icon icon--sm')}</button>`;
    }

    for (let i = startPage; i <= endPage; i++) {
        pagesHtml += `<button onclick="loadStudents(${i})" class="btn btn-sm ${i === currentPage ? 'btn-primary' : 'btn-secondary'}" aria-label="صفحه ${i}" ${i === currentPage ? 'aria-current="page"' : ''}>${i}</button>`;
    }

    if (endPage < totalPages) {
        pagesHtml += `<button onclick="loadStudents(${currentPage + 1})" class="btn btn-sm btn-secondary" aria-label="صفحه بعدی">${icon('chevron-left', 'icon icon--sm')}</button>`;
        pagesHtml += `<button onclick="loadStudents(${totalPages})" class="btn btn-sm btn-secondary" aria-label="آخرین صفحه">${icon('arrow-left', 'icon icon--sm')}</button>`;
    }

    container.innerHTML = `
        <nav class="pagination flex items-center justify-center gap-1.5" role="navigation" aria-label="صفحه‌بندی دانش‌آموزان">
            ${pagesHtml}
            <span class="pagination-info text-xs text-gray-500 px-2" aria-live="polite">
                کل ${totalRecords} رکورد • صفحه ${currentPage} از ${totalPages}
            </span>
        </nav>
    `;
}

export async function handleAddStudent(e) {
    e.preventDefault();

    const form = e.target;
    const submitBtn = getFormSubmitButton(form);
    const phone = form.querySelector('[name="phone"]').value.trim();
    const nationalId = form.querySelector('[name="national_id"]').value.trim();

    if (!/^09\d{9}$/.test(phone)) {
        showAlert('شماره موبایل نامعتبر است (فرمت: 09xxxxxxxxx)', 'error');
        return;
    }
    if (!/^\d{10}$/.test(nationalId)) {
        showAlert('کد ملی باید ۱۰ رقم باشد', 'error');
        return;
    }

    await withButtonLoading(submitBtn, async () => {
        await API.post('/students', {
            name: form.querySelector('[name="name"]').value.trim(),
            phone,
            nationalId,
            grade: Number(form.querySelector('[name="grade"]').value),
            field: form.querySelector('[name="field"]').value,
        });
        hideModal('addStudentModal');
        form.reset();
        invalidateStudentsCache();
        loadStudents();
        showAlert('دانش‌آموز اضافه شد و حساب کاربری ایجاد شد', 'success');
    }, 'در حال افزودن...')
        .catch(error => showAlert(error.message, 'error'));
}

export function editStudent(id, name, grade, field, phone, national_id) {
    const form = document.getElementById('editStudentForm');
    if (!form) return;

    setFormValues(form, { id, name, grade, field, phone, national_id });
    showModal('editStudentModal');
}

export async function handleEditStudent(e) {
    e.preventDefault();

    const form = e.target;
    const submitBtn = getFormSubmitButton(form);
    const id = form.querySelector('[name="id"]').value;
    const phone = form.querySelector('[name="phone"]').value.trim();
    const nationalId = form.querySelector('[name="national_id"]').value.trim();

    if (!/^09\d{9}$/.test(phone)) {
        showAlert('شماره موبایل نامعتبر است (فرمت: 09xxxxxxxxx)', 'error');
        return;
    }
    if (!/^\d{10}$/.test(nationalId)) {
        showAlert('کد ملی باید ۱۰ رقم باشد', 'error');
        return;
    }

    await withButtonLoading(submitBtn, async () => {
        await API.put(`/students/${id}`, {
            name: form.querySelector('[name="name"]').value.trim(),
            phone,
            nationalId,
            grade: Number(form.querySelector('[name="grade"]').value),
            field: form.querySelector('[name="field"]').value,
        });
        hideModal('editStudentModal');
        invalidateStudentsCache();
        loadStudents(currentPage);
        showAlert('تغییرات ذخیره شد', 'success');
    }, 'در حال ذخیره...')
        .catch(error => showAlert(error.message, 'error'));
}

export async function deleteStudent(id, button) {
    await showConfirm({
        message: 'آیا از حذف این دانش‌آموز و حساب کاربری مرتبط اطمینان دارید؟',
        confirmText: 'حذف',
        cancelText: 'انصراف',
        onConfirm: async () => {
            const btn = button || window.event?.target?.closest('button');

            await withButtonLoading(btn, async () => {
                await API.del(`/students/${id}`);
                invalidateStudentsCache();
                loadStudents(currentPage);
                showAlert('دانش‌آموز حذف شد', 'success');
            }, 'در حال حذف...')
                .catch(error => showAlert(error.message, 'error'));
        },
        onCancel: () => { },
    });
}

export async function createStudentAccount(id, button) {
    if (!confirm('حساب کاربری با رمز پیش‌فرض 1234 ایجاد شود؟')) return;

    const btn = button || window.event?.target?.closest('button');

    await withButtonLoading(btn, async () => {
        await API.post(`/students/${id}/create-account`);
        loadStudents(currentPage);
        showAlert('حساب کاربری ایجاد شد', 'success');
    }, 'در حال ایجاد...')
        .catch(error => showAlert(error.message, 'error'));
}

export async function resetStudentPassword(id, button) {
    if (!confirm('رمز عبور به 1234 بازنشانی شود؟')) return;

    const btn = button || window.event?.target?.closest('button');

    await withButtonLoading(btn, async () => {
        await API.post(`/students/${id}/reset-password`);
        showAlert('رمز عبور بازنشانی شد', 'success');
    }, 'در حال بازنشانی...')
        .catch(error => showAlert(error.message, 'error'));
}

export function clearStudentFilters() {
    const search = document.getElementById('filterSearch');
    const field = document.getElementById('filterField');
    const grade = document.getElementById('filterGrade');
    const statusFilterEl = document.getElementById('filterStatus');

    if (search) search.value = '';
    if (field) field.value = '';
    if (grade) grade.value = '';
    if (statusFilterEl) statusFilterEl.value = '';

    loadStudents(1);
}

export async function toggleStudentStatus(id, button) {
    if (!confirm('آیا از تغییر وضعیت دانش‌آموز این اطمینان دارید؟')) return;

    const btn = button || window.event?.target?.closest('button');

    await withButtonLoading(btn, async () => {
        await API.post(`/students/${id}/toggle-status`);
        loadStudents(currentPage);
        showAlert('وضعیت دانش‌آموز تغییر یافت', 'success');
    }, 'در حال تغییر...')
        .catch(error => showAlert(error.message, 'error'));
}
