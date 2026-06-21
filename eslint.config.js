import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['node_modules/**', 'coverage/**', 'dist/**', 'build/**'],
  },
  {
    files: ['src/**/*.js', 'tests/**/*.test.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      // Permite parâmetros prefixados com _ (padrão Express error handler: (err, req, res, _next))
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['tests/**/*.test.js'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
];
