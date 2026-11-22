# dexH!P — Sistema de carregamento versionado (V1)

## Arquitetura
- Postagem Blogger: um unico div `#hp-dex-app[data-pokemon]` e um unico script de bootstrap.
- Carregador estavel: `hp-dex/hp-dex-loader.js` na URL `@main` (unico componente que nao usa commit pinado); as releases de JS/CSS sao imutaveis.
- Manifesto de release: `hp-dex/runtime-manifest.json`, servido por raw.githubusercontent.com com fetch sem cache.
- Arquivos de runtime: `hp-dex.js` e `hp-dex.css`, ambos servidos pelo jsDelivr **no mesmo SHA Git**.
- Pipeline: `.github/workflows/release-dex-runtime.yml`. Valida sintaxe, testes e igualdade de bytes com CDN antes de atualizar o manifesto.

## HTML para novas postagens
```html
<div class="hp-dex-entry" id="hp-dex-app" data-pokemon="charmander" data-number="0004"></div>
<script defer src="https://cdn.jsdelivr.net/gh/heypikachu/data@main/hp-dex/hp-dex-loader.js"></script>
```

Substituir data-pokemon e data-number pelos valores da espécie; o Gerador SEO V5 emite isso automaticamente.

## Migração das três fichas existentes (necessária uma vez)
1. Fazer cópia de segurança do HTML original do Blogger.
2. Preservar toda a capa social e o card SEO.
3. Remover todas as tags `<link ... hp-dex.css ...>` antigas e todas as tags `<script ... hp-dex.js ...></script>` antigas.
4. Garantir **exatamente um** `<div id="hp-dex-app" ...>` por postagem.
5. Inserir **apenas uma** tag de `hp-dex-loader.js` no lugar do script anterior.
6. Testar cada página, EVs de Charmeleon e formas de Charizard.
Se o HTML mantiver os scripts antigos, o loader novo abortará para não renderizar duas instâncias.

## Novas versões e rollback
1. Editar os arquivos originais `hp-dex/hp-dex.js` e/ou `hp-dex/hp-dex.css` no GitHub.
2. A Action **dexH!P - Publicar motor validado** testa e verifica o CDN.
3. Somente depois de tudo aprovado, a Action publica novo `runtime-manifest.json`.
4. Se a release ficar indisponível na rede, o loader tenta `previous`.
5. Para reverter deliberadamente, colocar o SHA da versão anterior em `commit` e o atual em `previous` no manifesto.

## Limites reais
- A URL do loader permanece fixa no HTML (`@main`), permitindo correções do próprio carregador após atualização do cache da CDN. O motor JS/CSS é servido por SHA imutável e não exige editar postagens.
- Os dados JSON de cada Pokémon continuam sendo buscados como antes pelo motor; este projeto versiona **o motor e CSS**, não os JSONs de espécies.
- O fallback garante recuperação de **falhas de download** e **manifesto indisponível**. Não detecta automaticamente qualquer falha lógica que ocorra após a execução do JS.
- Se o Blogger reescrever ou bloquear scripts, testar diretamente a postagem pública.
