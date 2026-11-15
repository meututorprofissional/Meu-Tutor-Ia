
const KEY='meuTutorIA.v2';
const empty=()=>({topics:[],cards:[],attempts:[]});
let db=load(), currentCard=null, answerShown=false, lastCardId=null;

function load(){try{return {...empty(),...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return empty()}}
function save(){localStorage.setItem(KEY,JSON.stringify(db));render()}
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function id(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function date(d){return new Date(d).toLocaleDateString('pt-BR')}
function topicName(tid){return db.topics.find(t=>t.id===tid)?.name||'Assunto sem nome'}
function go(name){document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.id===name));document.querySelectorAll('nav [data-screen]').forEach(b=>b.classList.toggle('active',b.dataset.screen===name));render()}

document.querySelectorAll('[data-screen]').forEach(b=>b.onclick=()=>go(b.dataset.screen));
document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));

function options(selected=''){return '<option value="">Selecione um assunto</option>'+db.topics.map(t=>`<option value="${t.id}" ${t.id===selected?'selected':''}>${esc(t.name)}</option>`).join('')}
function refreshSelects(){['cardTopic','quizTopic','fcAiTopic'].forEach(id=>{let el=document.getElementById(id);if(!el)return;let old=el.value;el.innerHTML=options(old)})}

document.getElementById('saveStudy').onclick=()=>{
 const name=document.getElementById('topic').value.trim(),source=document.getElementById('source').value.trim(),notes=document.getElementById('notes').value.trim(),rating=document.getElementById('difficulty').value;
 if(!name){document.getElementById('studyMsg').textContent='Digite o nome do assunto.';return}
 let t=db.topics.find(x=>x.name.toLowerCase()===name.toLowerCase());
 if(!t){t={id:id(),name,source,notes,created:new Date().toISOString(),updated:new Date().toISOString(),rating};db.topics.unshift(t)}
 else{t.source=source||t.source;t.notes=notes||t.notes;t.updated=new Date().toISOString();t.rating=rating}
 const studyRating=rating==='ok'?'good':rating==='partial'?'partial':'practice';
 db.attempts.unshift({id:id(),topicId:t.id,type:'study',rating:studyRating,question:'Registro de estudo',answer:notes,reflection:'',date:new Date().toISOString()});
 document.getElementById('studyMsg').textContent='Estudo salvo! Você pode criar cartões ou perguntas sobre esse assunto.';
 document.getElementById('topic').value='';document.getElementById('source').value='';document.getElementById('notes').value='';save();
};

document.getElementById('clearStudy').onclick=()=>{['topic','source','notes'].forEach(x=>document.getElementById(x).value='');document.getElementById('difficulty').value='ok';document.getElementById('studyMsg').textContent='Campos limpos.'};

document.getElementById('saveCard').onclick=()=>{
 const topicId=document.getElementById('cardTopic').value,front=document.getElementById('front').value.trim(),back=document.getElementById('back').value.trim();
 if(!front||!back){document.getElementById('cardMsg').textContent='Preencha a pergunta e a resposta.';return}
 db.cards.unshift({id:id(),topicId,front,back,created:new Date().toISOString(),reviews:0,lastRating:null,nextReview:null});
 document.getElementById('front').value='';document.getElementById('back').value='';document.getElementById('cardMsg').textContent='Cartão salvo.';currentCard=null;lastCardId=null;save();
};

document.getElementById('showAnswer').onclick=()=>{answerShown=true;renderCard()};
const PRACTICE_MODE_KEY='meuTutorIA.practiceMode';
let practiceMode=localStorage.getItem(PRACTICE_MODE_KEY)==='back'?'back':'front';
const myAnswerEl=document.getElementById('myAnswer');
const myAnswerLabel=document.getElementById('myAnswerLabel');
const swapModeButton=document.getElementById('swapMode');
if(swapModeButton)swapModeButton.onclick=()=>{practiceMode=practiceMode==='front'?'back':'front';localStorage.setItem(PRACTICE_MODE_KEY,practiceMode);answerShown=false;if(myAnswerEl)myAnswerEl.value='';swapModeButton.textContent=practiceMode==='front'?'🔄 Trocar: ver a resposta e escrever a pergunta':'🔄 Trocar: ver a pergunta e escrever a resposta';renderCard()};

// Escolhe qual cartão mostrar na prática.
// - Sem cartão anterior (primeira vez): mostra o primeiro cartão com revisão vencida,
//   ou o primeiro da lista se nenhum estiver vencido.
// - Com cartão anterior: mostra o cartão seguinte da lista e, depois do último,
//   volta ao primeiro. Assim passa por TODOS os cartões salvos antes de repetir.
function pickCard(afterId=null){
 const total=db.cards.length;
 if(!total)return null;

 const start=db.cards.findIndex(c=>c.id===afterId);
 if(start===-1){
  const now=Date.now();
  return db.cards.find(c=>!c.nextReview||new Date(c.nextReview).getTime()<=now)||db.cards[0];
 }

 return db.cards[(start+1)%total];
}

function renderCard(){
 const el=document.getElementById('practiceCard');
 currentCard=(currentCard&&db.cards.find(c=>c.id===currentCard.id))||pickCard(lastCardId);
 if(currentCard)lastCardId=currentCard.id;
 if(!currentCard){
  el.innerHTML='<div class="empty">Você ainda não tem cartões. Crie o primeiro acima.</div>';
  if(myAnswerLabel)myAnswerLabel.textContent='Sua resposta';
  return;
 }
 const prompt=practiceMode==='front'?currentCard.front:currentCard.back;
 const expected=practiceMode==='front'?currentCard.back:currentCard.front;
 if(myAnswerLabel)myAnswerLabel.textContent=practiceMode==='front'?'Sua resposta':'Sua pergunta';
 if(myAnswerEl)myAnswerEl.placeholder=practiceMode==='front'?'Escreva a resposta com suas palavras, sem olhar.':'Escreva a pergunta que corresponde à resposta exibida.';
 el.innerHTML='<span class="pill">'+esc(topicName(currentCard.topicId))+'</span><h3>'+esc(prompt)+'</h3>'+(!answerShown?'<p class="muted">Tente responder com suas palavras antes de conferir.</p>':'<div class="compare"><div class="mine"><strong>Sua resposta</strong><p>'+esc(myAnswerEl?myAnswerEl.value.trim():'')+'</p></div><div class="right"><strong>Resposta esperada</strong><p>'+esc(expected)+'</p></div></div>');
}
function rateCard(r){
 if(!currentCard)return;

 let days=r==='easy'?3:1;
 currentCard.reviews=(currentCard.reviews||0)+1;
 currentCard.lastRating=r;
 currentCard.nextReview=new Date(Date.now()+days*86400000).toISOString();

 db.attempts.unshift({
  id:id(),
  topicId:currentCard.topicId,
  type:'flashcard',
  rating:r==='easy'?'good':'practice',
  question:practiceMode==='front'?currentCard.front:currentCard.back,
  answer:myAnswerEl?myAnswerEl.value.trim():'',
  expectedAnswer:practiceMode==='front'?currentCard.back:currentCard.front,
  practiceMode,
  reflection:'',
  date:new Date().toISOString()
 });

 currentCard=null;
 answerShown=false;
 if(myAnswerEl)myAnswerEl.value='';
 save();
}

document.getElementById('nextCard').onclick=()=>{
 currentCard=null;
 answerShown=false;
 if(myAnswerEl)myAnswerEl.value='';
 renderCard();
};
window.practiceNow=()=>{go('cards');currentCard=null;lastCardId=null;answerShown=false;if(myAnswerEl)myAnswerEl.value='';renderCard();const panel=document.getElementById('practicePanel');if(panel)panel.scrollIntoView({behavior:'smooth',block:'start'});};

document.getElementById('cardEasy').onclick=()=>rateCard('easy');
document.getElementById('cardHard').onclick=()=>rateCard('hard');

document.getElementById('saveQuiz').onclick=()=>{
 const topicId=document.getElementById('quizTopic').value,question=document.getElementById('question').value.trim(),answer=document.getElementById('answer').value.trim(),rating=document.getElementById('rating').value,reflection=document.getElementById('reflection').value.trim();
 if(!question||!answer){document.getElementById('quizMsg').textContent='Preencha a pergunta e sua resposta antes de registrar.';return}
 db.attempts.unshift({id:id(),topicId,type:'quiz',rating,question,answer,reflection,date:new Date().toISOString()});
 document.getElementById('question').value='';document.getElementById('answer').value='';document.getElementById('reflection').value='';document.getElementById('quizMsg').textContent='Tentativa registrada. Confira sua resposta com o material original e anote o que faltou.';save();
};

function render(){
 refreshSelects();

 document.getElementById('studyList').innerHTML=db.topics.length?db.topics.map(t=>`<div class="item"><strong>${esc(t.name)}</strong><span class="muted">Atualizado: ${date(t.updated||t.created)}</span><p>${esc((t.notes||'Sem anotações registradas').slice(0,220))}</p><button class="secondary" onclick="editTopic('${t.id}')">Ver / editar</button> <button class="secondary" onclick="makeQuiz('${t.id}')">Criar teste</button></div>`).join(''):'<div class="empty">Nenhum assunto registrado ainda.</div>';

 document.getElementById('cardList').innerHTML=db.cards.length?db.cards.map(c=>`<div class="item"><strong>${esc(c.front)}</strong><p>${esc(c.back)}</p><span class="muted">${esc(topicName(c.topicId))} · revisões: ${c.reviews||0}</span></div>`).join(''):'<div class="empty">Nenhum cartão salvo.</div>';

 document.getElementById('quizList').innerHTML=db.attempts.filter(a=>a.type==='quiz').slice(0,8).map(a=>`<div class="item"><strong>${esc(a.question)}</strong><p>${esc(a.answer)}</p><span class="pill">${a.rating==='good'?'Consegui explicar':a.rating==='partial'?'Lembrei parcialmente':'Preciso praticar'}</span> <span class="muted">${date(a.date)} · ${esc(topicName(a.topicId))}</span>${a.reflection?`<p><strong>Para revisar:</strong> ${esc(a.reflection)}</p>`:''}</div>`).join('')||'<div class="empty">Ainda não há testes registrados.</div>';

 let good=db.attempts.filter(a=>a.rating==='good').length,practice=db.attempts.filter(a=>['practice','partial','hard'].includes(a.rating)).length,due=db.cards.filter(c=>!c.nextReview||new Date(c.nextReview)<=new Date()).length;

 document.getElementById('statTopics').textContent=db.topics.length;
 document.getElementById('statCards').textContent=db.cards.length;
 document.getElementById('statAttempts').textContent=db.attempts.length;
 document.getElementById('statGood').textContent=good;
 document.getElementById('statPractice').textContent=practice;
 document.getElementById('statReviews').textContent=due;

 const reviews=db.cards.filter(c=>!c.nextReview||new Date(c.nextReview)<=new Date());

 document.getElementById('reviewList').innerHTML=reviews.length?reviews.map(c=>`<div class="item"><strong>${esc(c.front)}</strong><span class="muted">${esc(topicName(c.topicId))} · ${c.nextReview?'revisão programada':'ainda não revisado'}</span></div>`).join(''):'<div class="success">Nenhuma revisão de cartão vencida agora. Você pode continuar estudando ou fazer um teste de recordação.</div>';

 document.getElementById('homeReviews').innerHTML=reviews.length?`Você tem ${reviews.length} cartão(ões) para revisar.`:'Nenhum cartão vencido agora. Continue praticando!';

 document.getElementById('topicProgress').innerHTML=db.topics.length?db.topics.map(t=>{let a=db.attempts.filter(x=>x.topicId===t.id);return `<div class="item"><strong>${esc(t.name)}</strong><p>${a.length} registro(s) · ${a.filter(x=>x.rating==='good').length} marcado(s) “Consegui explicar” · ${a.filter(x=>['practice','partial','hard'].includes(x.rating)).length} marcado(s) para praticar</p><span class="muted">Lembre-se: são autoavaliações, não correção automática.</span></div>`}).join(''):'<div class="empty">Registre um assunto para começar a acompanhar sua evolução.</div>';

 renderCard();
}

window.editTopic=(tid)=>{let t=db.topics.find(x=>x.id===tid);if(!t)return;go('study');document.getElementById('topic').value=t.name;document.getElementById('source').value=t.source||'';document.getElementById('notes').value=t.notes||'';document.getElementById('difficulty').value=t.rating||'ok'};
window.makeQuiz=(tid)=>{go('quiz');document.getElementById('quizTopic').value=tid;document.getElementById('question').focus()};

document.getElementById('export').onclick=()=>{let blob=new Blob([JSON.stringify({version:2,exportedAt:new Date().toISOString(),data:db},null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='meu-tutor-ia-backup.json';a.click();URL.revokeObjectURL(a.href);document.getElementById('backupMsg').textContent='Backup exportado. Guarde o arquivo em local seguro.'};

document.getElementById('importFile').onchange=async e=>{
 let f=e.target.files[0];
 if(!f)return;
 try{
  let parsed=JSON.parse(await f.text()),incoming=parsed.data||parsed;
  if(!Array.isArray(incoming.topics)||!Array.isArray(incoming.cards)||!Array.isArray(incoming.attempts))throw Error();
  if(!confirm('Importar substituirá os dados atuais deste navegador. Deseja continuar?'))return;
  db=incoming;
  save();
  document.getElementById('backupMsg').textContent='Backup importado.';
 }catch{
  document.getElementById('backupMsg').textContent='Não foi possível importar. Escolha um backup JSON válido do Meu Tutor IA.';
 }
 e.target.value='';
};

document.getElementById('erase').onclick=()=>{
 if(confirm('Tem certeza? Todos os estudos, cartões e tentativas deste navegador serão apagados. Exporte um backup antes, se quiser guardá-los.')){
  db=empty();
  save();
  document.getElementById('backupMsg').textContent='Dados deste navegador apagados.';
 }
};

render();
