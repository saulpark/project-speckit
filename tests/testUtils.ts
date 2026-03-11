/**
 * Test Utilities
 * Common functions and data for integration testing
 */

import request from 'supertest';
import { app } from '../src/server';
import { JWTUtils } from '../src/utils/jwt';
import mongoose from 'mongoose';

export const testApp = app;

/**
 * Test user data for consistent testing
 */
export const testUsers = {
  valid: {
    email: 'test@example.com',
    password: 'Complex$ecure!P@ssw0rd#2024',
    firstName: 'Test',
    lastName: 'User'
  },
  invalid: {
    email: 'invalid-email',
    password: '123',
    firstName: '',
    lastName: ''
  },
  existing: {
    email: 'existing@example.com',
    password: 'Existing$ecure!P@ssw0rd#2024',
    firstName: 'Existing',
    lastName: 'User'
  }
};

/**
 * Create a test user via API
 */
export async function createTestUser(userData = testUsers.valid) {
  const response = await request(testApp)
    .post('/auth/register')
    .send(userData);

  return response;
}

/**
 * Login a test user and return token
 */
export async function loginTestUser(credentials = {
  email: testUsers.valid.email,
  password: testUsers.valid.password
}) {
  const response = await request(testApp)
    .post('/auth/login')
    .send(credentials);

  return response;
}

/**
 * Generate a test JWT token for authentication
 */
export function generateTestToken(userId = 'test-user-id', email = 'test@example.com') {
  return JWTUtils.generateToken(userId, email);
}

/**
 * Create authorization header for authenticated requests
 */
export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

/**
 * Wait for a specified time (useful for rate limiting tests)
 */
export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate unique email for testing
 */
export function uniqueEmail() {
  return `test-${Date.now()}-${Math.random().toString(36).substr(2, 5)}@example.com`;
}

/**
 * Clean database collections
 */
export async function clearDatabase() {
  const collections = mongoose.connection.collections;

  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
}

/**
 * Common API response assertions
 */
export const expectValidResponse = (response: request.Response) => {
  expect(response.body).toHaveProperty('success');
  expect(response.body).toHaveProperty('timestamp');
  // Note: not all responses have 'message' property (e.g., stats endpoint)
};

export const expectAuthResponse = (response: request.Response) => {
  expectValidResponse(response);
  expect(response.body).toHaveProperty('data');
  expect(response.body.data).toHaveProperty('token');
};

export const expectErrorResponse = (response: request.Response) => {
  expect(response.body).toHaveProperty('error');
  expect(response.body).toHaveProperty('status');
  expect(response.body).toHaveProperty('timestamp');
};