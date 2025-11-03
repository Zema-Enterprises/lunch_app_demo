"use strict";
/**
 * Request helper utilities for API testing
 * Provides convenience functions for making authenticated requests
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticatedRequest = authenticatedRequest;
exports.getRequest = getRequest;
exports.postRequest = postRequest;
exports.putRequest = putRequest;
exports.patchRequest = patchRequest;
exports.deleteRequest = deleteRequest;
exports.assertSuccess = assertSuccess;
exports.assertError = assertError;
exports.assertUnauthorized = assertUnauthorized;
exports.assertForbidden = assertForbidden;
exports.assertNotFound = assertNotFound;
exports.assertBadRequest = assertBadRequest;
exports.getPagination = getPagination;
const supertest_1 = __importDefault(require("supertest"));
/**
 * Create authenticated request with token
 */
function authenticatedRequest(app, token) {
    return {
        get: (url) => (0, supertest_1.default)(app).get(url).set('Authorization', `Bearer ${token}`),
        post: (url) => (0, supertest_1.default)(app).post(url).set('Authorization', `Bearer ${token}`),
        put: (url) => (0, supertest_1.default)(app).put(url).set('Authorization', `Bearer ${token}`),
        patch: (url) => (0, supertest_1.default)(app).patch(url).set('Authorization', `Bearer ${token}`),
        delete: (url) => (0, supertest_1.default)(app).delete(url).set('Authorization', `Bearer ${token}`),
    };
}
/**
 * Make GET request with token
 */
async function getRequest(app, url, token) {
    return (0, supertest_1.default)(app)
        .get(url)
        .set('Authorization', `Bearer ${token}`);
}
/**
 * Make POST request with token and data
 */
async function postRequest(app, url, token, data) {
    return (0, supertest_1.default)(app)
        .post(url)
        .set('Authorization', `Bearer ${token}`)
        .send(data);
}
/**
 * Make PUT request with token and data
 */
async function putRequest(app, url, token, data) {
    return (0, supertest_1.default)(app)
        .put(url)
        .set('Authorization', `Bearer ${token}`)
        .send(data);
}
/**
 * Make PATCH request with token and data
 */
async function patchRequest(app, url, token, data) {
    return (0, supertest_1.default)(app)
        .patch(url)
        .set('Authorization', `Bearer ${token}`)
        .send(data);
}
/**
 * Make DELETE request with token
 */
async function deleteRequest(app, url, token) {
    return (0, supertest_1.default)(app)
        .delete(url)
        .set('Authorization', `Bearer ${token}`);
}
/**
 * Assert successful response (2xx status)
 */
function assertSuccess(response) {
    expect(response.status).toBeGreaterThanOrEqual(200);
    expect(response.status).toBeLessThan(300);
}
/**
 * Assert error response with specific status
 */
function assertError(response, expectedStatus) {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty('error');
}
/**
 * Assert unauthorized (401)
 */
function assertUnauthorized(response) {
    expect(response.status).toBe(401);
}
/**
 * Assert forbidden (403)
 */
function assertForbidden(response) {
    expect(response.status).toBe(403);
}
/**
 * Assert not found (404)
 */
function assertNotFound(response) {
    expect(response.status).toBe(404);
}
/**
 * Assert bad request (400)
 */
function assertBadRequest(response) {
    expect(response.status).toBe(400);
}
/**
 * Extract pagination from response
 */
function getPagination(response) {
    return {
        page: response.body.page || 1,
        limit: response.body.limit || 10,
        total: response.body.total || 0,
        totalPages: response.body.totalPages || 0,
    };
}
