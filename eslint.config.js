import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      'dist/**/*',
      'node_modules/**/*',
      'src/routes/**/*',
      'scratch/**/*.cjs',
      'scratch/**/*.js',
    ],
  },

  eslint.configs.recommended,

  ...tseslint.configs.recommended,

  {
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn',
      //   "no-console": "warn",
    },
  },

  eslintConfigPrettier
);
