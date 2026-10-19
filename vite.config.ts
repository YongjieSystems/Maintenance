import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

export default defineConfig({
  base: './',
  server: { host: '127.0.0.1', port: 4175 },
  plugins: [{
    name: 'repair-calculation-module',
    generateBundle() {
      // The existing HTML uses Babel's browser module loader.
      for (const file of ['repair-core.js','repair-team.js','team-workspace.js','team-config.js','team-core.js','vendor/supabase.js']) {
        this.emitFile({type:'asset', fileName:file, source:readFileSync(new URL('./'+file, import.meta.url))});
      }
    },
  }],
});
