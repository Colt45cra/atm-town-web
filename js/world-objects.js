(function(global){
 'use strict';let objects=[],lastRefresh=0,busy=false;const images=new Map();
 async function refresh(){if(busy||Date.now()-lastRefresh<60000)return;busy=true;lastRefresh=Date.now();try{const r=await fetch('/api/leaderboards?action=rewards-world-objects',{cache:'no-store'});if(!r.ok)throw Error('Objects unavailable');objects=(await r.json()).objects||[];const urls=new Set(objects.map(o=>o.sprite_url));for(const [url] of images)if(!urls.has(url))images.delete(url);}catch(error){lastRefresh=Date.now()-50000;console.warn('Town objects:',error.message);}finally{busy=false;}}
 function actors(view){refresh();return objects.filter(o=>{const h=o.width*o.image_height/o.image_width;return o.x+o.width/2>=view.x&&o.x-o.width/2<=view.x+view.w&&o.y>=view.y&&o.y-h<=view.y+view.h;}).map(o=>({depth:o.y,type:'worldobject',object:o}));}
 function draw(ctx,o){let img=images.get(o.sprite_url);if(!img){img=new Image();img.decoding='async';img.src=o.sprite_url;images.set(o.sprite_url,img);}if(img.complete&&img.naturalWidth){const h=o.width*o.image_height/o.image_width;ctx.drawImage(img,o.x-o.width/2,o.y-h,o.width,h);}}
 function blocked(x,y){return objects.some(o=>o.solid&&Math.abs(x-o.x)<o.width*.4&&y>o.y-18&&y<o.y+4);}
 global.ATMWorldObjects=Object.freeze({actors,draw,blocked,refresh});
})(window);
