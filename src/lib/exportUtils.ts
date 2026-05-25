/**
 * Utility functions for Beautiful, Arabic-friendly exports to Word, Excel, and PDF.
 * This completely avoids issues with Arabic RTL text reversal and spacing.
 */

export interface ExportField {
  label: string;
  value: string | number | undefined;
}

export interface ExportTable {
  headers: string[];
  rows: (string | number)[][];
}

export interface ExportSection {
  title?: string;
  fields?: ExportField[];
  table?: ExportTable;
  text?: string;
}

export interface ExportPayload {
  title: string;
  subtitle?: string;
  metadata?: ExportField[];
  sections: ExportSection[];
  filename: string;
}

// Global CSS for the exported files (Word & PDF)
const getCommonStyles = (lang: 'ar' | 'en') => `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Tajawal:wght@400;700;800&display=swap');
  
  body {
    font-family: ${lang === 'ar' ? '"Tajawal", "Inter", sans-serif' : '"Inter", sans-serif'};
    margin: 40px;
    color: #1e293b; /* slate-800 */
    background-color: #ffffff;
    line-height: 1.6;
    direction: ${lang === 'ar' ? 'rtl' : 'ltr'};
    text-align: ${lang === 'ar' ? 'right' : 'left'};
  }
  
  .header-container {
    border-bottom: 3px solid #0284c7; /* sky-600 */
    padding-bottom: 20px;
    margin-bottom: 30px;
  }
  
  .header-title {
    font-size: 28px;
    font-weight: 800;
    color: #0c4a6e; /* sky-900 */
    margin: 0 0 5px 0;
  }
  
  .header-subtitle {
    font-size: 16px;
    color: #0284c7; /* sky-600 */
    font-weight: 700;
    margin: 0 0 15px 0;
  }
  
  .metadata-grid {
    display: table;
    width: 100%;
    margin-bottom: 15px;
    background-color: #f8fafc; /* slate-50 */
    border-radius: 12px;
    padding: 15px;
    border: 1px solid #e2e8f0; /* slate-200 */
  }
  
  .metadata-row {
    display: table-row;
  }
  
  .metadata-cell {
    display: table-cell;
    padding: 6px 12px;
    font-size: 13px;
  }
  
  .metadata-label {
    font-weight: 700;
    color: #64748b; /* slate-500 */
    margin-${lang === 'ar' ? 'left' : 'right'}: 8px;
  }
  
  .metadata-value {
    color: #0f172a; /* slate-900 */
    font-weight: 700;
  }
  
  .section-container {
    margin-bottom: 35px;
    page-break-inside: avoid;
  }
  
  .section-title {
    font-size: 18px;
    font-weight: 800;
    color: #0369a1; /* sky-700 */
    border-bottom: 1.5px solid #e2e8f0;
    padding-bottom: 8px;
    margin-bottom: 16px;
  }
  
  .fields-grid {
    display: table;
    width: 100%;
    border-collapse: separate;
    border-spacing: 12px;
  }
  
  .fields-row {
    display: table-row;
  }
  
  .fields-cell {
    display: table-cell;
    background: #f8fafc;
    border: 1px solid #f1f5f9;
    border-radius: 10px;
    padding: 12px 16px;
    font-size: 14px;
    width: 50%;
  }
  
  .fields-label {
    font-weight: 600;
    color: #64748b;
    font-size: 12px;
    text-transform: uppercase;
    display: block;
    margin-bottom: 4px;
  }
  
  .fields-value {
    font-weight: 700;
    color: #1e293b;
    display: block;
  }
  
  .section-text {
    font-size: 14px;
    color: #334155;
    background: #f8fafc;
    border-radius: 12px;
    padding: 16px;
    border-inline-start: 4px solid #0ea5e9;
    white-space: pre-wrap;
    margin-top: 5px;
  }
  
  .data-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
    margin-bottom: 10px;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid #e2e8f0;
  }
  
  .data-table th {
    background-color: #f1f5f9;
    color: #334155;
    font-weight: 700;
    font-size: 13px;
    text-align: ${lang === 'ar' ? 'right' : 'left'};
    padding: 12px 16px;
    border-bottom: 2px solid #e2e8f0;
  }
  
  .data-table td {
    padding: 12px 16px;
    font-size: 13px;
    border-bottom: 1px solid #f1f5f9;
    color: #475569;
  }
  
  .data-table tr:last-child td {
    border-bottom: none;
  }
  
  .data-table tr:nth-child(even) {
    background-color: #f8fafc;
  }
  
  .footer-stamp {
    margin-top: 60px;
    text-align: center;
    font-size: 11px;
    color: #94a3b8;
    border-top: 1px solid #f1f5f9;
    padding-top: 15px;
  }
`;

/**
 * Exports data to highly stylized Microsoft Word (.doc) format.
 * Word natively understands styling and layout encoded in clean HTML markup.
 */
export function exportToWord(payload: ExportPayload, lang: 'ar' | 'en' = 'ar') {
  const styles = getCommonStyles(lang);
  
  let sectionsHtml = '';
  
  payload.sections.forEach(sec => {
    let secContentHtml = '';
    
    // Grid of custom fields key-values
    if (sec.fields && sec.fields.length > 0) {
      secContentHtml += `<div class="fields-grid">`;
      for (let i = 0; i < sec.fields.length; i += 2) {
        const item1 = sec.fields[i];
        const item2 = sec.fields[i + 1];
        
        secContentHtml += `<div class="fields-row">`;
        secContentHtml += `
          <div class="fields-cell">
            <span class="fields-label">${item1.label}</span>
            <span class="fields-value">${item1.value ?? ''}</span>
          </div>
        `;
        
        if (item2) {
          secContentHtml += `
            <div class="fields-cell">
              <span class="fields-label">${item2.label}</span>
              <span class="fields-value">${item2.value ?? ''}</span>
            </div>
          `;
        } else {
          secContentHtml += `<div class="fields-cell" style="visibility: hidden;"></div>`;
        }
        secContentHtml += `</div>`;
      }
      secContentHtml += `</div>`;
    }
    
    // Table content
    if (sec.table) {
      secContentHtml += `
        <table class="data-table">
          <thead>
            <tr>
              ${sec.table.headers.map(h => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${sec.table.rows.map(row => `
              <tr>
                ${row.map(cell => `<td>${cell ?? ''}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }
    
    // Notes or description
    if (sec.text) {
      secContentHtml += `<div class="section-text">${sec.text}</div>`;
    }
    
    sectionsHtml += `
      <div class="section-container">
        ${sec.title ? `<h3 class="section-title">${sec.title}</h3>` : ''}
        ${secContentHtml}
      </div>
    `;
  });

  let metadataHtml = '';
  if (payload.metadata && payload.metadata.length > 0) {
    metadataHtml += `<div class="metadata-grid">`;
    for (let i = 0; i < payload.metadata.length; i += 2) {
      const field1 = payload.metadata[i];
      const field2 = payload.metadata[i + 1];
      
      metadataHtml += `<div class="metadata-row">`;
      
      metadataHtml += `
        <div class="metadata-cell" style="width: 50%;">
          <span class="metadata-label">${field1.label}:</span>
          <span class="metadata-value">${field1.value ?? ''}</span>
        </div>
      `;
      
      if (field2) {
        metadataHtml += `
          <div class="metadata-cell" style="width: 50%;">
            <span class="metadata-label">${field2.label}:</span>
            <span class="metadata-value">${field2.value ?? ''}</span>
          </div>
        `;
      }
      metadataHtml += `</div>`;
    }
    metadataHtml += `</div>`;
  }

  const generatedDate = new Date().toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US');
  
  const fullHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>${payload.title}</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          ${styles}
        </style>
      </head>
      <body>
        <div class="header-container">
          <h1 class="header-title">${payload.title}</h1>
          ${payload.subtitle ? `<div class="header-subtitle">${payload.subtitle}</div>` : ''}
          ${metadataHtml}
        </div>
        
        ${sectionsHtml}
        
        <div class="footer-stamp">
          ${lang === 'ar' ? 'تم التصدير من العيادة للأطفال في: ' : 'Exported from Pediatric Clinic on: '} ${generatedDate}
        </div>
      </body>
    </html>
  `;
  
  const mimeType = 'application/vnd.ms-word';
  const baseFilename = payload.filename.replace(/\.docx$/, '').replace(/\.doc$/, '');
  const finalFilename = `${baseFilename}.doc`;
    
  const blob = new Blob(['\ufeff' + fullHtml], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = finalFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports data to Microsoft Excel spreadsheet.
 * Wraps clean, styled tables inside standard XML-compliant format so Excel layouts look pristine with borders and background shades.
 */
export function exportToExcel(payload: ExportPayload, lang: 'ar' | 'en' = 'ar') {
  let tableRowsStr = '';
  
  // 1. Add title and metadata as rows first
  tableRowsStr += `
    <tr>
      <td colspan="6" style="font-size: 16px; font-weight: bold; color: #0c4a6e; height: 35px;">${payload.title}</td>
    </tr>
  `;
  if (payload.subtitle) {
    tableRowsStr += `
      <tr>
        <td colspan="6" style="font-size: 12px; color: #0284c7; font-weight: bold; height: 25px;">${payload.subtitle}</td>
      </tr>
    `;
  }
  
  tableRowsStr += `<tr><td colspan="6" style="height: 15px;"></td></tr>`; // empty spacer Row
  
  // 2. Add metadata fields if any
  if (payload.metadata && payload.metadata.length > 0) {
    payload.metadata.forEach(meta => {
      tableRowsStr += `
        <tr>
          <td style="font-weight: bold; color: #64748b; background-color: #f8fafc; border: 1px solid #e2e8f0; width: 150px;">${meta.label}</td>
          <td colspan="5" style="color: #0f172a; border: 1px solid #e2e8f0; font-weight: bold;">${meta.value ?? ''}</td>
        </tr>
      `;
    });
    tableRowsStr += `<tr><td colspan="6" style="height: 20px;"></td></tr>`; // empty spacer Row
  }
  
  // 3. Render sections
  payload.sections.forEach(sec => {
    if (sec.title) {
      tableRowsStr += `
        <tr>
          <td colspan="6" style="font-size: 14px; font-weight: bold; color: #0369a1; height: 30px; border-bottom: 2px solid #0369a1;">${sec.title}</td>
        </tr>
      `;
    }
    
    // Add grid fields as key-values if applicable
    if (sec.fields && sec.fields.length > 0) {
      sec.fields.forEach(field => {
        tableRowsStr += `
          <tr>
            <td style="font-weight: bold; color: #475569; background-color: #f1f5f9; border: 1px solid #cbd5e1;">${field.label}</td>
            <td colspan="5" style="color: #1e293b; border: 1px solid #cbd5e1;">${field.value ?? ''}</td>
          </tr>
        `;
      });
      tableRowsStr += `<tr><td colspan="6" style="height: 10px;"></td></tr>`;
    }
    
    // Render the table data
    if (sec.table) {
      // Header row
      tableRowsStr += `
        <tr style="height: 28px;">
          ${sec.table.headers.map(h => `
            <td style="font-weight: bold; color: #1e293b; background-color: #e2e8f0; border: 1px solid #cbd5e1; font-size: 12px; text-align: ${lang === 'ar' ? 'right' : 'left'};">${h}</td>
          `).join('')}
        </tr>
      `;
      // Data rows
      sec.table.rows.forEach((row, rIdx) => {
        const bg = rIdx % 2 === 0 ? '#ffffff' : '#f8fafc';
        tableRowsStr += `
          <tr style="height: 25px;">
            ${row.map(cell => `
              <td style="background-color: ${bg}; color: #334155; border: 1px solid #e2e8f0; font-size: 11px; text-align: ${lang === 'ar' ? 'right' : 'left'};">${cell ?? ''}</td>
            `).join('')}
          </tr>
        `;
      });
      tableRowsStr += `<tr><td colspan="6" style="height: 20px;"></td></tr>`;
    }
    
    if (sec.text) {
      tableRowsStr += `
        <tr>
          <td style="font-weight: bold; vertical-align: top; color: #64748b; background-color: #f8fafc; border: 1px solid #cbd5e1;">${lang === 'ar' ? 'ملاحظات' : 'Notes'}:</td>
          <td colspan="5" style="border: 1px solid #cbd5e1; direction: ${lang === 'ar' ? 'rtl' : 'ltr'}; white-space: pre-wrap; font-size: 11px; color: #1e293b;">${sec.text}</td>
        </tr>
      `;
      tableRowsStr += `<tr><td colspan="6" style="height: 20px;"></td></tr>`;
    }
  });
  
  const generatedDate = new Date().toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US');
  tableRowsStr += `
    <tr>
      <td colspan="6" style="font-size: 10px; color: #94a3b8; text-align: center; height: 35px;">
        ${lang === 'ar' ? 'تم التصدير من العيادة للأطفال في: ' : 'Exported from Pediatric Clinic on: '} ${generatedDate}
      </td>
    </tr>
  `;

  // Standard clean XML templates for Excel HTML worksheets
  const fullHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>${payload.title.substring(0, 30).replace(/[:\\\/\?\*\[\]]/g, '')}</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          td {
            font-family: ${lang === 'ar' ? '"Tajawal", sans-serif' : 'Arial, sans-serif'};
          }
        </style>
      </head>
      <body dir="${lang === 'ar' ? 'rtl' : 'ltr'}">
        <table cellspacing="0" cellpadding="5" border="0" style="border-collapse: collapse;">
          <tbody>
            ${tableRowsStr}
          </tbody>
        </table>
      </body>
    </html>
  `;
  
  const mimeType = 'application/vnd.ms-excel';
  const finalFilename = payload.filename.endsWith('.xls') || payload.filename.endsWith('.xlsx') 
    ? payload.filename 
    : `${payload.filename}.xls`;
    
  const blob = new Blob(['\ufeff' + fullHtml], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = finalFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Prints data as a premium PDF layout using browser native PDF rendering.
 * Arabic RTL ligatures, alignments, and custom fonts render perfectly without issues.
 */
export function exportToPdf(payload: ExportPayload, lang: 'ar' | 'en' = 'ar') {
  const styles = getCommonStyles(lang);
  
  let sectionsHtml = '';
  
  payload.sections.forEach(sec => {
    let secContentHtml = '';
    
    if (sec.fields && sec.fields.length > 0) {
      secContentHtml += `<div class="fields-grid">`;
      for (let i = 0; i < sec.fields.length; i += 2) {
        const item1 = sec.fields[i];
        const item2 = sec.fields[i + 1];
        
        secContentHtml += `<div class="fields-row">`;
        secContentHtml += `
          <div class="fields-cell">
            <span class="fields-label">${item1.label}</span>
            <span class="fields-value">${item1.value ?? ''}</span>
          </div>
        `;
        
        if (item2) {
          secContentHtml += `
            <div class="fields-cell">
              <span class="fields-label">${item2.label}</span>
              <span class="fields-value">${item2.value ?? ''}</span>
            </div>
          `;
        } else {
          secContentHtml += `<div class="fields-cell" style="visibility: hidden;"></div>`;
        }
        secContentHtml += `</div>`;
      }
      secContentHtml += `</div>`;
    }
    
    if (sec.table) {
      secContentHtml += `
        <table class="data-table">
          <thead>
            <tr>
              ${sec.table.headers.map(h => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${sec.table.rows.map(row => `
              <tr>
                ${row.map(cell => `<td>${cell ?? ''}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }
    
    if (sec.text) {
      secContentHtml += `<div class="section-text">${sec.text}</div>`;
    }
    
    sectionsHtml += `
      <div class="section-container">
        ${sec.title ? `<h3 class="section-title">${sec.title}</h3>` : ''}
        ${secContentHtml}
      </div>
    `;
  });

  let metadataHtml = '';
  if (payload.metadata && payload.metadata.length > 0) {
    metadataHtml += `<div class="metadata-grid">`;
    for (let i = 0; i < payload.metadata.length; i += 2) {
      const field1 = payload.metadata[i];
      const field2 = payload.metadata[i + 1];
      
      metadataHtml += `<div class="metadata-row">`;
      
      metadataHtml += `
        <div class="metadata-cell" style="width: 50%;">
          <span class="metadata-label">${field1.label}:</span>
          <span class="metadata-value">${field1.value ?? ''}</span>
        </div>
      `;
      
      if (field2) {
        metadataHtml += `
          <div class="metadata-cell" style="width: 50%;">
            <span class="metadata-label">${field2.label}:</span>
            <span class="metadata-value">${field2.value ?? ''}</span>
          </div>
        `;
      }
      metadataHtml += `</div>`;
    }
    metadataHtml += `</div>`;
  }

  const generatedDate = new Date().toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US');
  
  const fullHtml = `
    <!DOCTYPE html>
    <html dir="${lang === 'ar' ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="utf-8">
        <title>${payload.title}</title>
        <style>
          ${styles}
          @media screen {
            body {
              background-color: #f1f5f9;
              margin: 0 !important;
              padding: 0 !important;
              font-family: ${lang === 'ar' ? '"Tajawal", sans-serif' : '"Inter", sans-serif'};
            }
            .preview-container {
              display: flex;
              flex-direction: column;
              align-items: center;
              padding: 40px 16px;
              min-height: 100vh;
              box-sizing: border-box;
            }
            .document-card {
              width: 100%;
              max-width: 850px;
              background-color: #ffffff;
              padding: 50px;
              box-shadow: 0 10px 30px -5px rgba(0,0,0,0.06), 0 4px 12px -2px rgba(0,0,0,0.03);
              border-radius: 24px;
              border: 1px solid #e2e8f0;
              box-sizing: border-box;
            }
            .preview-toolbar {
              width: 100%;
              max-width: 850px;
              background-color: #1e293b;
              color: #ffffff;
              padding: 14px 24px;
              border-radius: 20px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 24px;
              box-shadow: 0 4px 15px rgba(15, 23, 42, 0.1);
              box-sizing: border-box;
              font-family: inherit;
            }
            .preview-actions {
              display: flex;
              gap: 12px;
            }
            .btn-print {
              background-color: #0284c7;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 12px;
              font-weight: 700;
              font-size: 13px;
              cursor: pointer;
              display: flex;
              align-items: center;
              gap: 8px;
              transition: all 0.2s;
            }
            .btn-print:hover {
              background-color: #0369a1;
              transform: translateY(-1px);
            }
            .btn-close {
              background-color: #475569;
              color: #f1f5f9;
              border: none;
              padding: 10px 16px;
              border-radius: 12px;
              font-weight: 600;
              font-size: 13px;
              cursor: pointer;
              transition: all 0.2s;
            }
            .btn-close:hover {
              background-color: #64748b;
            }
          }
          
          @media print {
            body { 
              margin: 20px; 
              font-size: 12px; 
              background-color: #ffffff !important;
            }
            .preview-toolbar {
              display: none !important;
            }
            .preview-container {
              padding: 0 !important;
              display: block !important;
            }
            .document-card {
              box-shadow: none !important;
              border: none !important;
              padding: 0 !important;
              max-width: 100% !important;
            }
            .header-container { padding-bottom: 12px; margin-bottom: 20px; }
            .header-title { font-size: 22px; }
            .header-subtitle { font-size: 14px; }
            .metadata-grid { border-radius: 6px; padding: 10px; margin-bottom: 10px; }
            .section-container { margin-bottom: 20px; }
            .section-title { font-size: 15px; margin-bottom: 10px; padding-bottom: 4px; }
            .fields-cell { padding: 8px 12px; border-radius: 6px; }
            .data-table th, .data-table td { padding: 8px 12px; }
          }
        </style>
      </head>
      <body>
        <div class="preview-container">
          <div class="preview-toolbar">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 14px; font-weight: 700; color: #f8fafc;">
                ${lang === 'ar' ? 'معاينة التقرير قبل الحفظ والطباعة' : 'Pediatric Document Preview'}
              </span>
            </div>
            <div class="preview-actions">
              <button onclick="window.print()" class="btn-print">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-inline-end: 4px;"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/></svg>
                ${lang === 'ar' ? 'طباعة / حفظ كـ PDF' : 'Print / Save as PDF'}
              </button>
              <button onclick="window.close()" class="btn-close">
                ${lang === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
          
          <div class="document-card">
            <div class="header-container">
              <h1 class="header-title">${payload.title}</h1>
              ${payload.subtitle ? `<div class="header-subtitle">${payload.subtitle}</div>` : ''}
              ${metadataHtml}
            </div>
            
            ${sectionsHtml}
            
            <div class="footer-stamp">
              ${lang === 'ar' ? 'تم التصدير من العيادة للأطفال في: ' : 'Exported from Pediatric Clinic on: '} ${generatedDate}
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
  
  // Open print preview window nicely
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(fullHtml);
    printWindow.document.close();
    printWindow.focus();
  } else {
    // Fallback if popups blocked
    const fallbackDiv = document.createElement('div');
    fallbackDiv.id = 'export-pdf-fallback';
    fallbackDiv.style.position = 'fixed';
    fallbackDiv.style.inset = '0';
    fallbackDiv.style.backgroundColor = 'white';
    fallbackDiv.style.zIndex = '99999';
    fallbackDiv.style.overflow = 'auto';
    fallbackDiv.style.padding = '20px';
    fallbackDiv.innerHTML = `
      <div style="display: flex; gap: 10px; justify-content: flex-end; padding-bottom: 15px; border-bottom: 1px solid #ddd; margin-bottom: 20px;" class="print:hidden">
        <button id="pdf-fallback-print-btn" style="background: #0284c7; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer;">
          ${lang === 'ar' ? 'طباعة / حفظ PDF' : 'Print / Save PDF'}
        </button>
        <button id="pdf-fallback-close-btn" style="background: #e2e8f0; color: #334155; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer;">
          ${lang === 'ar' ? 'إغلاق' : 'Close'}
        </button>
      </div>
      <div>${fullHtml}</div>
    `;
    document.body.appendChild(fallbackDiv);
    
    const printBtn = fallbackDiv.querySelector('#pdf-fallback-print-btn');
    const closeBtn = fallbackDiv.querySelector('#pdf-fallback-close-btn');
    
    printBtn?.addEventListener('click', () => {
      window.print();
    });
    
    closeBtn?.addEventListener('click', () => {
      document.body.removeChild(fallbackDiv);
    });
  }
}
