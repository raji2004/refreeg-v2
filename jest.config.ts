/**
 * Jest configuration for unit tests only.
 * E2E tests use Playwright: run with `pnpm run test:e2e`.
 *
 * Run unit tests with: `pnpm run test` (do not use `bun test`).
 * https://jestjs.io/docs/configuration
 */
import type { Config } from "jest";

const config: Config = {
  clearMocks: true,
  collectCoverage: true,
  collectCoverageFrom: [
    "lib/health/**/*.ts",
    "!lib/health/types.ts",
    "lib/utils.ts",
    "app/api/health/**/*.ts",
    "!**/*.d.ts",
  ],
  coverageDirectory: "coverage",
  coveragePathIgnorePatterns: ["/node_modules/", "/e2e/"],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^next-auth$": "<rootDir>/__mocks__/next-auth.ts",
    "^next-auth/react$": "<rootDir>/__mocks__/next-auth-react.ts",
    "^next/navigation$": "<rootDir>/__mocks__/next-navigation.ts",
    "^next/cache$": "<rootDir>/__mocks__/next-cache.ts",
    "\\.(css|less|scss|sass)$": "<rootDir>/__mocks__/styleMock.js",
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testEnvironment: "jsdom",
  testMatch: [
    "**/__tests__/**/*.[jt]s?(x)",
    "**/tests/**/*.test.[jt]s?(x)",
  ],
  testPathIgnorePatterns: ["/node_modules/", "/e2e/"],
  transform: {
    "^.+\\.(ts|tsx|js|jsx)$": "babel-jest",
  },
};

export default config;
