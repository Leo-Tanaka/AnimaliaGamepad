import { conexaoCarrinho } from "./ble.js";
import { iniciarDpad } from "./dpad.js";
import { iniciarBlocos } from "./blocks.js";

const botaoStatus = document.getElementById("status-bar");
const statusDot = document.getElementById("status-dot");
const statusLabel = document.getElementById("status-label");
const statusDevice = document.getElementById("status-device");

const telaDpad = document.getElementById("tela-dpad");
const telaBlocos = document.getElementById("tela-blocos");
const btnAlternarModo = document.getElementById("btn-alternar-modo");
const btnVoltarDpad = document.getElementById("btn-voltar-dpad");

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

// ---------- Alternância entre modo direcional e modo de blocos ----------
function mostrarTela(tela) {
  [telaDpad, telaBlocos].forEach((el) => el.classList.remove("ativa"));
  tela.classList.add("ativa");
}

btnAlternarModo.addEventListener("click", () => mostrarTela(telaBlocos));
btnVoltarDpad.addEventListener("click", () => mostrarTela(telaDpad));

// ---------- Inicialização dos controles ----------
iniciarDpad(conexaoCarrinho);
iniciarBlocos(conexaoCarrinho);

// ---------- Registro do service worker (PWA instalável) ----------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((erro) => {
      console.warn("Service worker não registrado:", erro);
    });
  });
}
