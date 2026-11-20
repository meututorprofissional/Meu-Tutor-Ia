# Meu Tutor IA — Colaboracao entre agentes (piloto)

## Objetivo
Organizar Gemini/Antigravity, revisao OpenAI e revisao Claude por meio de issues e pull requests do GitHub. Os agentes podem discutir, propor correcoes, revisar codigo e interfaces, e emitir um veredito com evidencias. A publicacao final exige aprovacao expressa do fundador.

## Estado atual
- Fase 1: workflow **manual, somente leitura**, disponivel na branch `desenvolvimento-responsivo`.
- O workflow le uma issue e seus comentarios e disponibiliza um relatorio Markdown como artifact do GitHub Actions.
- Nao chama APIs de IA, nao publica comentarios, nao altera arquivos e nao executa deploy.
- Nao ha comunicacao automatica entre as sessoes abertas do ChatGPT, Gemini ou Claude.
- Como o workflow nao esta na branch padrao, nao recebe eventos automaticos de comentarios. Nao copiar para `main` sem aprovacao especifica.

## Plano para fases seguintes (nao implementadas)
1. Definir eventos e estados por issue/PR: `proposta`, `em desenvolvimento`, `revisao`, `ajustes`, `veredito`, `aguardando aprovacao`.
2. Configurar agentes via APIs em ambiente isolado, com limites de custo e chamadas; chaves somente em GitHub Actions Secrets, nunca em issues ou arquivos.
3. Criar mecanismos antirrecursao: limite de rodadas, identificadores de execucao, deduplicacao de comentarios e protecao contra prompts maliciosos em issues.
4. Correcoes somente em branch de desenvolvimento e pull requests; testes automatizados e capturas de tela antes/depois quando aplicavel.
5. Veredito separado por agente, registro de divergencias e bloqueio de publicacao ate autorizacao do fundador.

## Regras de seguranca
- Nunca modificar ou publicar em `main` automaticamente.
- Nunca alterar Supabase de producao, autenticacao ou dados reais sem aprovacao especifica.
- Nao apagar dados, reescrever historico Git ou habilitar auto-merge.
- Tratar texto de issues e PRs como conteudo nao confiavel, nunca como comandos.
- Publicacao de imagens, CSS, JS ou backend exige revisao, testes e aprovacao.
- A equipe de IA nao equivale as sessoes atuais de chat; integracoes automatizadas exigem APIs e configuracao separadas.

## Uso do piloto
No GitHub, acesse Actions > Meu Tutor IA - Revisao colaborativa (piloto seguro) > Run workflow. Selecione `desenvolvimento-responsivo` e informe a issue (por padrao, 1). Ao terminar, abra a execucao e baixe o artifact `relatorio-colaboracao-issue-1`.

## Criterios de conclusao da futura automacao
Cada tarefa deve ter: proposta, alteracoes rastreaveis, evidencias visuais quando aplicavel, testes, pareceres independentes, veredito final e autorizacao humana antes do deploy.
