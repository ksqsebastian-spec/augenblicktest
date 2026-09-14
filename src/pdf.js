import {privateFile} from './data.js';
import {jsPDF} from 'jspdf';
import {reportFilename} from './advanced-data.js';
import {categories} from './templates.js';
const date=value=>value?new Date(value).toLocaleDateString('de-DE'):'—';
const encode=bytes=>{let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);};
async function load(url){if(url.startsWith('/api/files/'))return new Uint8Array(await (await privateFile(url)).arrayBuffer());const r=await fetch(url,{credentials:'same-origin'});if(!r.ok)throw new Error('PDF-Anhang konnte nicht geladen werden. Bitte Verbindung prüfen.');return new Uint8Array(await r.arrayBuffer());}
export async function createReportPdf({rows,title='Prüfprotokoll',loadAsset=load}) {
 const doc=new jsPDF({unit:'mm',format:'a4',compress:true});
 doc.addFileToVFS('Inter.ttf',encode(await loadAsset('/assets/inter.ttf')));doc.addFont('Inter.ttf','Inter','normal');doc.setFont('Inter');doc.setFontSize(10);
 const margin=17,width=176,bottom=275;let y=margin;
 function newPage(){doc.addPage();y=margin;}
 function text(value,size=10,color='#243247'){
  doc.setFontSize(size);doc.setTextColor(color);
  const lines=doc.splitTextToSize(String(value??'—'),width),lineHeight=size*.48;
  for(const line of lines){if(y+lineHeight>bottom)newPage();doc.text(line,margin,y+lineHeight);y+=lineHeight;}
  y+=2;
 }
 function heading(value){if(y+15>bottom)newPage();y+=3;text(value,13,'#405f87');}
 async function image(file){
  if(!file)return;const bytes=await loadAsset(file.url),p=doc.getImageProperties(bytes),w=Math.min(width,140),h=w*p.height/p.width,max=180,scale=Math.min(1,max/h);
  if(y+h*scale+12>bottom)newPage();doc.addImage(bytes,p.fileType,margin,y,w*scale,h*scale);y+=h*scale+3;if(file.name)text(file.name,8);
 }
 for(let i=0;i<rows.length;i++){
  if(i)newPage();const r=rows[i],a=r.assetSnapshot,company=r.companySnapshot;
  if(company?.logo?.url)await image(company.logo);
  text(title,19);if(company){text(company.name,12);text([company.address,[company.postalCode,company.city].filter(Boolean).join(' '),company.email,company.phone].filter(Boolean).join(' · '),9);}
  if(!a){for(const [k,v]of Object.entries(r).filter(([k])=>!['id','kind','version','_requestId'].includes(k)))text(k+': '+(typeof v==='object'?JSON.stringify(v):String(v)));continue;}
  heading(a.code);for(const [k,v]of [['Objekt',r.objectSnapshot?.name],['Gebäude',r.buildingSnapshot?.name],['Standort',a.location],['Kategorie',categories[a.category]],['Typ',a.type],['UUID',a.uuid],['Prüfer',r.inspector],['Prüfdatum',date(r.date)],['Nächste Prüfung',date(r.nextDate)],...Object.entries(a.specs||{})])if(v)text(k+': '+v);
  if(r.protocolSnapshot){heading(r.protocolSnapshot.name);text(r.protocolSnapshot.standard||'');}
  if(r.reasons?.length)text('Art der Prüfung: '+r.reasons.join(', '));
  heading('Prüfpunkte');for(const [index,c]of(r.checks||[]).entries())text(`${index+1}. ${c.label} — ${{ok:'i.O.',fail:'n.i.O.',na:'n.z.'}[c.value]||'Nicht bewertet'}`);
  heading('Gesamtbewertung');text(r.result,12);
  if(r.maintenanceItems?.length||r.maintenance){heading('Wartungsarbeiten');for(const item of r.maintenanceItems||[])text(item);if(r.maintenance)text(r.maintenance);}
  if(r.defects?.length){heading('Festgestellte Mängel');for(const d of r.defects)text(d.severity+': '+d.text);}
  if(r.actions?.length){heading('Maßnahmen');for(const action of r.actions)text(action);}
  if(r.notes){heading('Anmerkungen');text(r.notes);}
  if(r.photos?.length){heading('Fotodokumentation');for(const photo of r.photos){if(photo.pending)throw new Error('Bitte Offline-Fotos vor dem PDF-Export synchronisieren.');await image(photo);}}
  text('Protokoll-ID: '+r.id,8);if(r.pending)text('Noch nicht synchronisiert',9);
 }
 if(!rows.length)text('Keine Datensätze im gewählten Zeitraum.');
 const count=doc.getNumberOfPages();for(let page=1;page<=count;page++){doc.setPage(page);doc.setFontSize(8);doc.setTextColor('#64748b');doc.text(`${page} / ${count}`,193,288,{align:'right'});}
 doc.setProperties({title,subject:'Prüfdokumentation',creator:'Augenblick'});return new Uint8Array(doc.output('arraybuffer'));
}
export async function downloadReportPdf(rows,title,object){const bytes=await createReportPdf({rows,title});const {download}=await import('./data');download((rows.length===1?reportFilename(rows[0],object):title)+'.pdf',bytes,'application/pdf');}
