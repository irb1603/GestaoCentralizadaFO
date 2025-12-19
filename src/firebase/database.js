// Database Service
// Gestão Centralizada FO - CMB

import { db } from './config.js';
import {
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    Timestamp,
    serverTimestamp
} from 'firebase/firestore';
import { getSession, getCompanyFilter } from './auth.js';
import { logAction } from '../services/auditLogger.js';

// Collection names
const COLLECTIONS = {
    STUDENTS: 'students',
    FATOS_OBSERVADOS: 'fatosObservados',
    AUDIT_LOG: 'auditLog',
    USERS: 'users'
};

// ============================================
// Students CRUD
// ============================================

/**
 * Get all students (filtered by company for non-admin users)
 */
export async function getStudents() {
    const companyFilter = getCompanyFilter();
    let q;

    if (companyFilter) {
        q = query(
            collection(db, COLLECTIONS.STUDENTS),
            where('company', '==', companyFilter),
            orderBy('numero', 'asc')
        );
    } else {
        q = query(
            collection(db, COLLECTIONS.STUDENTS),
            orderBy('numero', 'asc')
        );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Get students by company
 */
export async function getStudentsByCompany(company) {
    const q = query(
        collection(db, COLLECTIONS.STUDENTS),
        where('company', '==', company),
        orderBy('numero', 'asc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Get student by number
 */
export async function getStudentByNumber(numero, company = null) {
    let q;

    if (company) {
        q = query(
            collection(db, COLLECTIONS.STUDENTS),
            where('numero', '==', numero),
            where('company', '==', company)
        );
    } else {
        q = query(
            collection(db, COLLECTIONS.STUDENTS),
            where('numero', '==', numero)
        );
    }

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
}

/**
 * Add new student
 */
export async function addStudent(studentData) {
    const session = getSession();

    const data = {
        ...studentData,
        createdAt: serverTimestamp(),
        createdBy: session?.username || 'system'
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.STUDENTS), data);

    await logAction('create', COLLECTIONS.STUDENTS, docRef.id, null, data);

    return { id: docRef.id, ...data };
}

/**
 * Update student
 */
export async function updateStudent(studentId, updateData) {
    const session = getSession();
    const docRef = doc(db, COLLECTIONS.STUDENTS, studentId);

    // Get previous data for audit
    const previousDoc = await getDoc(docRef);
    const previousData = previousDoc.exists() ? previousDoc.data() : null;

    const data = {
        ...updateData,
        updatedAt: serverTimestamp(),
        updatedBy: session?.username || 'system'
    };

    await updateDoc(docRef, data);

    await logAction('update', COLLECTIONS.STUDENTS, studentId, previousData, data);

    return { id: studentId, ...data };
}

/**
 * Delete student
 */
export async function deleteStudent(studentId) {
    const docRef = doc(db, COLLECTIONS.STUDENTS, studentId);

    // Get previous data for audit
    const previousDoc = await getDoc(docRef);
    const previousData = previousDoc.exists() ? previousDoc.data() : null;

    await deleteDoc(docRef);

    await logAction('delete', COLLECTIONS.STUDENTS, studentId, previousData, null);
}

// ============================================
// Fatos Observados CRUD
// ============================================

/**
 * Get all fatos observados (filtered by company for non-admin users)
 */
export async function getFatosObservados(filters = {}) {
    const companyFilter = getCompanyFilter();
    let constraints = [];

    if (companyFilter) {
        constraints.push(where('company', '==', companyFilter));
    } else if (filters.company) {
        constraints.push(where('company', '==', filters.company));
    }

    if (filters.status) {
        constraints.push(where('status', '==', filters.status));
    }

    if (filters.tipo) {
        constraints.push(where('tipo', '==', filters.tipo));
    }

    constraints.push(orderBy('createdAt', 'desc'));

    if (filters.limit) {
        constraints.push(limit(filters.limit));
    }

    const q = query(collection(db, COLLECTIONS.FATOS_OBSERVADOS), ...constraints);
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Get single fato observado
 */
export async function getFatoObservado(foId) {
    const docRef = doc(db, COLLECTIONS.FATOS_OBSERVADOS, foId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    return { id: docSnap.id, ...docSnap.data() };
}

/**
 * Add new fato observado
 */
export async function addFatoObservado(foData) {
    const session = getSession();

    const data = {
        ...foData,
        status: 'pendente',
        createdAt: serverTimestamp(),
        registradoPor: session?.username || foData.registradoPor || 'public'
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.FATOS_OBSERVADOS), data);

    await logAction('create', COLLECTIONS.FATOS_OBSERVADOS, docRef.id, null, data);

    return { id: docRef.id, ...data };
}

/**
 * Update fato observado
 */
export async function updateFatoObservado(foId, updateData) {
    const session = getSession();
    const docRef = doc(db, COLLECTIONS.FATOS_OBSERVADOS, foId);

    // Get previous data for audit
    const previousDoc = await getDoc(docRef);
    const previousData = previousDoc.exists() ? previousDoc.data() : null;

    const data = {
        ...updateData,
        updatedAt: serverTimestamp(),
        updatedBy: session?.username || 'system'
    };

    await updateDoc(docRef, data);

    await logAction('update', COLLECTIONS.FATOS_OBSERVADOS, foId, previousData, data);

    return { id: foId, ...data };
}

/**
 * Delete fato observado
 */
export async function deleteFatoObservado(foId) {
    const docRef = doc(db, COLLECTIONS.FATOS_OBSERVADOS, foId);

    // Get previous data for audit
    const previousDoc = await getDoc(docRef);
    const previousData = previousDoc.exists() ? previousDoc.data() : null;

    await deleteDoc(docRef);

    await logAction('delete', COLLECTIONS.FATOS_OBSERVADOS, foId, previousData, null);
}

// ============================================
// Dashboard Statistics
// ============================================

/**
 * Get dashboard statistics
 */
export async function getDashboardStats() {
    const companyFilter = getCompanyFilter();

    try {
        // Get all FOs for the company
        const fos = await getFatosObservados({});

        // Calculate stats
        const total = fos.length;
        const pendentes = fos.filter(fo => fo.status === 'pendente').length;
        const emProcesso = fos.filter(fo => fo.status === 'em_processo').length;
        const concluidos = fos.filter(fo => fo.status === 'concluido').length;
        const positivos = fos.filter(fo => fo.tipo === 'positivo').length;
        const negativos = fos.filter(fo => fo.tipo === 'negativo').length;

        // Get students count
        const students = await getStudents();
        const totalAlunos = students.length;

        return {
            total,
            pendentes,
            emProcesso,
            concluidos,
            positivos,
            negativos,
            totalAlunos
        };
    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        return {
            total: 0,
            pendentes: 0,
            emProcesso: 0,
            concluidos: 0,
            positivos: 0,
            negativos: 0,
            totalAlunos: 0
        };
    }
}

// ============================================
// Audit Log
// ============================================

/**
 * Get audit logs (filtered by company for commanders)
 */
export async function getAuditLogs(filters = {}) {
    const session = getSession();
    let constraints = [];

    // Commanders can only see their company's audit logs
    if (session?.role === 'commander' && session?.company) {
        constraints.push(where('company', '==', session.company));
    } else if (filters.company) {
        constraints.push(where('company', '==', filters.company));
    }

    if (filters.action) {
        constraints.push(where('action', '==', filters.action));
    }

    if (filters.userId) {
        constraints.push(where('userId', '==', filters.userId));
    }

    constraints.push(orderBy('timestamp', 'desc'));

    if (filters.limit) {
        constraints.push(limit(filters.limit));
    } else {
        constraints.push(limit(100));
    }

    const q = query(collection(db, COLLECTIONS.AUDIT_LOG), ...constraints);
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
