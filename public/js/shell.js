// Front do HelpConcurso — Shell (header + menu sanduíche).
// Módulo gerado a partir do antigo public/app.js (item 10); entrada: public/app.js.
import { S, isAdmin } from './estado.js';
import { ic } from './icones.js';
import { esc, renderAvatar } from './util.js';

// ---------- Shell (header + menu sanduíche) ----------
function viewShell(body) {
  const u = S.user;
  const nav = [
    ['home', 'Início', 'home'],
    ['desempenho', 'Desempenho & Radar', 'chart'],
    ['gerar', 'Gerar questões', 'spark'],
    ['questoes', 'Cadernos de questões', 'book'],
    ['edital', 'Meu edital', 'target'],
    ['contribuir', 'Enviar provas', 'upload'],
    ['estrelas', 'Minhas estrelas', 'star'],
    ['bancas', 'Bancas e estilos', 'layers']
  ];
  const ativo = (v) => S.view === v || (v === 'questoes' && ['simulado', 'caderno'].includes(S.view));
  const item = ([v, l, i]) => `<button class="nav-item ${ativo(v) ? 'on' : ''}" data-go="${v}" ${ativo(v) ? 'aria-current="page"' : ''}>${ic(i)} <span>${l}</span>${v === 'questoes' && (S.cadernos.length || S.sets.length) ? `<span class="badge">${S.cadernos.length || S.sets.length}</span>` : ''}${v === 'edital' && S.activeEdital ? `<span class="badge brand">${S.activeEdital.resumo?.coberturaPct ?? 0}%</span>` : ''}</button>`;
  const navHtml = `${nav.map(item).join('')}
    <div class="nav-sep">Sua conta</div>${item(['conta', 'Minha conta', 'user'])}${item(['planos', 'Planos', 'crown'])}
    ${isAdmin() ? `<div class="nav-sep">Administração</div>${item(['provas', 'Base de provas (Treinar IA)', 'brain'])}` : ''}`;
  const plano = u.plano && !isAdmin() ? `<button class="plan-chip p-${esc(u.plano.id)}" data-go="planos" title="Seu plano: ${esc(u.plano.nome)}">${ic('crown', 'sm')}<span>${esc(u.plano.nome)}</span></button>` : '';
  const tabs = [['home', 'Início', 'home'], ['gerar', 'Gerar', 'spark'], ['questoes', 'Cadernos', 'book'], ['edital', 'Edital', 'target'], ['conta', 'Conta', 'user']];
  return `<header class="header"><div class="header-in">
      <div class="logo" data-go="home"><span class="logo-mark">${ic('logo')}</span><span class="logo-txt">Help<b>Concurso</b></span></div>
      <div class="spacer"></div>
      ${S.stars ? `<button class="star-chip" data-go="estrelas" title="${esc(S.stars.level.nome)} · ${S.stars.total} estrelas no total"><span class="star-ic" id="starIc">★</span><b>${S.stars.balance}</b><span class="lvl">${esc(S.stars.level.nome)}</span></button>` : ''}
      ${plano}
      <button class="user-chip" data-go="conta" title="Minha conta · ${esc(u.email)}">${renderAvatar(u)}<span class="nm">${esc(u.name)}</span></button>
      <button class="icon-btn menu-btn" id="openMenu" aria-label="Abrir menu">${ic('menu')}</button>
    </div></header>
    <div class="layout">
      <aside class="sidebar" aria-label="Navegação principal"><nav>${navHtml}</nav><div class="sidebar-foot"><button class="nav-item" data-open-termos>${ic('shield', 'sm')} <span>Privacidade (LGPD)</span></button><button class="nav-item" data-logout>${ic('logout')} <span>Sair</span></button></div></aside>
      <main class="main" id="conteudo">${body}</main>
    </div>
    <div class="drawer-bg" data-close></div>
    <aside class="drawer" aria-label="Menu">
      <div class="drawer-head">${renderAvatar(u, 'lg')}<div style="min-width:0"><div style="font-weight:800">${esc(u.name)}${isAdmin() ? '<span class="admin-badge">ADMIN</span>' : ''}</div><div class="em">${esc(u.email)}</div></div><button class="icon-btn" style="margin-left:auto;width:36px;height:36px" data-close aria-label="Fechar menu">${ic('x', 'sm')}</button></div>
      <nav>${navHtml}</nav>
      <div class="drawer-foot"><button class="nav-item" data-open-termos>${ic('shield', 'sm')} <span>Privacidade (LGPD)</span></button><button class="nav-item" data-logout>${ic('logout')} <span>Sair</span></button></div>
    </aside>
    <nav class="tabbar" aria-label="Atalhos">${tabs.map(([v, l, i]) => `<button class="${ativo(v) ? 'on' : ''}" data-go="${v}" ${ativo(v) ? 'aria-current="page"' : ''}>${ic(i)}<span>${l}</span></button>`).join('')}</nav>`;
}

export { viewShell };
