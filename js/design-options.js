(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  function swap(stage) {
    const next = stage.classList.toggle('is-games');
    stage.querySelector('.motion-screen strong').textContent = next ? 'NEXT PAGE' : (stage.classList.contains('os-stage') ? 'ART DESK' : 'PORTFOLIO');
  }
  async function run(stage, type) {
    if (reduced.matches) { swap(stage); return; }
    if (type === 'iris' || type === 'film' || type === 'os-crt') {
      await window.portfolioTransitions.preview(type === 'os-crt' ? 'crt' : type, stage, () => swap(stage), type === 'os-crt' ? 'art-2d.html' : stage.dataset.from);
      return;
    }
    const layers=[];
    const make=(cls,html='')=>{const el=document.createElement('div');el.className=`motion-layer ${cls}`;el.innerHTML=html;el.setAttribute('aria-hidden','true');stage.append(el);layers.push(el);return el;};
    const animate=(el,frames,duration,delay=0)=>el.animate(frames,{duration,delay,easing:'cubic-bezier(.65,0,.35,1)',fill:'both'}).finished;
    try {
      if(type==='os-minimize') {
        const ground=make('os-ground');
        const panel=make('os-demo-window','<div class="os-demo-title">Art desk <span>_ □ ×</span></div><div class="os-demo-content">▰ &nbsp; ▰ &nbsp; ▰<small>Saving your workspace…</small></div>');
        await animate(panel,[{transform:'translate(0,0) scale(1)',opacity:1},{transform:'translate(-35%,45%) scale(.08,.035)',opacity:.4}],580);
        swap(stage); await animate(ground,[{opacity:1},{opacity:0}],260,100);
      } else if(type==='os-shutdown') {
        const ground=make('os-ground');
        const dialog=make('os-shutdown-dialog','<div class="os-demo-title">David OS <span>×</span></div><div class="os-dialog-body">Closing the art desk…<div class="os-saving-track"><span></span></div><small>Preparing your next destination</small></div>');
        await animate(dialog,[{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],160);
        await animate(dialog.querySelector('.os-saving-track span'),[{width:'0%'},{width:'100%'}],600);
        swap(stage); await Promise.all([animate(dialog,[{opacity:1},{opacity:0}],180),animate(ground,[{opacity:1},{opacity:0}],220,80)]);
      }
    } catch(error) { if(error.name!=='AbortError') console.warn('Preview unavailable:',error); }
    finally {layers.forEach(el=>el.remove());}
  }
  document.querySelectorAll('[data-motion]').forEach(card=>{
    const play=card.querySelector('[data-play]');
    play.addEventListener('click',async()=>{play.disabled=true;try{await run(card.querySelector('.motion-stage'),card.dataset.motion);}finally{play.disabled=false;}});
    card.querySelector('[data-full]').addEventListener('click',()=>{
      const dialog=document.createElement('dialog');dialog.className='full-motion';dialog.setAttribute('aria-label',`${card.querySelector('h3').textContent} full preview`);
      const close=document.createElement('button');close.textContent='Close preview';
      const stage=card.querySelector('.motion-stage').cloneNode(true);stage.querySelectorAll('.motion-layer,.page-transition').forEach(el=>el.remove());
      dialog.append(close,stage);document.body.append(dialog);
      close.addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>{stage.getAnimations({subtree:true}).forEach(a=>a.cancel());dialog.remove();card.querySelector('[data-full]').focus();},{once:true});
      dialog.showModal();run(stage,card.dataset.motion);
    });
  });
})();
