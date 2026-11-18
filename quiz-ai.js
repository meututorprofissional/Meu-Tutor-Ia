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
  // Prefer a machine-readable verdict when the API provides one.
  // The explanatory prose must never be used as a substitute for an invalid structured verdict.
  const structuredVerdict = data => {
    if (!data || typeof data !== 'object') return null;
    const allowed = { correct: 'CORRETO', partial: 'PARCIALMENTE CORRETO', incorrect: 'INCORRETO', unverifiable: 'NAO FOI POSSIVEL VERIFICAR' };
    const classification = allowed[String(data.classification || '').trim().toLowerCase()];
    if (!classification || typeof data.explanation !== 'string' || !data.explanation.trim()) return null;
    return { classification, explanation: data.explanation.trim(), expected_answer: typeof data.expected_answer === 'string' ? data.expected_answer : '' };
  };
  const extractStructuredVerdict = result => {
    const direct = structuredVerdict(result?.evaluation);
    if (direct) return direct;
    // Backwards compatibility: older Workers may put the evaluation JSON in explanation.
    const raw = result?.explanation;
    if (typeof raw !== 'string') return null;
    const cleaned = raw.trim().replace(/^\x60\x60\x60(?:json)?\s*/i, '').replace(/\s*\x60\x60\x60$/, '');
    try { return structuredVerdict(JSON.parse(cleaned)); } catch { return null; }
  };
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
    // O modelo às vezes responde "a resposta é CORRETO" ou "o resultado é INCORRETO".
    // Só reconhecer quando há sujeito explícito; nunca procurar palavras soltas.
    if (!key) {
      const direct = feedback.match(/(?:a resposta(?: do estudante| do aluno| fornecida)?|o resultado|a classificação|o veredito)\s+(?:foi|é|está|seria|deve ser)\s+(?:considerad[ao]\s+)?(parcialmente corret[ao]|incorret[ao]|corret[ao])\b/i);
      if (direct) {
        const word = normalize(direct[1]);
        key = word.startsWith('PARCIALMENTE') ? 'PARCIALMENTE CORRETO' : word.startsWith('INCORRET') ? 'INCORRETO' : 'CORRETO';
      }
    }
    // Ex.: "O motivo da resposta do estudante ser INCORRETO..."
    if (!key) {
      const reason = feedback.match(/(?:resposta do estudante|resposta do aluno|sua resposta)\s+ser\s+(parcialmente corret[ao]|incorret[ao]|corret[ao])\b/i);
      if (reason) {
        const word = normalize(reason[1]);
        key = word.startsWith('PARCIALMENTE') ? 'PARCIALMENTE CORRETO' : word.startsWith('INCORRET') ? 'INCORRETO' : 'CORRETO';
      }
    }
    // A IA pode citar a resposta do aluno antes do veredito:
    // "A resposta do estudante, 'rosario', é CORRETO".
    // Exigir verbo e julgamento explícitos evita confundir a resposta esperada com o veredito.
    if (!key) {
      const quotedVerdict = feedback.match(/(?:a sua resposta|sua resposta|a resposta do estudante|a resposta do aluno|a resposta fornecida)\s*(?:[,:\-]\s*)?(?:(?:"[^"\n]{1,160}"|'[^'\n]{1,160}'|“[^”\n]{1,160}”|‘[^’\n]{1,160}’)\s*,?\s*)?(?:foi|é|está|seria|deve ser)\s+(?:considerad[ao]\s+)?(parcialmente\s+corret[ao]|incorret[ao]|corret[ao])\b/i);
      if (quotedVerdict) {
        const word = normalize(quotedVerdict[1]);
        key = word.startsWith('PARCIALMENTE') ? 'PARCIALMENTE CORRETO' : word.startsWith('INCORRET') ? 'INCORRETO' : 'CORRETO';
      }
    }
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
    const structured = feedback && typeof feedback === 'object' ? feedback : null;
    const verdict = structured
      ? parseVerdict('RESULTADO: ' + structured.classification + '\n' + structured.explanation)
      : parseVerdict(feedback);
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
    const explanation = structured ? structured.explanation : (verdict.explanation || feedback);
    // Só separar "resposta esperada" e "o que revisar" quando vierem rotulados pela IA.
    // Nunca adivinhar esses campos a partir de frases soltas.
    const extract = label => {
      const re = new RegExp('(?:^|\\n)\\s*(?:\\*\\*)?'+label+'(?:\\*\\*)?\\s*[:：]\\s*([^\\n]+)', 'i');
      const match = explanation.match(re);
      return match ? match[1].trim().replace(/\*+$/, '').trim() : '';
    };
    const expected = structured?.expected_answer || extract('RESPOSTA ESPERADA|RESPOSTA CORRETA');
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
          body: JSON.stringify({task:'activities', topic:topic.name, source:source + '\n\nINSTRUÇÃO PARA O TESTE: gere perguntas abertas apenas sobre fatos explicitamente presentes no material original. Inclua perguntas compostas que peçam duas informações presentes no texto (ex.: cidade e país, dia e mês). Para cada pergunta, preencha answer com a resposta exata sustentada pelo texto; não pergunte sobre familiares ou outros dados não mencionados. Não mostre as respostas ao estudante. Cada pergunta deve ser respondível diretamente pelo material e não deve transformar nacionalidade ou local de nascimento em país onde a pessoa é reconhecida. Prefira perguntas claras e específicas. Nunca pergunte em que mês de junho nasceu alguém nem misture meses ou datas ausentes do texto. Gere pelo menos duas perguntas compostas com fatos explícitos na fonte.', notes:topic.notes || ''}),
          signal: controller.signal
        });
      } finally { clearTimeout(timer); }
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Servidor indisponível (' + response.status + ').');
      // Only accept question/answer pairs grounded in the saved source.
      // Do not use flashcard fronts as fallback: they can lack verifiable answers.
      const normalizeEvidence = value => String(value || '').normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '').toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
      const normalizedSource = normalizeEvidence(source);
      const isSupported = answerText => {
        const normalized = normalizeEvidence(answerText);
        if (!normalized || normalized.length < 2) return false;
        if (normalizedSource.includes(normalized)) return true;
        // For compound answers, each substantive part must occur in the source.
        const parts = String(answerText).split(/\s*(?:,|;|\be\b|\band\b|\/)\s*/i)
          .map(normalizeEvidence).filter(Boolean);
        return parts.length >= 2 && parts.every(part => part.length >= 2 && normalizedSource.includes(part));
      };
      // Reject questions whose wording introduces a location or relationship
      // not supported by the source. Answer presence alone is insufficient.
      const isWellFormedQuestion = raw => {
        const q = normalizeEvidence(raw);
        if (!q || q.length < 12 || !/[?？]\s*$/.test(raw.trim())) return false;
        // "Em que país é considerado..." incorrectly turns a general
        // reputation statement into a country-specific claim.
        if (/^(em )?que pais .*\b(considerad|reconhecid|conhecid|famos|melhor)/.test(q)) return false;
        if (/\bem que pais\b.*\b(considerad|reconhecid|conhecid|famos|melhor)/.test(q)) return false;
        const months = ['janeiro','fevereiro','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
        const mentionedMonths = months.filter(month => new RegExp('\\b' + month + '\\b').test(q));
        if (/\b(que|qual) mes\b/.test(q) && mentionedMonths.length) return false;
        // Uma equipe não é uma cidade: "Inter Miami" na fonte não prova
        // em qual cidade a pessoa joga. Pergunte pelo clube, não pela cidade.
        if (/\\b(que|qual) cidade\\b/.test(q) && /\\b(joga|atu(a|almente)|time|clube|equipe)\\b/.test(q)) return false;
        // "Em que mês de julho..." já informa o mês e não é uma pergunta válida.
        if (/\\b(que|qual) (?:dia|mes) de (?:janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\\b/.test(q)) return false;
        if (mentionedMonths.length > 1) return false;
        if (mentionedMonths.some(month => !new RegExp('\\b' + month + '\\b').test(normalizedSource))) return false;
        return true;
      };
      const pairs = (Array.isArray(result.questions) ? result.questions : [])
        .filter(item => item && typeof item === 'object' && typeof item.question === 'string'
          && typeof item.answer === 'string' && isSupported(item.answer)
          && isWellFormedQuestion(item.question));
      const questions = [...new Map(pairs.map(item =>
        [normalizeEvidence(item.question), item.question.trim()])).values()];
      if (!questions.length) throw new Error('A IA não retornou uma pergunta válida. Tente novamente.');
      const recentKey = 'meuTutorIA.quizRecent.' + topicId;
      let recent = [];
      try { recent = JSON.parse(sessionStorage.getItem(recentKey) || '[]'); } catch {}
      if (!Array.isArray(recent)) recent = [];
      const normalizeQuestion = q => normalizeEvidence(q);
      const unseen = questions.filter(q => !recent.includes(normalizeQuestion(q)));
      const pool = unseen.length ? unseen : questions.filter(q => normalizeQuestion(q) !== normalizeQuestion(generatedQuestion));
      const first = (pool.length ? pool : questions)[Math.floor(Math.random() * (pool.length || questions.length))];
      // Não substituir a pergunta se o usuário mudou de modo ou assunto durante a espera.
      if (mode.value !== 'ai' || topicSelect.value !== topicId) {
        status.textContent = 'O modo ou assunto mudou. Gere uma nova pergunta se desejar.';
        return;
      }
      // Não exibir respostas geradas antes da tentativa.
      question.value = first.trim();
      generatedQuestion = question.value; generatedTopic = topicId;
      try {
        sessionStorage.setItem(recentKey, JSON.stringify([...recent.filter(q => q !== normalizeQuestion(first)), normalizeQuestion(first)].slice(-12)));
      } catch { /* armazenamento de sessão indisponível */ }
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
      'Para avaliação, retorne no campo explanation APENAS um objeto JSON válido, sem markdown, com as chaves classification (correct, partial, incorrect ou unverifiable), explanation (justificativa curta) e expected_answer (resposta correta baseada na fonte). Não misture explicação e classificação.',
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
          body:JSON.stringify({task:'evaluate', topic:topic.name, source, question:promptQuestion, answer:userAnswer}), signal:controller.signal
        });
      } finally { clearTimeout(timer); }
      let result = await response.json().catch(() => ({}));
      if (!response.ok && response.status === 502) {
        evaluationStatus.textContent = 'A IA retornou um formato inválido. Tentando novamente…';
        const retryController = new AbortController();
        const retryTimer = setTimeout(() => retryController.abort(), 60000);
        try {
          response = await fetch(endpoint.replace(/\/$/, '') + '/api/tutor', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body:JSON.stringify({task:'evaluate',topic:topic.name,source,question:promptQuestion,answer:userAnswer}),
            signal:retryController.signal
          });
          result = await response.json().catch(() => ({}));
        } finally { clearTimeout(retryTimer); }
      }
      if (!response.ok) throw new Error(result.error || 'Servidor indisponível (' + response.status + ').');
      const structured = extractStructuredVerdict(result);
      if (!structured) throw new Error('A IA não retornou uma classificação estruturada válida. Tente novamente.');
      const feedback = structured;
      if (!structured && !feedback.trim()) throw new Error('O servidor não retornou uma análise utilizável.');
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
