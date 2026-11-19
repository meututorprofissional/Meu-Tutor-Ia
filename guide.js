(() => {
'use strict';
const $ = id => document.getElementById(id);
const lessons = [
 ['Boas-vindas','Aqui você aprende a usar o Meu Tutor IA. O tutorial é opcional e pode ser retomado a qualquer momento.',null],
 ['Meu estudo','Abra Meu estudo para cadastrar o assunto, o material original e suas anotações. Estude primeiro e escreva o que entendeu.','study'],
 ['Flashcards','Abra Flashcards para criar ou revisar cartões de pergunta e resposta. Use Lembrei ou Preciso praticar para registrar sua revisão.','cards'],
 ['Teste','Abra Teste para praticar sua recordação. Responda sem consultar e depois confira o material original.','quiz'],
 ['Progresso','Abra Progresso para acompanhar seus registros, metas e revisões. Autoavaliações não são notas calculadas pela IA.','progress'],
 ['Concluído','Parabéns! Você conheceu as principais áreas. Pode voltar ao Tutor de ajuda quando quiser.','guide']
];
const key='meuTutorIA.guide.v1'; let step=0;
try { const saved=JSON.parse(localStorage.getItem(key)||'{}');if(Number.isInteger(saved.step))step=Math.max(0,Math.min(lessons.length-1,saved.step)); } catch {}
function save(done=false){try{localStorage.setItem(key,JSON.stringify({step,done}));}catch{}}
function show(){
 const [title,description,target]=lessons[step];
 $('guideLesson').innerHTML='<strong>Etapa '+(step+1)+' de '+lessons.length+': '+title+'</strong><p>'+description+'</p>'+(target?'<p>Toque em <strong>Abrir '+title+'</strong> para conhecer a aba. Depois volte aqui para continuar.</p><button type="button" id="guideOpenTarget" class="secondary">Abrir '+title+'</button>':'');
 $('guidePrevious').disabled=step===0;
 $('guideNext').textContent=step===lessons.length-1?'Concluir ✓':'Próximo →';
 const open=$('guideOpenTarget');
 if(open)open.onclick=()=>{const tab=document.querySelector('nav [data-screen="'+target+'"]');if(tab)tab.click();};
}
$('guideStart').onclick=()=>{step=0;save();show();};
$('guideRestart').onclick=()=>{step=0;save();show();};
$('guideSkip').onclick=()=>{save(true);$('guideLesson').textContent='Tutorial pulado. Você pode recomeçar quando quiser.';renderAchievements();};
$('guidePrevious').onclick=()=>{step=Math.max(0,step-1);save();show();};
$('guideNext').onclick=()=>{if(step===lessons.length-1){save(true);$('guideLesson').textContent='🎉 Tutorial concluído! Conquista Primeiros passos desbloqueada.';renderAchievements();}else{step++;save();show();}};
const rules=[
 [/flashcard|cart[aã]o|cart[oõ]es/i,'Abra Flashcards, selecione um assunto e crie cartões. Para praticar, responda sem olhar e depois toque em Mostrar resposta.'],
 [/estud|assunto|material|anota/i,'Em Meu estudo, cadastre o assunto e o material original. Depois registre suas próprias anotações para estudar com mais clareza.'],
 [/test|pergunta|resposta|quiz/i,'Na aba Teste, selecione um assunto, gere uma pergunta e responda sem consultar. A avaliação da IA é orientativa; confira o material original.'],
 [/progres|meta|revis|evolu/i,'Na aba Progresso, veja seus registros, cartões vencidos, próximas revisões e a meta semanal.'],
 [/perfil|conta|foto/i,'Abra o menu do perfil no canto superior para personalizar seu perfil e acessar configurações.'],
 [/atualiz|vers[aã]o|instal/i,'Use Verificar atualização na parte superior do aplicativo. Os dados locais são mantidos durante atualizações normais.'],
 [/ajuda|suporte|problema|erro/i,'Use Ajuda e feedback para relatar problemas ou Central de atendimento para buscar suporte.']
];
$('guideAsk').onclick=()=>{const q=$('guideQuestion').value.trim();if(!q){$('guideReply').textContent='Escreva sua dúvida primeiro.';return;} const match=rules.find(([re])=>re.test(q));$('guideReply').textContent=match?match[1]:'Ainda não tenho uma resposta preparada para essa pergunta. Experimente perguntar sobre Meu estudo, Flashcards, Teste, Progresso ou perfil. Você também pode usar Ajuda e feedback.';};

function achievementData(){
 let data={topics:[],cards:[],attempts:[]};try{data={...data,...JSON.parse(localStorage.getItem('meuTutorIA.v2')||'{}')};}catch{}
 let done=false;try{done=!!JSON.parse(localStorage.getItem(key)||'{}').done;}catch{}
 const topics=Array.isArray(data.topics)?data.topics:[],cards=Array.isArray(data.cards)?data.cards:[],attempts=Array.isArray(data.attempts)?data.attempts:[];
 const days=new Set(attempts.filter(a=>a&&a.date&&!Number.isNaN(new Date(a.date).getTime())).map(a=>new Date(a.date).toLocaleDateString('en-CA'))).size;
 const reviews=attempts.filter(a=>a&&a.type==='flashcard').length;
 return [
 {icon:'🌱',name:'Primeiro estudo',value:topics.length,target:1,unit:'assunto'},
 {icon:'📚',name:'Primeiro flashcard',value:cards.length,target:1,unit:'cartão'},
 {icon:'✍️',name:'Primeira tentativa',value:attempts.length,target:1,unit:'tentativa'},
 {icon:'🎓',name:'Primeiros passos',value:done?1:0,target:1,unit:'tutorial concluído'},
 {icon:'🔥',name:'7 dias ativos',value:days,target:7,unit:'dias com registros'},
 {icon:'🏅',name:'10 revisões',value:reviews,target:10,unit:'revisões registradas'},
 {icon:'💎',name:'100 cartões',value:cards.length,target:100,unit:'cartões salvos'}
 ];
}
function renderProfileAchievements(){
 const grid=$('profileAchievementGrid'),summary=$('profileAchievementSummary'),next=$('profileAchievementNext');if(!grid||!summary||!next)return;
 const badges=achievementData(),unlocked=badges.filter(b=>b.value>=b.target).length;
 summary.textContent=unlocked+' de '+badges.length+' conquistas desbloqueadas neste navegador.';
 grid.replaceChildren();
 const savedEmblemKey='meuTutorIA.featuredAchievement.v1';
 const current=localStorage.getItem(savedEmblemKey);
 const selected=badges.find(b=>b.name===current&&b.value>=b.target)||badges.find(b=>b.value>=b.target);
 const featured=$('profileFeaturedEmblem'),featuredTitle=$('profileFeaturedTitle'),featuredHint=$('profileFeaturedHint');
 if(featured)featured.textContent=selected?.icon||'🏆';
 if(featuredTitle)featuredTitle.textContent=selected?.name||'Sua primeira conquista';
 if(featuredHint)featuredHint.textContent=selected?'🏅 Conquista escolhida em Minhas conquistas':'Estude para desbloquear medalhas';
 const featuredCard=featured?.closest('.profile-hero-badge');
 if(featuredCard){featuredCard.classList.toggle('has-featured-achievement',Boolean(selected));featuredCard.setAttribute('aria-label',selected?'Conquista em destaque: '+selected.name:'Nenhuma conquista desbloqueada');}
 const xpPanel=$('profileXpPanel');
 if(xpPanel){
   let saved={topics:[],cards:[],attempts:[]};try{saved={...saved,...JSON.parse(localStorage.getItem('meuTutorIA.v2')||'{}')}}catch{}
   const topics=Array.isArray(saved.topics)?saved.topics.length:0;
   const cards=Array.isArray(saved.cards)?saved.cards.length:0;
   const attempts=Array.isArray(saved.attempts)?saved.attempts.length:0;
   const xp=topics*20+cards*5+attempts*10;
   const level=Math.floor(xp/1000)+1;
   const inLevel=xp%1000;
   const percent=inLevel/10;
   $('profileLevelNumber').textContent='Nível '+level;
   $('profileXpValue').textContent=inLevel.toLocaleString('pt-BR')+' / 1.000 XP';
   $('profileXpBar').style.width=percent+'%';
   $('profileXpMeter').setAttribute('aria-valuenow',String(inLevel));
   const secondaryBar=$('profileXpBarSecondary'),secondaryLevel=$('profileLevelSecondary'),secondaryValue=$('profileXpSecondary');
   if(secondaryBar)secondaryBar.style.width=percent+'%';
   if(secondaryLevel)secondaryLevel.textContent='Nível '+level;
   if(secondaryValue)secondaryValue.textContent=inLevel.toLocaleString('pt-BR')+' / 1.000 XP';
 }
 // A prévia completa do Beta começa sempre recolhida; abrir é escolha explícita.
 const betaDemo=$('profileBetaDemo');
 const betaButton=$('profileBetaPreviewButton');
 const betaSettings=betaButton?.closest('.profile-preview-settings');
 if(betaDemo && betaSettings && betaDemo.parentElement!==betaSettings) betaSettings.appendChild(betaDemo);
 if(betaDemo) betaDemo.hidden=true;
 if(betaButton){
   betaButton.setAttribute('aria-expanded','false');
   betaButton.onclick=()=>{
     if(!betaDemo)return;
     betaDemo.hidden=!betaDemo.hidden;
     const open=!betaDemo.hidden;
     betaButton.textContent=open?'👑 Ocultar emblema completo':'👑 Ver emblema completo';
     betaButton.setAttribute('aria-expanded',String(open));
   };
 }

 // A data oficial pertence exclusivamente ao profile.js (Supabase Auth).
 const heroStats=$('profileHeroStats');if(heroStats){let data={};try{data=JSON.parse(localStorage.getItem('meuTutorIA.v2')||'{}');}catch{}const entries=[['📚',Array.isArray(data.topics)?data.topics.length:0,'Assuntos'],['🗂️',Array.isArray(data.cards)?data.cards.length:0,'Cartões'],['🎯',Array.isArray(data.attempts)?data.attempts.length:0,'Tentativas'],['🏆',unlocked+'/'+badges.length,'Conquistas']];heroStats.replaceChildren();entries.forEach(([icon,value,label])=>{const item=document.createElement('span');item.textContent=icon+' '+value;const small=document.createElement('small');small.textContent=label;item.appendChild(small);heroStats.appendChild(item);});}
 badges.forEach(b=>{const earned=b.value>=b.target,card=document.createElement('div');card.className='profile-achievement-item'+(earned?'':' is-locked');const emoji=document.createElement('span');emoji.className='profile-achievement-emoji';emoji.textContent=earned?b.icon:'🔒';const title=document.createElement('strong');title.textContent=b.name;const info=document.createElement('small');info.textContent=earned?'🏅 Conquistada':Math.min(b.value,b.target)+' de '+b.target+' '+b.unit;card.append(emoji,title,info);if(earned){if(selected?.name===b.name)card.classList.add('is-selected');const button=document.createElement('button');button.type='button';button.className='secondary';button.textContent=selected?.name===b.name?'✓ Em destaque':'Destacar no perfil';button.disabled=selected?.name===b.name;button.setAttribute('aria-label','Destacar '+b.name+' no perfil');button.onclick=()=>{localStorage.setItem(savedEmblemKey,b.name);renderProfileAchievements();};card.appendChild(button);}grid.appendChild(card);});
 const upcoming=badges.filter(b=>b.value<b.target).sort((a,b)=>(b.value/b.target)-(a.value/a.target))[0];next.replaceChildren();if(!upcoming){next.textContent='🎉 Todas as conquistas disponíveis foram desbloqueadas!';return;}
 const heading=document.createElement('strong');heading.textContent='🎯 Próxima conquista: '+upcoming.name;const info=document.createElement('p');info.textContent=upcoming.value+' de '+upcoming.target+' '+upcoming.unit;const meter=document.createElement('div');meter.className='profile-achievement-meter';meter.setAttribute('role','progressbar');meter.setAttribute('aria-label',upcoming.name);meter.setAttribute('aria-valuemin','0');meter.setAttribute('aria-valuemax',String(upcoming.target));meter.setAttribute('aria-valuenow',String(Math.min(upcoming.value,upcoming.target)));const bar=document.createElement('span');bar.style.width=Math.max(0,Math.min(100,upcoming.value/upcoming.target*100))+'%';meter.appendChild(bar);next.append(heading,meter,info);
}
document.addEventListener('click',event=>{if(event.target.closest('[data-go="profile"],[data-account-action="profile"]'))setTimeout(renderProfileAchievements,0);});
window.addEventListener('storage',renderProfileAchievements);
function renderAchievements(){
 let data={topics:[],cards:[],attempts:[]};try{data={...data,...JSON.parse(localStorage.getItem('meuTutorIA.v2')||'{}')};}catch{}
 let done=false;try{done=!!JSON.parse(localStorage.getItem(key)||'{}').done;}catch{}
 const badges=[['🌱 Primeiro estudo',Array.isArray(data.topics)&&data.topics.length>0],['🗂️ Primeiro flashcard',Array.isArray(data.cards)&&data.cards.length>0],['✍️ Primeira tentativa',Array.isArray(data.attempts)&&data.attempts.length>0],['🎓 Primeiros passos',done]];
 $('guideAchievements').textContent='';
 badges.forEach(([name,unlocked])=>{const el=document.createElement('p');el.textContent=(unlocked?'🏅 ':'🔒 ')+name+(unlocked?' — conquistado':' — bloqueado');$('guideAchievements').appendChild(el);});
}
document.querySelector('nav [data-screen="guide"]')?.addEventListener('click',renderAchievements);
show();renderAchievements();renderProfileAchievements();
})();