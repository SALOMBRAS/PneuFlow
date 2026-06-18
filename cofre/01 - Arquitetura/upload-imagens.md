---
tipo: arquitetura
area: upload-imagens
camada: frontend-media
status: ativo
tokens: baixo
fonte:
  - src/utils/imageOptimizer.js
  - src/services/storage.js
  - src/pages/Dashboard/Catalog.jsx
  - src/pages/Dashboard/StoreSettings.jsx
atualizado: 2026-06-15
tags: []
---

> [!tldr]
> Fotos de pneus aceitam PNG/JPG/JPEG/WEBP/HEIC/HEIF e convertem para WebP no cliente.
> Imagens de loja seguem fluxo separado em configuraÃ§Ãµes.

# Upload e OtimizaÃ§Ã£o de Imagens

## Fotos de pneus

`Catalog.jsx` importa `IMAGE_UPLOAD_ACCEPT` e permite enviar atÃ© 2 imagens por anÃºncio. `storageService.uploadPneuImages` otimiza cada arquivo com `optimizeImageToWebp` e envia para o bucket `pneus-fotos`.

Formatos aceitos nas fotos de pneus:

- PNG.
- JPG/JPEG.
- WEBP.
- HEIC.
- HEIF.

## ConversÃ£o

`optimizeImageToWebp` converte imagem para WebP com:

- largura mÃ¡xima padrÃ£o: 1200
- altura mÃ¡xima padrÃ£o: 1200
- qualidade padrÃ£o: 0.8
- saÃ­da: `image/webp`

## HEIC/HEIF

Arquivos HEIC/HEIF sÃ£o convertidos para JPEG via `heic2any` antes da otimizaÃ§Ã£o final.

## ObservaÃ§Ãµes

- O nome final Ã© normalizado sem acentos e com extensÃ£o `.webp`.
- O import de `heic2any` Ã© dinÃ¢mico, evitando carregamento inicial obrigatÃ³rio.
- A lista de URLs do pneu usa `foto_principal_url` e `fotos`; a principal vira a primeira imagem quando ainda nÃ£o hÃ¡ principal.

## Imagens da loja

`StoreSettings.jsx` usa `storageService.uploadStoreImage` para logo/capa/configuraÃ§Ãµes visuais. Esse fluxo valida imagem e limite de tamanho na tela, mas nÃ£o passa por `optimizeImageToWebp` antes do upload.
