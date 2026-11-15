
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


  // Geração de flashcards ligada ao painel estático da tela de Flashcards.
  function installFlashcardGenerator() {
    const topicSelect=byId('fcAiTopic'), topicInput=byId('fcAiNewTopic'), countSelect=byId('fcAiCount');
    const createButton=byId('fcAiCreate'), saveButton=byId('fcAiSave'), review=byId('fcAiReview');
    const preview=byId('fcAiPreview'), message=byId('fcAiStatus');
    if(!topicSelect||!topicInput||!countSelect||!createButton||!saveButton||!review||!preview||!message)return;
    let generated=[];
    function refreshTopicOptions(){
      const old=topicSelect.value;topicSelect.innerHTML='<option value="">Selecione um assunto</option>';
      (db.topics||[]).forEach(topic=>{const option=document.createElement('option');option.value=topic.id;option.textContent=topic.name;topicSelect.appendChild(option)});
      if(old&&Array.from(topicSelect.options).some(option=>option.value===old))topicSelect.value=old;
    }
    topicSelect.addEventListener('change',()=>{const t=(db.topics||[]).find(item=>item.id===topicSelect.value);if(t)topicInput.value=t.name});
    const extractCards=data=>data.flashcards||data.cards||data.activities?.flashcards||data.result?.flashcards||data.activities?.cards||[];
    const normalize=card=>{if(!card||typeof card!=='object')return null;const front=String(card.front??card.question??card.pergunta??card.frente??card.q??'').trim();const back=String(card.back??card.answer??card.resposta??card.verso??card.a??'').trim();return front&&back?{front,back,checked:true}:null};
    function renderPreview(){
      preview.innerHTML='';
      if(!generated.length){saveButton.disabled=true;return}
      generated.forEach(card=>{const item=document.createElement('div');item.className='item';const label=document.createElement('label');const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=card.checked;checkbox.style.width='auto';checkbox.addEventListener('change',()=>{card.checked=checkbox.checked;saveButton.disabled=!generated.some(entry=>entry.checked)});label.append(checkbox,document.createTextNode('Salvar este cartão'));const front=document.createElement('strong');front.textContent=card.front;const back=document.createElement('p');back.textContent=card.back;item.append(label,front,back);preview.appendChild(item)});
      saveButton.disabled=!generated.some(card=>card.checked);
    }
    createButton.addEventListener('click',async()=>{
      const existing=(db.topics||[]).find(item=>item.id===topicSelect.value),topic=topicInput.value.trim()||(existing||{}).name||'',count=Number(countSelect.value)||5;
      if(!topic){message.textContent='Digite um assunto ou escolha um assunto cadastrado.';topicInput.focus();return}
      if(!endpoint){message.textContent='A conexão com a IA não está configurada. Confira ai-config.js.';return}
      const source=(existing||{}).source||'';
      generated=[];renderPreview();review.hidden=true;createButton.disabled=true;saveButton.disabled=true;message.textContent='A IA está preparando os cartões. Aguarde…';
      try{
        const batches=count===15?[10,5]:[count];
        for(const batchCount of batches){
          const prompt=source?'Crie exatamente '+batchCount+' flashcards diferentes, em português brasileiro, baseados no material abaixo. Cada cartão deve ter pergunta objetiva e resposta correta. Evite duplicatas.\n\nMATERIAL:\n'+source:'Crie exatamente '+batchCount+' flashcards educativos diferentes, em português brasileiro, sobre o assunto "'+topic+'". Cada cartão deve ter uma pergunta objetiva e uma resposta correta e explicativa. Evite duplicatas.';
          const response=await fetch(endpoint.replace(/\/$/,'')+'/api/tutor',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({task:'activities',topic,source:prompt,notes:(existing||{}).notes||''})});
          const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'Falha na solicitação ('+response.status+').');
          extractCards(data).map(normalize).filter(Boolean).forEach(card=>{if(generated.length<count&&!generated.some(old=>old.front.trim().toLocaleLowerCase()===card.front.trim().toLocaleLowerCase()))generated.push(card)});
        }
        review.hidden=false;renderPreview();message.textContent=generated.length?'Pronto! Confira os cartões e desmarque os que não quiser salvar.':'A IA não retornou cartões válidos. Tente novamente.';
      }catch(error){message.textContent='Não foi possível gerar os cartões: '+error.message}finally{createButton.disabled=false}
    });
    saveButton.addEventListener('click',()=>{
      const chosen=generated.filter(card=>card.checked);if(!chosen.length){message.textContent='Marque pelo menos um cartão para salvar.';return}
      const existing=(db.topics||[]).find(item=>item.id===topicSelect.value),name=topicInput.value.trim()||(existing||{}).name||'';if(!name){message.textContent='Informe o assunto antes de salvar.';return}
      const now=new Date().toISOString();let topic=(db.topics||[]).find(item=>item.name.trim().toLocaleLowerCase()===name.toLocaleLowerCase());
      if(!topic){topic={id:id(),name,source:(existing||{}).source||'',notes:(existing||{}).notes||'',created:now,updated:now,rating:'ok'};db.topics.unshift(topic)}else topic.updated=now;
      chosen.forEach(card=>db.cards.unshift({id:id(),topicId:topic.id,front:card.front,back:card.back,created:now,reviews:0,lastRating:null,nextReview:null}));
      save();refreshTopicOptions();topicSelect.value=topic.id;topicInput.value=topic.name;generated=[];renderPreview();review.hidden=true;message.textContent=chosen.length+' cartão(ões) salvo(s)! Vamos praticar.';
      if(typeof window.practiceNow==='function')window.practiceNow();
    });
    refreshTopicOptions();
  }

  installFlashcardGenerator();

})();
