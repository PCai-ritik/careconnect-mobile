/**
 * CareConnect — Service Helpers
 *
 * Utility functions for the service layer.
 */

/**
 * Wraps mock data in a Promise with simulated network latency.
 * Used by service functions when the backend is not yet available.
 *
 * @param data - The mock data to return
 * @param delayMs - Simulated network delay in milliseconds (default: 600)
 */
export function mockResponse<T>(data: T, delayMs = 600): Promise<T> {
    return new Promise((resolve) => setTimeout(() => resolve(data), delayMs));
}
