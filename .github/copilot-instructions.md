# Meu Tutor IA — Instruções para GitHub Copilot

Ao trabalhar neste repositório, consulte os documentos abaixo antes de propor ou alterar código.

## Leitura obrigatória no início de cada tarefa
1. Ler `docs/CENTRAL-TECNICA-MEU-TUTOR-IA.md` para entender arquitetura, serviços, pendências e continuidade.
2. Ler `AGENTS.md` para as regras gerais de segurança e desenvolvimento.
3. Se houver mudanças no perfil, ler `docs/PERFIL-LAYOUT-APROVADO.md`.
4. Se houver colaboração entre IAs, ler `docs/COLABORACAO-IAS.md` e consultar a Issue #1.
5. Conferir o código e o estado real dos serviços antes de agir; a documentação pode estar desatualizada.

## Proteções
- **Não modificar `main`, não fazer merge e não publicar em produção sem aprovação expressa do proprietário.**
- Trabalhar em `desenvolvimento-responsivo` ou outra branch isolada de testes.
- Fazer mudanças pontuais e preservar a interface aprovada nos quatro contextos: Android Chrome normal, Android Chrome em modo desktop, notebook e PC.
- Não expor segredos ou credenciais. Não alterar banco de produção, autenticação, DNS ou deploy oficial sem autorização específica.
- Registrar commits, testes, limitações e pendências. Não assumir que outras IAs estão conectadas ou lendo os mesmos arquivos.

## Observação
Estas instruções são contexto para agentes que carregam este arquivo ao trabalhar no repositório. Não criam integração, permissões, execução contínua ou garantia de leitura por serviços externos.
