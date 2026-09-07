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
  desejada. **Enviar** empacota tudo numa string e manda de uma vez;
  **Apagar** limpa a trilha.

## Protocolo enviado ao micro:bit (via UART Service)

| Comando enviado         | Significado                                    |
|--------------------------|------------------------------------------------|
| `F\n`                    | Frente (imediato, modo direcional)              |
| `T\n`                    | Trás (imediato, modo direcional)                |
| `E\n`                    | Esquerda (imediato, modo direcional)            |
| `D\n`                    | Direita (imediato, modo direcional)             |
| `P\n`                    | Parar (imediato, modo direcional)               |
| `SEQ:F,D,F,T\n`          | Sequência de passos (modo blocos), executada em ordem |

O firmware do micro:bit é responsável por interpretar essas strings e acionar
os motores pela mini ponte H — esse código não está incluído neste repositório.

## Estrutura

```
index.html
css/style.css
js/
  app.js      # ponto de entrada, integra os módulos abaixo
  ble.js      # conexão Web Bluetooth (UART Service)
  dpad.js     # modo direcional
  blocks.js   # modo de blocos (drag-and-drop via SortableJS)
manifest.json
sw.js         # service worker (cache dos arquivos estáticos)
icons/
```
