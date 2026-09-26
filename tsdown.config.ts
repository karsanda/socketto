import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  target: 'es2020',
  platform: 'neutral',
  dts: { cjsDefault: true },
  exports: true,
  publint: true,
  attw: true
})
