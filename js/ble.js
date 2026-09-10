// ---------- Conexão Bluetooth com o micro:bit (Nordic UART Service) ----------
// O micro:bit precisa estar com a extensão Bluetooth habilitada e a opção
// "No Pairing Required" ativa nas configurações do projeto MakeCode.

const UART_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const UART_RX_CHARACTERISTIC_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e"; // app -> micro:bit

class ConexaoCarrinho {
  constructor() {
    this.dispositivo = null;
    this.characteristicRx = null;
    this.aoMudarStatus = null; // callback(status: 'conectado' | 'desconectado' | 'conectando', nomeDispositivo?)
    this.aoEnviarComando = null; // callback(texto: string, sucesso: boolean, erro?: Error)
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

  /** Envia uma linha de texto para o micro:bit (adiciona \n automaticamente). */
  async enviar(texto) {
    try {
      if (!this.characteristicRx) {
        throw new Error("Nenhum micro:bit conectado.");
      }
      const dados = new TextEncoder().encode(`${texto}\n`);
      await this.characteristicRx.writeValue(dados);
      this._notificarComando(texto, true);
    } catch (erro) {
      this._notificarComando(texto, false, erro);
      throw erro;
    }
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
