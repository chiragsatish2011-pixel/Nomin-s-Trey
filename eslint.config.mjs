import js from '@eslint/js'
import tsPlugin from 'typescript-eslint'

export default [
  js.configs.recommended,
  ...tsPlugin.configs.recommended,
  {
    files: ['packages/core/src/**/*.{ts,js}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'electron', message: 'packages/core must not import electron' },
            { name: 'node:fs', message: 'packages/core must not import node:* modules' },
            { name: 'node:path', message: 'packages/core must not import node:* modules' },
            { name: 'node:child_process', message: 'packages/core must not import node:* modules' },
            { name: 'node:os', message: 'packages/core must not import node:* modules' },
            { name: 'node:crypto', message: 'packages/core must not import node:* modules' },
            { name: 'node:buffer', message: 'packages/core must not import node:* modules' },
            { name: 'node:stream', message: 'packages/core must not import node:* modules' },
            { name: 'node:events', message: 'packages/core must not import node:* modules' },
            { name: 'node:http', message: 'packages/core must not import node:* modules' },
            { name: 'node:https', message: 'packages/core must not import node:* modules' },
            { name: 'fs', message: 'packages/core must not import Node native modules' },
            { name: 'path', message: 'packages/core must not import Node native modules' },
            { name: 'child_process', message: 'packages/core must not import Node native modules' },
            { name: 'os', message: 'packages/core must not import Node native modules' },
            { name: 'crypto', message: 'packages/core must not import Node native modules' },
            { name: 'buffer', message: 'packages/core must not import Node native modules' }
          ],
          patterns: [
            { group: ['electron', 'electron/*'], message: 'packages/core must not import electron' },
            { group: ['node:*'], message: 'packages/core must not import node:* modules' }
          ]
        }
      ],
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'packages/core must not use DOM window' },
        { name: 'document', message: 'packages/core must not use DOM document' },
        { name: 'navigator', message: 'packages/core must not use DOM navigator' },
        { name: 'localStorage', message: 'packages/core must not use DOM localStorage' },
        { name: 'sessionStorage', message: 'packages/core must not use DOM sessionStorage' }
      ]
    }
  },
  {
    ignores: [
      '**/node_modules/**',
      '**/out/**',
      '**/dist/**',
      'Mac/**',
      'iOS/**',
      'Shared/**',
      'Tests/**',
      'build/**',
      '.build/**',
      '.wrap/**',
      '.gsd/**'
    ]
  }
]
