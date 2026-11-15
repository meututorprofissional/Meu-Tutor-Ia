(() => {
  if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
  const notice = document.getElementById('updateNotice');
  const apply = document.getElementById('applyUpdate');
  const dismiss = document.getElementById('dismissUpdate');
  let waitingWorker = null;
  let reloading = false;

  function showUpdate(worker) {
    waitingWorker = worker;
    if (notice) notice.style.display = 'block';
  }
  navigator.serviceWorker.register('./sw.js').then(reg => {
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
