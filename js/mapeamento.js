// ---------- Mapeamento dos comandos de movimento ----------
// Cada seta do app tem um comando "lógico" (F/T/E/D). O que sai pelo
// Bluetooth é o comando "físico" escolhido aqui. Assim, se o carrinho
// virar para o lado errado por causa da ligação dos motores na ponte H,
// dá para corrigir pelo app em vez de refazer a fiação.
//
// "P" (parar) nunca é remapeado: parar é parar.

const CHAVE_ARMAZENAMENTO = "carrinho:mapeamento";

export const DIRECOES = ["F", "T", "E", "D"];

export const ROTULOS = {
  F: "frente",
  T: "trás",
  E: "esquerda",
  D: "direita",
};

export const SETAS = { F: "▲", T: "▼", E: "◀", D: "▶" };

const PADRAO = { F: "F", T: "T", E: "E", D: "D" };

const ouvintes = new Set();
let mapa = carregar();

function ehValido(candidato) {
  return (
    candidato &&
    typeof candidato === "object" &&
    DIRECOES.every((d) => DIRECOES.includes(candidato[d]))
  );
}

function carregar() {
  try {
    const bruto = localStorage.getItem(CHAVE_ARMAZENAMENTO);
    if (!bruto) return { ...PADRAO };
    const salvo = JSON.parse(bruto);
    return ehValido(salvo) ? { ...salvo } : { ...PADRAO };
  } catch {
    // localStorage pode estar bloqueado (aba anônima, permissões);
    // nesse caso o app segue funcionando com o padrão.
    return { ...PADRAO };
  }
}

function salvar() {
  try {
    localStorage.setItem(CHAVE_ARMAZENAMENTO, JSON.stringify(mapa));
  } catch {
    /* sem persistência: vale só para esta sessão */
  }
}

function notificar() {
  ouvintes.forEach((cb) => cb(obterMapa()));
}

/** Cópia do mapa atual (lógico -> físico). */
export function obterMapa() {
  return { ...mapa };
}

/** Define qual comando físico uma seta passa a enviar. */
export function definir(logico, fisico) {
  if (!DIRECOES.includes(logico) || !DIRECOES.includes(fisico)) return;
  mapa[logico] = fisico;
  salvar();
  notificar();
}

/** Volta tudo para o padrão de fábrica (F->F, T->T, E->E, D->D). */
export function restaurar() {
  mapa = { ...PADRAO };
  salvar();
  notificar();
}

/** Traduz um comando lógico no que deve ser enviado ao micro:bit. */
export function traduzir(comando) {
  return mapa[comando] ?? comando;
}

/** True quando duas setas apontam para o mesmo comando físico. */
export function temConflito(mapaAlvo = mapa) {
  const usados = DIRECOES.map((d) => mapaAlvo[d]);
  return new Set(usados).size !== usados.length;
}

/** Registra um callback chamado a cada mudança no mapa. */
export function assinar(callback) {
  ouvintes.add(callback);
  callback(obterMapa());
  return () => ouvintes.delete(callback);
}
