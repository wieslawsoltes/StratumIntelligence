/** Optional PDF adapter. Loaded only when the user imports a PDF. */
import {uid,assert} from './utils.js';
import {extractTagsFromText,classifyTag} from './analysis.js';
const VERSION='6.3.289';
export async function loadPDF(file){
 assert(file.size<=50*1024*1024,'PDF exceeds the 50 MB import limit');
 let pdfjs;
 try{pdfjs=await import('../../vendor/pdfjs/pdf.mjs');pdfjs.GlobalWorkerOptions.workerSrc=new URL('../../vendor/pdfjs/pdf.worker.mjs',import.meta.url).href;}
 catch{try{pdfjs=await import(`https://cdn.jsdelivr.net/npm/pdfjs-dist@${VERSION}/build/pdf.mjs`);pdfjs.GlobalWorkerOptions.workerSrc=`https://cdn.jsdelivr.net/npm/pdfjs-dist@${VERSION}/build/pdf.worker.mjs`;}catch{throw Error('PDF.js could not be loaded. PDF import needs network access to the pinned optional PDF.js module, or a local vendor/pdfjs installation. PNG, JPEG, SVG, and JSON imports work without this dependency.');}}
 const document=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false,useSystemFonts:true}).promise;
 return {document,pdfjs,name:file.name};
}
export async function importPDFPage(pdf,pageNumber){
 assert(Number.isInteger(pageNumber)&&pageNumber>=1&&pageNumber<=pdf.document.numPages,'Invalid PDF page');
 const page=await pdf.document.getPage(pageNumber),base=page.getViewport({scale:1}),scale=Math.min(2,4500/Math.max(base.width,base.height)),viewport=page.getViewport({scale});
 const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
 await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
 const content=await page.getTextContent();const nodes=[];
 for(const item of content.items){if(!item.str)continue;const tags=extractTagsFromText(item.str),transform=pdf.pdfjs.Util.transform(viewport.transform,item.transform);for(const tag of tags)nodes.push({id:uid('node'),tag,name:tag,type:classifyTag(tag),x:transform[4],y:transform[5],rotation:0,status:'review',source:`PDF embedded text · page ${pageNumber}`,notes:'Text-position candidate, not a confirmed symbol location. Review and reposition.',boxWidth:70,boxHeight:48});}
 return {id:uid('diagram'),name:`${pdf.name} · page ${pageNumber}`,number:`PDF-P${pageNumber}`,revision:'A',description:'PDF source with embedded-text tag candidates. Scanned pages need manual annotation or a configured vision model.',width:canvas.width,height:canvas.height,nodes,edges:[],revisions:[],background:{name:pdf.name,data:canvas.toDataURL('image/png')}};
}
