
(() => {
  const endpoint = (window.MEU_TUTOR_AI_ENDPOINT || '').trim();
  const byId = id => document.getElementById(id);

  const notice = byId('aiNotice');
  const buttons = ['aiAnalyze', 'aiTeach', 'aiSummary', 'aiActivities'];

  let analyzed = false;
  let selectedCards = [];
  let savingCards = false;

  if (endpoint && notice) {
    notice.textContent =
      '🔒 Conexão configurada. Use material de teste não sensível e acompanhe os custos da API.';
  }

  const status = message => {
    const el = byId('aiStatus');
    if (el) el.textContent = message;
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
        'Use até 12.000 caracteres no material e 4.000 nas anotações.'
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
        data.questions.map((q, i) =>
          `${i + 1}. ${typeof q === 'object' ? q.question || '' : q}`
        ).join('\n')
      ]);
    }

    el.innerHTML = sections.map(([title, body]) =>
      `<h3>${escapeHtml(title)}</h3><p style="white-space:pre-wrap">${escapeHtml(
        typeof body === 'string' ? body : JSON.stringify(body, null, 2)
      )}</p>`
    ).join('') || '<p>A IA não retornou conteúdo para mostrar.</p>';

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
        'Integração desativada. Confira a URL em ai-config.js. Nunca coloque a chave da API neste arquivo.'
      );
      return;
    }

    if (task !== 'analyze' && !analyzed) {
      status('Primeiro analise o material e confira o que a IA entendeu.');
      return;
    }

    let payload;

    try {
      payload = sourcePayload(task);
    } catch (error) {
      status(error.message);
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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error || `Falha na solicitação (${response.status}).`
        );
      }

      showResult(data, task);
    } catch (error) {
      status('Não foi possível conectar à IA: ' + error.message);
    } finally {
      byId('aiAnalyze').disabled = false;
      byId('aiTeach').disabled = !analyzed;
      byId('aiSummary').disabled = !analyzed;
      byId('aiActivities').disabled = !analyzed;
    }
  }

  function renderCards(cards) {
    selectedCards = Array.isArray(cards)
      ? cards.slice(0, 10)
          .map((card, index) => ({
            front: String(card.front || card.question || '').trim(),
            back: String(card.back || card.answer || '').trim(),
            key: index
          }))
          .filter(card => card.front && card.back)
      : [];

    const review = byId('aiReview');
    const preview = byId('aiCardsPreview');
    const saveButton = byId('aiSaveCards');
    const saveStatus = byId('aiSaveStatus');

    review.hidden = false;
    saveStatus.textContent = '';
    saveButton.disabled = selectedCards.length === 0;

    preview.innerHTML = selectedCards.length
      ? selectedCards.map(card => `
          <div class="item">
            <label>
              <input
                type="checkbox"
                data-ai-card="${card.key}"
                checked
                style="width:auto;margin-right:8px"
              >
              Salvar este cartão
            </label>
            <strong>${escapeHtml(card.front)}</strong>
            <p>${escapeHtml(card.back)}</p>
          </div>
        `).join('')
      : '<p class="muted">Nenhum flashcard válido foi retornado. Tente novamente com um material mais claro.</p>';
  }

  byId('aiAnalyze').addEventListener('click', () => run('analyze'));
  byId('aiTeach').addEventListener('click', () => run('teach'));
  byId('aiSummary').addEventListener('click', () => run('summary'));
  byId('aiActivities').addEventListener('click', () => run('activities'));

  byId('aiSaveCards').addEventListener('click', () => {
    const saveButton = byId('aiSaveCards');
    const saveStatus = byId('aiSaveStatus');

    if (savingCards) return;

    const chosen = selectedCards.filter(card =>
      byId('aiCardsPreview').querySelector(
        `[data-ai-card="${card.key}"]`
      )?.checked
    );

    if (!chosen.length) {
      saveStatus.textContent = 'Marque pelo menos um cartão para salvar.';
      return;
    }

    const topic = byId('topic').value.trim();
    const source = byId('source').value.trim();
    const notes = byId('notes').value.trim();

    if (!topic) {
      saveStatus.textContent = 'Preencha o nome do assunto em Meu estudo.';
      return;
    }

    if (!Array.isArray(db.topics) || !Array.isArray(db.cards)) {
      saveStatus.textContent =
        'Não foi possível acessar os dados do aplicativo. Atualize a página e tente novamente.';
      return;
    }

    savingCards = true;
    saveButton.disabled = true;

    try {
      let topicRecord = db.topics.find(
        item => item.name.toLowerCase() === topic.toLowerCase()
      );

      // Cria o assunto automaticamente, caso ainda não esteja salvo.
      if (!topicRecord) {
        topicRecord = {
          id: id(),
          name: topic,
          source,
          notes,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          rating: 'ok'
        };

        db.topics.unshift(topicRecord);
      } else {
        topicRecord.source = topicRecord.source || source;
        topicRecord.notes = topicRecord.notes || notes;
        topicRecord.updated = new Date().toISOString();
      }

      const now = new Date().toISOString();

      chosen.forEach(card => {
        db.cards.unshift({
          id: id(),
          topicId: topicRecord.id,
          front: card.front,
          back: card.back,
          created: now,
          reviews: 0,
          lastRating: null,
          nextReview: null
        });
      });

      // Salva no armazenamento local e atualiza as listas do aplicativo.
      save();

      // Impede salvar o mesmo lote novamente por um segundo clique.
      selectedCards = [];

      byId('aiCardsPreview').innerHTML =
        '<div class="success">Cartões adicionados aos seus flashcards. Você já pode praticá-los.</div>';

      saveStatus.textContent =
        `${chosen.length} flashcard(s) salvo(s) com sucesso! Abra Flashcards para conferir.`;

      saveButton.disabled = true;
    } catch (error) {
      saveStatus.textContent =
        'Não foi possível salvar os cartões. Seus dados podem não ter sido gravados. Tente novamente.';
      saveButton.disabled = false;
      console.error('Erro ao salvar flashcards:', error);
    } finally {
      savingCards = false;
    }
  });
})();
