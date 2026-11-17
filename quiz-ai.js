(() => {
  const mode = document.getElementById('quizMode');
  const controls = document.getElementById('quizAiControls');
  const button = document.getElementById('quizGenerate');
  const status = document.getElementById('quizAiStatus');
  const question = document.getElementById('question');
  const topicSelect = document.getElementById('quizTopic');
  const answer = document.getElementById('answer');
  const rating = document.getElementById('rating');
  const reflection = document.getElementById('reflection');
  if (!mode || !button || !topicSelect || !question) return;
  let generatedTopic = '', generatedQuestion = '';
  const syncMode = () => {
    const ai = mode.value === 'ai';
    controls.hidden = !ai;
    question.readOnly = ai;
    question.placeholder = ai ? 'Toque em Gerar pergunta com IA.' : 'Escreva sua pergunta.';
    if (generatedQuestion && question.value === generatedQuestion) question.value = '';
    generatedQuestion = ''; generatedTopic = '';
    status.textContent = 'Selecione um assunto com material salvo e gere uma pergunta.';
  };
  mode.addEventListener('change', syncMode);
  syncMode();
  button.addEventListener('click', async () => {
    const topicId = topicSelect.value;
    let data;
    try { data = JSON.parse(localStorage.getItem('meuTutorIA.v2') || '{}'); }
    catch { data = {}; }
    const topic = (Array.isArray(data.topics) ? data.topics : []).find(t => t.id === topicId);
    if (!topic) { status.textContent = 'Selecione um assunto salvo em Meu estudo.'; return; }
    const source = String(topic.source || '').trim();
    if (!source) { status.textContent = 'Este assunto não possui material original salvo. Adicione o texto em Meu estudo antes de gerar perguntas.'; return; }
    if (source.length > 12000) { status.textContent = 'O material ultrapassa 12.000 caracteres. Reduza o texto para controlar os custos.'; return; }
    const endpoint = String(window.MEU_TUTOR_AI_ENDPOINT || '').trim();
    if (!endpoint) { status.textContent = 'A IA não está configurada neste aplicativo.'; return; }
    button.disabled = true;
    status.textContent = 'Criando uma pergunta com base no material original…';
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 25000);
      let response;
      try {
        response = await fetch(endpoint.replace(/\/$/, '') + '/api/tutor', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({task:'activities', topic:topic.name, source:source + '\n\nINSTRUÇÃO PARA O TESTE: crie perguntas de recordação abertas, somente sobre fatos presentes no texto; não mostre as respostas ao estudante.', notes:topic.notes || ''}),
          signal: controller.signal
        });
      } finally { clearTimeout(timer); }
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Servidor indisponível (' + response.status + ').');
      const candidates = [
        ...(Array.isArray(result.questions) ? result.questions : []),
        ...(Array.isArray(result.flashcards) ? result.flashcards : []),
        ...(Array.isArray(result.cards) ? result.cards : []),
        ...(Array.isArray(result.activities?.flashcards) ? result.activities.flashcards : [])
      ];
      const first = candidates.map(item => typeof item === 'string' ? item : item?.question || item?.front || item?.pergunta).find(q => typeof q === 'string' && q.trim());
      if (!first) throw new Error('A IA não retornou uma pergunta válida. Tente novamente.');
      // Não exibir respostas geradas antes da tentativa.
      question.value = first.trim();
      generatedQuestion = question.value; generatedTopic = topicId;
      answer.value = ''; reflection.value = ''; rating.value = 'good';
      status.textContent = 'Pergunta pronta! Responda sem consultar. Depois confira o material original, avalie sua recordação e registre a tentativa. A correção automática ainda não está disponível.';
      answer.focus();
    } catch (error) {
      status.textContent = error.name === 'AbortError' ? 'A IA demorou mais de 25 segundos. Tente novamente.' : 'Não foi possível gerar: ' + error.message;
    } finally { button.disabled = false; }
  });
  topicSelect.addEventListener('change', () => {
    if (mode.value === 'ai' && generatedTopic && generatedTopic !== topicSelect.value) {
      question.value = ''; generatedQuestion = ''; generatedTopic = '';
      status.textContent = 'Assunto alterado. Gere uma nova pergunta para este estudo.';
    }
  });
})();
