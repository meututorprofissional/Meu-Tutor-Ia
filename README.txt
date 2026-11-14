MEU TUTOR IA — VISUAL CLARO COM CABEÇALHO ESCURO (V5)

Esta versão mantém as funções de estudo, flashcards, testes, progresso e backup da versão anterior, com fundo claro, cabeçalho roxo-escuro, navegação horizontal, cartões brancos e banner em gradiente roxo-azul. A página inicial usa duas colunas no computador e uma coluna em telas pequenas; os registros de estudo também entram corretamente nas métricas de autoavaliação. Inclui ícones PNG para instalação.

COMO TESTAR
1. Extraia o arquivo ZIP inteiro para uma pasta.
2. Abra index.html no navegador para testar as funções principais.
3. Os dados ficam no armazenamento local do navegador. Use Dados e backup para exportar uma cópia.

ATUALIZAÇÕES ONLINE
O modo instalável e a atualização automática exigem publicar todos os arquivos em uma hospedagem HTTPS. Abrir index.html diretamente não ativa service worker. Ao publicar uma versão nova, atualize a versão do cache em sw.js.

LIMITAÇÕES
A IA ainda não está conectada; não existe sincronização automática entre dispositivos. O progresso reflete os registros e autoavaliações que você fez, não uma avaliação automática de domínio.


ATUALIZAÇÃO DO APLICATIVO
- O sistema de atualização automática funciona quando o app está publicado em um endereço HTTPS fixo (site/PWA).
- Ao publicar uma nova versão nesse mesmo endereço, altere CACHE_VERSION no arquivo sw.js para um nome novo e exclusivo.
- O aplicativo detectará a versão nova e mostrará “Atualização disponível”; ao tocar em “Atualizar agora”, os arquivos serão atualizados.
- Os estudos, cartões e progresso ficam no armazenamento local do navegador (localStorage) e não são apagados pela atualização normal. Não limpe os dados do navegador nem troque de navegador/perfil sem antes exportar um backup.
- Abrir index.html diretamente como arquivo local (file://) não permite atualização automática por service worker.
