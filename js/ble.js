// ---------- Conexão Bluetooth com o micro:bit (Nordic UART Service) ----------
// O micro:bit precisa estar com a extensão Bluetooth habilitada e a opção
// "No Pairing Required" ativa nas configurações do projeto MakeCode.

const UART_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const UART_RX_CHARACTERISTIC_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e"; // app -> micro:bit
const UART_TX_CHARACTERISTIC_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"; // micro:bit -> app

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
      // Sem isto, o característico "morto" continua sendo usado e a próxima
      // escrita falha com erro de GATT em vez de "desconectado". Comum
      // quando o micro:bit reinicia por queda de tensão dos motores.
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

    // Diagnóstico: quais tipos de escrita o micro:bit realmente aceita.
    const p = characteristicRx.properties || {};
    this._log(
      `RX props → write:${!!p.write} semResposta:${!!p.writeWithoutResponse}`
    );

    // Assinar as notificações do TX é o que os exemplos oficiais de Web
    // Bluetooth do micro:bit fazem; em alguns aparelhos a escrita no RX só
    // passa a funcionar depois disso. Não é fatal se falhar.
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
   * Tenta os dois tipos de escrita e reporta qual funcionou. "Sem resposta"
   * costuma ser mais estável no micro:bit; "com resposta" é o plano B.
   */
  async _escrever(dados) {
    const rx = this.characteristicRx;
    const p = rx.properties || {};
    const erros = [];

    if (p.writeWithoutResponse && typeof rx.writeValueWithoutResponse === "function") {
      try {
        await rx.writeValueWithoutResponse(dados);
        return;
      } catch (erro) {
        erros.push(`semResposta:${erro.name || erro}`);
      }
    }

    try {
      await rx.writeValue(dados);
      return;
    } catch (erro) {
      erros.push(`comResposta:${erro.name || erro}`);
    }

    throw new Error(erros.join(" | "));
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
