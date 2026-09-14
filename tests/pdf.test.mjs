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

test('native PDF embeds actual image bytes with a caption',async()=>{
 const {default:QRCode}=await import('qrcode');const photo=await QRCode.toBuffer('Testfoto');
 const bytes=await createReportPdf({rows:[{...row,checks:row.checks.slice(0,2),photos:[{url:'/api/files/photo',name:'Fotodokumentation Test'}]}],loadAsset:async url=>url.includes('/api/files/')?photo:font});
 const task=getDocument({data:bytes,isEvalSupported:false});const pdf=await task.promise;let found=false;
 const {OPS}=await import('pdfjs-dist/legacy/build/pdf.mjs');for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i),ops=await page.getOperatorList();if(ops.fnArray.includes(OPS.paintImageXObject))found=true;}assert.ok(found);await task.destroy();
});

test('PDF records signature attribution and non-performable reason',async()=>{
 const bytes=await createReportPdf({rows:[{...row,checks:row.checks.slice(0,1),signature:{strokes:[[[.1,.1],[.5,.7]]]},submittedAt:'2026-09-14T12:00:00Z'},{...row,id:'reason',result:'Nicht prüfbar',nonInspectionReason:'Tür verschlossen'}],loadAsset:async()=>font});
 const task=getDocument({data:bytes,isEvalSupported:false}),pdf=await task.promise;let content='';for(let n=1;n<=pdf.numPages;n++)content+=(await (await pdf.getPage(n)).getTextContent()).items.map(i=>i.str).join(' ');
 assert.ok(content.includes('Unterschrift'));assert.ok(content.includes('Tür verschlossen'));await task.destroy();
});
