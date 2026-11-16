(() => {
const $=id=>document.getElementById(id);
const box=$('humanChatMessages'),form=$('humanChatForm'),input=$('humanChatInput'),status=$('humanChatStatus'),clear=$('humanChatClear');
if(!box||!form)return;
const config=window.MEU_TUTOR_AUTH_CONFIG||{};
const client=window.supabase&&config.supabaseUrl&&config.supabaseAnonKey?window.supabase.createClient(config.supabaseUrl,config.supabaseAnonKey):null;
const key='meuTutorIA.supportHumanConversation.v1';
let active=null,busy=false,loading=false,lastSignature=null;
const stamp=t=>new Date(t).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'medium'});
function note(t){status.textContent=t;}
function bubble(who,body,mine,createdAt){const el=document.createElement('div');el.className='support-bubble'+(mine?' mine':'');const label=document.createElement('strong');label.textContent=who;const p=document.createElement('p');p.textContent=body;el.append(label,p);if(createdAt){const time=document.createElement('small');time.className='muted';time.textContent=stamp(createdAt);el.appendChild(time);}box.appendChild(el);box.scrollTop=box.scrollHeight;}
async function user(){if(!client)throw Error('Serviço indisponível.');const {data,error}=await client.auth.getUser();if(error||!data.user)throw Error('Entre com Google em Meu perfil antes de solicitar atendimento humano.');return data.user;}
async function load(){
if(loading||busy)return;loading=true;
const previous=box.scrollTop,nearBottom=box.scrollHeight-box.scrollTop-box.clientHeight<90;
if(!client){note('Serviço de contas indisponível.');return;}
try{
const me=await user();
const saved=localStorage.getItem(key);
if(saved){const {data,error}=await client.from('support_conversations').select('id,status').eq('id',saved).eq('user_id',me.id).maybeSingle();if(error)throw error;if(data)active=data.id;else{active=null;localStorage.removeItem(key);}}
if(!active){const {data,error}=await client.from('support_conversations').select('id,status').eq('user_id',me.id).order('created_at',{ascending:false}).limit(1);if(error)throw error;if(data?.length){active=data[0].id;localStorage.setItem(key,active);}}
if(!active){if(lastSignature==='empty')return;lastSignature='empty';box.replaceChildren();bubble('🎧 Sistema','Descreva seu problema para abrir um atendimento real. A equipe ainda não está conectada; a resposta não é imediata.',false);note('Nenhum chamado aberto. A primeira mensagem criará um atendimento.');return;}
const {data,error}=await client.from('support_messages').select('sender_id,body,created_at').eq('conversation_id',active).order('created_at',{ascending:true}).limit(100);if(error)throw error;
const signature=active+'|'+JSON.stringify((data||[]).map(m=>[m.sender_id,m.body,m.created_at]));
if(signature===lastSignature)return;
lastSignature=signature;
box.replaceChildren();
if(!data?.length)bubble('🎧 Sistema','Atendimento criado. Envie sua mensagem para a equipe.',false);
else data.forEach(m=>bubble(m.sender_id===me.id?'Você':'🎧 Equipe de suporte',m.body,m.sender_id===me.id,m.created_at));
note('Atendimento registrado no Supabase. A equipe ainda não está conectada; não há resposta imediata.');
}catch(e){note(e.message||'Não foi possível carregar o atendimento.');}
finally{loading=false;if(!nearBottom)box.scrollTop=previous;}
}
form.addEventListener('submit',async e=>{
e.preventDefault();if(busy)return;const value=input.value.trim();if(!value||value.length>1000)return;
busy=true;const send=form.querySelector('button[type=submit]');send.disabled=true;note('Registrando sua mensagem...');
try{
const me=await user();
if(!active){const {data,error}=await client.from('support_conversations').insert({user_id:me.id}).select('id').single();if(error)throw error;active=data.id;localStorage.setItem(key,active);}
const {error}=await client.from('support_messages').insert({conversation_id:active,sender_id:me.id,body:value});if(error)throw error;
input.value='';busy=false;await load();note('Mensagem registrada com sucesso. A equipe responderá quando o atendimento humano estiver disponível.');
}catch(err){note('Não foi possível enviar: '+(err.message||'tente novamente')+'. Sua mensagem foi mantida.');}
finally{busy=false;send.disabled=false;}
});
clear.addEventListener('click',()=>{note('Para preservar seu atendimento, o histórico não será apagado. Você pode continuar a conversa.');});
document.addEventListener('click',e=>{if(e.target instanceof Element&&e.target.closest('[data-go="support-human"],[data-screen="support-human"],#supportTransfer'))load();});
load();
// Consulta periódica enquanto o atendimento estiver aberto; não apaga mensagens nem rascunhos.
setInterval(()=>{if(!document.hidden&&document.getElementById('support-human')?.classList.contains('active')&&!busy)load();},8000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&document.getElementById('support-human')?.classList.contains('active'))load();});
})();