import axios from 'axios';
import apiClient from '../api/apiClient';

const API_URL = process.env.REACT_APP_API_URL;

const LoginService = {
  // Login doesn't use apiClient since user is not authenticated yet
  async handleLogin({ email, password, entityType }) {
    const response = await axios.post(`${API_URL}ep/v1/authentication/authenticate`, {
      email,
      password,
      entityType,
    });
    if (response.data.jwtToken) {
      localStorage.setItem('user', JSON.stringify(response.data));
    }
    return response.data;
  },

  // Reset password uses apiClient since user is authenticated
  async resetPassword({ oldPassword, newPassword }) {
    const response = await apiClient.post('ep/v1/authentication/changePassword', {
      oldPassword,
      newPassword,
    });
    return response.data;
  },

  // Verify email using token from verification email
  async verifyEmail(token) {
    const response = await axios.get(`${API_URL}ep/v1/verification/verify`, {
      params: { token },
    });
    return response.data;
  },

  // Resend verification email
  async resendVerificationEmail(email) {
    const response = await axios.post(`${API_URL}ep/v1/verification/resend`, {
      email,
    });
    return response.data;
  },

  // Request forgot password email
  async forgotPassword(email) {
    const response = await axios.post(`${API_URL}ep/v1/resetuserpassword/forgotPassword`, {
      email,
    });
    return response.data;
  },

  // Reset password using token from email
  async resetPasswordWithToken(token, newPassword) {
    const response = await axios.post(`${API_URL}ep/v1/resetuserpassword/resetPassword`, {
      token,
      newPassword,
    });
    return response.data;
  },
};

export default LoginService;
