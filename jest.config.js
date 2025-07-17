module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
  },
  moduleNameMapper: {
    '^axios$': require.resolve('axios'),
  },
  transformIgnorePatterns: ['<rootDir>/node_modules/'],
  "testTimeout": 30000
};