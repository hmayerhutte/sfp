module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@salesforce/core/testSetup$': '<rootDir>/node_modules/@salesforce/core/lib/testSetup',
  },
};