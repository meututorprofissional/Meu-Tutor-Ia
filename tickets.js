(() => {
  const config = window.MEU_TUTOR_AUTH_CONFIG || {};
  const status = document.getElementById('ticketsStatus');
  const list = document.getElementById('ticketsList');
  const refresh = document.getElementById('ticketsRefresh');
  if (!status || !list || !refresh) return;
  let client;
  try {
    if (window.supabase && config.supabaseUrl && config.supabaseAnonKey)
      client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, { auth: { storageKey: 'meu-tutor-ia-auth' } });
  } catch (error) { console.warn('Central de atendimento:', error); }
  // Use the same default Supabase auth storage as the profile module.
  if (client) client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
  const line = (parent, tag, value, className) => {
    const el = document.createElement(tag);
    el.textContent = value;
    if (className) el.className = className;
    parent.appendChild(el);
    return el;
  };
  async function load() {
    list.replaceChildren();
    if (!client) { status.textContent = 'O serviço de contas não está disponível no momento.'; return; }
    status.textContent = 'Consultando seus chamados…';
    refresh.disabled = true;
    try {
      const { data: sessionData, error: authError } = await client.auth.getSession();
      if (authError) throw authError;
      if (!sessionData.session?.user) {
        status.textContent = 'Entre com Google na área Seu perfil para consultar os chamados vinculados à sua conta.';
        return;
      }
      const { data, error } = await client.from('tutor_feedback')
        .select('id,kind,subject,message,status,created_at,tutor_feedback_replies(message,created_at)')
        .eq('user_id', sessionData.session.user.id).order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      if (!data?.length) {
        status.textContent = 'Nenhum chamado vinculado à sua conta ainda. Os relatos antigos, enviados sem identificação, não aparecem aqui.';
        return;
      }
      status.textContent = data.length + (data.length === 1 ? ' chamado encontrado.' : ' chamados encontrados.');
      data.forEach(ticket => {
        const article = document.createElement('article');
        article.className = 'item';
        line(article, 'strong', ticket.subject);
        line(article, 'p', 'Tipo: ' + ticket.kind + ' · Situação: ' + ticket.status + ' · ' + new Date(ticket.created_at).toLocaleDateString('pt-BR'), 'muted');
        line(article, 'p', ticket.message);
        const replies = (ticket.tutor_feedback_replies || []).slice().sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
        replies.forEach(reply => {
          const panel = document.createElement('div');
          panel.className = 'success';
          line(panel, 'strong', 'Resposta do suporte');
          line(panel, 'p', reply.message);
          line(panel, 'small', new Date(reply.created_at).toLocaleString('pt-BR'));
          article.appendChild(panel);
        });
        list.appendChild(article);
      });
    } catch (error) {
      console.error('Falha ao consultar chamados:', error);
      status.textContent = 'Não foi possível carregar seus chamados. Tente novamente.';
    } finally { refresh.disabled = false; }
  }
  refresh.addEventListener('click', load);
  document.addEventListener('click', event => {
    if (event.target instanceof Element && event.target.closest('[data-screen="tickets"],[data-go="tickets"]')) load();
  });
})();