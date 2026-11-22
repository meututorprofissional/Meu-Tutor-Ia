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

## Verificação estática adicional (22/11/2026)

- `index.html` da candidata possui 333 atributos `id`, sem valores duplicados na inspeção estática.
- 17 scripts externos/locais são referenciados; os 15 scripts locais foram encontrados no repositório; execução completa ainda não foi validada.
- `profile.js?v=75.80` está referenciado no HTML da candidata.
- O rótulo visível de versão é `Versão v75.77`; comentários internos de teste permanecem no CSS, sem impacto direto no texto da interface.
- Nenhuma alteração em `main`, Supabase ou dados de usuários foi realizada por esta verificação.

## Integridade de arquivos (22/11/2026)

- Confirmada a existência dos 15 scripts locais referenciados pelo `index.html` (app, guide, quiz-ai, updates, ai-config, ai-client, auth-config, profile, settings, feedback, tickets, support-notifications, support-chat, human-support e admin-support).
- `manifest.json` também está presente.
- Scripts externos (Supabase CDN e Cloudflare Turnstile) não foram validados nesta checagem.
