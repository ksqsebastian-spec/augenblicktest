import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {createReportPdf} from '../src/pdf.js';
const font=await readFile(new URL('../public/assets/inter.ttf',import.meta.url));
const row={id:'pdf-test',assetSnapshot:{code:'BST-001',category:'BST',location:'Flügel A',type:'Brandschutztor',specs:{Rauchschutz:'Ja'}},companySnapshot:{name:'Prüffirma Müller'},objectSnapshot:{name:'Testobjekt'},buildingSnapshot:{name:'Gebäude'},inspector:'Prüfer Öztürk',date:'2026-09-14',nextDate:'2027-09-14',result:'Ohne Mängel',checks:Array.from({length:120},(_,i)=>({label:'Prüfpunkt '+(i+1)+' – vollständige Dokumentation der Feststellanlage',value:'ok'})),maintenanceItems:['FSA gewartet'],notes:'Letzte Anmerkung mit Umlauten: äöüß'};
test('native PDF preserves Unicode, long checklists and page numbering',async()=>{
 const bytes=await createReportPdf({rows:[row],loadAsset:async()=>font});
 assert.equal(new TextDecoder().decode(bytes.subarray(0,5)),'%PDF-');
 const task=getDocument({data:bytes,useSystemFonts:true,isEvalSupported:false});const pdf=await task.promise;
 assert.ok(pdf.numPages>=3);let content='';for(let n=1;n<=pdf.numPages;n++){const page=await pdf.getPage(n);content+=(await page.getTextContent()).items.map(i=>i.str).join(' ');}
 for(const expected of ['Prüffirma Müller','Prüfer Öztürk','Prüfpunkt 120','Brandschutztor','Rauchschutz: Ja','Letzte Anmerkung mit Umlauten: äöüß',pdf.numPages+' / '+pdf.numPages])assert.ok(content.includes(expected),expected);
 await task.destroy();
});
test('PDF export reports missing photo data instead of omitting evidence',async()=>{
 await assert.rejects(createReportPdf({rows:[{...row,photos:[{pending:true}]}],loadAsset:async()=>font}),/synchronisieren/);
 await assert.rejects(createReportPdf({rows:[{...row,photos:[{url:'/api/files/missing'}]}],loadAsset:async url=>{if(url.includes('missing'))throw new Error('Anhang fehlt');return font;}}),/Anhang fehlt/);
});
