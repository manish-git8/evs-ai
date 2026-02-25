import { format } from 'date-fns';

/**
 * Retrieve companyId (entityId) from localStorage
 * @returns {string|null} companyId
 */
export const getEntityId = () => {
  try {
    return JSON.parse(localStorage.getItem('entityId'));
  } catch (error) {
    console.error('Error parsing entityId from localStorage:', error);
    return null;
  }
};

/**
 * Retrieve ROLE from localStorage
 * @returns {Array|null} ROLE
 */
export const getUserRole = () => {
  try {
    const userDetails = JSON.parse(localStorage.getItem('userDetails'));
    return userDetails?.ROLE ?? [];
  } catch (error) {
    console.error('Error parsing userDetails from localStorage:', error);
    return [];
  }
};

/**
* Retrieve entityType from localStorage

 * @returns {string|null} entityType

 */

export const getEntityType = () => {
  try {
    const userDetails = JSON.parse(localStorage.getItem('userDetails'));

    return userDetails ? userDetails.entityType : null;
  } catch (error) {
    console.error('Error parsing userDetails from localStorage:', error);

    return null;
  }
};
/**
 * Retrieve userId from localStorage
 * @returns {number|null} userId
 */
export const getUserId = () => {
  try {
    const userDetails = JSON.parse(localStorage.getItem('userDetails'));
    return userDetails ? userDetails.userId : null;
  } catch (error) {
    console.error('Error parsing userDetails from localStorage:', error);
    return null;
  }
};

export const getUserName = () => {
  try {
    const userDetails = JSON.parse(localStorage.getItem('userDetails'));
    return userDetails ? userDetails.name : null;
  } catch (error) {
    console.error('Error parsing userDetails from localStorage:', error);
    return null;
  }
};

export const getUserEmail = () => {
  try {
    const userDetails = JSON.parse(localStorage.getItem('userDetails'));
    return userDetails ? userDetails.sub : null;
  } catch (error) {
    console.error('Error parsing userDetails from localStorage:', error);
    return null;
  }
};

export const getCompanyName = () => {
  try {
    return localStorage.getItem('companyName') || null;
  } catch (error) {
    console.error('Error getting companyName from localStorage:', error);
    return null;
  }
};

export const setCompanyName = (name) => {
  try {
    localStorage.setItem('companyName', name);
  } catch (error) {
    console.error('Error setting companyName in localStorage:', error);
  }
};

export const pageSize = 10;

export const formatDate = (
  date,
  locale = 'en-US',
  options = { year: 'numeric', month: '2-digit', day: '2-digit' },
) => {
  if (!date) return 'N/A';
  try {
    const formattedDate = new Date(date).toLocaleDateString(locale, options);
    return formattedDate;
  } catch (error) {
    console.error('Invalid date passed to formatDate:', date);
    return 'Invalid Date';
  }
};

export const formatCurrency = (amount, currencyCode) => {
  const currencySymbols = {
    USD: '$',
    INR: '₹',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
  };

  if (!currencyCode) {
    return `${amount}`;
  }

  const symbol = currencySymbols[currencyCode] || currencyCode;
  return `${symbol}${amount}`;
};

/**
 * Formats status text by replacing underscores with spaces and capitalizing words.
 * @param {string} status - The status text to format.
 * @returns {string} - Formatted status text.
 */
export const formatStatusText = (status) => {
  if (!status) return '';

  return status
    .toLowerCase()
    .replace(/_/g, ' ') // Replace underscores with spaces
    .replace(/\b\w/g, (char) => char.toUpperCase()); // Capitalize first letter of each word
};

export const getExtensionFromContentType = (contentType) => {
  if (contentType.includes('pdf')) return 'pdf';
  if (contentType.includes('xlsx')) return 'xlsx';
  if (contentType.includes('msword') || contentType.includes('docx')) return 'docx';
  if (contentType.includes('csv')) return 'csv';
  if (contentType.includes('zip')) return 'zip';
  if (contentType.includes('image/jpeg')) return 'jpg';
  if (contentType.includes('image/png')) return 'png';
  if (contentType.includes('image/gif')) return 'gif';
  if (contentType.includes('image/bmp')) return 'bmp';
  if (contentType.includes('image/webp')) return 'webp';
  if (contentType.includes('image/svg+xml')) return 'svg';

  return 'bin';
};

export const parseQueryString = (queryString) => {
  if (!queryString.includes('Z/')) return null;

  const [beforeZ, afterZ] = queryString.split('Z/');
  const timestamp = `${beforeZ}Z`.trim();

  if (!afterZ?.includes(':')) return null;

  const [username, queryTextRaw] = afterZ.split(':');
  const queryText = queryTextRaw?.replace(/^"|"$/g, '').split('[')[0].trim();

  const [, fileId] = afterZ.match(/\[FileId:\s*(\d+)\]/) || [];

  return {
    timestamp,
    userName: username?.trim(),
    queryText,
    fileId,
  };
};

export const parseQueries = (rawQueryString = '') =>
  rawQueryString.split('||').map(parseQueryString).filter(Boolean);

export const parseEmails = (emailString) => {
  if (!emailString || emailString.trim() === '') return [];
  return emailString
    .split(/[,;]/)
    .map((email) => email.trim())
    .filter((email) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return email.length > 0 && (emailRegex.test(email) || email.startsWith('$'));
    });
};

export const formatDateTime = (isoString) => {
  const date = new Date(isoString);
  return format(date, 'd MMM yyyy, h:mm a');
};

export function formatCurrencies(amount, currency = 'USD', locale = 'en-US') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

