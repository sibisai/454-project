/**
 * api.js — API client wrapper.
 *
 * Configures an Axios (or fetch) instance with:
 *   - Base URL pointing to the backend API
 *   - JWT token interceptor (attaches Authorization header)
 *   - Response interceptor for 401 handling and token refresh
 */
