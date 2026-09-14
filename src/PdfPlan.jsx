import React,{useEffect,useRef,useState} from 'react';
import {getDocument,GlobalWorkerOptions} from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
GlobalWorkerOptions.workerSrc=workerUrl;
export default function PdfPlan({url,page,onPages,onError,children,onClick}) {
 const canvas=useRef(),task=useRef(),[pdf,P]=useState(null);
 useEffect(()=>{let alive=true;const loading=getDocument({url,withCredentials:true,isEvalSupported:false,useWasm:false});loading.promise.then(doc=>{if(alive){P(doc);onPages(doc.numPages);}}).catch(e=>{if(alive)onError('PDF konnte nicht geladen werden: '+e.message);});return()=>{alive=false;task.current?.cancel();loading.destroy();};},[url]);
 useEffect(()=>{if(!pdf)return;let active=true,render;pdf.getPage(page).then(p=>{if(!active)return;const viewport=p.getViewport({scale:1.5}),c=canvas.current;c.width=viewport.width;c.height=viewport.height;render=p.render({canvasContext:c.getContext('2d'),viewport});task.current=render;return render.promise;}).catch(e=>{if(active&&e.name!=='RenderingCancelledException')onError(e.message);});return()=>{active=false;render?.cancel();};},[pdf,page]);
 return <div className="plan" onClick={onClick}><canvas ref={canvas} aria-label={'PDF-Grundriss Seite '+page} style={{display:'block',width:'100%',height:'auto'}}/>{children}</div>;
}
