// Resposta em fluxo NDJSON (uma linha JSON por evento) para operações longas de IA.
// Envia "ping" a cada 15 s (mantém proxies abertos) e cancela o trabalho se o cliente fechar a conexão.
export function abrirFluxo(res) {
  res.status(200).set({ 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no' });
  res.flushHeaders();
  const emitir = (o) => { if (!res.writableEnded) res.write(JSON.stringify(o) + '\n'); };
  const ping = setInterval(() => emitir({ type: 'ping' }), 15000);
  const ctrl = new AbortController();
  res.on('close', () => { if (!res.writableFinished) ctrl.abort(); }); // aluno fechou a página → para de gastar com a IA
  return {
    emitir,
    signal: ctrl.signal,
    fechar() { clearInterval(ping); if (!res.writableEnded) res.end(); },
  };
}
