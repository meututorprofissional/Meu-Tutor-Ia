(() => {
  const form = document.getElementById('feedbackForm');
  if (!form) return;
  const status = document.getElementById('feedbackStatus');
  const button = document.getElementById('feedbackSubmit');
  const config = window.MEU_TUTOR_AUTH_CONFIG || {};
  const lastKey = 'meuTutorIA.feedback.lastSent';
  const resetChallenge = () => { if (window.turnstile && typeof window.turnstile.reset === 'function') window.turnstile.reset(); };
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const kind = document.getElementById('feedbackKind').value;
    const subject = document.getElementById('feedbackSubject').value.trim();
    const message = document.getElementById('feedbackMessage').value.trim();
    if (!['erro', 'melhoria', 'comentario'].includes(kind) || subject.length < 4 || message.length < 10) {
      status.textContent = 'Preencha o assunto e a descrição antes de enviar.'; return;
    }
    if (Date.now() - Number(localStorage.getItem(lastKey) || 0) < 60000) {
      status.textContent = 'Aguarde um minuto antes de enviar outro relato.'; return;
    }
    if (!config.supabaseUrl) {
      status.textContent = 'O envio ainda não está configurado. Tente novamente mais tarde.'; return;
    }
    const token = window.turnstile && typeof window.turnstile.getResponse === 'function' ? window.turnstile.getResponse() : '';
    if (!token) {
      status.textContent = 'Conclua a verificação de segurança antes de enviar. Se ela não aparecer, recarregue a página.'; return;
    }
    button.disabled = true;
    status.textContent = 'Verificando e enviando seu relato...';
    try {
      const response = await fetch(config.supabaseUrl + '/functions/v1/enviar-feedback-seguro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, subject, message, turnstileToken: token })
      });
      if (response.status === 429) { status.textContent = 'Limite de envios atingido. Aguarde um pouco e tente novamente.'; return; }
      if (!response.ok) throw new Error('HTTP ' + response.status);
      localStorage.setItem(lastKey, String(Date.now()));
      form.reset();
      status.textContent = 'Relato enviado com sucesso! Obrigado por ajudar a melhorar o Meu Tutor IA. 💜';
    } catch (error) {
      console.error('Falha ao enviar feedback', error);
      status.textContent = 'Não foi possível enviar agora. Confira a verificação de segurança e tente novamente. Seu texto continua preenchido.';
    } finally {
      resetChallenge();
      button.disabled = false;
    }
  });
})();