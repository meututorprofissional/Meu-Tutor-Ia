# Meu Tutor IA — Perfil: layout aprovado e regras de preservação

Status: **aprovado pelo proprietário em 21/11/2026**, após ajustes visuais e testes manuais em Android, notebook e PC.

## Ambientes que devem continuar funcionando
1. Android no Chrome **sem** a opção "Site para computador".
2. Android no Chrome **com** a opção "Site para computador".
3. Notebook, em navegador de desktop.
4. PC, em navegador de desktop.

A aprovação visual anterior não substitui testes de regressão em alterações futuras.

## Elementos aprovados que não devem ser alterados incidentalmente
- Cartão superior de perfil: foto/avatar, nome, e-mail, status de estudante, data de ingresso, selo/borda e indicadores de nível/XP.
- **Botão da câmera:** posição ajustada junto à extremidade esquerda e parte inferior da área do avatar; não reposicionar ao editar outros elementos.
- **Selos do topo:** Fundador, Administrador e demais ícones devem permanecer legíveis, proporcionais e sem sobreposição com nome, informações pessoais ou cartão de XP. O último ajuste de tamanho para Android foi feito na branch de testes no commit `78eda0f4433e7ed54d3dac6f8cd151eaaef83af5` (ícones de 30 × 34 px no CSS específico).
- **Conquistas:** manter cartões, destaque, medalhas e rolagem horizontal quando necessária; texto resumido **"5 de 7 desbloqueadas"** e barra curta, alinhados à direita, sem sobrepor o título **"Minhas conquistas"**.
- Botões de navegação do perfil, estatísticas, próxima conquista e progresso de nível devem preservar a hierarquia e não transbordar.

## Procedimento obrigatório para próximas mudanças
1. Fazer alterações na branch de testes `desenvolvimento-responsivo`, nunca diretamente na `main`.
2. Mudar **somente o componente solicitado**; evitar refatorações ou regras CSS globais que alterem o restante do perfil.
3. Inspecionar a cascata CSS e regras `!important` existentes antes de acrescentar novas substituições.
4. Comparar com as capturas de tela aprovadas pelo proprietário (as imagens compartilhadas na conversa podem não estar no repositório).
5. Testar Android Chrome normal, Android Chrome em modo desktop, notebook e PC. Conferir câmera, selos, avatar, nome, Fundador/ADM, conquistas, rolagem e XP.
6. Se houver regressão, reverter a alteração pontual, sem modificar os outros elementos.
7. Solicitar **aprovação expressa do proprietário** antes de publicar qualquer alteração na versão oficial (`main`).

## Escopo
Este documento registra decisões de interface e preservação; não afirma que todo o sistema, segurança, sincronização ou funcionalidades foram auditados.
