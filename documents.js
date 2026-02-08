// Document handling class
class DocumentHandler {
  constructor() {
    this.loadLibraries();
  }

  async loadLibraries() {
    try {
      await Promise.all([
        this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'),
        this.loadScript('https://unpkg.com/docx@7.8.2/build/index.js'),
        this.loadScript('https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.min.js'),
        this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.3.0/exceljs.min.js'),
        this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js'),
        this.loadScript('https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js')
      ]);
      console.log('Document libraries loaded successfully');
    } catch (error) {
      console.error('Error loading document libraries:', error);
    }
  }

  loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async processContent(content) {
    // Remove AI-like phrases and make content more natural
    const commonPhrases = [
      'As an AI',
      'I would say',
      'In my analysis',
      'Let me explain',
      'I understand',
      'Based on my knowledge',
      'I can tell you',
      'From my perspective'
    ];

    let processedContent = content;
    commonPhrases.forEach(phrase => {
      processedContent = processedContent.replace(new RegExp(phrase, 'gi'), '');
    });

    // Clean up any double spaces or extra line breaks
    processedContent = processedContent
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();

    return processedContent;
  }

  showEditDialog(content, title, format) {
    const modal = document.createElement('div');
    modal.className = 'document-edit-modal';
    modal.innerHTML = `
      <div class="document-edit-content">
        <div class="document-edit-header">
          <div class="title-edit">
            <input type="text" class="document-title-input" value="${title}" placeholder="Título del documento">
          </div>
          <div class="document-edit-actions">
            <button class="doc-action-btn save-doc">
              <svg class="doc-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z"/>
              </svg>
              Guardar y Descargar
            </button>
            <button class="doc-action-btn cancel-edit">✕</button>
          </div>
        </div>
        <div class="document-edit-body">
          <textarea class="document-edit-area">${content}</textarea>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const saveBtn = modal.querySelector('.save-doc');
    const cancelBtn = modal.querySelector('.cancel-edit');
    const editArea = modal.querySelector('.document-edit-area');
    const titleInput = modal.querySelector('.document-title-input');

    saveBtn.addEventListener('click', async () => {
      const editedContent = await this.processContent(editArea.value);
      const editedTitle = titleInput.value.trim() || 'Documento';
      await this.downloadDocument(editedContent, editedTitle, format);
      modal.remove();
    });

    cancelBtn.addEventListener('click', () => modal.remove());
  }

  async downloadDocument(content, title, format) {
    await this.loadLibraries();

    try {
      const processedContent = await this.processContent(content);
      
      switch (format.toLowerCase()) {
        case 'pdf':
          await this.generatePDF(processedContent, title);
          break;
        case 'docx':
          await this.generateDOCX(processedContent, title);
          break;
        case 'pptx':
          await this.generatePPTX(processedContent, title);
          break;
        case 'xlsx':
          await this.generateXLSX(processedContent, title);
          break;
        default:
          throw new Error('Unsupported format');
      }
    } catch (error) {
      console.error('Error generating document:', error);
      throw error;
    }
  }

  async generatePDF(content, title) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Configure PDF
    doc.setFont('helvetica');
    doc.setFontSize(24);
    doc.text(title, 20, 20);
    
    doc.setFontSize(12);
    const margin = 20;
    const pageWidth = doc.internal.pageSize.width - 2 * margin;
    
    // Split content into lines that fit the page width
    const splitText = doc.splitTextToSize(content, pageWidth);
    
    // Add content starting below title
    let yPosition = 40;
    const lineHeight = 7;
    
    splitText.forEach(line => {
      // Add new page if content exceeds page height
      if (yPosition >= doc.internal.pageSize.height - margin) {
        doc.addPage();
        yPosition = margin;
      }
      doc.text(line, margin, yPosition);
      yPosition += lineHeight;
    });

    // Save PDF
    doc.save(`${title}.pdf`);
  }

  async generateDOCX(content, title) {
    const { Document, Paragraph, TextRun, HeadingLevel } = window.docx;
    
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: title,
            heading: HeadingLevel.HEADING_1,
            spacing: {
              after: 200
            }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: content,
                size: 24
              })
            ]
          })
        ]
      }]
    });

    const blob = await window.docx.Packer.toBlob(doc);
    window.saveAs(blob, `${title}.docx`);
  }

  async generatePPTX(content, title) {
    const pptx = new window.PptxGenJS();
    
    // Title slide
    let slide = pptx.addSlide();
    slide.addText(title, {
      x: '10%',
      y: '40%',
      w: '80%',
      fontSize: 44,
      align: 'center',
      bold: true
    });

    // Content slide
    slide = pptx.addSlide();
    slide.addText(content, {
      x: '10%',
      y: '10%',
      w: '80%',
      h: '80%',
      fontSize: 18,
      align: 'left',
      breakLine: true
    });

    await pptx.writeFile(`${title}.pptx`);
  }

  async generateXLSX(content, title) {
    const workbook = new window.ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet 1');

    // Set column widths
    worksheet.columns = [
      { header: 'Content', key: 'content', width: 100 }
    ];

    // Add title in bold
    worksheet.addRow([title]).font = { bold: true, size: 14 };
    worksheet.addRow([]); // Empty row for spacing

    // Add content
    worksheet.addRow([content]);

    // Auto-fit rows
    worksheet.eachRow((row) => {
      row.alignment = { wrapText: true };
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    window.saveAs(blob, `${title}.xlsx`);
  }

  async generateChart(data, type = 'bar', title = 'Chart') {
    const chartContainer = document.createElement('div');
    chartContainer.classList.add('chart-container');
    const canvas = document.createElement('canvas');
    chartContainer.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
      type: type,
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: title
          }
        }
      }
    });
    
    return chartContainer;
  }
  
  async generateDiagram(data, title = 'Diagram') {
    // Could be implemented with mermaid.js or other diagram libraries
    const container = document.createElement('div');
    container.classList.add('diagram-container');
    container.innerHTML = `<div class="diagram-title">${title}</div>
                          <div class="diagram-content">${data}</div>`;
    return container;
  }
}

const style = document.createElement('style');
style.textContent = `
  .document-edit-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }

  .document-edit-content {
    background: white;
    width: 90%;
    max-width: 800px;
    height: 90vh;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .document-edit-header {
    padding: 1rem;
    background: var(--primary-color);
    color: white;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .document-edit-actions {
    display: flex;
    gap: 1rem;
  }

  .doc-action-btn {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .doc-action-btn:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  .doc-icon {
    width: 20px;
    height: 20px;
  }

  .document-edit-body {
    flex: 1;
    padding: 1rem;
    overflow: hidden;
  }

  .document-edit-area {
    width: 100%;
    height: 100%;
    padding: 1rem;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    resize: none;
    font-family: inherit;
    font-size: 1rem;
    line-height: 1.5;
  }

  .document-edit-area:focus {
    outline: none;
    border-color: var(--primary-color);
  }

  .title-edit {
    margin-right: auto;
  }

  .document-title-input {
    background: transparent;
    border: none;
    border-bottom: 2px solid rgba(255, 255, 255, 0.3);
    color: white;
    font-size: 1.25rem;
    padding: 0.25rem 0.5rem;
    width: 300px;
    transition: border-color 0.2s;
  }

  .document-title-input:focus {
    outline: none;
    border-bottom-color: white;
  }

  .document-title-input::placeholder {
    color: rgba(255, 255, 255, 0.7);
  }

  .chart-container {
    width: 100%;
    height: 300px;
  }

  .diagram-container {
    width: 100%;
    padding: 20px;
    background: #f7f7f7;
    border: 1px solid #ddd;
    border-radius: 10px;
  }

  .diagram-title {
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 10px;
  }

  .diagram-content {
    font-size: 14px;
    line-height: 1.5;
  }
`;

document.head.appendChild(style);

// Export for use in ChatInterface
window.DocumentHandler = DocumentHandler;