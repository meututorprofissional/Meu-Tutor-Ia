(() => {
  const CONFIG = window.MEU_TUTOR_AUTH_CONFIG || {};
  const PROFILE_KEY = 'meuTutorIA.profile.v1';
  const DATA_KEY = 'meuTutorIA.v2';
  let client = null;
  let session = null;
  let syncing = false;
  let pendingData = null;
  let authReady = false;

  const el = id => document.getElementById(id);
  const setText = (id, value) => { const node = el(id); if (node) node.textContent = value; };
  const configured = () => Boolean(CONFIG.supabaseUrl && CONFIG.supabaseAnonKey);

  function profile() {
    try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}'); }
    catch { return {}; }
  }
  function saveProfile(value) { localStorage.setItem(PROFILE_KEY, JSON.stringify(value)); }
  function localData() {
    try {
      const data = JSON.parse(localStorage.getItem(DATA_KEY) || '{}');
      return {
        topics: Array.isArray(data.topics) ? data.topics : [],
        cards: Array.isArray(data.cards) ? data.cards : [],
        attempts: Array.isArray(data.attempts) ? data.attempts : []
      };
    } catch { return {topics:[],cards:[],attempts:[]}; }
  }
  function mergeItems(localItems, cloudItems) {
    const map = new Map();
    [...cloudItems, ...localItems].forEach(item => {
      if (item && item.id) map.set(item.id, item);
    });
    return [...map.values()];
  }
  function mergeData(local, cloud) {
    return {
      topics: mergeItems(local.topics || [], cloud.topics || []),
      cards: mergeItems(local.cards || [], cloud.cards || []),
      attempts: mergeItems(local.attempts || [], cloud.attempts || [])
    };
  }
  function showAuthState() {
    const name = profile().name || session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || 'Estudante';
    setText('profileDisplayName', name);
    setText('profileName', '');
    const nameInput = el('profileName');
    if (nameInput) nameInput.value = profile().name || session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || '';
    setText('profileEmail', session?.user?.email || 'Perfil local neste dispositivo');
    const initial = name.trim().charAt(0).toUpperCase() || '👤';
    const avatar = el('profileAvatar');
    if (avatar) avatar.textContent = initial;
    const homeAvatar = el('homeProfileAvatar');
    if (homeAvatar) homeAvatar.textContent = initial;
    const google = el('profileGoogle'), facebook = el('profileFacebook');
    const signOut = el('profileSignOut'), sync = el('profileSyncNow');
    if (google) google.hidden = Boolean(session);
    if (facebook) facebook.hidden = Boolean(session);
    if (signOut) signOut.hidden = !session;
    if (sync) sync.hidden = !session;
    if (!configured()) {
      setText('authStatus', 'A conta ainda precisa ser configurada pelo administrador. Seus estudos atuais continuam salvos neste navegador.');
      if (google) google.disabled = true;
      if (facebook) facebook.disabled = true;
      return;
    }
    if (google) google.disabled = false;
    if (facebook) facebook.disabled = false;
    setText('authStatus', session ? 'Conta conectada. Seus estudos podem ser sincronizados com segurança.' : 'Entre com Google ou Facebook para acessar seus estudos em outros dispositivos.');
  }
  async function saveCloudData(data) {
    if (!client || !session?.user?.id || !data) return;
    if (syncing) { pendingData = data; return; }
    syncing = true;
    let nextData = data;
    try {
      do {
        pendingData = null;
        setText('syncStatus', 'Sincronizando seus estudos…');
        const { error } = await client.from('user_study_data').upsert({
          user_id: session.user.id,
          display_name: profile().name || session.user.user_metadata?.full_name || session.user.user_metadata?.name || null,
          data: nextData,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
        if (error) throw error;
        nextData = pendingData;
      } while (nextData);
      setText('syncStatus', 'Estudos sincronizados com sua conta.');
    } catch (error) {
      console.error('Meu Tutor IA: falha ao sincronizar', error);
      setText('syncStatus', 'Não foi possível sincronizar agora. Seus dados locais continuam salvos; tente novamente mais tarde.');
    } finally { syncing = false; }
  }
  async function initialSync() {
    if (!client || !session?.user?.id || syncing) return;
    syncing = true;
    setText('syncStatus', 'Verificando seus estudos na nuvem…');
    try {
      const { data: row, error } = await client.from('user_study_data').select('data,display_name').eq('user_id', session.user.id).maybeSingle();
      if (error) throw error;
      const local = localData();
      const cloud = row?.data && typeof row.data === 'object' ? row.data : {topics:[],cards:[],attempts:[]};
      const combined = mergeData(local, cloud);
      const localHas = local.topics.length + local.cards.length + local.attempts.length > 0;
      const cloudHas = (cloud.topics||[]).length + (cloud.cards||[]).length + (cloud.attempts||[]).length > 0;
      const oldText = JSON.stringify(local);
      const newText = JSON.stringify(combined);
      if (oldText !== newText) localStorage.setItem(DATA_KEY, newText);
      const displayName = profile().name || row?.display_name || session.user.user_metadata?.full_name || session.user.user_metadata?.name;
      if (displayName && !profile().name) saveProfile({name:displayName});
      if (!cloudHas || oldText !== newText) {
        const { error: upsertError } = await client.from('user_study_data').upsert({
          user_id: session.user.id,
          display_name: profile().name || displayName || null,
          data: combined,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
        if (upsertError) throw upsertError;
      }
      setText('syncStatus', 'Sincronização concluída: ' + combined.topics.length + ' assuntos, ' + combined.cards.length + ' cartões e ' + combined.attempts.length + ' tentativas.');
      showAuthState();
      if (oldText !== newText && (localHas || cloudHas)) location.reload();
    } catch (error) {
      console.error('Meu Tutor IA: falha na sincronização inicial', error);
      setText('syncStatus', 'Não foi possível carregar a cópia na nuvem. Seus dados locais foram preservados.');
    } finally { syncing = false; }
  }

  window.syncTutorData = data => {
    if (!client || !session || !data) return Promise.resolve(false);
    return saveCloudData(data).then(() => true);
  };

  const nameButton = el('saveProfileName');
  if (nameButton) nameButton.onclick = async () => {
    const name = (el('profileName')?.value || '').trim();
    if (!name) { setText('profileLocalStatus', 'Digite um nome antes de salvar.'); return; }
    saveProfile({name});
    if (client && session) {
      const { error } = await client.auth.updateUser({data:{full_name:name,name}});
      if (error) setText('profileLocalStatus', 'Nome salvo neste dispositivo; não foi possível atualizar a conta agora.');
      else setText('profileLocalStatus', 'Nome atualizado no perfil.');
      await saveCloudData(localData());
    } else setText('profileLocalStatus', 'Nome salvo neste dispositivo. Quando a conta for configurada, poderemos associá-lo à nuvem.');
    showAuthState();
  };

  function startOAuth(provider) {
    if (!configured() || !client) {
      setText('authStatus', 'Login ainda não ativado: falta configurar o projeto Supabase e os provedores de autenticação.');
      return;
    }
    client.auth.signInWithOAuth({provider, options:{redirectTo:location.origin + location.pathname}});
  }
  const homeProfileButton = el('homeProfileButton');
  if (homeProfileButton) {
    const openProfile = event => {
      event.preventDefault();
      event.stopPropagation();
      if (typeof go === 'function') go('profile');
      const profileScreen = el('profile');
      if (profileScreen) profileScreen.scrollIntoView({ behavior: 'auto', block: 'start' });
    };
    homeProfileButton.addEventListener('click', openProfile, true);
    homeProfileButton.addEventListener('touchend', event => {
      if (event.cancelable) event.preventDefault();
      openProfile(event);
    }, { passive: false });
  }
  if (el('profileGoogle')) el('profileGoogle').onclick = () => startOAuth('google');
  if (el('profileFacebook')) el('profileFacebook').onclick = () => startOAuth('facebook');
  if (el('profileSignOut')) el('profileSignOut').onclick = async () => {
    if (!client) return;
    const {error} = await client.auth.signOut();
    if (error) setText('authStatus', 'Não foi possível sair da conta agora.');
    else { session = null; setText('syncStatus',''); showAuthState(); }
  };
  if (el('profileSyncNow')) el('profileSyncNow').onclick = () => initialSync();

  if (configured() && window.supabase?.createClient) {
    client = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey);
    client.auth.getSession().then(({data}) => {
      session = data?.session || null;
      authReady = true;
      showAuthState();
      if (session) initialSync();
    });
    client.auth.onAuthStateChange((event, nextSession) => {
      session = nextSession;
      showAuthState();
      if (event === 'SIGNED_IN' && authReady) setTimeout(initialSync, 0);
    });
  } else {
    showAuthState();
  }
})();
