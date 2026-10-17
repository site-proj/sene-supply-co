# SENE Supply Co.

Loja editável em Vite, refeita para acompanhar a imagem modelo aprovada e usando as fotos e artes do ZIP do WhatsApp. O arquivo original foi extraído para `public/assets/source/`; as imagens usadas nas páginas também estão em `public/assets/` com nomes amigáveis.

## Incluído

- HOME de referência com navegação, hero fotográfico, Featured Drops, Best Sellers, dois carrosséis, faixa promocional, newsletter e rodapé.
- Catálogo com busca e ordenação; detalhe do produto com tamanhos; sacola persistida, quantidades, subtotal e checkout.
- Conta cliente com autenticação Firebase e histórico de pedidos quando o projeto está configurado.
- Painéis de proprietário e estamparia protegidos por custom claims. Functions validam transições e registram eventos imutáveis para auditoria.
- Firebase Auth, Firestore, Functions, regras e emuladores.
- Checkout Pro e cotação Melhor Envio no backend, limitados à infraestrutura sandbox. A interface permanece desativada sem credenciais e dados de frete.

## Executar localmente

Requer Node.js 22+ e pnpm ou npm.

1. `pnpm install` (ou `npm install`).
2. `pnpm dev` (ou `npm run dev`).
3. `pnpm build` para gerar `dist/`.

Sem Firebase configurado, a loja usa o catálogo de prévia; sacola e páginas funcionam no navegador. Nenhuma cobrança é feita.

## Firebase e catálogo

1. Crie o projeto Firebase. Na pasta do projeto, rode `pnpm firebase:login` e depois `pnpm exec firebase use --add` para vincular o ID do projeto.
2. Copie `.env.example` para `.env.local` e preencha as chaves públicas do app Web Firebase. Registre um provedor reCAPTCHA v3 em App Check, cadastre o domínio do site e informe a chave pública em `VITE_FIREBASE_APPCHECK_SITE_KEY`. As chamadas de Functions exigem esse token; sem ele, autenticação ainda funciona, mas o checkout fica desativado.
3. Instale dependências do backend: `pnpm --dir functions install`.
4. Cadastre `products` no Firestore com `title`, `description`, `priceCents` em centavos de BRL, `imageUrl` (ex.: `/sene-supply-co/assets/destination.jpg`), `active: true`, `tag` e `shippingPackage: { width, height, length, weight }`. Dimensões em centímetros e peso em kg.
5. Publique com `pnpm firebase:deploy`.
6. Cadastre o primeiro papel `owner` por um processo administrativo confiável no Firebase Admin SDK. Depois o callable `assignOrderRole` permite ao proprietário atribuir apenas `owner`, `printer` ou `customer`. Não disponibilize a atribuição de papéis no cliente.

Para emuladores, coloque `VITE_USE_EMULATORS=true` no `.env.local`, rode `pnpm firebase:emulators` em um terminal e `pnpm dev` em outro. Os segredos de serviços externos permanecem ausentes no modo local.

## Mercado Pago Checkout Pro — sandbox

A Function cria uma preferência pela API do Mercado Pago com preços recalculados no servidor, `external_reference` idempotente e URLs de retorno. Só usa o segredo de teste `MERCADO_PAGO_TEST_ACCESS_TOKEN` e só devolve `sandbox_init_point`. O webhook valida `x-signature` por HMAC, consulta o pagamento na API e só aprova pedido quando o provedor confirma pagamento aprovado em BRL e modo de teste. A página de retorno do navegador nunca confirma pagamento. A referência de preferência e verificação de webhook segue a documentação oficial do [Checkout Pro](https://www.mercadopago.com.br/developers/en/docs/checkout-pro-preferences/create-payment-preference) e [notificações assinadas](https://www.mercadopago.com.br/developers/en/docs/checkout-pro-preferences/payment-notifications).

Antes de ligar o sandbox:

- Cadastre o Access Token de teste e a chave separada de assinatura de webhook via `firebase functions:secrets:set MERCADO_PAGO_TEST_ACCESS_TOKEN` e `firebase functions:secrets:set MERCADO_PAGO_WEBHOOK_SECRET`.
- Configure `STORE_PUBLIC_URL=https://...` e `MERCADO_PAGO_WEBHOOK_URL=https://...` no arquivo de ambiente do backend `functions/.env.<projectId>`.
- Configure `MELHOR_ENVIO_FROM_POSTAL_CODE` e `MELHOR_ENVIO_USER_AGENT` em `functions/.env.<projectId>`; crie reCAPTCHA/App Check para o domínio público.
- Preencha Firebase no `.env.local`, escolha `VITE_STORE_CURRENCY=BRL` e só então defina `VITE_CHECKOUT_ENABLED=true`.

Não cadastre token de produção nesse fluxo. Credenciais de teste e produção são distintas; consulte a documentação oficial de [credenciais](https://www.mercadopago.com.br/developers/en/docs/your-integrations/credentials).

## Melhor Envio — sandbox

`quoteShipping` usa o endpoint sandbox de cálculo, lê as dimensões dos produtos no Firestore e não confia em preço recebido do navegador. Para habilitar cotação, configure o segredo `MELHOR_ENVIO_SANDBOX_TOKEN` e os valores não secretos `MELHOR_ENVIO_FROM_POSTAL_CODE` e `MELHOR_ENVIO_USER_AGENT` em `functions/.env.<projectId>`. O User-Agent deve identificar a aplicação e incluir e-mail de contato técnico.

Cada produto precisa de dimensões/peso embalados reais. A origem, destinatário completo, documentos fiscais, contrato, serviços e regras de embalagem precisam ser confirmados pelo proprietário. A tela ainda não compra etiqueta nem debita saldo. O proprietário registra manualmente o rastreio depois de conferir a peça e preparar o envio. Veja a referência oficial do [carrinho de envios](https://docs.melhorenvio.com.br/reference/inserir-fretes-no-carrinho).

## Fluxo de pedido

Pagamento sandbox verificado pelo webhook → pedido `paid` e produção `queued` → estamparia `in_production` → `ready_for_owner` → `delivered_to_owner` → proprietário confere e registra rastreio. A Functions bloqueia transições fora de ordem e a regra do Firestore proíbe alterações diretas no cliente.

## Verificação desta entrega

- `pnpm build` concluiu com sucesso.
- `node --check functions/src/index.cjs` concluiu com sucesso.
- HOME conferida em desktop e mobile; sem overflow horizontal do documento e sem imagens quebradas.
- Carrossel, catálogo, produto, sacola, subtotal, estado de checkout sem cobrança, conta e gate dos painéis verificados no navegador.
- Checkout e cotação não foram chamados com contas externas: credenciais e dados de frete ainda não foram fornecidos.

Os preços $28/$32 da prévia local seguem a imagem modelo. A integração ativa lê preços BRL do Firestore e exige `VITE_STORE_CURRENCY=BRL`. Este projeto permanece em modo de desenvolvimento até o proprietário preencher e validar as contas e os dados operacionais.

## Auditoria de navega��o

A loja permanece em `/sene-supply-co/` e a landing em `/sene-supply-co/contato/`.
Checkout: `/sene-supply-co/?page=checkout`. Busca: `/sene-supply-co/?page=catalog&search=...`.
`store-url.js` resolve redirecionamentos com a base do Vite. Nunca use `/?page=...`.
Configure `STORE_PUBLIC_URL=https://site-proj.github.io/sene-supply-co/` no backend.

Valida��o: `pnpm build` e `node scripts/check-paths.mjs` (tamb�m executado antes do deploy).
Para a auditoria de navegador, disponibilize Playwright e Edge, inicie `pnpm preview --host 127.0.0.1` e execute `node scripts/browser-audit.cjs`.
`PLAYWRIGHT_MODULE` aceita o caminho do m�dulo instalado; `SENE_TEST_URL` seleciona o site publicado.
O teste cobre desktop 1440px e mobile 390px, links, imagens, overflow, busca, cat�logo, produto, sacola, checkout desativado, conta/pain�is sem credenciais, refresh, landing, fotos e destinos WhatsApp.
Autentica��o real, frete e pagamento dependem da configura��o de servi�os e n�o s�o comprovados por este teste.
