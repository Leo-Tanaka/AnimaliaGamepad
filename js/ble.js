// ---------- Conexão Bluetooth com o micro:bit (UART Service) ----------
// O micro:bit precisa estar com a extensão Bluetooth habilitada e a opção
// "No Pairing Required" ativa nas configurações do projeto MakeCode.

const UART_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
// ATENÇÃO: no micro:bit os UUIDs de RX/TX são INVERTIDOS em relação ao
// Nordic UART Service "padrão". Aqui, 0003 recebe escrita do app e 0002 é
// por onde o micro:bit envia (indicate). Escrever no 0002 falha com
// "GATT operation failed for unknown reason" / NotSupportedError.
const UART_RX_CHARACTERISTIC_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"; // app -> micro:bit
const UART_TX_CHARACTERISTIC_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e"; // micro:bit -> app

// Pequeno respiro entre escritas seguidas (ex.: "F" e logo depois "P").
const ESPACO_ENTRE_ENVIOS_MS = 20;

const pausa = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class ConexaoCarrinho {
  constructor() {
    this.dispositivo = null;
    this.characteristicRx = null;
    this.characteristicTx = null;
    this.aoMudarStatus = null; // callback(status: 'conectado' | 'desconectado' | 'conectando', nomeDispositivo?)
    this.aoEnviarComando = null; // callback(texto: string, sucesso: boolean, erro?: Error)
    this.aoLog = null; // callback(mensagem: string) — diagnóstico na tela
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

  /** Registra o callback de mensagens de diagnóstico (aparecem na tela). */
  definirCallbackLog(callback) {
    this.aoLog = callback;
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
      // Sem isto, o característico "morto" continuaria sendo usado e o
      // próximo envio daria erro de GATT em vez de "desconectado".
      this.characteristicRx = null;
      this.characteristicTx = null;
      this._notificar("desconectado");
    });

    const servidor = await dispositivo.gatt.connect();
    const servico = await servidor.getPrimaryService(UART_SERVICE_UUID);
    const characteristicRx = await servico.getCharacteristic(
      UART_RX_CHARACTERISTIC_UUID
    );

    this.dispositivo = dispositivo;
    this.characteristicRx = characteristicRx;

    // Diagnóstico: quais tipos de escrita o micro:bit aceita.
    const p = characteristicRx.properties || {};
    this._log(
      `RX props → write:${!!p.write} semResposta:${!!p.writeWithoutResponse}`
    );

    // Canal de volta (micro:bit -> app). O firmware atual não envia nada,
    // mas deixar assinado ajuda a depurar. Não é fatal se falhar.
    try {
      const characteristicTx = await servico.getCharacteristic(
        UART_TX_CHARACTERISTIC_UUID
      );
      await characteristicTx.startNotifications();
      characteristicTx.addEventListener(
        "characteristicvaluechanged",
        (ev) => this._aoReceberDoMicrobit(ev)
      );
      this.characteristicTx = characteristicTx;
      this._log("TX: notificações ativadas");
    } catch (erro) {
      this._log(`TX: sem notificações (${erro.name || erro})`);
    }

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

  async _enviarAgora(texto) {
    try {
      if (!this.characteristicRx) {
        throw new Error("Nenhum micro:bit conectado.");
      }
      const dados = new TextEncoder().encode(`${texto}\n`);
      await this._escrever(dados);
      this._notificarComando(texto, true);
      await pausa(ESPACO_ENTRE_ENVIOS_MS);
    } catch (erro) {
      this._notificarComando(texto, false, erro);
      throw erro;
    }
  }

  /** Escreve no RX preferindo "sem resposta" (menor latência) quando suportado. */
  async _escrever(dados) {
    const rx = this.characteristicRx;
    const p = rx.properties || {};
    if (p.writeWithoutResponse && typeof rx.writeValueWithoutResponse === "function") {
      await rx.writeValueWithoutResponse(dados);
    } else {
      await rx.writeValue(dados);
    }
  }

  _aoReceberDoMicrobit(evento) {
    const valor = new TextDecoder().decode(evento.target.value).trim();
    if (valor) this._log(`micro:bit disse: ${valor}`);
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

  _log(mensagem) {
    console.log("[BLE]", mensagem);
    if (this.aoLog) this.aoLog(mensagem);
  }
}

export const conexaoCarrinho = new ConexaoCarrinho();
