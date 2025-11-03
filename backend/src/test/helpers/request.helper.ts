/**
 * Request helper utilities for API testing
 * Provides convenience functions for making authenticated requests
 */

import request from 'supertest';
import express from 'express';

/**
 * Create authenticated request with token
 */
export function authenticatedRequest(
  app: express.Application,
  token: string
) {
  return {
    get: (url: string) => request(app).get(url).set('Authorization', `Bearer ${token}`),
    post: (url: string) => request(app).post(url).set('Authorization', `Bearer ${token}`),
    put: (url: string) => request(app).put(url).set('Authorization', `Bearer ${token}`),
    patch: (url: string) => request(app).patch(url).set('Authorization', `Bearer ${token}`),
    delete: (url: string) => request(app).delete(url).set('Authorization', `Bearer ${token}`),
  };
}

/**
 * Make GET request with token
 */
export async function getRequest(
  app: express.Application,
  url: string,
  token: string
) {
  return request(app)
    .get(url)
    .set('Authorization', `Bearer ${token}`);
}

/**
 * Make POST request with token and data
 */
export async function postRequest(
  app: express.Application,
  url: string,
  token: string,
  data: any
) {
  return request(app)
    .post(url)
    .set('Authorization', `Bearer ${token}`)
    .send(data);
}

/**
 * Make PUT request with token and data
 */
export async function putRequest(
  app: express.Application,
  url: string,
  token: string,
  data: any
) {
  return request(app)
    .put(url)
    .set('Authorization', `Bearer ${token}`)
    .send(data);
}

/**
 * Make PATCH request with token and data
 */
export async function patchRequest(
  app: express.Application,
  url: string,
  token: string,
  data: any
) {
  return request(app)
    .patch(url)
    .set('Authorization', `Bearer ${token}`)
    .send(data);
}

/**
 * Make DELETE request with token
 */
export async function deleteRequest(
  app: express.Application,
  url: string,
  token: string
) {
  return request(app)
    .delete(url)
    .set('Authorization', `Bearer ${token}`);
}

/**
 * Assert successful response (2xx status)
 */
export function assertSuccess(response: request.Response) {
  expect(response.status).toBeGreaterThanOrEqual(200);
  expect(response.status).toBeLessThan(300);
}

/**
 * Assert error response with specific status
 */
export function assertError(response: request.Response, expectedStatus: number) {
  expect(response.status).toBe(expectedStatus);
  expect(response.body).toHaveProperty('error');
}

/**
 * Assert unauthorized (401)
 */
export function assertUnauthorized(response: request.Response) {
  expect(response.status).toBe(401);
}

/**
 * Assert forbidden (403)
 */
export function assertForbidden(response: request.Response) {
  expect(response.status).toBe(403);
}

/**
 * Assert not found (404)
 */
export function assertNotFound(response: request.Response) {
  expect(response.status).toBe(404);
}

/**
 * Assert bad request (400)
 */
export function assertBadRequest(response: request.Response) {
  expect(response.status).toBe(400);
}

/**
 * Extract pagination from response
 */
export function getPagination(response: request.Response) {
  return {
    page: response.body.page || 1,
    limit: response.body.limit || 10,
    total: response.body.total || 0,
    totalPages: response.body.totalPages || 0,
  };
}
