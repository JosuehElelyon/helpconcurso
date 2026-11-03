// Dados do próprio usuário: estrelas, perfil ("Minha conta"), senha, plano e pedido de upgrade
import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { one, query } from '../db.js';
import { ah, parseBody, HttpError } from '../lib/http.js';
import { requireAuth, hashPassword, checkPassword, publicUser } from '../lib/auth.js';
import { summary, redeem } from '../services/stars.js';
import { generationQuota } from '../services/quota.js';
import { resumoHoje } from '../services/atividade.js';
import { PLANOS, catalogoPlanos, planoDoUsuario } from '../lib/planos.js';
import { BANCA } from '../lib/bancas.js';
import { scanText, SEV } from '../security/index.js';
import { scanWithClamAV } from '../security/antivirus.js';
import { sendUpgradePedidoEmail } from '../lib/mailer.js';
import { uploader, fileOf } from '../lib/upload.js';
import { putFile, deleteFile, makeKey } from '../lib/storage.js';
import { PRESET_AVATARS, MAX_AVATAR_BYTES, detectImageType, stripImageMetadata } from '../lib/avatars.js';
import { config } from '../config.js';

const r = Router();
r.use(requireAuth);
const senhaLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, keyGenerator: (req) => req.user.id, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Muitas tentativas de troca de senha. Aguarde alguns minutos.' } });

r.get('/estrelas', ah(async (req, res) => res.json(await summary(req.user.id))));
r.post('/estrelas/trocar', ah(async (req, res) => {
  const b = parseBody(z.object({ geracoes: z.coerce.number().int().min(1, 'Quantidade inválida.').max(50) }), req.body);
  res.json(await redeem(req.user.id, b.geracoes));
}));

// Tela "Hoje": meta diária, sequência de dias de estudo, últimos 7 dias e contagem até a prova
r.get('/hoje', ah(async (req, res) => res.json(await resumoHoje(req.user))));

// ---------- Minha conta ----------
const perfil = (u) => ({
  ...publicUser(u),
  telefone: u.telefone || '', concursoAlvo: u.concurso_alvo || '', bancaPreferida: u.banca_preferida || '',
  dataProva: u.data_prova ? new Date(u.data_prova).toISOString().slice(0, 10) : '', metaDiaria: u.meta_diaria || null,
  membroDesde: u.created_at,
});

async function contaView(u) {
  const plano = planoDoUsuario(u);
  const [uso, pedido, contagem] = await Promise.all([
    generationQuota(u),
    one("SELECT id, plano, periodicidade, valor, status, created_at FROM plano_pedidos WHERE user_id=$1 AND status='pendente'", [u.id]),
    one('SELECT (SELECT count(*) FROM editais WHERE user_id=$1)::int AS editais, (SELECT count(*) FROM cadernos WHERE user_id=$1)::int AS cadernos', [u.id]),
  ]);
  return {
    perfil: perfil(u),
    plano: { id: plano.id, nome: plano.nome, ate: plano.id === u.plano ? u.plano_ate : null, limites: plano.limites },
    uso: { simuladosHoje: uso.usedToday, dificeisHoje: uso.dificeisHoje, creditosExtras: uso.bonus, editais: contagem.editais, cadernos: contagem.cadernos },
    pedidoPendente: pedido ? { ...pedido, planoNome: PLANOS[pedido.plano]?.nome || pedido.plano } : null,
  };
}

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
  const u = await one(`UPDATE users SET name=$2, telefone=NULLIF($3,''), concurso_alvo=NULLIF($4,''), banca_preferida=NULLIF($5,''),
                         data_prova=NULLIF($6,'')::date, meta_diaria=$7, updated_at=now() WHERE id=$1 RETURNING *`,
  [req.user.id, b.name, b.telefone, b.concursoAlvo, b.bancaPreferida, b.dataProva, b.metaDiaria || null]);
  res.json(await contaView(u));
}));

r.post('/conta/senha', senhaLimit, ah(async (req, res) => {
  const b = parseBody(z.object({ senhaAtual: z.string().min(1, 'Informe a senha atual.'), novaSenha: z.string().min(8, 'A nova senha precisa ter ao menos 8 caracteres.').max(200) }), req.body);
  const u = await one('SELECT password_hash FROM users WHERE id=$1', [req.user.id]);
  if (!u?.password_hash || !(await checkPassword(b.senhaAtual, u.password_hash))) throw new HttpError(400, 'Senha atual incorreta.');
  await query('UPDATE users SET password_hash=$2, updated_at=now() WHERE id=$1', [req.user.id, await hashPassword(b.novaSenha)]);
  res.json({ ok: true });
}));

// ---------- Avatar ----------
const avatarLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, keyGenerator: (req) => req.user.id, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Muitos envios de avatar. Aguarde alguns minutos.' } });

r.get('/avatar/presets', ah(async (_req, res) => res.json({ presets: PRESET_AVATARS })));

// Troca o avatar e só depois apaga o arquivo antigo (se a gravação falhar, o aluno não fica sem foto)
async function trocarAvatar(userId, avatarUrl, avatarKey) {
  const antigo = await one('SELECT avatar_key FROM users WHERE id=$1', [userId]);
  const u = await one('UPDATE users SET avatar_url=$2, avatar_key=$3, updated_at=now() WHERE id=$1 RETURNING *', [userId, avatarUrl, avatarKey]);
  if (antigo?.avatar_key && antigo.avatar_key !== avatarKey) await deleteFile(antigo.avatar_key).catch(() => {});
  return u;
}

const presetIds = PRESET_AVATARS.map((p) => p.id);
r.patch('/avatar/preset', ah(async (req, res) => {
  const b = parseBody(z.object({ preset: z.string().refine((p) => presetIds.includes(p), 'Avatar pré-definido inválido.') }), req.body);
  res.json(await contaView(await trocarAvatar(req.user.id, `/avatars/${b.preset}`, null)));
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
  res.json(await contaView(await trocarAvatar(req.user.id, `/api/users/${req.user.id}/avatar?t=${Date.now()}`, key)));
}));

r.delete('/avatar', ah(async (req, res) => res.json(await contaView(await trocarAvatar(req.user.id, null, null)))));

// ---------- Planos ----------
r.get('/planos', ah(async (req, res) => res.json({ planos: catalogoPlanos(), atual: planoDoUsuario(req.user).id })));

// Pedido de upgrade: sem gateway de pagamento por enquanto — o admin confirma o pagamento e ativa
r.post('/conta/upgrade', ah(async (req, res) => {
  const b = parseBody(z.object({ plano: z.enum(['essencial', 'aprovacao']), periodicidade: z.enum(['mensal', 'anual']) }), req.body);
  if (req.user.role === 'ADMIN') throw new HttpError(400, 'Administradores já têm acesso completo.');
  const p = PLANOS[b.plano];
  const valor = b.periodicidade === 'anual' ? p.precoAnual : p.precoMensal;
  const pedido = await one(`INSERT INTO plano_pedidos(user_id, plano, periodicidade, valor) VALUES ($1,$2,$3,$4)
                            ON CONFLICT (user_id) WHERE status = 'pendente'
                            DO UPDATE SET plano=EXCLUDED.plano, periodicidade=EXCLUDED.periodicidade, valor=EXCLUDED.valor, created_at=now()
                            RETURNING *`, [req.user.id, b.plano, b.periodicidade, valor]);
  for (const to of config.adminEmails || []) sendUpgradePedidoEmail(to, { aluno: req.user, plano: p.nome, periodicidade: b.periodicidade, valor });
  res.status(201).json({ pedido, conta: await contaView(req.user) });
}));
r.delete('/conta/upgrade', ah(async (req, res) => {
  await query("UPDATE plano_pedidos SET status='cancelado', decidido_em=now() WHERE user_id=$1 AND status='pendente'", [req.user.id]);
  res.json(await contaView(req.user));
}));

export default r;
