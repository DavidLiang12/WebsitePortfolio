(() => {
  'use strict';
  const designs = [['01-side-quest','Side Quest'],['02-bonus-level','Bonus'],['03-hidden-track','Hidden Track'],['04-secret-file','Secret File'],['05-keep-looking','Keep Looking']];
  const desktop = matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)');
  if (!desktop.matches) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let serial = 0;
  function mount(host, index) {
    const design = designs[index];
    if (!design) return;
    const id = `sticker-${++serial}`, ticket = index === 1;
    const artwork = ticket ? 'images/stickers/bonus-ticket.png' : `images/stickers/${design[0]}.svg`;
    host.classList.add('peel-sticker'); host.dataset.design = design[0];
    const date = new Date().toLocaleDateString('en-US', { month:'short', day:'2-digit', year:'numeric' }).toUpperCase();
    host.innerHTML = `<section class="peel-mission" id="${id}-mission" hidden inert><small>SECRET MISSION / 01</small><strong>Under construction</strong><p>Something is coming soon.</p></section>
      <button class="peel-front" type="button" aria-label="Peel ${design[1]} sticker" aria-expanded="false" aria-controls="${id}-mission">
      <svg class="peel-paper" viewBox="0 0 280 240" aria-hidden="true"><defs><clipPath id="${id}-face"><path data-face-clip/></clipPath><clipPath id="${id}-lift"><path data-lift-clip/></clipPath><mask id="${id}-shape" style="mask-type:alpha"><image href="${artwork}" x="0" y="${ticket?36:0}" width="280" height="${ticket?168:240}"/></mask></defs>
      <g clip-path="url(#${id}-face)"><image href="${artwork}" x="0" y="${ticket?36:0}" width="280" height="${ticket?168:240}"/>${ticket?`<text x="126" y="153" text-anchor="middle" fill="#f3ead2" font-family="monospace" font-size="10" font-weight="bold">${date}</text>`:''}</g>
      <g data-paper-back><g clip-path="url(#${id}-lift)"><rect width="280" height="240" fill="#eee0bd" mask="url(#${id}-shape)"/></g></g></svg></button>
      <button class="peel-reset" type="button" hidden>Put sticker back</button>`;
    const front=host.querySelector('.peel-front'), mission=host.querySelector('.peel-mission'), reset=host.querySelector('.peel-reset');
    const face=host.querySelector('[data-face-clip]'), lift=host.querySelector('[data-lift-clip]'), back=host.querySelector('[data-paper-back]');
    let origin, progress=0, moved=false, revealed=false, frame=0, animating=false;
    function draw(value) {
      progress=value;
      const c=520*(1-value);
      face.setAttribute('d',`M0 0H${c}L0 ${c}Z`);
      lift.setAttribute('d',`M${c} 0H560V560H0V${c}Z`);
      back.setAttribute('transform',`matrix(0 -1 -1 0 ${c} ${c})`);
      front.style.opacity = value===1 ? '0' : '1';
      mission.hidden=value===0; mission.inert=!revealed;
    }
    function settle(target, keyboard=false) {
      cancelAnimationFrame(frame); animating=true;
      const from=progress, start=performance.now(), duration=reduced.matches?0:1150;
      if(target===1) window.portfolioSound?.peel();
      const tick=now=>{
        const t=duration?Math.min(1,(now-start)/duration):1;
        draw(from+(target-from)*(t*t*(3-2*t)));
        if(t<1) frame=requestAnimationFrame(tick);
        else { animating=false; revealed=target===1; front.disabled=revealed; front.classList.toggle('is-peeled',revealed); front.setAttribute('aria-expanded',String(revealed)); mission.inert=!revealed; reset.hidden=!revealed; if(revealed&&keyboard) reset.focus(); }
      };
      frame=requestAnimationFrame(tick);
    }
    const reveal=keyboard=>settle(1,keyboard);
    draw(0);
    front.addEventListener('pointerdown',event=>{
      if(event.button!==0||revealed||animating)return;
      origin={x:event.clientX,y:event.clientY}; moved=false;
      front.setPointerCapture(event.pointerId); front.classList.add('is-dragging');
    });
    front.addEventListener('pointermove',event=>{
      if(!origin)return;
      const distance=(origin.x-event.clientX+origin.y-event.clientY)/2;
      if(Math.abs(distance)>5)moved=true;
      if(moved)draw(Math.max(0,Math.min(.95,distance/(host.clientWidth*.7))));
    });
    front.addEventListener('pointerup',()=>{
      if(!origin)return; origin=null; front.classList.remove('is-dragging');
      if(moved){if(progress>.3)reveal();else settle(0);}
    });
    const cancel=()=>{if(!origin)return; origin=null; front.classList.remove('is-dragging');if(!revealed&&!animating)settle(0);};
    front.addEventListener('pointercancel',cancel); front.addEventListener('lostpointercapture',cancel);
    front.addEventListener('click',event=>{if(moved&&event.detail!==0){moved=false;return;}if(!revealed&&!animating)reveal(event.detail===0);});
    reset.addEventListener('click',()=>{cancelAnimationFrame(frame);animating=false;revealed=false;moved=false;front.disabled=false;front.classList.remove('is-peeled');front.setAttribute('aria-expanded','false');draw(0);reset.hidden=true;front.focus();});
  }
  document.querySelectorAll('[data-sticker]').forEach(host=>mount(host,Number(host.dataset.sticker)-1));
  const selection=new URLSearchParams(location.search).get('sticker'), selected=selection===null?2:Number(selection);
  const contact=document.querySelector('.cassette-identity .cassette-contact');
  if(contact&&Number.isInteger(selected)&&selected>=1&&selected<=designs.length){
    const preview=document.createElement('div');preview.className='home-sticker-preview';
    const host=document.createElement('div');preview.append(host);
    const notice=document.createElement('p');notice.className='sticker-construction';notice.textContent='Pull to peel';preview.append(notice);
    if(selection!==null){const back=document.createElement('a');back.href='sticker-options.html';back.className='sticker-preview-return';back.textContent='Compare all five stickers';preview.append(back);}
    contact.after(preview);mount(host,selected-1);
    desktop.addEventListener('change',event=>{if(!event.matches)preview.remove();});
  }
})();
