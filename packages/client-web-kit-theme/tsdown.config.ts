import { defineConfig } from 'tsdown';

export default defineConfig({
    // Two entries: the JS theme factory (-> dist/index.mjs) and the CSS
    // theme (-> dist/style.css).
    //
    // The CSS entry (src/style.css -> src/index.css) is bundled by
    // rolldown's CSS pipeline: it inlines every resolvable @import —
    // our relative `./styles/*` partials AND the `tailwindcss` /
    // `@vuecs/design` / `@vuecs/theme-tailwind` CSS — into one file.
    // Crucially the `@tailwind utilities;` directive survives inlining,
    // so the CONSUMER app's Tailwind still runs the JIT over the bundle
    // (verified by compiling dist/style.css through @tailwindcss/cli).
    entry: ['src/index.ts', 'src/style.css'],
    format: 'esm',
    sourcemap: true,
});
