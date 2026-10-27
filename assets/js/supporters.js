/**
 * Admin Panel - Supporters CRUD (unified API)
 * مدیریت پشتیبان‌ها + آپلود آواتار با progress
 */

const { default: API } = await import(`${window.APP_CONFIG.assetUrl}/js/api.js`);
import {
    showAlert, showModal, hideModal, escapeHtml, setFormValues,
    icon, withButtonLoading, updateStatElement, getFormSubmitButton,
    uploadWithProgress,
} from './utils.js';
import { renderImageWithFallback } from './image.js';

export async function loadSupporters() {
    const skeleton = document.getElementById('supportersSkeleton');
    const tableWrap = document.querySelector('#supportersTable')?.closest('.table-wrap');
    const emptyState = document.getElementById('supportersEmptyState');

    if (skeleton) skeleton.classList.remove('hidden');
    if (tableWrap) tableWrap.style.display = 'none';
    if (emptyState) emptyState.classList.add('hidden');

    try {
        const res = await API.get('/supporters?perPage=100');
        const supporters = res.data || [];

        const replied = supporters.reduce((sum, s) => sum + Number(s.replied_count || 0), 0);
        const pending = supporters.reduce((sum, s) => sum + Number(s.pending_count || 0), 0);

        updateStatElement('stat-supporters', res.pagination?.total ?? supporters.length);
        updateStatElement('stat-supporters-replied', replied);
        updateStatElement('stat-supporters-pending', pending);

        renderSupportersTable(supporters);
    } catch (error) {
        console.error('Error loading supporters:', error);
        showAlert('خطا در بارگذاری پشتیبان‌ها', 'error');
    } finally {
        if (skeleton) skeleton.classList.add('hidden');
    }
}

function renderSupportersTable(supporters) {
    const tbody = document.getElementById('supportersTable');
    const emptyState = document.getElementById('supportersEmptyState');
    const tableWrap = tbody?.closest('.table-wrap');

    if (!tbody) return;

    if (!supporters || supporters.length === 0) {
        tbody.innerHTML = '';
        if (tableWrap) tableWrap.style.display = 'none';
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }

    if (tableWrap) tableWrap.style.display = '';
    if (emptyState) emptyState.classList.add('hidden');

    tbody.innerHTML = supporters.map(s => {
        const avatarCell = `
            <div class="relative w-10 h-10 rounded-full overflow-hidden bg-[#E2D9C6]">
                ${renderImageWithFallback({
                    src: s.avatar_url || '',
                    alt: s.name || '',
                    imgClass: 'w-full h-full object-cover',
                    iconSize: 'w-5 h-5',
                })}
            </div>
        `;

        return `
        <tr class="hover:bg-gray-50">
            <td class="px-5 py-4 font-medium">
                <div class="flex items-center gap-3">
                    ${avatarCell}
                    ${escapeHtml(s.name)}
                </div>
            </td>
            <td class="px-5 py-4">${s.grade}</td>
            <td class="px-5 py-4">${escapeHtml(s.field)}</td>
            <td class="px-5 py-4">
                ${s.chat_id ? `<span class="text-green-600 inline-flex items-center gap-1.5">${icon('check', 'icon icon--md')}${escapeHtml(String(s.chat_id))}</span>` : '<span class="text-gray-400">ثبت نشده</span>'}
            </td>
            <td class="px-5 py-4">
                <span class="text-green-600">${s.replied_count || 0}</span> /
                <span class="text-yellow-600">${s.pending_count || 0}</span>
            </td>
            <td class="px-5 py-4">
                ${s.avg_response_hours ? `<span class="text-blue-600">${parseFloat(s.avg_response_hours).toFixed(1)} ساعت</span>` : '<span class="text-gray-400">-</span>'}
            </td>
            <td class="px-5 py-4">
                <div class="flex items-center gap-1">
                    <button onclick="window.editSupporter(${s.id}, '${escapeHtml(s.name)}', ${s.grade}, '${escapeHtml(s.field)}', '${String(s.chat_id || '').replace(/'/g, "\\'")}')"
                            class="p-2 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-50" title="ویرایش">
                        ${icon('edit', 'icon icon--lg')}
                    </button>
                    <button onclick="window.deleteSupporter(${s.id}, this)" class="p-2 rounded-lg text-red-600 hover:text-red-800 hover:bg-red-50" title="حذف">
                        ${icon('trash', 'icon icon--lg')}
                    </button>
                </div>
            </td>
        </tr>
    `}).join('');
}

/**
 * ساخت FormData از فرم پشتیبان — شامل فایل آواتار.
 */
function buildSupporterFormData(form) {
    const fd = new FormData();
    fd.append('name', form.querySelector('[name="name"]')?.value.trim() ?? '');
    fd.append('grade', form.querySelector('[name="grade"]')?.value ?? '');
    fd.append('field', form.querySelector('[name="field"]')?.value ?? '');
    fd.append('phone', form.querySelector('[name="phone"]')?.value.trim() ?? '');
    fd.append('chat_id', form.querySelector('[name="chat_id"]')?.value.trim() ?? '');

    // نام کاربری/رمز فقط در مودال افزودن موجود است
    const username = form.querySelector('[name="username"]')?.value.trim();
    if (username) fd.append('username', username);
    const password = form.querySelector('[name="password"]')?.value;
    if (password) fd.append('password', password);

    // در ویرایش، رمز جدید در فیلد new_password است
    const newPassword = form.querySelector('[name="new_password"]')?.value;
    if (newPassword) fd.append('password', newPassword);

    const avatarFile = form.querySelector('input[type="file"][name="avatar"]')?.files?.[0];
    if (avatarFile) fd.append('avatar', avatarFile);

    return fd;
}

/**
 * اجرای آپلود (XHR) + progress + loading روی دکمه.
 * @param {HTMLFormElement} form
 * @param {Object} opts
 * @param {'POST'|'PUT'} opts.method
 * @param {string} opts.endpoint
 * @param {{wrap:string,fill:string,text:string}} opts.progressIds
 * @param {Function} opts.onSuccess
 */
async function submitSupporter({ form, method, endpoint, progressIds, onSuccess }) {
    const submitBtn = getFormSubmitButton(form);
    const fd = buildSupporterFormData(form);
    const hasFile = fd.has('avatar');

    const wrap  = document.getElementById(progressIds.wrap);
    const fill  = document.getElementById(progressIds.fill);
    const label = document.getElementById(progressIds.text);

    // اگر فایلی نیست، از API.upload استفاده کن (ساده‌تر، با eror handling یکسان)
    if (!hasFile) {
        await withButtonLoading(submitBtn, async () => {
            await API.upload(endpoint, fd, method);
            onSuccess();
        }, method === 'PUT' ? 'در حال ذخیره...' : 'در حال افزودن...')
            .catch(err => showAlert(err.message, 'error'));
        return;
    }

    // با فایل: XHR برای progress
    if (wrap) wrap.hidden = false;

    await withButtonLoading(submitBtn, async () => {
        await uploadWithProgress(`${API.base}${endpoint}`, fd, {
            method,
            onProgress: (pct, phase) => {
                if (fill) fill.style.width = pct + '%';
                if (label) label.textContent = phase === 'processing' ? 'در حال پردازش...' : pct + '%';
            },
        });
        onSuccess();
    }, method === 'PUT' ? 'در حال ذخیره...' : 'در حال افزودن...')
        .catch(err => showAlert(err.message, 'error'))
        .finally(() => {
            if (wrap) wrap.hidden = true;
            if (fill) fill.style.width = '0%';
            if (label) label.textContent = '0%';
        });
}

export async function handleAddSupporter(e) {
    e.preventDefault();
    const form = e.target;

    const name = form.querySelector('[name="name"]').value.trim();
    const phone = form.querySelector('[name="phone"]')?.value.trim() || '';
    if (!name) { showAlert('نام و نام خانوادگی الزامی است', 'error'); return; }
    if (!phone) { showAlert('شماره تلفن الزامی است', 'error'); return; }

    await submitSupporter({
        form,
        method: 'POST',
        endpoint: '/supporters',
        progressIds: {
            wrap: 'addSupporterProgress',
            fill: 'addSupporterProgressFill',
            text: 'addSupporterProgressText',
        },
        onSuccess: () => {
            hideModal('addSupporterModal');
            form.reset();
            const preview = document.getElementById('addSupporterPreview');
            if (preview) preview.innerHTML = '';
            loadSupporters();
            showAlert('پشتیبان جدید اضافه شد', 'success');
        },
    });
}

export function editSupporter(id, name, grade, field, chat_id) {
    const form = document.getElementById('editSupporterForm');
    if (!form) return;

    setFormValues(form, { id, name, grade, field, chat_id });

    // پیش‌نمایش خالی — آواتار جدید بعد از انتخاب فایل نشان داده می‌شود
    const preview = document.getElementById('editSupporterPreview');
    if (preview) preview.innerHTML = '';

    showModal('editSupporterModal');
}

export async function handleEditSupporter(e) {
    e.preventDefault();
    const form = e.target;
    const id = form.querySelector('[name="id"]').value;

    await submitSupporter({
        form,
        method: 'PUT',
        endpoint: `/supporters/${id}`,
        progressIds: {
            wrap: 'editSupporterProgress',
            fill: 'editSupporterProgressFill',
            text: 'editSupporterProgressText',
        },
        onSuccess: () => {
            hideModal('editSupporterModal');
            form.reset();
            const preview = document.getElementById('editSupporterPreview');
            if (preview) preview.innerHTML = '';
            loadSupporters();
            showAlert('تغییرات ذخیره شد', 'success');
        },
    });
}

export async function deleteSupporter(id, button) {
    if (!confirm('آیا مطمئن هستید؟ گزارش‌های مرتبط با این پشتیبان حذف نخواهند شد.')) return;

    const btn = button || window.event?.target?.closest('button');

    await withButtonLoading(btn, async () => {
        await API.del(`/supporters/${id}`);
        loadSupporters();
        showAlert('پشتیبان حذف شد', 'success');
    }, 'در حال حذف...')
        .catch(error => showAlert(error.message, 'error'));
}

/**
 * پیش‌نمایش آواتار انتخاب‌شده قبل از ذخیره.
 */
export function bindAvatarPreview(formId, previewId) {
    const form = document.getElementById(formId);
    if (!form) return;
    const input = form.querySelector('input[type="file"][name="avatar"]');
    const preview = document.getElementById(previewId);
    if (!input || !preview) return;

    if (input.dataset.bound === '1') return;
    input.dataset.bound = '1';

    input.addEventListener('change', () => {
        const file = input.files?.[0];
        if (!file) { preview.innerHTML = ''; return; }
        const url = URL.createObjectURL(file);
        preview.innerHTML = `
            <div class="relative w-16 h-16 rounded-full overflow-hidden bg-[#E2D9C6]">
                <img src="${url}" alt="preview" class="w-full h-full object-cover">
            </div>
        `;
    });
}