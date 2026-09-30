(function(){
"use strict";
var token="",client=null,busy=false,auto=false;
function el(id){return document.getElementById(id)}
function status(s){var x=el("gcalState");if(x)x.textContent=s}
function gold(id,on){var b=el(id);if(b)b.classList.toggle("gold",!!on)}
function busyButton(id,on){gold(id,on);var b=el(id);if(b)b.disabled=!!on}
function cfg(){return window.HWAGENDA_GOOGLE&&window.HWAGENDA_GOOGLE.clientId}
function connect(next){gold("gcalConnect",true);status("Connexion Google…");
 if(!cfg()){status("Config Google absente");gold("gcalConnect",false);return}
 if(!(window.google&&google.accounts&&google.accounts.oauth2)){status("Google API non chargée");gold("gcalConnect",false);return}
 if(!client)client=google.accounts.oauth2.initTokenClient({client_id:cfg(),scope:"https://www.googleapis.com/auth/calendar.events",callback:function(r){if(r.error){status("OAuth: "+r.error);return}token=r.access_token;status("Google connecté");gold("gcalConnect",true);if(next)next()}});
 if(token){if(next)next()}else client.requestAccessToken({prompt:"consent"})
}
async function api(url,opt){opt=opt||{};opt.headers=Object.assign({Authorization:"Bearer "+token,"Content-Type":"application/json"},opt.headers||{});var r=await fetch(url,opt);if(!r.ok)throw new Error("Google "+r.status+" "+(await r.text()).slice(0,160));return r.status===204?{}:r.json()}
function localTasks(){try{return JSON.parse(localStorage.getItem("agenda.data.permanent")||"[]")}catch(e){return []}}
function save(a){localStorage.setItem("agenda.data.permanent",JSON.stringify(a));location.reload()}
function body(t){var d=t.planned||t.original,st=new Date(d+"T"+(t.time||"10:00")+":00"),en=new Date(st.getTime()+(+(t.duration||60))*60000);return {summary:t.title||"Agenda HW",description:"Agenda HW\nHWAGENDA_ID:"+t.id,start:{dateTime:st.toISOString()},end:{dateTime:en.toISOString()}}}
async function exportAll(){if(busy)return;busy=true;busyButton("gcalExport",true);status("Export vers Google…");try{var a=localTasks(),n=0;for(var i=0;i<a.length;i++){var t=a[i],u="https://www.googleapis.com/calendar/v3/calendars/primary/events"+(t.googleEventId?"/"+encodeURIComponent(t.googleEventId):""),d=await api(u,{method:t.googleEventId?"PUT":"POST",body:JSON.stringify(body(t))});if(!d.id)throw new Error("Google n’a retourné aucun ID pour "+(t.title||"tâche"));t.googleEventId=d.id;var check=await api("https://www.googleapis.com/calendar/v3/calendars/primary/events/"+encodeURIComponent(d.id));if(!check.id)throw new Error("Événement non vérifiable dans Google Calendar");n++}localStorage.setItem("agenda.data.permanent",JSON.stringify(a));status("Export vérifié dans GC · "+n+" événement(s)")}catch(e){status("Erreur synchro");alert(e.message)}finally{busy=false;busyButton("gcalExport",false)}}
async function importAll(){if(busy)return;busy=true;busyButton("gcalImport",true);status("Import depuis Google…");try{var a=localTasks(),from=new Date();from.setDate(from.getDate()-30);var to=new Date();to.setFullYear(to.getFullYear()+1);var d=await api("https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&maxResults=2500&timeMin="+encodeURIComponent(from.toISOString())+"&timeMax="+encodeURIComponent(to.toISOString())),add=0;(d.items||[]).forEach(function(e){if(!e.start||!e.start.dateTime)return;var found=a.find(function(t){return t.googleEventId===e.id});var st=new Date(e.start.dateTime),en=e.end&&e.end.dateTime?new Date(e.end.dateTime):new Date(st.getTime()+3600000),date=st.getFullYear()+"-"+String(st.getMonth()+1).padStart(2,"0")+"-"+String(st.getDate()).padStart(2,"0"),time=String(st.getHours()).padStart(2,"0")+":"+String(st.getMinutes()).padStart(2,"0");if(found){found.title=e.summary||found.title;found.planned=date;found.time=time;found.duration=Math.max(5,Math.round((en-st)/60000));found.googleEventId=e.id;return}a.push({id:Date.now()+add,title:e.summary||"Google Calendar",original:date,planned:date,time:time,duration:Math.max(5,Math.round((en-st)/60000)),quadrant:"NUNI",scope:"PERSO",importance:5,frequency:"once",endDate:"",doneDates:[],googleEventId:e.id});add++});localStorage.setItem("agenda.data.permanent",JSON.stringify(a));status("Import GC OK · "+add+" nouvelle(s)");setTimeout(function(){location.reload()},400)}catch(e){status("Erreur synchro");alert(e.message)}finally{busy=false}}
window.gcalConnect=function(){connect()};
window.gcalExport=function(){connect(exportAll)};
window.gcalImport=function(){connect(importAll)};
window.toggleGcalAuto=function(){auto=!auto;var b=el("gcalAuto");if(b){b.textContent="AUTO "+(auto?"ON":"OFF");b.classList.toggle("gold",auto)}if(auto)connect(async function(){await importAll();await exportAll()});};
setInterval(function(){if(auto&&token&&!busy){importAll().then(exportAll)}},60000);
})();