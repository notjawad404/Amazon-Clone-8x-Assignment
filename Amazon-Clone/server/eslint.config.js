import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import n from 'eslint-plugin-n'
import globals from 'globals'

export default [
  { ignores: ['node_modules', 'coverage'] },
  js.configs.recommended,
  n.configs['flat/recommended-module'],
  {
    languageOptions: { globals: globals.node },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'n/no-process-exit': 'off',
      'n/no-unpublished-import': 'off',
    },
  },
  prettier,
]
