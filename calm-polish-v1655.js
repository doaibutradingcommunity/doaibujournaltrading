/* v16.55 — resilient interaction polish; no data/business-logic changes */
(function(){
  'use strict';
  if(window.__doaPolishV1655)return;
  window.__doaPolishV1655=true;
  var root=document.documentElement;
  function reduced(){
    try{return window.matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){return false;}
  }
  function clearPress(){
    document.querySelectorAll('.touch-pressing').forEach(function(el){el.classList.remove('touch-pressing');});
  }
  document.addEventListener('visibilitychange',function(){if(document.hidden)clearPress();});
  window.addEventListener('pagehide',clearPress,{passive:true});
  /* Keep browser-native keyboard access while avoiding sticky focus after touch. */
  document.addEventListener('pointerdown',function(e){
    if(e.pointerType==='touch' && document.activeElement && document.activeElement.matches &&
      document.activeElement.matches('button,a,[role="button"],summary')){
      try{document.activeElement.blur();}catch(_){}
    }
  },{passive:true});
  /* Ensure newly revealed dialogs remain usable on short screens. */
  document.addEventListener('keydown',function(e){
    if(e.key!=='Escape')return;
    var active=document.activeElement;
    if(active && active.closest){
      var dialog=active.closest('[role="dialog"]');
      if(dialog && dialog.querySelector('[data-dismiss],.modal-close,[aria-label*="Tutup"],[aria-label*="Close"]')){
        var close=dialog.querySelector('[data-dismiss],.modal-close,[aria-label*="Tutup"],[aria-label*="Close"]');
        if(close && typeof close.click==='function')close.click();
      }
    }
  });
  if(reduced())root.setAttribute('data-motion-preference','reduced');
  else root.removeAttribute('data-motion-preference');
  try{
    var mq=window.matchMedia('(prefers-reduced-motion: reduce)');
    var update=function(){if(mq.matches)root.setAttribute('data-motion-preference','reduced');else root.removeAttribute('data-motion-preference');};
    if(mq.addEventListener)mq.addEventListener('change',update);else if(mq.addListener)mq.addListener(update);
  }catch(_){}
})();
