# Pacote de revisao para tres IAs — uso manual

O gerador `scripts/preparar-pacote-revisao.py` cria um arquivo JSON local com a **mesma missao, SHA e diff** para ChatGPT, Gemini/Antigravity e Claude. Ele nao chama APIs, nao publica comentarios e nao altera arquivos do repositorio.

## Antes de executar
Use um clone local atualizado, com a branch `desenvolvimento-responsivo` presente. Escolha um commit base ancestral e o SHA completo atual da branch de testes. Execute no terminal local:

```bash
python scripts/preparar-pacote-revisao.py --sha <SHA-HEAD-40-CHARS> --base <SHA-BASE-40-CHARS> --missao "Revisar alteracoes autorizadas" --output pacote-revisao.json
```

O arquivo e criado somente na maquina do operador. **Nao faca commit do JSON nem o publique na Issue #10**: o diff pode conter informacoes internas ou sensiveis nao detectadas automaticamente. Revise manualmente todo o pacote antes de compartilhar; o filtro de nomes de arquivos e apenas uma barreira inicial, nao um scanner de segredos.

## Fluxo supervisionado
1. O fundador inspeciona o pacote e compartilha o mesmo JSON, separadamente, com cada IA.
2. Cada IA devolve parecer com SHA, escopo, evidencias, riscos, testes executados/nao executados e limitacoes.
3. O fundador decide quais pareceres podem ser encaminhados a Issue #10, com rotulo claro de encaminhamento.
4. O coletor publico pode conferir os comentarios depois da publicacao, sem executar suas instrucoes.
5. Nenhum parecer autoriza merge, deploy ou alteracoes de producao.

## Limites
- SHA precisa coincidir com o HEAD local da branch de testes.
- Base precisa ser ancestral do SHA.
- Recusa arquivos com nomes potencialmente sensiveis, diffs binarios e diffs maiores que 60 mil caracteres.
- Nao faz auditoria de segredos no conteudo. Nunca inclua tokens, credenciais ou dados pessoais.
- Este pacote nao autentica a identidade de uma IA nem estabelece comunicacao automatica entre sessoes.
