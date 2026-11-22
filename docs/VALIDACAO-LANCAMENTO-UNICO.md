# Validação da publicação única

Este ramo é um candidato de lançamento, separado da versão oficial (`main`) e da versão de testes (`desenvolvimento-responsivo`).

- [x] Preservar `main` durante a preparação.
- [x] Incorporar layout da versão de testes.
- [x] Conferir identidade de `profile.js` nas duas versões.
- [x] Manter os arquivos de documentação existentes.
- [x] Validar a prévia isolada em Cloudflare Pages (auditoria sem login, 22/11/2026).
- [ ] Validar perfil autenticado, selos, estudo e progresso sem modificar dados reais (não coberto pela auditoria anônima).
- [ ] Conferir Android normal e modo site para computador.
- [ ] Revisar diferenças finais antes de uma única publicação.

Não publicar automaticamente. A publicação depende da conclusão da validação.

## Auditoria da prévia (22/11/2026)

URL: https://936a7e34.meu-tutor-ia-teste-android.pages.dev

- Home, navegação, perfil local, progresso, ajuda e central de atendimento renderizaram sem falhas visuais aparentes.
- Versão exibida: v75.77.
- Fundador/ADM autenticados, OAuth, sincronização e preservação de dados reais **não foram verificados**.
- Esta auditoria não substitui validação em Android real e modo site para computador.
