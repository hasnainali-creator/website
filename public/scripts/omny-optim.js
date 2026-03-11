// OmnySports Standalone Optimization Bundle (Clean Room Edition)
import{initializeApp as firebaseInit}from"https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import{getMessaging as getFCM,getToken as getFCMToken,onMessage as onFCMMessage}from"https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging.js";

const fbConfig={apiKey:"AIzaSyACPRRVLI7JX_ZNNo3No9G32LY2VSTBo30",authDomain:"omnysports-push-notifications.firebaseapp.com",projectId:"omnysports-push-notifications",storageBucket:"omnysports-push-notifications.firebasestorage.app",messagingSenderId:"881503140155",appId:"1:881503140155:web:e82d724251869f8fd39f1e",measurementId:"G-1J7VTX8EYJ"};
const vapidKey="BG8cX_gQzHwiMR-IC3b0oxTkFSFTrYGs_LtC1eEoSki5Ir6QZ6sCCSyem4_T6ZMEG7WAgwRi4W2UCkAjdV4w9s0";

const runPushSetup=()=>{
  if(!("Notification"in window)||navigator.userAgent.includes("bot"))return;
  if(Notification.permission==="default"){
    const cooldown=12*60*60*1000;
    const lastPrompt=localStorage.getItem("omny_push_prompt_last");
    if(!lastPrompt||(Date.now()-parseInt(lastPrompt)>=cooldown)){
      const trigger=()=>{
        localStorage.setItem("omny_push_prompt_last",Date.now().toString());
        document.removeEventListener("click",trigger);
        document.removeEventListener("touchstart",trigger);
        Notification.requestPermission().then(p=>{"granted"===p&&doRegister()})
      };
      document.addEventListener("click",trigger,{once:true,passive:true});
      document.addEventListener("touchstart",trigger,{once:true,passive:true})
    }
  }else if(Notification.permission==="granted")doRegister()
};

async function doRegister(){
  try{
    const app=firebaseInit(fbConfig);
    const msg=getFCM(app);
    const token=await getFCMToken(msg,{vapidKey:vapidKey});
    if(token)fetch("/api/subscribe",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:token})});
    onFCMMessage(msg,()=>{console.log("[Firebase] Push received")})
  }catch(e){}
}

// Speculation Rules Manager
!function(){
  const nav=navigator;
  const conn=nav.connection||nav.mozConnection||nav.webkitConnection;
  if(conn&&(conn.saveData||(conn.effectiveType&&conn.effectiveType.includes("2g"))))return;
  
  const rules={prerender:[]};
  const seen=new Set;
  
  function addRule(url){
    if(!url||seen.has(url)||url.includes("/admin")||url.includes("/keystatic"))return;
    seen.add(url);
    rules.prerender.push({source:"list",urls:[url]});
    let s=document.getElementById("speculation-rules-dynamic");
    if(!s){
      s=document.createElement("script");
      s.id="speculation-rules-dynamic";
      s.type="speculationrules";
      document.head.appendChild(s);
    }
    s.textContent=JSON.stringify(rules)
  }

  const idle=(fn)=>{"requestIdleCallback"in window?requestIdleCallback(fn,{timeout:2000}):setTimeout(fn,100)};
  let lastPos={x:0,y:0,t:0};

  document.addEventListener("mousemove",(e=>{
    const now=Date.now();
    const dt=now-lastPos.t;
    if(dt<50)return;
    const dx=e.clientX-lastPos.x;
    const dy=e.clientY-lastPos.y;
    if(Math.sqrt(dx*dx+dy*dy)/dt>.2){
      idle(()=>{
        const link=document.elementFromPoint(e.clientX+dx*5,e.clientY+dy*5)?.closest("a");
        if(link&&link.origin===window.location.origin)addRule(link.href)
      })
    }
    lastPos={x:e.clientX,y:e.clientY,t:now}
  }),{passive:true});

  if("IntersectionObserver"in window){
    const obs=new IntersectionObserver((entries)=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          entry.target._intentTimer=setTimeout(()=>{
            const link=entry.target.querySelector("a");
            if(link)addRule(link.href)
          },4000)
        }else clearTimeout(entry.target._intentTimer)
      })
    },{threshold:0.6});
    idle(()=>{document.querySelectorAll("article, .news-card, .article-card").forEach(el=>obs.observe(el))})
  }
}();

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",runPushSetup);
else runPushSetup();
document.addEventListener("astro:page-load",runPushSetup);
