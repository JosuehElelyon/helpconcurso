// Índice da API REST. Cada módulo é montado em /api/v1/<prefixo> (versão atual) e também em /api/<prefixo>
// (apelido da transição — responde com o cabeçalho Deprecation). O contrato está em src/openapi.js e é servido em
// /api/v1/openapi.json; test/contrato.test.js garante que toda rota daqui está no contrato e vice-versa.
import { Router } from 'express';
import { HttpError } from '../lib/http.js';
import sistema from './sistema.js';
import auth from './auth.js';
import users from './users.js';
import materials from './materials.js';
import sets from './sets.js';
import provas from './provas.js';
import { bancasRouter } from './bancas.js';
import admin from './admin.js';
import me from './me.js';
import editais from './editais.js';
import cadernos from './cadernos.js';
import webhooks from './webhooks.js';

export const VERSAO_API = 'v1';

/** [prefixo, roteador] — a ordem é a de montagem. */
export const MODULOS = [
  ['', sistema],
  ['/auth', auth],
  ['/users', users],
  ['/materials', materials],
  ['/sets', sets],
  ['/provas', provas],
  ['/bancas', bancasRouter],
  ['/admin', admin],
  ['/me', me],
  ['/editais', editais],
  ['/cadernos', cadernos],
  ['/webhooks', webhooks],
];

export function criarRotasApi() {
  const api = Router();
  for (const [prefixo, router] of MODULOS) api.use(prefixo || '/', router);
  api.use((_req, _res, next) => next(new HttpError(404, 'Rota não encontrada.')));
  return api;
}
