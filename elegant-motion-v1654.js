/* v16.54 — tiny motion guardrails; no business logic or data changes */
(function(){
  'use strict';
  if(window.__doaElegantMotionV1654)return;
  window.__doaElegantMotionV1654=true;
  var reduced=false, coarse=false;
  function readMotion(){
    try{reduced=!!window.matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){reduced=false;}
    try{coarse=!!window.matchMedia('(pointer: coarse)').matches;}catch(e){coarse=false;}
  }
  readMotion();
  try{
    var mq=window.matchMedia('(prefers-reduced-motion: reduce)');
    if(mq.addEventListener)mq.addEventListener('change',readMotion);
    else if(mq.addListener)mq.addListener(readMotion);
  }catch(e){}
  /* Release press feedback if a finger is interrupted by an app switch or gesture. */
  document.addEventListener('visibilitychange',function(){
    if(!document.hidden)return;
    document.querySelectorAll('.touch-pressing').forEach(function(el){el.classList.remove('touch-pressing');});
  });
  /* Avoid accidental double-tap zoom on controls while preserving normal page zoom. */
  if(coarse)document.documentElement.classList.add('e54-coarse-pointer');
})();
