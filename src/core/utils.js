export const uid=(p='id')=>p+'-'+(globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2));
export const clone=value=>structuredClone(value);
export const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
export const normTag=s=>String(s??'').toUpperCase().replace(/[^A-Z0-9]/g,'');
export const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const now=()=>new Date().toISOString();
export function download(name,data,type='application/json'){
 const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
export function debounce(fn,delay=180){let t;return(...args)=>{clearTimeout(t);t=setTimeout(()=>fn(...args),delay);};}
export function groupBy(rows,key){const map=new Map();for(const r of rows){const k=r[key]??'(empty)';if(!map.has(k))map.set(k,[]);map.get(k).push(r);}return map;}
export function hash(text){let n=2166136261;for(let i=0;i<text.length;i++){n^=text.charCodeAt(i);n=Math.imul(n,16777619);}return (n>>>0).toString(16).padStart(8,'0');}
export function safeURL(value){const u=new URL(value,globalThis.location?.href||'http://localhost');if(!['http:','https:'].includes(u.protocol))throw Error('Only HTTP(S) endpoints are allowed');if(u.username||u.password)throw Error('Credentials are not permitted inside URLs');return u.href;}
export function assert(condition,message){if(!condition)throw new Error(message);}
export const number=(n,d=0)=>Number(n).toLocaleString(undefined,{maximumFractionDigits:d});
export function relativeDate(d){const s=Math.max(0,(Date.now()-new Date(d))/1000);return s<60?'just now':s<3600?`${Math.floor(s/60)}m ago`:s<86400?`${Math.floor(s/3600)}h ago`:new Date(d).toLocaleDateString();}
