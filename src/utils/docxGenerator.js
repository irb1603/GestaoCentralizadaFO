/**
 * DOCX Generator for Notas Aditamento
 * Uses the 'docx' library to generate Word documents
 */

import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import { formatDate } from '../constants/index.js';
import { getSession, COMPANY_NAMES } from '../firebase/auth.js';

/**
 * Get company name from turma
 */
function getCompanyNameFromTurma(turma) {
    const turmaPrefix = String(turma || '2').charAt(0);
    const companhiaMap = {
        '6': '6ª Companhia de Alunos',
        '7': '7ª Companhia de Alunos',
        '8': '8ª Companhia de Alunos',
        '9': '9ª Companhia de Alunos',
        '1': '1ª Companhia de Alunos',
        '2': '2ª Companhia de Alunos',
        '3': '3ª Companhia de Alunos'
    };
    return companhiaMap[turmaPrefix] || '2ª Companhia de Alunos';
}

/**
 * Format enquadramento for display
 */
function formatEnquadramento(enquadramento) {
    if (!enquadramento) return '-';
    if (Array.isArray(enquadramento)) {
        return enquadramento.join(', ');
    }
    return String(enquadramento);
}

/**
 * Format agravantes/atenuantes for display
 */
function formatCircunstancias(value) {
    if (!value || value === '') return 'sem';
    if (Array.isArray(value)) {
        if (value.length === 0) return 'sem';
        return value.join(' e ');
    }
    return String(value);
}

/**
 * Generate DOCX document for Notas Aditamento
 * @param {Array} fos - Array of FO objects for this date
 * @param {string} date - The aditamento date
 */
export async function generateAdtDOCX(fos, date) {
    const session = getSession();
    const companyName = session?.company ? COMPANY_NAMES[session.company] : 'Colégio Militar de Brasília';

    // Group FOs by sanction type
    const byRepreensao = fos.filter(fo => fo.sancaoDisciplinar === 'REPREENSAO');
    const byAOE = fos.filter(fo => fo.sancaoDisciplinar === 'ATIVIDADE_OE');
    const byRetirada = fos.filter(fo => fo.sancaoDisciplinar === 'RETIRADA');

    const children = [];

    // Header
    children.push(
        new Paragraph({
            text: 'NOTA PARA ADITAMENTO AO BI',
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
        }),
        new Paragraph({
            text: companyName,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
        }),
        new Paragraph({
            text: `Data do Aditamento: ${formatDate(date)}`,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
        })
    );

    // Generate sections for each sanction type
    if (byRepreensao.length > 0) {
        children.push(...generateRepreensaoSection(byRepreensao));
    }

    if (byAOE.length > 0) {
        children.push(...generateAOESection(byAOE));
    }

    if (byRetirada.length > 0) {
        children.push(...generateRetiradaSection(byRetirada));
    }

    // Footer
    children.push(
        new Paragraph({ text: '', spacing: { before: 400 } }),
        new Paragraph({
            text: '___________________________',
            alignment: AlignmentType.CENTER,
            spacing: { before: 600 }
        }),
        new Paragraph({
            text: 'Assinatura do Comandante',
            alignment: AlignmentType.CENTER
        })
    );

    // Create document
    const doc = new Document({
        sections: [{
            properties: {},
            children: children
        }]
    });

    // Generate and save file
    const blob = await Packer.toBlob(doc);
    const fileName = `Nota_Aditamento_${date.replace(/-/g, '')}.docx`;
    saveAs(blob, fileName);
}

/**
 * Generate REPREENSÃO section
 * Falta disciplinar: MÉDIA
 * Não tem dias de cumprimento
 */
function generateRepreensaoSection(fos) {
    const elements = [];

    // Section title
    elements.push(
        new Paragraph({
            text: 'REPREENSÃO',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 }
        })
    );

    fos.forEach((fo) => {
        const studentNumber = fo.studentNumbers?.[0] || '-';
        const studentName = fo.studentInfo?.[0]?.nome || '-';
        const studentTurma = fo.studentInfo?.[0]?.turma || '-';
        const companyName = getCompanyNameFromTurma(studentTurma);

        const enquadramento = formatEnquadramento(fo.enquadramento);
        const agravantes = formatCircunstancias(fo.agravante);
        const atenuantes = formatCircunstancias(fo.atenuante);
        const descricao = fo.descricao || '';

        // Determine agravantes text
        const agravantesText = agravantes === 'sem'
            ? 'sem agravantes da letra "g"'
            : `com as agravantes nº ${agravantes} da letra "g"`;

        // Determine atenuantes text  
        const atenuantesText = atenuantes === 'sem'
            ? 'sem atenuantes da letra "f"'
            : `atenuantes nº ${atenuantes} da letra "f"`;

        // Main paragraph
        elements.push(
            new Paragraph({
                children: [
                    new TextRun({ text: `Ao Aluno(a) ${studentNumber}, ${studentName}, da turma ${studentTurma}, da ${companyName}. ${descricao}. Conforme o número ${enquadramento}, do apêndice 1 do anexo "F" do RICM, ${agravantesText} e ${atenuantesText}, tudo do item 4 do anexo "F"(NRRD), falta disciplinar considerada ` }),
                    new TextRun({ text: 'MÉDIA', bold: true }),
                    new TextRun({ text: '. O aluno cumprirá a medida disciplinar de Repreensão.' })
                ],
                spacing: { before: 200, after: 200 }
            })
        );

        // Cumprimento section
        elements.push(
            new Paragraph({
                children: [
                    new TextRun({ text: 'CUMPRIMENTO DE MEDIDA DISCIPLINAR:', bold: true })
                ],
                spacing: { before: 100 }
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: `O cumprimento da Medida Disciplinar aplicada ao(a) Al ${studentName}, da turma ${studentTurma}, da ${companyName}, será de Repreensão, tendo em vista o caráter educacional da medida.` })
                ],
                spacing: { after: 300 }
            })
        );
    });

    return elements;
}

/**
 * Generate ATIVIDADE DE ORIENTAÇÃO EDUCACIONAL section
 * Falta disciplinar: MÉDIA
 * Tem dias de cumprimento
 */
function generateAOESection(fos) {
    const elements = [];

    // Section title
    elements.push(
        new Paragraph({
            text: 'ATIVIDADE DE ORIENTAÇÃO EDUCACIONAL',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 }
        })
    );

    fos.forEach((fo) => {
        const studentNumber = fo.studentNumbers?.[0] || '-';
        const studentName = fo.studentInfo?.[0]?.nome || '-';
        const studentTurma = fo.studentInfo?.[0]?.turma || '-';
        const companyName = getCompanyNameFromTurma(studentTurma);

        const enquadramento = formatEnquadramento(fo.enquadramento);
        const agravantes = formatCircunstancias(fo.agravante);
        const atenuantes = formatCircunstancias(fo.atenuante);
        const descricao = fo.descricao || '';
        const qtdDias = fo.qtdDiasSancao || 1;
        const diasText = qtdDias === 1 ? '01 (um) dia' : `${String(qtdDias).padStart(2, '0')} dias`;

        // Determine agravantes text
        const agravantesText = agravantes === 'sem'
            ? 'sem agravantes da letra "g"'
            : `com as agravantes nº ${agravantes} da letra "g"`;

        // Determine atenuantes text  
        const atenuantesText = atenuantes === 'sem'
            ? 'sem atenuantes da letra "f"'
            : `atenuantes nº ${atenuantes} da letra "f"`;

        // Main paragraph
        elements.push(
            new Paragraph({
                children: [
                    new TextRun({ text: `Ao Aluno(a) ${studentNumber}, ${studentName}, da turma ${studentTurma}, da ${companyName}. Por ter ${descricao}. Conforme o número ${enquadramento}, do apêndice 1 do anexo "F" do RICM, ${agravantesText} e ${atenuantesText}, tudo do item 4 do anexo "F"(NRRD), falta disciplinar considerada ` }),
                    new TextRun({ text: 'MÉDIA', bold: true }),
                    new TextRun({ text: `. O aluno cumprirá a medida disciplinar de ${diasText} de Atividade de Orientação Educacional.` })
                ],
                spacing: { before: 200, after: 200 }
            })
        );

        // Cumprimento section
        elements.push(
            new Paragraph({
                children: [
                    new TextRun({ text: 'CUMPRIMENTO DE MEDIDA DISCIPLINAR:', bold: true })
                ],
                spacing: { before: 100 }
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: `O cumprimento da Medida Disciplinar aplicada ao(a) Al ${studentName}, da turma ${studentTurma}, da ${companyName}, será de Atividade de Orientação Educacional, tendo em vista o caráter educacional da medida.` })
                ],
                spacing: { after: 300 }
            })
        );
    });

    return elements;
}

/**
 * Generate RETIRADA section
 * Falta disciplinar: GRAVE
 * Tem dias de cumprimento
 */
function generateRetiradaSection(fos) {
    const elements = [];

    // Section title
    elements.push(
        new Paragraph({
            text: 'RETIRADA',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 }
        })
    );

    fos.forEach((fo) => {
        const studentNumber = fo.studentNumbers?.[0] || '-';
        const studentName = fo.studentInfo?.[0]?.nome || '-';
        const studentTurma = fo.studentInfo?.[0]?.turma || '-';
        const companyName = getCompanyNameFromTurma(studentTurma);

        const enquadramento = formatEnquadramento(fo.enquadramento);
        const agravantes = formatCircunstancias(fo.agravante);
        const atenuantes = formatCircunstancias(fo.atenuante);
        const descricao = fo.descricao || '';
        const qtdDias = fo.qtdDiasSancao || 1;
        const diasText = qtdDias === 1 ? '01 (um) dia' : `${String(qtdDias).padStart(2, '0')} dias`;

        // Determine agravantes text
        const agravantesText = agravantes === 'sem'
            ? 'sem agravantes da letra "g"'
            : `com as agravantes nº ${agravantes} da letra "g"`;

        // Determine atenuantes text  
        const atenuantesText = atenuantes === 'sem'
            ? 'sem atenuantes da letra "f"'
            : `atenuantes nº ${atenuantes} da letra "f"`;

        // Main paragraph - Note: GRAVE instead of MÉDIA, and Retirada instead of AOE
        elements.push(
            new Paragraph({
                children: [
                    new TextRun({ text: `Ao Aluno(a) ${studentNumber}, ${studentName}, da turma ${studentTurma}, da ${companyName}. Por ter ${descricao}. Conforme o número ${enquadramento}, do apêndice 1 do anexo "F" do RICM, ${agravantesText} e ${atenuantesText}, tudo do item 4 do anexo "F"(NRRD), falta disciplinar considerada ` }),
                    new TextRun({ text: 'GRAVE', bold: true }),
                    new TextRun({ text: `. O aluno cumprirá a medida disciplinar de ${diasText} de Retirada.` })
                ],
                spacing: { before: 200, after: 200 }
            })
        );

        // Cumprimento section
        elements.push(
            new Paragraph({
                children: [
                    new TextRun({ text: 'CUMPRIMENTO DE MEDIDA DISCIPLINAR:', bold: true })
                ],
                spacing: { before: 100 }
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: `O cumprimento da Medida Disciplinar aplicada ao(a) Al ${studentName}, da turma ${studentTurma}, da ${companyName}, será de Retirada, tendo em vista o caráter educacional da medida.` })
                ],
                spacing: { after: 300 }
            })
        );
    });

    return elements;
}

