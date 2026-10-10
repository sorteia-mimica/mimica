export function formatarTempo(segundos) {
  const s = Math.max(0, Math.ceil(segundos));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// Calcula o restante pelo relógio (não conta ticks): não atrasa em segundo plano.
export function iniciarCronometro(duracaoSeg, { aoTick, aoFim, agora = () => Date.now(), intervalo = 200 }) {
  const fim = agora() + duracaoSeg * 1000;
  let parado = false;
  const id = setInterval(() => tick(), intervalo);
  const parar = () => {
    parado = true;
    clearInterval(id);
  };
  function tick() {
    if (parado) return;
    const restante = Math.max(0, (fim - agora()) / 1000);
    aoTick(restante);
    if (restante <= 0) {
      parar();
      aoFim();
    }
  }
  tick();
  return parar;
}
