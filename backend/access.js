// All external access decisions are made on the server, including attachment reads.
export function visibleRecords(records,access,userId){
 if(!access)return records;
 const scope=access.restricted,objects=new Set(access.objectIds||[]),buildings=new Set(access.buildingIds||[]);
 for(const b of records.filter(r=>r.kind==='buildings'))if(objects.has(b.objectId))buildings.add(b.id);
 const parentObjects=new Set(records.filter(r=>r.kind==='buildings'&&buildings.has(r.id)).map(r=>r.objectId));
 const assets=new Set(records.filter(r=>r.kind==='assets'&&(!scope||buildings.has(r.buildingId))).map(r=>r.id));
 return records.filter(r=>{
  if(r.kind==='settings')return r.id==='company';
  if(['contractors','labels','uuidCodes'].includes(r.kind))return !scope;
  if(r.kind==='templates')return true;
  if(r.kind==='customProtocols')return !scope||!r.objectIds?.length||r.objectIds.some(id=>objects.has(id)||parentObjects.has(id));
  if(r.kind==='reports')return r.creatorId===userId;
  if(!scope)return true;
  if(r.kind==='objects')return objects.has(r.id)||parentObjects.has(r.id);
  if(r.kind==='buildings')return buildings.has(r.id);
  if(r.kind==='assets'||r.kind==='plans')return buildings.has(r.buildingId);
  if(r.kind==='inspections')return assets.has(r.assetId);
  if(r.kind==='tasks')return r.assignee===userId&&(objects.has(r.objectId)||parentObjects.has(r.objectId));
  return false;
 });
}
export function mayWrite(kind,b,old,records,access,userId){
 if(!access)return true;
 if(['settings','templates','customProtocols','contractors','labels','uuidCodes'].includes(kind))return false;
 const visible=visibleRecords(records,access,userId),has=(id,k)=>visible.some(r=>r.id===id&&r.kind===k);
 if(old&&!has(b.id,kind))return false;
 if(kind==='objects')return old?(!access.restricted||(access.objectIds||[]).includes(b.id)):!!access.createObjects;
 if(kind==='buildings')return (!access.restricted||(access.objectIds||[]).includes(b.objectId))&&(old||access.createBuildings);
 if(kind==='assets')return has(b.buildingId,'buildings')&&(old||access.createAssets);
 if(kind==='plans')return has(b.buildingId,'buildings');
 if(kind==='inspections')return has(b.assetId,'assets');
 if(kind==='tasks')return b.assignee===userId&&has(b.objectId,'objects');
 if(kind==='reports')return Array.isArray(b.rows)&&b.rows.every(r=>has(r.assetId||r.id,'assets')||has(r.id,'inspections'));
 return false;
}
