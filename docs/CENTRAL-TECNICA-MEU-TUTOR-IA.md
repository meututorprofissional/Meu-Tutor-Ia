# Central Técnica — Meu Tutor IA

> **Documento de continuidade do projeto.** Consulte este arquivo primeiro ao iniciar uma nova sessão, revisão ou correção. Atualizado em 21/11/2026.
>
> **IMPORTANTE:** Inventário e instruções não equivalem a conexões permanentes ou credenciais. Verifique acessos e estados atuais antes de agir. Nunca registre tokens, senhas, chaves de API, dados privados ou segredos neste repositório.

## 1. Identidade e fontes principais

- Aplicativo: **Meu Tutor IA — Aprenda de verdade**.
- Repositório: https://github.com/meututorprofissional/Meu-Tutor-Ia
- Site oficial informado: https://meututorprofissional.github.io/Meu-Tutor-Ia/
- Branch oficial: `main`. **Proibido alterar, fazer merge ou publicar sem aprovação expressa do proprietário.**
- Branch de testes: `desenvolvimento-responsivo`.
- Site de testes informado e usado: https://meu-tutor-ia-teste-android.pages.dev
- API Cloudflare Worker informada: https://meu-tutor-ia-api.charlesvictordacosta.workers.dev
- Projeto Supabase informado: `lwsrwiytxxatpmuyaljj` (https://lwsrwiytxxatpmuyaljj.supabase.co).
- Comunicação entre IAs: https://github.com/meututorprofissional/Meu-Tutor-Ia/issues/1

Os endereços acima foram registrados em conversas de desenvolvimento; disponibilidade, configuração, permissões e produção devem ser conferidas antes de operações.

## 2. Mapa das ferramentas

| Ferramenta | Papel conhecido ou pretendido | Situação e próximo passo |
| --- | --- | --- |
| GitHub | Código-fonte, branches, issues, pull requests, histórico e Actions | Repositório e documentos conferidos na branch de testes em 21/11/2026. |
| Cloudflare | Pages (site de testes) e Worker/API | Endereços registrados; conferir projeto, deploy, variáveis e roteamento antes de mudanças. |
| Supabase | Backend, banco de dados e autenticação conforme arquitetura do app | Identificador registrado; **esquema, políticas RLS, ambientes e integrações não auditados neste documento**. |
| Google Apps Script (`script.google.com`) | Ferramenta citada pelo proprietário | **Função exata, projeto e gatilhos ainda não documentados/verificados**. Não presumir que integra a produção. |
| TinyFish | Navegação e testes em sites, quando a ferramenta estiver conectada | Verificar permissões e disponibilidade em cada sessão; não presumir automação contínua. |
| Google Antigravity / Gemini | Desenvolvimento e colaboração de IA | Proprietário relatou leitura e comentários na Issue #1 via GitHub CLI; automação entre agentes ainda não implementada. |
| Claude | Revisão colaborativa pretendida | Integração automática não confirmada. |
| ChatGPT | Análise, código, revisão, documentação e execução com ferramentas autorizadas | Conexões dependem da sessão, do plugin e das permissões disponíveis. |
| PowerShell / GitHub CLI (Windows) | Comandos locais e operações GitHub | Proprietário relatou `gh` autenticado na conta `meututorprofissional`; não há acesso automático ao terminal local. |

**Não usar a tabela como prova de integração ativa.** Serviços devem ser inspecionados por ferramenta apropriada e as informações confirmadas adicionadas aqui com data.

## 3. O que já está documentado no repositório

- [Layout do perfil aprovado](./PERFIL-LAYOUT-APROVADO.md): quatro contextos de tela (Chrome Android normal, Chrome Android em modo computador, notebook, PC), câmera, Fundador/ADM, selos, XP e conquistas. É a referência obrigatória para regressões visuais.
- [Colaboração entre IAs](./COLABORACAO-IAS.md): arquitetura do piloto, limites e fases futuras.
- [Workflow piloto](../.github/workflows/revisao-colaborativa-piloto.yml): execução manual de **leitura** da issue e comentários; gera relatório. **Não chama IAs, não escreve código, não faz deploy.**
- [Issue #1](https://github.com/meututorprofissional/Meu-Tutor-Ia/issues/1): canal de comunicação e registro de propostas, sujeito à verificação dos comentários atuais.

## 4. Estado funcional conhecido (não é auditoria)

Funcionalidades relatadas em testes anteriores: telas Início, Meu estudo, Flashcards, Teste e Progresso; resumo, cartões, avaliação de respostas por IA, revisões sugeridas, exportação JSON e exclusão de dados locais. O usuário aprovou visualmente o perfil responsivo em Android, notebook e PC. **Isso não comprova que segurança, persistência, sincronização, PWA, deploy ou backend estejam integralmente validados.**

## 5. Regras de trabalho e proteção

1. **Nunca publicar em `main` ou ambiente oficial sem aprovação expressa e específica do proprietário.**
2. Trabalhar na branch `desenvolvimento-responsivo` ou em branch isolada para alterações arriscadas.
3. Antes de mudar código, identificar arquivo, serviço, componente e dependências; fazer a menor alteração necessária.
4. Preservar as quatro visualizações de perfil e validar em cada uma após mudanças em CSS, avatar, ícones, selos, conquistas e XP.
5. Não alterar banco de produção, políticas de autenticação, dados reais, DNS, segredos ou configurações de deploy sem aprovação específica.
6. Não armazenar segredos em issues, arquivos, logs ou mensagens de agentes.
7. Registrar alterações com commit, evidências, resultados de testes, problemas conhecidos e instruções de reversão.
8. Não presumir acesso a ferramentas externas, execução local, integração entre IAs ou capacidade de agir em segundo plano.

## 6. Fluxo para a próxima sessão (evita recomeçar do zero)

1. Abrir **este arquivo** e os documentos vinculados; ler o pedido atual.
2. Conferir o estado atual do GitHub (branch, commit, arquivos alterados, Actions e Issue #1).
3. Identificar se a tarefa envolve Cloudflare, Supabase, Apps Script, TinyFish, Antigravity, Claude ou PowerShell; verificar somente as ferramentas pertinentes — **não investigar todas desnecessariamente**.
4. Registrar o que está confirmado, o que falta e qual ambiente será afetado.
5. Implementar e testar em ambiente de desenvolvimento.
6. Informar resultados e aguardar aprovação expressa antes de promover qualquer alteração para a versão oficial.
7. Atualizar este inventário quando uma nova integração, decisão ou configuração for realmente confirmada.

## 7. Pendências do inventário

- Identificar o projeto e a finalidade do Google Apps Script.
- Mapear os endpoints do Worker e seus consumidores, sem expor segredos.
- Conferir o esquema Supabase, RLS, autenticação e separação teste/produção.
- Conferir o fluxo real de deploy do Pages e GitHub Actions.
- Definir, implementar e testar (em ambiente isolado) a colaboração automatizada entre IAs.
- Criar matriz de testes reproduzíveis por navegador/dispositivo, com evidências.

## 8. Como manter atualizado

Ao finalizar uma mudança, acrescentar ao registro pertinente: **data, componente/serviço, branch, commit, motivo, testes feitos, resultado, pendências e aprovação de publicação**. Não substituir estados desconhecidos por suposições.

**Fonte de verdade:** o código e configurações atuais de cada serviço, com este documento como mapa de navegação. A documentação reduz retrabalho, mas não substitui inspeção técnica.
