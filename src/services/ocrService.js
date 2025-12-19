/**
 * OCR Service for Attendance Sheet Processing
 * Uses Tesseract.js for text recognition
 */

import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker - use unpkg for reliable CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs';

/**
 * Convert PDF page to image canvas
 */
async function pdfPageToImage(pdfData, pageNum = 1) {
    try {
        const loadingTask = pdfjsLib.getDocument({ data: pdfData });

        // Add timeout to prevent infinite hanging
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout ao carregar PDF')), 30000)
        );

        const pdf = await Promise.race([loadingTask.promise, timeoutPromise]);
        const page = await pdf.getPage(pageNum);

        const scale = 2; // Higher scale for better OCR
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;

        return canvas;
    } catch (error) {
        console.error('Error converting PDF:', error);
        throw new Error('Erro ao converter PDF: ' + error.message);
    }
}

/**
 * Process image or PDF file for OCR
 */
export async function processAttendanceFile(file, onProgress = () => { }) {
    let imageSource;

    try {
        if (file.type === 'application/pdf') {
            onProgress({ status: 'Convertendo PDF para imagem...', percent: 10 });
            const arrayBuffer = await file.arrayBuffer();
            const canvas = await pdfPageToImage(new Uint8Array(arrayBuffer));
            imageSource = canvas;
        } else {
            imageSource = file;
        }

        onProgress({ status: 'Iniciando reconhecimento de texto...', percent: 20 });

        // Run OCR with Portuguese language
        const result = await Tesseract.recognize(imageSource, 'por', {
            logger: (m) => {
                if (m.status === 'recognizing text') {
                    const percent = 20 + Math.round(m.progress * 70);
                    onProgress({ status: 'Reconhecendo texto...', percent });
                }
            }
        });

        onProgress({ status: 'Processando resultados...', percent: 95 });

        // Parse the OCR result
        const attendanceData = parseOCRResult(result.data.text, result.data.lines);

        onProgress({ status: 'Concluído!', percent: 100 });

        return attendanceData;
    } catch (error) {
        console.error('OCR Processing error:', error);
        throw error;
    }
}

/**
 * Parse OCR text result into structured attendance data
 */
function parseOCRResult(text, lines) {
    const students = [];
    const periods = ['form', 't1', 't2', 't3', 't4', 't5', 't6', 't7'];

    // Split into lines and process each
    const textLines = text.split('\n').filter(line => line.trim());

    let turmaNumber = null;

    // Try to find turma number in header (e.g., "201")
    const turmaMatch = text.match(/\b(\d{3})\b/);
    if (turmaMatch) {
        turmaNumber = turmaMatch[1];
    }

    // Process each line looking for student data
    for (const line of textLines) {
        // Skip header lines
        if (line.includes('MINISTÉRIO') ||
            line.includes('COLÉGIO') ||
            line.includes('LISTAGEM') ||
            line.includes('ORD') ||
            line.includes('DISCIPLINAS') ||
            line.includes('ASSINATURA') ||
            line.includes('DATA:') ||
            line.includes('CHEFE')) {
            continue;
        }

        // Try to parse student line
        // Expected format: ORD NR NOME ANO TURMA ITI FORM 1T 2T 3T 4T 5T 6T 7T
        const studentMatch = parseStudentLine(line);
        if (studentMatch) {
            students.push(studentMatch);
        }
    }

    return {
        turma: turmaNumber,
        students,
        rawText: text
    };
}

/**
 * Parse a single student line from OCR text
 */
function parseStudentLine(line) {
    // Clean up the line
    const cleaned = line.trim().replace(/\s+/g, ' ');

    // Try to extract student number and name
    // Pattern: number number NAME ...
    const match = cleaned.match(/^(\d+)\s+(\d+)\s+([A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][A-ZÁÉÍÓÚÀÂÊÔÃÕÇa-záéíóúàâêôãõç\s]+)/i);

    if (!match) return null;

    const ordem = parseInt(match[1]);
    const numero = parseInt(match[2]);
    const nomeGuerra = match[3].trim().split(/\s+/)[0]; // Take first word as nome de guerra

    // Extract attendance marks (F for absent, anything else for present)
    const remainingText = cleaned.substring(match[0].length);
    const attendanceMarks = extractAttendanceMarks(remainingText);

    return {
        ordem,
        numero,
        nomeGuerra,
        tempos: {
            form: attendanceMarks[0] || 'P',
            t1: attendanceMarks[1] || 'P',
            t2: attendanceMarks[2] || 'P',
            t3: attendanceMarks[3] || 'P',
            t4: attendanceMarks[4] || 'P',
            t5: attendanceMarks[5] || 'P',
            t6: attendanceMarks[6] || 'P',
            t7: attendanceMarks[7] || 'P'
        },
        justificada: false
    };
}

/**
 * Extract attendance marks from text
 */
function extractAttendanceMarks(text) {
    const marks = [];

    // Look for F (absence) or other characters (presence)
    // The OCR might recognize dots as various chars like . o O 0 etc.
    const tokens = text.split(/\s+/).filter(t => t.length > 0);

    for (let i = 0; i < 8 && i < tokens.length; i++) {
        const token = tokens[i].toUpperCase();

        // Check if it contains 'F' for absence
        if (token === 'F' || token.includes('F')) {
            marks.push('F');
        } else if (token === 'CAMIL' || token === 'CAML' || token.includes('ANO')) {
            // Skip non-attendance columns
            continue;
        } else {
            // Consider as present (could be dot, circle, empty, etc.)
            marks.push('P');
        }
    }

    // Pad with P if we don't have 8 marks
    while (marks.length < 8) {
        marks.push('P');
    }

    return marks;
}

/**
 * Calculate total absences for a student
 */
export function calculateTotalFaltas(tempos) {
    return Object.values(tempos).filter(v => v === 'F').length;
}
