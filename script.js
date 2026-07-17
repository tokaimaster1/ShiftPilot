const days=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let chosenProfile='openingRush', forecast=null, strategy='coverage', rota=[];
const profiles={openingRush:{name:'Opening rush',fn:(x,o,c)=>.35+1.8*g(x,o+1.2,1.0)+.45*g(x,(o+c)/2,2.5)},slowBuild:{name:'Gradual build',fn:(x,o,c)=>.25+1.2*Math.max(0,(x-o)/(c-o))},midday:{name:'Midday peak',fn:(x,o,c)=>.3+1.8*g(x,(o+c)/2,1.35)},doublePeak:{name:'Two peaks',fn:(x,o,c)=>.3+1.35*g(x,o+2,1)+1.25*g(x,c-2.2,1.15)},steady:{name:'Steady',fn:()=>1},closingRush:{name:'Closing rush',fn:(x,o,c)=>.35+1.7*g(x,c-1.1,1.0)}};
function g(x,m,s){return Math.exp(-((x-m)**2)/(2*s*s))}
function mins(t){let[a,b]=t.split(':').map(Number);return a*60+b}
function fmt(m){return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0')}
function toast(t){let e=$('#toast');e.textContent=t;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),2200)}
function renderBase(){ $('#hours').innerHTML=days.map((d,i)=>`<div class="hourrow"><b>${d.slice(0,3)}</b><input class="opencheck" data-day="${d}" type="checkbox" ${i<5?'checked':''}><input class="opentime" data-day="${d}" type="time" value="08:00"><input class="closetime" data-day="${d}" type="time" value="18:00"></div>`).join(''); $('#weights').innerHTML=days.map((d,i)=>`<div class="weight"><b>${d.slice(0,3)}</b><input class="dayweight" data-day="${d}" type="number" value="${i===0?115:i===4?110:i<5?100:70}"><small>%</small></div>`).join('') }
function line(canvas,vals,color='#4f64ff'){let c=canvas.getContext('2d'),w=canvas.width,h=canvas.height,p=30,max=Math.max(...vals,1);c.clearRect(0,0,w,h);c.strokeStyle='#dfe7f1';for(let i=0;i<4;i++){let y=p+(h-p*2)*i/3;c.beginPath();c.moveTo(p,y);c.lineTo(w-p,y);c.stroke()}let gr=c.createLinearGradient(0,p,0,h-p);gr.addColorStop(0,'rgba(79,100,255,.35)');gr.addColorStop(1,'rgba(79,100,255,.03)');c.beginPath();vals.forEach((v,i)=>{let x=p+(w-p*2)*i/(vals.length-1),y=h-p-v/max*(h-p*2);i?c.lineTo(x,y):c.moveTo(x,y)});c.lineTo(w-p,h-p);c.lineTo(p,h-p);c.closePath();c.fillStyle=gr;c.fill();c.beginPath();vals.forEach((v,i)=>{let x=p+(w-p*2)*i/(vals.length-1),y=h-p-v/max*(h-p*2);i?c.lineTo(x,y):c.moveTo(x,y)});c.strokeStyle=color;c.lineWidth=3;c.stroke()}
function bars(canvas,b,l){let c=canvas.getContext('2d'),w=canvas.width,h=canvas.height,p=42,max=Math.max(...b,...l,1);c.clearRect(0,0,w,h);c.strokeStyle='#e3eaf3';for(let i=0;i<5;i++){let y=p+(h-p*2)*i/4;c.beginPath();c.moveTo(p,y);c.lineTo(w-p,y);c.stroke()}let bw=(w-p*2)/b.length*.62;b.forEach((v,i)=>{let x=p+(w-p*2)*(i+.5)/b.length,bh=v/max*(h-p*2);c.fillStyle='#9aaaff';c.fillRect(x-bw/2,h-p-bh,bw,bh)});c.beginPath();l.forEach((v,i)=>{let x=p+(w-p*2)*(i+.5)/l.length,y=h-p-v/max*(h-p*2);i?c.lineTo(x,y):c.moveTo(x,y)});c.strokeStyle='#19a97a';c.lineWidth=3;c.stroke()}
function renderGallery(){let g=$('#gallery');g.innerHTML=Object.entries(profiles).map(([k,v])=>`<button class="profileopt ${k===chosenProfile?'selected':''}" data-profile="${k}"><canvas width="180" height="70"></canvas><strong>${v.name}</strong><small>Visual demand shape</small></button>`).join(''); $$('.profileopt').forEach(b=>{line(b.querySelector('canvas'),Array.from({length:24},(_,i)=>profiles[b.dataset.profile].fn(8+i*10/23,8,18)));b.onclick=()=>{chosenProfile=b.dataset.profile;renderGallery();updatePreview()}})}
function val(id){return $(`#${id} .selected`)?.dataset.value}

function renderPeakRows(){let count=Number($('#peakCount').value||1),defaults=[['10:30',1],['14:30',.85],['18:00',.7]],old=$$('.peaktime').map((x,i)=>({time:x.value,weight:Number($$('.peakweight')[i]?.value||1)}));$('#peakRows').innerHTML=Array.from({length:count},(_,i)=>{let p=old[i]||{time:defaults[i][0],weight:defaults[i][1]};return `<div class="peakrow"><label>Peak ${i+1} time<input class="peaktime" type="time" value="${p.time}"></label><label>Relative strength<select class="peakweight"><option value=".7" ${p.weight===.7?'selected':''}>Lower</option><option value="1" ${p.weight===1?'selected':''}>Primary</option><option value="1.25" ${p.weight===1.25?'selected':''}>Strong</option></select></label></div>`}).join('');$$('.peaktime,.peakweight').forEach(x=>x.oninput=()=>{updatePreview();invalidateSchedule()})}
function peaks(){if(val('hasPeaks')==='no')return[];return $$('.peaktime').map((x,i)=>({time:mins(x.value)/60,weight:Number($$('.peakweight')[i]?.value||1)})).filter(x=>Number.isFinite(x.time))}
function invalidateSchedule(){forecast=null;rota=[];if($('#scheduleStats'))$('#scheduleStats').innerHTML='';if($('#dailyCharts'))$('#dailyCharts').innerHTML='';if($('#rotaTable'))$('#rotaTable').innerHTML='';if($('#tradeoffs'))$('#tradeoffs').innerHTML='';if($('#scheduleInsight'))$('#scheduleInsight').textContent='Forecast inputs changed. Generate the schedule again to refresh all days and results.'}

function updatePreview(){let o=8,c=18,str=Number(val('peakStrength')||1.5),dip=Number(val('lunchDip')||0),arr=[],ps=peaks();for(let x=o;x<c;x+=.5){let v=profiles[chosenProfile].fn(x,o,c);if(val('openingPattern')==='rush')v+=.65*g(x,o+.5,.7);if(val('openingPattern')==='build')v*=.55+.45*(x-o)/(c-o);ps.forEach(p=>v+=str*p.weight*g(x,p.time,1.05));v-=dip*g(x,12.5,.8);if(val('closePattern')==='fade')v*=1-.4*Math.max(0,(x-(c-2))/2);if(val('closePattern')==='rush')v+=.7*g(x,c-.6,.6);arr.push(Math.max(.08,v))}line($('#profileCanvas'),arr);$('#profileName').textContent=profiles[chosenProfile].name;$('#peakLabel').textContent=ps.length?`${ps.length} specific peak${ps.length===1?'':'s'} modelled`:'No specific peak times'}
['openingPattern','hasPeaks','peakStrength','lunchDip','closePattern'].forEach(id=>$$(`#${id} button`).forEach(b=>b.onclick=()=>{$$(`#${id} button`).forEach(x=>x.classList.remove('selected'));b.classList.add('selected');if(id==='peakPreset'&&b.dataset.value!=='none'){let h=Math.floor(Number(b.dataset.value)),m=(Number(b.dataset.value)%1)*60;$('#peakTime').value=fmt(h*60+m)}updatePreview()}));$('#peakCount').onchange=()=>{renderPeakRows();updatePreview();invalidateSchedule()};
function showStep(n){n=Number(n);$$('.panel').forEach(p=>p.classList.toggle('active',Number(p.dataset.panel)===n));$$('.step').forEach(s=>s.classList.toggle('active',Number(s.dataset.step)===n));$('#progressText').textContent=`${n} of 4`;$('#progressBar').style.width=`${n*25}%`;scrollTo({top:0,behavior:'smooth'})}
$$('.next').forEach(b=>b.onclick=()=>showStep(b.dataset.next));$$('.back').forEach(b=>b.onclick=()=>showStep(b.dataset.back));$$('.step').forEach(b=>b.onclick=()=>showStep(b.dataset.step));
function showView(v){$$('.view').forEach(x=>x.classList.remove('active'));$(`#${v}View`).classList.add('active');$$('.nav').forEach(x=>x.classList.toggle('active',x.dataset.view===v));if(v==='schedule'){forecast=makeProfile();let maxW=Number($('#maxWeeklyHours')?.value||40),paid=forecast.open.reduce((s,d)=>s+forecast.profile.reduce((a,x)=>a+x.staff*forecast.int/60,0),0),peak=Math.max(...forecast.profile.map(x=>x.staff));forecast.requiredPaidHours=paid;let rec=recommendHeadcount();forecast.headsRequired=rec.heads;$('#headcountRecommendation').textContent=`ShiftPilot recommends ${forecast.headsRequired} total heads to achieve the selected target with the current scheduling rules.`;$('#headcountRecommendation').classList.toggle('warn',Number($('#scheduleHeadcount').value)<forecast.headsRequired);generateSchedule()}scrollTo({top:0,behavior:'smooth'})}
$$('.nav').forEach(b=>b.onclick=()=>showView(b.dataset.view));$$('.jump').forEach(b=>b.onclick=()=>showView(b.dataset.view));
$$('.target').forEach(t=>t.onclick=()=>{$$('.target').forEach(x=>x.classList.remove('selected'));t.classList.add('selected');t.querySelector('input').checked=true;let m=t.querySelector('input').value;$('#slaControls').classList.toggle('hidden',m!=='sla');$('#coverageControls').classList.toggle('hidden',m!=='coverage')});
function fact(n){let r=1;for(let i=2;i<=n;i++)r*=i;return r}
function erlang(volume,aht,int,target,secs,occ){let lambda=volume/(int*60),mu=1/(aht*60),traffic=lambda/mu;if(traffic<=0)return 0;for(let n=Math.max(1,Math.ceil(traffic));n<150;n++){let sum=0;for(let k=0;k<n;k++)sum+=traffic**k/fact(k);let tail=traffic**n/fact(n)*(n/(n-traffic)),ec=tail/(sum+tail),sl=1-ec*Math.exp(-(n-traffic)*mu*secs);if(sl>=target&&traffic/n<=occ)return n}return Math.ceil(traffic/occ)}
function makeProfile(){let open=days.map(d=>({day:d,on:$(`.opencheck[data-day="${d}"]`).checked,start:$(`.opentime[data-day="${d}"]`).value,end:$(`.closetime[data-day="${d}"]`).value,weight:Number($(`.dayweight[data-day="${d}"]`).value)/100})).filter(x=>x.on),base=open[0]||{start:'08:00',end:'18:00'},o=mins(base.start),c=mins(base.end),int=Number($('#interval').value),ps=peaks(),str=Number(val('peakStrength')||1.5),dip=Number(val('lunchDip')||0),peakReduce=Number($('#peakReduce')?.value||0)/100,raw=[];for(let t=o;t<c;t+=int){let x=t/60,v=profiles[chosenProfile].fn(x,o/60,c/60);if(val('openingPattern')==='rush')v+=.65*g(x,o/60+.5,.7);if(val('openingPattern')==='build')v*=.55+.45*(t-o)/(c-o);ps.forEach(p=>v+=str*p.weight*g(x,p.time,1.05));v-=dip*g(x,12.5,.8);if(val('closePattern')==='fade')v*=1-.4*Math.max(0,(x-(c/60-2))/2);if(val('closePattern')==='rush')v+=.7*g(x,c/60-.6,.6);if(peakReduce>0&&ps.length){let influence=Math.max(...ps.map(p=>g(x,p.time,1.15)));v*=1-peakReduce*influence}raw.push({time:fmt(t),weight:Math.max(.08,v)})}let total=raw.reduce((s,x)=>s+x.weight,0),daily=Number($('#dailyVolume').value),aht=Number($('#aht').value),sh=Number($('#shrinkage').value)/100,occ=Number($('#occupancy').value)/100,mode=$('input[name="mode"]:checked').value;let prof=raw.map(x=>{let demand=daily*x.weight/total,staff;if(mode==='sla')staff=erlang(demand,aht,int,Number($('#slaPercent').value)/100,Number($('#slaSeconds').value),occ);else staff=Math.ceil(demand*aht/(int*occ*(1-sh))*(mode==='coverage'?Number($('#coverageTarget').value)/100:1));staff=Math.ceil(staff/(1-sh));return{...x,demand,staff,workload:demand*aht}});return{open,profile:prof,daily,aht,int,sh,occ,mode}}
function statHtml(a){return a.map(x=>`<div class="stat"><span>${x[0]}</span><strong>${x[1]}</strong><small>${x[2]}</small></div>`).join('')}
function buildForecast(){forecast=makeProfile();let weekly=forecast.open.reduce((s,d)=>s+forecast.daily*d.weight,0),hours=weekly*forecast.aht/60,peak=Math.max(...forecast.profile.map(x=>x.staff)),avg=forecast.profile.reduce((s,x)=>s+x.staff,0)/forecast.profile.length,openHours=forecast.open.reduce((s,d)=>s+(mins(d.end)-mins(d.start))/60,0),requiredPaidHours=forecast.open.reduce((sum,d)=>sum+forecast.profile.reduce((s,x)=>s+x.staff*forecast.int/60*d.weight,0),0),maxWeekly=Number($('#maxWeeklyHours')?.value||40);forecast.requiredPaidHours=requiredPaidHours;let rec=recommendHeadcount(),headsRequired=rec.heads;forecast.headsRequired=headsRequired;$('#forecastStats').innerHTML=statHtml([['Weekly demand',Math.round(weekly).toLocaleString(),'Modelled interactions'],['Workload hours',hours.toFixed(1),'Before shrinkage'],['Peak staff',peak,'Busiest interval'],['Heads required',headsRequired,`${requiredPaidHours.toFixed(0)} scheduled hrs ÷ ${maxWeekly} max hrs`]]);bars($('#forecastCanvas'),forecast.profile.map(x=>x.demand),forecast.profile.map(x=>x.staff));$('#ahtScenario').value=forecast.aht;scenario();let p=forecast.profile.reduce((a,b)=>b.staff>a.staff?b:a);$('#forecastInsight').textContent=`The strongest pressure is around ${p.time}, where the model needs ${p.staff} people. The weekly requirement equates to roughly ${headsRequired} full-time heads at a ${maxWeekly}-hour maximum, before using part-time flexibility.`;$('#scheduleHeadcount').value=$('#headcount').value;showStep(4)}
$('#buildForecast').onclick=buildForecast;
function scenario(){if(!forecast)return;let d=Number($('#demandScenario').value),a=Number($('#ahtScenario').value),m=1+d/100,peak=Math.max(...forecast.profile.map(x=>Math.ceil(x.staff*m*a/forecast.aht))),weekly=forecast.open.reduce((s,x)=>s+forecast.daily*x.weight,0)*m*a/60;$('#demandTxt').textContent=`${d}%`;$('#ahtTxt').textContent=`${a} min`;$('#scenarioPeak').textContent=`${peak} people`;$('#scenarioWorkload').textContent=`${weekly.toFixed(1)} hours`;$('#peakReduceTxt').textContent=`${Number($('#peakReduce').value)}%`}
$('#demandScenario').oninput=scenario;$('#ahtScenario').oninput=scenario;$('#peakReduce').oninput=()=>{updatePreview();forecast=makeProfile();buildForecast()};
const presets={coverage:[95,35,40,45],daysOff:[75,95,45,60],cost:[70,40,95,40],consistent:[75,55,45,95],fairness:[75,75,45,70],current:[80,65,80,60]};
function choose(s){strategy=s;$$('.strategy').forEach(x=>x.classList.toggle('selected',x.dataset.strategy===s));let v=presets[s];[['coverageWeight','cwTxt'],['daysOffWeight','dwTxt'],['costWeight','costTxt'],['consistencyWeight','consTxt']].forEach((p,i)=>{$('#'+p[0]).value=v[i];$('#'+p[1]).textContent=v[i]});generateSchedule()}
$$('.strategy').forEach(b=>b.onclick=()=>choose(b.dataset.strategy));[['coverageWeight','cwTxt'],['daysOffWeight','dwTxt'],['costWeight','costTxt'],['consistencyWeight','consTxt']].forEach(([id,txt])=>$('#'+id).oninput=e=>{$('#'+txt).textContent=e.target.value;generateSchedule()});
function weeklyHoursOf(row){return days.reduce((s,d)=>{if(!row[d]||row[d]==='Off'||row[d]==='Manual')return s;let [a,b]=row[d].split('–').map(mins);return s+(b-a)/60},0)}
function dayRequirement(dayObj){let weight=dayObj?.weight||0,floor=Math.max(0,Number($('#minLiveHeadcount')?.value||0));return forecast.profile.map(x=>Math.max(floor,Math.max(0,Math.ceil(x.staff*weight))))}
function renderDailyCharts(dayData){
  let plain=getLanguageMode()==='plain';
  let host=$('#dailyCoverageCharts');
  host.innerHTML=days.map((d,i)=>{
    let x=dayData[i];
    if(!x.open)return `<div class="day-chart"><header><b>${d}</b><span>Closed</span></header><canvas width="520" height="210" data-day-index="${i}"></canvas></div>`;
    let peakReq=Math.max(...x.req),peakSched=Math.max(...x.sched),lowest=x.req.reduce((best,r,idx)=>{let ratio=r?x.sched[idx]/r:1;return ratio<best.ratio?{ratio,idx}:best},{ratio:Infinity,idx:0}),time=forecast.profile[lowest.idx]?.time||'—';
    return `<div class="day-chart"><header><b>${d}</b><span>${x.coverage.toFixed(1)}% ${plain?'covered':'coverage'}</span></header><canvas width="520" height="210" data-day-index="${i}"></canvas><div class="day-metrics"><div><span>${plain?'Most people needed':'Peak requirement'}</span><b>${peakReq}</b></div><div><span>${plain?'Most people scheduled':'Peak scheduled'}</span><b>${peakSched}</b></div><div><span>${plain?'Weakest time':'Lowest coverage'}</span><b>${time}</b></div></div></div>`
  }).join('');
  $$('.day-chart canvas').forEach(c=>{let x=dayData[Number(c.dataset.dayIndex)];if(x.open)bars(c,x.req,x.sched);else line(c,[0,0], '#b7c1cf')})
}

function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function openDayNames(){return days.filter(d=>forecast.open.some(x=>x.day===d))}
function distributeExactHours(target,dayCount,minShift,maxShift){
  if(dayCount<=0)return[];
  let minimum=dayCount*minShift,maximum=dayCount*maxShift;
  if(target<minimum-.001||target>maximum+.001)return null;
  let base=Math.floor((target/dayCount)*4)/4, arr=Array(dayCount).fill(clamp(base,minShift,maxShift));
  let remaining=Math.round((target-arr.reduce((a,b)=>a+b,0))*4)/4, guard=0;
  while(Math.abs(remaining)>.001&&guard++<500){
    for(let i=0;i<arr.length&&Math.abs(remaining)>.001;i++){
      let step=remaining>0?.25:-.25,next=Math.round((arr[i]+step)*4)/4;
      if(next>=minShift&&next<=maxShift){arr[i]=next;remaining=Math.round((remaining-step)*4)/4}
    }
  }
  return arr;
}
function chosenWorkDays(employeeIndex,count,openNames,together){
  if(count>=openNames.length)return [...openNames];
  if(together){
    let start=employeeIndex%openNames.length, selected=[];
    for(let i=0;i<count;i++)selected.push(openNames[(start+i)%openNames.length]);
    return selected;
  }
  let offset=employeeIndex%Math.max(1,openNames.length);
  return openNames.filter((_,i)=>((i+offset)%openNames.length)<count).slice(0,count);
}
function shiftFromHours(dayObj,startMinutes,hours){
  let os=mins(dayObj.start),ce=mins(dayObj.end),duration=Math.round(hours*60);
  let start=clamp(Math.round(startMinutes/15)*15,os,ce-duration);
  return `${fmt(start)}–${fmt(start+duration)}`;
}
function validateTeamInputs(){
  let errors=[],minW=Number($('#minWeeklyHours').value),maxW=Number($('#maxWeeklyHours').value),
      minS=Number($('#minShift').value),maxS=Number($('#maxShift').value),
      pMin=Number($('#flexiMinHours').value),pMax=Number($('#flexiMaxHours').value),
      pMinS=Number($('#flexiMinShift').value),pMaxS=Number($('#flexiMaxShift').value),
      pDays=Number($('#flexiMaxDays').value),openCount=Math.max(1,forecast.open.length);
  if(minW>maxW)errors.push('FT minimum weekly hours cannot exceed the maximum.');
  if(minS>maxS)errors.push('FT minimum shift cannot exceed the maximum shift.');
  if(minW>openCount*maxS)errors.push(`FT minimum weekly hours cannot fit within ${openCount} open days at the maximum shift length.`);
  if(maxW<Math.ceil(minW/maxS)*minS)errors.push('The FT weekly limits cannot be created using the selected daily shift limits.');
  if(pMin>pMax)errors.push('PT minimum weekly hours cannot exceed the maximum.');
  if(pMinS>pMaxS)errors.push('PT minimum shift cannot exceed the maximum shift.');
  if(pDays<1||pDays>7)errors.push('PT maximum working days must be between 1 and 7.');
  if(pMin>pDays*pMaxS)errors.push('PT minimum weekly hours cannot fit inside the maximum PT days and shift length.');
  return errors;
}
function coverageStartForEmployee(i,od,hours,peak){
  let os=mins(od.start),ce=mins(od.end),duration=hours*60,protect=$('#protectEdges')?.checked!==false;
  if(!protect)return peak-duration*.55+(i%3-1)*30;
  let group=i%5;
  if(group===0||group===1)return os+(group*30);                 // opening anchors
  if(group===2)return peak-duration*.52;                       // peak anchor
  if(group===3||group===4)return ce-duration-((group-3)*30);   // closing anchors
  return peak-duration*.5;
}
function createEmployeeRow(emp,i,settings){
  let r={name:emp.name,type:emp.type,validation:[]},openNames=openDayNames(),isPT=emp.type==='PT';
  if(isPT&&settings.flexMode==='manual'){
    days.forEach(d=>r[d]='Off');
    r.weekly=0;
    return r;
  }
  let minWeekly=isPT?settings.flexMin:settings.ftMin,maxWeekly=isPT?settings.flexMax:settings.ftMax;
  let target=minWeekly===maxWeekly?minWeekly:(isPT?Math.min(maxWeekly,Math.max(minWeekly,(minWeekly+maxWeekly)/2)):maxWeekly);
  let minShift=isPT?settings.flexMinShift:settings.ftMinShift,maxShift=isPT?settings.flexMaxShift:settings.ftMaxShift;
  let maxDays=isPT?Math.min(settings.flexMaxDays,openNames.length):openNames.length;
  let minimumDays=Math.ceil(target/maxShift),maximumDays=Math.floor(target/minShift);
  let dayCount=clamp(strategy==='daysOff'?minimumDays:Math.min(5,Math.max(minimumDays,Math.round(target/Math.min(8,maxShift)))),minimumDays,Math.min(maxDays,maximumDays));
  let allocations=distributeExactHours(target,dayCount,minShift,maxShift);
  if(!allocations){
    r.validation.push(`Cannot allocate ${target} weekly hours within the selected shift limits.`);
    days.forEach(d=>r[d]='Off');r.weekly=0;return r;
  }
  let workDays=chosenWorkDays(i,dayCount,openNames,strategy==='daysOff'),peakI=forecast.profile.findIndex(x=>x.staff===Math.max(...forecast.profile.map(y=>y.staff))),peak=mins(forecast.profile[peakI].time);
  days.forEach(d=>r[d]='Off');
  workDays.forEach((d,idx)=>{
    let od=forecast.open.find(x=>x.day===d),hours=allocations[idx],base=strategy==='coverage'?coverageStartForEmployee(i,od,hours,peak):mins(od.start)+(i%4)*30;
    if(strategy==='fairness')base=mins(od.start)+(i%5)*30;
    r[d]=shiftFromHours(od,base,hours);
  });
  r.weekly=weeklyHoursOf(r);
  if(r.weekly<minWeekly-.01||r.weekly>maxWeekly+.01)r.validation.push(`${r.weekly.toFixed(2)} hours is outside ${minWeekly}–${maxWeekly}.`);
  return r;
}
function validateManualPTRow(row){
  let flexMin=Number($('#flexiMinHours').value),flexMax=Number($('#flexiMaxHours').value),
      maxDays=Number($('#flexiMaxDays').value),minShift=Number($('#flexiMinShift').value),
      maxShift=Number($('#flexiMaxShift').value),errors=[],worked=0,total=0;
  days.forEach(d=>{
    let shift=row[d];
    if(!shift||shift==='Off')return;
    worked++;
    let od=forecast.open.find(x=>x.day===d);
    if(!od){errors.push(`${d} is closed.`);return}
    let [start,end]=shift.split('–').map(mins),hours=(end-start)/60;
    if(end<=start)errors.push(`${d}: end time must be after start time.`);
    if(start<mins(od.start)||end>mins(od.end))errors.push(`${d}: shift must stay inside opening hours.`);
    if(hours<minShift-.001||hours>maxShift+.001)errors.push(`${d}: ${hours.toFixed(2)} hours is outside ${minShift}–${maxShift}.`);
    total+=Math.max(0,hours);
  });
  if(worked>maxDays)errors.push(`${worked} working days exceeds the PT maximum of ${maxDays}.`);
  if(total>flexMax+.001)errors.push(`${total.toFixed(2)} weekly hours exceeds the PT maximum of ${flexMax}.`);
  if(total>0&&total<flexMin-.001)errors.push(`${total.toFixed(2)} weekly hours is below the PT minimum of ${flexMin}.`);
  row.weekly=total;row.validation=errors;return errors;
}

function currentScheduleSettings(){
  return {
    ftMin:Number($('#minWeeklyHours').value),ftMax:Number($('#maxWeeklyHours').value),
    ftMinShift:Number($('#minShift').value),ftMaxShift:Number($('#maxShift').value),
    flexMin:Number($('#flexiMinHours').value),flexMax:Number($('#flexiMaxHours').value),
    flexMaxDays:Number($('#flexiMaxDays').value),flexMinShift:Number($('#flexiMinShift').value),
    flexMaxShift:Number($('#flexiMaxShift').value),flexMode:'auto'
  };
}
function scoreCandidateHeadcount(ftCount){
  let settings=currentScheduleSettings(),flex=Number($('#flexiCount').value||0),candidate=[
    ...Array.from({length:ftCount},(_,i)=>({name:`Full-time ${String(i+1).padStart(2,'0')}`,type:'FT'})),
    ...Array.from({length:flex},(_,i)=>({name:`Part-time ${String(i+1).padStart(2,'0')}`,type:'PT'}))
  ].map((emp,i)=>createEmployeeRow(emp,i,settings));
  let all=[];
  forecast.open.forEach(od=>{
    let req=dayRequirement(od);
    forecast.profile.forEach((x,idx)=>{
      let t=mins(x.time),sched=candidate.reduce((sum,r)=>{
        let shift=r[od.day];if(!shift||shift==='Off')return sum;
        let [st,en]=shift.split('–').map(mins);return sum+(t>=st&&t<en?1:0)
      },0);
      all.push({req:req[idx],sched});
    });
  });
  let covered=all.reduce((s,x)=>s+Math.min(x.req,x.sched),0)/Math.max(1,all.reduce((s,x)=>s+x.req,0))*100;
  let compliance=all.length?all.filter(x=>x.sched>=x.req).length/all.length*100:100;
  let mode=$('input[name="mode"]:checked')?.value||'best',slaTarget=Number($('#slaPercent').value||80);
  let metric=mode==='coverage'?covered:mode==='sla'?slaTarget*Math.min(1,covered/100):compliance;
  let target=mode==='coverage'?Number($('#coverageTarget').value||90):mode==='sla'?slaTarget:90;
  return {metric,target,covered,compliance};
}
function recommendHeadcount(){
  let floor=Math.max(1,Number($('#minLiveHeadcount')?.value||0)),maxSearch=150,best=maxSearch,last=null;
  for(let heads=floor;heads<=maxSearch;heads++){
    let score=scoreCandidateHeadcount(heads);last=score;
    if(score.metric+0.0001>=score.target){best=heads;break}
  }
  return {heads:best,score:last};
}

function calculateScheduleOutputs(){
  let maxW=Number($('#maxWeeklyHours').value||40),ft=Number($('#scheduleHeadcount').value||0),flex=Number($('#flexiCount').value||0),flexMax=Number($('#flexiMaxHours').value||0);
  rota.filter(r=>r.type==='PT').forEach(r=>{if(($('input[name="flexiMode"]:checked')?.value||'auto')==='manual')validateManualPTRow(r)});
  let dayData=days.map(d=>{
    let od=forecast.open.find(x=>x.day===d);
    if(!od)return{day:d,open:false,req:[0],sched:[0],coverage:100};
    let req=dayRequirement(od),sched=forecast.profile.map(x=>{
      let t=mins(x.time);
      return rota.reduce((s,r)=>{
        if(!r[d]||r[d]==='Off')return s;
        let [st,en]=r[d].split('–').map(mins);
        return s+(t>=st&&t<en?1:0)
      },0)
    }),coverage=req.reduce((s,r,i)=>s+Math.min(r,sched[i]),0)/Math.max(1,req.reduce((a,b)=>a+b,0))*100;
    return{day:d,open:true,req,sched,coverage}
  });
  let openData=dayData.filter(x=>x.open),covered=openData.reduce((s,x)=>s+x.coverage,0)/Math.max(1,openData.length),
      minLive=Math.max(0,Number($('#minLiveHeadcount')?.value||0)),
      floorBreaches=openData.reduce((sum,d)=>sum+d.sched.filter(x=>x<minLive).length,0),
      edgeChecks=openData.flatMap(d=>d.sched.length>1?[d.sched[0],d.sched[d.sched.length-1]]:d.sched),
      edgeCoverage=edgeChecks.length?edgeChecks.filter(x=>x>=minLive).length/edgeChecks.length*100:100,
      consec=strategy==='daysOff'?96:strategy==='coverage'?62:78,
      totalScheduled=rota.reduce((s,r)=>s+(r.weekly||0),0),
      invalid=rota.filter(r=>r.validation?.length).length,
      headsRequired=forecast.headsRequired||Math.ceil((forecast.requiredPaidHours||0)/maxW),
      configured=ft+flex,totalCapacity=ft*maxW+flex*flexMax;
  $('#scheduleStats').innerHTML=statHtml([
    ['Heads required',headsRequired,`${configured} currently configured`],
    ['Coverage score',`${covered.toFixed(1)}%`,covered>90?'Strong fit':'Some gaps remain'],
    ['Scheduled hours',`${totalScheduled.toFixed(1)} hrs`,`${(forecast.requiredPaidHours||0).toFixed(0)} hrs required`],
    ['Live HC floor',floorBreaches?`${floorBreaches} breach${floorBreaches===1?'':'es'}`:'Protected',`Minimum ${minLive} while open`]
  ]);
  let mode=$('input[name="mode"]:checked')?.value||'best',allIntervals=openData.flatMap(d=>d.req.map((r,i)=>({req:r,sched:d.sched[i]}))),
      metIntervals=allIntervals.filter(x=>x.sched>=x.req).length,
      intervalCompliance=allIntervals.length?metIntervals/allIntervals.length*100:100,
      slaTarget=Number($('#slaPercent').value||80),projectedSla=slaTarget*Math.min(1,covered/100),
      metricLabel,metricValue,metricTarget,targetValue;
  if(mode==='sla'){metricLabel=getLanguageMode()==='plain'?'Projected weekly customer answer target':'Projected weekly SLA';metricValue=projectedSla;targetValue=slaTarget;metricTarget=`Target: ${slaTarget.toFixed(0)}%`}
  else if(mode==='coverage'){targetValue=Number($('#coverageTarget').value||90);metricLabel=getLanguageMode()==='plain'?'Weekly staffing achieved':'Projected weekly coverage';metricValue=covered;metricTarget=`Target: ${targetValue.toFixed(0)}%`}
  else{targetValue=90;metricLabel=getLanguageMode()==='plain'?'Times fully staffed':'Projected interval compliance';metricValue=intervalCompliance;metricTarget=`${metIntervals} of ${allIntervals.length} time periods fully staffed`}
  $('#performanceLabel').textContent=metricLabel;$('#performanceValue').textContent=`${metricValue.toFixed(1)}%`;$('#performanceTarget').textContent=metricTarget;
  let status=metricValue>=targetValue?'On target':metricValue>=targetValue-5?'Close to target':'Needs attention',statusClass=metricValue>=targetValue?'good':metricValue>=targetValue-5?'warn':'bad';
  $('#performanceStatus').textContent=status;$('#performanceStatus').className=`performance-status ${statusClass}`;
  renderDailyCharts(dayData);
  let labels={coverage:'Best coverage',daysOff:'Days off together',cost:'Lowest cost',consistent:'Consistent shifts',fairness:'Fairness',current:'Current team only'};
  $('#strategyLabel').textContent=labels[strategy];
  $('#headsRequiredNote').textContent=`Estimated total heads required: ${headsRequired}.`;
  $('#tradeoffs').innerHTML=[
    ['Coverage',`${covered.toFixed(1)}%`,covered>90],
    ['Scheduled capacity',`${totalScheduled.toFixed(1)} / ${(forecast.requiredPaidHours||0).toFixed(0)} hrs`,totalScheduled>=forecast.requiredPaidHours],
    ['FT compliance',rota.filter(r=>r.type==='FT'&&r.validation?.length).length?'Review':'Passed',!rota.some(r=>r.type==='FT'&&r.validation?.length)],
    ['Opening / closing protection',`${edgeCoverage.toFixed(0)}%`,edgeCoverage===100],['PT manual validation',invalid?`${invalid} issue${invalid===1?'':'s'}`:'Passed',!invalid]
  ].map(x=>`<div class="trade"><div><b>${x[0]}</b><small>Optimisation result</small></div><strong class="${x[2]?'pos':'neg'}">${x[1]}</strong></div>`).join('');
  $('#scheduleInsight').textContent=invalid
    ?`The rota contains ${invalid} invalid part-time row${invalid===1?'':'s'}. Correct the highlighted weekly hours, days or shift times before using the schedule.`
    :floorBreaches
      ?`The optimiser could not maintain the minimum live headcount of ${minLive} in ${floorBreaches} interval${floorBreaches===1?'':'s'}. Add available heads or hours, shorten the protected window, or reduce another constraint.`
      :totalScheduled<(forecast.requiredPaidHours||0)
        ?`Opening and closing coverage are protected, but the valid rota is short by about ${((forecast.requiredPaidHours||0)-totalScheduled).toFixed(1)} scheduled hours overall.`
        :`The rota protects the minimum live headcount and balances opening, peak and closing coverage before maximising the overall percentage.`;
}
function generateSchedule(){forecast=makeProfile();let estimateMax=Number($('#maxWeeklyHours')?.value||40),estimatePaid=forecast.open.reduce((s,d)=>s+forecast.profile.reduce((a,x)=>a+x.staff*forecast.int/60,0),0),estimatePeak=Math.max(...forecast.profile.map(x=>x.staff));forecast.requiredPaidHours=estimatePaid;let rec=recommendHeadcount();forecast.headsRequired=rec.heads;$('#headcountRecommendation').textContent=`ShiftPilot recommends ${forecast.headsRequired} total heads to achieve the selected target with the current scheduling rules.`;$('#headcountRecommendation').classList.toggle('warn',Number($('#scheduleHeadcount').value)<forecast.headsRequired);
  
  let inputErrors=validateTeamInputs();
  if(inputErrors.length){toast(inputErrors[0]);$('#scheduleInsight').textContent=inputErrors.join(' ');return}
  let ft=Number($('#scheduleHeadcount').value||0),flex=Number($('#flexiCount').value||0),
      settings={ftMin:Number($('#minWeeklyHours').value),ftMax:Number($('#maxWeeklyHours').value),
      ftMinShift:Number($('#minShift').value),ftMaxShift:Number($('#maxShift').value),
      flexMin:Number($('#flexiMinHours').value),flexMax:Number($('#flexiMaxHours').value),
      flexMaxDays:Number($('#flexiMaxDays').value),flexMinShift:Number($('#flexiMinShift').value),
      flexMaxShift:Number($('#flexiMaxShift').value),flexMode:$('input[name="flexiMode"]:checked')?.value||'auto'};
  let oldManual=new Map(rota.filter(r=>r.type==='PT').map(r=>[r.name,r]));
  let emps=[
    ...Array.from({length:ft},(_,i)=>({name:`Full-time ${String(i+1).padStart(2,'0')}`,type:'FT'})),
    ...Array.from({length:flex},(_,i)=>({name:`Part-time ${String(i+1).padStart(2,'0')}`,type:'PT'}))
  ];
  rota=emps.map((emp,i)=>{
    if(emp.type==='PT'&&settings.flexMode==='manual'&&oldManual.has(emp.name))return oldManual.get(emp.name);
    return createEmployeeRow(emp,i,settings)
  });
  rota.forEach(r=>{r.weekly=weeklyHoursOf(r);if(r.type==='PT'&&settings.flexMode==='manual')validateManualPTRow(r)});
  renderRota();calculateScheduleOutputs();
}
function manualShiftCell(row,rowIndex,day){
  let value=row[day],working=value&&value!=='Off',od=forecast.open.find(x=>x.day===day),
      defaultStart=od?.start||'08:00',defaultEnd=od?fmt(Math.min(mins(od.end),mins(od.start)+4*60)):'12:00',
      parts=working?value.split('–'):[defaultStart,defaultEnd];
  return `<td class="manual-cell"><div class="manual-shift ${working?'':'disabled'}">
    <label><input class="pt-work-toggle" type="checkbox" data-row="${rowIndex}" data-day="${day}" ${working?'checked':''}> Work</label>
    <div class="time-pair">
      <input class="pt-start" type="time" step="900" data-row="${rowIndex}" data-day="${day}" value="${parts[0]}">
      <input class="pt-end" type="time" step="900" data-row="${rowIndex}" data-day="${day}" value="${parts[1]}">
    </div></div></td>`
}
function renderRota(){
  let manual=($('input[name="flexiMode"]:checked')?.value||'auto')==='manual';
  let h=`<thead><tr><th>Employee</th><th>Type</th>${days.map(d=>`<th>${d.slice(0,3)}</th>`).join('')}<th>Weekly hrs / validation</th></tr></thead>`;
  let b=`<tbody>${rota.map((r,ri)=>`<tr class="${r.validation?.length?'invalid-row':''}"><th>${r.name}</th><td>${r.type}</td>${
    days.map(d=>r.type==='PT'&&manual?manualShiftCell(r,ri,d):`<td>${r[d]==='Off'?'<span class="off">Off</span>':`<span class="shift">${r[d]}</span>`}</td>`).join('')
  }<td><b class="${r.validation?.length?'hours-warning':'hours-valid'}">${(r.weekly||0).toFixed(2)} hrs</b>${
    r.validation?.length?`<span class="row-error">${r.validation.join('<br>')}</span>`:'<span class="row-ok">Within configured limits</span>'
  }</td></tr>`).join('')}</tbody>`;
  $('#rotaTable').innerHTML=h+b;
  if(manual)bindManualRotaEvents();
}
function updateManualRow(rowIndex){
  let row=rota[rowIndex];
  validateManualPTRow(row);
  renderRota();
  calculateScheduleOutputs();
}
function bindManualRotaEvents(){
  $$('.pt-work-toggle').forEach(input=>input.onchange=e=>{
    let ri=Number(e.target.dataset.row),day=e.target.dataset.day,row=rota[ri],
        cell=e.target.closest('.manual-shift'),start=cell.querySelector('.pt-start').value,end=cell.querySelector('.pt-end').value;
    row[day]=e.target.checked?`${start}–${end}`:'Off';
    updateManualRow(ri)
  });
  $$('.pt-start,.pt-end').forEach(input=>input.onchange=e=>{
    let ri=Number(e.target.dataset.row),day=e.target.dataset.day,row=rota[ri],cell=e.target.closest('.manual-shift'),
        toggle=cell.querySelector('.pt-work-toggle'),start=cell.querySelector('.pt-start').value,end=cell.querySelector('.pt-end').value;
    if(toggle.checked)row[day]=`${start}–${end}`;
    updateManualRow(ri)
  });
}
$('#generateSchedule').onclick=generateSchedule;
['scheduleHeadcount','flexiCount','minWeeklyHours','maxWeeklyHours','flexiMinHours','flexiMaxHours','flexiMaxDays','minShift','maxShift','flexiMinShift','flexiMaxShift','minRest','maxConsecutive','breakAfter','minLiveHeadcount','protectEdges'].forEach(id=>$('#'+id).onchange=generateSchedule);
$('#flexiCount').oninput=e=>{$('#flexiOptions').classList.toggle('hidden',Number(e.target.value)<=0);generateSchedule()};
$$('input[name="flexiMode"]').forEach(x=>x.onchange=generateSchedule);
$('#downloadRota').onclick=()=>{
  if(!rota.length)generateSchedule();
  if(rota.some(r=>r.validation?.length)){toast('Resolve rota validation errors before export.');return}
  let rows=[['Employee','Type',...days,'Weekly Hours'],...rota.map(r=>[r.name,r.type,...days.map(d=>r[d]),(r.weekly||0).toFixed(2)])],
      blob=new Blob([rows.map(r=>r.join(',')).join('\n')],{type:'text/csv'}),u=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=u;a.download='shiftpilot-rota.csv';a.click();URL.revokeObjectURL(u)
};


const terminology={
  plain:{ahtLabel:'Time per customer',shrinkageLabel:'Time the team is unavailable',occupancyLabel:'Maximum team busyness',slaLabel:'Customer answer target',coverageTargetLabel:'Staffing target',erlangNote:'This prototype estimates how many people are needed for queued work. The calculation must be checked before real-world use.',ftCountLabel:'Full-time employee count',minLiveLabel:'Minimum people available at all times',minRestLabel:'Minimum rest between shifts',maxDaysLabel:'Most days worked in a row',breakAfterLabel:'Give a break after this many hours',clopenLabel:'Avoid finishing late then opening early',peopleNeeded:'People needed',peopleScheduled:'People scheduled'},
  expert:{ahtLabel:'Average Handle Time (AHT)',shrinkageLabel:'Shrinkage',occupancyLabel:'Maximum occupancy',slaLabel:'Service Level (SLA)',coverageTargetLabel:'Coverage target',erlangNote:'Queue staffing uses an Erlang-C approximation in this prototype and must be independently validated before production use.',ftCountLabel:'Full-time headcount (FTE)',minLiveLabel:'Minimum live headcount',minRestLabel:'Minimum rest between shifts',maxDaysLabel:'Maximum consecutive days',breakAfterLabel:'Break trigger',clopenLabel:'Avoid close-open shifts',peopleNeeded:'Required headcount',peopleScheduled:'Scheduled headcount'}
};
const termHelp={ahtLabel:'The average total time spent handling one customer contact.',shrinkageLabel:'Paid time when employees cannot handle work, such as breaks, meetings, training or absence.',occupancyLabel:'The highest proportion of available time the team should spend handling work.',slaLabel:'The percentage of customers answered within the chosen number of seconds.',minLiveLabel:'The rota cannot schedule fewer than this number of people while the business is open.'};
function getLanguageMode(){return localStorage.getItem('shiftpilotLanguage')||'plain'}
function applyLanguage(mode,regenerate=false){
  localStorage.setItem('shiftpilotLanguage',mode);
  document.documentElement.dataset.language=mode;
  $$('[data-term]').forEach(el=>{let key=el.dataset.term;if(terminology[mode][key])el.textContent=terminology[mode][key];if(termHelp[key]&&!el.parentElement.querySelector(`.info-tip[data-for="${key}"]`)){let tip=document.createElement('span');tip.className='info-tip';tip.dataset.for=key;tip.textContent='i';tip.title=termHelp[key];el.after(tip)}});
  $('#languageToggle').textContent=mode==='plain'?'Language: Plain English':'Language: WFM terms';
  if(regenerate&&rota.length)calculateScheduleOutputs();
}
$$('[data-language-mode]').forEach(btn=>btn.onclick=()=>{applyLanguage(btn.dataset.languageMode);$('#experienceGate').classList.add('hidden')});
$('#languageToggle').onclick=()=>applyLanguage(getLanguageMode()==='plain'?'expert':'plain',true);
applyLanguage(getLanguageMode());

renderBase();renderGallery();renderPeakRows();updatePreview();$$('.opencheck,.opentime,.closetime,.dayweight').forEach(x=>x.addEventListener('change',invalidateSchedule));['dailyVolume','interval','aht','shrinkage','occupancy','slaPercent','slaSeconds','coverageTarget'].forEach(id=>$('#'+id)?.addEventListener('change',invalidateSchedule));choose('coverage');
