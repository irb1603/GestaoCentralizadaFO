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
 * Pre-process image for better OCR accuracy
 * Applies grayscale, contrast enhancement, and binarization
 */
async function preprocessImage(imageSource) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Use higher resolution for better OCR
            const scale = 2;
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;

            // Draw image scaled up
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // Get image data
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Step 1: Convert to grayscale
            for (let i = 0; i < data.length; i += 4) {
                const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                data[i] = gray;
                data[i + 1] = gray;
                data[i + 2] = gray;
            }

            // Step 2: Increase contrast
            const contrast = 1.5; // Contrast factor
            const factor = (259 * (contrast * 100 + 255)) / (255 * (259 - contrast * 100));
            for (let i = 0; i < data.length; i += 4) {
                data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
                data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128));
                data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128));
            }

            // Step 3: Adaptive binarization (Otsu's method simplified)
            // Calculate histogram
            const histogram = new Array(256).fill(0);
            for (let i = 0; i < data.length; i += 4) {
                histogram[Math.floor(data[i])]++;
            }

            // Find optimal threshold (Otsu)
            let total = data.length / 4;
            let sum = 0;
            for (let i = 0; i < 256; i++) sum += i * histogram[i];

            let sumB = 0, wB = 0, wF = 0;
            let maxVariance = 0, threshold = 128;

            for (let i = 0; i < 256; i++) {
                wB += histogram[i];
                if (wB === 0) continue;
                wF = total - wB;
                if (wF === 0) break;

                sumB += i * histogram[i];
                const mB = sumB / wB;
                const mF = (sum - sumB) / wF;
                const variance = wB * wF * (mB - mF) * (mB - mF);

                if (variance > maxVariance) {
                    maxVariance = variance;
                    threshold = i;
                }
            }

            // Apply threshold
            for (let i = 0; i < data.length; i += 4) {
                const val = data[i] > threshold ? 255 : 0;
                data[i] = val;
                data[i + 1] = val;
                data[i + 2] = val;
            }

            // Put processed image back
            ctx.putImageData(imageData, 0, 0);

            resolve(canvas);
        };

        img.onerror = () => {
            // If image fails to load, return original source
            resolve(imageSource);
        };

        // Handle different image source types
        if (imageSource instanceof HTMLCanvasElement) {
            img.src = imageSource.toDataURL();
        } else if (imageSource instanceof File || imageSource instanceof Blob) {
            img.src = URL.createObjectURL(imageSource);
        } else if (typeof imageSource === 'string') {
            img.src = imageSource;
        } else {
            resolve(imageSource);
        }
    });
}

/**
 * Process image or PDF file for OCR
 */
export async function processAttendanceFile(file, onProgress = () => { }) {
    let imageSource;

    try {
        if (file.type === 'application/pdf') {
            onProgress({ status: 'Convertendo PDF para imagem...', percent: 5 });
            const arrayBuffer = await file.arrayBuffer();
            const canvas = await pdfPageToImage(new Uint8Array(arrayBuffer));
            imageSource = canvas;
        } else {
            imageSource = file;
        }

        onProgress({ status: 'Pré-processando imagem...', percent: 10 });

        // Apply image preprocessing for better OCR
        const processedImage = await preprocessImage(imageSource);

        onProgress({ status: 'Iniciando reconhecimento de texto...', percent: 20 });

        // Run OCR with Portuguese language and optimized settings
        const result = await Tesseract.recognize(processedImage, 'por', {
            logger: (m) => {
                if (m.status === 'recognizing text') {
                    const percent = 20 + Math.round(m.progress * 70);
                    onProgress({ status: 'Reconhecendo texto...', percent });
                }
            },
            // Tesseract configuration for better table/list recognition
            tessedit_pageseg_mode: '6', // Assume uniform block of text
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÁÉÍÓÚÀÂÊÔÃÕÇáéíóúàâêôãõç0123456789 .-/FP',
            preserve_interword_spaces: '1',
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

    // Try multiple patterns to extract student data
    // Pattern 1: ORD NR NAME ... (standard format)
    let match = cleaned.match(/^(\d+)\s+(\d+)\s+([A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][A-ZÁÉÍÓÚÀÂÊÔÃÕÇa-záéíóúàâêôãõç\s]+)/i);

    // Pattern 2: Just NR NAME (if ORD is missing or unreadable)
    if (!match) {
        match = cleaned.match(/^(\d{3,5})\s+([A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][A-ZÁÉÍÓÚÀÂÊÔÃÕÇa-záéíóúàâêôãõç\s]+)/i);
        if (match) {
            // Shift match groups to maintain compatibility
            match = [match[0], '0', match[1], match[2]];
        }
    }

    // Pattern 3: More flexible - any line with a 3-5 digit number followed by text
    if (!match) {
        const flexMatch = cleaned.match(/(\d{3,5}).*?([A-ZÁÉÍÓÚÀÂÊÔÃÕÇ]{2,})/i);
        if (flexMatch) {
            match = [flexMatch[0], '0', flexMatch[1], flexMatch[2]];
        }
    }

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
 * Calculate total absences (DAYS) for a student
 * 1 day of absence = all 8 periods (formatura + 7 tempos) marked as F
 */
export function calculateTotalFaltas(tempos) {
    const totalFs = Object.values(tempos).filter(v => v === 'F').length;
    // Only count as 1 day if ALL 8 periods are F
    return totalFs === 8 ? 1 : 0;
}

/**
 * Calculate total individual F marks (for display purposes)
 */
export function countTotalFs(tempos) {
    return Object.values(tempos).filter(v => v === 'F').length;
}
