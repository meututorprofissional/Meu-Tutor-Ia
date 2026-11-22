# Coordenador gratuito — fase 1 (offline)

A fase 1 cria um planejador **local, somente leitura**. Nao chama ChatGPT, Gemini nem Claude; nao envia mensagens, nao usa tokens, nao gera despesas e nao modifica producao.

## Execucao
Criar arquivo local `entrada.json`:
```json
{
  "commit_sha": "7119d305ca2f2c0004ea52fd6ab641cd59acadfe",
  "missao": "Revisar o comparador de pareceres no SHA indicado",
  "pareceres": []
}
```
Executar:
```bash
python scripts/coordenador-tres-ias.py entrada.json --output plano.json
```
O arquivo `plano.json` lista os agentes pendentes e gera mensagens para **encaminhamento manual**. Quando receber pareceres, registrar somente agente, SHA e um dos vereditos: `aprovado tecnicamente`, `ajustes necessarios`, `inconclusivo`. Pareceres completos e evidencias devem ser guardados separadamente e revisados antes de importar.

## Proximas fases, ainda NAO ativadas
1. Investigar Gemini API gratuita, limites e exigencias de faturamento em documentacao oficial. **Nao criar chave, nao habilitar billing, nao chamar API ainda.**
2. Testar integracao em ambiente isolado apenas se houver acesso explicitamente gratuito, chave protegida e autorizacao especifica.
3. Manter ChatGPT e Claude supervisionados ate existir acesso automatizado gratuito e permitido.
4. Nunca interpretar um parecer como permissao para escrever na branch main.

O objetivo de tres IAs online autonomas permanece **pendente**. Nenhuma integracao real foi ativada nesta fase.
