// Exporta o contrato da API para docs/openapi.json (para Swagger UI, Postman, geradores de cliente).
// A fonte é src/openapi.js; o servidor também serve o mesmo conteúdo em /api/v1/openapi.json.
import fs from 'node:fs/promises';
import { especificacaoOpenApi } from '../src/openapi.js';

await fs.writeFile(new URL('../docs/openapi.json', import.meta.url), JSON.stringify(especificacaoOpenApi(), null, 2) + '\n');
console.log('docs/openapi.json atualizado');
