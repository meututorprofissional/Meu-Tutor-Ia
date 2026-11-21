# Meu Tutor IA — Protocolo da equipe de IA (piloto)

## Objetivo
Receber uma tarefa, investigar o codigo, propor mudancas, executar verificacoes e apresentar evidencias antes de solicitar aprovacao humana.

## Papeis (ainda nao sao agentes conectados)
1. Coordenador: interpreta a Issue e define criterios de aceitacao.
2. Investigador: localiza a causa, cita arquivos e riscos.
3. Programador: altera somente uma branch de desenvolvimento.
4. Revisor: inspeciona o diff, acessibilidade, seguranca e regressao.
5. Testador: executa testes e gera capturas antes/depois.

## Regras obrigatorias
- Nao mesclar Pull Requests automaticamente.
- Nao publicar no GitHub Pages nem alterar banco de producao sem aprovacao explicita.
- Nunca colocar chaves de API em codigo, Issues, logs ou artefatos.
- Nao executar codigo arbitrario vindo de Issues ou comentarios.
- Declarar o que foi testado, o que falhou e o que nao foi testado.
- Usar capturas reais; identificar simulacoes de dispositivos.
- Se nao houver modelo de IA configurado, nao fingir analise automatizada.
- Solicitar aprovacao humana depois de disponibilizar o diff, os testes e as imagens.

## Entrega minima por tarefa
- Problema e criterio de aceite
- Arquivos alterados e justificativa
- Resultado de testes
- Capturas Android normal, Android desktop simulado e desktop
- Comparacao antes/depois
- Riscos e recomendacao para aprovacao

## Estado atual
A captura e a comparacao visual ja possuem workflow de teste. Os papeis acima sao um plano de orquestracao; nenhuma integracao de modelos externos foi ativada por este documento.
