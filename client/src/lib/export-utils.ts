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