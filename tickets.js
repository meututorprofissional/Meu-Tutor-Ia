(() => {
  const config = window.MEU_TUTOR_AUTH_CONFIG || {};
  const status = document.getElementById('ticketsStatus');
  const list = document.getElementById('ticketsList');
  const refresh = document.getElementById('ticketsRefresh');
  if (!status || !list || !refresh) return;
  let client;
  try {
    // Same default Supabase auth storage as the existing profile module.
    if (window.supabase && config.supabaseUrl && config.supabaseAnonKey)
      client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
  } catch (error) { console.warn('Central de atendimento:', error); }
  const statusLabels = { novo: 'Novo', em_analise: 'Em atendimento', em_atendimento: 'Em atendimento', respondido: 'Respondido', resolvido: 'Resolvido' };
  const line = (parent, tag, value, className) => {
    const el = document.createElement(tag);
    el.textContent = value;
    if (className) el.className = className;
    parent.appendChild(el);
    return el;
  };
  let lastSnapshot = null;
  let activeUser = null;
  let channel = null;
  let busy = false;
  let pending = false;
  const notice = document.getElementById('ticketsNotice');
  function checkNewReplies(userId, data) {
    if (!notice) return;
    const signatures = (data || []).flatMap(t => (t.tutor_feedback_replies || []).map(r => t.id + ':' + r.created_at + ':' + r.message));
    const key = 'meuTutorIA.ticketNotices.' + userId;
    let old;
    try { old = JSON.parse(localStorage.getItem(key) || 'null'); } catch (_) { old = null; }
    if (!Array.isArray(old)) {
      try { localStorage.setItem(key, JSON.stringify(signatures)); } catch (_) {}
      notice.hidden = true;
      return;
    }
    const known = new Set(old);
    const count = signatures.filter(x => !known.has(x)).length;
    if (count > 0) {
      notice.textContent = count === 1 ? '🔔 Nova resposta da equipe de suporte recebida!' : '🔔 ' + count + ' novas respostas da equipe de suporte!';
      notice.hidden = false;
      try { localStorage.setItem(key, JSON.stringify([...new Set([...old, ...signatures])])); } catch (_) {}
    }
  }
  function subscribe(userId) {
    if (activeUser === userId && channel) return;
    if (channel) { client.removeChannel(channel); channel = null; }
    activeUser = userId;
    if (!userId) return;
    channel = client.channel('meu-tutor-tickets-' + userId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tutor_feedback', filter: 'user_id=eq.' + userId }, () => load(true))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tutor_feedback_replies' }, () => load(true))
      .subscribe();
  }
  async function load(silent = false) {
    if (busy) { pending = true; return; }
    busy = true;
    if (!client) { status.textContent = 'O serviço de contas não está disponível no momento.'; busy = false; return; }
    if (!silent) status.textContent = 'Consultando seus chamados…';
    if (!silent) refresh.disabled = true;
    try {
      const { data: sessionData, error: authError } = await client.auth.getSession();
      if (authError) throw authError;
      if (!sessionData.session?.user) {
        subscribe(null);
        if (notice) notice.hidden = true;
        lastSnapshot = null;
        list.replaceChildren();
        status.textContent = 'Entre com Google na área Seu perfil para consultar os chamados vinculados à sua conta.';
        return;
      }
      subscribe(sessionData.session.user.id);
      const { data, error } = await client.from('tutor_feedback')
        .select('id,kind,subject,message,status,created_at,tutor_feedback_replies(message,created_at)')
        .eq('user_id', sessionData.session.user.id).order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      checkNewReplies(sessionData.session.user.id, data);
      const snapshot = JSON.stringify(data || []);
      if (snapshot === lastSnapshot) {
        status.textContent = data.length + (data.length === 1 ? ' chamado encontrado.' : ' chamados encontrados.');
        return;
      }
      lastSnapshot = snapshot;
      list.replaceChildren();
      if (!data?.length) {
        status.textContent = 'Nenhum chamado vinculado à sua conta ainda. Os relatos antigos, enviados sem identificação, não aparecem aqui.';
        return;
      }
      status.textContent = data.length + (data.length === 1 ? ' chamado encontrado.' : ' chamados encontrados.');
      data.forEach(ticket => {
        const article = document.createElement('article');
        article.className = 'item';
        line(article, 'strong', ticket.subject);
        line(article,'small','Protocolo: '+String(ticket.id).slice(0,8).toUpperCase(),'muted');
        line(article, 'p', 'Tipo: ' + ticket.kind + ' · Situação: ' + (statusLabels[ticket.status] || ticket.status) + ' · ' + new Date(ticket.created_at).toLocaleString('pt-BR'), 'muted');
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
    } finally {
      busy = false;
      refresh.disabled = false;
      if (pending) { pending = false; load(true); }
    }
  }
  refresh.addEventListener('click', () => load(false));
  setInterval(() => {
    if (document.visibilityState === 'visible' && document.getElementById('tickets')?.classList.contains('active')) load(true);
  }, 15000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && document.getElementById('tickets')?.classList.contains('active')) load(true);
  });
  if (client) client.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
      lastSnapshot = null;
      if (document.getElementById('tickets')?.classList.contains('active')) setTimeout(() => load(true), 0);
    }
  });
  document.addEventListener('click', event => {
    if (event.target instanceof Element && event.target.closest('[data-screen="tickets"],[data-go="tickets"]')) load();
  });
})();