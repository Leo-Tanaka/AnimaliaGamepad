// ===================================================================
// Firmware do carrinho — micro:bit + mini ponte H (estilo L9110, 2 pinos
// por motor) + 2 motores DC.
//
// IMPORTANTE — antes de colar este código no MakeCode:
// 1. Adicione a extensão "Bluetooth" em Extensions.
// 2. Vá em Project Settings (ícone de engrenagem) e ative
//    "No Pairing Required". Sem isso, o navegador vai tentar abrir um
//    diálogo de pareamento do sistema e o app não vai conseguir conectar.
// 3. Adicionar Bluetooth remove a extensão de rádio — normal, não é bug.
//
// Protocolo recebido do PWA (mesmo usado em js/ble.js e js/blocks.js):
//   "F"        -> frente        (modo direcional, imediato)
//   "T"        -> trás          (modo direcional, imediato)
//   "E"        -> esquerda      (modo direcional, imediato)
//   "D"        -> direita       (modo direcional, imediato)
//   "P"        -> parar         (modo direcional, imediato)
//   "SEQ:F,D,T"-> sequência de passos (modo blocos), executada em ordem
// ===================================================================

// ---------- Pinos da ponte H ----------
// Motor esquerdo: P13 (sentido A) e P1 (sentido B)
// Motor direito:  P15 (sentido A) e P16 (sentido B)
// Se algum motor girar ao contrário do esperado, troque o par de pinos dele.
const ESQ_A = DigitalPin.P13
const ESQ_B = DigitalPin.P1
const DIR_A = DigitalPin.P15
const DIR_B = DigitalPin.P16

// Tempo que cada passo da sequência (modo blocos) dura antes do próximo
const DURACAO_PASSO_MS = 700

function motorEsquerdo(sentido: number) {
    // sentido: 1 = frente, -1 = trás, 0 = parado
    if (sentido == 1) {
        pins.digitalWritePin(ESQ_A, 1)
        pins.digitalWritePin(ESQ_B, 0)
    } else if (sentido == -1) {
        pins.digitalWritePin(ESQ_A, 0)
        pins.digitalWritePin(ESQ_B, 1)
    } else {
        pins.digitalWritePin(ESQ_A, 0)
        pins.digitalWritePin(ESQ_B, 0)
    }
}

function motorDireito(sentido: number) {
    if (sentido == 1) {
        pins.digitalWritePin(DIR_A, 1)
        pins.digitalWritePin(DIR_B, 0)
    } else if (sentido == -1) {
        pins.digitalWritePin(DIR_A, 0)
        pins.digitalWritePin(DIR_B, 1)
    } else {
        pins.digitalWritePin(DIR_A, 0)
        pins.digitalWritePin(DIR_B, 0)
    }
}

function pararMotores() {
    motorEsquerdo(0)
    motorDireito(0)
}

function moverCarrinho(comando: string) {
    comando = comando.trim()
    if (comando == "F") {
        motorEsquerdo(1)
        motorDireito(1)
    } else if (comando == "T") {
        motorEsquerdo(-1)
        motorDireito(-1)
    } else if (comando == "E") {
        motorEsquerdo(-1)
        motorDireito(1)
    } else if (comando == "D") {
        motorEsquerdo(1)
        motorDireito(-1)
    } else {
        pararMotores()
    }
}

function executarSequencia(textoComandos: string) {
    let comandos = textoComandos.split(",")
    for (let comando of comandos) {
        moverCarrinho(comando)
        basic.pause(DURACAO_PASSO_MS)
    }
    pararMotores()
}

// ---------- Bluetooth ----------
bluetooth.startUartService()

bluetooth.onUartDataReceived(serial.delimiters(Delimiters.NewLine), function () {
    let linha = bluetooth.uartReadUntil(serial.delimiters(Delimiters.NewLine)).trim()

    if (linha.substr(0, 4) == "SEQ:") {
        executarSequencia(linha.substr(4))
    } else {
        moverCarrinho(linha)
    }
})

bluetooth.onBluetoothConnected(function () {
    basic.showIcon(IconNames.Yes)
    pararMotores()
})

bluetooth.onBluetoothDisconnected(function () {
    // segurança: se a conexão cair, o carrinho para
    basic.showIcon(IconNames.No)
    pararMotores()
})

// ---------- Estado inicial ----------
basic.showIcon(IconNames.Ghost) // aguardando conexão do app
pararMotores()
