var S={
  profile:{name:'',age:'',height:'',weight:'',gender:'musko'},
  schedule:[
    {day:0,active:true,time:'16:00',parts:['Grudi','Triceps']},
    {day:1,active:false,time:'09:00',parts:[]},
    {day:2,active:true,time:'16:00',parts:['Leđa','Biceps']},
    {day:3,active:false,time:'09:00',parts:[]},
    {day:4,active:true,time:'16:00',parts:['Noge','Stomak']},
    {day:5,active:true,time:'10:00',parts:['Ramena']},
    {day:6,active:false,time:'10:00',parts:[]}
  ],
  exercises:DEX.map(e=>Object.assign({},e)),
  foods:DFD.map(f=>Object.assign({},f)),
  workouts:[],
  nutrition:{},
  log:null
};

window.save=function(){try{localStorage.setItem('tpwa5',JSON.stringify(S))}catch(e){}if(typeof window.fbAutoSave==='function')window.fbAutoSave();}
window.load=function(){
  try{
    var d=localStorage.getItem('tpwa5');
    if(d){
      S=JSON.parse(d);
      if(!S.nutrition)S.nutrition={};
      if(!S.profile)S.profile={name:'',age:'',height:'',weight:''};
      if(!S.foods||!S.foods.length)S.foods=DFD.map(f=>Object.assign({},f));
      if(!S.exercises||!S.exercises.length)S.exercises=DEX.map(e=>Object.assign({},e));
      // Migracija: popuni amp/bw/met/bwFrac na postojecim vezbama koje ih nemaju (stari save pre ove izmene)
      S.exercises.forEach(function(e){
        var ref=DEX.find(function(d){return d.id===e.id});
        if(ref){
          if(e.amp===undefined&&ref.amp!==undefined)e.amp=ref.amp;
          if(e.bw===undefined&&ref.bw!==undefined)e.bw=ref.bw;
          if(e.met===undefined&&ref.met!==undefined)e.met=ref.met;
          if(e.bwFrac===undefined&&ref.bwFrac!==undefined)e.bwFrac=ref.bwFrac;
        }
      });
      // Jednokratna popravka starih custom vežbi dodatih pre uvođenja amp/bw/bwFrac polja
      // (prepoznavanje po nazivu — pokriva vežbe koje je korisnik ručno uneo kroz "Dodaj vežbu")
      S.exercises.forEach(function(e){
        if(e.amp!==undefined||e.bw!==undefined||e.met!==undefined)return; // već ima parametre, ne diraj
        var nm=(e.name||'').toLowerCase();
        if(nm.indexOf('kos')>=0&&nm.indexOf('klup')>=0){ // kosa klupa
          e.bw=true;e.amp=0.38;e.bwFrac=0.30;
        }else if(nm.indexOf('rimsk')>=0||nm.indexOf('kapetan')>=0){ // rimska / kapetanska stolica
          e.bw=true;e.amp=0.50;e.bwFrac=0.30;
        }
      });
      // Migracija: dodaj nove default vežbe iz DEX koje još ne postoje u sačuvanoj listi
      // (S.exercises se inicijalizuje iz DEX samo jednom, prvi put — ako je DEX kasnije proširen
      // novim spravama, postojeći save ih nikad ne dobija automatski bez ovog koraka)
      DEX.forEach(function(d){
        var exists=S.exercises.some(function(e){return e.id===d.id});
        if(!exists)S.exercises.push(Object.assign({},d));
      });
    }
  }catch(e){}
}
load();

var curTab='home', nutrDate='', exPart='Grudi', stab='trening', nperiod='week';
var charts={};

function today(){
  var d=new Date();
  var y=d.getFullYear();
  var m=String(d.getMonth()+1).padStart(2,'0');
  var dd=String(d.getDate()).padStart(2,'0');
  return y+'-'+m+'-'+dd;
}
function tidx(){return(new Date().getDay()+6)%7}
window.toast=function(m){var t=document.getElementById('toast');t.textContent=m;t.classList.add('show');setTimeout(function(){t.classList.remove('show')},2000);}
function el(id){return document.getElementById(id)}
function set(id,h){var e=el(id);if(e)e.innerHTML=h;}

window.go=function(tab){
  curTab=tab;
  document.querySelectorAll('.scr').forEach(function(s){s.classList.remove('on')});
  document.querySelectorAll('.ni').forEach(function(b){b.classList.remove('on')});
  el('s-'+tab).classList.add('on');
  document.querySelector('[data-t='+tab+']').classList.add('on');
  el('cnt').scrollTop=0;
  var fn={home:rHome,sched:rSched,hist:rHist,stats:rStats,nutr:rNutr,prof:rProf};
  if(fn[tab])fn[tab]();
}

function bmr(){
  var p=S.profile,w=parseFloat(p.weight)||75,h=parseFloat(p.height)||175,a=parseFloat(p.age)||30;
  return Math.round(10*w+6.25*h-5*a+5);
}
function sKcal(ex){
  // Precizna formula: mehanicki rad + metabolicki trosak odmora
  // Energia = tezina * amplituda * g / efikasnost misica
  // + bazalni trosak (disanje, srce) tokom odmora izmedju serija
  if(!ex.sets||!ex.sets.length)return 0;
  var bw=parseFloat(S.profile.weight)||75;
  var gender=S.profile.gender||'m';
  // Amplituda pokreta po vežbi (iz DEX baze); fallback 0.45m za custom vežbe bez podatka
  var amp=(typeof ex.amp==='number')?ex.amp:0.45;
  // Da li je vežba sa sopstvenom telesnom težinom (npr. plank, sklekovi, pull-up)
  var isBw=ex.bw===true;
  // Efikasnost misica ~25% (75% se gubi kao toplota)
  var eff=0.25;
  // Ekscentricna faza dodaje ~30% od koncentricne
  var eccFactor=1.3;
  var totalKcal=0;
  ex.sets.forEach(function(s){
    var load=s.w||0;
    var reps=s.r||0;
    if(isBw){
      // Bodyweight vežba: koristi se procenat telesne mase koji vežba realno pokreće
      // (npr. celo telo kod pull-up/dips ~0.65, samo noge kod rimske stolice ~0.30)
      var bwFrac=(typeof ex.bwFrac==='number')?ex.bwFrac:0.65; // fallback 0.65 za stare vežbe bez podatka
      load=bw*bwFrac+load; // +load ako korisnik doda dodatni teg (npr. weighted dips, teg medju stopalima)
    }else if(load===0){
      // Vežba sa opremom, ali korisnik nije uneo kg — ne izmišljamo opterećenje,
      // računamo samo bazalni trošak tokom serije (bez mehaničkog rada)
      load=0;
    }
    // Mehanicki rad po seriji (Joule) -> kcal
    // W = load(kg) * g(9.81) * amp(m) * reps * eccFactor
    var joules=load*9.81*amp*reps*eccFactor;
    var kcalMech=joules/(4184*eff); // 4184 J = 1 kcal
    // Bazalni trosak tokom serije i odmora (~2.5 min po seriji)
    // BMR po minuti * faktor aktivnosti
    var bmrPerMin=(10*bw+6.25*(parseFloat(S.profile.height)||175)-5*(parseFloat(S.profile.age)||30)+(gender==='m'?5:-161))/(24*60);
    var restKcal=bmrPerMin*2.5*3; // 3x BMR tokom odmora
    totalKcal+=kcalMech+restKcal;
  });
  return Math.round(totalKcal);
}
function kKcal(dur,man,met){
  if(man&&man>0)return man;
  var m=(typeof met==='number')?met:8; // fallback MET=8 za custom kardio vežbe bez podatka
  return Math.round(0.0175*m*(parseFloat(S.profile.weight)||75)*(dur||0));
}
function mTot(items){
  return items.reduce(function(a,it){
    var fd=S.foods.find(function(f){return f.id===it.fid});
    if(!fd)return a;
    var r=(fd.unit==='kom')?it.amt:it.amt/100;
    return{k:a.k+fd.k*r,p:a.p+fd.p*r,c:a.c+fd.c*r,f:a.f+fd.f*r};
  },{k:0,p:0,c:0,f:0});
}
function getDay(date){
  if(!S.nutrition[date])S.nutrition[date]={bfst:[],snk1:[],lnch:[],snk2:[],dnr:[]};
  return S.nutrition[date];
}

// ===== HOME =====
window.rHome=function(){
  var ti=tidx(),ts=S.schedule[ti],td=today();
  var done=S.workouts.filter(function(w){return w.day===ti&&w.date===td});
  var last=S.workouts.length?S.workouts[S.workouts.length-1]:null;
  var tot=S.workouts.length;
  var sets=S.workouts.reduce(function(a,w){return a+w.exercises.reduce(function(b,e){return b+(e.type==='k'?1:e.sets.length)},0)},0);
  var nm=S.profile.name?S.profile.name:'';
  var h='<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">';
  h+='<img src="'+LOGO+'" style="width:48px;height:48px;border-radius:10px;object-fit:cover;flex-shrink:0"/>';
  h+='<div><div style="font-size:22px;font-weight:700">Fitness Tracker</div>';
  if(nm)h+='<div style="font-size:13px;color:var(--tx2)">Zdravo, '+nm+'</div>';
  h+='</div></div>';
  h+='<div class="mg"><div class="met"><div class="mv" style="color:var(--accL)">'+tot+'</div><div class="ml">Ukupno treninga</div></div>';
  h+='<div class="met"><div class="mv" style="color:var(--grn)">'+sets+'</div><div class="ml">Ukupno serija</div></div></div>';
  h+='<div class="card"><div class="clbl">Danas — '+DAYS[ti]+'</div>';
  if(ts.active){
    h+='<div style="font-size:16px;font-weight:600;color:var(--accL);margin-bottom:10px">🕐 '+ts.time+'</div>';
    h+='<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px">';
    ts.parts.forEach(function(p){h+='<span class="bdg bb">'+p+'</span>'});
    h+='</div>';
    if(!done.length){
      h+='<button class="btn btp" onclick="openLog('+ti+')">+ Zapiši trening</button>';
    }else{
      h+='<div class="bdg bg" style="font-size:14px;padding:8px 14px;border-radius:10px">✓ Trening upisan danas</div>';
    }
  }else{
    h+='<div class="empty">Danas nije dan treninga 💤</div>';
  }
  h+='</div>';
  if(last){
    h+='<div class="card"><div class="clbl">Poslednji trening</div>';
    h+='<div style="display:flex;justify-content:space-between;margin-bottom:8px">';
    h+='<span style="font-weight:600">'+last.parts.join(', ')+'</span>';
    h+='<span style="font-size:12px;color:var(--tx3)">'+last.date+'</span></div>';
    h+='<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">';
    last.parts.forEach(function(p){h+='<span class="bdg ba">'+p+'</span>'});
    h+='</div>';
    last.exercises.forEach(function(ex){
      if(ex.type==='k'){
        h+='<div class="li"><span style="font-size:13px">'+ex.name+'</span><span style="font-size:13px;color:var(--tx2)">'+( ex.dur||0)+' min · 🔥'+(ex.kcal||0)+' kcal</span></div>';
      }else{
        var mw=Math.max.apply(null,ex.sets.map(function(s){return s.weight}));
        h+='<div class="li"><span style="font-size:13px">'+ex.name+'</span><span style="font-size:13px;color:var(--tx2)">'+ex.sets.length+' ser · '+(mw>0?mw+'kg':'')+'</span></div>';
      }
    });
    if(last.note)h+='<div style="margin-top:8px;font-size:13px;color:var(--tx2);font-style:italic">"'+last.note+'"</div>';
    h+='</div>';
  }
  set('s-home',h);
}

// ===== LOG MODAL =====
function openLog(dayIdx){
  var sc=S.schedule[dayIdx];
  S.log={di:dayIdx,parts:sc.parts,note:'',exercises:S.exercises.filter(function(e){return sc.parts.indexOf(e.part)>=0}).map(function(e){
    var isK=e.part==='Kardio';
    return{id:e.id,name:e.name,part:e.part,type:isK?'k':'s',sets:isK?[]:[{r:12,w:0},{r:12,w:0},{r:12,w:0},{r:12,w:0}],dur:0,kcal:0,amp:e.amp,bw:e.bw,met:e.met};
  })};
  rLog();
  el('modwrap').classList.remove('hide');
}
function closeLog(){el('modwrap').classList.add('hide');S.log=null;}

function rLog(){
  if(!S.log)return;
  var L=S.log;
  var used=L.exercises.map(function(e){return e.id});
  var avail=S.exercises.filter(function(e){return used.indexOf(e.id)<0});
  var h='<div class="mhnd"></div>';
  h+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">';
  h+='<span style="font-weight:700;font-size:17px">Beleženje treninga</span>';
  h+='<button onclick="closeLog()" style="background:none;border:none;color:var(--tx2);font-size:24px;cursor:pointer;line-height:1;width:auto;padding:0">×</button></div>';
  h+='<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px">';
  L.parts.forEach(function(p){h+='<span class="bdg bb">'+p+'</span>'});
  h+='</div>';
  if(!L.exercises.length)h+='<div class="empty">Nema vežbi. Dodaj ispod.</div>';
  L.exercises.forEach(function(ex,ei){
    var isK=ex.type==='k';
    h+='<div class="exbl"><div class="exhd">';
    h+='<div style="display:flex;align-items:center;gap:8px"><span style="font-weight:600;font-size:14px">'+ex.name+'</span>';
    h+='<span class="bdg '+(isK?'bp':'bb')+'" style="font-size:10px">'+(isK?'Kardio':'Snaga')+'</span></div>';
    h+='<div style="display:flex;gap:6px">';
    if(!isK)h+='<button onclick="addSet('+ei+')" style="background:rgba(59,130,246,.15);border:none;color:var(--accL);cursor:pointer;padding:5px 10px;border-radius:6px;font-size:12px;font-weight:600;width:auto">+Ser</button>';
    h+='<button onclick="rmEx('+ei+')" style="background:rgba(239,68,68,.15);border:none;color:var(--red);cursor:pointer;padding:5px 8px;border-radius:6px;font-size:12px;width:auto">🗑</button>';
    h+='</div></div>';
    if(isK){
      var ke=kKcal(ex.dur,ex.kcal,ex.met);
      h+='<div class="krow"><div class="kf"><div class="klbl">Trajanje (min)</div>';
      h+='<div class="nc"><button onclick="chgK('+ei+',\'dur\',-5)">−</button><span>'+(ex.dur||0)+'</span><button onclick="chgK('+ei+',\'dur\',5)">+</button></div></div>';
      h+='<div class="kf"><div class="klbl">Kalorije (kcal)</div>';
      h+='<div class="nc"><button onclick="chgK('+ei+',\'kcal\',-10)">−</button><span>'+(ex.kcal||0)+'</span><button onclick="chgK('+ei+',\'kcal\',10)">+</button></div></div></div>';
      h+='<div class="calbdg">🔥 Procenjeno: ~'+ke+' kcal</div>';
    }else{
      h+='<div class="shd"><span>#</span><span>Pon.</span><span>Kg</span><span></span></div>';
      ex.sets.forEach(function(s,si){
        h+='<div class="sr"><span style="font-size:12px;color:var(--tx3);text-align:center;font-weight:600">'+(si+1)+'</span>';
        h+='<div class="nc"><button onclick="chg('+ei+','+si+',\'r\',-1)">−</button><span>'+s.r+'</span><button onclick="chg('+ei+','+si+',\'r\',1)">+</button></div>';
        h+='<div class="nc"><button onclick="chg('+ei+','+si+',\'w\',-5)">−</button><span>'+s.w+'</span><button onclick="chg('+ei+','+si+',\'w\',5)">+</button></div>';
        h+='<button onclick="rmSet('+ei+','+si+')" style="background:none;border:none;color:var(--tx3);cursor:pointer;font-size:16px;text-align:center;width:auto;padding:0">×</button></div>';
      });
      var kc=sKcal(ex),vol=ex.sets.reduce(function(a,s){return a+s.r*s.w},0);
      var avgW=ex.sets.length?Math.round(ex.sets.reduce(function(a,s){return a+s.w},0)/ex.sets.length):0;
      var totR=ex.sets.reduce(function(a,s){return a+s.r},0);
      h+='<div class="calbdg">🔥 ~'+kc+' kcal spaljeno &nbsp;·&nbsp; '+totR+' ukupno pon. &nbsp;·&nbsp; Volumen: '+vol+' kg</div>';
    }
    h+='</div>';
  });
  if(avail.length){
    h+='<div style="background:var(--bg3);border-radius:8px;padding:12px;margin-top:8px">';
    h+='<div class="clbl" style="margin-bottom:8px">Dodaj vežbu</div>';
    h+='<div style="overflow-x:auto"><div style="display:flex;gap:6px;min-width:max-content;padding:2px">';
    avail.forEach(function(e){
      var isK=e.part==='Kardio';
      h+='<button onclick="addEx(\''+e.id+'\')" style="background:'+(isK?'rgba(168,85,247,.15)':'rgba(59,130,246,.15)')+';border:1px solid '+(isK?'rgba(168,85,247,.3)':'rgba(59,130,246,.3)')+';color:'+(isK?'var(--pur)':'var(--accL)')+';padding:5px 10px;border-radius:20px;cursor:pointer;font-size:12px;white-space:nowrap;width:auto">'+e.name+'</button>';
    });
    h+='</div></div></div>';
  }
  h+='<div style="margin-top:12px"><div class="clbl">Napomena</div>';
  h+='<textarea rows="2" placeholder="Kako je prošlo?" onchange="S.log.note=this.value" style="margin-top:6px">'+(L.note||'')+'</textarea></div>';
  h+='<button class="btn btp" style="margin-top:14px" onclick="saveLog()">✓ Sačuvaj trening</button>';
  h+='<button class="btn bts" onclick="closeLog()">Otkaži</button>';
  set('mod',h);
}
function chg(ei,si,f,d){if(!S.log)return;var s=S.log.exercises[ei].sets[si];s[f]=Math.max(0,s[f]+d);rLog();}
function chgK(ei,f,d){if(!S.log)return;S.log.exercises[ei][f]=Math.max(0,(S.log.exercises[ei][f]||0)+d);rLog();}
function addSet(ei){if(!S.log)return;S.log.exercises[ei].sets.push({r:12,w:0});rLog();}
function rmSet(ei,si){if(!S.log||S.log.exercises[ei].sets.length<2)return;S.log.exercises[ei].sets.splice(si,1);rLog();}
function rmEx(ei){if(!S.log)return;S.log.exercises.splice(ei,1);rLog();}
function addEx(id){
  if(!S.log)return;
  var e=S.exercises.find(function(x){return x.id===id});
  if(!e)return;
  var isK=e.part==='Kardio';
  S.log.exercises.push({id:e.id,name:e.name,part:e.part,type:isK?'k':'s',sets:isK?[]:[{r:12,w:0},{r:12,w:0},{r:12,w:0},{r:12,w:0}],dur:0,kcal:0,amp:e.amp,bw:e.bw,met:e.met,bwFrac:e.bwFrac});
  rLog();
}
function saveLog(){
  if(!S.log)return;
  S.workouts.push({id:'w'+Date.now(),date:today(),day:S.log.di,parts:S.log.parts,note:S.log.note,exercises:JSON.parse(JSON.stringify(S.log.exercises))});
  S.log=null;save();el('modwrap').classList.add('hide');toast('✓ Trening sačuvan!');rHome();
}

// ===== SCHEDULE =====
var _ep='Grudi';
window.rSched=function(){
  var h='<h2>Raspored</h2><div class="card">';
  S.schedule.forEach(function(s,i){
    h+='<div class="drow"><div class="dtop">';
    h+='<span style="width:34px;font-weight:600;font-size:14px">'+DAYS[i]+'</span>';
    h+='<button class="tog '+(s.active?'on':'')+'" onclick="togDay('+i+')"></button>';
    if(s.active)h+='<input type="time" value="'+s.time+'" onchange="setT('+i+',this.value)" style="width:100px;margin-left:8px"/>';
    else h+='<span style="color:var(--tx3);font-size:12px;margin-left:8px">slobodan</span>';
    h+='</div>';
    if(s.active){
      h+='<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">';
      PARTS.forEach(function(p){h+='<button class="pchip '+(s.parts.indexOf(p)>=0?'on':'')+'" onclick="togPart('+i+',\''+p+'\')">'+p+'</button>'});
      h+='</div>';
    }
    h+='</div>';
  });
  h+='</div>';
  var ad=S.schedule.map(function(s,i){return s.active?i:-1}).filter(function(i){return i>=0});
  if(ad.length){
    var bm=['MO','TU','WE','TH','FR','SA','SU'];
    var bd=ad.map(function(i){return bm[i]}).join(',');
    var fa=S.schedule.find(function(s){return s.active});
    var t=fa?fa.time.replace(':',''):'0700';
    var he=fa?String(parseInt(fa.time.split(':')[0])+1).padStart(2,'0')+fa.time.split(':')[1]:'0800';
    var n=new Date(),p2=function(n){return String(n).padStart(2,'0')};
    var ds=n.getFullYear()+''+p2(n.getMonth()+1)+''+p2(n.getDate())+'T'+t+'00';
    var de=n.getFullYear()+''+p2(n.getMonth()+1)+''+p2(n.getDate())+'T'+he+'00';
    var cu='https://calendar.google.com/calendar/render?action=TEMPLATE&text=Trening&dates='+ds+'/'+de+'&recur=RRULE:FREQ=WEEKLY;BYDAY='+bd+'&details=Trening+po+rasporedu';
    h+='<a class="callink" href="'+cu+'" target="_blank">📅 Dodaj u Google Calendar (nedeljno)</a>';
  }
  //h+='<div class="card" style="margin-top:14px"><div class="clbl">Backup podataka</div>';
  //h+='<button class="btn btg" style="margin-top:0" onclick="expData()">⬇️ Snimi podatke</button>';
  //h+='<label class="btn btb" style="margin-top:8px;cursor:pointer">⬆️ Učitaj podatke<input type="file" accept=".json" onchange="impData(event)" style="display:none"/></label>';
  //h+='<div style="font-size:11px;color:var(--tx3);line-height:1.6;margin-top:8px">Snimi sve podatke kao JSON fajl. Učitaj na drugom uređaju ili browseru.</div></div>';
  h+='<div class="card" style="margin-top:14px"><div class="clbl">Moje vežbe</div>';
  S.exercises.forEach(function(e,i){
    h+='<div class="li"><div><div style="font-size:13px;font-weight:600">'+e.name+'</div><div style="font-size:11px;color:var(--tx3)">'+e.part+'</div></div>';
    var isDefault=DEX.some(function(d){return d.id===e.id});
    if(!isDefault)h+='<button onclick="rmExList('+i+')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:20px;width:auto">×</button>';
    else h+='<span style="font-size:11px;color:var(--tx3)">default</span>';
    h+='</div>';
  });
  h+='<div style="margin-top:12px;display:flex;flex-direction:column;gap:8px">';
  h+='<input type="text" id="nei" placeholder="Naziv vežbe..."/>';
  h+='<div class="clbl" style="margin-bottom:0">Deo tela:</div>';
  h+='<div style="display:flex;flex-wrap:wrap;gap:6px" id="nep">';
  PARTS.forEach(function(p){h+='<button class="pchip" id="np-'+p+'" onclick="selEP(\''+p+'\')">'+p+'</button>'});
  h+='</div>';
  h+='<div class="clbl" style="margin-bottom:0">Tip vežbe:</div>';
  h+='<div style="display:flex;flex-wrap:wrap;gap:6px" id="net">';
  h+='<button class="pchip" id="nt-s" onclick="selET(\'s\')">Sa tegom</button>';
  h+='<button class="pchip" id="nt-bw" onclick="selET(\'bw\')">Sopstvena težina</button>';
  h+='<button class="pchip" id="nt-k" onclick="selET(\'k\')">Kardio</button>';
  h+='</div>';
  h+='<div id="nep-fields"></div>';
  h+='<button class="btn btp" style="margin-top:0" onclick="addExList()">+ Dodaj vežbu</button></div></div>';
  set('s-sched',h);
  selEP('Grudi');
  selET('s');
}
function selEP(p){_ep=p;document.querySelectorAll('#nep .pchip').forEach(function(b){b.classList.remove('on')});var e=el('np-'+p);if(e)e.classList.add('on');}

// Info tekstovi za parametre vežbi — objašnjenje korisniku čemu služe
var EXINFO={
  amp:'Amplituda pokreta (u metrima) — koliko se teg/telo realno pomeri od početnog do krajnjeg položaja vežbe. Veća amplituda = veći mehanički rad = više spaljenih kalorija. Primer: čučanj ~0.55m, biceps curl ~0.35m, plank (skoro nema pokreta) ~0.10m.',
  bwFrac:'Procenat telesne težine koji ova vežba realno pokreće. Kod vežbi gde diže celo telo (zgib, sklek) to je oko 0.60–0.70. Kod vežbi gde se pokreće samo deo tela (npr. rimska stolica gde dižeš samo noge) procenat je manji, oko 0.25–0.35. Što je veći broj, vežba "troši" više kalorija po ponavljanju.',
  met:'MET (Metabolic Equivalent of Task) — standardna mera intenziteta kardio aktivnosti. Što je veći broj, vežba je intenzivnija i troši više kalorija po minutu. Orijentir: lagano hodanje ~3, biciklizam umereno ~7.5, trčanje ~9, intenzivan sprint ~12+.'
};
function exInfo(key){alert(EXINFO[key]||'');}
function togDay(i){S.schedule[i].active=!S.schedule[i].active;save();rSched();}
function setT(i,v){S.schedule[i].time=v;save();}
function togPart(i,p){var ps=S.schedule[i].parts,ix=ps.indexOf(p);if(ix>=0)ps.splice(ix,1);else ps.push(p);save();rSched();}

var _et='s'; // tip nove custom vežbe: s=sa tegom, bw=sopstvena tezina, k=kardio
function selET(t){
  _et=t;
  document.querySelectorAll('#net .pchip').forEach(function(b){b.classList.remove('on')});
  var e=el('nt-'+t);if(e)e.classList.add('on');
  var h='';
  if(t==='s'){
    h+='<div class="clbl" style="margin-bottom:0;display:flex;align-items:center;gap:6px">Amplituda pokreta (m) <button onclick="exInfo(\'amp\')" style="width:auto;background:var(--bg3);border:1px solid var(--bg4,#333);color:var(--tx3);border-radius:50%;width:18px;height:18px;font-size:11px;line-height:1;cursor:pointer;padding:0">?</button></div>';
    h+='<input type="number" id="nei-amp" step="0.05" min="0" placeholder="npr. 0.40" value="0.40"/>';
  }else if(t==='bw'){
    h+='<div class="clbl" style="margin-bottom:0;display:flex;align-items:center;gap:6px">Amplituda pokreta (m) <button onclick="exInfo(\'amp\')" style="width:auto;background:var(--bg3);border:1px solid var(--bg4,#333);color:var(--tx3);border-radius:50%;width:18px;height:18px;font-size:11px;line-height:1;cursor:pointer;padding:0">?</button></div>';
    h+='<input type="number" id="nei-amp" step="0.05" min="0" placeholder="npr. 0.40" value="0.40"/>';
    h+='<div class="clbl" style="margin-bottom:0;display:flex;align-items:center;gap:6px">Koeficijent telesne težine <button onclick="exInfo(\'bwFrac\')" style="width:auto;background:var(--bg3);border:1px solid var(--bg4,#333);color:var(--tx3);border-radius:50%;width:18px;height:18px;font-size:11px;line-height:1;cursor:pointer;padding:0">?</button></div>';
    h+='<input type="number" id="nei-bwfrac" step="0.05" min="0" max="1" placeholder="npr. 0.65" value="0.65"/>';
  }else if(t==='k'){
    h+='<div class="clbl" style="margin-bottom:0;display:flex;align-items:center;gap:6px">MET vrednost <button onclick="exInfo(\'met\')" style="width:auto;background:var(--bg3);border:1px solid var(--bg4,#333);color:var(--tx3);border-radius:50%;width:18px;height:18px;font-size:11px;line-height:1;cursor:pointer;padding:0">?</button></div>';
    h+='<input type="number" id="nei-met" step="0.5" min="0" placeholder="npr. 8.0" value="8.0"/>';
  }
  set('nep-fields',h);
}
function addExList(){
  var n=el('nei').value.trim();if(!n)return;
  var ex={id:'c'+Date.now(),name:n,part:_ep};
  if(_et==='bw'){
    ex.bw=true;
    ex.amp=parseFloat(el('nei-amp').value)||0.40;
    ex.bwFrac=parseFloat(el('nei-bwfrac').value);
    if(isNaN(ex.bwFrac))ex.bwFrac=0.65;
  }else if(_et==='k'){
    ex.met=parseFloat(el('nei-met').value);
    if(isNaN(ex.met))ex.met=8;
  }else{
    ex.bw=false;
    ex.amp=parseFloat(el('nei-amp').value)||0.40;
  }
  S.exercises.push(ex);
  el('nei').value='';save();rSched();toast('Vežba dodana');
}
function rmExList(i){if(confirm('Obrisati "'+S.exercises[i].name+'"?')){S.exercises.splice(i,1);save();rSched();}}

// ===== HISTORY =====
window.rHist=function(){
  var h='<h2>Istorija treninga</h2>';
  if(!S.workouts.length){h+='<div class="empty">Još nema upisanih treninga.</div>';}
  else{
    S.workouts.slice().reverse().forEach(function(w){
      h+='<div class="hcard"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">';
      h+='<div><div style="font-size:12px;color:var(--tx3)">'+w.date+' — '+DAYS[w.day]+'</div>';
      h+='<div style="font-weight:600;font-size:15px">'+w.parts.join(', ')+'</div></div>';
      h+='<button onclick="delW(\''+w.id+'\')" style="background:rgba(239,68,68,.15);border:none;color:var(--red);cursor:pointer;padding:5px 10px;border-radius:8px;font-size:12px;font-weight:600;width:auto;flex-shrink:0;margin-left:8px">🗑 Obriši</button></div>';
      h+='<div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px">';
      w.parts.forEach(function(p){h+='<span class="bdg ba">'+p+'</span>'});
      h+='</div>';
      w.exercises.forEach(function(ex){
        if(ex.type==='k'){
          var kc=ex.kcal||kKcal(ex.dur||0,0,ex.met);
          h+='<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;margin-bottom:3px"><span style="font-weight:600;font-size:13px">'+ex.name+'</span><span class="bdg bp" style="font-size:10px">Kardio</span></div>';
          h+='<div style="font-size:12px;color:var(--tx2)">⏱ '+(ex.dur||0)+' min · 🔥 '+kc+' kcal</div></div>';
        }else{
          var mw=Math.max.apply(null,ex.sets.map(function(s){return s.w}));
          var kc2=sKcal(ex);
          h+='<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-weight:600;font-size:13px">'+ex.name+'</span>';
          h+='<span style="font-size:12px;color:var(--tx2)">'+ex.sets.length+' ser · '+(mw>0?mw+'kg':'')+' · 🔥'+kc2+'kcal</span></div><div>';
          ex.sets.forEach(function(s,si){h+='<span class="spill">'+(si+1)+': '+s.r+'×'+s.w+'kg</span>'});
          h+='</div></div>';
        }
      });
      // Ukupno kalorije za ceo trening
      var totalKcal=w.exercises.reduce(function(a,ex){
        if(ex.type==='k'){return a+kKcal(ex.dur||0,ex.kcal||0,ex.met);}
        return a+sKcal(ex);
      },0);
      h+='<div style="margin-top:10px;padding:10px 12px;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.25);border-radius:8px;display:flex;justify-content:space-between;align-items:center">';
      h+='<span style="font-size:13px;font-weight:600;color:var(--amb)">🔥 Ukupno spaljeno</span>';
      h+='<span style="font-size:16px;font-weight:700;color:var(--amb)">'+totalKcal+' kcal</span>';
      h+='</div>';
      if(w.note)h+='<div style="font-size:13px;color:var(--tx2);font-style:italic;margin-top:8px">"'+w.note+'"</div>';
      h+='</div>';
    });
  }
  set('s-hist',h);
}
function delW(id){if(!confirm('Obrisati ovaj trening?'))return;S.workouts=S.workouts.filter(function(w){return w.id!==id});save();rHist();toast('Trening obrisan');}

// ===== STATS =====
window.rStats=function(){
  var h='<h2>Statistika</h2>';
  h+='<div style="display:flex;gap:8px;margin-bottom:16px">';
  h+='<button class="btn '+(stab==='trening'?'btp':'bts')+'" style="margin-top:0;flex:1;padding:10px" onclick="setStab(\'trening\')">🏋️ Trening</button>';
  h+='<button class="btn '+(stab==='ishrana'?'btp':'bts')+'" style="margin-top:0;flex:1;padding:10px" onclick="setStab(\'ishrana\')">🥗 Ishrana</button>';
  h+='</div><div id="sbody"></div>';
  set('s-stats',h);
  rStabBody();
}
function setStab(t){stab=t;rStats();}
function rStabBody(){if(stab==='trening')rTStats();else rNStats();}

function rTStats(){
  var tw=S.workouts.length;
  var ts=S.workouts.reduce(function(a,w){return a+w.exercises.reduce(function(b,e){return b+(e.type==='k'?1:e.sets.length)},0)},0);
  var tv=S.workouts.reduce(function(a,w){return a+w.exercises.filter(function(e){return e.type!=='k'}).reduce(function(b,e){return b+e.sets.reduce(function(c,s){return c+s.r*s.w},0)},0)},0);
  var tk=S.workouts.reduce(function(a,w){return a+w.exercises.reduce(function(b,e){return b+(e.type==='k'?kKcal(e.dur||0,e.kcal||0,e.met):sKcal(e))},0)},0);
  var ad=S.schedule.filter(function(s){return s.active}).length;
  var h='<div class="mg">';
  h+='<div class="met"><div class="mv" style="color:var(--accL)">'+tw+'</div><div class="ml">Treninzi</div></div>';
  h+='<div class="met"><div class="mv" style="color:var(--grn)">'+ts+'</div><div class="ml">Serije</div></div>';
  h+='<div class="met"><div class="mv" style="font-size:20px">'+(tv/1000).toFixed(1)+'t</div><div class="ml">Volumen</div></div>';
  h+='<div class="met"><div class="mv" style="color:var(--amb)">'+(tk/1000).toFixed(1)+'k</div><div class="ml">Kcal spaljeno</div></div>';
  h+='</div>';
  var pc={};S.workouts.forEach(function(w){w.parts.forEach(function(p){pc[p]=(pc[p]||0)+1})});
  var mc=Math.max.apply(null,[1].concat(Object.values(pc)));
  if(Object.keys(pc).length){
    h+='<div class="card"><div class="clbl">Po delovima tela</div>';
    Object.entries(pc).sort(function(a,b){return b[1]-a[1]}).forEach(function(e){
      h+='<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:13px"><span>'+e[0]+'</span><span style="color:var(--tx2)">'+e[1]+'×</span></div>';
      h+='<div class="pbar"><div class="pfill" style="width:'+Math.round(e[1]/mc*100)+'%"></div></div></div>';
    });
    h+='</div>';
  }
  var calData=S.workouts.slice(-10).map(function(w){return{lbl:w.date.slice(5),v:w.exercises.reduce(function(a,e){return a+(e.type==='k'?kKcal(e.dur||0,e.kcal||0,e.met):sKcal(e))},0)}});
  h+='<div class="card"><div class="clbl">Kalorije po treningu (poslednjih 10)</div><div class="cwrap"><canvas id="kcC"></canvas></div></div>';
  var allEx=[...new Set(S.workouts.flatMap(function(w){return w.exercises.filter(function(e){return e.type!=='k'}).map(function(e){return e.name})}))];
  if(allEx.length){
    h+='<div class="card"><div class="clbl">Progres težina</div><select id="exSel" onchange="updPC()" style="margin-bottom:10px">';
    allEx.forEach(function(n){h+='<option value="'+n+'">'+n+'</option>'});
    h+='</select><div class="cwrap"><canvas id="pC"></canvas></div></div>';
  }
  h+='<div class="card"><div class="clbl">Volumen po nedelji (8 ned.)</div><div class="cwrap"><canvas id="wC"></canvas></div></div>';
  set('sbody',h);
  setTimeout(function(){
    mkKcalC(calData);updPC();mkWC();
  },60);
}

function mkKcalC(data){
  var ctx=el('kcC');if(!ctx)return;
  if(charts.kc)charts.kc.destroy();
  charts.kc=new Chart(ctx,{type:'bar',data:{labels:data.map(function(d){return d.lbl}),datasets:[{data:data.map(function(d){return d.v}),backgroundColor:'rgba(245,158,11,.5)',borderColor:'#f59e0b',borderWidth:1,borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#64748b',font:{size:10}},grid:{color:'rgba(255,255,255,.05)'}},y:{ticks:{color:'#64748b',font:{size:10},callback:function(v){return v+' kcal'}},grid:{color:'rgba(255,255,255,.05)'}}}}});
}
function updPC(){
  var nm=el('exSel');if(!nm)return;nm=nm.value;
  var pts=[];S.workouts.forEach(function(w){w.exercises.filter(function(e){return e.name===nm&&e.type!=='k'}).forEach(function(e){pts.push({lbl:w.date.slice(5),v:Math.max.apply(null,e.sets.map(function(s){return s.w}))})})});
  pts.sort(function(a,b){return a.lbl.localeCompare(b.lbl)});
  var ctx=el('pC');if(!ctx)return;
  if(charts.pc)charts.pc.destroy();
  charts.pc=new Chart(ctx,{type:'line',data:{labels:pts.map(function(p){return p.lbl}),datasets:[{data:pts.map(function(p){return p.v}),borderColor:'#3b82f6',backgroundColor:'rgba(59,130,246,.1)',tension:.3,fill:true,pointRadius:5,pointBackgroundColor:'#3b82f6'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#64748b',font:{size:10}},grid:{color:'rgba(255,255,255,.05)'}},y:{ticks:{color:'#64748b',font:{size:10},callback:function(v){return v+'kg'}},grid:{color:'rgba(255,255,255,.05)'}}}}});
}
function mkWC(){
  var now=new Date(),weeks=[];
  for(var i=7;i>=0;i--){
    var ref=new Date(now);ref.setDate(ref.getDate()-i*7);
    var dow=ref.getDay(),st=new Date(ref);st.setDate(ref.getDate()-(dow===0?6:dow-1));st.setHours(0,0,0,0);
    var en=new Date(st);en.setDate(st.getDate()+6);en.setHours(23,59,59,999);
    var vol=S.workouts.filter(function(w){var d=new Date(w.date);return d>=st&&d<=en}).reduce(function(a,w){return a+w.exercises.filter(function(e){return e.type!=='k'}).reduce(function(b,e){return b+e.sets.reduce(function(c,s){return c+s.r*s.w},0)},0)},0);
    weeks.push({lbl:st.getDate()+'.'+(st.getMonth()+1),vol:vol});
  }
  var ctx=el('wC');if(!ctx)return;
  if(charts.wc)charts.wc.destroy();
  charts.wc=new Chart(ctx,{type:'bar',data:{labels:weeks.map(function(w){return w.lbl}),datasets:[{data:weeks.map(function(w){return w.vol}),backgroundColor:'rgba(59,130,246,.5)',borderColor:'#3b82f6',borderWidth:1,borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#64748b',font:{size:10},maxRotation:45},grid:{color:'rgba(255,255,255,.05)'}},y:{ticks:{color:'#64748b',font:{size:10},callback:function(v){return v+'kg'}},grid:{color:'rgba(255,255,255,.05)'}}}}});
}

function rNStats(){
  var dates=Object.keys(S.nutrition||{}).sort();
  if(!dates.length){set('sbody','<div class="empty">Nema podataka o ishrani.<br>Unesi obroke u tabu Ishrana.</div>');return;}
  var daily=dates.map(function(d){var dy=S.nutrition[d],all=Object.values(dy).reduce(function(a,b){return a.concat(b)},[]);var t=mTot(all);return{date:d,k:t.k,p:t.p,c:t.c,f:t.f}});
  var now=new Date(),days=nperiod==='week'?7:nperiod==='month'?30:90;
  var cut=new Date(now);cut.setDate(cut.getDate()-days+1);cut.setHours(0,0,0,0);
  var fil=daily.filter(function(d){return new Date(d.date+'T12:00:00')>=cut});
  var h='<div style="display:flex;gap:6px;margin-bottom:14px">';
  ['week','month','quarter'].forEach(function(p,i){
    var lbl=['7 dana','30 dana','90 dana'][i];
    h+='<button class="btn '+(nperiod===p?'btp':'bts')+'" style="margin-top:0;flex:1;padding:9px;font-size:13px" onclick="setNP(\''+p+'\')">'+lbl+'</button>';
  });
  h+='</div>';
  if(!fil.length){h+='<div class="empty">Nema podataka za izabrani period.</div>';set('sbody',h);return;}
  var avg={k:fil.reduce(function(a,d){return a+d.k},0)/fil.length,p:fil.reduce(function(a,d){return a+d.p},0)/fil.length,c:fil.reduce(function(a,d){return a+d.c},0)/fil.length,f:fil.reduce(function(a,d){return a+d.f},0)/fil.length};
  h+='<div class="card"><div class="clbl">Prosek dnevnog unosa ('+fil.length+' dana)</div>';
  h+='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">';
  h+='<div class="met" style="padding:10px"><div class="mv" style="font-size:18px;color:var(--amb)">'+Math.round(avg.k)+'</div><div class="ml">kcal</div></div>';
  h+='<div class="met" style="padding:10px"><div class="mv" style="font-size:18px;color:var(--accL)">'+avg.p.toFixed(0)+'g</div><div class="ml">Proteini</div></div>';
  h+='<div class="met" style="padding:10px"><div class="mv" style="font-size:18px;color:var(--grn)">'+avg.c.toFixed(0)+'g</div><div class="ml">UH</div></div>';
  h+='<div class="met" style="padding:10px"><div class="mv" style="font-size:18px;color:var(--red)">'+avg.f.toFixed(0)+'g</div><div class="ml">Masti</div></div>';
  h+='</div></div>';
  var tg=avg.p+avg.c+avg.f;
  if(tg>0){
    h+='<div class="card"><div class="clbl">Raspodela makronutrijenata</div>';
    [{lbl:'Proteini',v:avg.p,cl:'var(--accL)'},{lbl:'Ugljeni hidrati',v:avg.c,cl:'var(--grn)'},{lbl:'Masti',v:avg.f,cl:'var(--red)'}].forEach(function(m){
      var pct=Math.round(m.v/tg*100);
      h+='<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:13px"><span>'+m.lbl+'</span><span style="color:'+m.cl+';font-weight:600">'+m.v.toFixed(1)+'g · '+pct+'%</span></div>';
      h+='<div class="pbar"><div style="height:100%;border-radius:3px;background:'+m.cl+';width:'+pct+'%"></div></div></div>';
    });
    h+='</div>';
  }
  var cd=[];
  if(nperiod==='week'){
    cd=fil.map(function(d){return{lbl:d.date.slice(5),k:Math.round(d.k),p:Math.round(d.p),c:Math.round(d.c),f:Math.round(d.f)}});
  }else{
    var wm={};
    fil.forEach(function(d){
      var dt=new Date(d.date+'T12:00:00'),dow=dt.getDay(),st=new Date(dt);
      st.setDate(dt.getDate()-(dow===0?6:dow-1));
      var key=st.getDate()+'.'+(st.getMonth()+1);
      if(!wm[key])wm[key]={lbl:key,k:0,p:0,c:0,f:0,n:0};
      wm[key].k+=d.k;wm[key].p+=d.p;wm[key].c+=d.c;wm[key].f+=d.f;wm[key].n++;
    });
    cd=Object.values(wm).map(function(w){return{lbl:w.lbl,k:Math.round(w.k/w.n),p:Math.round(w.p/w.n),c:Math.round(w.c/w.n),f:Math.round(w.f/w.n)}});
  }
  h+='<div class="card"><div class="clbl">Kalorije po '+(nperiod==='week'?'danu':'nedelji')+'</div><div class="cwrap"><canvas id="nkC"></canvas></div></div>';
  h+='<div class="card"><div class="clbl">Makronutrijenti po '+(nperiod==='week'?'danu':'nedelji')+' (g)</div><div class="cwrap" style="height:200px"><canvas id="nmC"></canvas></div></div>';
  set('sbody',h);
  setTimeout(function(){mkNKC(cd);mkNMC(cd)},60);
}
function setNP(p){nperiod=p;rNStats();}
function mkNKC(d){
  var ctx=el('nkC');if(!ctx)return;
  if(charts.nk)charts.nk.destroy();
  charts.nk=new Chart(ctx,{type:'bar',data:{labels:d.map(function(x){return x.lbl}),datasets:[{data:d.map(function(x){return x.k}),backgroundColor:'rgba(245,158,11,.5)',borderColor:'#f59e0b',borderWidth:1,borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#64748b',font:{size:10},maxRotation:45},grid:{color:'rgba(255,255,255,.05)'}},y:{ticks:{color:'#64748b',font:{size:10},callback:function(v){return v+' kcal'}},grid:{color:'rgba(255,255,255,.05)'}}}}});
}
function mkNMC(d){
  var ctx=el('nmC');if(!ctx)return;
  if(charts.nm)charts.nm.destroy();
  charts.nm=new Chart(ctx,{type:'bar',data:{labels:d.map(function(x){return x.lbl}),datasets:[
    {label:'Proteini',data:d.map(function(x){return x.p}),backgroundColor:'rgba(147,197,253,.7)',borderColor:'#93c5fd',borderWidth:1,borderRadius:2},
    {label:'UH',data:d.map(function(x){return x.c}),backgroundColor:'rgba(34,197,94,.5)',borderColor:'#22c55e',borderWidth:1,borderRadius:2},
    {label:'Masti',data:d.map(function(x){return x.f}),backgroundColor:'rgba(239,68,68,.5)',borderColor:'#ef4444',borderWidth:1,borderRadius:2}
  ]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:'#94a3b8',font:{size:11},boxWidth:12,padding:8}}},scales:{x:{ticks:{color:'#64748b',font:{size:10},maxRotation:45},grid:{color:'rgba(255,255,255,.05)'}},y:{beginAtZero:true,ticks:{color:'#64748b',font:{size:10},callback:function(v){return v+'g'}},grid:{color:'rgba(255,255,255,.05)'}}}}});
}

// ===== NUTRITION =====
window.rNutr=function(){
  if(!nutrDate)nutrDate=today();
  var dy=getDay(nutrDate);
  var dt=new Date(nutrDate+'T12:00:00');
  var dlbl=dt.toLocaleDateString('sr-Latn',{weekday:'long',day:'numeric',month:'long'});
  var all=Object.values(dy).reduce(function(a,b){return a.concat(b)},[]);
  var tot=mTot(all);
  var h='<h2>Ishrana</h2>';
  h+='<div class="dnav"><button onclick="chND(-1)">◀</button>';
  h+='<div style="text-align:center"><div style="font-size:14px;font-weight:600">'+dlbl+'</div>';
  if(nutrDate===today())h+='<div style="font-size:11px;color:var(--grn)">Danas</div>';
  h+='</div><button onclick="chND(1)">▶</button></div>';
  h+='<div class="card" style="margin-bottom:14px"><div class="clbl">Ukupno danas</div>';
  h+='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">';
  h+='<div class="met" style="padding:10px"><div class="mv" style="font-size:18px;color:var(--amb)">'+Math.round(tot.k)+'</div><div class="ml">kcal</div></div>';
  h+='<div class="met" style="padding:10px"><div class="mv" style="font-size:18px;color:var(--accL)">'+tot.p.toFixed(1)+'g</div><div class="ml">Proteini</div></div>';
  h+='<div class="met" style="padding:10px"><div class="mv" style="font-size:18px;color:var(--grn)">'+tot.c.toFixed(1)+'g</div><div class="ml">UH</div></div>';
  h+='<div class="met" style="padding:10px"><div class="mv" style="font-size:18px;color:var(--red)">'+tot.f.toFixed(1)+'g</div><div class="ml">Masti</div></div>';
  h+='</div></div>';
  MEALS.forEach(function(m){
    var items=dy[m.id]||[];
    var mt=mTot(items);
    h+='<div class="mcard"><div style="font-size:15px;font-weight:600;margin-bottom:10px">'+m.ico+' '+m.lbl+'</div>';
    items.forEach(function(it,ii){
      var fd=S.foods.find(function(f){return f.id===it.fid});
      if(!fd)return;
      var r=(fd.unit==='kom')?it.amt:it.amt/100;
      h+='<div class="frow"><div><div style="font-size:13px;font-weight:500">'+fd.name+'</div>';
      h+='<div style="font-size:11px;color:var(--tx3)">'+it.amt+fd.unit+' · P:'+(fd.p*r).toFixed(1)+'g · UH:'+(fd.c*r).toFixed(1)+'g · M:'+(fd.f*r).toFixed(1)+'g · '+Math.round(fd.k*r)+'kcal</div></div>';
      h+='<button onclick="rmFI(\''+nutrDate+'\',\''+m.id+'\','+ii+')" style="background:none;border:none;color:var(--tx3);cursor:pointer;font-size:20px;padding:0;width:auto">×</button></div>';
    });
    if(!items.length)h+='<div style="font-size:13px;color:var(--tx3);padding:6px 0">Nema unetih namirnica</div>';
    if(items.length){
      h+='<div class="mtot">';
      h+='<span style="font-size:12px">🔥 <span style="font-weight:700;color:var(--accL)">'+Math.round(mt.k)+'</span> kcal</span>';
      h+='<span style="font-size:12px">P: <span style="font-weight:700;color:var(--accL)">'+mt.p.toFixed(1)+'g</span></span>';
      h+='<span style="font-size:12px">UH: <span style="font-weight:700;color:var(--accL)">'+mt.c.toFixed(1)+'g</span></span>';
      h+='<span style="font-size:12px">M: <span style="font-weight:700;color:var(--accL)">'+mt.f.toFixed(1)+'g</span></span>';
      h+='</div>';
    }
    h+='<div class="fabox"><div class="farow"><select id="fs-'+m.id+'">';
    S.foods.forEach(function(f){h+='<option value="'+f.id+'">'+f.name+' ('+f.unit+')</option>'});
    h+='</select><input type="number" id="fa-'+m.id+'" value="100" min="1" style="width:70px;text-align:center"/>';
    h+='<button onclick="addFI(\''+nutrDate+'\',\''+m.id+'\')">+</button></div></div>';
    h+='</div>';
  });
  h+='<div class="card" style="margin-top:4px"><div class="clbl">Dodaj novu namirnicu u bazu</div>';
  h+='<input type="text" id="nfn" placeholder="Naziv namirnice..." style="margin-bottom:8px"/>';
  h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">';
  h+='<input type="number" id="nfp" placeholder="Proteini g/100" min="0"/>';
  h+='<input type="number" id="nfc" placeholder="UH g/100" min="0"/>';
  h+='<input type="number" id="nff" placeholder="Masti g/100" min="0"/>';
  h+='<input type="number" id="nfk" placeholder="kcal/100" min="0"/>';
  h+='</div><select id="nfu" style="margin-bottom:10px"><option value="g">Grami (g)</option><option value="ml">Mililitri (ml)</option><option value="kom">Komad (kom)</option></select>';
  h+='<button class="btn btp" style="margin-top:0" onclick="addNF()">+ Dodaj namirnicu</button></div>';
  set('s-nutr',h);
}
function chND(d){var dt=new Date(nutrDate+'T12:00:00');dt.setDate(dt.getDate()+d);nutrDate=dt.toISOString().split('T')[0];rNutr();}
function addFI(date,mid){
  var s=el('fs-'+mid),a=el('fa-'+mid);if(!s||!a)return;
  getDay(date)[mid].push({fid:s.value,amt:parseFloat(a.value)||100});
  save();rNutr();
}
function rmFI(date,mid,idx){getDay(date)[mid].splice(idx,1);save();rNutr();}
function addNF(){
  var n=el('nfn').value.trim();if(!n){alert('Unesi naziv!');return;}
  var p=parseFloat(el('nfp').value)||0,c=parseFloat(el('nfc').value)||0,f=parseFloat(el('nff').value)||0,k=parseFloat(el('nfk').value)||(p*4+c*4+f*9);
  S.foods.push({id:'nf'+Date.now(),name:n,unit:el('nfu').value,p:p,c:c,f:f,k:Math.round(k)});
  save();toast('Namirnica dodana!');rNutr();
}

// ===== PROFILE =====
window.rProf=function(){
  var p=S.profile,w=parseFloat(p.weight),h2=parseFloat(p.height),a=parseFloat(p.age);
  var bmi=(w&&h2)?w/Math.pow(h2/100,2):null;
  var br=bmr();
  var blbl='',bcl='var(--tx)';
  if(bmi){
    if(bmi<18.5){blbl='Pothranjenost';bcl='var(--accL)'}
    else if(bmi<25){blbl='Normalna težina ✓';bcl='var(--grn)'}
    else if(bmi<30){blbl='Prekomerna težina';bcl='var(--amb)'}
    else{blbl='Gojaznost';bcl='var(--red)'}
  }
  var h='<h2>Profil</h2><div class="card"><div class="clbl">Osnovni podaci o korisniku</div>';
  h+='<div style="margin-bottom:14px"><label style="font-size:12px;font-weight:600;color:var(--tx2);margin-bottom:6px;display:block">Ime</label><input type="text" value="'+(p.name||'')+'" onchange="upP(\'name\',this.value)" placeholder="Tvoje ime..."/></div>';
  h+='<div style="margin-bottom:14px"><label style="font-size:12px;font-weight:600;color:var(--tx2);margin-bottom:6px;display:block">Godine</label><input type="number" value="'+(p.age||'')+'" onchange="upP(\'age\',this.value)" placeholder="npr. 30" min="10" max="99"/></div>';
  h+='<div style="margin-bottom:14px"><label style="font-size:12px;font-weight:600;color:var(--tx2);margin-bottom:6px;display:block">Visina (cm)</label><input type="number" value="'+(p.height||'')+'" onchange="upP(\'height\',this.value)" placeholder="npr. 178" min="100" max="250"/></div>';
  h+='<div style="margin-bottom:14px"><label style="font-size:12px;font-weight:600;color:var(--tx2);margin-bottom:6px;display:block">Težina (kg)</label><input type="number" value="'+(p.weight||'')+'" onchange="upP(\'weight\',this.value)" placeholder="npr. 80" min="30" max="300"/></div>';
  h+='<div><label style="font-size:12px;font-weight:600;color:var(--tx2);margin-bottom:6px;display:block">Pol korisnika</label><select onchange="upP(\'gender\',this.value)"><option value="musko" '+((p.gender||'musko')==='musko'?'selected':'')+'>Muško</option><option value="zensko" '+((p.gender||'musko')==='zensko'?'selected':'')+'>Žensko</option></select></div>';
  h+='</div>';
  if(bmi){
    h+='<div class="pbmi"><div style="font-size:42px;font-weight:700;color:'+bcl+';margin-bottom:6px">'+bmi.toFixed(1)+'</div><div style="font-size:14px;color:var(--tx2)">BMI — '+blbl+'</div></div>';
    h+='<div class="card"><div class="clbl">Procena dnevnih kalorijskih potreba</div>';
    [{lbl:'Bazalni metabolizam (BMR)',v:br},{lbl:'Sedentaran (×1.2)',v:Math.round(br*1.2)},{lbl:'Malo aktivan (×1.375)',v:Math.round(br*1.375)},{lbl:'Umeren (×1.55)',v:Math.round(br*1.55)},{lbl:'Aktivan (×1.725)',v:Math.round(br*1.725)}].forEach(function(r,i){
      h+='<div class="li"><span style="font-size:13px">'+r.lbl+'</span><span style="font-weight:'+(i===0?'700':'600')+';color:'+(i===0?'var(--amb)':'var(--tx2)')+'">'+r.v+' kcal</span></div>';
    });
    h+='</div>';
  }else{
    h+='<div class="empty">Unesi godine, visinu i težinu<br>da vidiš BMI i procenu kalorija.</div>';
  }
  h+='<div class="card" style="margin-top:14px"><div class="clbl">Backup podataka</div>';
  h+='<button class="btn btg" style="margin-top:0" onclick="expData()">⬇️ Snimi podatke (lokalno)</button>';
  h+='<label class="btn btb" style="margin-top:8px;cursor:pointer">⬆️ Učitaj podatke (lokalno)<input type="file" accept=".json" onchange="impData(event)" style="display:none"/></label>';
  h+='<div style="font-size:11px;color:var(--tx3);line-height:1.6;margin-top:8px;margin-bottom:14px">Snimi sve podatke kao JSON fajl. Učitaj na drugom uređaju ili browseru.</div>';
  h+='<div style="height:1px;background:var(--br);margin-bottom:14px"></div>';
  if(window.fbUser){
    h+='<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;padding:10px;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.25);border-radius:8px">';
    h+='<img src="'+(window.fbUser.photoURL||'')+'" style="width:32px;height:32px;border-radius:50%;flex-shrink:0" onerror="this.style.display=\'none\'">';
    h+='<div><div style="font-size:13px;font-weight:600;color:var(--grn)">Prijavljen</div>';
    h+='<div style="font-size:12px;color:var(--tx2)">'+(window.fbUser.displayName||window.fbUser.email)+'</div></div></div>';
    h+='<button class="btn" style="margin-top:0;background:rgba(59,130,246,.15);color:var(--accL);border:1px solid rgba(59,130,246,.3)" onclick="fbSave()">☁️ Snimi u cloud</button>';
    h+='<button class="btn" style="margin-top:8px;background:rgba(168,85,247,.15);color:#c084fc;border:1px solid rgba(168,85,247,.3)" onclick="fbLoad()">☁️ Učitaj iz clouda</button>';
    h+='<button class="btn bts" style="margin-top:8px" onclick="fbLogout()">Odjavi se</button>';
  }else{
    h+='<button class="btn" style="margin-top:0;background:#fff;color:#3c4043;border:1px solid #dadce0;font-weight:600" onclick="fbLogin()"><svg width="18" height="18" viewBox="0 0 48 48" style="flex-shrink:0"><path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.7 33.9 29.8 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"/><path fill="#34A853" d="M6.3 14.7l7 5.1C15 16.1 19.1 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 16.3 2 9.7 6.4 6.3 14.7z"/><path fill="#FBBC05" d="M24 46c5.5 0 10.5-1.9 14.3-5l-6.6-5.4C29.8 37 27 38 24 38c-5.7 0-10.6-3.1-11.7-8.4l-7 5.4C9.5 42 16.3 46 24 46z"/><path fill="#EA4335" d="M44.5 20H24v8.5h11.8c-1 3.1-3.4 5.7-6.5 7.1l6.6 5.4C41.5 37.5 45 31.3 45 24c0-1.3-.2-2.7-.5-4z"/></svg> Prijavi se Google nalogom</button>';
    h+='<div style="font-size:11px;color:var(--tx3);line-height:1.6;margin-top:8px">Prijavi se da bi sinhronizovao podatke između uređaja.</div>';
  }
  h+='</div>';
  
  h+='<div class="card" style="margin-top:14px"><div class="clbl">O aplikaciji</div>';
  h+='<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">';
  h+='<div style="width:40px;height:40px;border-radius:50%;background:rgba(59,130,246,.15);display:flex;align-items:center;justify-content:center;font-weight:600;font-size:13px;color:var(--accL);flex-shrink:0">IĐ</div>';
  h+='<div><div style="font-weight:600;font-size:14px;color:var(--tx)">Ilija Đinović, d.i.e.</div>';
  h+='<div style="font-size:12px;color:var(--tx2)">Osmislio i implementirao</div></div></div>';
  h+='<div style="border-top:1px solid var(--br);padding-top:12px;display:flex;flex-direction:column;gap:8px">';
  h+='<div style="display:flex;align-items:center;gap:8px"><img src="'+LOGO+'" style="width:16px;height:16px;object-fit:contain;flex-shrink:0"><span style="font-size:13px;color:var(--tx2)">Fitness Tracker v1.0</span></div>';
  h+='<div style="display:flex;align-items:center;gap:8px"><span style="font-size:13px;color:var(--tx3)">🏢</span><span style="font-size:13px;color:var(--tx2)">Biro za veštačenja</span></div>';
  h+='<div style="display:flex;align-items:center;gap:8px"><span style="font-size:13px;color:var(--tx3)">✉</span><a href="mailto:info@bzv.rs" style="font-size:13px;color:var(--tx2);text-decoration:none">info@bzv.rs</a></div>';
  h+='<div style="display:flex;align-items:center;gap:8px"><span style="font-size:13px;color:var(--tx3)">🌐</span><a href="https://www.bzv.rs" target="_blank" style="font-size:13px;color:var(--accL);text-decoration:none">www.bzv.rs</a></div>';
  h+='<div style="display:flex;align-items:center;gap:8px"><span style="font-size:13px;color:var(--tx3)">📞</span><a href="tel:+38162303303" style="font-size:13px;color:var(--tx2);text-decoration:none">+381(0)62303303</a></div>';
  h+='</div></div>';

  h+='<div class="card" style="margin-top:14px"><div class="clbl">Izveštaji</div>';
  h+='<button class="btn btp" style="margin-top:0" onclick="openPdfModal()">📄 Generiši PDF izveštaj</button>';
  h+='<div style="font-size:11px;color:var(--tx3);margin-top:8px;line-height:1.6">Odaberi period i tabove — generiše se PDF za čuvanje ili štampanje.</div>';
  h+='</div>';

  set('s-prof',h);
}
function upP(f,v){S.profile[f]=v;save();}

// ===== BACKUP =====
function expData(){
  var b=new Blob([JSON.stringify({v:5,at:new Date().toISOString(),data:S},null,2)],{type:'application/json'});
  var u=URL.createObjectURL(b),a=document.createElement('a');
  a.href=u;a.download='trening-backup-'+today()+'.json';
  document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(u);
  toast('✓ Podaci snimljeni!');
}
function impData(ev){
  var file=ev.target.files[0];if(!file)return;
  var r=new FileReader();
  r.onload=function(e){
    try{
      var pl=JSON.parse(e.target.result),imp=pl.data||pl;
      if(!imp.schedule||!imp.exercises||!imp.workouts){alert('Fajl nije validan backup!');return;}
      if(!confirm('Učitati podatke?\n\n• '+imp.workouts.length+' treninga\n• '+imp.exercises.length+' vežbi')){ev.target.value='';return;}
      S=imp;
      if(!S.nutrition)S.nutrition={};
      if(!S.profile)S.profile={name:'',age:'',height:'',weight:''};
      if(!S.foods||!S.foods.length)S.foods=DFD.map(function(f){return Object.assign({},f)});
      save();go(curTab);toast('✓ Podaci učitani!');
    }catch(err){alert('Greška pri učitavanju.');}
    ev.target.value='';
  };
  r.readAsText(file);
}

// ===== PDF REPORT =====
var _rPeriod=7;
var _rTabs={sched:false,hist:true,stats:true,nutr:false};

function openPdfModal(){
  // sync checkboxes with current state each time modal opens
  Object.keys(_rTabs).forEach(function(t){
    var el2=el('rtab-'+t);
    if(!el2)return;
    if(_rTabs[t]){el2.classList.add('sel');}else{el2.classList.remove('sel');}
  });
  el('rmodwrap').classList.remove('hide');
}
function closeRModal(){el('rmodwrap').classList.add('hide');}
function selPeriod(btn){
  _rPeriod=btn.dataset.p==='all'?'all':parseInt(btn.dataset.p);
  document.querySelectorAll('.period-btn').forEach(function(b){b.classList.remove('on')});
  btn.classList.add('on');
}
function togRTab(t){
  _rTabs[t]=!_rTabs[t];
  var el2=el('rtab-'+t);
  if(_rTabs[t]){el2.classList.add('sel');}else{el2.classList.remove('sel');}
}

function rFilteredWorkouts(){
  if(_rPeriod==='all')return S.workouts.slice();
  var cut=new Date();cut.setDate(cut.getDate()-_rPeriod+1);cut.setHours(0,0,0,0);
  return S.workouts.filter(function(w){return new Date(w.date+'T00:00:00')>=cut});
}
function rFilteredNutrDates(){
  var dates=Object.keys(S.nutrition||{}).sort();
  if(_rPeriod==='all')return dates;
  var cut=new Date();cut.setDate(cut.getDate()-_rPeriod+1);cut.setHours(0,0,0,0);
  return dates.filter(function(d){return new Date(d+'T12:00:00')>=cut});
}
function rPeriodLabel(){
  if(_rPeriod==='all')return 'ceo period';
  return 'poslednjih '+_rPeriod+' dana';
}

function genSchedSection(){
  var h='<h2>📅 Raspored treninga</h2>';
  h+='<table><tr><th>Dan</th><th>Status</th><th>Vreme</th><th>Delovi tela</th></tr>';
  S.schedule.forEach(function(s,i){
    h+='<tr><td>'+DAYS[i]+'</td>';
    h+='<td>'+(s.active?'<span class="pdf-badge" style="background:#d1fae5;color:#065f46">Aktivan</span>':'<span class="pdf-badge" style="background:#f1f5f9;color:#64748b">Slobodan</span>')+'</td>';
    h+='<td>'+(s.active?s.time:'-')+'</td>';
    h+='<td>'+(s.parts.length?s.parts.join(', '):'-')+'</td></tr>';
  });
  h+='</table>';
  h+='<div class="pdf-card"><b>Vežbe po delovima tela</b><br/><br/>';
  var byPart={};
  S.exercises.forEach(function(e){if(!byPart[e.part])byPart[e.part]=[];byPart[e.part].push(e.name)});
  Object.entries(byPart).forEach(function(kv){
    h+='<div style="margin-bottom:6px"><b style="color:#1e40af">'+kv[0]+':</b> '+kv[1].join(', ')+'</div>';
  });
  h+='</div>';
  return h;
}

function genHistSection(){
  var wkts=rFilteredWorkouts();
  var h='<h2>🕐 Istorija treninga <span style="font-size:12px;color:#64748b;font-weight:400">('+rPeriodLabel()+')</span></h2>';
  if(!wkts.length){h+='<p style="color:#64748b">Nema treninga u izabranom periodu.</p>';return h;}
  wkts.slice().reverse().forEach(function(w){
    var totalKcal=w.exercises.reduce(function(a,ex){
      if(ex.type==='k'){return a+kKcal(ex.dur||0,ex.kcal||0,ex.met);}
      return a+sKcal(ex);
    },0);
    h+='<div class="pdf-card no-break">';
    h+='<div style="display:flex;justify-content:space-between;margin-bottom:6px">';
    h+='<b>'+w.parts.join(', ')+'</b>';
    h+='<span style="color:#64748b;font-size:11px">'+w.date+' — '+DAYS[w.day]+'</span></div>';
    h+='<table><tr><th>Vežba</th><th>Tip</th><th>Detalji</th><th>kcal</th></tr>';
    w.exercises.forEach(function(ex){
      if(ex.type==='k'){
        h+='<tr><td>'+ex.name+'</td><td>Kardio</td><td>'+(ex.dur||0)+' min</td><td>'+kKcal(ex.dur||0,ex.kcal||0,ex.met)+'</td></tr>';
      }else{
        var mw=ex.sets.length?Math.max.apply(null,ex.sets.map(function(s){return s.w})):0;
        var sets=ex.sets.map(function(s,i){return (i+1)+': '+s.r+'×'+s.w+'kg'}).join('  ');
        h+='<tr><td>'+ex.name+'</td><td>Snaga</td><td style="font-size:10px">'+sets+(mw>0?' | max '+mw+'kg':'')+'</td><td>'+sKcal(ex)+'</td></tr>';
      }
    });
    h+='</table>';
    h+='<div style="text-align:right;margin-top:6px;color:#b45309;font-weight:600">🔥 Ukupno: '+totalKcal+' kcal</div>';
    if(w.note)h+='<div style="font-style:italic;color:#64748b;font-size:11px;margin-top:4px">"'+w.note+'"</div>';
    h+='</div>';
  });
  return h;
}

function genStatsSection(){
  var wkts=rFilteredWorkouts();
  var h='<h2>📊 Statistika <span style="font-size:12px;color:#64748b;font-weight:400">('+rPeriodLabel()+')</span></h2>';

  // Trening stats
  h+='<h3>🏋️ Statistika treninga</h3>';
  var tw=wkts.length;
  var ts=wkts.reduce(function(a,w){return a+w.exercises.reduce(function(b,e){return b+(e.type==='k'?1:e.sets.length)},0)},0);
  var tv=wkts.reduce(function(a,w){return a+w.exercises.filter(function(e){return e.type!=='k'}).reduce(function(b,e){return b+e.sets.reduce(function(c,s){return c+s.r*s.w},0)},0)},0);
  var tk=wkts.reduce(function(a,w){return a+w.exercises.reduce(function(b,e){return b+(e.type==='k'?kKcal(e.dur||0,e.kcal||0,e.met):sKcal(e))},0)},0);
  h+='<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px">';
  [{v:tw,l:'Treninga'},{v:ts,l:'Serija'},{v:(tv/1000).toFixed(1)+'t',l:'Volumen'},{v:(tk/1000).toFixed(1)+'k',l:'kcal spaljeno'}].forEach(function(m){
    h+='<div class="pdf-stat"><div class="pdf-stat-v">'+m.v+'</div><div class="pdf-stat-l">'+m.l+'</div></div>';
  });
  h+='</div>';

  if(wkts.length){
    var pc={};wkts.forEach(function(w){w.parts.forEach(function(p){pc[p]=(pc[p]||0)+1})});
    var mc=Math.max.apply(null,[1].concat(Object.values(pc)));
    h+='<div class="pdf-card"><b>Distribucija po delovima tela</b><br/><br/>';
    Object.entries(pc).sort(function(a,b){return b[1]-a[1]}).forEach(function(e){
      var pct=Math.round(e[1]/mc*100);
      h+='<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;font-size:11px"><span>'+e[0]+'</span><span>'+e[1]+'×</span></div>';
      h+='<div class="pdf-bar-wrap"><div class="pdf-bar-fill" style="width:'+pct+'%"></div></div></div>';
    });
    h+='</div>';
  }

  // Ishrana stats
  h+='<h3 style="margin-top:16px">🥗 Statistika ishrane</h3>';
  var nutrDates=rFilteredNutrDates();
  if(!nutrDates.length){
    h+='<p style="color:#64748b">Nema podataka o ishrani u izabranom periodu.</p>';
  }else{
    var daily=nutrDates.map(function(d){
      var dy=S.nutrition[d],all=Object.values(dy).reduce(function(a,b){return a.concat(b)},[]);
      var t=mTot(all);return{date:d,k:t.k,p:t.p,c:t.c,f:t.f};
    });
    var avg={
      k:daily.reduce(function(a,d){return a+d.k},0)/daily.length,
      p:daily.reduce(function(a,d){return a+d.p},0)/daily.length,
      c:daily.reduce(function(a,d){return a+d.c},0)/daily.length,
      f:daily.reduce(function(a,d){return a+d.f},0)/daily.length
    };
    h+='<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px">';
    [{v:Math.round(avg.k),l:'kcal/dan'},{v:avg.p.toFixed(0)+'g',l:'Proteini'},{v:avg.c.toFixed(0)+'g',l:'Ugljeni hidrati'},{v:avg.f.toFixed(0)+'g',l:'Masti'}].forEach(function(m){
      h+='<div class="pdf-stat"><div class="pdf-stat-v">'+m.v+'</div><div class="pdf-stat-l">'+m.l+'</div></div>';
    });
    h+='</div>';
    var tg=avg.p+avg.c+avg.f;
    if(tg>0){
      h+='<div class="pdf-card"><b>Raspodela makronutrijenata (prosek)</b><br/><br/>';
      [{lbl:'Proteini',v:avg.p,col:'#3b82f6'},{lbl:'Ugljeni hidrati',v:avg.c,col:'#22c55e'},{lbl:'Masti',v:avg.f,col:'#ef4444'}].forEach(function(m){
        var pct=Math.round(m.v/tg*100);
        h+='<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;font-size:11px"><span>'+m.lbl+'</span><span style="color:'+m.col+';font-weight:600">'+m.v.toFixed(1)+'g · '+pct+'%</span></div>';
        h+='<div class="pdf-bar-wrap"><div style="height:6px;border-radius:3px;background:'+m.col+';width:'+pct+'%"></div></div></div>';
      });
      h+='</div>';
    }
    // Dnevna tabela ishrane
    h+='<div class="pdf-card"><b>Dnevne vrednosti ('+rPeriodLabel()+')</b><br/><br/>';
    h+='<table><tr><th>Datum</th><th>kcal</th><th>Proteini (g)</th><th>UH (g)</th><th>Masti (g)</th></tr>';
    daily.forEach(function(d){
      h+='<tr><td>'+d.date+'</td><td>'+Math.round(d.k)+'</td><td>'+d.p.toFixed(0)+'</td><td>'+d.c.toFixed(0)+'</td><td>'+d.f.toFixed(0)+'</td></tr>';
    });
    h+='</table></div>';
  }
  return h;
}

function genNutrSection(){
  var nutrDates=rFilteredNutrDates();
  var h='<h2>🥗 Ishrana — dnevni dnevnik <span style="font-size:12px;color:#64748b;font-weight:400">('+rPeriodLabel()+')</span></h2>';
  if(!nutrDates.length){h+='<p style="color:#64748b">Nema podataka o ishrani u izabranom periodu.</p>';return h;}
  nutrDates.slice().reverse().forEach(function(date){
    var dy=S.nutrition[date];
    var allItems=Object.values(dy).reduce(function(a,b){return a.concat(b)},[]);
    var dayTotal=mTot(allItems);
    h+='<div class="pdf-card no-break"><b>'+date+'</b>';
    h+='<span style="float:right;color:#b45309;font-size:11px;font-weight:600">'+Math.round(dayTotal.k)+' kcal</span><br/><br/>';
    MEALS.forEach(function(m){
      var items=dy[m.id]||[];
      if(!items.length)return;
      h+='<div style="margin-bottom:8px"><b style="font-size:11px;color:#1e40af">'+m.ico+' '+m.lbl+'</b><br/>';
      h+='<table style="margin-top:4px"><tr><th>Namirnica</th><th>Kol.</th><th>kcal</th><th>P</th><th>UH</th><th>M</th></tr>';
      items.forEach(function(it){
        var fd=S.foods.find(function(f){return f.id===it.fid});
        if(!fd)return;
        var r=(fd.unit==='kom')?it.amt:it.amt/100;
        h+='<tr><td>'+fd.name+'</td><td>'+it.amt+(fd.unit==='kom'?' kom':' g')+'</td>';
        h+='<td>'+Math.round(fd.k*r)+'</td><td>'+( fd.p*r).toFixed(1)+'</td><td>'+(fd.c*r).toFixed(1)+'</td><td>'+(fd.f*r).toFixed(1)+'</td></tr>';
      });
      h+='</table></div>';
    });
    var t=mTot(allItems);
    h+='<div style="background:#fef3c7;border-radius:6px;padding:6px 10px;font-size:11px;margin-top:6px">';
    h+='<b>Ukupno:</b> '+Math.round(t.k)+' kcal · Proteini: '+t.p.toFixed(0)+'g · UH: '+t.c.toFixed(0)+'g · Masti: '+t.f.toFixed(0)+'g</div>';
    h+='</div>';
  });
  return h;
}

function genPdf(){
  var anySelected=Object.values(_rTabs).some(function(v){return v});
  if(!anySelected){toast('Odaberi bar jedan tab!');return;}
  closeRModal();
  var nm=S.profile.name?S.profile.name:'';
  var dateStr=new Date().toLocaleDateString('sr-RS',{day:'2-digit',month:'2-digit',year:'numeric'});
  var periodStr=rPeriodLabel();
  var content='<h1>Fitness izveštaj</h1>';
  content+='<div class="pdf-meta">';
  if(nm)content+='Korisnik: <b>'+nm+'</b> &nbsp;|&nbsp; ';
  content+='Datum generisanja: <b>'+dateStr+'</b> &nbsp;|&nbsp; Period: <b>'+periodStr+'</b></div>';
  if(_rTabs.sched)content+=genSchedSection();
  if(_rTabs.hist)content+=genHistSection();
  if(_rTabs.stats)content+=genStatsSection();
  if(_rTabs.nutr)content+=genNutrSection();
  el('pdfContent').innerHTML=content;
  setTimeout(function(){window.print();},200);
}

// INIT
nutrDate=today();
rHome();
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(function(){});
