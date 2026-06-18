# Migrations arquivadas antes da baseline

Este diretorio guarda migrations antigas que nao devem ser executadas novamente.

## Contexto

- O historico remoto de migrations do Supabase estava ausente.
- O schema remoto atual foi adotado como fonte da verdade para criar uma baseline limpa.
- O backfill da migration `20260604092000_multi_seller_phase1.sql` foi validado apenas com consultas agregadas e sem dados pessoais.
- Resultado da validacao: `BACKFILL CONFIRMADO`.
- Nenhuma migration antiga deste diretorio deve ser executada novamente sobre o banco remoto atual.
- Nenhuma informacao pessoal deve ser incluida neste relatorio.

O arquivo invalido `20260604_multi_seller_phase2.sql` permanece arquivado separadamente em `docs/legacy-migrations/20260604_multi_seller_phase2.txt`.
