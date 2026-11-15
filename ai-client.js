
(() => {
  const endpoint = (window.MEU_TUTOR_AI_ENDPOINT || '').trim();
  const notice = document.getElementById('aiNotice');

  if (endpoint && notice) {
    notice.textContent =
      '🔒 Conexão configurada. Use apenas material de teste não sensível até concluir os testes de segurança e custos.';
  }

  const byId = id => document.getElementById(id);
  const buttons = ['aiAnalyze', 'aiTeach', 'aiSummary', 'aiActivities'];

  let analyzed = false;
  let lastResult = null;
  let selectedCards = [];

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
    const originalSource = byId('source').value.trim();
    const notes = byId('notes').value.trim();

    if (!topic) {
      throw new Error('Informe o assunto que você quer estudar.');
    }

    if (originalSource.length > 12000 || notes.length > 4000) {
      throw new Error(
        'Para controlar custos, use até 12.000 caracteres no material e 4.000 nas anotações.'
      );
    }

    let source = originalSource;

    if (task === 'activities') {
      if (!source && notes) {
        source =
          'Use estas anotações como material de estudo:\n' + notes;
      }

      if (!source) {
        source =
          'Crie flashcards educativos corretos, claros e úteis para estudar o seguinte assunto: ' +
          topic +
          '. Gere perguntas objetivas e respostas explicativas. ' +
          'Não invente informações específicas. Se o assunto exigir contexto, ' +
          'use conhecimento geral confiável e formule cartões adequados para revisão.';
      }
    } else if (!source) {
      throw new Error(
        'Cole o material original antes de analisar, ensinar ou resumir.'
      );
    }

    return {
      task,
      topic,
      source,
      notes
    };
  }

  function showResult(data, task) {
    const el = byId('aiResult');
    el.hidden = false;

    const sections = [];

    if (data.understanding) {
      sections.push([
        'O que a IA entendeu',
        data.understanding
      ]);
    }

    if (data.explanation) {
      sections.push([
        'Explicação',
        data.explanation
      ]);
    }

    if (data.summary) {
      sections.push([
        'Resumo',
        data.summary
      ]);
    }

    if (Array.isArray(data.questions) && data.questions.length) {
      sections.push([
        'Perguntas para praticar',
        data.questions
          .map((q, i) =>
            `${i + 1}. ${
              typeof q === 'object'
                ? (q.question || q.pergunta || q.front || '')
                : q
            }`
          )
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
      const cards =
        data.flashcards ||
        data.cards ||
        data.activities?.flashcards ||
        data.result?.flashcards ||
        [];

      renderCards(cards);
    }
  }

  async function run(task) {
    if (!endpoint) {
      status(
        'A integração está desativada. Confira a URL do Cloudflare Worker em ai-config.js. Nunca coloque a chave da API neste arquivo.'
      );
      return;
    }

    if (task !== 'analyze' && task !== 'activities' && !analyzed) {
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
      byId('aiActivities').disabled = false;
    }
  }

  function normalizeCard(card, index) {
    if (!card || typeof card !== 'object') {
      return null;
    }

    const front = String(
      card.front ??
      card.question ??
      card.pergunta ??
      card.frente ??
      card.q ??
      ''
    ).trim();

    const back = String(
      card.back ??
      card.answer ??
      card.resposta ??
      card.verso ??
      card.a ??
      ''
    ).trim();

    if (!front || !back) {
      return null;
    }

    return {
      front,
      back,
      checked: true,
      key: index
    };
  }

  function renderCards(cards) {
    selectedCards = Array.isArray(cards)
      ? cards
          .slice(0, 10)
          .map((card, index) => normalizeCard(card, index))
          .filter(Boolean)
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
      : '<p class="muted">A IA não retornou cartões válidos. Confira a resposta do servidor e tente novamente.</p>';

    byId('aiSaveCards').disabled = !selectedCards.length;
  }

  byId('aiAnalyze').addEventListener('click', () => run('analyze'));
  byId('aiTeach').addEventListener('click', () => run('teach'));
  byId('aiSummary').addEventListener('click', () => run('summary'));
  byId('aiActivities').addEventListener('click', () => run('activities'));

  // Permite criar flashcards sem análise anterior.
  byId('aiActivities').disabled = false;

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

    let topicRecord = db.topics.find(
      t => t.name.trim().toLowerCase() === topicName.toLowerCase()
    );

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
      topicRecord.source =
        byId('source').value.trim() || topicRecord.source;

      topicRecord.notes =
        byId('notes').value.trim() || topicRecord.notes;

      topicRecord.updated = now;
      topicRecord.rating = byId('difficulty').value;
    }

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

    save();

    byId('aiSaveStatus').textContent =
      `${chosen.length} flashcard(s) salvo(s) com sucesso!`;

    selectedCards = [];
    byId('aiSaveCards').disabled = true;
  });


  // Painel de geração de flashcards dentro da tela já existente, sem alterar o layout global.
  function installFlashcardGenerator() {
    const screen = byId('cards');
    if (!screen || byId('fcAiPanel')) return;

    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.id = 'fcAiPanel';
    panel.innerHTML =
      '<h2>✨ Criar flashcards com IA</h2>' +
      '<p class="muted">Escolha um assunto, gere cartões e selecione quais deseja guardar. Seus cartões antigos continuam aqui.</p>' +
      '<label for="fcAiTopicSelect">Assunto já cadastrado (opcional)</label>' +
      '<select id="fcAiTopicSelect"><option value="">Escolher assunto existente</option></select>' +
      '<label for="fcAiTopic">Ou digite um novo assunto</label>' +
      '<input id="fcAiTopic" maxlength="120" placeholder="Ex.: sistema respiratório, inglês, história...">' +
      '<label for="fcAiSource">Material de estudo (opcional)</label>' +
      '<textarea id="fcAiSource" maxlength="12000" placeholder="Cole um texto para a IA criar cartões baseados nele. Se deixar vazio, a IA usa conhecimento geral sobre o assunto."></textarea>' +
      '<label for="fcAiCount">Quantidade de flashcards</label>' +
      '<select id="fcAiCount"><option value="5">5 cartões</option><option value="10" selected>10 cartões</option><option value="15">15 cartões</option></select>' +
      '<div class="row" style="margin-top:12px"><button id="fcAiGenerate">Gerar flashcards</button></div>' +
      '<p id="fcAiStatus" class="muted" role="status" aria-live="polite"></p>' +
      '<div id="fcAiPreview"></div>' +
      '<div class="row" style="margin-top:10px"><button id="fcAiSave" disabled>Salvar cartões selecionados</button><button id="fcAiSelectAll" class="secondary" disabled>Selecionar todos</button></div>';

    screen.insertBefore(panel, screen.firstChild);

    const topicSelect = byId('fcAiTopicSelect');
    const topicInput = byId('fcAiTopic');
    const sourceInput = byId('fcAiSource');
    const countSelect = byId('fcAiCount');
    const generateButton = byId('fcAiGenerate');
    const saveButton = byId('fcAiSave');
    const selectAllButton = byId('fcAiSelectAll');
    const preview = byId('fcAiPreview');
    const message = byId('fcAiStatus');
    let generated = [];

    function refreshTopicOptions() {
      const old = topicSelect.value;
      topicSelect.innerHTML = '<option value="">Escolher assunto existente</option>';
      (Array.isArray(db.topics) ? db.topics : []).forEach(function(topic) {
        const option = document.createElement('option');
        option.value = topic.id;
        option.textContent = topic.name;
        topicSelect.appendChild(option);
      });
      if (old && Array.from(topicSelect.options).some(function(option) { return option.value === old; })) {
        topicSelect.value = old;
      }
    }

    topicSelect.addEventListener('change', function() {
      const topic = (db.topics || []).find(function(item) { return item.id === topicSelect.value; });
      if (topic) {
        topicInput.value = topic.name;
        if (!sourceInput.value.trim() && topic.source) sourceInput.value = topic.source;
      }
    });

    function extractCards(data) {
      return data.flashcards || data.cards || data.activities?.flashcards ||
        data.result?.flashcards || data.activities?.cards || [];
    }

    function normalizeGenerated(card) {
      if (!card || typeof card !== 'object') return null;
      const front = String(card.front ?? card.question ?? card.pergunta ?? card.frente ?? card.q ?? '').trim();
      const back = String(card.back ?? card.answer ?? card.resposta ?? card.verso ?? card.a ?? '').trim();
      if (!front || !back) return null;
      return { front: front, back: back, checked: true };
    }

    function renderPreview() {
      preview.innerHTML = '';
      if (!generated.length) {
        saveButton.disabled = true;
        selectAllButton.disabled = true;
        return;
      }
      generated.forEach(function(card, index) {
        const item = document.createElement('div');
        item.className = 'item';
        const label = document.createElement('label');
        label.style.display = 'flex';
        label.style.alignItems = 'center';
        label.style.gap = '8px';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = true;
        checkbox.dataset.fcIndex = String(index);
        checkbox.style.width = 'auto';
        checkbox.addEventListener('change', function() {
          card.checked = checkbox.checked;
          saveButton.disabled = !generated.some(function(entry) { return entry.checked; });
        });
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode('Salvar este cartão'));
        const front = document.createElement('strong');
        front.textContent = card.front;
        const back = document.createElement('p');
        back.textContent = card.back;
        item.appendChild(label);
        item.appendChild(front);
        item.appendChild(back);
        preview.appendChild(item);
      });
      saveButton.disabled = false;
      selectAllButton.disabled = false;
    }

    generateButton.addEventListener('click', async function() {
      const topic = topicInput.value.trim() ||
        ((db.topics || []).find(function(item) { return item.id === topicSelect.value; }) || {}).name || '';
      const source = sourceInput.value.trim();
      const count = Number(countSelect.value) || 10;

      if (!topic) {
        message.textContent = 'Digite um assunto ou escolha um assunto cadastrado.';
        topicInput.focus();
        return;
      }
      if (!endpoint) {
        message.textContent = 'A conexão com a IA não está configurada. Confira ai-config.js.';
        return;
      }
      if (source.length > 12000) {
        message.textContent = 'O material pode ter no máximo 12.000 caracteres.';
        return;
      }

      generated = [];
      renderPreview();
      generateButton.disabled = true;
      saveButton.disabled = true;
      selectAllButton.disabled = true;
      message.textContent = 'A IA está preparando os cartões. Aguarde…';

      try {
        const batchSizes = count === 15 ? [10, 5] : [count];
        for (let batchIndex = 0; batchIndex < batchSizes.length; batchIndex++) {
          const batchCount = batchSizes[batchIndex];
          const batchSource = source
            ? 'Crie exatamente ' + batchCount + ' flashcards diferentes, em português brasileiro, baseados no material abaixo. Cada cartão deve ter pergunta objetiva e resposta correta, útil para revisão. Evite duplicatas.\n\nMATERIAL:\n' + source
            : 'Crie exatamente ' + batchCount + ' flashcards educativos diferentes, em português brasileiro, sobre o assunto "' + topic + '". Cada cartão deve ter uma pergunta objetiva e uma resposta correta e explicativa. Evite duplicatas e não invente fatos específicos.';
          const response = await fetch(endpoint.replace(/\\/$/, '') + '/api/tutor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task: 'activities', topic: topic, source: batchSource, notes: '' })
          });
          const data = await response.json().catch(function() { return {}; });
          if (!response.ok) throw new Error(data.error || ('Falha na solicitação (' + response.status + ').'));
          const batchCards = extractCards(data).map(normalizeGenerated).filter(Boolean);
          batchCards.forEach(function(card) {
            const duplicate = generated.some(function(existing) {
              return existing.front.toLocaleLowerCase() === card.front.toLocaleLowerCase();
            });
            if (!duplicate && generated.length < count) generated.push(card);
          });
        }
        renderPreview();
        message.textContent = generated.length
          ? 'Pronto! Confira os cartões, desmarque os que não quiser e salve os selecionados.'
          : 'A IA não retornou cartões válidos. Tente outro assunto ou cole um material de estudo.';
      } catch (error) {
        message.textContent = 'Não foi possível gerar os cartões: ' + error.message;
      } finally {
        generateButton.disabled = false;
      }
    });

    selectAllButton.addEventListener('click', function() {
      const boxes = preview.querySelectorAll('input[type="checkbox"]');
      const allChecked = Array.from(boxes).every(function(box) { return box.checked; });
      boxes.forEach(function(box) {
        box.checked = !allChecked;
        const card = generated[Number(box.dataset.fcIndex)];
        if (card) card.checked = !allChecked;
      });
      saveButton.disabled = !generated.some(function(card) { return card.checked; });
      selectAllButton.textContent = allChecked ? 'Selecionar todos' : 'Desmarcar todos';
    });

    saveButton.addEventListener('click', function() {
      const chosen = generated.filter(function(card) { return card.checked; });
      if (!chosen.length) {
        message.textContent = 'Selecione pelo menos um cartão.';
        return;
      }
      const topicName = topicInput.value.trim() ||
        ((db.topics || []).find(function(item) { return item.id === topicSelect.value; }) || {}).name || '';
      if (!topicName) {
        message.textContent = 'Informe o assunto antes de salvar.';
        return;
      }

      const now = new Date().toISOString();
      let topicRecord = (db.topics || []).find(function(item) {
        return item.name.trim().toLocaleLowerCase() === topicName.toLocaleLowerCase();
      });
      if (!topicRecord) {
        topicRecord = {
          id: id(), name: topicName, source: sourceInput.value.trim(),
          notes: '', created: now, updated: now, rating: 'ok'
        };
        db.topics.unshift(topicRecord);
      } else {
        if (sourceInput.value.trim()) topicRecord.source = sourceInput.value.trim();
        topicRecord.updated = now;
      }

      chosen.forEach(function(card) {
        db.cards.unshift({
          id: id(), topicId: topicRecord.id, front: card.front, back: card.back,
          created: now, reviews: 0, lastRating: null, nextReview: null
        });
      });
      save();
      refreshTopicOptions();
      topicSelect.value = topicRecord.id;
      topicInput.value = topicRecord.name;
      generated = [];
      renderPreview();
      message.textContent = chosen.length + ' flashcard(s) salvo(s)! Você já pode praticar na área de flashcards.';
    });

    refreshTopicOptions();
  }

  installFlashcardGenerator();

})();
