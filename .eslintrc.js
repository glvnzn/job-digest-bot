module.exports = {
  root: true,
  ignorePatterns: ['**/*'],
  env: {
    node: true,
    es2022: true,
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      extends: ['eslint:recommended'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      rules: {
        'no-console': 'off',
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/no-explicit-any': 'warn',
      },
    },
    {
      files: ['*.js', '*.jsx'],
      extends: ['eslint:recommended'],
      rules: {
        'no-console': 'off',
      },
    },
  ],
};
