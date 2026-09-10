// ---------- Modo 1: controle direcional (d-pad) ----------
// Ao pressionar um botão, envia o comando imediatamente e mantém enviando
// "parar" ao soltar ou ao arrastar o dedo para fora do botão.

export function iniciarDpad(conexaoCarrinho) {
  const botoes = document.querySelectorAll("#tela-dpad .dpad-botao");

  const enviarComSeguranca = async (comando) => {
    if (!conexaoCarrinho.conectado) return;
    try {
      await conexaoCarrinho.enviar(comando);
    } catch (erro) {
      console.error("Falha ao enviar comando do d-pad:", erro);
    }
  };

  botoes.forEach((botao) => {
    const comando = botao.dataset.comando;
    let pressionado = false;

    const pressionar = (evento) => {
      evento.preventDefault();
      if (pressionado) return;
      pressionado = true;
      botao.classList.add("pressionado");
      enviarComSeguranca(comando);
    };

    const soltar = () => {
      if (!pressionado) return;
      pressionado = false;
      botao.classList.remove("pressionado");
      enviarComSeguranca("P");
    };

    botao.addEventListener("pointerdown", pressionar);
    botao.addEventListener("pointerup", soltar);
    botao.addEventListener("pointerleave", soltar);
    botao.addEventListener("pointercancel", soltar);
  });
}
