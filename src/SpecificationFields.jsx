import React from 'react';
import {Field,Icon} from './App';
export function SpecificationFields({fields,values={},onChange}) {
 return fields.map(name=>name==='Rauchschutz'||name==='Zulassung beinhaltet DIN 14677'
  ? <label key={name} className="check-label"><input type="checkbox" role="switch" checked={values[name]==='Ja'||values[name]===true} onChange={e=>onChange(name,e.target.checked?'Ja':'Nein')}/>{name}</label>
  : <Field key={name} label={name} options={name==='Türart (1-/2-flügelig)'?['1-flügelig','2-flügelig']:undefined} value={values[name]||''} onChange={e=>onChange(name,e.target.value)}/>);
}
export function InspectionSpecifications({fields,values={},onChange}) {
 const [editing,Edit]=React.useState(null),[draft,Draft]=React.useState('');
 return <><p>Bei Bedarf bearbeiten (Klick auf das Stift-Symbol).</p><div className="inspection-specs">{fields.map(name=><div className="inspection-spec" key={name}><span>{name==='Modell'?'Typ / Modell':name}</span>{editing===name?<><div className="inspection-spec-editor">{['Rauchschutz','Zulassung beinhaltet DIN 14677'].includes(name)?<div className="segments" role="radiogroup" aria-label={name}>{['Ja','Nein'].map(value=><label key={value}><input type="radio" name={'spec-'+name} checked={values[name]===value} onChange={()=>{onChange(name,value);Edit(null);}}/>{value}</label>)}</div>:<><Field label={name} aria-label={name} value={draft} onChange={e=>Draft(e.target.value)} options={name==='Türart (1-/2-flügelig)'?['1-flügelig','2-flügelig']:undefined}/><button type="button" className="tool" aria-label={name+' speichern'} onClick={()=>{onChange(name,draft);Edit(null);}}><Icon name="check"/></button></>}<button type="button" className="tool" aria-label={name+' abbrechen'} onClick={()=>Edit(null)}><Icon name="close"/></button></div></>:<><span>{values[name]||'—'}</span><button type="button" className="tool" aria-label={name+' bearbeiten'} onClick={()=>{Draft(values[name]||'');Edit(name);}}><Icon name="edit"/></button></>}</div>)}</div></>;
}
