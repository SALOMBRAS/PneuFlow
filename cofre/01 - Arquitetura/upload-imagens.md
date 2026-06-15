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
> Imagens de loja seguem fluxo separado em configurações.

# Upload e Otimização de Imagens

## Fotos de pneus

`Catalog.jsx` importa `IMAGE_UPLOAD_ACCEPT` e permite enviar até 2 imagens por anúncio. `storageService.uploadPneuImages` otimiza cada arquivo com `optimizeImageToWebp` e envia para o bucket `pneus-fotos`.

Formatos aceitos nas fotos de pneus:

- PNG.
- JPG/JPEG.
- WEBP.
- HEIC.
- HEIF.

## Conversão

`optimizeImageToWebp` converte imagem para WebP com:

- largura máxima padrão: 1200
- altura máxima padrão: 1200
- qualidade padrão: 0.8
- saída: `image/webp`

## HEIC/HEIF

Arquivos HEIC/HEIF são convertidos para JPEG via `heic2any` antes da otimização final.

## Observações

- O nome final é normalizado sem acentos e com extensão `.webp`.
- O import de `heic2any` é dinâmico, evitando carregamento inicial obrigatório.
- A lista de URLs do pneu usa `foto_principal_url` e `fotos`; a principal vira a primeira imagem quando ainda não há principal.

## Imagens da loja

`StoreSettings.jsx` usa `storageService.uploadStoreImage` para logo/capa/configurações visuais. Esse fluxo valida imagem e limite de tamanho na tela, mas não passa por `optimizeImageToWebp` antes do upload.
