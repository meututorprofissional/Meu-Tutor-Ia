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

  function showAuthState() {
    const name = profile().name || session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || 'Estudante';
    setText('profileDisplayName', name);
    setText('profileName', '');
    const nameInput = el('profileName');
    if (nameInput) nameInput.value = profile().name || session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || '';
    setText('profileEmail', session?.user?.email || 'Perfil local neste dispositivo');
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
    if (photoInput) photoInput.disabled = !session;
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
          avatar_path: profile().avatarUserId === session.user.id ? (profile().avatarPath || null) : null,
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
      ? 'Arquivo selecionado. Toque em “Enviar foto/GIF” para salvar no perfil.'
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
      if (photoInput) photoInput.disabled = !session;
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
