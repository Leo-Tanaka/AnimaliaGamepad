# Controle do Carrinho — PWA

PWA para controlar um carrinho robótico (micro:bit + mini ponte H + 2 motores DC)
via Bluetooth Low Energy, com dois modos de controle.

## Como rodar

Web Bluetooth exige contexto seguro (HTTPS) ou `localhost`. Para testar localmente:

```bash
npx serve .
# ou
python3 -m http.server 8000
```

Abra no Chrome do Android. Em produção, hospede em qualquer serviço com HTTPS
(GitHub Pages, Vercel, Netlify) e aponte o domínio — o app pode então ser
"instalado" na tela inicial pelo menu do Chrome.

## Modos de controle

- **Direcional (d-pad):** botão pressionado envia o comando imediatamente;
  soltar o botão envia `P` (parar).
- **Blocos:** arraste blocos da paleta para a trilha de sequência, na ordem
  desejada. **Enviar** executa a sequência passo a passo (veja abaixo),
  destacando o passo atual; durante a execução o mesmo botão vira **parar**.
  **Apagar** limpa a trilha.
- **Ajustes (⚙ na tela inicial):** define qual movimento cada seta realmente
  faz. Se o carrinho vira para o lado errado por causa da ligação dos motores
  na ponte H, dá para corrigir aqui em vez de refazer a fiação. Cada linha tem
  um botão **testar**, que dá um toque de 600 ms no motor e para sozinho. A
  escolha fica salva no navegador (`localStorage`) e vale para os dois modos.

## Protocolo enviado ao micro:bit (via UART Service)

| Comando enviado         | Significado                                    |
|--------------------------|------------------------------------------------|
| `F\n`                    | Frente (imediato, modo direcional)              |
| `T\n`                    | Trás (imediato, modo direcional)                |
| `E\n`                    | Esquerda (imediato, modo direcional)            |
| `D\n`                    | Direita (imediato, modo direcional)             |
| `P\n`                    | Parar (imediato, modo direcional)               |
| `SEQ:F,D,F,T\n`          | Sequência de passos (modo blocos), executada em ordem |

O comando que sai pelo Bluetooth é o **resultado do mapeamento** da tela de
ajustes: se `frente` estiver mapeada para `direita`, tocar na seta ▲ envia
`D
`. O firmware não sabe nada disso — continua recebendo as mesmas letras.
`P` (parar) nunca é remapeado.

O firmware do micro:bit interpreta essas strings e aciona os motores pela mini
ponte H; o código está em `microbit/main.ts`.

## Estrutura

```
index.html
css/style.css
js/
  app.js      # ponto de entrada, integra os módulos abaixo
  ble.js      # conexão Web Bluetooth (UART Service)
  dpad.js     # modo direcional
  blocks.js   # modo de blocos (drag-and-drop via SortableJS)
  ajustes.js  # tela de ajustes (qual movimento cada seta faz)
  mapeamento.js # mapa comando lógico -> comando enviado (localStorage)
manifest.json
sw.js         # service worker (cache dos arquivos estáticos)
icons/
img/          # logos Animalia e Future Fest
```
