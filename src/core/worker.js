import {runPipeline,profile,executeQuery,parseCSV} from './data.js';
import {validateDiagram,reconcileBOM} from './analysis.js';
self.onmessage=({data:{id,method,args}})=>{try{const functions={runPipeline,profile,executeQuery,parseCSV,validateDiagram,reconcileBOM};if(!functions[method])throw Error('Unknown worker method');self.postMessage({id,result:functions[method](...args)});}catch(e){self.postMessage({id,error:e.message});}};
self.postMessage({ready:true});
