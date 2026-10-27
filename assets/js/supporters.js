/**
 * Admin Panel - Supporters CRUD (unified API)
 * مدیریت پشتیبان‌ها + آپلود آواتار
 */

const { default: API } = await import(`${window.APP_CONFIG.assetUrl}/js/api.js`);
import { showAlert, showModal, hideModal, escapeHtml, setFormValues, icon, withButtonLoading, updateStatElement, getFormSubmitButton } from './utils.js';
import { renderImageWithFallback } from './image.js';
import { uploadFormWithProgress } from './upload-progress.js';

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
        // آواتار با fallback امن — به جای حرف اول نام
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
 * Builds multipart/form-data payload including the avatar file.
 */
function buildSupporterFormData(form) {
    const fd = new FormData();
    fd.append('name', form.querySelector('[name="name"]')?.value.trim() ?? '');
    fd.append('grade', form.querySelector('[name="grade"]')?.value ?? '');
    fd.append('field', form.querySelector('[name="field"]')?.value ?? '');
    fd.append('phone', form.querySelector('[name="phone"]')?.value.trim() ?? '');
    fd.append('chat_id', form.querySelector('[name="chat_id"]')?.value.trim() ?? '');

    const avatarInput = form.querySelector('input[type="file"][name="avatar"]');
    const avatarFile = avatarInput?.files?.[0];
    if (avatarFile) {
        fd.append('avatar', avatarFile);
    }

    return fd;
}

/**
 * ارسال فرم پشتیبان.
 * اگر آواتاری انتخاب شده باشد → XHR + نوار پیشرفت واقعی.
 */
async function submitSupporter(form, id) {
    const path = id ? `/supporters/${id}` : '/supporters';
    const fd = buildSupporterFormData(form);
    const file = form.querySelector('input[type="file"][name="avatar"]')?.files?.[0] || null;

    if (file) {
        return uploadFormWithProgress(form, `${API.base}${path}`, fd, {
            method: id ? 'PUT' : 'POST',
            maxSizeMB: 5,
            file,
        });
    }
    return API.upload(path, fd, id ? 'PUT' : undefined);
}

export async function handleAddSupporter(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = getFormSubmitButton(form);

    // اعتبارسنجی حداقلی سمت کلاینت (سرویس هم چک می‌کند)
    const name = form.querySelector('[name="name"]').value.trim();
    const phone = form.querySelector('[name="phone"]')?.value.trim() || '';
    if (!name) {
        showAlert('نام و نام خانوادگی الزامی است', 'error');
        return;
    }
    if (!phone) {
        showAlert('شماره تلفن الزامی است', 'error');
        return;
    }

    await withButtonLoading(submitBtn, async () => {
        await submitSupporter(form, null);
        hideModal('addSupporterModal');
        form.reset();
        // پاک‌سازی پیش‌نمایش آواتار در صورت وجود
        const preview = form.querySelector('[data-avatar-preview]');
        if (preview) preview.innerHTML = '';
        loadSupporters();
        showAlert('پشتیبان جدید اضافه شد', 'success');
    }, 'در حال افزودن...')
        .catch(error => showAlert(error.message, 'error'));
}

export function editSupporter(id, name, grade, field, chat_id) {
    const form = document.getElementById('editSupporterForm');
    if (!form) return;

    setFormValues(form, { id, name, grade, field, chat_id });

    // فایل انتخاب‌شده از دفعه‌ی قبل را پاک کن
    const fileInput = form.querySelector('input[type="file"][name="avatar"]');
    if (fileInput) fileInput.value = '';

    // نمایش آواتار فعلی در فرم ویرایش (در صورت وجود)
    // id در name="id" قرار دارد، می‌توان آواتار را از رکورد فعلی گرفت
    const previewEl = form.querySelector('[data-avatar-preview]');
    if (previewEl) {
        // ابتدا خالی کن؛ API فعلی به‌جز زمان load لیست، avatar_url ارائه نمی‌دهد.
        // اگر در آینده GET /supporters/{id} را با avatar_url بازگرداند، می‌توان در اینجا آن را نمایش داد.
        previewEl.innerHTML = '';
    }

    showModal('editSupporterModal');
}

export async function handleEditSupporter(e) {
    e.preventDefault();
    const form = e.target;
    const id = form.querySelector('[name="id"]').value;
    const submitBtn = getFormSubmitButton(form);

    await withButtonLoading(submitBtn, async () => {
        await submitSupporter(form, id);
        hideModal('editSupporterModal');
        form.reset();
        const preview = form.querySelector('[data-avatar-preview]');
        if (preview) preview.innerHTML = '';
        loadSupporters();
        showAlert('تغییرات ذخیره شد', 'success');
    }, 'در حال ذخیره...')
        .catch(error => showAlert(error.message, 'error'));
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
 * Live preview of the selected avatar before saving.
 * در فرم HTML باید یک عنصر با data-avatar-preview قرار دهید.
 */
export function bindAvatarPreview(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    const input = form.querySelector('input[type="file"][name="avatar"]');
    const preview = form.querySelector('[data-avatar-preview]');
    if (!input || !preview) return;

    if (input.dataset.bound === '1') return;
    input.dataset.bound = '1';

    input.addEventListener('change', () => {
        const file = input.files?.[0];
        if (!file) {
            preview.innerHTML = '';
            return;
        }
        const url = URL.createObjectURL(file);
        preview.innerHTML = `
            <div class="relative w-16 h-16 rounded-full overflow-hidden bg-[#E2D9C6]">
                <img src="${url}" alt="preview" class="w-full h-full object-cover">
            </div>
        `;
    });
}
