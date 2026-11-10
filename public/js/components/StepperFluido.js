// Componente UI puro: stepper conectado com linha de progresso fluida.
import { ic } from '../icones.js';

export function StepperFluido({ steps = [], currentStep = 1, progressPct = 0, ariaLabel = 'Etapas' }) {
  return `<div class="wiz-stepper-fluid" role="navigation" aria-label="${ariaLabel}">
    <div class="wiz-track-bg">
      <div class="wiz-track-fill" style="width:${progressPct}%"></div>
    </div>
    <div class="wiz-step-list">
      ${steps.map((s) => {
        const isDone = currentStep > s.n;
        const isActive = currentStep === s.n;
        return `
          <div class="wiz-step-item ${isActive ? 'active' : isDone ? 'done' : ''}" ${isDone ? `data-step="${s.n}" title="Voltar ao passo ${s.n}: ${s.title}"` : ''}>
            <div class="wiz-step-bullet">
              ${isDone ? ic('check', 'sm') : s.n}
            </div>
            <div class="wiz-step-meta">
              <span class="wiz-step-title">${s.n}. ${s.title}</span>
              <span class="wiz-step-sub">${s.sub || ''}</span>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  </div>`;
}
