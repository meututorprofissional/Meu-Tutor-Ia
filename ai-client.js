(() => {
  const endpoint = (window.MEU_TUTOR_AI_ENDPOINT || '').trim();
  const notice = document.getElementById('aiNotice');

  if (endpoint && notice) {
    notice.textContent = '🔒 Conexão configurada. Use apenas material de teste não sensível até concluir os testes de segurança e custos.';
  }

  const byId = id => document.getElementById(id);
  const buttons = ['aiAnalyze', 'aiTeach', 'aiSummary', 'aiActivities'];

  let analyzed = false;
  let lastResult = null;
  let selectedCards = [];

  const status = message => {
    byId('aiStatus').textContent = message;
  };

  const escapeHtml = value =>
    String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[ch]));

  function sourcePayload(task) {
    const topic = byId('topic').value.trim();
    const source = byId('source').value.trim();
    const notes = byId('notes').value.trim();

    if (!topic || !source) {
      throw new Error(
        'Preencha o assunto e o material original antes de chamar a IA.'
      );
    }

    if (source.length > 12000 || notes.length > 4000) {
      throw new Error(
        'Para controlar custos, use até 12.000 caracteres no material e 4.000 nas anotações.'
      );
    }

    return { task, topic, source, notes };
  }

  function showResult(data, task) {
    const el = byId('aiResult');
    el.hidden = false;

    const sections = [];

    if (data.understanding) {
      sections.push(['O que a IA entendeu', data.understanding]);
    }

    if (data.explanation) {
      sections.push(['Explicação', data.explanation]);
    }

    if (data.summary) {
      sections.push(['Resumo', data.summary]);
    }

    if (Array.isArray(data.questions) && data.questions.length) {
      sections.push([
        'Perguntas para praticar',
        data.questions
          .map((q, i) => `${i + 1}. ${q.question || q}`)
          .join('\n')
      ]);
    }

    el.innerHTML = sections
      .map(([title, body]) =>
        `<h3>${escapeHtml(title)}</h3><p style="white-space:pre-wrap">${escapeHtml(body)}</p>`
      )
      .join('') || '<p>A IA não retornou conteúdo para mostrar.</p>';

    if (task === 'analyze') {
      analyzed = true;

      byId('aiTeach').disabled = false;
      byId('aiSummary').disabled = false;
      byId('aiActivities').disabled = false;

      status(
        'Análise pronta. Confira se a IA entendeu corretamente antes de avançar.'
      );
    } else {
      status('Resultado pronto. Confira o conteúdo antes de usar.');
    }

    if (task === 'activities') {
      renderCards(data.flashcards || []);
    }
  }

  async function run(task) {
    if (!endpoint) {
      status(
        'A integração ainda está desativada. Configure o Cloudflare Worker e a URL em ai-config.js; não coloque uma chave de API neste arquivo.'
      );
      return;
    }

    if (task !== 'analyze' && !analyzed) {
      status(
        'Primeiro analise o material e confira o que a IA entendeu.'
      );
      return;
    }

    let payload;

    try {
      payload = sourcePayload(task);
    } catch (e) {
      status(e.message);
      return;
    }

    buttons.forEach(id => {
      byId(id).disabled = true;
    });

    status('A IA está trabalhando. Aguarde…');
    byId('aiReview').hidden = true;

    try {
      const response = await fetch(
        endpoint.replace(/\/$/, '') + '/api/tutor',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error || `Falha na solicitação (${response.status}).`
        );
      }

      lastResult = data;
      showResult(data, task);
    } catch (e) {
      status('Não foi possível conectar à IA: ' + e.message);
    } finally {
      byId('aiAnalyze').disabled = false;
      byId('aiTeach').disabled = !analyzed;
      byId('aiSummary').disabled = !analyzed;
      byId('aiActivities').disabled = !analyzed;
    }
  }

  function renderCards(cards) {
    selectedCards = Array.isArray(cards)
      ? cards
          .slice(0, 10)
          .map((c, i) => ({
            front: String(c.front || c.question || ''),
            back: String(c.back || c.answer || ''),
            checked: true,
            key: i
          }))
          .filter(c => c.front && c.back)
      : [];

    byId('aiReview').hidden = false;

    byId('aiCardsPreview').innerHTML = selectedCards.length
      ? selectedCards
          .map(c => `
            <div class="item">
              <label>
                <input
                  type="checkbox"
                  data-ai-card="${c.key}"
                  checked
                  style="width:auto;margin-right:8px"
                >
                Salvar este cartão
              </label>
              <strong>${escapeHtml(c.front)}</strong>
              <p>${escapeHtml(c.back)}</p>
            </div>
          `)
          .join('')
      : '<p class="muted">Nenhum flashcard válido foi retornado. Tente novamente com um material mais claro.</p>';

    byId('aiSaveCards').disabled = !selectedCards.length;
  }

  byId('aiAnalyze').addEventListener('click', () => run('analyze'));
  byId('aiTeach').addEventListener('click', () => run('teach'));
  byId('aiSummary').addEventListener('click', () => run('summary'));
  byId('aiActivities').addEventListener('click', () => run('activities'));

  byId('aiSaveCards').addEventListener('click', () => {
    const chosen = selectedCards.filter(c =>
      byId('aiCardsPreview')
        .querySelector(`[data-ai-card="${c.key}"]`)
        ?.checked
    );

    if (!chosen.length) {
      byId('aiSaveStatus').textContent =
        'Marque pelo menos um cartão para salvar.';
      return;
    }

    const topicName = byId('topic').value.trim();

    if (!topicName) {
      byId('aiSaveStatus').textContent =
        'Informe o nome do assunto antes de salvar.';
      return;
    }

    const now = new Date().toISOString();

    // Procura o assunto existente, sem diferenciar maiúsculas de minúsculas.
    let topicRecord = db.topics.find(
      t => t.name.trim().toLowerCase() === topicName.toLowerCase()
    );

    // Se o assunto não existir, cria um registro compatível com Meu estudo.
    if (!topicRecord) {
      topicRecord = {
        id: id(),
        name: topicName,
        source: byId('source').value.trim(),
        notes: byId('notes').value.trim(),
        created: now,
        updated: now,
        rating: byId('difficulty').value
      };

      db.topics.unshift(topicRecord);
    } else {
      // Atualiza os dados do assunto sem apagar informações já existentes.
      topicRecord.source =
        byId('source').value.trim() || topicRecord.source;

      topicRecord.notes =
        byId('notes').value.trim() || topicRecord.notes;

      topicRecord.updated = now;
      topicRecord.rating = byId('difficulty').value;
    }

    // Salva os cartões no mesmo banco usado pelos flashcards manuais.
    chosen.forEach(c => {
      db.cards.unshift({
        id: id(),
        topicId: topicRecord.id,
        front: c.front,
        back: c.back,
        created: now,
        reviews: 0,
        lastRating: null,
        nextReview: null
      });
    });

    // Usa a função original do aplicativo para persistir e atualizar as telas.
    save();

    byId('aiSaveStatus').textContent =
      `${chosen.length} flashcard(s) salvo(s) com sucesso!`;
  });
})();
