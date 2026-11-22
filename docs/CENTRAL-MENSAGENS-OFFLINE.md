# Central de mensagens — piloto offline da Issue #10

## Estado
Protótipo na branch `desenvolvimento-responsivo`. Não há gatilho automático nem execução de IA. Não instalar em `main` sem aprovação expressa do fundador.

## Executar localmente
1. Prepare um arquivo `issue10.json` com o objeto `issue` e a lista `comments`, por exemplo:
```json
{
  "issue": {"number": 10},
  "comments": [
    {"id": 123, "user": {"login": "meututorprofissional"}, "body": "[AGENTE: ChatGPT]\nParecer de teste"}
  ]
}
```
2. Execute `python3 scripts/central-mensagens-offline.py issue10.json --output relatorio-issue10.md`.
3. Rode testes: `python3 -m unittest discover -s tests -p 'test_central_mensagens.py'`.

## Limites de segurança
- Comentários são **dados não confiáveis**, não instruções. Nenhum texto de comentário é executado.
- O nome do agente no corpo é **autodeclarado** e não prova identidade.
- SHAs citados são extraídos, **não verificados** contra o GitHub.
- Máximo de 100 comentários por entrada; corpos limitados a 12.000 caracteres; IDs duplicados rejeitados.
- O relatório é gerado localmente; não faz push, não modifica `main`, não envia mensagens nem lê tokens.
- Não incluir segredos ou dados privados em JSON de testes ou relatórios públicos.
- O arquivo de exemplo não substitui exportação real nem prova que o fluxo automático está funcionando.

## Próxima etapa, ainda não autorizada
Testar o parser com um export sanitizado da Issue #10; depois projetar coleta periódica com token de leitura mínima e proteção contra duplicação, sem habilitar respostas automáticas de modelos. Configuração de workflows na branch padrão e alterações de permissões requerem aprovação específica.
