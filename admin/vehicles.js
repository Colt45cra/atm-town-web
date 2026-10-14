// Vehicle tuning affects both Map Studio imports and admin-uploaded assets.
export function mountVehicleAdmin({host,api,node,status}){
 const input=(type,min,max,step,value)=>{
  const el=node('input');el.type=type;el.min=String(min);el.max=String(max);el.step=String(step);el.value=String(value);return el;
 };
 const label=(name,control)=>{const el=node('label',name);el.append(control);return el;};
 let loading=false;
 async function open(){
  if(loading)return;loading=true;host.replaceChildren(node('p','Loading vehicles on the live map…'));
  try{
   const data=await api('admin-vehicles');host.replaceChildren();
   if(!data.vehicles?.length){host.append(node('p','No driveable vehicle assets found on the current map. Add vehicles in Map Studio and publish the map.'));return;}
   host.append(node('p','Adjust each vehicle without re-exporting Map Studio. Maximum speed is in world pixels per second. Suspension strength controls body bounce and roll on rough ground; 0 disables it. Changes reach players when the world objects refresh (usually within a minute).'));
   for(const v of data.vehicles){
    const card=node('article');card.className='vehicle-tuning-card';
    const heading=node('h3',v.name||'Vehicle');card.append(heading,node('p',v.source+' · '+v.model+' · default '+v.defaultSpeed+' px/s'));
    const form=node('form');form.className='vehicle-tuning-form';
    const speedRow=node('div');speedRow.className='vehicle-tuning-controls';
    const speedSlider=input('range',80,1200,10,v.speed),speedNumber=input('number',80,1200,1,v.speed);
    speedNumber.setAttribute('aria-label','Maximum speed in world pixels per second');
    const speedTitle=node('strong','Max speed');const speedValue=node('output',v.speed+' px/s');
    speedSlider.oninput=()=>{speedNumber.value=speedSlider.value;speedValue.textContent=speedSlider.value+' px/s';};
    speedNumber.oninput=()=>{const n=Number(speedNumber.value);if(Number.isFinite(n)&&n>=80&&n<=1200){speedSlider.value=String(n);speedValue.textContent=n+' px/s';}};
    speedRow.append(speedTitle,speedSlider,speedNumber,speedValue);
    const suspensionRow=node('div');suspensionRow.className='vehicle-tuning-controls';
    const suspension=input('range',0,2,.05,v.suspension),suspensionValue=node('output',Number(v.suspension).toFixed(2)+'×');
    suspension.oninput=()=>{suspensionValue.textContent=Number(suspension.value).toFixed(2)+'×';};
    suspensionRow.append(node('strong','Rough terrain suspension'),suspension,suspensionValue);
    const controls=node('div');controls.className='object-controls';
    const save=node('button','Save vehicle settings');save.type='submit';
    const reset=node('button','Restore model speed');reset.type='button';
    reset.onclick=()=>{speedSlider.value=String(v.defaultSpeed);speedNumber.value=String(v.defaultSpeed);speedValue.textContent=v.defaultSpeed+' px/s';};
    controls.append(save,reset);
    const feedback=node('p');feedback.setAttribute('role','status');
    form.append(speedRow,suspensionRow,controls,feedback);card.append(form);host.append(card);
    form.onsubmit=async event=>{
     event.preventDefault();const speed=Number(speedNumber.value),amount=Number(suspension.value);
     if(!Number.isInteger(speed)||speed<80||speed>1200){feedback.textContent='Enter a speed between 80 and 1200.';return;}
     save.disabled=true;feedback.textContent='Saving…';
     try{await api('admin-vehicle-save',{vehicle_id:v.id,speed,suspension:amount});feedback.textContent='Saved · current players receive changes on map refresh.';status('Vehicle settings saved.');}
     catch(error){feedback.textContent=error.message;}
     finally{save.disabled=false;}
    };
   }
  }catch(error){host.replaceChildren(node('p','Could not load vehicle settings: '+error.message));}
  finally{loading=false;}
 }
 return{open};
}
