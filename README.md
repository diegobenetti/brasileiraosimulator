# Simulador Brasileirão

Simulador de resultados e classificação do Campeonato Brasileiro Série A. Mostra
todos os confrontos das 38 rodadas (turno e returno entre os 20 clubes) e deixa
o usuário digitar o placar que acha que cada jogo vai ter, recalculando a
tabela de classificação em tempo real.

Os jogos já disputados vêm pré-carregados com o resultado real (extraído do
site da CBF); a partir daí é só simular o restante do campeonato.

## Atualizando os dados

Os dados ficam em `data/teams.json`, `data/matches.json` e `data/meta.json`.
Para atualizá-los com os resultados mais recentes da CBF:

```bash
npm run scrape
```

O script busca a página de tabelas do Brasileirão Série A no cbf.com.br para
descobrir o id da competição/rodada atual, e depois consulta a API de jogos da
CBF rodada a rodada (1 a 38).

## Desenvolvimento

```bash
npm install
npm run dev
```

Abra [http://localhost:3002/brasileirao-simulator](http://localhost:3002/brasileirao-simulator).

## Build estático (GitHub Pages)

```bash
npm run build
```

Gera o site estático em `out/`, publicado automaticamente em push para `main`
via `.github/workflows/deploy.yml`.
