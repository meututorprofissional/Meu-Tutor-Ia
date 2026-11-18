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
function renderAchievements(){
 let data={topics:[],cards:[],attempts:[]};try{data={...data,...JSON.parse(localStorage.getItem('meuTutorIA.v2')||'{}')};}catch{}
 let done=false;try{done=!!JSON.parse(localStorage.getItem(key)||'{}').done;}catch{}
 const badges=[['🌱 Primeiro estudo',Array.isArray(data.topics)&&data.topics.length>0],['🗂️ Primeiro flashcard',Array.isArray(data.cards)&&data.cards.length>0],['✍️ Primeira tentativa',Array.isArray(data.attempts)&&data.attempts.length>0],['🎓 Primeiros passos',done]];
 $('guideAchievements').textContent='';
 badges.forEach(([name,unlocked])=>{const el=document.createElement('p');el.textContent=(unlocked?'🏅 ':'🔒 ')+name+(unlocked?' — conquistado':' — bloqueado');$('guideAchievements').appendChild(el);});
}
document.querySelector('nav [data-screen="guide"]')?.addEventListener('click',renderAchievements);
show();renderAchievements();
})();