// ---------- Tela de ajustes: qual comando cada seta envia ----------
// Monta uma linha por direção com um seletor (para onde essa seta deve
// mandar o carrinho) e um botão de teste que dá um toque no motor.

import {
  DIRECOES,
  ROTULOS,
  SETAS,
  obterMapa,
  definir,
  restaurar,
  temConflito,
  assinar,
  traduzir,
} from "./mapeamento.js";

const DURACAO_TESTE_MS = 600;

export function iniciarAjustes(conexaoCarrinho) {
  const lista = document.getElementById("lista-ajustes");
  const aviso = document.getElementById("aviso-ajustes");
  const btnRestaurar = document.getElementById("btn-restaurar");

  const seletores = new Map();

  DIRECOES.forEach((logico) => {
    const linha = document.createElement("div");
    linha.className = "ajuste-linha";
    linha.dataset.comando = logico;

    const rotulo = document.createElement("span");
    rotulo.className = "ajuste-rotulo";
    rotulo.innerHTML =
      '<span class="bloco-seta" aria-hidden="true">' +
      SETAS[logico] +
      "</span>" +
      ROTULOS[logico];

    const seletor = document.createElement("select");
    seletor.className = "ajuste-select";
    seletor.setAttribute(
      "aria-label",
      "Movimento real da seta " + ROTULOS[logico]
    );
    DIRECOES.forEach((fisico) => {
      const opcao = document.createElement("option");
      opcao.value = fisico;
      opcao.textContent = ROTULOS[fisico];
      seletor.appendChild(opcao);
    });
    seletor.addEventListener("change", () => definir(logico, seletor.value));
    seletores.set(logico, seletor);

    const testar = document.createElement("button");
    testar.className = "ajuste-testar";
    testar.type = "button";
    testar.textContent = "testar";
    testar.addEventListener("click", () => darToque(logico, testar));

    linha.append(rotulo, seletor, testar);
    lista.appendChild(linha);
  });

  async function darToque(logico, botao) {
    if (!conexaoCarrinho.conectado) {
      mostrarAviso("conecte o carrinho para testar");
      return;
    }
    botao.disabled = true;
    try {
      await conexaoCarrinho.enviar(traduzir(logico));
      await new Promise((r) => setTimeout(r, DURACAO_TESTE_MS));
    } catch (erro) {
      console.error("Falha no teste de movimento:", erro);
    } finally {
      // O "parar" sai mesmo se o comando de teste falhar: nunca deixar o
      // carrinho andando por causa de um erro de envio.
      conexaoCarrinho.enviar("P").catch(() => {});
      botao.disabled = false;
    }
  }

  let timerAviso = null;
  function mostrarAviso(texto) {
    aviso.textContent = texto;
    aviso.hidden = false;
    clearTimeout(timerAviso);
    timerAviso = setTimeout(() => atualizarAviso(obterMapa()), 2600);
  }

  function atualizarAviso(mapa) {
    if (temConflito(mapa)) {
      aviso.textContent = "duas setas enviam o mesmo movimento";
      aviso.hidden = false;
    } else {
      aviso.hidden = true;
    }
  }

  btnRestaurar.addEventListener("click", restaurar);

  // Mantém os seletores em sincronia com o mapa (inclusive no "restaurar").
  assinar((mapa) => {
    seletores.forEach((seletor, logico) => {
      seletor.value = mapa[logico];
    });
    atualizarAviso(mapa);
  });
}
