// Front do HelpConcurso — Estado.
// Módulo gerado a partir do antigo public/app.js (item 10); entrada: public/app.js.

// ---------- Estado ----------

// Front do HelpConcurso — Estado.
// Módulo gerado a partir do antigo public/app.js (item 10); entrada: public/app.js.

// ---------- Estado ----------
const S = {
  screen: 'boot', auth: 'entrar', authEmail: '', authCode: '', authErr: '', authOk: '', authBusy: false,
  view: 'home', drawer: false, user: null,
  bancas: [], materias: [], niveis: [], sets: [], loaded: false,
  wiz: null, active: null, filter: { banca: '', materia: '' }, modal: null,
  provaBanca: 'fgv', adminTab: 'revisao', adminProvas: [], adminCounts: {}, monitor: null,
  cform: null, cBusy: false, cResults: [], minhas: [], quota: null,
  stars: null, feedback: {}, reportOpen: null,
  editais: [], activeEdital: null, editalUploading: false, editalErr: '', editalShowForm: false, editalMode: 'file',
  edForm: null, linkProvaId: null, linkBusy: false,
  cadernos: [], activeCaderno: null, cadernoBusy: false, cadernoNewOpen: false, cadForm: null,
  cadernoFeedTab: '', cadFeedBusy: false, cadFilter: { status: 'all', origem: 'all', materia: '', q: '' },
  cadNoteOpen: null, materiaisDisponiveis: [], provasDisponiveis: [], bancoTab: 'cadernos',
  conta: null, contaBusy: false, planosData: null, planoPeriodo: 'mensal',
  desempenho: null, desempBusy: false, desempEditalId: '',
  metas: null, metasBusy: false, metasDraft: null, metasSimulacao: null, metasSimBusy: false,
};
const BANCA = () => Object.fromEntries(S.bancas.map((b) => [b.id, b]));
const isAdmin = () => S.user?.role === 'ADMIN';
const newWiz = () => ({ stage: '', step: 1, mode: 'file', uploading: false, err: '', warnings: [], material: null, materia: '', assunto: '', banca: S.activeEdital?.banca && S.bancas.some((b) => b.id === S.activeEdital.banca) ? S.activeEdital.banca : '', qtd: 10, nivel: 'Médio', generating: false, genCount: 0, genErr: '', editalId: S.activeEdital?.id || '', cadernoId: '', showEditalUpload: false, editalBusy: false });

export { S, BANCA, isAdmin, newWiz };
