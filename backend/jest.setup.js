// backend/jest.setup.js
// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.PORT = '5001';

jest.mock('uuid', () => ({
  v4: () => 'mocked-uuid-v4-1234',
  v1: () => 'mocked-uuid-v1-1234'
}));
