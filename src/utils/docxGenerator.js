/**
 * DOCX Generator for Notas Aditamento
 * Uses the 'docx' library to generate Word documents
 */

import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import { SANCAO_DISCIPLINAR, formatDate } from '../constants/index.js';
import { getSession, COMPANY_NAMES } from '../firebase/auth.js';

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
        children.push(...generateSanctionSection('REPREENSÃO', byRepreensao));
    }

    if (byAOE.length > 0) {
        children.push(...generateSanctionSection('ATIVIDADE DE ORDEM ESCOLAR (AOE)', byAOE));
    }

    if (byRetirada.length > 0) {
        children.push(...generateSanctionSection('RETIRADA', byRetirada));
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
 * Generate section for a sanction type
 */
function generateSanctionSection(title, fos) {
    const elements = [];

    // Section title
    elements.push(
        new Paragraph({
            text: title,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 }
        })
    );

    // Generate paragraph for each FO
    fos.forEach((fo, index) => {
        const studentNumber = fo.studentNumbers?.[0] || '-';
        const studentName = fo.studentInfo?.[0]?.nome || '-';
        const studentTurma = fo.studentInfo?.[0]?.turma || '-';
        const enquadramento = Array.isArray(fo.enquadramento) ? fo.enquadramento.join('; ') : (fo.enquadramento || '-');
        const sancaoLabel = SANCAO_DISCIPLINAR[fo.sancaoDisciplinar]?.label || fo.sancaoDisciplinar;

        // Student info
        elements.push(
            new Paragraph({
                children: [
                    new TextRun({ text: `${index + 1}. `, bold: true }),
                    new TextRun({ text: `Nº ${studentNumber} - ${studentName}`, bold: true }),
                    new TextRun({ text: ` (Turma ${studentTurma})` })
                ],
                spacing: { before: 200 }
            })
        );

        // Details
        elements.push(
            new Paragraph({
                children: [
                    new TextRun({ text: 'Enquadramento: ', bold: true }),
                    new TextRun({ text: enquadramento })
                ],
                indent: { left: 360 }
            })
        );

        elements.push(
            new Paragraph({
                children: [
                    new TextRun({ text: 'Sanção: ', bold: true }),
                    new TextRun({ text: sancaoLabel })
                ],
                indent: { left: 360 }
            })
        );

        if (fo.qtdDiasSancao) {
            elements.push(
                new Paragraph({
                    children: [
                        new TextRun({ text: 'Quantidade de Dias: ', bold: true }),
                        new TextRun({ text: String(fo.qtdDiasSancao) })
                    ],
                    indent: { left: 360 }
                })
            );
        }

        if (fo.datasCumprimento && fo.datasCumprimento.length > 0) {
            elements.push(
                new Paragraph({
                    children: [
                        new TextRun({ text: 'Datas de Cumprimento: ', bold: true }),
                        new TextRun({ text: fo.datasCumprimento.map(d => formatDate(d)).join(', ') })
                    ],
                    indent: { left: 360 }
                })
            );
        }

        // Fato description
        elements.push(
            new Paragraph({
                children: [
                    new TextRun({ text: 'Descrição: ', bold: true }),
                    new TextRun({ text: fo.descricao || '-' })
                ],
                indent: { left: 360 },
                spacing: { after: 200 }
            })
        );
    });

    return elements;
}
