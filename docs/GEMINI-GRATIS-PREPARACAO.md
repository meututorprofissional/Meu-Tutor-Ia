# Gemini — preparacao sem custo e sem rede

O arquivo `scripts/preparar-gemini-gratis.py` monta localmente um corpo de requisicao Gemini para revisao de codigo. **Nao envia requisicao, nao consulta chave, nao habilita faturamento e nao integra as tres IAs online.**

## Exemplo
Crie `missao.json` local:
```json
{"commit_sha":"7119d305ca2f2c0004ea52fd6ab641cd59acadfe","missao":"Revisar o comparador de pareceres no SHA indicado"}
```
Execute `python scripts/preparar-gemini-gratis.py missao.json --output gemini-simulacao.json`.

## Antes de qualquer chamada real
- Verificar em https://aistudio.google.com/app/apikey se o projeto esta no plano **Free**, sem faturamento ativado; **nao compartilhar a chave no chat nem no GitHub**.
- Verificar em https://ai.google.dev/gemini-api/docs/pricing se o modelo candidato `gemini-2.5-flash-lite` ainda tem cota gratuita na regiao e conta.
- Nao ativar plano pago, nao adicionar cartao e nao usar recursos fora da cota gratuita.
- Se houver acesso, usar chave somente como segredo do GitHub ou do ambiente de execucao, nunca no repositorio nem na interface publica.
- Requer nova autorizacao antes de executar chamadas reais e um controle que interrompa automaticamente ao atingir limites.

A API Gemini gratuita pode usar dados para melhoria dos produtos conforme termos do Google: nao enviar codigo privado, credenciais ou dados pessoais sem revisao.
