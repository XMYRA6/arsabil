/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '\\.(css|scss)$': 'identity-obj-proxy',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        module: 'commonjs',
        moduleResolution: 'node',
        jsx: 'react-jsx',
      },
    }],
  },
  // `.next/` BILEREK dislaniyor: `npm run build` sonrasi `.next/standalone`
  // altina uygulamanin tam bir kopyasi cikiyor; jest onu da tarayip "haste
  // module naming collision" uyarisi veriyor (ayni package.json iki kez).
  //
  // `.claude/worktrees/` BURAYA EKLENMEZ: worktree'nin KENDI yolu o dizinin
  // altindadir, pattern eklenirse worktree icinden calistirilan jest hicbir
  // test bulamaz. Ana checkout'ta worktree testlerinin toplanmasi sorunu
  // ignore pattern'iyle degil, dogru komutla cozulur:
  //   npx jest --no-coverage --roots "<rootDir>/src"
  testPathIgnorePatterns: ['/node_modules/', '/e2e/', '/\\.next/'],
  modulePathIgnorePatterns: ['<rootDir>/\\.next/'],
}

module.exports = config
