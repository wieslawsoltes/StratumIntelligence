export const palette={ink:'#526275',muted:'#9aa7b6',blue:'#2b69cc',blueFill:'#eaf2ff',teal:'#248b87',amber:'#d08a24',red:'#cd5256',white:'#ffffff',line:'#6e7f8f',signal:'#94a9b8',grid:'#e7ecf1'};
export function rgba(hex,alpha=1){const h=hex.replace('#','');return [parseInt(h.slice(0,2),16)/255,parseInt(h.slice(2,4),16)/255,parseInt(h.slice(4,6),16)/255,alpha];}
export class Scene {
 constructor(){this.shapes=[];this.labels=[];}
 line(points,color=palette.ink,width=1.6,dash=false){this.shapes.push({kind:'line',points,color,width,dash});}
 polygon(points,fill=palette.white,stroke=palette.ink,width=1.6){if(fill)this.shapes.push({kind:'polygon',points,color:fill});if(stroke)this.line([...points,points[0]],stroke,width);}
 circle(x,y,r,fill=palette.white,stroke=palette.ink,width=1.6,segments=48){const pts=Array.from({length:segments},(_,i)=>[x+Math.cos(i/segments*Math.PI*2)*r,y+Math.sin(i/segments*Math.PI*2)*r]);this.polygon(pts,fill,stroke,width);}
 rect(x,y,w,h,fill=palette.white,stroke=palette.ink,width=1.6){this.polygon([[x,y],[x+w,y],[x+w,y+h],[x,y+h]],fill,stroke,width);}
 text(x,y,text,options={}){this.labels.push({x,y,text,...options});}
}
function transformed(points,n){const a=(n.rotation||0)*Math.PI/180;return points.map(([x,y])=>[n.x+x*Math.cos(a)-y*Math.sin(a),n.y+x*Math.sin(a)+y*Math.cos(a)]);}
export function symbol(scene,n,{selected=false,highlight=false,annotated=false}={}){
 const ink=selected?palette.blue:highlight?palette.teal:n.status==='review'?palette.amber:palette.ink,fill=selected?palette.blueFill:palette.white;
 const ln=(pts,width=1.7)=>scene.line(transformed(pts,n),ink,width),poly=pts=>scene.polygon(transformed(pts,n),fill,ink,1.8);
 if(annotated){const w=n.boxWidth||66,h=n.boxHeight||50;scene.rect(n.x-w/2,n.y-h/2,w,h,null,ink,selected?2.6:1.4);scene.text(n.x-w/2,n.y-h/2-8,n.tag,{color:ink,size:12,align:'left',weight:600});return;}
 if(selected)scene.rect(n.x-58,n.y-(n.type==='tank'?93:60),116,n.type==='tank'?186:118,null,'#9abcf0',.8);
 switch(n.type){case 'pump':scene.circle(n.x,n.y,27,fill,ink,2);poly([[-12,-17],[19,0],[-12,17]]);ln([[-18,29],[-29,43],[29,43],[18,29]],1.4);break;
 case 'tank':{const pts=[];for(let i=0;i<=24;i++)pts.push([46*Math.cos(Math.PI+i/24*Math.PI),-55+24*Math.sin(Math.PI+i/24*Math.PI)]);for(let i=0;i<=24;i++)pts.push([46*Math.cos(i/24*Math.PI),55+24*Math.sin(i/24*Math.PI)]);poly(pts);ln([[-46,-48],[46,-48]],1);ln([[-46,49],[46,49]],1);break;}
 case 'exchanger':scene.circle(n.x,n.y,39,fill,ink,2);ln([[-27,27],[-15,-18],[0,18],[15,-18],[27,-27]],1.6);break;
 case 'valve':case 'control':case 'check':poly([[-19,-13],[-19,13],[0,0]]);poly([[19,-13],[19,13],[0,0]]);if(n.type==='control'){ln([[0,0],[0,-30]]);poly([[-18,-30],[18,-30],[14,-40],[-14,-40]]);}if(n.type==='check')ln([[-5,-18],[6,17]],2);if(n.closed)ln([[-25,-20],[25,20]],2);break;
 case 'instrument':scene.circle(n.x,n.y,23,fill,ink,1.7);{const m=/^([A-Z]+)-?(.*)/.exec(n.tag)||['',n.tag,''];scene.text(n.x,n.y-4,m[1],{color:ink,size:12,weight:600});scene.text(n.x,n.y+11,m[2],{color:ink,size:11});if(m[1].length>=3)ln([[-22,0],[22,0]],.8);}break;
 case 'filter':poly([[-25,-25],[25,-25],[25,25],[-25,25]]);for(let i=-15;i<=15;i+=10)ln([[i,-25],[i+10,25]],.8);break;
 case 'source':poly([[-26,-13],[12,-13],[27,0],[12,13],[-26,13]]);break;
 case 'junction':scene.circle(n.x,n.y,4,ink,ink,1);break;
 default:poly([[-25,-20],[25,-20],[25,20],[-25,20]]);scene.text(n.x,n.y+4,'?',{size:17,color:ink});
 }
 if(n.type!=='instrument'&&n.type!=='junction'){const offset=n.type==='tank'?-101:n.type==='control'?-56:-47;scene.text(n.x,n.y+offset,n.tag,{size:12,weight:650,color:ink});if(['pump','tank','exchanger','source','filter'].includes(n.type))scene.text(n.x,n.y+offset-17,n.name,{size:9.5,color:palette.muted});}
 if(highlight)scene.circle(n.x+31,n.y+32,4,palette.teal,null);
}
export function connectionPoints(edge,diagram){const a=diagram.nodes.find(n=>n.id===edge.from),b=diagram.nodes.find(n=>n.id===edge.to);if(!a||!b)return [];const points=[[a.x,a.y],...(edge.points||[]),[b.x,b.y]];if(points.length===2&&a.x!==b.x&&a.y!==b.y){const mid=(a.x+b.x)/2;points.splice(1,0,[mid,a.y],[mid,b.y]);}return points;}
export function buildDiagramScene(diagram,{selected=null,selectedEdge=null,highlight=new Set(),showLabels=true,showSignals=true,showGrid=true,preview=null}={}){
 const scene=new Scene(),draw={...diagram,nodes:diagram.nodes.map(n=>n.id===preview?.id?{...n,...preview}:n)};
 if(!diagram.background){scene.rect(22,24,diagram.width-44,diagram.height-45,null,'#cbd5df',1);scene.text(47,60,'NORTHLINE  /  UTILITIES ENGINEERING',{align:'left',size:11,weight:650,color:'#8090a3'});scene.text(diagram.width-49,60,'PIPING & INSTRUMENTATION DIAGRAM',{align:'right',size:10,color:'#8090a3'});}
 for(const e of draw.edges){if(e.kind==='signal'&&!showSignals)continue;const pts=connectionPoints(e,draw);if(pts.length<2)continue;const color=e.id===selectedEdge?palette.blue:highlight.has(e.id)?palette.teal:e.kind==='signal'?palette.signal:palette.line;scene.line(pts,color,e.kind==='signal'?1.2:e.id===selectedEdge?3:1.8,e.kind==='signal');if(e.kind!=='signal'){let seg=pts.slice(1).map((p,i)=>({a:pts[i],b:p,l:Math.hypot(p[0]-pts[i][0],p[1]-pts[i][1])})).sort((a,b)=>b.l-a.l)[0];if(seg?.l>95){const mx=(seg.a[0]+seg.b[0])/2,my=(seg.a[1]+seg.b[1])/2,dx=(seg.b[0]-seg.a[0])/seg.l,dy=(seg.b[1]-seg.a[1])/seg.l;scene.polygon([[mx+5*dx,my+5*dy],[mx-5*dx+3*dy,my-5*dy-3*dx],[mx-5*dx-3*dy,my-5*dy+3*dx]],color,null);}}}
 for(const n of draw.nodes)symbol(scene,n,{selected:n.id===selected,highlight:highlight.has(n.id),annotated:!!diagram.background});
 if(!diagram.background){scene.rect(diagram.width-520,diagram.height-74,497,52,palette.white,'#cbd5df',1);scene.text(diagram.width-502,diagram.height-52,diagram.name.toUpperCase(),{align:'left',size:11,weight:600,color:palette.ink});scene.text(diagram.width-502,diagram.height-35,`${diagram.number}   •   REV ${diagram.revision}   •   SAMPLE / NOT FOR CONSTRUCTION`,{align:'left',size:9,color:palette.muted});scene.text(48,diagram.height-41,'PROCESS  ━━━     INSTRUMENT SIGNAL  ┄┄┄     ALL PRESSURES IN bar',{align:'left',size:9,color:palette.muted});}
 if(!showLabels)scene.labels=[];return scene;
}
export function tessellate(scene){const out=[];const vertex=(p,c)=>out.push(p[0],p[1],...c);for(const shape of scene.shapes){const c=rgba(shape.color);if(shape.kind==='polygon'){// Shapes are convex or triangulated at their authored center.
 for(let i=1;i<shape.points.length-1;i++){vertex(shape.points[0],c);vertex(shape.points[i],c);vertex(shape.points[i+1],c);}}
 else {for(let i=0;i<shape.points.length-1;i++){const a=shape.points[i],b=shape.points[i+1],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);if(length<.001)continue;const nx=-dy/length*shape.width/2,ny=dx/length*shape.width/2;const quad=(s,t)=>{const p=[a[0]+dx*s/length,a[1]+dy*s/length],q=[a[0]+dx*t/length,a[1]+dy*t/length],v=[[p[0]+nx,p[1]+ny],[p[0]-nx,p[1]-ny],[q[0]+nx,q[1]+ny],[q[0]-nx,q[1]-ny]];for(const k of [0,1,2,2,1,3])vertex(v[k],c);};if(shape.dash){for(let s=0;s<length;s+=10)quad(s,Math.min(s+5,length));}else quad(0,length);}}
 }return new Float32Array(out);}
export function drawCanvasScene(ctx,scene,view){ctx.save();ctx.translate(view.x,view.y);ctx.scale(view.scale,view.scale);for(const s of scene.shapes){if(!s.points.length)continue;ctx.beginPath();ctx.moveTo(...s.points[0]);for(let i=1;i<s.points.length;i++)ctx.lineTo(...s.points[i]);if(s.kind==='polygon'){ctx.closePath();ctx.fillStyle=s.color;ctx.fill();}else{ctx.strokeStyle=s.color;ctx.lineWidth=s.width;ctx.setLineDash(s.dash?[5,5]:[]);ctx.lineJoin='round';ctx.stroke();}}ctx.restore();}
