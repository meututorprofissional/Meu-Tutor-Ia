(() => {
  'use strict';
  const KEY = 'meuTutorIA.settings.v1';
  const defaults = { textSize: 'normal', motion: 'normal', spacing: 'normal', supportAlerts: 'on', unreadBadge: 'on' };
  const allowed = { textSize: ['normal','large'], motion: ['normal','reduced'], spacing: ['normal','compact'], supportAlerts: ['on','off'], unreadBadge: ['on','off'] };
  const read = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
      return Object.fromEntries(Object.keys(defaults).map(k => [k, allowed[k].includes(saved[k]) ? saved[k] : defaults[k]]));
    } catch { return { ...defaults }; }
  };
  const controls = { textSize: document.getElementById('settingTextSize'), motion: document.getElementById('settingMotion'), spacing: document.getElementById('settingSpacing'), supportAlerts: document.getElementById('settingSupportAlerts'), unreadBadge: document.getElementById('settingUnreadBadge') };
  const status = document.getElementById('settingsStatus');
  const apply = prefs => {
    document.documentElement.classList.toggle('tutor-text-large', prefs.textSize === 'large');
    document.documentElement.classList.toggle('tutor-reduced-motion', prefs.motion === 'reduced');
    document.documentElement.classList.toggle('tutor-compact', prefs.spacing === 'compact');
    for (const [key, node] of Object.entries(controls)) if (node) node.value = prefs[key];
    document.dispatchEvent(new CustomEvent('tutor:notification-settings', { detail: { supportAlerts: prefs.supportAlerts, unreadBadge: prefs.unreadBadge } }));
  };
  const style = document.createElement('style');
  style.textContent = `
    html.tutor-text-large body { font-size: 18px; }
    html.tutor-text-large .muted, html.tutor-text-large .action-card span { font-size: 1rem; }
    html.tutor-compact .panel { padding: 13px; margin-bottom: 10px; }
    html.tutor-compact .home-layout, html.tutor-compact .home-actions { gap: 8px; }
    html.tutor-compact .action-card { padding: 11px; }
    html.tutor-reduced-motion *, html.tutor-reduced-motion *::before, html.tutor-reduced-motion *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; scroll-behavior: auto !important; }
  `;
  document.head.appendChild(style);
  apply(read());
  for (const [key, node] of Object.entries(controls)) {
    node?.addEventListener('change', () => {
      const next = read();
      next[key] = allowed[key].includes(node.value) ? node.value : defaults[key];
      try { localStorage.setItem(KEY, JSON.stringify(next)); apply(next); if(status) status.textContent = 'Preferência salva neste dispositivo.'; }
      catch { if(status) status.textContent = 'Não foi possível salvar a preferência neste navegador.'; }
    });
  }
  document.getElementById('resetAppSettings')?.addEventListener('click', () => {
    try { localStorage.removeItem(KEY); apply(defaults); if(status) status.textContent = 'Aparência padrão restaurada.'; }
    catch { if(status) status.textContent = 'Não foi possível restaurar as preferências.'; }
  });
})();