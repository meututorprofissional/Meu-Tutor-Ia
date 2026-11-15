
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
    const topicSelect=byId('fcAiTopic'), countSelect=byId('fcAiCount');
    const createButton=byId('fcAiCreate'), saveButton=byId('fcAiSave'), review=byId('fcAiReview');
    const preview=byId('fcAiPreview'), message=byId('fcAiStatus');
    if(!topicSelect||!countSelect||!createButton||!saveButton||!review||!preview||!message)return;
    let generated=[];
    function refreshTopicOptions(){
      const old=topicSelect.value;
      topicSelect.innerHTML='<option value="">Selecione um assunto</option>';
      (db.topics||[]).forEach(topic=>{const option=document.createElement('option');option.value=topic.id;option.textContent=topic.name;topicSelect.appendChild(option)});
      if(old&&Array.from(topicSelect.options).some(option=>option.value===old))topicSelect.value=old;
    }
    const extractCards=data=>data.flashcards||data.cards||data.activities?.flashcards||data.result?.flashcards||data.activities?.cards||[];
    function normalize(card){
      if(!card||typeof card!=='object')return null;
      const front=String(card.front??card.question??card.pergunta??card.frente??card.q??'').trim();
      const back=String(card.back??card.answer??card.resposta??card.verso??card.a??'').trim();
      if(!front||!back)return null;
      const raw=card.options??card.choices??card.alternatives??card.opcoes??card.alternativas;
      const options=Array.isArray(raw)?raw.map(v=>String(typeof v==='object'?(v.text??v.option??v.value??''):v).trim()).filter(Boolean):[];
      const answer=card.correctIndex??card.correct_index??card.correctAnswerIndex??card.correctAnswer??card.correct_answer??card.respostaCorreta??card.resposta_correta;
      let correctIndex=typeof answer==='number'?answer:-1;
      if(correctIndex<0&&typeof answer==='string'){
        const num=Number(answer);
        correctIndex=Number.isInteger(num)&&num>=0&&num<options.length?num:options.findIndex(v=>v.toLowerCase()===answer.trim().toLowerCase());
      }
      if(correctIndex<0)correctIndex=options.findIndex(v=>v.toLowerCase()===back.toLowerCase());
      return {front,back,options,correctIndex,explanation:String(card.explanation??card.explicacao??card.justification??card.justificativa??back).trim()};
    }
    function prepareOptions(){
      generated.forEach((card,index)=>{
        if(card.options.length>=2&&card.correctIndex>=0&&card.correctIndex<card.options.length){
          const answer=card.options[card.correctIndex];
          card.options=card.options.slice().sort(()=>Math.random()-.5);
          card.correctIndex=card.options.findIndex(v=>v===answer);
          return;
        }
        const others=generated.filter((other,i)=>i!==index&&other.back.toLowerCase()!==card.back.toLowerCase()).map(other=>other.back);
        card.options=[card.back,...others].filter((v,i,all)=>all.findIndex(x=>x.toLowerCase()===v.toLowerCase())===i).slice(0,4);
        card.correctIndex=0;
        const answer=card.back;
        card.options=card.options.sort(()=>Math.random()-.5);
        card.correctIndex=card.options.findIndex(v=>v===answer);
      });
    }
    function renderPreview(){
      preview.innerHTML='';
      generated.forEach((card,index)=>{
        const item=document.createElement('div');item.className='item';
        const title=document.createElement('strong');title.textContent=(index+1)+'. '+card.front;
        const answer=document.createElement('p');answer.textContent=card.back;
        const meta=document.createElement('p');meta.className='muted';meta.textContent='Quiz de múltipla escolha · '+card.options.length+' alternativas';
        item.append(title,answer,meta);preview.appendChild(item);
      });
      saveButton.disabled=!generated.length;
    }
    createButton.addEventListener('click',async()=>{
      const topicRecord=(db.topics||[]).find(item=>item.id===topicSelect.value);
      const topic=topicRecord?.name||'',count=Number(countSelect.value)||5;
      if(!topicRecord){message.textContent='Escolha um assunto cadastrado. Para criar um assunto novo, registre-o primeiro em Meu estudo.';topicSelect.focus();return}
      if(!endpoint){message.textContent='A conexão com a IA não está configurada. Confira ai-config.js.';return}
      generated=[];renderPreview();review.hidden=true;createButton.disabled=true;saveButton.disabled=true;
      message.textContent='A IA está criando as perguntas e alternativas do quiz. Aguarde…';
      try{
        const batches=count===15?[10,5]:[count];
        for(const batchCount of batches){
          const source=topicRecord.source
            ?'Crie exatamente '+batchCount+' flashcards para um quiz de múltipla escolha em português brasileiro, usando o material abaixo. Cada cartão deve ter front (pergunta), back (resposta correta), options (4 alternativas incluindo a correta), correctIndex (índice de 0 a 3 da correta dentro de options) e explanation (explicação curta). As alternativas erradas devem ser plausíveis, mas incorretas segundo o material. Retorne os cartões em flashcards e evite duplicatas.\n\nMATERIAL:\n'+topicRecord.source
            :'Crie exatamente '+batchCount+' flashcards para um quiz de múltipla escolha em português brasileiro sobre "'+topic+'". Cada cartão deve ter front (pergunta), back (resposta correta), options (4 alternativas incluindo a correta), correctIndex (índice de 0 a 3 da correta dentro de options) e explanation (explicação curta). As alternativas erradas devem ser plausíveis, mas incorretas. Retorne os cartões em flashcards e evite duplicatas.';
          const response=await fetch(endpoint.replace(/\/$/,'')+'/api/tutor',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({task:'activities',topic,source,notes:topicRecord.notes||''})});
          const data=await response.json().catch(()=>({}));
          if(!response.ok)throw new Error(data.error||'Falha na solicitação ('+response.status+').');
          extractCards(data).map(normalize).filter(Boolean).forEach(card=>{if(generated.length<count&&!generated.some(old=>old.front.toLowerCase()===card.front.toLowerCase()))generated.push(card)});
        }
        if(!generated.length)throw new Error('A IA não retornou perguntas válidas. Tente novamente.');
        prepareOptions();review.hidden=false;renderPreview();
        message.textContent='Quiz pronto! Salvando os cartões e iniciando a prática automaticamente…';
        saveButton.click();
      }catch(error){message.textContent='Não foi possível gerar o quiz: '+error.message}
      finally{createButton.disabled=false}
    });
    saveButton.addEventListener('click',()=>{
      if(!generated.length)return;
      const topicRecord=(db.topics||[]).find(item=>item.id===topicSelect.value);
      if(!topicRecord){message.textContent='Escolha um assunto cadastrado antes de salvar.';return}
      const now=new Date().toISOString();
      const saved=generated.map(card=>({id:id(),topicId:topicRecord.id,front:card.front,back:card.back,options:card.options,correctIndex:card.correctIndex,explanation:card.explanation,created:now,reviews:0,lastRating:null,nextReview:null}));
      db.cards.unshift(...saved);save();refreshTopicOptions();topicSelect.value=topicRecord.id;generated=[];renderPreview();review.hidden=true;
      message.textContent=saved.length+' cartões salvos! Começando o quiz…';
      if(typeof window.startFlashcardQuiz==='function')window.startFlashcardQuiz(saved.map(card=>card.id));
      else if(typeof window.practiceNow==='function')window.practiceNow();
    });
    refreshTopicOptions();
  }

  installFlashcardGenerator();

})();
