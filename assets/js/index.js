/**
 * Famo Admin Panel - Entry Point (Modular)
 * پنل مدیریت فامو - نقطه ورود ماژولار
 */

import { init, setupEventListeners } from './events.js?v=202610280033';
import { showModal, hideModal } from './utils.js?v=202610280033';
import { loadStudents, editStudent, deleteStudent, createStudentAccount, resetStudentPassword, clearStudentFilters, toggleStudentStatus, toggleStudentSelection, toggleSelectAllStudents, clearStudentSelection, bulkDeleteStudents, bulkSetStudentStatus, bulkCreateStudentAccounts } from './students.js';
import { openStudentDetail, startAddParentContact, startEditParentContact, cancelParentContactForm, deleteParentContact, loadParentContacts } from './parents.js';
import { editSupporter, deleteSupporter } from './supporters.js?v=202610280033';
import { loadExams, loadExamStudents, loadExamDetails, goBackFromExamDetails, clearExamsFilter } from './exams.js';
import { addSubjectRow, removeSubjectRow, clearExamForm, calculateSkipped } from './exam-entry.js?v=202610280033';
import { deleteFile } from './files.js?v=202610280033';
import { editCourse, deleteCourse } from './courses.js?v=202610280033';
import { editInstructor, deleteInstructor } from './instructors.js?v=202610280033';
import { navigateTo } from './nav.js';
import { loadReports } from './reports.js';
import { loadBlogPosts, handleBlogSubmit, openBlogEditor, editBlogPost, deleteBlogPost } from './blog.js?v=202610280033';
import { initExamsRefresh } from './exams-refresh.js';

const { onReady } = await import(`${window.APP_CONFIG.assetUrl}/js/api.js`);

// Expose for HTML onclick and inline handlers
window.showModal = showModal;
window.hideModal = hideModal;
window.loadStudents = loadStudents;
window.editStudent = editStudent;
window.deleteStudent = deleteStudent;
window.createStudentAccount = createStudentAccount;
window.resetStudentPassword = resetStudentPassword;
window.clearStudentFilters = clearStudentFilters;
window.toggleStudentStatus = toggleStudentStatus;
window.toggleStudentSelection = toggleStudentSelection;
window.toggleSelectAllStudents = toggleSelectAllStudents;
window.clearStudentSelection = clearStudentSelection;
window.bulkDeleteStudents = bulkDeleteStudents;
window.bulkSetStudentStatus = bulkSetStudentStatus;
window.bulkCreateStudentAccounts = bulkCreateStudentAccounts;
window.openStudentDetail = openStudentDetail;
window.startAddParentContact = startAddParentContact;
window.startEditParentContact = startEditParentContact;
window.cancelParentContactForm = cancelParentContactForm;
window.deleteParentContact = deleteParentContact;
window.loadParentContacts = loadParentContacts;
window.editSupporter = editSupporter;
window.deleteSupporter = deleteSupporter;
window.loadExams = loadExams;
window.loadExamStudents = loadExamStudents;
window.loadExamDetails = loadExamDetails;
window.goBackFromExamDetails = goBackFromExamDetails;
window.clearExamsFilter = clearExamsFilter;
window.addSubjectRow = addSubjectRow;
window.removeSubjectRow = removeSubjectRow;
window.clearExamForm = clearExamForm;
window.calculateSkipped = calculateSkipped;
window.deleteFile = deleteFile;
window.editCourse = editCourse;
window.deleteCourse = deleteCourse;
window.editInstructor = editInstructor;
window.deleteInstructor = deleteInstructor;
window.navigateTo = navigateTo;
window.loadReports = loadReports;
window.loadBlogPosts = loadBlogPosts;
window.openBlogEditor = openBlogEditor;
window.handleBlogSubmit = handleBlogSubmit;
window.editBlogPost = editBlogPost;
window.deleteBlogPost = deleteBlogPost;

let adminInitialized = false;
const initializeAdmin = () => {
    if (adminInitialized) return;
    adminInitialized = true;

    init();
    initExamsRefresh();

    // First subject row on exam entry page
    const subjectsContainer = document.getElementById('subjectsContainer');
    if (subjectsContainer && subjectsContainer.children.length === 0) {
        addSubjectRow();
    }
};

onReady(initializeAdmin);
