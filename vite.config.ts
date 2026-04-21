import { defineConfig } from 'vite'

export default defineConfig({
  worker: {
    format: 'es',
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/Engines/webgpuEngine')) return 'babylon-webgpu';
          if (id.includes('/PostProcesses/')) return 'babylon-postfx';
          if (id.includes('/Loading/sceneLoader')) return 'babylon-scene-loader';
          if (id.includes('@babylonjs/gui')) return 'babylon-gui';
          if (id.includes('@babylonjs/loaders')) return 'babylon-loaders';
          if (id.includes('@babylonjs')) return 'babylon-core';
          if (id.includes('zustand')) return 'state';
          if (id.includes('/src/game/hub/') || id.includes('/src/ui/shop/') || id.includes('/src/ui/perks/') || id.includes('/src/ui/missionBoard/') || id.includes('/src/ui/DecryptionUI')) {
            return 'hub';
          }
          if (id.includes('/src/game/missions/') || id.includes('/src/game/combat/') || id.includes('/src/game/entities/') || id.includes('/src/game/effects/')) {
            return 'mission';
          }
        },
      },
    },
  },
})
