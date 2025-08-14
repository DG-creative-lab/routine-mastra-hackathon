import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  // Don't lint build artifacts
  { 
    ignores: [
      '.next/**', 
      'dist/**', 
      'generated-templates/**',
      'node_modules/**'
    ] 
  },
  
  // Use FlatCompat to convert Next.js config to flat config format
  ...compat.extends('next/core-web-vitals'),
  
  // Optional project tweaks
  {
    rules: {
      'prettier/prettier': 'off',
      // Add any other custom rules here
    },
  },
];