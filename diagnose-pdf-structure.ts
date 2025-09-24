import * as fs from 'fs';
import PDFParser from 'pdf2json';

async function diagnosePDFStructure() {
  const pdfPath = './attached_assets/L\'Oréal New Product Launch - Social Media Creative Brief_1749554874702.pdf';
  
  if (!fs.existsSync(pdfPath)) {
    console.log('PDF file not found');
    return;
  }
  
  const pdfBuffer = fs.readFileSync(pdfPath);
  
  return new Promise((resolve) => {
    const pdfParser = new PDFParser();
    
    pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
      console.log('\n=== PDF STRUCTURE ANALYSIS ===\n');
      
      if (pdfData.Pages && pdfData.Pages[0]) {
        const firstPage = pdfData.Pages[0];
        
        if (firstPage.Texts) {
          console.log(`Total text items on first page: ${firstPage.Texts.length}\n`);
          
          // Look at first 10 text items
          console.log('First 10 text items:');
          console.log('-------------------');
          
          for (let i = 0; i < Math.min(10, firstPage.Texts.length); i++) {
            const item = firstPage.Texts[i];
            let text = '';
            
            if (item.R) {
              item.R.forEach((run: any) => {
                if (run.T) {
                  text += decodeURIComponent(run.T);
                }
              });
            }
            
            console.log(`Item ${i}:`);
            console.log(`  Position: x=${item.x.toFixed(2)}, y=${item.y.toFixed(2)}`);
            console.log(`  Width: ${item.w ? item.w.toFixed(2) : 'N/A'}`);
            console.log(`  Text: "${text}"`);
            console.log(`  Text length: ${text.length} chars`);
            console.log('');
          }
          
          // Check if items are character-level or word-level
          let singleCharCount = 0;
          let multiCharCount = 0;
          
          firstPage.Texts.forEach((item: any) => {
            if (item.R) {
              let text = '';
              item.R.forEach((run: any) => {
                if (run.T) {
                  text += decodeURIComponent(run.T);
                }
              });
              
              if (text.trim().length === 1) {
                singleCharCount++;
              } else if (text.trim().length > 1) {
                multiCharCount++;
              }
            }
          });
          
          console.log('\n=== TEXT ITEM STATISTICS ===');
          console.log(`Single character items: ${singleCharCount}`);
          console.log(`Multi-character items: ${multiCharCount}`);
          console.log(`Ratio: ${(singleCharCount / (singleCharCount + multiCharCount) * 100).toFixed(1)}% single chars`);
          
          // Look for items on the same line
          console.log('\n=== SAME LINE ANALYSIS ===');
          console.log('Items on approximately the same line (first 5 lines):');
          
          const lineGroups: any[] = [];
          firstPage.Texts.forEach((item: any) => {
            let text = '';
            if (item.R) {
              item.R.forEach((run: any) => {
                if (run.T) {
                  text += decodeURIComponent(run.T);
                }
              });
            }
            
            // Find or create line group
            let foundLine = false;
            for (const group of lineGroups) {
              if (Math.abs(item.y - group.y) < 0.1) {
                group.items.push({ x: item.x, text });
                foundLine = true;
                break;
              }
            }
            
            if (!foundLine) {
              lineGroups.push({
                y: item.y,
                items: [{ x: item.x, text }]
              });
            }
          });
          
          // Sort lines by y position
          lineGroups.sort((a, b) => a.y - b.y);
          
          // Show first 5 lines
          for (let i = 0; i < Math.min(5, lineGroups.length); i++) {
            const line = lineGroups[i];
            // Sort items in line by x position
            line.items.sort((a: any, b: any) => a.x - b.x);
            
            console.log(`\nLine ${i + 1} (y=${line.y.toFixed(2)}):`);
            console.log(`  Items: ${line.items.length}`);
            console.log(`  Texts: ${line.items.map((item: any) => `"${item.text}"`).join(' | ')}`);
            console.log(`  Joined: "${line.items.map((item: any) => item.text).join('')}"`);
            console.log(`  With spaces: "${line.items.map((item: any) => item.text).join(' ')}"`);
          }
        }
      }
      
      resolve(true);
    });
    
    pdfParser.on('pdfParser_dataError', (errData: any) => {
      console.error('PDF Parse Error:', errData.parserError);
      resolve(false);
    });
    
    pdfParser.parseBuffer(pdfBuffer);
  });
}

diagnosePDFStructure().catch(console.error);