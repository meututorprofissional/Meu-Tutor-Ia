(() => {
  const cfg = window.MEU_TUTOR_AUTH_CONFIG || {};
  const bell = document.getElementById('supportBell');
  const badge = document.getElementById('supportBellCount');
  const panel = document.getElementById('supportNotifications');
  const entries = document.getElementById('supportNotificationEntries');
  const close = document.getElementById('supportNotificationsClose');
  if (!bell || !panel || !entries || !window.supabase || !cfg.supabaseUrl || !cfg.supabaseAnonKey) return;
  const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  let currentUser = null, latest = [], loading = false;
  let requestVersion = 0;
  function notificationPrefs() {
    try {
      const settings = JSON.parse(localStorage.getItem('meuTutorIA.settings.v1') || '{}');
      return { alerts: settings.supportAlerts !== 'off', badge: settings.unreadBadge !== 'off' };
    } catch (_) { return { alerts: true, badge: true }; }
  }
  let lastUnread = null;
  const storageKey = uid => 'meuTutorIA.supportBell.seen.' + uid;
  const baselineKey = uid => 'meuTutorIA.supportBell.baseline.' + uid;
  const readSeen = uid => { try { return JSON.parse(localStorage.getItem(storageKey(uid)) || '[]'); } catch (_) { return []; } };
  const saveSeen = (uid, ids) => { try { localStorage.setItem(storageKey(uid), JSON.stringify([...new Set(ids)].slice(-300))); } catch (_) {} };
  function openTickets() {
    panel.hidden = true;
    const target = document.querySelector('nav [data-screen="tickets"]');
    if (target) target.click();
  }
  function draw() {
    entries.replaceChildren();
    const seen = new Set(currentUser ? readSeen(currentUser) : []);
    const unread = latest.filter(n => !seen.has(n.id)).length;
    badge.textContent = unread > 99 ? '99+' : String(unread);
    const prefs = notificationPrefs();
    badge.hidden = unread === 0 || !prefs.badge;
    const menuBadge = document.getElementById('accountMenuUnread');
    if (menuBadge) { menuBadge.textContent = prefs.badge && unread ? badge.textContent : ''; menuBadge.hidden = unread === 0 || !prefs.badge; }
    if (prefs.alerts && lastUnread !== null && unread > lastUnread) {
      const notice = document.getElementById('ticketsNotice');
      if (notice) {
        notice.textContent = '🔔 Você recebeu uma nova resposta da equipe de suporte!';
        notice.hidden = false;
      }
    }
    lastUnread = unread;
    bell.setAttribute('aria-label', unread ? 'Notificações: ' + unread + ' não lidas' : 'Notificações, nenhuma nova');
    if (!currentUser) {
      const p = document.createElement('p'); p.className = 'muted'; p.textContent = 'Entre com Google em Meu perfil para ver suas notificações.'; entries.append(p); return;
    }
    if (!latest.length) {
      const p = document.createElement('p'); p.className = 'muted'; p.textContent = 'Nenhuma resposta do suporte por enquanto.'; entries.append(p); return;
    }
    latest.forEach(n => {
      const item = document.createElement('button');
      item.type = 'button'; item.className = 'support-notification-item' + (seen.has(n.id) ? '' : ' unread');
      const title = document.createElement('strong'); title.textContent = '💬 Nova resposta no chamado';
      const detail = document.createElement('span'); detail.textContent = n.subject + ' · ' + n.message.slice(0, 130);
      const date = document.createElement('small'); date.textContent = new Date(n.created_at).toLocaleString('pt-BR');
      item.append(title, detail, date);
      item.addEventListener('click', () => { saveSeen(currentUser, [...readSeen(currentUser), n.id]); draw(); openTickets(); });
      entries.append(item);
    });
  }
  async function load() {
    if (loading || document.visibilityState === 'hidden') return;
    loading = true;
    const version = requestVersion;
    try {
      const { data: auth } = await client.auth.getSession();
      const uid = auth?.session?.user?.id || null;
      if (version !== requestVersion) return;
      if (!uid) { currentUser = null; latest = []; lastUnread = null; draw(); return; }
      if (currentUser !== uid) { currentUser = uid; latest = []; lastUnread = null; }
      const { data, error } = await client.from('tutor_feedback')
        .select('id,subject,tutor_feedback_replies(id,message,created_at)')
        .eq('user_id', uid).order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      if (version !== requestVersion || currentUser !== uid) return;
      latest = (data || []).flatMap(t => (t.tutor_feedback_replies || []).map(r => ({
        id: r.id, subject: t.subject || 'Chamado', message: r.message || '', created_at: r.created_at
      }))).sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 30);
      try {
        if (!localStorage.getItem(baselineKey(uid))) {
          saveSeen(uid, latest.map(n => n.id));
          localStorage.setItem(baselineKey(uid), '1');
        }
      } catch (_) {}
      draw();
    } catch (error) { console.warn('Notificações de suporte indisponíveis:', error); }
    finally { loading = false; }
  }
  bell.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    bell.setAttribute('aria-expanded', String(!panel.hidden));
    if (!panel.hidden) load();
  });
  close.addEventListener('click', () => { panel.hidden = true; bell.setAttribute('aria-expanded','false'); });
  document.addEventListener('click', e => {
    if (!panel.hidden && !e.target.closest('#supportNotifications') && !e.target.closest('#supportBell')) {
      panel.hidden = true; bell.setAttribute('aria-expanded','false');
    }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { panel.hidden = true; bell.setAttribute('aria-expanded','false'); } });
  document.addEventListener('tutor:notification-settings', () => {
    const notice = document.getElementById('ticketsNotice');
    if (!notificationPrefs().alerts && notice) notice.hidden = true;
    draw();
  });
  client.auth.onAuthStateChange(() => {
    requestVersion++;
    currentUser = null; latest = []; lastUnread = null;
    panel.hidden = true;
    bell.setAttribute('aria-expanded', 'false');
    draw();
    setTimeout(load, 0);
  });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') load(); });
  setInterval(load, 15000);
  load();
})();