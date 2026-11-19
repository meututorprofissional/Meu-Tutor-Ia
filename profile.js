(() => {
  const CONFIG = window.MEU_TUTOR_AUTH_CONFIG || {};
  const PROFILE_KEY = 'meuTutorIA.profile.v1';
  const DATA_KEY = 'meuTutorIA.v2';
  const MEMBER_DATE_KEY = 'meuTutorIA.verifiedMemberSince.v1.';
  const memberDateMemory = new Map();
  const validMemberDate = value => { const d = value ? new Date(value) : null; return d && !Number.isNaN(d.getTime()) ? d : null; };
  function verifiedMemberDate(user) {
    if (!user?.id) return null;
    const fresh = validMemberDate(user.created_at);
    if (fresh) {
      memberDateMemory.set(user.id, fresh.toISOString());
      try { localStorage.setItem(MEMBER_DATE_KEY + user.id, fresh.toISOString()); } catch {}
      try { sessionStorage.setItem(MEMBER_DATE_KEY + user.id, fresh.toISOString()); } catch {}
      return fresh;
    }
    const memoryDate = validMemberDate(memberDateMemory.get(user.id));
    if (memoryDate) return memoryDate;
    try { const saved = validMemberDate(localStorage.getItem(MEMBER_DATE_KEY + user.id)) || validMemberDate(sessionStorage.getItem(MEMBER_DATE_KEY + user.id)); if (saved) memberDateMemory.set(user.id, saved.toISOString()); return saved; } catch { return null; }
  }
  const formatMemberDate = date => new Intl.DateTimeFormat('pt-BR', {day:'numeric',month:'short',year:'numeric',timeZone:'America/Fortaleza'}).format(date);
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
  let avatarRenderId = 0;
  async function renderAvatar(path, initial = '👤') {
    const renderId = ++avatarRenderId;
    let avatarLoadError = null;
    const nodes = [el('profileAvatar'), el('homeProfileAvatar')].filter(Boolean);
    let signedUrl = '';
    if (path && client && session?.user?.id) {
      try {
        const { data, error } = await client.storage.from('profile-avatars').createSignedUrl(path, 3600);
        if (!error) signedUrl = data?.signedUrl || '';
      } catch (error) {
        avatarLoadError = error;
        console.warn('Meu Tutor IA: não foi possível carregar a foto de perfil', error);
      }
    }
    if (path && !signedUrl && !avatarLoadError) avatarLoadError = new Error('O link temporário da imagem não foi gerado.');
    if (renderId !== avatarRenderId) return;
    if (path && !signedUrl) setText('profilePhotoStatus', 'A imagem está registrada, mas não carregou. ' + (avatarLoadError?.message || 'Tente novamente.'));
    nodes.forEach(node => {
      node.replaceChildren();
      if (signedUrl) {
        const img = document.createElement('img');
        img.src = signedUrl;
        img.alt = 'Foto de perfil';
        img.draggable = false;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '50%';
        node.appendChild(img);
        if (node.id === 'homeProfileAvatar') {
          node.style.display = 'grid';
          node.style.width = '100%';
          node.style.height = '100%';
          node.style.placeItems = 'center';
        }
      } else {
        node.textContent = initial || '👤';
        if (node.id === 'homeProfileAvatar') {
          node.style.display = '';
          node.style.width = '';
          node.style.height = '';
          node.style.placeItems = '';
        }
      }
    });
  }

  // Selos somente por metadados administrativos assinados do Supabase Auth.
  // user_metadata e localStorage NÃO concedem selos.
  // Identidades oficiais vêm exclusivamente de app_metadata administrado no servidor.
  function renderOfficialSeals() {
    const badges = session?.user?.app_metadata?.special_badges;
    const granted = Array.isArray(badges) ? badges : [];
    const founder = granted.includes('fundador');
    const admin = session?.user?.app_metadata?.support_admin === true;
    const beta = granted.includes('pioneiro_beta');
    const vip = granted.includes('vip');
    const active = founder ? 'fundador' : beta ? 'beta' : vip ? 'vip' : '';
    const avatarWrap = el('profileAvatar')?.closest('.profile-avatar-wrap');
    const homeButton = el('homeProfileButton');
    for (const node of [avatarWrap, homeButton]) {
      if (!node) continue;
      node.classList.toggle('has-official-founder', active === 'fundador');
      node.classList.toggle('has-official-admin', admin && !founder && !beta && !vip);
      node.classList.toggle('has-official-beta', active === 'beta');
      node.classList.toggle('has-official-vip', active === 'vip');
      let emblem = node.querySelector('.official-seal-crown');
      if (!emblem) {
        emblem = document.createElement('span');
        emblem.className = 'official-seal-crown';
        emblem.setAttribute('aria-hidden', 'true');
        node.appendChild(emblem);
      }
      emblem.textContent = active === 'fundador' ? '✦' : active === 'vip' ? '✦' : active === 'beta' ? '♛' : '⬡';
      emblem.hidden = !(active || admin);
      emblem.title = active === 'fundador' ? 'Fundador do Meu Tutor IA' : active === 'beta' ? 'Pioneiro Beta' : active === 'vip' ? 'VIP' : admin ? 'Administrador' : '';
    }
    for (const [type, enabled] of [['founder',founder],['admin',admin],['beta',beta],['vip',vip]]) {
      const node = el('profileSpecialSeal' + (type === 'founder' ? 'Founder' : type === 'admin' ? 'Admin' : type === 'beta' ? 'Beta' : 'Vip'));
      if (!node) continue;
      node.classList.toggle('is-granted', enabled);
      const status = node.querySelector('small');
      const lock = node.querySelector('.profile-seal-lock');
      if (status) status.textContent = enabled ? 'Selo oficial concedido à sua conta' :
        (type === 'founder' ? 'Exclusivo de quem criou o Meu Tutor IA' : type === 'admin' ? 'Reservado às contas com acesso administrativo' : type === 'beta' ? 'Não concedido · participação elegível a confirmar' : 'Não concedido · critérios ainda não definidos');
      if (lock) { lock.textContent = enabled ? '✓' : '🔒'; lock.setAttribute('aria-label', enabled ? 'Concedido' : 'Bloqueado'); }
    }
  }

  function showAuthState() {
    const name = profile().name || session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || 'Estudante';
    setText('profileDisplayName', name);
    renderOfficialSeals();
    setText('profileName', '');
    const nameInput = el('profileName');
    if (nameInput) nameInput.value = profile().name || session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || '';
    setText('profileEmail', session?.user?.email || 'Perfil local neste dispositivo');
    // A data de criação vem do usuário autenticado no Supabase Auth.
    // Não estimar a data pelo primeiro estudo ou pelo armazenamento local.
    const memberDate = verifiedMemberDate(session?.user);
    // Evitar apagar uma data já confirmada enquanto o Auth renova a sessão.
    if (memberDate) setText('profileMemberSince', formatMemberDate(memberDate));
    else if (!session?.user?.id) setText('profileMemberSince', authReady ? 'sessão desconectada — entre novamente' : 'verificando sessão…');
    else if (!el('profileMemberSince')?.textContent?.match(/\d{4}/)) setText('profileMemberSince', 'verificando cadastro…');
    const initial = name.trim().charAt(0).toUpperCase() || '👤';
    const savedProfile = profile();
    const ownedAvatarPath = session && savedProfile.avatarUserId === session.user.id ? savedProfile.avatarPath : null;
    renderAvatar(ownedAvatarPath || null, initial);
    const google = el('profileGoogle'), facebook = el('profileFacebook');
    const signOut = el('profileSignOut'), sync = el('profileSyncNow');
    if (google) google.hidden = Boolean(session);
    if (facebook) facebook.hidden = Boolean(session);
    if (signOut) signOut.hidden = !session;
    if (sync) sync.hidden = !session;
    setText('securitySessionStatus', session ? 'Conectada' : 'Desconectada');
    setText('securityAccountEmail', session?.user?.email || 'Nenhuma conta conectada');
    const securitySignOut = el('securitySignOut'), securitySync = el('securitySync');
    if (securitySignOut) securitySignOut.hidden = !session;
    if (securitySync) securitySync.hidden = !session;
    if (photoInput) photoInput.disabled = false;
    if (uploadPhotoButton) uploadPhotoButton.disabled = !session || !photoInput?.files?.length;
    if (removePhotoButton) removePhotoButton.hidden = !session || !(profile().avatarUserId === session.user.id && profile().avatarPath);
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
  // Diagnóstico legível no próprio perfil, sem Console ou acesso a dados de estudo.
  const memberDatePending = new Map();
  function memberDateStatus(message) {
    const node = el('profileMemberSince');
    if (node) { node.title = message; node.setAttribute('aria-label', message); }
  }
  async function refreshMemberSince() {
    const userId = session?.user?.id;
    if (!client || !userId) {
      memberDateStatus(!client ? 'Supabase não inicializado' : 'Nenhuma sessão autenticada');
      return;
    }
    const cached = verifiedMemberDate(session.user);
    if (cached) {
      setText('profileMemberSince', formatMemberDate(cached));
      memberDateStatus('Data confirmada pelo Supabase e preservada neste dispositivo');
    } else {
      setText('profileMemberSince', 'consultando cadastro…');
      memberDateStatus('Consultando data de criação da conta no Supabase');
    }
    if (memberDatePending.has(userId)) return memberDatePending.get(userId);
    const task = (async () => {
      let failure = '';
      try {
        const { data, error } = await client.auth.getUser();
        if (session?.user?.id !== userId) return;
        if (!error && data?.user?.id === userId) {
          session.user = { ...session.user, app_metadata: data.user.app_metadata || session.user.app_metadata };
          renderOfficialSeals();
        }
        const authDate = !error && data?.user?.id === userId ? validMemberDate(data.user.created_at) : null;
        if (authDate) {
          const date = verifiedMemberDate({ id:userId, created_at:authDate.toISOString() });
          if (session?.user?.id === userId) {
            setText('profileMemberSince', formatMemberDate(date));
            memberDateStatus('Data oficial confirmada pelo Supabase Auth');
          }
          return;
        }
        failure = error ? 'Auth: ' + (error.message || error.status || 'erro') : 'Auth não retornou created_at';
      } catch (error) { failure = 'Auth: ' + (error?.message || 'falha de rede'); }
      try {
        const { data, error } = await client.rpc('my_registration_date');
        if (session?.user?.id !== userId) return;
        if (error) throw error;
        const official = validMemberDate(data);
        if (!official) throw new Error('RPC retornou data vazia');
        const date = verifiedMemberDate({ id:userId, created_at:official.toISOString() });
        setText('profileMemberSince', formatMemberDate(date));
        memberDateStatus('Data oficial confirmada pela função do Supabase');
      } catch (error) {
        if (session?.user?.id !== userId) return;
        const fallback = verifiedMemberDate(session.user);
        if (fallback) setText('profileMemberSince', formatMemberDate(fallback));
        else setText('profileMemberSince', 'consulta falhou — toque para tentar novamente');
        memberDateStatus(failure + ' | RPC: ' + (error?.message || 'falha desconhecida'));
        console.warn('Meu Tutor IA: falha ao consultar cadastro', { auth:failure, rpc:error });
      }
    })();
    memberDatePending.set(userId, task);
    try { await task; } finally {
      if (memberDatePending.get(userId) === task) memberDatePending.delete(userId);
    }
  }
  if (el('profileMemberSince')) {
    el('profileMemberSince').style.cursor = 'pointer';
    el('profileMemberSince').addEventListener('click', () => refreshMemberSince());
  }
  async function saveCloudData(data) {
    if (!client || !session?.user?.id || !data) return false;
    if (syncing) { pendingData = data; return false; }
    syncing = true;
    let nextData = data;
    try {
      do {
        pendingData = null;
        setText('syncStatus', 'Sincronizando seus estudos…');
        const { error } = await client.from('user_study_data').upsert({
          user_id: session.user.id,
          display_name: profile().name || session.user.user_metadata?.full_name || session.user.user_metadata?.name || null,
          avatar_path: profile().avatarUserId === session.user.id ? (profile().avatarPath || null) : null,
          data: nextData,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
        if (error) throw error;
        nextData = pendingData;
      } while (nextData);
      setText('syncStatus', 'Estudos sincronizados com sua conta.');
      return true;
    } catch (error) {
      console.error('Meu Tutor IA: falha ao sincronizar', error);
      setText('syncStatus', 'Não foi possível sincronizar agora. Seus dados locais continuam salvos; tente novamente mais tarde.');
      return false;
    } finally { syncing = false; }
  }
  async function initialSync() {
    if (!client || !session?.user?.id || syncing) return;
    syncing = true;
    setText('syncStatus', 'Verificando seus estudos na nuvem…');
    try {
      const { data: row, error } = await client.from('user_study_data').select('data,display_name,avatar_path').eq('user_id', session.user.id).maybeSingle();
      if (error) throw error;
      const local = localData();
      const cloud = row?.data && typeof row.data === 'object' ? row.data : {topics:[],cards:[],attempts:[]};
      const combined = mergeData(local, cloud);
      const localHas = local.topics.length + local.cards.length + local.attempts.length > 0;
      const cloudHas = (cloud.topics||[]).length + (cloud.cards||[]).length + (cloud.attempts||[]).length > 0;
      const oldText = JSON.stringify(local);
      const newText = JSON.stringify(combined);
      if (oldText !== newText) localStorage.setItem(DATA_KEY, newText);
      const displayName = row?.display_name || profile().name || session.user.user_metadata?.full_name || session.user.user_metadata?.name;
      const savedProfile = profile();
      const cloudAvatarPath = row?.avatar_path || null;
      if ((displayName && savedProfile.name !== displayName) || savedProfile.avatarUserId !== session.user.id || savedProfile.avatarPath !== cloudAvatarPath) {
        saveProfile({ ...savedProfile, ...(displayName && savedProfile.name !== displayName ? {name:displayName} : {}), avatarPath:cloudAvatarPath, avatarUserId:session.user.id });
      }
      if (!cloudHas || oldText !== newText) {
        const { error: upsertError } = await client.from('user_study_data').upsert({
          user_id: session.user.id,
          display_name: profile().name || displayName || null,
          avatar_path: profile().avatarPath || row?.avatar_path || null,
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
    } finally {
      const queuedData = pendingData;
      pendingData = null;
      syncing = false;
      if (queuedData && session?.user?.id) {
        // Não perder alterações feitas enquanto a sincronização inicial estava em andamento.
        saveCloudData(mergeData(queuedData, localData()));
      }
    }
  }

  window.syncTutorData = data => {
    if (!client || !session || !data) return Promise.resolve(false);
    return saveCloudData(data);
  };

  const nameButton = el('saveProfileName');
  if (nameButton) nameButton.onclick = async () => {
    const name = (el('profileName')?.value || '').trim();
    if (!name) { setText('profileLocalStatus', 'Digite um nome antes de salvar.'); return; }
    saveProfile({ ...profile(), name });
    if (client && session) {
      const { error } = await client.auth.updateUser({data:{full_name:name,name}});
      if (error) setText('profileLocalStatus', 'Nome salvo neste dispositivo; não foi possível atualizar a conta agora.');
      else setText('profileLocalStatus', 'Nome atualizado no perfil.');
      await saveCloudData(localData());
    } else setText('profileLocalStatus', 'Nome salvo neste dispositivo. Quando a conta for configurada, poderemos associá-lo à nuvem.');
    showAuthState();
  };

  const photoInput = el('profilePhotoInput');
  const removePhotoButton = el('removeProfilePhoto');

  async function persistAvatarPath(path) {
    if (!client || !session?.user?.id) throw new Error('Entre na sua conta antes de sincronizar a foto.');
    const userId = session.user.id;
    const { data: existingRow, error: readError } = await client.from('user_study_data')
      .select('data,display_name,avatar_path').eq('user_id', userId).maybeSingle();
    if (readError) throw readError;
    const { error } = await client.from('user_study_data').upsert({
      user_id: userId,
      display_name: profile().name || existingRow?.display_name || session.user.user_metadata?.full_name || session.user.user_metadata?.name || null,
      avatar_path: path,
      data: existingRow?.data || localData(),
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
    if (error) throw error;
    const oldPath = existingRow?.avatar_path;
    saveProfile({ ...profile(), avatarPath: path || null, avatarUserId: userId });
    if (oldPath && oldPath !== path) {
      const { error: removeError } = await client.storage.from('profile-avatars').remove([oldPath]);
      if (removeError) console.warn('Meu Tutor IA: não foi possível remover a foto anterior', removeError);
    }
    await renderAvatar(path, (profile().name || '👤').trim().charAt(0).toUpperCase() || '👤');
    if (removePhotoButton) removePhotoButton.hidden = !path;
  }

  const uploadPhotoButton = el('uploadProfilePhoto');

  if (photoInput) photoInput.addEventListener('change', () => {
    const file = photoInput.files?.[0];
    if (!uploadPhotoButton) return;
    uploadPhotoButton.disabled = !file || !session || !client;
    if (!file) {
      setText('profilePhotoStatus', '');
      return;
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setText('profilePhotoStatus', 'Formato não aceito. Escolha JPG, PNG, WebP ou GIF.');
      uploadPhotoButton.disabled = true;
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setText('profilePhotoStatus', 'A imagem precisa ter no máximo 5 MB.');
      uploadPhotoButton.disabled = true;
      return;
    }
    setText('profilePhotoStatus', session && client
      ? 'Arquivo selecionado. Clique ou toque em “Enviar foto/GIF” para salvar no perfil.'
      : 'Entre com sua conta primeiro para enviar e sincronizar sua foto.');
  });

  if (uploadPhotoButton) uploadPhotoButton.onclick = async () => {
    const file = photoInput?.files?.[0];
    if (!file) {
      setText('profilePhotoStatus', 'Escolha uma foto ou GIF antes de enviar.');
      return;
    }
    if (!session || !client) {
      setText('profilePhotoStatus', 'Entre com sua conta primeiro para salvar e sincronizar sua foto com segurança.');
      return;
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setText('profilePhotoStatus', 'Formato não aceito. Escolha JPG, PNG, WebP ou GIF.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setText('profilePhotoStatus', 'A imagem precisa ter no máximo 5 MB.');
      return;
    }
    const extensions = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'};
    const path = session.user.id + '/avatar.' + extensions[file.type];
    setText('profilePhotoStatus', 'Enviando foto para sua conta…');
    uploadPhotoButton.disabled = true;
    if (photoInput) photoInput.disabled = true;
    try {
      const { error: uploadError } = await client.storage.from('profile-avatars').upload(path, file, {
        cacheControl: '3600', contentType: file.type, upsert: true
      });
      if (uploadError) throw uploadError;
      await persistAvatarPath(path);
      setText('profilePhotoStatus', file.type === 'image/gif' ? 'GIF salvo e sincronizado! A animação será mantida.' : 'Foto salva e sincronizada com sua conta!');
      if (photoInput) photoInput.value = '';
    } catch (error) {
      console.error('Meu Tutor IA: falha ao salvar foto de perfil', error);
      const detail = error?.message ? String(error.message).slice(0, 180) : 'Erro desconhecido';
      setText('profilePhotoStatus', 'Falha ao salvar a imagem: ' + detail);
    } finally {
      if (photoInput) photoInput.disabled = false;
      uploadPhotoButton.disabled = !session || !photoInput?.files?.length;
    }
  };

  if (removePhotoButton) removePhotoButton.onclick = async () => {
    if (!session || !client) return;
    setText('profilePhotoStatus', 'Removendo foto…');
    removePhotoButton.disabled = true;
    try {
      await persistAvatarPath(null);
      setText('profilePhotoStatus', 'Foto removida do perfil.');
    } catch (error) {
      console.error('Meu Tutor IA: falha ao remover foto', error);
      setText('profilePhotoStatus', 'Falha ao remover a foto: ' + (error?.message ? String(error.message).slice(0, 180) : 'erro desconhecido'));
    } finally {
      removePhotoButton.disabled = false;
    }
  };

  function startOAuth(provider) {
    if (!configured() || !client) {
      setText('authStatus', 'Login ainda não ativado: falta configurar o projeto Supabase e os provedores de autenticação.');
      return;
    }
    client.auth.signInWithOAuth({provider, options:{redirectTo:location.origin + location.pathname}});
  }
  if (el('profileGoogle')) el('profileGoogle').onclick = () => startOAuth('google');
  if (el('profileFacebook')) el('profileFacebook').onclick = () => startOAuth('facebook');
  async function signOutSafely() {
    if (!client || !session) {
      setText('securityStatus', 'Nenhuma conta conectada neste dispositivo.');
      return;
    }
    const button = el('securitySignOut');
    if (button) button.disabled = true;
    setText('securityStatus', 'Encerrando a sessão…');
    try {
      const { error } = await client.auth.signOut({ scope: 'local' });
      if (error) throw error;
      session = null;
      setText('syncStatus', '');
      setText('securityStatus', 'Você saiu da conta neste dispositivo. Seus estudos locais foram preservados.');
      showAuthState();
    } catch (error) {
      setText('securityStatus', 'Não foi possível sair agora. Tente novamente.');
      setText('authStatus', 'Não foi possível sair da conta agora.');
    } finally { if (button) button.disabled = false; }
  }
  if (el('profileSignOut')) el('profileSignOut').onclick = signOutSafely;
  if (el('securitySignOut')) el('securitySignOut').onclick = signOutSafely;
  if (el('securitySync')) el('securitySync').onclick = () => initialSync();
  if (el('profileSyncNow')) el('profileSyncNow').onclick = () => initialSync();

  if (configured() && window.supabase?.createClient) {
    client = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey);
    // O perfil deve reagir à abertura da tela, não apenas ao retorno do usuário de outro app.
    async function ensureProfileMemberDate() {
      if (!session?.user?.id) {
        try {
          const { data } = await client.auth.getSession();
          if (!session && data?.session) {
            session = data.session;
            showAuthState();
          }
        } catch (error) { console.warn('Meu Tutor IA: sessão indisponível', error); }
      }
      if (session?.user?.id) {
        const cached = verifiedMemberDate(session.user);
        if (cached) setText('profileMemberSince', formatMemberDate(cached));
        refreshMemberSince();
      }
    }
    const profileScreen = el('profile');
    if (profileScreen && window.MutationObserver) {
      const profileObserver = new MutationObserver(() => {
        if (profileScreen.classList.contains('active')) ensureProfileMemberDate();
      });
      profileObserver.observe(profileScreen, { attributes:true, attributeFilter:['class'] });
    }
    client.auth.getSession().then(({data}) => {
      // Não sobrescrever uma sessão mais recente recebida pelo listener de Auth.
      if (!authReady && !session) session = data?.session || null;
      authReady = true;
      showAuthState();
      if (session) initialSync();
      refreshMemberSince();
    });
    client.auth.onAuthStateChange((event, nextSession) => {
      session = nextSession;
      showAuthState();
      if (nextSession && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')) setTimeout(refreshMemberSince, 0);
      if (event === 'SIGNED_IN' && authReady) setTimeout(initialSync, 0);
    });
    // Reconsultar o Auth ao abrir o perfil, inclusive quando o navegador restaurou uma sessão antiga.
    document.addEventListener('click', event => {
      if (event.target?.closest?.('[data-screen="profile"], #profileMenuButton, #homeProfileAvatar')) setTimeout(ensureProfileMemberDate, 0);
    });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && el('profile')?.classList.contains('active')) ensureProfileMemberDate();
    });
  } else {
    showAuthState();
  }
})();
