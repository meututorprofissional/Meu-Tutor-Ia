(() => {
  const config = window.MEU_TUTOR_AUTH_CONFIG || {};
  const nav = document.getElementById('adminSupportNav');
  const status = document.getElementById('adminSupportStatus');
  const list = document.getElementById('adminSupportList');
  const refresh = document.getElementById('adminSupportRefresh');
  if (!nav || !status || !list || !refresh || !window.supabase || !config.supabaseUrl || !config.supabaseAnonKey) return;
  const client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
  let authorized = false;
  let realtimeChannel = null;
  let realtimeDebounce = null;
  async function refreshMessagesOnly(){
    if(!authorized || document.hidden || !document.getElementById('admin-support')?.classList.contains('active'))return;
    const cards=[...list.querySelectorAll('[data-support-conversation]')];
    for(const card of cards){
      const id=card.dataset.supportConversation;
      const {data,error}=await client.from('support_messages').select('id,body,sender_id,created_at').eq('conversation_id',id).order('created_at',{ascending:true}).limit(80);
      if(error||!data)continue;
      const container=card.querySelector('[data-support-messages]');if(!container)continue;
      const existing=new Set([...container.children].map(el=>el.dataset.messageId));
      for(const message of data){if(existing.has(message.id))continue;
        const line=add(container,'div','','item');line.dataset.messageId=message.id;
        const mine=message.sender_id!==card.dataset.ownerId;
        line.style.maxWidth='88%';line.style.marginLeft=mine?'auto':'0';line.style.background=mine?'#e9e5ff':'var(--surface, #f4f5fa)';line.style.borderRadius='16px';
        add(line,'strong',mine?'Equipe':'Usuário');add(line,'p',message.body);add(line,'small',new Date(message.created_at).toLocaleString('pt-BR'),'muted');
      }
    }
  }
  function subscribeAdmin(){if(realtimeChannel)return;realtimeChannel=client.channel('support-admin-live').on('postgres_changes',{event:'INSERT',schema:'public',table:'support_messages'},()=>{if(document.hidden||!document.getElementById('admin-support')?.classList.contains('active'))return;clearTimeout(realtimeDebounce);realtimeDebounce=setTimeout(()=>{refreshMessagesOnly();},350);}).on('postgres_changes',{event:'INSERT',schema:'public',table:'support_conversations'},()=>{if(!document.hidden&&document.getElementById('admin-support')?.classList.contains('active'))load();}).subscribe();}
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
        if(isAdmin)subscribeAdmin();else if(realtimeChannel){client.removeChannel(realtimeChannel);realtimeChannel=null;}
        return isAdmin;
      } catch (error) {
        // Erro transitório não é prova de perda de permissão.
        // O backend e as políticas RLS continuam responsáveis pela autorização.
        return authorized;
      } finally { checking = null; }
    })();
    return checking;
  }
  // Acordeões nativos: mantêm mensagens e formulários existentes intactos.
  function collapseCard(card, title, subtitle, openIds) {
    const details = document.createElement('details');
    details.className = 'admin-support-accordion';
    details.open = openIds.has(card.dataset.supportConversation || card.dataset.supportTicket);
    const summary = document.createElement('summary');
    summary.className = 'admin-support-summary';
    const labels = document.createElement('span');
    labels.className = 'admin-support-summary-labels';
    const heading = document.createElement('strong');
    heading.textContent = title;
    const meta = document.createElement('small');
    meta.textContent = subtitle;
    labels.append(heading, meta);
    const indicator = document.createElement('span');
    indicator.className = 'admin-support-toggle';
    indicator.setAttribute('aria-hidden', 'true');
    summary.append(labels, indicator);
    const content = document.createElement('div');
    content.className = 'admin-support-content';
    while (card.firstChild) content.appendChild(card.firstChild);
    details.append(summary, content);
    card.appendChild(details);
  }
  let loading = false;
  let lastMessageStamp = null;
  let lastConversationStamp = null;
  async function load() {
    if (loading) return;
    loading = true;
    const openIds = new Set([...list.querySelectorAll('details.admin-support-accordion[open]')].map(el => el.closest('article')?.dataset.supportConversation || el.closest('article')?.dataset.supportTicket).filter(Boolean));
    const drafts = new Map();
    list.querySelectorAll('textarea[data-conversation-id]').forEach(el => drafts.set(el.dataset.conversationId, el.value));
    const previousScroll = window.scrollY;
    refresh.disabled = true;
    if(!list.children.length)status.textContent = 'Verificando acesso administrativo…';
    try {
      if (!(await checkAccess())) {
        status.textContent = 'Acesso restrito. Entre novamente com a conta administradora.';
        return;
      }
      // A sessão é renovada automaticamente pelo cliente; não renovar em cada mensagem.
      const [conversations, tickets] = await Promise.all([
        client.from('support_conversations').select('id,user_id,status,created_at').order('created_at', {ascending:false}).limit(40),
        client.from('tutor_feedback').select('id,kind,subject,message,status,created_at,user_id').order('created_at', {ascending:false}).limit(40)
      ]);
      if (conversations.error) throw conversations.error;
      if (tickets.error) throw tickets.error;
      list.replaceChildren();
      const convs = conversations.data || [];
      lastConversationStamp = convs.map(c => c.id + ':' + c.status).join('|');
      const feedback = tickets.data || [];
      status.textContent = convs.length + ' conversas humanas e ' + feedback.length + ' relatos encontrados. Painel de consulta: respostas serão habilitadas após os testes.';
      add(list, 'h3', '🎧 Conversas de atendimento humano');
      if (!convs.length) add(list,'p','Nenhuma conversa registrada.','muted');
      for (const conversation of convs) {
        const card = add(list,'article','','item');
        card.dataset.supportConversation=conversation.id;card.dataset.ownerId=conversation.user_id;
        const messageContainer=document.createElement('div');messageContainer.dataset.supportMessages='';
        add(card,'strong','Conversa · ' + (conversation.status || 'sem situação'));
        add(card,'p',new Date(conversation.created_at).toLocaleString('pt-BR'),'muted');
        const { data: messages, error } = await client.from('support_messages').select('id,body,sender_id,created_at').eq('conversation_id',conversation.id).order('created_at',{ascending:true}).limit(80);
        if (error) { add(card,'p','Não foi possível carregar as mensagens.','muted'); continue; }
        card.appendChild(messageContainer);
        for (const message of messages || []) {
          const line = add(messageContainer,'div','','item');line.dataset.messageId=message.id;
          line.style.maxWidth='88%';line.style.marginLeft=message.sender_id===conversation.user_id?'0':'auto';line.style.background=message.sender_id===conversation.user_id?'var(--surface, #f4f5fa)':'#e9e5ff';line.style.borderRadius='16px';
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
              const { data: inserted, error: insertError } = await client.from('support_messages').insert({ conversation_id: conversation.id, sender_id: authData.user.id, body }).select('id,created_at').single();
              if (insertError) throw insertError;
              replyInput.value = '';typingNow=false;clearTimeout(typingTimer);sendTyping(false);
              replyStatus.textContent = 'Resposta registrada! O usuário poderá vê-la ao abrir o atendimento.';
              if(messageContainer.querySelector('[data-message-id="'+inserted.id+'"]'))return;
              const line = add(messageContainer, 'div', '', 'item');line.dataset.messageId=inserted.id;
              add(line, 'strong', 'Equipe');
              add(line, 'p', body);
              add(line, 'small', new Date(inserted.created_at).toLocaleString('pt-BR'), 'muted');
            } catch (error) {
              console.error('Erro ao responder atendimento:', error);
              replyStatus.textContent = 'Não foi possível enviar. Confira sua sessão e tente novamente.';
            } finally { replyButton.disabled = false; }
          });
          card.appendChild(replyForm);
        }
        collapseCard(card, 'Conversa · ' + (conversation.status || 'sem situação'), new Date(conversation.created_at).toLocaleString('pt-BR'), openIds);
      }
      add(list,'h3','📨 Relatos e chamados');
      if (!feedback.length) add(list,'p','Nenhum relato registrado.','muted');
      for (const ticket of feedback) {
        const card = add(list,'article','','item');
        add(card,'strong',ticket.subject || 'Sem assunto');
        add(card,'p',(ticket.kind || 'Relato') + ' · ' + (ticket.status || 'recebido') + ' · ' + new Date(ticket.created_at).toLocaleString('pt-BR'),'muted');
        add(card,'p',ticket.message);
        const statusLabel = add(card,'label','Situação do chamado');
        const statusSelect = document.createElement('select');
        statusSelect.setAttribute('aria-label','Situação do chamado: ' + (ticket.subject || 'Sem assunto'));
        const statuses = [['novo','Novo'],['em_atendimento','Em atendimento'],['respondido','Respondido'],['resolvido','Resolvido']];
        for (const [value,label] of statuses) { const option = document.createElement('option');option.value=value;option.textContent=label;statusSelect.appendChild(option); }
        statusSelect.value = ticket.status === 'em_analise' ? 'em_atendimento' : (ticket.status || 'novo');
        statusLabel.appendChild(statusSelect);
        const saveStatus = add(card,'button','Salvar situação');
        saveStatus.type='button';
        saveStatus.style.marginTop='8px';
        const statusMessage = add(card,'p','','muted');
        statusMessage.setAttribute('role','status');
        saveStatus.addEventListener('click',async()=>{
          if (!statuses.some(([value])=>value===statusSelect.value)) return;
          saveStatus.disabled=true;statusMessage.textContent='Salvando situação…';
          try {
            const {data:auth,error:authError}=await client.auth.getUser();
            if(authError || auth.user?.app_metadata?.support_admin!==true) throw new Error('Sem permissão administrativa');
            const {data:updated,error}=await client.from('tutor_feedback').update({status:statusSelect.value}).eq('id',ticket.id).select('id,status').single();
            if(error || !updated) throw error || new Error('Chamado não atualizado');
            ticket.status=updated.status;
            statusMessage.textContent='Situação salva: '+(statuses.find(([value])=>value===updated.status)?.[1]||updated.status)+'.';
          } catch(error) {console.error('Atualização do chamado:',error);statusMessage.textContent='Não foi possível salvar. Confira sua permissão e tente novamente.';}
          finally {saveStatus.disabled=false;}
        });
        if (ticket.user_id) {
          const replyHeading=add(card,'h4','Responder ao chamado');
          replyHeading.style.marginBottom='6px';
          const replyHistory=add(card,'div','','');
          const renderReply=(reply)=>{
            const panel=add(replyHistory,'div','','success');
            panel.style.marginTop='8px';
            add(panel,'strong','Equipe de suporte');
            add(panel,'p',reply.message);
            add(panel,'small',new Date(reply.created_at).toLocaleString('pt-BR'),'muted');
          };
          const {data:previousReplies,error:repliesError}=await client.from('tutor_feedback_replies')
            .select('id,message,created_at').eq('feedback_id',ticket.id).order('created_at',{ascending:true});
          if(repliesError) add(card,'p','Não foi possível consultar as respostas anteriores.','muted');
          else (previousReplies||[]).forEach(renderReply);
          const replyForm=document.createElement('form');
          const replyInput=document.createElement('textarea');
          replyInput.rows=3;replyInput.maxLength=2000;replyInput.required=true;
          replyInput.placeholder='Escreva sua resposta para este chamado...';
          replyInput.setAttribute('aria-label','Resposta para o chamado '+ticket.subject);
          replyForm.appendChild(replyInput);
          const replyButton=add(replyForm,'button','Enviar resposta ao chamado');
          replyButton.type='submit';
          const replyNotice=add(replyForm,'p','','muted');replyNotice.setAttribute('role','status');
          replyForm.addEventListener('submit',async(event)=>{
            event.preventDefault();
            const message=replyInput.value.trim();
            if(!message||message.length>2000)return;
            replyButton.disabled=true;replyNotice.textContent='Enviando resposta…';
            try{
              const {data:refreshed,error:refreshError}=await client.auth.refreshSession();
              if(refreshError || !refreshed?.session) throw new Error('Sessão expirada. Entre novamente na conta administradora.');
              const {data:auth,error:authError}=await client.auth.getUser();
              if(authError || auth.user?.app_metadata?.support_admin!==true) throw new Error('Permissão de administrador não confirmada. Entre novamente na conta ADM.');
              const {error:insertError}=await client.from('tutor_feedback_replies').insert({
                feedback_id:ticket.id,message,author_id:auth.user.id
              });
              if(insertError)throw insertError;
              replyInput.value='';
              replyNotice.textContent='Resposta enviada. O usuário poderá vê-la em Meus chamados.';
              const {data:latest,error:readError}=await client.from('tutor_feedback_replies')
                .select('id,message,created_at').eq('feedback_id',ticket.id).order('created_at',{ascending:true});
              if(!readError&&latest){replyHistory.replaceChildren();latest.forEach(renderReply);}
            }catch(error){
              console.error('Resposta ao chamado:',error);
              const code = String(error?.code || '');
              if (/Sessão expirada|Permissão de administrador/.test(error?.message || '')) replyNotice.textContent = error.message;
              else if (code === '42501' || code === 'PGRST301') replyNotice.textContent = 'Acesso negado ao enviar. Confira a permissão ADM e entre novamente. Código: ' + code;
              else replyNotice.textContent = 'Não foi possível enviar a resposta. Código: ' + (code || 'indisponível') + '. Confira a conexão e tente novamente.';
            }
            finally{replyButton.disabled=false;}
          });
          card.appendChild(replyForm);
        }
        card.dataset.supportTicket = ticket.id;
        if (!ticket.user_id) add(card,'small','Relato antigo sem conta vinculada.','muted');
        collapseCard(card, ticket.subject || 'Sem assunto', (ticket.kind || 'Relato') + ' · ' + (ticket.status || 'recebido') + ' · ' + new Date(ticket.created_at).toLocaleString('pt-BR'), openIds);
      }
    } catch (error) {
      console.error('Painel administrativo:',error);
      status.textContent = 'Não foi possível carregar os atendimentos. Verifique sua sessão e tente novamente.';
    } finally { refresh.disabled = false; loading = false; if (Math.abs(window.scrollY-previousScroll)>2) window.scrollTo(0,previousScroll); }
  }
  refresh.addEventListener('click',load);
  document.addEventListener('click',e => {
    if (e.target instanceof Element && e.target.closest('[data-screen="admin-support"],[data-go="admin-support"]')) load();
  });
  client.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') { activeUserId = null; setAccess(false);if(realtimeChannel){client.removeChannel(realtimeChannel);realtimeChannel=null;} }
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
      if (stamp !== lastMessageStamp || convStamp !== lastConversationStamp) { lastMessageStamp = stamp; if(convStamp!==lastConversationStamp)load();else refreshMessagesOnly(); }
    })().catch(() => {});
  }, 15000);
})();