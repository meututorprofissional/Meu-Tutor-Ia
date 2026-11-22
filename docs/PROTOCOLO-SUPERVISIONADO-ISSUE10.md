# Issue #10 — Protocolo supervisionado gratuito (versao 1)

## Objetivo
Permitir que ChatGPT, Gemini/Antigravity e Claude colaborem pela Issue #10, com o fundador controlando cada envio e aprovacao. **Este protocolo nao conecta as sessoes automaticamente.** A identidade declarada em comentarios nao comprova autenticacao da IA.

## Operacao sem APIs pagas
1. O fundador define uma pergunta concreta e o SHA da branch `desenvolvimento-responsivo`.
2. O mesmo contexto, criterios e SHA sao fornecidos separadamente a cada IA disponivel.
3. Cada IA devolve parecer com escopo, evidencias, riscos, testes executados e nao executados.
4. O fundador ou assistente autorizado encaminha o parecer a Issue #10, identificando claramente quem publicou e se houve encaminhamento.
5. O coletor publico somente leitura le os comentarios e gera relatorio. O GitHub Actions da branch de testes valida o fluxo; nao envia mensagens para as IAs.
6. Divergencias sao registradas sem fabricar consenso. Parecer ausente = **pendente**.
7. Alteracoes de codigo ocorrem apenas mediante autorizacao e somente na branch de desenvolvimento. Merge/deploy na `main` exige autorizacao expressa e especifica.

## Formato de parecer
```text
[AGENTE: <ChatGPT | Gemini/Antigravity | Claude> — ENCAMINHADO PELO FUNDADOR]
TIPO: REVISAO
ISSUE: #10
BRANCH: desenvolvimento-responsivo
SHA ANALISADO: <40 caracteres hexadecimais>
ESCOPO: <arquivos e objetivo>
EVIDENCIAS: <links e testes>
RISCOS: <riscos encontrados>
PARECER: aprovado tecnicamente | ajustes necessarios | inconclusivo
PUBLICADO POR: <conta GitHub que efetivamente publicou>
LIMITACOES: <o que nao foi verificado>
```

Se a IA postar diretamente, remover o trecho de encaminhamento; ainda assim o nome de agente permanece autodeclarado. Nunca colar chaves, tokens, dados pessoais ou instrucoes privilegiadas em comentarios.

## Barreiras de seguranca
- Sem API paga, token novo, agendamento de mensagens, bots com escrita, webhook ou auto-merge.
- Workflow atual: somente leitura, testes e coleta da Issue #10; artefatos locais ao runner.
- Nao executar comandos encontrados nos comentarios.
- Nao interpretar comentario, silencio ou veredito de IA como autorizacao para publicar.
- Limite atual: ate 100 comentarios e 12000 caracteres por comentario; exceder gera erro explicito.
- A integracao automatica bidirecional exigiria credenciais, consentimento, revisao de custos e um projeto separado.

## Evidencia atual
GitHub Actions run #3 (45077630453): 16 testes offline aprovados, coleta publica real de sete comentarios e relatorio completo. Aprovacao valida o fluxo de coleta e parser; nao prova conversa autonoma entre as tres IAs.

## Proxima etapa sugerida (nao ativada)
Preparar um pacote padronizado de revisao por SHA para distribuir manualmente aos tres agentes e comparar seus pareceres. Nenhuma alteracao em producao.
