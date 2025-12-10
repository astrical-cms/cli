import type { Options } from 'tsup';

export default <Options>{
    entry: ['src/index.ts', 'src/commands/**/*.ts'],
    format: ['esm'],
    target: 'node18',
    clean: true,
    bundle: true,
    sourcemap: true,
    dts: true,
    minify: false,
    splitting: true,
    outDir: 'dist',
    shims: true,
};
