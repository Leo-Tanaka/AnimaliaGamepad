import { conexaoCarrinho } from "./ble.js";
import { iniciarDpad } from "./dpad.js";
import { iniciarBlocos } from "./blocks.js";
import { iniciarAjustes } from "./ajustes.js";

const botaoStatus = document.getElementById("status-bar");
const statusDot = document.getElementById("status-dot");
const statusLabel = document.getElementById("status-label");
const statusDevice = document.getElementById("status-device");
const statusLog = document.getElementById("status-log");

const telaDpad = document.getElementById("tela-dpad");
const telaBlocos = document.getElementById("tela-blocos");
const telaAjustes = document.getElementById("tela-ajustes");
const btnAlternarModo = document.getElementById("btn-alternar-modo");
const btnVoltarDpad = document.getElementById("btn-voltar-dpad");
const btnAjustes = document.getElementById("btn-ajustes");
const btnVoltarAjustes = document.getElementById("btn-voltar-ajustes");

// ---------- Status de conexão ----------
conexaoCarrinho.definirCallbackStatus((status, nomeDispositivo) => {
  statusDot.classList.toggle("conectado", status === "conectado");
  statusDevice.textContent = status === "conectado" ? nomeDispositivo : "";

  const textos = {
    conectando: "conectando...",
    conectado: "conectado",
    desconectado: "toque para conectar",
  };
  statusLabel.textContent = textos[status] ?? textos.desconectado;
});

botaoStatus.addEventListener("click", async () => {
  if (conexaoCarrinho.conectado) return;
  try {
    await conexaoCarrinho.conectar();
  } catch (erro) {
    console.error("Falha ao conectar ao micro:bit:", erro);
    statusLabel.textContent = "falha ao conectar — toque para tentar de novo";
  }
});

// ---------- Debug: mostra na tela os últimos eventos (comandos e diagnóstico) ----------
// O painel vive na tela de ajustes, entao cabe mais historico e cada linha
// guarda o proprio estado (antes a cor do ultimo evento tingia o bloco todo).
const MAX_LINHAS_LOG = 12;
const linhasLog = [];

function anotarLog(texto, classe) {
  const hora = new Date().toLocaleTimeString();
  linhasLog.push({ texto: `[${hora}] ${texto}`, classe });
  while (linhasLog.length > MAX_LINHAS_LOG) linhasLog.shift();

  statusLog.replaceChildren(
    ...linhasLog.map((linha) => {
      const el = document.createElement("div");
      el.className = linha.classe ? `log-linha ${linha.classe}` : "log-linha";
      el.textContent = linha.texto;
      return el;
    })
  );
  statusLog.scrollTop = statusLog.scrollHeight;
}

conexaoCarrinho.definirCallbackComando((texto, sucesso, erro) => {
  if (sucesso) {
    anotarLog(`enviado: ${texto}`, "sucesso");
  } else {
    const detalhe = erro?.name ? `${erro.name}: ${erro.message}` : erro?.message ?? erro;
    anotarLog(`falha ao enviar "${texto}": ${detalhe}`, "falha");
  }
});

conexaoCarrinho.definirCallbackLog((mensagem) => anotarLog(mensagem));

// ---------- Alternância entre modo direcional e modo de blocos ----------
function mostrarTela(tela) {
  [telaDpad, telaBlocos, telaAjustes].forEach((el) =>
    el.classList.remove("ativa")
  );
  tela.classList.add("ativa");
}

btnAlternarModo.addEventListener("click", () => mostrarTela(telaBlocos));
btnVoltarDpad.addEventListener("click", () => mostrarTela(telaDpad));
btnAjustes.addEventListener("click", () => mostrarTela(telaAjustes));
btnVoltarAjustes.addEventListener("click", () => mostrarTela(telaDpad));

// ---------- Inicialização dos controles ----------
iniciarDpad(conexaoCarrinho);
iniciarBlocos(conexaoCarrinho);
iniciarAjustes(conexaoCarrinho);

// ---------- Registro do service worker (PWA instalável) ----------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((erro) => {
      console.warn("Service worker não registrado:", erro);
    });
  });
}
