/**
 * Admin Panel - Exam Results Refresh
 * دکمه به‌روزرسانی نتایج آزمون
 */

import { icon, withButtonLoading } from './utils.js';
import * as config from './config.js';
import { loadExams, loadExamStudents, loadExamDetails } from './exams.js';

export function initExamsRefresh() {
    if (!document.getElementById('page-exams')) return;

    const clearBtn = document.querySelector('#page-exams button[onclick="clearExamsFilter()"]');
    if (!clearBtn) return;

    if (document.getElementById('examsRefreshBtn')) return;

    const btn = document.createElement('button');
    btn.id = 'examsRefreshBtn';
    btn.type = 'button';
    btn.className = 'px-4 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition flex items-center justify-center gap-2';
    btn.innerHTML = `${icon('refresh-cw', 'icon')}<span>به‌روزرسانی</span>`;

    btn.addEventListener('click', () => {
        withButtonLoading(btn, async () => {
            if (config.currentExamView === 'students') {
                await loadExamStudents(config.currentExamDate);
            } else if (config.currentExamView === 'details') {
                await loadExamDetails(config.currentExamDate, config.currentExamStudentId);
            } else {
                await loadExams();
            }
        }, 'در حال دریافت...');
    });

    clearBtn.insertAdjacentElement('beforebegin', btn);
}
