// ---------- Conexão Bluetooth com o micro:bit (Nordic UART Service) ----------
// O micro:bit precisa estar com a extensão Bluetooth habilitada e a opção
// "No Pairing Required" ativa nas configurações do projeto MakeCode.

const UART_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const UART_RX_CHARACTERISTIC_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e"; // app -> micro:bit

// Pausa entre escritas GATT consecutivas. Sem esse respiro o micro:bit
// costuma rejeitar a segunda escrita com "GATT operation failed for
// unknown reason" (ex.: no d-pad, "F" seguido de "P" ao tocar rápido).
const ESPACO_ENTRE_ENVIOS_MS = 40;
// Falhas de GATT no micro:bit são quase sempre transitórias; repetir uma
// vez após um pequeno atraso costuma resolver.
const MAX_TENTATIVAS = 2;
const RETENTAR_APOS_MS = 120;

const pausa = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class ConexaoCarrinho {
  constructor() {
    this.dispositivo = null;
    this.characteristicRx = null;
    this.aoMudarStatus = null; // callback(status: 'conectado' | 'desconectado' | 'conectando', nomeDispositivo?)
    this.aoEnviarComando = null; // callback(texto: string, sucesso: boolean, erro?: Error)
    this._filaEnvio = Promise.resolve();
  }

  /** Registra o callback chamado sempre que o estado da conexão muda. */
  definirCallbackStatus(callback) {
    this.aoMudarStatus = callback;
  }

  /** Registra o callback chamado a cada tentativa de envio de comando (debug). */
  definirCallbackComando(callback) {
    this.aoEnviarComando = callback;
  }

  get conectado() {
    return Boolean(this.dispositivo && this.dispositivo.gatt.connected);
  }

  async conectar() {
    if (!navigator.bluetooth) {
      throw new Error("Bluetooth não disponível neste navegador.");
    }

    this._notificar("conectando");

    const dispositivo = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: "BBC micro:bit" }],
      optionalServices: [UART_SERVICE_UUID],
    });

    dispositivo.addEventListener("gattserverdisconnected", () => {
      // Sem isto, o característico "morto" continua sendo usado e a próxima
      // escrita falha com erro de GATT em vez de "desconectado". Comum
      // quando o micro:bit reinicia por queda de tensão dos motores.
      this.characteristicRx = null;
      this._notificar("desconectado");
    });

    const servidor = await dispositivo.gatt.connect();
    const servico = await servidor.getPrimaryService(UART_SERVICE_UUID);
    const characteristicRx = await servico.getCharacteristic(
      UART_RX_CHARACTERISTIC_UUID
    );

    this.dispositivo = dispositivo;
    this.characteristicRx = characteristicRx;

    this._notificar("conectado", dispositivo.name);
    return dispositivo.name;
  }

  desconectar() {
    if (this.dispositivo && this.dispositivo.gatt.connected) {
      this.dispositivo.gatt.disconnect();
    }
  }

  enviar(texto) {
    const chamadaAtual = this._filaEnvio.then(
      () => this._enviarAgora(texto),
      () => this._enviarAgora(texto) // segue a fila mesmo se o anterior falhou
    );
    this._filaEnvio = chamadaAtual.catch(() => {});
    return chamadaAtual;
  }

  async _enviarAgora(texto, tentativa = 1) {
    try {
      if (!this.characteristicRx) {
        throw new Error("Nenhum micro:bit conectado.");
      }
      const dados = new TextEncoder().encode(`${texto}\n`);
      await this._escrever(dados);
      this._notificarComando(texto, true);
      // Espaça o próximo envio da fila para não sobrecarregar o micro:bit.
      await pausa(ESPACO_ENTRE_ENVIOS_MS);
    } catch (erro) {
      if (tentativa < MAX_TENTATIVAS && this.characteristicRx) {
        await pausa(RETENTAR_APOS_MS);
        return this._enviarAgora(texto, tentativa + 1);
      }
      this._notificarComando(texto, false, erro);
      throw erro;
    }
  }

  /**
   * Escreve no UART RX preferindo "sem resposta" — bem mais estável no
   * micro:bit do que "com resposta" (writeValue), que dispara o
   * "GATT operation failed for unknown reason" sob envios seguidos.
   */
  async _escrever(dados) {
    const rx = this.characteristicRx;
    if (typeof rx.writeValueWithoutResponse === "function") {
      try {
        await rx.writeValueWithoutResponse(dados);
        return;
      } catch (erro) {
        // Alguns aparelhos não suportam sem-resposta neste característico;
        // aí sim cai para a escrita com resposta.
        if (erro && erro.name === "NotSupportedError") {
          await rx.writeValue(dados);
          return;
        }
        throw erro;
      }
    }
    await rx.writeValue(dados);
  }

  _notificar(status, nomeDispositivo) {
    if (this.aoMudarStatus) {
      this.aoMudarStatus(status, nomeDispositivo);
    }
  }

  _notificarComando(texto, sucesso, erro) {
    if (this.aoEnviarComando) {
      this.aoEnviarComando(texto, sucesso, erro);
    }
  }
}

export const conexaoCarrinho = new ConexaoCarrinho();
