(() => {
  if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
  const notice = document.getElementById('updateNotice');
  const checkButton = document.getElementById('checkForUpdates');
  const checkStatus = document.getElementById('updateCheckStatus');
  const historyPanel = document.getElementById('updateHistoryPanel');
  const showHistory = document.getElementById('showUpdateHistory');
  const closeHistory = document.getElementById('closeUpdateHistory');
  if (showHistory && historyPanel) showHistory.addEventListener('click', () => {
    historyPanel.hidden = !historyPanel.hidden;
    if (!historyPanel.hidden) historyPanel.scrollIntoView({behavior:'smooth',block:'nearest'});
  });
  if (closeHistory && historyPanel) closeHistory.addEventListener('click', () => {
    historyPanel.hidden = true;
  });
  const CURRENT_APP_VERSION = 'meu-tutor-ia-v74.2-manual-updates';
  let registration = null;
  const setCheckStatus = message => { if (checkStatus) checkStatus.textContent = message; };
  const apply = document.getElementById('applyUpdate');
  const dismiss = document.getElementById('dismissUpdate');
  let waitingWorker = null;
  let reloading = false;

  function showUpdate(worker) {
    waitingWorker = worker;
    if (notice) notice.style.display = 'block';
  }
  navigator.serviceWorker.register('./sw.js', {updateViaCache: 'none'}).then(reg => {
    registration = reg;
    // Se a nova versão já estiver esperando, oferecer atualização.
    if (reg.waiting && navigator.serviceWorker.controller) showUpdate(reg.waiting);

    reg.addEventListener('updatefound', () => {
      const installing = reg.installing;
      if (!installing) return;
      installing.addEventListener('statechange', () => {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdate(installing);
        }
      });
    });

    // Verifica se há atualização ao abrir a página. O navegador também faz verificações periódicas.
    reg.update().catch(() => {});
    // Reconfere ao voltar ao app ou recuperar a conexão, sem interromper formulários.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update().catch(() => {});
    });
    window.addEventListener('online', () => reg.update().catch(() => {}));
    // Verificação periódica de novas versões enquanto o app está aberto.
    window.setInterval(() => reg.update().catch(() => {}), 5 * 60 * 1000);
  }).catch(() => {});

  if (checkButton) checkButton.addEventListener('click', async () => {
    checkButton.disabled = true;
    setCheckStatus('Verificando atualizações…');
    try {
      if (!navigator.onLine) throw new Error('Sem conexão. Conecte-se à internet e tente novamente.');
      const reg = registration || await navigator.serviceWorker.ready;
      await reg.update();
      const response = await fetch('./sw.js?check=' + Date.now(), {cache:'no-store'});
      if (!response.ok) throw new Error('Não foi possível consultar a versão publicada.');
      const script = await response.text();
      const remoteVersion = script.match(/const CACHE_VERSION\\s*=\\s*['"]([^'"]+)['"]/);
      if (!remoteVersion) throw new Error('Não foi possível identificar a versão publicada.');
      if (reg.waiting || remoteVersion[1] !== CURRENT_APP_VERSION) {
        if (reg.waiting) showUpdate(reg.waiting);
        setCheckStatus('Nova versão disponível! Toque em Atualizar agora no aviso acima.');
        if (!reg.waiting && notice) notice.style.display = 'block';
      } else {
        setCheckStatus('Você está na versão mais recente (v74.2).');
      }
    } catch (error) {
      setCheckStatus(error.message || 'Não foi possível verificar agora.');
    } finally {
      checkButton.disabled = false;
    }
  });
  if (apply) apply.addEventListener('click', () => {
    if (waitingWorker) waitingWorker.postMessage({type:'SKIP_WAITING'});
    else location.reload();
  });
  if (dismiss) dismiss.addEventListener('click', () => {
    if (notice) notice.style.display = 'none';
  });
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    // Os registros de estudo usam localStorage e são preservados ao atualizar os arquivos.
    location.reload();
  });
})();
