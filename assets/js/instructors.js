/**
 * Admin Panel - Instructors CRUD (unified API)
 * مدیریت اساتید + نمایش آواتار (به جای حرف اول نام)
 */

const { default: API } = await import(`${window.APP_CONFIG.assetUrl}/js/api.js`);
import { showAlert, showModal, hideModal, escapeHtml, setFormValues, icon, withButtonLoading, getFormSubmitButton } from './utils.js';
import { renderImageWithFallback } from './image.js';
import { uploadFormWithProgress } from './upload-progress.js';

export async function loadInstructors() {
    const skeleton = document.getElementById('instructorsSkeleton');
    const tableWrap = document.querySelector('#instructorsTable')?.closest('.table-wrap');
    const emptyState = document.getElementById('instructorsEmptyState');

    if (skeleton) skeleton.classList.remove('hidden');
    if (tableWrap) tableWrap.style.display = 'none';
    if (emptyState) emptyState.classList.add('hidden');

    try {
        const res = await API.get('/instructors?perPage=100');
        renderInstructorsTable(res.data || []);
    } catch (error) {
        console.error('Error loading instructors:', error);
        showAlert('خطا در بارگذاری اساتید', 'error');
    } finally {
        if (skeleton) skeleton.classList.add('hidden');
    }
}

function renderInstructorsTable(instructors) {
    const tbody = document.getElementById('instructorsTable');
    const emptyState = document.getElementById('instructorsEmptyState');
    const tableWrap = tbody?.closest('.table-wrap');

    if (!tbody) return;

    if (instructors.length === 0) {
        tbody.innerHTML = '';
        if (tableWrap) tableWrap.style.display = 'none';
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }

    if (tableWrap) tableWrap.style.display = '';
    if (emptyState) emptyState.classList.add('hidden');

    tbody.innerHTML = instructors.map(i => {
        // آواتار با fallback امن — جایگزین حرف اول نام
        // فرض می‌کنیم بک‌اند avatar_url یا image_url را برمی‌گرداند.
        // اگر نام فیلد در بک‌اند image است، image_url در نظر گرفته می‌شود.
        const avatarUrl = i.avatar_url || i.image_url || '';
        const avatarCell = `
            <div class="relative w-11 h-11 rounded-full overflow-hidden bg-gradient-to-br from-[#E2D9C6] to-[#d4c9b2]">
                ${renderImageWithFallback({
                    src: avatarUrl,
                    alt: i.name || '',
                    imgClass: 'w-full h-full object-cover',
                    iconSize: 'w-5 h-5',
                })}
            </div>
        `;

        return `
        <tr class="hover:bg-gray-50">
            <td class="px-5 py-4">${i.display_order}</td>
            <td class="px-5 py-4 font-medium">${escapeHtml(i.name)}</td>
            <td class="px-5 py-4">${escapeHtml(i.title || '')}</td>
            <td class="px-5 py-4">${avatarCell}</td>
            <td class="px-5 py-4">
                <div class="flex items-center gap-1">
                    <button onclick="window.editInstructor(${i.id})" class="p-2 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-50" title="ویرایش">
                        ${icon('edit', 'icon icon--lg')}
                    </button>
                    <button onclick="window.deleteInstructor(${i.id}, '${(i.name || '').replace(/'/g, "\\'")}', this)" class="p-2 rounded-lg text-red-600 hover:text-red-800 hover:bg-red-50" title="حذف">
                        ${icon('trash', 'icon icon--lg')}
                    </button>
                </div>
            </td>
        </tr>
    `}).join('');
}

/**
 * ساخت FormData از فرم استاد — شامل فایل تصویر.
 * فیلد image به‌عنوان کلید فایل در سمت بک‌اند استفاده می‌شود.
 * Builds multipart/form-data payload including the image file.
 */
function getInstructorFormData(form) {
    const formData = new FormData(form);
    const imageInput = form.querySelector('input[type="file"]');
    const imageFile = imageInput?.files[0];

    // حذف فیلد image از formData تا دوباره با کلید درست اضافه شود
    formData.delete('image');
    if (imageFile) {
        formData.append('image', imageFile);
    }

    // حذف initial_letter دیگر لازم نیست؛ فیلد از فرم حذف شده است.
    return formData;
}

/**
 * ارسال فرم استاد.
 * اگر فایلی انتخاب شده باشد → XHR + نوار پیشرفت واقعی.
 * اگر نه (مثلاً ویرایش بدون تغییر تصویر) → همان مسیر fetch قبلی.
 */
async function submitInstructor(form, id) {
    const path = id ? `/instructors/${id}` : '/instructors';
    const formData = getInstructorFormData(form);
    const file = form.querySelector('input[type="file"]')?.files?.[0] || null;

    if (file) {
        return uploadFormWithProgress(form, `${API.base}${path}`, formData, {
            method: id ? 'PUT' : 'POST',
            maxSizeMB: 5,   // مطابق راهنمای فرم: «حداکثر: 5MB»
            file,
        });
    }
    return API.upload(path, formData, id ? 'PUT' : undefined);
}

export async function handleAddInstructor(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = getFormSubmitButton(form);

    await withButtonLoading(submitBtn, async () => {
        await submitInstructor(form, null);
        hideModal('addInstructorModal');
        form.reset();
        const preview = form.querySelector('[data-avatar-preview]');
        if (preview) preview.innerHTML = '';
        loadInstructors();
        showAlert('استاد اضافه شد', 'success');
    }, 'در حال افزودن...')
        .catch(error => showAlert(error.message, 'error'));
}

export async function editInstructor(id) {
    try {
        const res = await API.get(`/instructors/${id}`);
        const instructor = res.data;

        if (!instructor) {
            showAlert('استاد یافت نشد', 'error');
            return;
        }

        const form = document.getElementById('editInstructorForm');
        if (!form) return;

        // initial_letter حذف شده — فقط فیلدهای باقی‌مانده set می‌شوند
        setFormValues(form, {
            id: instructor.id,
            name: instructor.name || '',
            title: instructor.title || '',
            description: instructor.description || '',
            display_order: instructor.display_order || 0
        });

        // فایل انتخاب‌شده از دفعه‌ی قبل را پاک کن (در غیر این صورت بی‌خبر دوباره آپلود می‌شود)
        const fileInput = form.querySelector('input[type="file"]');
        if (fileInput) fileInput.value = '';

        // نمایش تصویر فعلی در فرم ویرایش
        const previewEl = form.querySelector('[data-avatar-preview]');
        if (previewEl) {
            const avatarUrl = instructor.avatar_url || instructor.image_url || '';
            if (avatarUrl) {
                previewEl.innerHTML = `
                    <div class="relative w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-[#E2D9C6] to-[#d4c9b2]">
                        ${renderImageWithFallback({
                            src: avatarUrl,
                            alt: instructor.name || '',
                            imgClass: 'w-full h-full object-cover',
                            iconSize: 'w-6 h-6',
                        })}
                    </div>
                `;
            } else {
                previewEl.innerHTML = '';
            }
        }

        showModal('editInstructorModal');
    } catch (error) {
        console.error('Error in editInstructor:', error);
        showAlert('خطا در بارگذاری اطلاعات استاد', 'error');
    }
}

export async function handleEditInstructor(e) {
    e.preventDefault();
    const form = e.target;
    const id = form.querySelector('[name="id"]')?.value;
    const submitBtn = getFormSubmitButton(form);

    await withButtonLoading(submitBtn, async () => {
        await submitInstructor(form, id);
        hideModal('editInstructorModal');
        form.reset();
        const preview = form.querySelector('[data-avatar-preview]');
        if (preview) preview.innerHTML = '';
        loadInstructors();
        showAlert('استاد به‌روزرسانی شد', 'success');
    }, 'در حال ذخیره...')
        .catch(error => {
            console.error('Error in handleEditInstructor:', error);
            showAlert(error.message || 'خطا در به‌روزرسانی استاد', 'error');
        });
}

export async function deleteInstructor(id, name, button) {
    if (!confirm(`آیا از حذف استاد «${name}» اطمینان دارید؟`)) return;

    const btn = button || window.event?.target?.closest('button');

    await withButtonLoading(btn, async () => {
        await API.del(`/instructors/${id}`);
        loadInstructors();
        showAlert('استاد حذف شد', 'success');
    }, 'در حال حذف...')
        .catch(error => showAlert(error.message, 'error'));
}

/**
 * پیش‌نمایش آواتار انتخاب‌شده قبل از ذخیره.
 * Live preview of the selected image before saving.
 */
export function bindInstructorAvatarPreview(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    const input = form.querySelector('input[type="file"]');
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
            <div class="relative w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-[#E2D9C6] to-[#d4c9b2]">
                <img src="${url}" alt="preview" class="w-full h-full object-cover">
            </div>
        `;
    });
}
