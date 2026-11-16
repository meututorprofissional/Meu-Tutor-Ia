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
  async function checkAccess() {
    try {
      const { data, error } = await client.auth.getUser();
      if (error) throw error;
      const isAdmin = data.user?.app_metadata?.support_admin === true;
      authorized = Boolean(isAdmin);
      nav.style.display = isAdmin ? '' : 'none';
      if (!isAdmin && document.getElementById('admin-support')?.classList.contains('active')) {
        document.querySelector('[data-screen="home"]')?.click();
      }
      return authorized;
    } catch (error) {
      authorized = false;
      nav.style.display = 'none';
      return false;
    }
  }
  async function load() {
    list.replaceChildren();
    refresh.disabled = true;
    status.textContent = 'Verificando acesso administrativo…';
    try {
      if (!(await checkAccess())) {
        status.textContent = 'Acesso restrito. Entre novamente com a conta administradora.';
        return;
      }
      const [conversations, tickets] = await Promise.all([
        client.from('support_conversations').select('id,user_id,status,created_at').order('created_at', {ascending:false}).limit(40),
        client.from('tutor_feedback').select('id,kind,subject,message,status,created_at,user_id').order('created_at', {ascending:false}).limit(40)
      ]);
      if (conversations.error) throw conversations.error;
      if (tickets.error) throw tickets.error;
      const convs = conversations.data || [];
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
    } finally { refresh.disabled = false; }
  }
  refresh.addEventListener('click',load);
  document.addEventListener('click',e => {
    if (e.target instanceof Element && e.target.closest('[data-screen="admin-support"],[data-go="admin-support"]')) load();
  });
  client.auth.onAuthStateChange(() => { setTimeout(checkAccess,0); });
  checkAccess();
})();