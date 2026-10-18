import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

export default defineConfig({
  base: './',
  server: { host: '127.0.0.1', port: 4175 },
  plugins: [{
    name: 'repair-calculation-module',
    generateBundle() {
      // The existing HTML uses Babel's browser module loader.
      this.emitFile({type:'asset', fileName:'repair-core.js', source:readFileSync(new URL('./repair-core.js', import.meta.url))});
    },
  }],
});
