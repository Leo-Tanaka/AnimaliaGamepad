# Firmware do carrinho (micro:bit)

Código para o [MakeCode](https://makecode.microbit.org), escrito na visão
JavaScript (TypeScript/PXT). Implementa o outro lado do protocolo usado pelo
PWA em `../js/ble.js` e `../js/blocks.js`.

## Como usar

1. Abra https://makecode.microbit.org e crie um novo projeto.
2. Em **Extensions**, adicione a extensão **Bluetooth**.
3. No ícone de engrenagem → **Project Settings**, ative **"No Pairing
   Required"** — essencial para o Web Bluetooth conseguir conectar sem
   diálogo de pareamento do sistema.
4. Alterne para a visão **JavaScript** (canto superior direito) e cole o
   conteúdo de `main.ts` no lugar do código gerado.
5. Conecte o micro:bit por USB e clique em **Download** para gravar o `.hex`
   (ou arraste o arquivo baixado para o drive `MICROBIT`).

## Ligação da ponte H

| Sinal          | Pino do micro:bit |
|----------------|--------------------|
| Motor esquerdo A | P13 |
| Motor esquerdo B | P1  |
| Motor direito A  | P15 |
| Motor direito B  | P16 |

Se um dos motores girar no sentido contrário ao esperado, inverta o par de
pinos dele (A ↔ B) no início do `main.ts` — não precisa mexer na fiação.

Lembre-se: os motores precisam de alimentação própria (bateria) ligada na
ponte H, com o GND compartilhado entre bateria, ponte H e micro:bit.

## Indicadores no LED

- 👻 (fantasma): ligado, aguardando o app conectar
- ✓: app conectado
- ✗: app desconectado (e motores param automaticamente, por segurança)
