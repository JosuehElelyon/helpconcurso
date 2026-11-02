// Política: transforma os achados em uma decisão.
//   material (só afeta o próprio aluno): crítico/alto → bloqueia; médio → remove os trechos e avisa
//   prova (vai para a base de TODOS):    crítico → bloqueia; alto/médio → revisão humana obrigatória
import { SEV, maxSeverity } from './text-scan.js';

export function decide(kind, findings) {
  const severity = maxSeverity(findings);
  const reasons = findings.filter((f) => SEV[f.severity] >= SEV.medium).map((f) => f.message);
  let verdict;
  if (kind === 'material') verdict = SEV[severity] >= SEV.high ? 'block' : SEV[severity] === SEV.medium ? 'sanitize' : 'ok';
  else verdict = SEV[severity] >= SEV.critical ? 'block' : SEV[severity] >= SEV.medium ? 'review' : 'ok';
  return { verdict, severity, reasons: [...new Set(reasons)].slice(0, 12) };
}

// Mensagem para o usuário (sem detalhes que ensinem a burlar o filtro)
export function publicReason(kind, decision) {
  if (decision.verdict !== 'block') return null;
  return kind === 'material'
    ? 'Não aceitamos este arquivo: ele contém conteúdo que tenta manipular o sistema ou elementos inseguros (scripts, macros, texto escondido com instruções). Gere um PDF/DOCX limpo e envie de novo.'
    : 'Não aceitamos esta prova: ela contém conteúdo que tenta manipular a IA ou elementos inseguros (scripts, macros, anexos, texto escondido com instruções).';
}
