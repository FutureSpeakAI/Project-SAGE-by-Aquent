import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";

/**
 * Exports content as a PDF file using a simple conversion to HTML and Blob
 */
export const exportAsPDF = (content: string, title: string = "Generated Content") => {
  // Clean HTML tags if content comes from rich text editor
  const cleanContent = content.replace(/<[^>]*>?/gm, '');
  
  // Create a simple HTML document for the PDF
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 40px;
          line-height: 1.6;
        }
        h1 {
          font-size: 24px;
          margin-bottom: 20px;
        }
        p {
          margin-bottom: 10px;
        }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      ${cleanContent.split('\n').map(line => `<p>${line || '&nbsp;'}</p>`).join('')}
    </body>
    </html>
  `;

  // Create a blob and trigger a download
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${title.toLowerCase().replace(/ /g, '_')}.pdf.html`;
  
  // Append to body, trigger click and cleanup
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Exports content as a HTML file, preserving rich text formatting
 */
export const exportAsHTML = (richContent: string, title: string = "Generated Content") => {
  // If we have HTML content directly from rich text editor, use it
  // Otherwise, handle plain text
  let formattedContent = richContent;
  
  // If content doesn't appear to be HTML, convert it to paragraphs
  if (!richContent.includes('<p>') && !richContent.includes('<h')) {
    formattedContent = richContent.split('\n').map(line => `<p>${line || '&nbsp;'}</p>`).join('');
  }
  
  // Create a styled HTML document with the content
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 40px;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 40px auto;
        }
        h1 {
          font-size: 28px;
          margin-bottom: 20px;
          color: #222;
          border-bottom: 1px solid #eee;
          padding-bottom: 10px;
        }
        h2 {
          font-size: 24px;
          margin-top: 30px;
          margin-bottom: 15px;
          color: #333;
        }
        h3 {
          font-size: 20px;
          margin-top: 25px;
          margin-bottom: 10px;
          color: #444;
        }
        p {
          margin-bottom: 15px;
          line-height: 1.7;
        }
        ul, ol {
          margin-bottom: 20px;
          padding-left: 25px;
        }
        li {
          margin-bottom: 8px;
        }
        strong, b {
          font-weight: 600;
          color: #222;
        }
        em, i {
          font-style: italic;
          color: #555;
        }
        a {
          color: #0066cc;
          text-decoration: underline;
        }
        blockquote {
          margin: 20px 0;
          padding: 10px 20px;
          border-left: 3px solid #ddd;
          background-color: #f9f9f9;
          font-style: italic;
        }
        code {
          font-family: monospace;
          background-color: #f5f5f5;
          padding: 2px 4px;
          border-radius: 3px;
        }
        pre {
          background-color: #f5f5f5;
          padding: 15px;
          border-radius: 5px;
          overflow: auto;
          font-family: monospace;
          margin-bottom: 20px;
        }
        .footer {
          margin-top: 50px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          font-size: 14px;
          color: #888;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <div class="content">
        ${formattedContent}
      </div>
      <div class="footer">
        Generated on ${new Date().toLocaleDateString()} using AI Assistant
      </div>
    </body>
    </html>
  `;

  // Create a blob and trigger a download
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${title.toLowerCase().replace(/ /g, '_')}.html`;
  
  // Append to body, trigger click and cleanup
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Exports content as a DOCX file
 */
export const exportAsDOCX = (content: string, title: string = "Generated Content") => {
  // Clean HTML tags if content comes from rich text editor
  const cleanContent = content.replace(/<[^>]*>?/gm, '');
  
  // Create a new document
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: title,
                bold: true,
                size: 36 // 18pt * 2
              }),
            ],
          }),
          new Paragraph({
            children: [new TextRun("")], // Empty line
          }),
          ...cleanContent.split('\n').map(paragraph => 
            new Paragraph({
              children: [
                new TextRun({
                  text: paragraph,
                  size: 24 // 12pt * 2
                }),
              ],
            })
          )
        ],
      },
    ],
  });
  
  // Generate and save the Word document
  Packer.toBlob(doc).then((blob) => {
    saveAs(blob, `${title.toLowerCase().replace(/ /g, '_')}.docx`);
  });
};