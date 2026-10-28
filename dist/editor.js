// On-page text editor. Only runs on a local preview (localhost / 127.0.0.1) served by ../serve.py,
// which writes saved edits back into index.html. Visitors on the live site never see it.
(()=>{if(!['localhost','127.0.0.1'].includes(location.hostname))return;
  const INLINE=new Set(['B','STRONG','EM','I','SPAN','SMALL','BR','U','MARK','SUP','SUB']);
  const SKIP='script,style,svg,video,iframe,#fw-editor,[data-count],[data-views],#ex-grid,.show-dyn,.niche-track,.reel-stack .view-count,.ig-post,.post-stack';
  const isTextLeaf=el=>{if(!el.textContent.trim())return false;for(const n of el.childNodes){if(n.nodeType===1&&!INLINE.has(n.tagName))return false}return true};
  const ui=document.createElement('div');ui.id='fw-editor';
  ui.innerHTML=`<style>
    #fw-editor{position:fixed;right:18px;bottom:18px;z-index:2147483000;display:flex;gap:8px;font:600 13px/1 Inter,system-ui,sans-serif}
    #fw-editor button{border:0;border-radius:99px;padding:11px 16px;cursor:pointer;color:#fff;background:#1d1b19;box-shadow:0 10px 30px -10px #000,0 0 0 1px #ffffff1f}
    #fw-editor button.primary{background:linear-gradient(168deg,#ff3f13,#ee820e)}
    #fw-editor .toast{align-self:center;color:#f4f2ee;background:#1d1b19;padding:10px 14px;border-radius:10px;box-shadow:0 0 0 1px #ffffff1f}
    body.fw-editing [data-fw-edit]{outline:1px dashed #ff5a1688;outline-offset:3px;cursor:text}
    body.fw-editing [data-fw-edit]:hover{outline-color:#ff5a16}
    body.fw-editing [data-fw-edit]:focus{outline:2px solid #ff5a16;background:#ff5a160f}
  </style><span class="toast" hidden></span><button class="cancel" hidden>Cancel</button><button class="main primary">✎ Edit text</button>`;
  document.body.appendChild(ui);
  const main=ui.querySelector('.main'),cancel=ui.querySelector('.cancel'),toast=ui.querySelector('.toast');
  let editing=false,orig=new Map();
  const say=(t,ms=3500)=>{toast.textContent=t;toast.hidden=false;clearTimeout(say.t);say.t=setTimeout(()=>toast.hidden=true,ms)};
  const block=e=>{if(editing&&e.target.closest('[data-fw-edit]')){e.preventDefault();e.stopPropagation()}};
  function start(){editing=true;orig.clear();document.body.classList.add('fw-editing');
    const els=[...document.body.querySelectorAll('h1,h2,h3,h4,p,li,a,button,label,small,strong,em,b,span,div')].filter(el=>!el.closest(SKIP)&&isTextLeaf(el));
    els.filter(el=>!els.some(o=>o!==el&&o.contains(el))).forEach(el=>{orig.set(el,el.innerHTML);el.dataset.fwEdit='';el.contentEditable='true';el.spellcheck=true});
    main.textContent='Save changes';cancel.hidden=false;say(`${orig.size} text blocks editable. Click any outlined text.`)}
  function stop(){editing=false;document.body.classList.remove('fw-editing');orig.forEach((_,el)=>{el.removeAttribute('contenteditable');delete el.dataset.fwEdit});main.textContent='✎ Edit text';cancel.hidden=true}
  async function save(){const changes=[];orig.forEach((was,el)=>{if(el.innerHTML!==was)changes.push({from:was,to:el.innerHTML})});
    if(!changes.length){stop();say('No changes');return}
    main.disabled=true;main.textContent='Saving…';
    try{const r=await fetch('/__edit/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({changes})});
      if(!r.ok)throw new Error(r.status===501||r.status===405?'Run python3 serve.py to save edits':'Save failed ('+r.status+')');
      const j=await r.json();stop();say(j.failed.length?`Saved ${j.saved}. Couldn't save: ${j.failed.join(' · ')}`:`Saved ${j.saved} change${j.saved===1?'':'s'} to index.html`,6000)}
    catch(e){say(e.message,6000);main.textContent='Save changes'}finally{main.disabled=false}}
  main.addEventListener('click',()=>editing?save():start());
  cancel.addEventListener('click',()=>{orig.forEach((was,el)=>el.innerHTML=was);stop();say('Changes discarded')});
  ['click','pointerdown','keydown'].forEach(t=>document.addEventListener(t,e=>{if(t==='keydown'){if(editing&&e.key==='Enter'&&!e.shiftKey&&e.target.closest('[data-fw-edit]')){e.preventDefault();e.target.blur()}return}if(t==='click')block(e)},true));
})();
