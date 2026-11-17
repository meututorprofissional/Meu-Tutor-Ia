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
  const confidence = document.getElementById('quizConfidence');
  if (!mode || !button || !topicSelect || !question) return;
  let generatedTopic = '', generatedQuestion = '';
  const evaluationPanel = document.getElementById('quizAiEvaluation');
  const evaluateButton = document.getElementById('quizEvaluate');
  const evaluationStatus = document.getElementById('quizEvaluationStatus');
  const evaluationResult = document.getElementById('quizEvaluationResult');
  let evaluatedSignature = '';
  const clearEvaluation = () => {
    evaluatedSignature = '';
    if (evaluationResult) { evaluationResult.hidden = true; evaluationResult.replaceChildren(); }
    if (evaluationStatus) evaluationStatus.textContent = 'Responda primeiro. A IA analisará sua tentativa usando o material original.';
  };
  const readText = value => {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.map(readText).filter(Boolean).join('\n');
    if (value && typeof value === 'object') return ['text','content','explanation','understanding','summary','message'].map(k => value[k]).filter(Boolean).map(readText).join('\n');
    return '';
  };

  // A classificação só é mostrada quando a IA fornece um marcador explícito.
  // Não deduzir "correto" de palavras soltas dentro da explicação.
  const parseVerdict = feedback => {
    const verdicts = {
      'CORRETO': ['Correto', '#15803d'],
      'PARCIALMENTE CORRETO': ['Parcialmente correto', '#a16207'],
      'INCORRETO': ['Incorreto', '#b91c1c'],
      'NAO FOI POSSIVEL VERIFICAR': ['Não foi possível verificar', '#64748b']
    };
    const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
    // Aceita o marcador pedido à IA, com ou sem negrito Markdown.
    const marker = feedback.match(/^\s*\**\s*(?:RESULTADO|CLASSIFICAÇÃO|VEREDITO)\s*\**\s*[:：-]\s*(PARCIALMENTE CORRETO|NÃO FOI POSSÍVEL VERIFICAR|NAO FOI POSSIVEL VERIFICAR|INCORRETO|CORRETO)(?=\s|[.,;!*]|$)/im);
    let key = marker ? normalize(marker[1]) : '';
    // Fallback restrito: a IA identifica explicitamente a resposta do aluno como errada.
    // Não classificar pela mera presença de "correto/incorreto" em qualquer lugar.
    if (!key && /(?:a sua resposta|sua resposta|a resposta do estudante|a resposta do aluno|a resposta fornecida)\s+(?:foi|é|está)\s+(?:claramente\s+)?incorret[ao]\b/i.test(feedback)) key = 'INCORRETO';
    if (!key && /(?:a sua resposta|sua resposta|a resposta do estudante|a resposta do aluno|a resposta fornecida)\s+(?:foi|é|está)\s+(?:claramente\s+)?corret[ao]\b/i.test(feedback)) key = 'CORRETO';
    // Reconhece uma classificação explícita mesmo quando o modelo esquece o cabeçalho RESULTADO.
    // Não interpreta menções genéricas a "parcialmente correto" como veredito.
    if (!key && /(?:a sua resposta|sua resposta|a resposta do estudante|a resposta do aluno|a resposta fornecida|o resultado|a classificação|o veredito)\s+(?:foi|é|está|deve ser|seria)\s+(?:considerad[ao]\s+)?parcialmente corret[ao]\b/i.test(feedback)) key = 'PARCIALMENTE CORRETO';
    if (!key && /(?:o resultado|a classificação|o veredito)\s+(?:foi|é|está|deve ser|seria)\s+(?:considerad[ao]\s+)?(?:não foi possível verificar|nao foi possivel verificar)\b/i.test(feedback)) key = 'NAO FOI POSSIVEL VERIFICAR';
    // Ex.: 'A resposta do estudante foi Ceará, que é incorreta.'
    if (!key && /(?:a sua resposta|sua resposta|a resposta do estudante|a resposta do aluno|a resposta fornecida)\s+(?:foi|é|está)\s+[^.!?\n]{1,100}?,\s*que\s+é\s+incorret[ao]\b/i.test(feedback)) key = 'INCORRETO';
    // Ex.: "O estudante respondeu corretamente que Messi nasceu em Rosário."
    if (!key && /(?:o estudante|a estudante|o aluno|a aluna|você)\s+(?:respondeu|acertou)\s+(?:corretamente|certo)\b/i.test(feedback)) key = 'CORRETO';
    if (!key && /(?:o estudante|a estudante|o aluno|a aluna|você)\s+respondeu\s+(?:incorretamente|errado)\b/i.test(feedback)) key = 'INCORRETO';
    if (!verdicts[key]) return { label: 'Não foi possível classificar', color: '#64748b', explanation: feedback, verified: false };
    const [label, color] = verdicts[key];
    return { label, color, explanation: marker ? feedback.replace(marker[0], '').trim() : feedback, verified: true };
  };
  const renderEvaluation = (feedback, userAnswer) => {
    const verdict = parseVerdict(feedback);
    evaluationResult.replaceChildren();
    evaluationResult.style.cssText = 'padding:clamp(14px,3vw,22px);border-radius:16px;overflow-wrap:anywhere;';
    const make = (tag, content, css) => {
      const el = document.createElement(tag);
      el.textContent = content;
      if (css) el.style.cssText = css;
      return el;
    };
    const header = make('div', '', 'display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:18px;');
    const icon = verdict.label === 'Correto' ? '✓' : verdict.label === 'Incorreto' ? '✕' : verdict.label === 'Parcialmente correto' ? '◐' : 'ⓘ';
    const heading = make('strong', icon + ' ' + (verdict.label === 'Correto' ? 'Resposta correta' : verdict.label === 'Incorreto' ? 'Resposta incorreta' : verdict.label === 'Parcialmente correto' ? 'Resposta parcialmente correta' : verdict.label), 'font-size:1.15rem;color:' + verdict.color + ';line-height:1.4;');
    header.append(heading);
    const section = (title, content) => {
      const block = make('section', '', 'margin:0 0 16px;');
      const label = make('div', title, 'font-size:.78rem;font-weight:750;letter-spacing:.04em;text-transform:uppercase;opacity:.72;margin-bottom:7px;');
      const body = make('div', content, 'line-height:1.65;white-space:pre-wrap;overflow-wrap:anywhere;');
      block.append(label, body);
      return block;
    };
    const userBlock = section('Sua resposta', userAnswer);
    userBlock.style.cssText += 'padding:12px 14px;border-radius:10px;border:1px solid rgba(128,128,128,.22);';
    const explanation = verdict.explanation || feedback;
    // Só separar "resposta esperada" e "o que revisar" quando vierem rotulados pela IA.
    // Nunca adivinhar esses campos a partir de frases soltas.
    const extract = label => {
      const re = new RegExp('(?:^|\\n)\\s*(?:\\*\\*)?'+label+'(?:\\*\\*)?\\s*[:：]\\s*([^\\n]+)', 'i');
      const match = explanation.match(re);
      return match ? match[1].trim().replace(/\*+$/, '').trim() : '';
    };
    const expected = extract('RESPOSTA ESPERADA|RESPOSTA CORRETA');
    const review = extract('O QUE REVISAR|SUGESTÃO DE REVISÃO');
    let remaining = explanation.replace(/(?:^|\n)\s*\**(?:RESPOSTA ESPERADA|RESPOSTA CORRETA|O QUE REVISAR|SUGESTÃO DE REVISÃO)\**\s*[:：]\s*[^\n]+/gi, '').trim();
    if (!remaining) remaining = explanation;
    evaluationResult.append(header, userBlock);
    const confidenceLabel = ({sure:'Tenho certeza',unsure:'Tenho dúvida',unknown:'Não lembro com segurança'})[confidence?.value || 'sure'];
    if (confidenceLabel) evaluationResult.append(section('Minha confiança', confidenceLabel));
    if (expected) evaluationResult.append(section('Resposta esperada', expected));
    evaluationResult.append(section('Explicação da IA', remaining));
    if (review) evaluationResult.append(section('O que revisar', review));
    return verdict.verified;
  };
  const syncMode = () => {
    const ai = mode.value === 'ai';
    controls.hidden = !ai;
    if (evaluationPanel) evaluationPanel.hidden = !ai;
    clearEvaluation();
    question.readOnly = ai;
    question.setAttribute('aria-readonly', String(ai));
    question.classList.toggle('quiz-ai-locked', ai);
    question.title = ai ? 'Pergunta criada pela IA: não é possível editar neste modo.' : '';
    question.value = '';
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
      const timer = setTimeout(() => controller.abort(), 60000);
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
      // Não substituir a pergunta se o usuário mudou de modo ou assunto durante a espera.
      if (mode.value !== 'ai' || topicSelect.value !== topicId) {
        status.textContent = 'O modo ou assunto mudou. Gere uma nova pergunta se desejar.';
        return;
      }
      // Não exibir respostas geradas antes da tentativa.
      question.value = first.trim();
      generatedQuestion = question.value; generatedTopic = topicId;
      answer.value = ''; reflection.value = ''; rating.value = 'good';
      clearEvaluation();
      status.textContent = 'Pergunta pronta! Responda sem consultar. Depois confira o material original, avalie sua recordação e registre a tentativa. Depois você poderá pedir uma avaliação orientativa com IA.';
      answer.focus();
    } catch (error) {
      status.textContent = error.name === 'AbortError' ? 'A IA não respondeu em até 60 segundos. Verifique a conexão e tente novamente.' : 'Não foi possível gerar: ' + error.message;
    } finally { button.disabled = false; }
  });
  if (evaluateButton) evaluateButton.addEventListener('click', async () => {
    if (mode.value !== 'ai') return;
    const topicId = topicSelect.value;
    const userAnswer = answer.value.trim();
    const promptQuestion = question.value.trim();
    if (!generatedQuestion || generatedTopic !== topicId || promptQuestion !== generatedQuestion) {
      evaluationStatus.textContent = 'Gere uma pergunta com IA antes de solicitar a avaliação.';
      return;
    }
    if (!userAnswer) { evaluationStatus.textContent = 'Escreva sua resposta antes de pedir a avaliação.'; answer.focus(); return; }
    let data;
    try { data = JSON.parse(localStorage.getItem('meuTutorIA.v2') || '{}'); } catch { data = {}; }
    const topic = (Array.isArray(data.topics) ? data.topics : []).find(t => t.id === topicId);
    if (!topic?.source) { evaluationStatus.textContent = 'Material original indisponível. Não é possível avaliar.'; return; }
    const source = String(topic.source).slice(0,12000);
    const studentConfidence = confidence?.value || 'sure';
    const signature = JSON.stringify([topicId,promptQuestion,userAnswer,source]);
    if (signature === evaluatedSignature) { evaluationStatus.textContent = 'A avaliação desta resposta já está exibida.'; return; }
    const endpoint = String(window.MEU_TUTOR_AI_ENDPOINT || '').trim();
    if (!endpoint) { evaluationStatus.textContent = 'A IA não está configurada.'; return; }
    const notes = [
      'Confiança autodeclarada do estudante (não afeta a correção): ' + ({sure:'Tenho certeza',unsure:'Tenho dúvida',unknown:'Não lembro com segurança'}[studentConfidence] || 'Não informada') + '.',
      'TAREFA DE AVALIAÇÃO DE RECORDAÇÃO: Compare exclusivamente com o material original fornecido.',
      'Pergunta: ' + promptQuestion,
      'Resposta do estudante: ' + userAnswer,
      'COMECE a explicação com uma linha exata: RESULTADO: CORRETO, RESULTADO: PARCIALMENTE CORRETO, RESULTADO: INCORRETO ou RESULTADO: NÃO FOI POSSÍVEL VERIFICAR.',
      'Avalie SOMENTE o que a pergunta solicita. Se a pergunta exigir dois ou mais elementos (ex.: cidade E país) e a resposta trouxer apenas parte correta, classifique como PARCIALMENTE CORRETO. Se pedir apenas a cidade, não exija país, data ou detalhes adicionais.',
      'Use CORRETO somente quando todos os elementos essenciais solicitados estiverem respondidos corretamente. Use INCORRETO quando a resposta estiver errada ou não atender à pergunta. Use NÃO FOI POSSÍVEL VERIFICAR quando a fonte não permitir avaliar.',
      'Exemplo obrigatório: se perguntar "Em que ano nasceu Lionel Messi?" e a fonte disser 24 de junho de 1987, a resposta "1987, eu acho" é CORRETO: o ano foi dado. Não exija dia e mês. Expressões de dúvida ("eu acho", "talvez") não tornam um fato correto parcialmente correto.',
      'PARCIALMENTE CORRETO apenas se faltar ou estiver errada parte essencial do que foi perguntado, mas houver uma parte correta. Não use parcial por falta de detalhes que não foram pedidos.',
      'Separe CORREÇÃO factual de CONFIANÇA: frases como "acho", "talvez", "não lembro com certeza" não são evidência de erro factual. Não misture as duas dimensões e não contradiga seu próprio veredito.',
      'Aceite diferenças de maiúsculas e acentos que não mudem o significado. Não penalize informação extra ausente.',
      'Depois explique o motivo, a resposta esperada sustentada pela fonte e o que revisar. Seja breve.',
      'Se o material não sustentar a conclusão, diga que não é possível verificar. Não use conhecimento externo.',
      'Não modifique a pergunta nem a resposta do estudante.'
    ].join('\n');
    if (notes.length > 4000) { evaluationStatus.textContent = 'Resposta longa demais para avaliar. Use até cerca de 3.000 caracteres.'; return; }
    evaluateButton.disabled = true;
    evaluationResult.hidden = true;
    evaluationStatus.textContent = 'Analisando sua resposta. Aguarde…';
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 60000);
      let response;
      try {
        response = await fetch(endpoint.replace(/\/$/, '') + '/api/tutor', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body:JSON.stringify({task:'teach', topic:topic.name, source, notes}), signal:controller.signal
        });
      } finally { clearTimeout(timer); }
      let result = await response.json().catch(() => ({}));
      if (!response.ok && response.status === 502 && /formato inesperado/i.test(String(result.error || ''))) {
        evaluationStatus.textContent = 'A IA respondeu em formato inválido. Fazendo uma segunda tentativa…';
        // O Worker pode receber JSON malformado do modelo gratuito; tente somente mais uma vez.
        // Mantenha o mesmo material original, a pergunta e a resposta sem alterações.
        const retryController = new AbortController();
        const retryTimer = setTimeout(() => retryController.abort(), 60000);
        try {
          response = await fetch(endpoint.replace(/\/$/, '') + '/api/tutor', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              task: 'teach', topic: topic.name, source,
              notes: 'Avalie usando SOMENTE o material original. Comece a explicação com RESULTADO: CORRETO, RESULTADO: PARCIALMENTE CORRETO, RESULTADO: INCORRETO ou RESULTADO: NÃO FOI POSSÍVEL VERIFICAR. Pergunta: ' + promptQuestion + '\nResposta: ' + userAnswer + '\nAvalie apenas o que a pergunta pede; não exija detalhes adicionais (como data se perguntou cidade). Aceite variações de acento. Explique o motivo em até 5 frases. Não invente fatos.'
            }),
            signal: retryController.signal
          });
          result = await response.json().catch(() => ({}));
        } finally { clearTimeout(retryTimer); }
      }
      if (!response.ok) throw new Error(result.error || 'Servidor indisponível (' + response.status + ').');
      const feedback = readText(result.explanation || result.understanding || result.summary || result.result);
      if (!feedback.trim()) throw new Error('O servidor não retornou uma análise utilizável.');
      if (mode.value !== 'ai' || topicSelect.value !== topicId || question.value !== promptQuestion || answer.value.trim() !== userAnswer) {
        evaluationStatus.textContent = 'A resposta mudou durante a análise. Solicite uma nova avaliação.';
        return;
      }
      const classified = renderEvaluation(feedback, userAnswer);
      evaluationResult.hidden = false;
      evaluatedSignature = signature;
      evaluationStatus.textContent = classified ? 'Avaliação orientativa da IA. Confira o material original; a IA pode cometer erros.' : 'A IA explicou a resposta, mas não informou uma classificação confiável. Confira o material original.';
    } catch (error) {
      evaluationStatus.textContent = error.name === 'AbortError' ? 'A análise demorou mais de 60 segundos. Tente novamente.' : 'Não foi possível avaliar: ' + error.message;
    } finally { evaluateButton.disabled = false; }
  });
  answer.addEventListener('input', clearEvaluation);
  confidence?.addEventListener('change', clearEvaluation);
  topicSelect.addEventListener('change', () => {
    clearEvaluation();
    if (mode.value === 'ai' && generatedTopic && generatedTopic !== topicSelect.value) {
      question.value = ''; generatedQuestion = ''; generatedTopic = '';
      status.textContent = 'Assunto alterado. Gere uma nova pergunta para este estudo.';
    }
  });
})();
