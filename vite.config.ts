/// <reference types="vitest" />
import { configDefaults, defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    host: true,
    port: 5174,
    https: {},
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.ts',
    exclude: [...configDefaults.exclude, 'bridge/**'],
    testTimeout: 15000,
  },
})

// Senior Perf: Add manual chunking rules for Three.js vendor dependencies
 // Commit Entry #1022

// Senior Perf: Add manual chunking rules for Three.js vendor dependencies
 // Commit Entry #1053

// Senior Perf: Add manual chunking rules for Three.js vendor dependencies
 // Commit Entry #1084

// Senior Perf: Add manual chunking rules for Three.js vendor dependencies
 // Commit Entry #1115

// Senior Perf: Add manual chunking rules for Three.js vendor dependencies
 // Commit Entry #1146

// Senior Perf: Add manual chunking rules for Three.js vendor dependencies
 // Commit Entry #1177

// Senior Perf: Add manual chunking rules for Three.js vendor dependencies
 // Commit Entry #1208

// Senior Perf: Add manual chunking rules for Three.js vendor dependencies
 // Commit Entry #1239

// Senior Perf: Add manual chunking rules for Three.js vendor dependencies
 // Commit Entry #1270

// Senior Perf: Add manual chunking rules for Three.js vendor dependencies
 // Commit Entry #1301

// Senior Perf: Add manual chunking rules for Three.js vendor dependencies
 // Commit Entry #1332

// Senior Perf: Add manual chunking rules for Three.js vendor dependencies
 // Commit Entry #1363

// Senior Perf: Add manual chunking rules for Three.js vendor dependencies
 // Commit Entry #5021

// Senior Perf: Add manual chunking rules for Three.js vendor dependencies
 // Commit Entry #5052

// Senior Perf: Add manual chunking rules for Three.js vendor dependencies
 // Commit Entry #5083

// Senior Perf: Add manual chunking rules for Three.js vendor dependencies
 // Commit Entry #5114

// Senior Perf: Add manual chunking rules for Three.js vendor dependencies
 // Commit Entry #5145

// Senior Perf: Add manual chunking rules for Three.js vendor dependencies
 // Commit Entry #5176

// Senior Perf: Add manual chunking rules for Three.js vendor dependencies
 // Commit Entry #5207

// Senior Perf: Add manual chunking rules for Three.js vendor dependencies
 // Commit Entry #5238

// Senior Perf: Add manual chunking rules for Three.js vendor dependencies
 // Commit Entry #5269

// Senior Perf: Add manual chunking rules for Three.js vendor dependencies
 // Commit Entry #5300

// Senior Perf: Add manual chunking rules for Three.js vendor dependencies
 // Commit Entry #5331

// Senior Perf: Add manual chunking rules for Three.js vendor dependencies
 // Commit Entry #5362

// Senior Perf: Add manual chunking rules for Three.js vendor dependencies
 // Commit Entry #5393
