// PDF Generator - Termo de Ciência de Fato Observado
// Gestão Centralizada FO - CMB

import { COMPANY_NAMES, formatDate } from '../constants/index.js';

/**
 * Generate Termo de Ciência PDF for a Fato Observado
 * @param {Object} fo - Fato Observado data
 * @param {Object} studentData - Student data
 * @returns {Promise} Opens PDF in new window
 */
export function generateTermoPDF(fo, studentData = {}) {
  const student = {
    numero: fo.studentNumbers?.[0] || studentData.numero || '-',
    nome: fo.studentInfo?.[0]?.nome || studentData.nome || '-',
    turma: fo.studentInfo?.[0]?.turma || studentData.turma || '-'
  };

  // Get companhia name
  const turmaPrefix = String(student.turma).charAt(0);
  const companhiaMap = {
    '6': '6ª COMPANHIA DE ALUNOS',
    '7': '7ª COMPANHIA DE ALUNOS',
    '8': '8ª COMPANHIA DE ALUNOS',
    '9': '9ª COMPANHIA DE ALUNOS',
    '1': '1ª COMPANHIA DE ALUNOS',
    '2': '2ª COMPANHIA DE ALUNOS',
    '3': '3ª COMPANHIA DE ALUNOS'
  };
  const companhia = companhiaMap[turmaPrefix] || '2ª COMPANHIA DE ALUNOS';
  const ano = new Date().getFullYear();

  // Generate numero FO if not exists
  const numeroFO = fo.numeroFO || `${Date.now()}`;

  // Tipo do fato
  const tipoFato = fo.tipo === 'positivo' ? 'FATO OBSERVADO POSITIVO' : 'FATO OBSERVADO NEGATIVO';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Termo de Ciência - ${student.numero}</title>
      <style>
        @page {
          size: A4;
          margin: 1.5cm;
        }
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: Arial, sans-serif;
          font-size: 11pt;
          line-height: 1.4;
          color: #000;
        }
        
        .container {
          max-width: 100%;
          border: 2px solid #000;
        }
        
        .header {
          display: flex;
          border-bottom: 2px solid #000;
        }
        
        .header-left {
          flex: 1;
          padding: 10px;
          text-align: center;
          font-weight: bold;
          font-size: 10pt;
          border-right: 2px solid #000;
        }
        
        .header-right {
          flex: 1;
          padding: 10px;
          text-align: center;
          font-weight: bold;
        }
        
        .companhia {
          background: #f0f0f0;
          text-align: center;
          font-weight: bold;
          padding: 8px;
          border-bottom: 2px solid #000;
        }
        
        .row {
          display: flex;
          border-bottom: 1px solid #000;
        }
        
        .cell {
          padding: 8px;
          border-right: 1px solid #000;
        }
        
        .cell:last-child {
          border-right: none;
        }
        
        .cell-label {
          font-weight: bold;
        }
        
        .cell-full {
          flex: 1;
        }
        
        .section-title {
          background: #e0e0e0;
          text-align: center;
          font-weight: bold;
          padding: 8px;
          border-bottom: 1px solid #000;
        }
        
        .relato {
          padding: 15px;
          min-height: 150px;
          border-bottom: 2px solid #000;
        }
        
        .ciencia-title {
          background: #e0e0e0;
          text-align: center;
          font-weight: bold;
          padding: 8px;
          border-bottom: 1px solid #000;
        }
        
        .assinatura {
          padding: 15px;
          display: flex;
          align-items: center;
        }
        
        .assinatura-line {
          flex: 1;
          border-bottom: 1px solid #000;
          margin-left: 10px;
        }
        
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <div class="header-left">
            MINISTÉRIO DA DEFESA EXÉRCITO BRASILEIRO<br>
            DECEX – DEPA<br>
            COLÉGIO MILITAR DE BRASÍLIA
          </div>
          <div class="header-right">
            TERMO DE CIÊNCIA DE FATO OBSERVADO<br>
            Nº ${numeroFO}
          </div>
        </div>
        
        <!-- Companhia -->
        <div class="companhia">
          ${companhia} - ${ano}
        </div>
        
        <!-- Aluno Info -->
        <div class="row">
          <div class="cell" style="width: 120px;">
            <span class="cell-label">Alu Nr:</span> ${student.numero}
          </div>
          <div class="cell cell-full">
            <span class="cell-label">NOME:</span> ${student.nome}
          </div>
          <div class="cell" style="width: 100px;">
            <span class="cell-label">TURMA:</span> ${student.turma}
          </div>
        </div>
        
        <!-- Observador -->
        <div class="row">
          <div class="cell cell-full">
            <span class="cell-label">OBSERVADOR:</span> ${fo.nomeObservador || '-'}
          </div>
          <div class="cell" style="width: 150px;">
            <span class="cell-label">DATA:</span> ${formatDate(fo.dataFato)}
          </div>
        </div>
        
        <!-- Relato -->
        <div class="section-title">
          RELATO DO FATO<br>
          ${tipoFato}
        </div>
        <div class="relato">
          ${fo.descricao || '-'}
        </div>
        
        <!-- Ciência do Aluno -->
        <div class="ciencia-title">
          CIÊNCIA DO ALUNO
        </div>
        <div class="row">
          <div class="cell" style="width: 120px;">
            <span class="cell-label">Alu Nr:</span> ${student.numero}
          </div>
          <div class="cell cell-full">
            <span class="cell-label">Nome do aluno:</span> ${student.nome}
          </div>
          <div class="cell" style="width: 100px;">
            <span class="cell-label">Turma:</span> ${student.turma}
          </div>
        </div>
        
        <!-- Assinatura -->
        <div class="assinatura">
          <span class="cell-label">Assinatura do Aluno:</span>
          <div class="assinatura-line"></div>
        </div>
      </div>
      
      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  // Open in new window for printing
  const printWindow = window.open('', '_blank');
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

/**
 * Generate multiple Termos for FOs by registration date
 * @param {Array} fos - Array of Fatos Observados
 * @param {Object} studentDataCache - Cache of student data
 */
export function generateTermosByDate(fos, studentDataCache = {}) {
  if (fos.length === 0) {
    alert('Nenhum FO encontrado para a data selecionada.');
    return;
  }

  // Generate one PDF per student
  fos.forEach((fo, index) => {
    const studentData = studentDataCache[fo.studentNumbers?.[0]] || {};
    setTimeout(() => {
      generateTermoPDF(fo, studentData);
    }, index * 500); // Delay to avoid popup blocking
  });
}

/**
 * Get email config by company
 * @param {string} company 
 * @returns {Object}
 */
export function getEmailConfig(company) {
  const emailMap = {
    '6cia': '6ciaalcmb@gmail.com',
    '7cia': '7ciaalcmb@gmail.com',
    '8cia': '8ciaalcmb@gmail.com',
    '9cia': '9ciaalcmb@gmail.com',
    '1cia': '1ciaalcmb@gmail.com',
    '2cia': '2ciaalcmb@gmail.com',
    '3cia': '3ciaalcmb@gmail.com'
  };

  return {
    email: emailMap[company] || '2ciaalcmb@gmail.com',
    name: COMPANY_NAMES[company] || '2ª Companhia de Alunos'
  };
}

/**
 * Generate Aditamento PDF for sanctions
 * @param {Array} fos - Array of FOs with sanctions
 * @param {string} date - Date of aditamento
 */
export function generateAdtPDF(fos, date) {
  if (fos.length === 0) {
    alert('Nenhum FO encontrado para a data selecionada.');
    return;
  }

  // Get companhia from first FO
  const firstFO = fos[0];
  const turmaPrefix = String(firstFO.studentInfo?.[0]?.turma || '2').charAt(0);
  const companhiaMap = {
    '6': '6ª Companhia de Alunos',
    '7': '7ª Companhia de Alunos',
    '8': '8ª Companhia de Alunos',
    '9': '9ª Companhia de Alunos',
    '1': '1ª Companhia de Alunos',
    '2': '2ª Companhia de Alunos',
    '3': '3ª Companhia de Alunos'
  };
  const companhia = companhiaMap[turmaPrefix] || '2ª Companhia de Alunos';

  // Map sanção display names
  const sancaoDisplay = {
    'REPREENSAO': 'Repreensão',
    'ATIVIDADE_OE': 'AOE',
    'RETIRADA': 'Retirada'
  };

  // Map tipo falta by sanção type
  const tipoFaltaBySancao = {
    'REPREENSAO': 'MÉDIA',
    'ATIVIDADE_OE': 'MÉDIA',
    'RETIRADA': 'GRAVE'
  };

  // Generate content for each FO
  const sanctions = fos.map(fo => {
    const student = {
      numero: fo.studentNumbers?.[0] || '-',
      nome: fo.studentInfo?.[0]?.nome || '-',
      turma: fo.studentInfo?.[0]?.turma || '-'
    };

    const genero = student.nome?.toLowerCase().endsWith('a') ? 'a' : 'o';
    const sancaoNome = sancaoDisplay[fo.sancaoDisciplinar] || fo.sancaoDisciplinar;

    // Get enquadramento, agravantes, atenuantes
    const enquadramento = fo.enquadramento || 'N/A';
    const agravantes = fo.agravantes?.join(', ') || 'N/A';
    const atenuantes = fo.atenuantes?.join(', ') || 'N/A';

    // Tipo falta based on sanção type
    const tipoFalta = tipoFaltaBySancao[fo.sancaoDisciplinar] || 'MÉDIA';

    // Days for AOE and Retirada
    const dias = fo.quantidadeDias || 1;
    const needsDias = fo.sancaoDisciplinar === 'RETIRADA' || fo.sancaoDisciplinar === 'ATIVIDADE_OE';

    // Extra text for AOE and Retirada before CUMPRIMENTO
    const diasExtraText = needsDias
      ? `<p class="dias-text">O aluno cumprirá a medida disciplinar de <strong>${dias} dia(s)</strong> de <strong>${sancaoNome}</strong>.</p>`
      : '';

    // Text for Repreensão (no days)
    const diasText = needsDias ? ` por ${dias} dia(s)` : '';

    return `
            <div class="sanction-entry">
                <p>Ao Alun${genero} <strong>${student.numero}</strong>, <strong>${student.nome}</strong>, da turma <strong>${student.turma}</strong>, da ${companhia}.</p>
                
                <p class="descricao">${fo.descricao || 'Sem descrição.'}</p>
                
                <p>Conforme o número <strong>${enquadramento}</strong>, do apêndice 1 do anexo "F" do RICM, com as agravantes nº "<strong>${agravantes}</strong>" da letra "g" e atenuantes nº <strong>${atenuantes}</strong> da letra "f", tudo do item 4 do anexo "F"(NRRD), falta disciplinar considerada <strong>${tipoFalta}</strong>. O aluno cumprirá a medida disciplinar de <strong>${sancaoNome}</strong>.</p>
                
                ${diasExtraText}
                
                <p class="cumprimento"><strong>CUMPRIMENTO DE MEDIDA DISCIPLINAR:</strong><br>
                O cumprimento da Medida Disciplinar aplicada a${genero} Al <strong>${student.nome}</strong>, da turma <strong>${student.turma}</strong>, da ${companhia}, será de <strong>${sancaoNome}${diasText}</strong>, tendo em vista o caráter educacional da medida.</p>
            </div>
        `;
  }).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Notas para Aditamento - ${formatDate(date)}</title>
        <style>
            @page {
                size: A4;
                margin: 2cm;
            }
            
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Times New Roman', Times, serif;
                font-size: 12pt;
                line-height: 1.6;
                color: #000;
            }
            
            .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 2px solid #000;
                padding-bottom: 15px;
            }
            
            .header h1 {
                font-size: 14pt;
                margin-bottom: 5px;
            }
            
            .header h2 {
                font-size: 12pt;
                font-weight: normal;
            }
            
            .date-info {
                text-align: right;
                margin-bottom: 20px;
                font-style: italic;
            }
            
            .sanction-entry {
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 1px dashed #999;
                page-break-inside: avoid;
            }
            
            .sanction-entry:last-child {
                border-bottom: none;
            }
            
            .sanction-entry p {
                margin-bottom: 10px;
                text-align: justify;
            }
            
            .descricao {
                font-style: italic;
                margin: 15px 0;
            }
            
            .cumprimento {
                margin-top: 15px;
                padding: 10px;
                background: #f5f5f5;
                border-left: 3px solid #333;
            }
            
            @media print {
                body {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>MINISTÉRIO DA DEFESA – EXÉRCITO BRASILEIRO</h1>
            <h1>COLÉGIO MILITAR DE BRASÍLIA</h1>
            <h2>${companhia}</h2>
            <h2>NOTAS PARA ADITAMENTO AO BI</h2>
        </div>
        
        <div class="date-info">
            Data do Aditamento: ${formatDate(date)}
        </div>
        
        ${sanctions}
        
        <script>
            window.onload = function() {
                window.print();
            };
        </script>
    </body>
    </html>
    `;

  // Open in new window for printing
  const printWindow = window.open('', '_blank');
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

