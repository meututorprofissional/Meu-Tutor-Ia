(() => {
  const config = window.MEU_TUTOR_AUTH_CONFIG || {};
  const nav = document.getElementById('adminSupportNav');
  const status = document.getElementById('adminSupportStatus');
  const list = document.getElementById('adminSupportList');
  const refresh = document.getElementById('adminSupportRefresh');
  if (!nav || !status || !list || !refresh || !window.supabase || !config.supabaseUrl || !config.supabaseAnonKey) return;
  const client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
  let authorized = false;
  const add = (parent, tag, content, className) => {
    const el = document.createElement(tag);
    el.textContent = content == null ? '' : String(content);
    if (className) el.className = className;
    parent.appendChild(el);
    return el;
  };
  let activeUserId = null;
  let checking = null;
  function setAccess(allowed) {
    authorized = allowed;
    nav.style.display = allowed ? '' : 'none';
  }
  async function checkAccess() {
    if (checking) return checking;
    checking = (async () => {
      try {
        const { data: sessionData } = await client.auth.getSession();
        const currentId = sessionData.session?.user?.id || null;
        if (!currentId) {
          activeUserId = null;
          setAccess(false);
          return false;
        }
        if (activeUserId && currentId !== activeUserId) setAccess(false);
        activeUserId = currentId;
        const { data, error } = await client.auth.getUser();
        if (error) throw error;
        if (data.user?.id !== currentId) throw new Error('Sessão alterada durante a consulta');
        const isAdmin = data.user.app_metadata?.support_admin === true;
        setAccess(isAdmin);
        return isAdmin;
      } catch (error) {
        // Erro transitório não é prova de perda de permissão.
        // O backend e as políticas RLS continuam responsáveis pela autorização.
        return authorized;
      } finally { checking = null; }
    })();
    return checking;
  }
  let loading = false;
  let lastMessageStamp = null;
  let lastConversationStamp = null;
  async function load() {
    if (loading) return;
    loading = true;
    const drafts = new Map();
    list.querySelectorAll('textarea[data-conversation-id]').forEach(el => drafts.set(el.dataset.conversationId, el.value));
    const previousScroll = window.scrollY;
    list.replaceChildren();
    refresh.disabled = true;
    status.textContent = 'Verificando acesso administrativo…';
    try {
      if (!(await checkAccess())) {
        status.textContent = 'Acesso restrito. Entre novamente com a conta administradora.';
        return;
      }
      // RLS reads the JWT claims, which may be older than getUser() app_metadata.
      // Refresh before privileged reads so the server receives current admin claims.
      const { error: refreshError } = await client.auth.refreshSession();
      if (refreshError) throw refreshError;
      if (!(await checkAccess())) throw new Error('Permissão administrativa não confirmada.');
      const [conversations, tickets] = await Promise.all([
        client.from('support_conversations').select('id,user_id,status,created_at').order('created_at', {ascending:false}).limit(40),
        client.from('tutor_feedback').select('id,kind,subject,message,status,created_at,user_id').order('created_at', {ascending:false}).limit(40)
      ]);
      if (conversations.error) throw conversations.error;
      if (tickets.error) throw tickets.error;
      const convs = conversations.data || [];
      lastConversationStamp = convs.map(c => c.id + ':' + c.status).join('|');
      const feedback = tickets.data || [];
      status.textContent = convs.length + ' conversas humanas e ' + feedback.length + ' relatos encontrados. Painel de consulta: respostas serão habilitadas após os testes.';
      add(list, 'h3', '🎧 Conversas de atendimento humano');
      if (!convs.length) add(list,'p','Nenhuma conversa registrada.','muted');
      for (const conversation of convs) {
        const card = add(list,'article','','item');
        add(card,'strong','Conversa · ' + (conversation.status || 'sem situação'));
        add(card,'p',new Date(conversation.created_at).toLocaleString('pt-BR'),'muted');
        const { data: messages, error } = await client.from('support_messages').select('body,sender_id,created_at').eq('conversation_id',conversation.id).order('created_at',{ascending:true}).limit(80);
        if (error) { add(card,'p','Não foi possível carregar as mensagens.','muted'); continue; }
        for (const message of messages || []) {
          const line = add(card,'div','','item');
          add(line,'strong',message.sender_id === conversation.user_id ? 'Usuário' : 'Equipe');
          add(line,'p',message.body);
          add(line,'small',new Date(message.created_at).toLocaleString('pt-BR'),'muted');
        }
        if (conversation.status !== 'encerrado') {
          const replyForm = document.createElement('form');
          replyForm.style.marginTop = '12px';
          const replyLabel = add(replyForm, 'label', 'Responder ao usuário');
          const replyInput = document.createElement('textarea');
          replyInput.dataset.conversationId = conversation.id;
          replyInput.value = drafts.get(conversation.id) || '';
          replyInput.maxLength = 1000;
          replyInput.required = true;
          const typingLine=add(card,'p','','muted');
          typingLine.dataset.typingConversation=conversation.id;
          let typingTimer=null,typingNow=false;
          async function sendTyping(on){try{const {data}=await client.auth.getUser();if(!data.user)return;await client.from('support_typing').upsert({conversation_id:conversation.id,user_id:data.user.id,is_admin:true,expires_at:new Date(Date.now()+(on?6500:0)).toISOString()});}catch(_){}}
          replyInput.addEventListener('input',()=>{if(!typingNow){typingNow=true;sendTyping(true);}clearTimeout(typingTimer);typingTimer=setTimeout(()=>{typingNow=false;sendTyping(false);},3500);});
          replyInput.rows = 3;
          replyInput.placeholder = 'Escreva sua resposta como equipe de suporte...';
          replyLabel.appendChild(replyInput);
          const replyButton = add(replyForm, 'button', 'Enviar resposta');
          replyButton.type = 'submit';
          const replyStatus = add(replyForm, 'p', '', 'muted');
          replyStatus.setAttribute('role', 'status');
          replyForm.addEventListener('submit', async event => {
            event.preventDefault();
            const body = replyInput.value.trim();
            if (!body || body.length > 1000) return;
            replyButton.disabled = true;
            replyStatus.textContent = 'Enviando resposta...';
            try {
              const { data: authData, error: authError } = await client.auth.getUser();
              if (authError || authData.user?.app_metadata?.support_admin !== true) throw new Error('Acesso administrativo não confirmado.');
              const { error: insertError } = await client.from('support_messages').insert({ conversation_id: conversation.id, sender_id: authData.user.id, body });
              if (insertError) throw insertError;
              replyInput.value = '';typingNow=false;clearTimeout(typingTimer);sendTyping(false);
              replyStatus.textContent = 'Resposta registrada! O usuário poderá vê-la ao abrir o atendimento.';
              const line = add(card, 'div', '', 'item');
              add(line, 'strong', 'Equipe');
              add(line, 'p', body);
              add(line, 'small', new Date().toLocaleString('pt-BR'), 'muted');
            } catch (error) {
              console.error('Erro ao responder atendimento:', error);
              replyStatus.textContent = 'Não foi possível enviar. Confira sua sessão e tente novamente.';
            } finally { replyButton.disabled = false; }
          });
          card.appendChild(replyForm);
        }
      }
      add(list,'h3','📨 Relatos e chamados');
      if (!feedback.length) add(list,'p','Nenhum relato registrado.','muted');
      for (const ticket of feedback) {
        const card = add(list,'article','','item');
        add(card,'strong',ticket.subject || 'Sem assunto');
        add(card,'p',(ticket.kind || 'Relato') + ' · ' + (ticket.status || 'recebido') + ' · ' + new Date(ticket.created_at).toLocaleString('pt-BR'),'muted');
        add(card,'p',ticket.message);
        if (!ticket.user_id) add(card,'small','Relato antigo sem conta vinculada.','muted');
      }
    } catch (error) {
      console.error('Painel administrativo:',error);
      status.textContent = 'Não foi possível carregar os atendimentos. Verifique sua sessão e tente novamente.';
    } finally { refresh.disabled = false; loading = false; if (drafts.size) window.scrollTo(0,previousScroll); }
  }
  refresh.addEventListener('click',load);
  document.addEventListener('click',e => {
    if (e.target instanceof Element && e.target.closest('[data-screen="admin-support"],[data-go="admin-support"]')) load();
  });
  client.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') { activeUserId = null; setAccess(false); }
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') setTimeout(checkAccess, 0);
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkAccess(); });
  checkAccess();
  setInterval(async()=>{
    if(document.hidden||!document.getElementById('admin-support')?.classList.contains('active')||!authorized)return;
    const indicators=[...list.querySelectorAll('[data-typing-conversation]')];
    if(!indicators.length)return;
    try{const {data,error}=await client.from('support_typing').select('conversation_id,is_admin,expires_at').eq('is_admin',false).gt('expires_at',new Date().toISOString());if(error)return;const ids=new Set((data||[]).map(x=>x.conversation_id));indicators.forEach(el=>el.textContent=ids.has(el.dataset.typingConversation)?'Usuário está digitando…':'');}catch(_){}
  },2000);
  // Atualiza apenas com a aba visível e o painel aberto; preserva rascunhos.
  setInterval(() => {
    if (document.hidden || !document.getElementById('admin-support')?.classList.contains('active') || loading || list.querySelector('textarea:focus')) return;
    (async () => {
      const [messages, conversations] = await Promise.all([
        client.from('support_messages').select('id,created_at').order('created_at',{ascending:false}).limit(1),
        client.from('support_conversations').select('id,status').order('created_at',{ascending:false}).limit(40)
      ]);
      if (messages.error || conversations.error) return;
      const stamp = messages.data?.[0]?.id || '';
      const convStamp = (conversations.data || []).map(c => c.id + ':' + c.status).join('|');
      if (lastMessageStamp === null) { lastMessageStamp = stamp; if (convStamp !== lastConversationStamp) load(); return; }
      if (stamp !== lastMessageStamp || convStamp !== lastConversationStamp) { lastMessageStamp = stamp; load(); }
    })().catch(() => {});
  }, 4000);
})();