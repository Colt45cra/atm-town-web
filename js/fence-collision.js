// Map Studio historically exported vertical fence art with a shallow base mask.
// These supplemental colliders preserve the published artwork and original masks.
export function verticalFenceColliders(objects){
 const extra=[],postsByName=new Map();
 for(const o of objects){
  if(o.active===false||o.solid!==true||![o.x,o.y,o.width,o.image_width,o.image_height].every(Number.isFinite)||o.image_width<=0||o.image_height<=0)continue;
  const name=String(o.name||'').trim().toLowerCase(),height=o.width*o.image_height/o.image_width;
  // A fence side is drawn top-to-bottom, unlike a horizontal fence panel.
  if(/\bfence\s+(?:side|vertical(?:\s+panel)?)\b/.test(name)&&height>=20&&height>=o.width*2){
   extra.push({...o,collision:{type:'rectangle',width:Math.max(20,Math.min(40,o.width+14)),depth:height,offsetX:0,offsetY:-height/2,...(o.collision?.cutouts?.length?{cutouts:o.collision.cutouts}:{})}});
  }
  if(/\bfence\s+post\b/.test(name)){
   const posts=postsByName.get(name)||[];posts.push(o);postsByName.set(name,posts);
  }
 }
 for(const posts of postsByName.values()){
  posts.sort((a,b)=>a.x-b.x||a.y-b.y);const columns=[];
  for(const post of posts){let column=columns[columns.length-1];if(!column||Math.abs(post.x-column[0].x)>4){column=[];columns.push(column);}column.push(post);}
  for(const column of columns){
   if(column.length<3)continue;column.sort((a,b)=>a.y-b.y);
   const distances=column.slice(1).map((p,i)=>p.y-column[i].y).filter(d=>d>=12&&d<=256).sort((a,b)=>a-b);
   if(distances.length<2)continue;
   const step=distances[Math.floor((distances.length-1)/2)];
   for(let i=1;i<column.length;i++){
    const a=column[i-1],b=column[i],gap=b.y-a.y;
    // Larger-than-usual gaps are intentional openings: never bridge them.
    if(gap<12||gap>Math.min(256,step*1.25)||Math.abs(a.x-b.x)>4)continue;
    const width=Math.max(20,Math.min(40,Math.max(a.width,b.width)+8));
    extra.push({id:`vertical-fence-${a.id}-${b.id}`,name:'Vertical fence connection',x:(a.x+b.x)/2,y:b.y,width,solid:true,active:true,collision:{type:'rectangle',width,depth:gap,offsetX:0,offsetY:-gap/2}});
   }
  }
 }
 return extra;
}
