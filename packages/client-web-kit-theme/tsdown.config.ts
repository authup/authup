import { defineConfig } from 'tsdown';

export default defineConfig({
    // JS theme factory only (-> dist/index.mjs). The theme CSS is NOT
    // bundled: it ships raw under assets/css/ (see `files` +
    // `exports.style` in package.json) and is processed by the
    // consumer's Tailwind, which resolves the `tailwindcss` /
    // `@vuecs/*` imports and runs the JIT. Bundling the CSS here would
    // also drop the bare `@layer theme, vuecs, …;` order statement —
    // rolldown's CSS pipeline strips statement rules, leaving the
    // cascade order to the accidental first-appearance order of the
    // inlined blocks.
    entry: ['src/index.ts'],
    format: 'esm',
    sourcemap: true,
});
