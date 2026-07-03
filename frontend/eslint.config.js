import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'android', 'node_modules']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Tắt các rule React Compiler (v7+) — dự án này chưa dùng React Compiler
      // Những rule này tạo false-positive cho setState trong async callbacks
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      // Hạ exhaustive-deps xuống warn để không block build
      'react-hooks/exhaustive-deps': 'warn',
      // Cho phép biến bắt đầu bằng _ để ignore
      'no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      // Cho phép no-undef trong toàn cục (một số file dùng channelRef đã có eslint-disable)
      'no-undef': 'error',
    },
  },
])
