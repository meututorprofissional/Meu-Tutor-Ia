(() => {
  const form=document.getElementById('feedbackForm');
  if(!form)return;
  const status=document.getElementById('feedbackStatus');
  const button=document.getElementById('feedbackSubmit');
  const config=window.MEU_TUTOR_AUTH_CONFIG||{};
  const lastKey='meuTutorIA.feedback.lastSent';
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(!form.reportValidity())return;
    const kind=document.getElementById('feedbackKind').value;
    const subject=document.getElementById('feedbackSubject').value.trim();
    const message=document.getElementById('feedbackMessage').value.trim();
    if(!['erro','melhoria','comentario'].includes(kind)||subject.length<4||message.length<10){
      status.textContent='Preencha o assunto e a descrição antes de enviar.';return;
    }
    const last=Number(localStorage.getItem(lastKey)||0);
    if(Date.now()-last<60000){status.textContent='Aguarde um minuto antes de enviar outro relato.';return;}
    if(!config.supabaseUrl||!config.supabaseAnonKey){
      status.textContent='O envio ainda não está configurado. Tente novamente mais tarde.';return;
    }
    button.disabled=true;
    status.textContent='Enviando seu relato...';
    try{
      const response=await fetch(config.supabaseUrl+'/rest/v1/tutor_feedback',{
        method:'POST',
        headers:{'apikey':config.supabaseAnonKey,'Content-Type':'application/json','Prefer':'return=minimal'},
        body:JSON.stringify({kind,subject,message})
      });
      if(!response.ok)throw new Error('HTTP '+response.status);
      localStorage.setItem(lastKey,String(Date.now()));
      form.reset();
      status.textContent='Relato enviado com sucesso! Obrigado por ajudar a melhorar o Meu Tutor IA. 💜';
    }catch(error){
      console.error('Falha ao enviar feedback',error);
      status.textContent='Não foi possível enviar agora. Verifique sua conexão e tente novamente. Seu texto continua preenchido.';
    }finally{button.disabled=false;}
  });
})();