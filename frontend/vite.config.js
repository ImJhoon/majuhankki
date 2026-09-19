import { defineConfig, loadEnv } from 'vite'
import path from 'path'

export default defineConfig(({ mode }) => {
  const isDemo = mode === 'demo'

  if (!isDemo) {
    // 백엔드와 공유하는 환경변수명을 프론트엔드 빌드용 VITE_ 변수에 매핑합니다.
    const env = loadEnv(mode, path.resolve(import.meta.dirname, '..'), '')
    process.env.VITE_KAKAO_MAP_API_KEY = env.KAKAO_MAP_JAVASCRIPT_KEY || ''
  }

  return {
    plugins: isDemo ? [{
      name: 'demo-root-index',
      enforce: 'post',
      generateBundle(_, bundle) {
        const page = bundle['demo.html']
        if (!page) return
        page.fileName = 'index.html'
      },
    }] : [],
    // 데모 번들에는 운영 VITE_* 환경변수를 노출하지 않습니다.
    envPrefix: isDemo ? [] : 'VITE_',
    base: isDemo ? './' : '/',
    build: {
      outDir: isDemo ? 'dist-demo' : 'dist',
      modulePreload: isDemo ? false : undefined,
      rollupOptions: {
        input: path.resolve(import.meta.dirname, isDemo ? 'demo.html' : 'index.html'),
      },
    },
    server: {
      port: 3000,
      strictPort: true,
      proxy: {
        '/auth': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
        '/oauth2': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
        '/login/oauth2': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
        '/users': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
        '/regions': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
        '/matches': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
        '/chatrooms': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
        '/ws-chat': {
          target: 'http://localhost:8080',
          changeOrigin: true,
          ws: true,
        },
        '/reviews': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
        '/reports': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
        '/admin': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
        '/mypage/reviews': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
  }
})
