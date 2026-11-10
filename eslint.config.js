// ESLint só para pegar erro de verdade (não estilo): nome usado sem estar definido (no-undef) e afins.
// Foi assim que apareceram bugs que travavam telas (ex.: "Meu edital" com filterTabs inexistente). Roda no CI: npm run lint.
import globals from 'globals';

const regras = { 'no-undef': 'error', 'no-unreachable': 'error', 'no-dupe-keys': 'error', 'no-redeclare': 'error' };

export default [
  { ignores: ['node_modules/**', 'data/**', 'test-e2e/capturas/**'] },
  { files: ['public/**/*.js'], languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.browser } }, rules: regras },
  { files: ['src/**/*.js', 'scripts/**/*.js', 'test/**/*.js', 'eslint.config.js'], languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.node } }, rules: regras },
  // Teste de navegador: o código dentro de page.evaluate roda no navegador
  { files: ['test-e2e/**/*.mjs'], languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.node, ...globals.browser } }, rules: regras },
];
