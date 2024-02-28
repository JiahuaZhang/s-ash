import { vitePlugin as remix } from '@remix-run/dev'
import { installGlobals } from '@remix-run/node'
import UnoCSS from 'unocss/vite'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

// installGlobals();

export default defineConfig({
  // server: {
  //   port: 3000,
  // },
  ssr: {
    noExternal: [],
  },
  plugins: [
    UnoCSS(),
    remix({
      ignoredRouteFiles: ['**/.*']
    }),
    tsconfigPaths()
  ]
})