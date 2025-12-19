// Data Service - Student Data Management
// Gestão Centralizada FO - CMB

import { db } from '../firebase/config.js';
import {
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    writeBatch
} from 'firebase/firestore';
import { getSession, getCompanyFilter } from '../firebase/auth.js';
import { logAction } from './auditLogger.js';

// Map turma prefix to company
const TURMA_TO_COMPANY = {
    '6': '6cia',
    '7': '7cia',
    '8': '8cia',
    '9': '9cia',
    '1': '1cia',  // 1º ano EM (turmas 101-199)
    '2': '2cia',  // 2º ano EM (turmas 201-299)
    '3': '3cia',  // 3º ano EM (turmas 301-399)
};

/**
 * Get company from turma number
 * @param {string|number} turma 
 * @returns {string}
 */
export function getCompanyFromTurma(turma) {
    const turmaStr = String(turma);
    const prefix = turmaStr.charAt(0);
    return TURMA_TO_COMPANY[prefix] || null;
}

/**
 * Get ano escolar from turma
 * @param {string|number} turma 
 * @returns {string}
 */
export function getAnoEscolarFromTurma(turma) {
    const turmaStr = String(turma);
    const prefix = turmaStr.charAt(0);

    const anoMap = {
        '6': '6º Ano',
        '7': '7º Ano',
        '8': '8º Ano',
        '9': '9º Ano',
        '1': '1º Ano EM',
        '2': '2º Ano EM',
        '3': '3º Ano EM',
    };

    return anoMap[prefix] || turma;
}

/**
 * Parse CSV content and return array of student objects
 * @param {string} csvContent 
 * @returns {Array}
 */
export function parseStudentCSV(csvContent) {
    const lines = csvContent.split('\n');
    const students = [];

    // Skip header
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Parse CSV line (handle potential commas in names)
        const parts = line.split(',');
        if (parts.length >= 3) {
            const numero = parseInt(parts[0].trim());
            const nome = parts[1].trim();
            const turma = parts[2].trim().replace('\r', '');

            if (!isNaN(numero) && nome && turma) {
                const company = getCompanyFromTurma(turma);

                students.push({
                    numero,
                    nome,
                    turma,
                    company,
                    anoEscolar: getAnoEscolarFromTurma(turma)
                });
            }
        }
    }

    return students;
}

/**
 * Import students from CSV to Firestore
 * @param {string} csvContent 
 * @returns {Promise<{imported: number, errors: number}>}
 */
export async function importStudentsFromCSV(csvContent) {
    const students = parseStudentCSV(csvContent);
    let imported = 0;
    let errors = 0;

    // Use batched writes for efficiency
    const batchSize = 500;

    for (let i = 0; i < students.length; i += batchSize) {
        const batch = writeBatch(db);
        const batchStudents = students.slice(i, i + batchSize);

        for (const student of batchStudents) {
            try {
                // Use numero as document ID for easy lookup
                const docRef = doc(db, 'students', String(student.numero));
                batch.set(docRef, {
                    ...student,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
                imported++;
            } catch (err) {
                console.error('Error preparing student:', err);
                errors++;
            }
        }

        try {
            await batch.commit();
        } catch (err) {
            console.error('Error committing batch:', err);
            errors += batchStudents.length;
            imported -= batchStudents.length;
        }
    }

    return { imported, errors, total: students.length };
}

/**
 * Get all students filtered by current user's company
 * @returns {Promise<Array>}
 */
export async function getStudentsByCompany() {
    const companyFilter = getCompanyFilter();

    try {
        let q;
        if (companyFilter) {
            // Filter by company only - sort client-side to avoid composite index requirement
            q = query(
                collection(db, 'students'),
                where('company', '==', companyFilter)
            );
        } else {
            // Get all students
            q = query(collection(db, 'students'));
        }

        const snapshot = await getDocs(q);
        const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Sort client-side by turma then numero
        students.sort((a, b) => {
            const turmaCompare = String(a.turma || '').localeCompare(String(b.turma || ''));
            if (turmaCompare !== 0) return turmaCompare;
            return (a.numero || 0) - (b.numero || 0);
        });

        return students;
    } catch (error) {
        console.error('Error getting students:', error);
        return [];
    }
}

/**
 * Get students grouped by turma
 * @returns {Promise<Object>}
 */
export async function getStudentsGroupedByTurma() {
    const students = await getStudentsByCompany();

    const grouped = {};
    for (const student of students) {
        const turma = student.turma || 'Sem Turma';
        if (!grouped[turma]) {
            grouped[turma] = [];
        }
        grouped[turma].push(student);
    }

    // Sort turmas
    const sortedKeys = Object.keys(grouped).sort();
    const sortedGrouped = {};
    for (const key of sortedKeys) {
        sortedGrouped[key] = grouped[key];
    }

    return sortedGrouped;
}

/**
 * Search student by number (for public FO form auto-complete)
 * @param {number} numero 
 * @param {string} company - Optional company filter
 * @returns {Promise<Object|null>}
 */
export async function findStudentByNumber(numero, company = null) {
    try {
        // Try direct lookup first
        const docRef = doc(db, 'students', String(numero));
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const student = { id: docSnap.id, ...docSnap.data() };
            // If company filter, verify it matches
            if (company && student.company !== company) {
                return null;
            }
            return student;
        }

        return null;
    } catch (error) {
        console.error('Error finding student:', error);
        return null;
    }
}

/**
 * Search multiple students by their numbers
 * @param {Array<number>} numeros 
 * @param {string} company 
 * @returns {Promise<Array>}
 */
export async function findStudentsByNumbers(numeros, company = null) {
    const students = [];

    for (const numero of numeros) {
        const student = await findStudentByNumber(numero, company);
        if (student) {
            students.push(student);
        }
    }

    return students;
}

/**
 * Add a new student
 * @param {Object} studentData 
 * @returns {Promise<Object>}
 */
export async function addStudent(studentData) {
    const session = getSession();

    // Use numero as document ID
    const docRef = doc(db, 'students', String(studentData.numero));

    const data = {
        ...studentData,
        company: studentData.company || getCompanyFromTurma(studentData.turma),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: session?.username || 'system'
    };

    await setDoc(docRef, data);

    await logAction('create', 'students', String(studentData.numero), null, data);

    return { id: String(studentData.numero), ...data };
}

/**
 * Update an existing student
 * @param {string} studentId 
 * @param {Object} updateData 
 * @returns {Promise<Object>}
 */
export async function updateStudent(studentId, updateData) {
    const session = getSession();
    const docRef = doc(db, 'students', studentId);

    // Get previous data
    const prevDoc = await getDoc(docRef);
    const previousData = prevDoc.exists() ? prevDoc.data() : null;

    // If turma changed, update company
    if (updateData.turma) {
        updateData.company = getCompanyFromTurma(updateData.turma);
    }

    const data = {
        ...updateData,
        updatedAt: new Date().toISOString(),
        updatedBy: session?.username || 'system'
    };

    await updateDoc(docRef, data);

    await logAction('update', 'students', studentId, previousData, data);

    return { id: studentId, ...data };
}

/**
 * Delete a student
 * @param {string} studentId 
 */
export async function deleteStudent(studentId) {
    const docRef = doc(db, 'students', studentId);

    // Get previous data
    const prevDoc = await getDoc(docRef);
    const previousData = prevDoc.exists() ? prevDoc.data() : null;

    await deleteDoc(docRef);

    await logAction('delete', 'students', studentId, previousData, null);
}
