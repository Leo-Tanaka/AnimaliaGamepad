// ---------- Modo 2: blocos de comando (estilo Scratch) ----------
// A paleta permite clonar blocos para a trilha de sequência, onde podem ser
// reordenados livremente. "Enviar" empacota a sequência numa única string.

const ROTULOS = { F: "frente", T: "trás", E: "esquerda", D: "direita" };
const SETAS = { F: "▲", T: "▼", E: "◀", D: "▶" };

export function iniciarBlocos(conexaoCarrinho) {
  const paleta = document.getElementById("paleta");
  const sequencia = document.getElementById("sequencia");
  const vazio = sequencia.querySelector(".sequencia-vazia");
  const contagem = document.getElementById("contagem-sequencia");
  const btnApagar = document.getElementById("btn-apagar");
  const btnEnviar = document.getElementById("btn-enviar");

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
    sequencia
      .querySelectorAll(".bloco")
      .forEach((bloco) => bloco.remove());
    atualizarContagem();
  });

  btnEnviar.addEventListener("click", async () => {
    const blocos = [...sequencia.querySelectorAll(".bloco")];
    if (blocos.length === 0) return;

    const comandos = blocos.map((bloco) => bloco.dataset.comando).join(",");

    if (!conexaoCarrinho.conectado) {
      console.warn("Não é possível enviar: carrinho desconectado.");
      return;
    }

    const textoOriginal = btnEnviar.textContent;
    btnEnviar.textContent = "enviando...";
    btnEnviar.disabled = true;
    try {
      await conexaoCarrinho.enviar(`SEQ:${comandos}`);
    } catch (erro) {
      console.error("Falha ao enviar sequência:", erro);
    } finally {
      btnEnviar.textContent = textoOriginal;
      btnEnviar.disabled = false;
    }
  });

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
