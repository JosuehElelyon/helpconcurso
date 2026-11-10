// Dados do próprio usuário: estrelas, perfil ("Minha conta"), senha, plano e pedido de upgrade
import { Router } from 'express';
import { senhaLimit, avatarLimit, exportarLimit } from '../middleware/limites.js';
import { z } from 'zod';
import { ah, parseBody, HttpError } from '../lib/http.js';
import { requireAuth, publicUser, setSession, clearSession } from '../lib/auth.js';
import * as Contas from '../services/contas.js';
import { summary, redeem } from '../services/stars.js';
import { resumoHoje } from '../services/atividade.js';
import { obterDesempenhoCompleto } from '../services/desempenho.js';
import { catalogoPlanos, planoDoUsuario } from '../lib/planos.js';
import { BANCA } from '../lib/bancas.js';
import { scanText, SEV } from '../security/index.js';
import { scanWithClamAV } from '../security/antivirus.js';
import { uploader, fileOf } from '../lib/upload.js';
import { putFile, makeKey } from '../lib/storage.js';
import { PRESET_AVATARS, MAX_AVATAR_BYTES, detectImageType, stripImageMetadata } from '../lib/avatars.js';

const r = Router();
r.use(requireAuth);

r.get('/estrelas', ah(async (req, res) => res.json(await summary(req.user.id))));
r.post('/estrelas/trocar', ah(async (req, res) => {
  const b = parseBody(z.object({ geracoes: z.coerce.number().int().min(1, 'Quantidade inválida.').max(50) }), req.body);
  res.json(await redeem(req.user.id, b.geracoes));
}));

// Tela "Hoje": meta diária, sequência de dias de estudo, últimos 7 dias e contagem até a prova
r.get('/hoje', ah(async (req, res) => res.json(await resumoHoje(req.user))));

// Painel Visual de Desempenho, Produtividade, Horas e Radar da Banca
r.get('/desempenho', ah(async (req, res) => res.json(await obterDesempenhoCompleto(req.user, req.query.editalId))));

// ---------- Minha conta ----------
const contaView = (u) => Contas.visaoConta(u);

r.get('/conta', ah(async (req, res) => res.json(await contaView(req.user))));

// Texto livre do aluno: tamanho limitado e varrido (pode vir a entrar em prompt — ex.: concurso alvo)
const textoLivre = (max) => z.string().trim().max(max).optional().default('')
  .refine((v) => SEV[scanText(v).severity] < SEV.medium, 'Conteúdo não permitido.');

r.patch('/conta', ah(async (req, res) => {
  const b = parseBody(z.object({
    name: z.string().trim().min(2, 'Informe seu nome.').max(80).refine((v) => SEV[scanText(v).severity] < SEV.medium, 'Nome com conteúdo não permitido.'),
    telefone: z.string().trim().max(20).regex(/^[\d\s()+-]*$/, 'Telefone inválido.').optional().default(''),
    concursoAlvo: textoLivre(120),
    bancaPreferida: z.string().trim().optional().default('').refine((v) => !v || BANCA[v], 'Banca inválida.'),
    dataProva: z.string().trim().optional().default('').refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Data inválida.'),
    metaDiaria: z.coerce.number().int().min(0).max(500).optional().nullable(),
  }), req.body);
  res.json(await Contas.atualizarPerfil(req.user, b));
}));

r.post('/conta/senha', senhaLimit, ah(async (req, res) => {
  const b = parseBody(z.object({ senhaAtual: z.string().min(1, 'Informe a senha atual.'), novaSenha: z.string().min(8, 'A nova senha precisa ter ao menos 8 caracteres.').max(200) }), req.body);
  setSession(res, await Contas.trocarSenha(req.user, b.senhaAtual, b.novaSenha));
  res.json({ ok: true });
}));

// ---------- LGPD: aceite dos termos, portabilidade e eliminação ----------
r.post('/termos/aceite', ah(async (req, res) => res.json({ user: publicUser(await Contas.aceitarTermos(req.user)) })));

r.get('/exportar', exportarLimit, ah(async (req, res) => {
  res.set('Content-Disposition', `attachment; filename="helpconcurso-meus-dados-${new Date().toISOString().slice(0, 10)}.json"`);
  res.json(await Contas.exportarDados(req.user));
}));

r.delete('/conta', senhaLimit, ah(async (req, res) => {
  const b = parseBody(z.object({
    senha: z.string().min(1, 'Informe sua senha.'),
    confirmacao: z.literal('EXCLUIR', { errorMap: () => ({ message: 'Digite EXCLUIR para confirmar.' }) }),
  }), req.body);
  const out = await Contas.excluirConta(req.user, b.senha);
  clearSession(res);
  res.json(out);
}));

// ---------- Avatar ----------

r.get('/avatar/presets', ah(async (_req, res) => res.json({ presets: PRESET_AVATARS })));


const presetIds = PRESET_AVATARS.map((p) => p.id);
r.patch('/avatar/preset', ah(async (req, res) => {
  const b = parseBody(z.object({ preset: z.string().refine((p) => presetIds.includes(p), 'Avatar pré-definido inválido.') }), req.body);
  res.json(await Contas.trocarAvatar(req.user.id, `/avatars/${b.preset}`, null));
}));

r.post('/avatar', avatarLimit, uploader([{ name: 'avatar', maxCount: 1 }], { maxMb: MAX_AVATAR_BYTES / (1024 * 1024) }), ah(async (req, res) => {
  const f = fileOf(req, 'avatar');
  if (!f) throw new HttpError(400, 'Selecione uma imagem para o avatar.');
  const detected = detectImageType(f.buffer);
  if (!detected) throw new HttpError(400, 'Formato inválido. Envie uma imagem PNG, JPEG, WebP ou GIF.');
  let limpa;
  try { limpa = stripImageMetadata(f.buffer, detected.ext); } catch { throw new HttpError(400, 'Imagem corrompida. Tente outra foto.'); }

  const av = await scanWithClamAV(limpa);
  if (av.status === 'infected') throw new HttpError(400, 'Arquivo rejeitado pelo antivírus.');
  if (av.status === 'error') throw new HttpError(500, 'Não foi possível verificar a segurança da imagem.');

  const key = makeKey('avatars', `avatar-${req.user.id}.${detected.ext}`);
  await putFile(key, limpa, detected.mime);
  res.json(await Contas.trocarAvatar(req.user.id, `/api/v1/users/${req.user.id}/avatar?t=${Date.now()}`, key));
}));

r.delete('/avatar', ah(async (req, res) => res.json(await Contas.trocarAvatar(req.user.id, null, null))));

// ---------- Planos ----------
r.get('/planos', ah(async (req, res) => res.json({ planos: catalogoPlanos(), atual: planoDoUsuario(req.user).id })));

// Pedido de upgrade: com gateway Pix (Mercado Pago) ou confirmação manual pelo admin
r.get('/conta/upgrade', ah(async (req, res) => {
  res.json({ pedido: await Contas.obterPedidoUpgrade(req.user.id) });
}));
r.post('/conta/upgrade', ah(async (req, res) => {
  const b = parseBody(z.object({ plano: z.enum(['essencial', 'aprovacao']), periodicidade: z.enum(['mensal', 'anual']) }), req.body);
  res.status(201).json(await Contas.pedirUpgrade(req.user, b.plano, b.periodicidade));
}));
r.delete('/conta/upgrade', ah(async (req, res) => {
  res.json(await Contas.cancelarUpgrade(req.user));
}));

export default r;
