(() => {
  const log = document.getElementById('supportChatMessages');
  const input = document.getElementById('supportChatInput');
  const status = document.getElementById('supportChatStatus');
  if (!log || !input || !status) return;
  let humanRequested = false;
  function message(who, body) {
    const el = document.createElement('div');
    el.className = 'item';
    el.style.margin = '0';
    el.style.background = who === 'Você' ? '#eef2ff' : '#fff';
    const label = document.createElement('strong');
    label.textContent = who;
    const text = document.createElement('p');
    text.textContent = body;
    text.style.whiteSpace = 'pre-wrap';
    el.append(label, text);
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
  }
  function reset() {
    humanRequested = false;
    log.replaceChildren();
    input.value = '';
    message('🤖 Assistente virtual — demonstração', 'Olá! 💜 Posso orientar sobre estudos, flashcards, testes e uso do aplicativo. Você também pode pedir atendimento humano a qualquer momento.');
    status.textContent = 'Prévia local: sem IA conectada, sem atendente online e sem envio de chamados.';
  }
  document.getElementById('supportChatAI').addEventListener('click', () => {
    message('🤖 Assistente virtual — demonstração', 'Escolha um assunto e descreva o problema. Nesta prévia ainda não há respostas geradas por IA.');
  });
  document.getElementById('supportChatHuman').addEventListener('click', () => {
    humanRequested = true;
    message('🎧 Atendimento humano — demonstração', 'Você escolheu falar com uma pessoa. Na versão futura, o pedido será encaminhado à equipe e o histórico da conversa será mantido. Nenhum pedido real foi criado agora.');
    status.textContent = 'Atendimento humano simulado; não há ninguém conectado a esta conversa.';
  });
  document.getElementById('supportChatSend').addEventListener('click', () => {
    const value = input.value.trim();
    if (!value) { status.textContent = 'Digite uma mensagem para testar.'; return; }
    message('Você', value);
    input.value = '';
    message('🤖 Assistente virtual — demonstração', humanRequested
      ? 'Sua mensagem apareceu nesta prévia. Quando o atendimento real estiver pronto, ela poderá ser encaminhada ao atendente. Por enquanto, use “Enviar novo relato” para contatar o suporte.'
      : 'Mensagem recebida apenas nesta demonstração. Ainda não analiso problemas de verdade aqui. Para enviar um relato real, use “Enviar novo relato”.');
    status.textContent = 'Mensagem exibida somente nesta página; não foi enviada.';
  });
  document.getElementById('supportChatClear').addEventListener('click', reset);
  reset();
})();