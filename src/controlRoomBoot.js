/** Ported from https://ai-content-control-room.ransfordhaussmann.chatgpt.site */
export function bootControlRoom() {
  const cleanups = [];

  const agents=[
   {name:'Analyst',role:'Insights',icon:'↗',color:'#58e8ff',shirt:'#18b8dc',hair:'#3a202a',skin:'#d99764',task:'Comparing retention',screen:'trend',detail:'Compares video retention to spot where viewers drop off.'},
   {name:'Community',role:'Comments',icon:'✿',color:'#ffab60',shirt:'#f87521',hair:'#ffaf68',skin:'#ffb87a',task:'Filtering spam',screen:'chat',detail:'Sorts comments and drafts replies for review.'},
   {name:'Publisher',role:'Posting',icon:'▦',color:'#ff70c5',shirt:'#f33e9f',hair:'#f24cae',skin:'#ffd1a5',task:'Scheduling posts',screen:'grid',detail:'Queues approved content in the demo calendar.'},
   {name:'Designer',role:'Thumbnails',icon:'✦',color:'#6bfbb2',shirt:'#30d584',hair:'#6ada57',skin:'#bb7951',task:'Designing thumbnails',screen:'image',detail:'Prepares thumbnail variants for review.'},
   {name:'Scout',role:'Trends',icon:'⌕',color:'#60d9ff',shirt:'#36b7f4',hair:'#513c32',skin:'#f6b17f',task:'Picking topics',screen:'bars',detail:'Finds topics that fit the current content plan.'},
   {name:'Writer',role:'Scripts',icon:'✎',color:'#bc9aff',shirt:'#9970f8',hair:'#492e46',skin:'#e29a6e',task:'Writing scripts',screen:'text',detail:'Turns a content brief into a draft script.'},
   {name:'Clipper',role:'Best moments',icon:'▷',color:'#ff7a91',shirt:'#ed4c62',hair:'#211625',skin:'#b76b4b',task:'Cutting clips',screen:'video',detail:'Selects short segments and lays out rough cuts.'},
   {name:'Editor',role:'Captions',icon:'✂',color:'#ffe071',shirt:'#eeb830',hair:'#f4ca55',skin:'#ed9f67',task:'Checking pacing',screen:'edit',detail:'Checks pacing and captions before a cut goes to review.'}
  ];
  const platforms=[['YouTube','▷',51,'#ff617d','82.4K'],['Shorts','▯',54,'#ff9958','45.9K'],['TikTok','♪',55,'#56e6ec','112.5K'],['Reels','◎',53,'#ff67c6','76.9K']];
  const defaults={
   queue:[
   {id:'q1',title:'Approve this week’s hooks',platform:'Shorts',notes:'Review the opening lines for the Friday short-form batch.'},
   {id:'q2',title:'Choose thumbnail B for the desk setup',platform:'YouTube',notes:'Thumbnail B uses the brighter desk angle with a tighter crop.'},
   {id:'q3',title:'Approve the Friday clips',platform:'TikTok',notes:'Three clips are ready for the Friday posting window.'}
   ],
   approved:[],
   activity:[
   ['#ff67c6','A Reel was saved 340 times','Just now'],
   ['#58e8ff','Analyst flagged a stronger opening hook','4m ago'],
   ['#ffab60','Community sorted 18 new comments','8m ago'],
   ['#bc9aff','Writer finished the first script draft','12m ago']
   ],
   paused:false
  };
  const key='content-control-room-v1';
  let state=structuredClone(defaults);
  try {const saved=JSON.parse(localStorage.getItem(key));if(saved)state=saved;} catch {}
  const $=id=>document.getElementById(id);
  const clean=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  function persist(){try{localStorage.setItem(key,JSON.stringify(state));}catch{}}
  function log(color,message){state.activity.unshift([color,message,'Just now']);state.activity=state.activity.slice(0,7);}
  let toastTimer;
  function toast(message){$('toast').textContent=message;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').textContent='',3500);}
  const screens={
   trend:'<path d="M4 24h8l7-8h8l7-9h8" fill="none" stroke="currentColor" stroke-width="2"/>',
   chat:'<rect x="4" y="5" width="23" height="5" rx="2" fill="currentColor" opacity=".6"/><rect x="17" y="14" width="24" height="5" rx="2" fill="currentColor"/><rect x="9" y="23" width="20" height="4" rx="2" fill="currentColor" opacity=".4"/>',
   grid:Array.from({length:12},(_,i)=>'<rect x="'+(4+i%4*10)+'" y="'+(4+Math.floor(i/4)*8)+'" width="7" height="5" rx="1" fill="currentColor" opacity="'+(i%3===0?.4:.85)+'"/>').join(''),
   image:'<rect x="3" y="4" width="38" height="24" rx="2" fill="#333060"/><circle cx="31" cy="10" r="3" fill="#ffe49d"/><path d="m4 26 12-15 9 11 5-6 10 10z" fill="currentColor"/>',
   bars:'<path d="M4 27V13h5v14zm8 0V8h5v19zm8 0V17h5v10zm8 0V5h5v22zm8 0V12h5v15z" fill="currentColor"/>',
   text:'<path d="M4 6h19M4 12h33M4 17h28M4 22h34M4 27h15" stroke="currentColor" stroke-width="2"/>',
   video:'<rect x="4" y="4" width="36" height="16" rx="2" fill="currentColor" opacity=".62"/><path d="m19 8 8 4-8 4z" fill="white"/><path d="M4 26h36m-32-3v6m9-6v6m9-6v6m9-6v6" stroke="currentColor"/>',
   edit:'<path d="M4 7h31M4 14h37M4 21h20M4 27h28" stroke="currentColor" stroke-width="3"/><path d="M17 3v26" stroke="white" opacity=".8"/>'
  };
  function workstation(agent,index){
   const {color,skin,hair,shirt,screen}=agent;
   const glasses=index===6?'<path fill="#271b32" d="M13 26h25v5H13z"/>':index===4?'<path d="M13 26h9v7h-9zm12 0h9v7h-9zM22 28h3" fill="none" stroke="#8e5c42" stroke-width="1.5"/>':'';
   const headwear=index===2?'<path fill="#ff73c3" d="M10 23h3v-6h5v-3h12v3h6v6h5v4H10z"/><path fill="#fff1fa" d="M25 17h4v3h-4z"/>':index===3?'<path fill="#54e594" d="M12 20h8v-6h5v3h8v4h7v5H12z"/>':index===1||index===7?'<path d="M11 28v-7l6-6h15l6 6v7" fill="none" stroke="#ffe2bc" stroke-width="2"/><path d="M10 25v6m29-6v6" stroke="#fff2d7" stroke-width="3"/>':'';
   return '<svg class="desk" viewBox="0 0 144 78" aria-hidden="true"><defs><linearGradient id="desk'+index+'" x2="0" y2="1"><stop stop-color="#5a4f8d"/><stop offset="1" stop-color="#2d2855"/></linearGradient></defs><ellipse cx="73" cy="69" rx="65" ry="6" fill="'+color+'" opacity=".12"/><rect x="62" y="9" width="52" height="37" rx="4" fill="#0f1428" stroke="'+color+'" stroke-opacity=".8"/><rect x="66" y="13" width="44" height="29" rx="2" fill="'+color+'" opacity=".11"/><g class="scan" style="color:'+color+'" transform="translate(66 12)">'+screens[screen]+'</g><path d="M87 46v8m-11 0h22" stroke="#7469a8" stroke-width="3"/><g class="worker"><g shape-rendering="crispEdges"><path fill="'+hair+'" d="M12 21h4v-4h15v3h5v5h3v12H10V25h2z"/><path fill="'+skin+'" d="M15 24h20v5h3v6h-4v6H17v-4h-4V29h2z"/><path fill="#32253a" d="M19 29h2v3h-2zm11 0h2v3h-2z"/><path fill="#fff0c7" d="M24 35h4v2h-4z"/>'+glasses+headwear+'<path fill="'+shirt+'" d="M16 40h18v3h6v6h4v7H8v-7h4v-6h4z"/><path fill="'+skin+'" d="M11 51h7v5h-7zm23 0h7v5h-7z"/><path fill="#fff" opacity=".65" d="M23 45h2v7h-2zm5 0h2v7h-2z"/></g></g><rect x="119" y="48" width="9" height="9" rx="2" fill="'+color+'" opacity=".65"/><path d="M128 50h3v4h-3" fill="none" stroke="'+color+'"/><rect x="4" y="56" width="136" height="8" rx="3" fill="url(#desk'+index+')"/><path d="M13 64h118l-4 9H17z" fill="#2a254b"/><path d="M21 68h42m14 0h45" stroke="'+color+'" stroke-width="1.5" opacity=".75"/></svg>';
  }
  function render(){
   const metrics=[['Views today','190K','▲ 12.4%','#ae8aff'],['Watch time (h)','6,139','▲ 8.1%','#53dcff'],['New followers','+547','▲ 21%','#60f5ab'],['Posts published','57','Across 4 channels','#ffe071']];
   $('metrics').innerHTML=metrics.map(([label,value,delta,color],i)=>'<section class="panel metric" style="--accent:'+color+'"><div class="eyebrow">'+label+'</div><strong>'+value+'</strong><em>'+delta+'</em><svg viewBox="0 0 60 22" preserveAspectRatio="none" aria-hidden="true"><path d="M1 20 '+['11 18 19 19 27 13 36 14 45 7 51 8 59 2','10 18 17 15 25 16 33 11 41 12 50 6 59 3','10 16 18 17 26 12 35 13 43 8 51 8 59 2','10 19 18 13 27 15 34 9 42 10 51 4 59 2'][i]+'" fill="none" stroke="'+color+'" stroke-width="2"/></svg></section>').join('');
   $('roster').innerHTML=agents.map(a=>'<div class="status" style="--accent:'+a.color+'"><span class="badge-icon" aria-hidden="true">'+a.icon+'</span><div style="min-width:0"><b>'+a.name+'</b><small>'+a.role+' · '+a.task+'</small></div><i class="dot" aria-hidden="true"></i></div>').join('');
   $('platforms').innerHTML=platforms.map(([name,icon,count,color])=>'<div class="platform" style="--accent:'+color+'"><span>'+icon+' '+name+'</span><strong>'+count+' posts</strong></div>').join('');
   $('floor').innerHTML=agents.map((a,i)=>'<button class="agent" data-agent="'+i+'" style="--accent:'+a.color+';--delay:'+(-i*.29)+'s"><span class="task">'+a.task+'</span>'+workstation(a,i)+'<span class="name">'+a.name+'</span></button>').join('');
   $('social').innerHTML=platforms.map(([name,icon,,color,views])=>'<div class="social-row" style="--accent:'+color+'"><span class="badge-icon" aria-hidden="true">'+icon+'</span><b>'+name+'</b><strong>'+views+'</strong></div>').join('');
   renderState();
  }
  function renderState(){
   document.body.classList.toggle('paused',state.paused);
   $('toggle').textContent=state.paused?'Resume demo':'Pause demo';
   $('live').innerHTML='<i class="dot"></i>'+(state.paused?'Animation paused':'8 agents online');
   $('pending').textContent=state.queue.length+' pending';
   $('queue').innerHTML=state.queue.length?state.queue.map(q=>'<article class="queue-item"><strong>'+clean(q.title)+'</strong><span class="small">'+clean(q.platform)+'</span><button class="btn primary" data-review="'+q.id+'">Review</button></article>').join(''):'<p class="quiet">You’re all caught up.</p>';
   $('activity').innerHTML=state.activity.map(([color,message,time])=>'<div><i class="dot" style="color:'+color+'"></i><span>'+clean(message)+'<time>'+time+'</time></span></div>').join('');
   const days=['Today','Thu','Fri','Sat','Sun','Mon','Tue'];
   const times=['09:00','12:30','17:00','20:00'];
   $('calendar').innerHTML=days.map((day,d)=>'<div class="day"><span>'+day+'</span>'+times.map((time,i)=>'<button class="slot" style="--accent:'+platforms[(d+i)%4][3]+'" data-slot="'+d+'-'+i+'" aria-label="'+day+' at '+time+'">'+time+'</button>').join('')+(d===2?state.approved.map(q=>'<button class="slot" style="--accent:#c89bff" data-approved="'+q.id+'" aria-label="'+clean(q.title)+'">+ Post</button>').join(''):'')+'</div>').join('');
   $('scheduled').textContent=(28+state.approved.length)+' scheduled';
   persist();
  }
  const dialog=$('dialog');
  function open(title,body){
   dialog.innerHTML='<h2 id="dialog-title">'+clean(title)+'</h2>'+body;
   dialog.showModal();
  }
  const closeButton='<button type="button" class="btn" data-close>Close</button>';
  $('toggle').onclick=()=>{state.paused=!state.paused;renderState();};
  $('new').onclick=()=>open('New content brief','<form id="brief" class="form"><label>Title<input name="title" maxlength="90" required></label><label>Channel<select name="platform">'+platforms.map(([p])=>'<option>'+p+'</option>').join('')+'</select></label><label>Brief notes<textarea name="notes" maxlength="500" placeholder="What should the team create?"></textarea></label><div class="dialog-actions"><button class="btn primary">Send for review</button>'+closeButton+'</div></form>');
  const onBriefSubmit = (event)=>{
   if(event.target.id!=='brief')return;
   event.preventDefault();
   const data=new FormData(event.target);
   const title=data.get('title').trim();
   if(!title){const input=event.target.elements.title;input.setCustomValidity('Enter a title.');input.reportValidity();return;}
   const q={id:Array.from(crypto.getRandomValues(new Uint32Array(4)), n => n.toString(16)).join("-"),title,platform:data.get('platform'),notes:data.get('notes').trim()||'No additional notes.'};
   state.queue.unshift(q);log('#bc9aff','New brief sent for review: '+title);dialog.close();renderState();toast('Brief added to the approval queue.');
  };
  const onBriefInput = (event)=>{if(event.target.name==='title')event.target.setCustomValidity('');};
  const onDocClick = (event)=>{
   const button=event.target.closest('button');
   if(!button)return;
   const {agent,review,slot,approved,decision,item,close}=button.dataset;
   if(close!==undefined){dialog.close();return;}
   if(agent!==undefined){
    const a=agents[Number(agent)];
    open(a.name,'<p>'+a.detail+'</p><p><strong>Current task</strong><br>'+a.task+'</p><div class="dialog-actions">'+closeButton+'</div>');
   }
   if(review){
    const q=state.queue.find(entry=>entry.id===review);
    open(q.title,'<p><strong>'+clean(q.platform)+'</strong><br>'+clean(q.notes)+'</p><div class="dialog-actions"><button class="btn primary" data-decision="approve" data-item="'+q.id+'">Approve &amp; schedule</button><button class="btn" data-decision="reject" data-item="'+q.id+'">Reject</button>'+closeButton+'</div>');
   }
   if(decision){
    const q=state.queue.find(entry=>entry.id===item);
    if(!q)return;
    state.queue=state.queue.filter(entry=>entry.id!==item);
    const accepted=decision==='approve';
    if(accepted)state.approved.push(q);
    log(accepted?'#53f7af':'#ff7a91',(accepted?'Scheduled: ':'Rejected: ')+q.title);
    dialog.close();renderState();toast(accepted?'Approved and added to Friday’s demo schedule.':'Brief rejected.');
   }
   if(slot){
    const [d,i]=slot.split('-').map(Number);
    const day=['Today','Thursday','Friday','Saturday','Sunday','Monday','Tuesday'][d];
    open(day+' · '+button.textContent,'<p>Scheduled demo post for '+platforms[(d+i)%4][0]+'.</p><div class="dialog-actions">'+closeButton+'</div>');
   }
   if(approved){
    const q=state.approved.find(entry=>entry.id===approved);
    open(q.title,'<p>Friday · '+clean(q.platform)+'</p><p>'+clean(q.notes)+'</p><div class="dialog-actions">'+closeButton+'</div>');
   }
  };
  dialog.addEventListener('submit', onBriefSubmit);
  dialog.addEventListener('input', onBriefInput);
  document.addEventListener('click', onDocClick);
  cleanups.push(() => dialog.removeEventListener('submit', onBriefSubmit));
  cleanups.push(() => dialog.removeEventListener('input', onBriefInput));
  cleanups.push(() => document.removeEventListener('click', onDocClick));
  $('mode').onclick=()=>{
   const demo=$('demo-layout').hidden;
   $('setup').hidden=demo;
   ['demo-layout','demo-label','demo-footer','live','toggle','new'].forEach(id=>{$(id).hidden=!demo;});
   $('mode').textContent=demo?'Back to channels':'Open demo';
   $('mode').setAttribute('aria-pressed',String(demo));
  };
  render();

  async function loadMetrics(){
   const status=$('metrics-status');
   const range=$('metrics-range');
   const liveBadge=$('live-accounts');
   const access=$('account-access-note');
   try{
    const response=await fetch('/api/channel-metrics',{credentials:'include',cache:'no-store'});
    if(!response.ok)throw new Error('Could not load metrics');
    const {snapshot}=await response.json();
    if(!snapshot?.channels){status.textContent='Connect your accounts below to load live stats.';return;}
    const dateOptions={timeZone:'Europe/Zurich',dateStyle:'medium',timeStyle:'short'};
    const checked=new Date(snapshot.checkedAt).toLocaleString('en-CH',dateOptions);
    const count=new Intl.NumberFormat('en-CH');
    const labels={youtube:'YouTube',tiktok:'TikTok',instagram:'Instagram',facebook:'Facebook'};
    let connected=0;
    for(const [network, metrics] of Object.entries(snapshot.channels)){
     const statusEl=$(network+'-status');
     const link=$(network+'-link');
     if(metrics.connected){
      connected+=1;
      statusEl.textContent='Live · '+(metrics.name || labels[network]);
      statusEl.style.color='var(--green)';
      if(link){
       link.textContent='Connected · '+ (metrics.name || labels[network]);
       link.removeAttribute('href');
       link.setAttribute('aria-disabled','true');
      }
     }else{
      statusEl.textContent=metrics.configured===false?'Needs app keys': (metrics.error || 'Not connected');
      statusEl.style.color='';
      if(link){
       link.textContent='Connect '+labels[network]+' ↗';
       link.href=metrics.href || ('/api/'+(network==='instagram'||network==='facebook'?'meta':network)+'/start');
      }
     }
     $(''+network+'-views').textContent=metrics.views===null||metrics.views===undefined?'—':count.format(metrics.views);
     $(''+network+'-followers').textContent=metrics.followers===null||metrics.followers===undefined?'—':count.format(metrics.followers);
     $(''+network+'-posts').textContent=metrics.posts===null||metrics.posts===undefined?'—':count.format(metrics.posts);
    }
    if(liveBadge) liveBadge.hidden=connected===0;
    if(connected){
     status.textContent=connected+' of 4 accounts live · Last refresh '+checked+' (Zurich)';
     range.textContent='Stats come from your TikTok, YouTube, Instagram, and Facebook logins — not demo data.';
     range.hidden=false;
     if(access) access.textContent='Your connected accounts are live on this desk. Open demo is still a practice floor. Open Shorts desk to build and auto-post 9:16 videos to these accounts.';
    }else{
     status.textContent='No live accounts yet. Connect TikTok, Instagram, Facebook, and YouTube below.';
     range.textContent='Use the Cursor-hosted app with secrets filled in. GitHub Pages cannot log you in.';
     range.hidden=false;
    }
    const params=new URLSearchParams(window.location.search);
    if(params.get('tiktok')==='connected') toast('TikTok connected · live on this desk.');
    if(params.get('youtube')==='connected') toast('YouTube connected · live on this desk.');
    if(params.get('meta')==='connected') toast('Facebook / Reels connected · live on this desk.');
    if(params.get('tiktok')==='missing'||params.get('youtube')==='missing'||params.get('meta')==='missing'){
     toast('Add the app keys in Cursor Secrets, then connect again.');
    }
    if(params.get('live')==='1' && connected) toast(connected+' live account'+(connected===1?'':'s')+' on this desk.');
    if(params.toString()) window.history.replaceState({}, '', window.location.pathname || './');
   }catch{status.textContent='Could not load live account stats. Reload the page to try again.';}
  }
  loadMetrics();

  const productionStatus = $('production-status');
  const productionList = $('production-list');
  const productionForm = $('production-form');
  let productionId;

  async function productionRequest(input) {
   const options = input ? {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(input)
   } : {cache:'no-store'};
   const response = await fetch('/api/production-jobs', options);
   const data = await response.json();
   if (!response.ok) throw new Error(data.error || 'Auftrag konnte nicht geladen werden.');
   return data;
  }

  function element(tag, content, className) {
   const node = document.createElement(tag);
   if (content) node.textContent = content;
   if (className) node.className = className;
   return node;
  }

  async function refreshProduction() {
   const [{jobs}, publicationsResponse] = await Promise.all([
    productionRequest(), fetch('/api/production-publications',{cache:'no-store'})
   ]);
   if (!publicationsResponse.ok) throw new Error('Veröffentlichungsstatus konnte nicht geladen werden.');
   const {publications} = await publicationsResponse.json();
   productionList.replaceChildren();
   if (!jobs.length) productionList.append(element('p','Noch keine Produktionsaufträge.','setup-note'));
   for (const job of jobs) {
    const article = element('article',null,'panel production-job');
    const story = job.title.startsWith('DailyinfoRH Story ');
    const publication = publications.filter(item => item.job_id === job.id);
    const isRendering = job.render_lease_until && Date.parse(job.render_lease_until) > Date.now();
    const status = job.approved_at ? 'Intern freigegeben' : job.video_de && job.video_en ? 'Bereit zur Prüfung' :
      job.render_error ? 'Renderfehler' : isRendering ? 'Wird gerendert' : 'Wartet auf Produktionslauf';
    article.append(element('h3',job.title),element('p',status,'eyebrow'));
    if (job.render_error) {
     const retry = element('button','Erneut einreihen','btn');
     retry.addEventListener('click',() => changeProduction(retry,{action:'retry',id:job.id,revision:job.revision},'Auftrag erneut eingereiht.'));
     article.append(element('p',job.render_error,'setup-note'),retry);
    }
    const scripts = element('details');
    scripts.append(element('summary','Skripte anzeigen'),element('h4','Deutsch'),element('p',job.script_de),element('h4','Englisch'),element('p',job.script_en));
    article.append(scripts);
    const videos = element('div',null,'production-pair');
    for (const [label,url] of [['Deutsch',job.video_de],['Englisch',job.video_en]]) {
     if (!url) continue;
     const card = element('div');
     const player = element('video');
     player.controls = true;
     player.playsInline = true;
     player.preload = 'none';
     player.src = url;
     player.setAttribute('aria-label',label);
     const download = element('a','MP4 herunterladen');
     download.href = url;
     download.download = '';
     card.append(element('h4',label),player,download);
     videos.append(card);
    }
    if (videos.childElementCount) article.append(videos);
    if (!publication.length) {
     const details = element('details');
     details.append(element('summary',job.video_de ? 'Videos ersetzen' : 'Fertige Videos hinzufügen'));
     const form = element('form');
     for (const [label,name,value] of [['Videolink Deutsch','videoDe',job.video_de],['Videolink Englisch','videoEn',job.video_en]]) {
      const field = element('label',label);
      const input = element('input');
      input.type = 'url';
      input.name = name;
      input.value = value || '';
      input.required = true;
      input.maxLength = 2000;
      field.append(input);
      form.append(field);
     }
     const save = element('button','Videos speichern','btn');
     form.append(save);
     form.addEventListener('submit',event => {
      event.preventDefault();
      changeProduction(save,{...Object.fromEntries(new FormData(form)),action:'attach',id:job.id,revision:job.revision},'Videos gespeichert.');
     });
     details.append(form);
     article.append(details);
    }
    if (job.video_de && job.video_en && !job.approved_at) {
     const approve = element('button',story?'Freigeben und auf vier Kanälen einplanen':'Intern freigeben','btn primary');
     if (story) article.append(element('p','Deutsch und Englisch für Facebook, Instagram, TikTok und YouTube.','setup-note'));
     approve.addEventListener('click',() => changeProduction(approve,{action:story?'approve_publish':'approve',id:job.id,revision:job.revision},story?'Beide Fassungen warten auf die Übergabe an Metricool.':'Auftrag intern freigegeben.'));
     article.append(approve);
    }
    for (const post of publication) {
     const messages={queued:'Wartet auf Metricool',submitting:'Übergabe läuft oder wird geprüft',scheduled:'In Metricool eingeplant',failed:'Übergabe fehlgeschlagen'};
     const label=post.language.toUpperCase()+' · '+messages[post.state];
     article.append(element('p',label+(post.error?' · '+post.error:''),'setup-note'));
    }
    if (job.approved_at) {
     const planner = element('a','Metricool-Planer öffnen');
     planner.href = 'https://app.metricool.com/planner/history?blogId=7959996&userId=6244133';
     article.append(planner);
    }
    productionList.append(article);
   }
  }

  async function changeProduction(button,input,message,onSaved) {
   button.disabled = true;
   try {
    await productionRequest(input);
    onSaved?.();
    await refreshProduction();
    productionStatus.textContent = message;
   } catch(error) {
    productionStatus.textContent = error.message;
   } finally {
    button.disabled = false;
   }
  }

  const onProductionSubmit = (event) => {
   event.preventDefault();
   productionId ??= crypto.randomUUID();
   changeProduction(productionForm.querySelector('button'),{
    ...Object.fromEntries(new FormData(productionForm)),action:'create',id:productionId
   },'Auftrag gespeichert.',() => {
    productionForm.reset();
    productionId = undefined;
   });
  };
  productionForm.addEventListener('submit', onProductionSubmit);
  cleanups.push(() => productionForm.removeEventListener('submit', onProductionSubmit));
  function reloadProduction() {
   return refreshProduction().catch(() => { productionStatus.textContent = 'Aufträge konnten nicht geladen werden. Lade die Seite erneut.'; });
  }
  const refreshBtn = $('production-refresh');
  refreshBtn.addEventListener('click',reloadProduction);
  cleanups.push(() => refreshBtn.removeEventListener('click', reloadProduction));
  reloadProduction();
  async function loadVoiceStatus() {
   try {
    const response = await fetch('/api/production-voice',{cache:'no-store'});
    if (!response.ok) throw new Error('Voice status unavailable');
    const {configured,setupAvailable} = await response.json();
    $('production-voice-settings').hidden = !setupAvailable;
    $('production-voice').textContent = configured
     ? 'Vertonung für neue Aufträge: Seraphina (DE) und Ava (EN).'
     : 'Automatische Vertonung über Microsoft Edge: Seraphina (DE), Ava (EN). Bei einem Sprachfehler stoppt die Produktion.';
   } catch {
    $('production-voice').textContent = 'Status der Vertonung konnte nicht geladen werden.';
   }
  }
  const onVoiceSubmit = async (event) => {
   event.preventDefault();
   const form = event.currentTarget;
   const button = form.querySelector('button');
   const message = $('production-voice-message');
   button.disabled = true;
   message.textContent = 'Azure-Zugang wird geprüft …';
   try {
    const response = await fetch('/api/production-voice-settings',{
     method:'POST', headers:{'Content-Type':'application/json'},
     body:JSON.stringify(Object.fromEntries(new FormData(form)))
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Der Zugang konnte nicht gespeichert werden.');
    message.textContent = 'Beide Stimmen sind verfügbar. Der Zugang wurde gespeichert.';
    form.reset();
    await loadVoiceStatus();
   } catch(error) {
    message.textContent = error.message;
   } finally {
    form.elements.key.value = '';
    button.disabled = false;
   }
  };
  const voiceForm = $('production-voice-form');
  voiceForm.addEventListener('submit', onVoiceSubmit);
  cleanups.push(() => voiceForm.removeEventListener('submit', onVoiceSubmit));
  loadVoiceStatus();

  return () => {
    try { clearTimeout(toastTimer); } catch {}
    try { dialog.close(); } catch {}
    for (const fn of cleanups) {
      try { fn(); } catch {}
    }
  };
}
