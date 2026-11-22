# Gemini local — conexao real opcional (nao ativada)

O script `scripts/conectar-gemini-local.py` esta disponivel na branch de testes. Por padrao, apenas prepara o pedido sem fazer chamada externa. Os testes do GitHub Actions usam transporte simulado, **sem chave real e sem chamadas ao Google**.

## Execucao local sem rede
Crie `missao.json`:
```json
{"commit_sha":"7119d305ca2f2c0004ea52fd6ab641cd59acadfe","missao":"Revisar o comparador no SHA indicado"}
```
Rode `python scripts/conectar-gemini-local.py missao.json --output teste-local.json`.

## Conexao real (somente depois de credencial nova e segura)
- Chave anteriormente mostrada em imagem deve ser tratada como comprometida. **Nao usar essa chave**.
- Confirmar no Google AI Studio que o projeto e o modelo selecionado estao no nivel gratuito, sem billing ativado. A confirmacao manual **nao impede cobranca caso as configuracoes mudem**.
- Definir `GEMINI_API_KEY` apenas no ambiente local seguro, nunca no repositorio, em argumentos de comando, screenshots ou conversas.
- O script exige `--live --confirm-free-tier` para uma unica chamada. Sem essas flags, nenhuma requisicao sai.
- Executar somente em computador confiavel; monitorar cotas e erros no painel do provedor. Nao ativar API no GitHub Actions.
- Nao enviar segredos, dados privados ou codigo proprietario em prompts. Revisoes de IA nao sao autenticadas pelo texto gerado.
- Se a conta exigir faturamento, interromper e manter o fluxo supervisionado gratuito.

O script nao fornece limite financeiro garantido; o bloqueio mais seguro para custos e manter o faturamento desativado no provedor. A primeira chamada real ainda nao foi executada.
