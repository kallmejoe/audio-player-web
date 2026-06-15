import * as esbuild from 'esbuild';

async function main() {
  await esbuild.build({
    entryPoints: ['electron/main.ts', 'electron/preload.ts'],
    outdir: 'dist-electron',
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node18',
    external: ['electron'],
    sourcemap: true,
    minify: true,
    outExtension: { '.js': '.cjs' },
  });
  console.log('✓ Electron main & preload built to dist-electron/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
