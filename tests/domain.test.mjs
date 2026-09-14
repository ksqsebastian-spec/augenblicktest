import {test} from 'node:test';import assert from 'node:assert/strict';
import {status,currentInspections,parseCsv,csv} from '../src/data.js';
const a={id:'a',fsa:true};const annual={id:'annual',kind:'inspections',assetId:'a',type:'annual',result:'Mit Mängeln',date:'2026-09-01',nextDate:'2099-01-01'};const monthly={...annual,id:'monthly',type:'monthly',result:'Ohne Mängel',date:'2026-09-14'};
test('monthly passing inspection cannot hide annual defects',()=>assert.equal(status(a,[annual,monthly]),'Mängel'));
test('FSA requires both annual and monthly records',()=>assert.equal(status(a,[monthly]),'Nicht geprüft'));
test('archiving a report does not erase inspection evidence',()=>assert.equal(status({...a,fsa:false},[{...annual,archived:true,result:'Ohne Mängel'}]),'Geprüft'));
test('new inspection resolves previous findings only for the same type',()=>{const newer={...annual,id:'new',date:'2026-09-15',result:'Ohne Mängel'};assert.equal(status(a,[annual,monthly,newer]),'Geprüft');assert.deepEqual(currentInspections(a,[annual,monthly,newer]).map(i=>i.id),['new','monthly']);});
test('CSV parser handles quotes, separators and multi-line cells',()=>{const rows=parseCsv('Code;Standort\r\n"A;1";"Room\nTwo"\r\n');assert.deepEqual(rows,[{Code:'A;1',Standort:'Room\nTwo'}]);assert.match(csv([{Code:'=HYPERLINK(1)'}],['Code']),/'=HYPERLINK/);});
