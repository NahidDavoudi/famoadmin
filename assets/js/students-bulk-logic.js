/**
 * Admin Panel - Students bulk operations pure logic (no DOM, no API)
 * منطق خالص عملیات گروهی دانش‌آموزان
 */

export function studentsNeedingStatusChange(students, targetActive) {
    const target = targetActive ? 1 : 0;
    return students
        .filter(student => Number(student.is_active) !== target)
        .map(student => student.id);
}

export function studentsWithoutAccount(students) {
    return students
        .filter(student => !student.user_id)
        .map(student => student.id);
}

export function summarizeResults(results) {
    let succeeded = 0;
    let failed = 0;
    for (const result of results) {
        if (result.status === 'fulfilled') succeeded++;
        else failed++;
    }
    return { succeeded, failed };
}
