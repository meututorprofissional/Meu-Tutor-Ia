(() => {
const $=id=>document.getElementById(id);
const ai=$('supportChatMessages'),human=$('humanChatMessages');
if(!ai||!human)return;
let aiHistory=[],humanHistory=[],transferred=false;
function bubble(parent,who,body,mine=false){const el=document.createElement('div');el.className='support-bubble'+(mine?' mine':'');const label=document.createElement('strong');label.textContent=who;const p=document.createElement('p');p.textContent=body;el.append(label,p);parent.appendChild(el);parent.scrollTop=parent.scrollHeight;}
function show(parent,items){parent.replaceChildren();items.forEach(m=>bubble(parent,m.who,m.body,m.mine));}
function record(items,parent,who,body,mine=false){items.push({who,body,mine});show(parent,items);}
function resetAI(){aiHistory=[];record(aiHistory,ai,'🤖 Assistente virtual','Olá! 💜 Como posso ajudar? Se não conseguirmos resolver, você pode transferir para um atendente.');$('supportChatInput').value='';$('supportChatStatus').textContent='Prévia: IA não conectada. Nenhuma mensagem foi enviada.';}
function resetHuman(){humanHistory=[];transferred=false;record(humanHistory,human,'🎧 Sistema de atendimento','Esta é a página exclusiva do atendimento humano. Nenhum funcionário está conectado nesta demonstração.');$('humanChatInput').value='';$('humanChatStatus').textContent='Nenhum chamado ou mensagem real foi enviado.';}
$('supportChatForm').addEventListener('submit',e=>{e.preventDefault();const v=$('supportChatInput').value.trim();if(!v)return;record(aiHistory,ai,'Você',v,true);$('supportChatInput').value='';record(aiHistory,ai,'🤖 Assistente virtual','Esta é uma demonstração visual, ainda sem IA conectada. Você pode solicitar atendimento humano no botão abaixo.');});
$('humanChatForm').addEventListener('submit',e=>{e.preventDefault();const v=$('humanChatInput').value.trim();if(!v)return;record(humanHistory,human,'Você',v,true);$('humanChatInput').value='';record(humanHistory,human,'🎧 Sistema de atendimento','Mensagem exibida apenas nesta prévia. Nenhum atendente foi notificado. Para atendimento real, use Enviar relato.');});
$('supportTransfer').addEventListener('click',()=>{if(!transferred){humanHistory=[{who:'🎧 Sistema de atendimento',body:'Transferência simulada da IA. Abaixo está o histórico da conversa anterior, identificado como contexto. Nenhum atendente foi notificado.',mine:false},...aiHistory.map(m=>({who:'Histórico IA · '+m.who,body:m.body,mine:m.mine}))];transferred=true;}show(human,humanHistory);$('humanChatStatus').textContent='Histórico da IA copiado nesta prévia; não foi enviado à equipe.';const btn=document.querySelector('[data-go="support-human"]');if(btn)btn.click();});
$('supportChatClear').addEventListener('click',resetAI);$('humanChatClear').addEventListener('click',resetHuman);
resetAI();resetHuman();
})();