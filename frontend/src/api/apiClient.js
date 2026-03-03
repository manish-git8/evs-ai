import axios from 'axios';
import { toast } from 'react-toastify';

const API_URL = process.env.REACT_APP_API_URL;

class ApiClient {
  constructor(baseURL = API_URL) {
    this.baseURL = baseURL;

    this.axiosInstance = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor - add auth token
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && user.jwtToken) {
          config.headers['Authorization'] = `Bearer ${user.jwtToken}`;
        }

        // Validate companyId in URL to prevent invalid requests
        const companyIdPattern = /\/company\/(\d+|undefined|null)\//;
        const match = config.url?.match(companyIdPattern);

        if (match) {
          const companyIdInUrl = match[1];
          if (companyIdInUrl === 'undefined' || companyIdInUrl === 'null' || !companyIdInUrl) {
            const error = new Error('Invalid company ID. Please refresh and try again.');
            error.isInvalidCompanyError = true;
            return Promise.reject(error);
          }
        }

        return config;
      },
      (error) => Promise.reject(error),
    );

    // Response interceptor - handle errors centrally
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        const status = error.response?.status;
        const suppressToast = error.config?.suppressErrorToast;

        switch (status) {
          case 401:
            this.handleUnauthorized();
            break;
          case 403:
            this.handleForbidden(error);
            break;
          case 400:
            if (!suppressToast) this.handleBadRequest(error);
            break;
          case 404:
            this.handleNotFound(error);
            break;
          case 500:
          case 502:
          case 503:
            if (!suppressToast) this.handleServerError(error);
            break;
          default:
            // For other errors, just format and reject
            break;
        }

        return Promise.reject(this.formatError(error));
      },
    );
  }

  /**
   * Handle 401 Unauthorized - session expired or invalid token
   */
  handleUnauthorized() {
    localStorage.clear();
    toast.error('Session expired. Please login again.', { toastId: 'session-expired' });
    window.location.href = '/';
  }

  /**
   * Handle 403 Forbidden - could be session expired OR subscription issue
   */
  handleForbidden(error) {
    const errorCode = error.response?.data?.error || '';
    const errorMessage = error.response?.data?.message || '';

    // Check if this is a subscription-related error
    if (errorCode.startsWith('SUBSCRIPTION_') || errorCode === 'NO_SUBSCRIPTION' || errorCode === 'TRIAL_EXPIRED') {
      // Store the subscription error for display
      sessionStorage.setItem('subscriptionError', JSON.stringify({
        code: errorCode,
        message: errorMessage
      }));

      // Clear auth but preserve the error
      localStorage.removeItem('user');
      localStorage.removeItem('userDetails');
      localStorage.removeItem('entityId');

      // Show the actual subscription error message
      toast.error(errorMessage || 'Your subscription is not active. Please contact your administrator.', {
        toastId: 'subscription-error',
        autoClose: false  // Don't auto-close so user can read it
      });

      // Redirect to login with a flag
      window.location.href = '/?subscription_error=true';
      return;
    }

    // Regular session expiration
    localStorage.clear();
    toast.error('Session expired. Please login again.', { toastId: 'session-expired' });
    window.location.href = '/';
  }

  /**
   * Handle 400 Bad Request
   */
  handleBadRequest(error) {
    const errorMessage =
      error.response?.data?.errorMessage ||
      error.response?.data?.message ||
      'Bad request - Invalid data provided';

    toast.error(errorMessage, { toastId: 'bad-request' });
  }

  /**
   * Handle 404 Not Found
   */
  handleNotFound(error) {
    const errorMessage =
      error.response?.data?.errorMessage ||
      error.response?.data?.message ||
      'Resource not found';

    // Don't show toast for 404 as it might be intentional (e.g., checking if something exists)
    console.warn('404 Not Found:', errorMessage);
  }

  /**
   * Handle 5xx Server Errors
   */
  handleServerError(error) {
    const errorMessage =
      error.response?.data?.errorMessage ||
      error.response?.data?.message ||
      'Server error. Please try again later.';

    toast.error(errorMessage, { toastId: 'server-error' });
  }

  /**
   * Format error for consistent error handling
   */
  formatError(error) {
    const errorMessage =
      error.response?.data?.errorMessage ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';

    const customError = new Error(errorMessage);
    customError.status = error.response?.status;
    customError.data = error.response?.data;
    customError.originalError = error;

    return customError;
  }

  /**
   * GET request
   */
  get(endpoint, config = {}) {
    return this.axiosInstance.get(endpoint, config);
  }

  /**
   * POST request
   */
  post(endpoint, data = {}, config = {}) {
    return this.axiosInstance.post(endpoint, data, config);
  }

  /**
   * PUT request
   */
  put(endpoint, data = {}, config = {}) {
    return this.axiosInstance.put(endpoint, data, config);
  }

  /**
   * PATCH request
   */
  patch(endpoint, data = {}, config = {}) {
    return this.axiosInstance.patch(endpoint, data, config);
  }

  /**
   * DELETE request
   */
  delete(endpoint, config = {}) {
    return this.axiosInstance.delete(endpoint, config);
  }
}

// Export singleton instance
const apiClient = new ApiClient();

export default apiClient;
