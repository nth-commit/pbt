module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./jest.setup.js'],
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.test.json'
    }
  },
  collectCoverageFrom: [
    "src/**/*.ts"
  ],
  coverageThreshold: {
    global: {
      "statements": 100,
      "branches": 100,
      "functions": 100,
      "lines": 100,
    }
  },
  coveragePathIgnorePatterns: [
  ]
};
