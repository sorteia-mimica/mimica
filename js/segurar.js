// "Segura pra revelar": só completa se o dedo (ou a tecla) ficar `ms` pressionado.
// Um toque sem querer não revela nada. Lógica pura aqui; o DOM fica em ligarSegurar().
export function criarSegurar({
  ms, aoCompletar, agora = () => performance.now(), agendar = setTimeout, desagendar = clearTimeout,
}) {
  let inicio = null; // instante em que começou a segurar (null = solto)
  let timer = null;
  let completo = false;

  function completar() {
    if (completo) return;
    completo = true;
    inicio = null;
    if (timer !== null) desagendar(timer);
    timer = null;
    aoCompletar();
  }

  return {
    get completo() { return completo; },
    get segurando() { return inicio !== null; },
    // Repetição de tecla chama de novo: quem já está segurando continua contando de onde estava.
    iniciar() {
      if (completo || inicio !== null) return;
      inicio = agora();
      timer = agendar(completar, ms);
    },
    soltar() {
      if (completo || inicio === null) return;
      inicio = null;
      desagendar(timer);
      timer = null;
    },
    // Atalho para leitor de tela (o "toque duplo" não segura): completa na hora.
    completarJa: completar,
    progresso() {
      if (completo) return 1;
      if (inicio === null) return 0;
      return Math.min(1, (agora() - inicio) / ms);
    },
  };
}

const TECLAS = ['Enter', ' '];

// Liga o "segura" num botão: dedo/mouse (pointer), Enter/Espaço segurados e o clique de leitor de tela.
// O progresso vai para a variável CSS --progresso (0 a 1), pintada a cada quadro. Devolve a limpeza.
export function ligarSegurar(botao, { ms, aoCompletar }) {
  let quadro = 0;
  const s = criarSegurar({
    ms,
    aoCompletar: () => {
      pintar();
      aoCompletar();
    },
  });

  function pintar() {
    botao.style.setProperty('--progresso', String(s.progresso()));
    botao.classList.toggle('segurando', s.segurando);
    cancelAnimationFrame(quadro);
    if (s.segurando) quadro = requestAnimationFrame(pintar);
  }
  const iniciar = () => { s.iniciar(); pintar(); };
  const soltar = () => { s.soltar(); pintar(); };

  botao.addEventListener('pointerdown', (ev) => {
    if (ev.button !== 0) return;
    ev.preventDefault(); // sem seleção de texto nem foco "grudado" no toque longo
    botao.setPointerCapture?.(ev.pointerId);
    iniciar();
  });
  for (const tipo of ['pointerup', 'pointercancel', 'lostpointercapture']) botao.addEventListener(tipo, soltar);
  botao.addEventListener('contextmenu', (ev) => ev.preventDefault()); // toque longo não abre menu
  botao.addEventListener('keydown', (ev) => {
    if (!TECLAS.includes(ev.key)) return;
    ev.preventDefault(); // sem o clique automático do Enter/Espaço: precisa segurar
    iniciar();
  });
  botao.addEventListener('keyup', (ev) => {
    if (TECLAS.includes(ev.key)) soltar();
  });
  botao.addEventListener('blur', soltar);
  // Clique sem ponteiro (detail 0) e sem tecla segurada = ativação por leitor de tela: revela direto.
  botao.addEventListener('click', (ev) => {
    if (ev.detail === 0 && !s.segurando) s.completarJa();
  });
  return () => {
    cancelAnimationFrame(quadro);
    s.soltar();
  };
}
