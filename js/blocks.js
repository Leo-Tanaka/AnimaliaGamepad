// ---------- Modo 2: blocos de comando (estilo Scratch) ----------
// A paleta permite clonar blocos para a trilha de sequência, onde podem ser
// reordenados livremente.
//
// A sequência NÃO é enviada de uma vez. A característica UART do micro:bit
// aceita no máximo 20 bytes por escrita, e "SEQ:F,T,E,..." custa 2N+5 bytes
// — ou seja, a partir de ~9 blocos a mensagem era cortada e a sequência
// simplesmente não rodava. Em vez disso, o app envia um comando por vez e
// cronometra os passos aqui: cada escrita tem 2 bytes, o micro:bit não
// precisa guardar lista nenhuma e a sequência pode ter qualquer tamanho.

import { traduzir } from "./mapeamento.js";

const ROTULOS = { F: "frente", T: "trás", E: "esquerda", D: "direita" };
const SETAS = { F: "▲", T: "▼", E: "◀", D: "▶" };

// Quanto cada passo dura antes do próximo. Antes isso vivia no firmware
// (DURACAO_PASSO_MS); com o envio passo a passo, quem marca o tempo é o app.
const DURACAO_PASSO_MS = 700;
// De quanto em quanto tempo a espera verifica se o usuário mandou parar.
const GRANULARIDADE_MS = 50;

const pausa = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Espera `ms`, mas desiste assim que `estado.cancelado` virar true. */
async function esperar(ms, estado) {
  const fim = performance.now() + ms;
  while (!estado.cancelado) {
    const restante = fim - performance.now();
    if (restante <= 0) return;
    await pausa(Math.min(GRANULARIDADE_MS, restante));
  }
}

export function iniciarBlocos(conexaoCarrinho) {
  const paleta = document.getElementById("paleta");
  const sequencia = document.getElementById("sequencia");
  const vazio = sequencia.querySelector(".sequencia-vazia");
  const contagem = document.getElementById("contagem-sequencia");
  const btnApagar = document.getElementById("btn-apagar");
  const btnEnviar = document.getElementById("btn-enviar");

  const textoEnviar = btnEnviar.textContent;
  let execucao = null; // { cancelado: boolean } enquanto a sequência roda

  const atualizarContagem = () => {
    const total = sequencia.querySelectorAll(".bloco").length;
    contagem.textContent = `(${total} passo${total === 1 ? "" : "s"})`;
    if (vazio) vazio.style.display = total === 0 ? "block" : "none";
  };

  // A paleta apenas clona blocos (não perde os originais); a sequência
  // aceita blocos vindos da paleta e permite reordená-los entre si.
  // eslint-disable-next-line no-new
  new Sortable(paleta, {
    group: { name: "blocos", pull: "clone", put: false },
    sort: false,
    animation: 120,
  });

  // eslint-disable-next-line no-new
  new Sortable(sequencia, {
    group: "blocos",
    animation: 120,
    onAdd: atualizarContagem,
    onSort: atualizarContagem,
  });

  btnApagar.addEventListener("click", () => {
    sequencia.querySelectorAll(".bloco").forEach((bloco) => bloco.remove());
    atualizarContagem();
  });

  btnEnviar.addEventListener("click", () => {
    // Durante a execução o mesmo botão vira "parar".
    if (execucao) {
      execucao.cancelado = true;
      return;
    }
    executarSequencia();
  });

  function avisar(texto) {
    btnEnviar.textContent = texto;
    setTimeout(() => {
      if (!execucao) btnEnviar.textContent = textoEnviar;
    }, 1800);
  }

  function destacar(blocoAtual) {
    sequencia.querySelectorAll(".bloco").forEach((bloco) => {
      bloco.classList.toggle("executando", bloco === blocoAtual);
    });
  }

  async function executarSequencia() {
    const blocos = [...sequencia.querySelectorAll(".bloco")];
    if (blocos.length === 0) return;

    if (!conexaoCarrinho.conectado) {
      avisar("conecte o carrinho");
      return;
    }

    const estado = { cancelado: false };
    execucao = estado;
    btnEnviar.textContent = "parar ▪";
    btnEnviar.classList.add("executando");
    btnApagar.disabled = true;

    try {
      for (let i = 0; i < blocos.length; i++) {
        if (estado.cancelado) break;

        destacar(blocos[i]);
        contagem.textContent = `(passo ${i + 1} de ${blocos.length})`;

        const inicio = performance.now();
        await conexaoCarrinho.enviar(traduzir(blocos[i].dataset.comando));
        // Desconta o tempo gasto no envio para todos os passos durarem o
        // mesmo tanto, mesmo com a latência do Bluetooth variando.
        await esperar(DURACAO_PASSO_MS - (performance.now() - inicio), estado);
      }
    } catch (erro) {
      console.error("Falha ao executar a sequência:", erro);
      avisar("falha no envio");
    } finally {
      execucao = null;
      destacar(null);
      btnEnviar.classList.remove("executando");
      btnApagar.disabled = false;
      if (btnEnviar.textContent === "parar ▪") btnEnviar.textContent = textoEnviar;
      atualizarContagem();
      // O "parar" sai sempre — inclusive se um passo falhar no meio — para
      // o carrinho nunca ficar andando por causa de um erro de envio.
      conexaoCarrinho.enviar("P").catch(() => {});
    }
  }

  atualizarContagem();
}

// Exportado para eventuais blocos adicionados dinamicamente no futuro.
export function criarElementoBloco(comando) {
  const el = document.createElement("div");
  el.className = "bloco";
  el.dataset.comando = comando;
  el.innerHTML = `<span class="bloco-seta">${SETAS[comando]}</span>${ROTULOS[comando]}`;
  return el;
}
