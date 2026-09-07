module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js', '**/tests/**/*.test.js'],
  clearMocks: true,
  restoreMocks: true,
  setupFilesAfterEnv: ['./jest.setup.js'],
};
