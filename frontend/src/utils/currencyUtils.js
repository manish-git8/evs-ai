/**
 * Currency formatting utilities for consistent currency display across the application.
 */

// Map of currency codes to their symbols
const CURRENCY_SYMBOLS = {
  INR: '\u20B9', // ₹
  USD: '$',
  EUR: '\u20AC', // €
  GBP: '\u00A3', // £
  JPY: '\u00A5', // ¥
  CNY: '\u00A5', // ¥
  AUD: 'A$',
  CAD: 'C$',
  CHF: 'CHF',
  SGD: 'S$',
  AED: 'AED',
  SAR: 'SAR',
};

// Map of currency codes to their locales for formatting
const CURRENCY_LOCALES = {
  INR: 'en-IN',
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
  JPY: 'ja-JP',
  CNY: 'zh-CN',
  AUD: 'en-AU',
  CAD: 'en-CA',
  CHF: 'de-CH',
  SGD: 'en-SG',
  AED: 'ar-AE',
  SAR: 'ar-SA',
};

/**
 * Get currency symbol for a currency code.
 * @param {string} currencyCode - The currency code (e.g., 'INR', 'USD')
 * @returns {string} The currency symbol
 */
export const getCurrencySymbol = (currencyCode) => {
  if (!currencyCode) return CURRENCY_SYMBOLS.INR;
  const code = currencyCode.toUpperCase().trim();
  return CURRENCY_SYMBOLS[code] || code;
};

/**
 * Format an amount with currency symbol.
 * @param {number|string} amount - The amount to format
 * @param {string} currencyCode - The currency code (e.g., 'INR', 'USD')
 * @param {object} options - Formatting options
 * @param {boolean} options.showSymbol - Whether to show currency symbol (default: true)
 * @param {number} options.decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted amount string
 */
export const formatCurrency = (amount, currencyCode = 'INR', options = {}) => {
  const { showSymbol = true, decimals = 2 } = options;

  // Handle null/undefined/NaN
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    const symbol = showSymbol ? getCurrencySymbol(currencyCode) : '';
    return `${symbol}0.00`;
  }

  const numericAmount = Number(amount);
  const code = currencyCode?.toUpperCase()?.trim() || 'INR';
  const locale = CURRENCY_LOCALES[code] || 'en-IN';

  try {
    const formatter = new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

    const formattedNumber = formatter.format(numericAmount);

    if (showSymbol) {
      const symbol = getCurrencySymbol(code);
      return `${symbol}${formattedNumber}`;
    }

    return formattedNumber;
  } catch (error) {
    console.warn('Error formatting currency:', error);
    const symbol = showSymbol ? getCurrencySymbol(code) : '';
    return `${symbol}${numericAmount.toFixed(decimals)}`;
  }
};

/**
 * Format amount for display with proper locale-based formatting.
 * Uses the company's currency from localStorage or defaults to INR.
 * @param {number|string} amount - The amount to format
 * @param {string} overrideCurrency - Optional currency to override the company's default
 * @returns {string} Formatted amount string
 */
export const formatCompanyAmount = (amount, overrideCurrency = null) => {
  let currencyCode = overrideCurrency;

  if (!currencyCode) {
    // Try to get currency from company details in localStorage
    try {
      const userDetails = JSON.parse(localStorage.getItem('userDetails'));
      currencyCode = userDetails?.companyCurrency || 'INR';
    } catch {
      currencyCode = 'INR';
    }
  }

  return formatCurrency(amount, currencyCode);
};

/**
 * Format amount without symbol (useful for input fields).
 * @param {number|string} amount - The amount to format
 * @param {string} currencyCode - The currency code
 * @returns {string} Formatted number string without symbol
 */
export const formatAmountOnly = (amount, currencyCode = 'INR') => {
  return formatCurrency(amount, currencyCode, { showSymbol: false });
};

/**
 * Parse a formatted currency string back to a number.
 * @param {string} formattedAmount - The formatted amount string
 * @returns {number} The numeric value
 */
export const parseCurrencyString = (formattedAmount) => {
  if (!formattedAmount) return 0;

  // Remove all non-numeric characters except decimal point and minus sign
  const cleaned = String(formattedAmount)
    .replace(/[^\d.-]/g, '')
    .replace(/(?!^)-/g, ''); // Keep only leading minus sign

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Get currency display name for dropdown/select options.
 * @param {string} currencyCode - The currency code
 * @returns {string} Display name like "INR (₹)" or "USD ($)"
 */
export const getCurrencyDisplayName = (currencyCode) => {
  if (!currencyCode) return 'INR (\u20B9)';
  const code = currencyCode.toUpperCase().trim();
  const symbol = getCurrencySymbol(code);
  return `${code} (${symbol})`;
};

/**
 * Get user type from localStorage.
 * @returns {string} 'company' or 'supplier'
 */
export const getUserType = () => {
  try {
    const userDetails = JSON.parse(localStorage.getItem('userDetails') || '{}');
    return userDetails?.entityType?.toLowerCase() === 'supplier' ? 'supplier' : 'company';
  } catch {
    return 'company';
  }
};

/**
 * Build price data object from item for dual currency display.
 * @param {object} item - Cart/PO item with currency fields
 * @returns {object} Price data object
 */
export const buildPriceData = (item) => ({
  originalPrice: item.originalPrice || item.price,
  originalCurrency: item.originalCurrencyCode || item.currencyCode,
  convertedPrice: item.convertedPrice,
  convertedCurrency: item.convertedCurrencyCode,
});

/**
 * Format dual currency display based on user context.
 * Company users see: Company currency (Supplier currency) e.g., "₹83,120 ($1,000.00)"
 * Supplier users see: Supplier currency (Company currency) e.g., "$1,000.00 (₹83,120)"
 *
 * @param {object} priceData - Object with originalPrice, originalCurrency, convertedPrice, convertedCurrency
 * @param {string} userType - 'company' or 'supplier'
 * @returns {string} Formatted dual currency string
 */
export const formatDualCurrency = (priceData, userType = 'company') => {
  const { originalPrice, originalCurrency, convertedPrice, convertedCurrency } = priceData || {};

  // If missing required data, fall back to simple format
  if (originalPrice === undefined && convertedPrice === undefined) {
    return formatCurrency(0);
  }

  // Same currency or no conversion - single display
  if (
    !convertedPrice ||
    !convertedCurrency ||
    originalCurrency === convertedCurrency
  ) {
    return formatCurrency(originalPrice || convertedPrice, originalCurrency || convertedCurrency);
  }

  const originalFmt = formatCurrency(originalPrice, originalCurrency);
  const convertedFmt = formatCurrency(convertedPrice, convertedCurrency);

  // Company user: Company currency first (converted), supplier in brackets (original)
  // Supplier user: Supplier currency first (original), company in brackets (converted)
  return userType === 'company'
    ? `${convertedFmt} (${originalFmt})`
    : `${originalFmt} (${convertedFmt})`;
};

/**
 * Format dual currency for a cart item total (price * qty).
 * @param {object} item - Cart/PO item
 * @param {string} userType - 'company' or 'supplier'
 * @returns {string} Formatted dual currency total
 */
export const formatDualCurrencyItemTotal = (item, userType = 'company') => {
  const qty = item.qty || item.quantity || 1;
  const priceData = {
    originalPrice: (item.originalPrice || item.price) * qty,
    originalCurrency: item.originalCurrencyCode || item.currencyCode,
    convertedPrice: item.convertedPrice ? item.convertedPrice * qty : null,
    convertedCurrency: item.convertedCurrencyCode,
  };
  return formatDualCurrency(priceData, userType);
};

/**
 * Aggregate dual currency totals for multiple items.
 * For single supplier currency: Shows dual format e.g., "₹83,120 ($1,000.00)"
 * For multiple supplier currencies: Shows only company currency total (since summing different currencies is invalid)
 * @param {array} items - Array of cart/PO items
 * @param {string} userType - 'company' or 'supplier'
 * @returns {string} Formatted dual currency total
 */
export const formatDualCurrencyTotal = (items, userType = 'company') => {
  if (!items || items.length === 0) {
    return formatCurrency(0);
  }

  let originalTotal = 0;
  let convertedTotal = 0;
  let originalCurrency = null;
  let convertedCurrency = null;
  let hasConversion = false;
  let hasMultipleOriginalCurrencies = false;
  const seenOriginalCurrencies = new Set();

  items.forEach((item) => {
    const qty = item.qty || item.quantity || 1;
    const price = item.originalPrice || item.price || 0;
    originalTotal += price * qty;

    const itemOriginalCurrency = item.originalCurrencyCode || item.currencyCode;
    if (itemOriginalCurrency) {
      seenOriginalCurrencies.add(itemOriginalCurrency);
      if (seenOriginalCurrencies.size > 1) {
        hasMultipleOriginalCurrencies = true;
      }
    }

    if (!originalCurrency) {
      originalCurrency = itemOriginalCurrency;
    }

    if (item.convertedPrice) {
      hasConversion = true;
      convertedTotal += item.convertedPrice * qty;
      if (!convertedCurrency) {
        convertedCurrency = item.convertedCurrencyCode;
      }
    }
  });

  // If multiple original currencies (multi-supplier scenario), only show converted total
  // since summing different currencies doesn't make sense
  if (hasMultipleOriginalCurrencies && hasConversion && convertedCurrency) {
    return formatCurrency(convertedTotal, convertedCurrency);
  }

  if (!hasConversion || !convertedCurrency || originalCurrency === convertedCurrency) {
    return formatCurrency(originalTotal, originalCurrency);
  }

  return formatDualCurrency(
    {
      originalPrice: originalTotal,
      originalCurrency,
      convertedPrice: convertedTotal,
      convertedCurrency,
    },
    userType
  );
};

/**
 * Convert an amount from one currency to another using the backend API.
 * Uses the centralized apiClient for consistent error handling.
 * @param {number} amount - The amount to convert
 * @param {string} fromCurrency - Source currency code (e.g., 'USD')
 * @param {string} toCurrency - Target currency code (e.g., 'INR')
 * @returns {Promise<object>} Conversion result with convertedAmount, rate, rateDate
 */
export const convertCurrency = async (amount, fromCurrency, toCurrency) => {
  // Same currency - no API call needed
  if (fromCurrency === toCurrency) {
    return {
      originalAmount: amount,
      originalCurrency: fromCurrency,
      convertedAmount: amount,
      convertedCurrency: toCurrency,
      rate: 1,
      rateDate: new Date().toISOString().split('T')[0],
    };
  }

  try {
    // Dynamic import to avoid circular dependency
    const { default: apiClient } = await import('../api/apiClient');
    const response = await apiClient.get(
      `/currency/convert?amount=${amount}&fromCurrency=${fromCurrency}&toCurrency=${toCurrency}`,
      { suppressErrorToast: true }
    );
    return response.data;
  } catch (error) {
    console.error('Currency conversion error:', error);
    // Fallback to 1:1 rate on error
    return {
      originalAmount: amount,
      originalCurrency: fromCurrency,
      convertedAmount: amount,
      convertedCurrency: toCurrency,
      rate: 1,
      rateDate: new Date().toISOString().split('T')[0],
    };
  }
};

/**
 * Get exchange rate between two currencies.
 * Uses the centralized apiClient for consistent error handling.
 * @param {string} fromCurrency - Source currency code
 * @param {string} toCurrency - Target currency code
 * @returns {Promise<number>} Exchange rate
 */
export const getExchangeRate = async (fromCurrency, toCurrency) => {
  // Same currency - no API call needed
  if (fromCurrency === toCurrency) {
    return 1;
  }

  try {
    // Dynamic import to avoid circular dependency
    const { default: apiClient } = await import('../api/apiClient');
    const response = await apiClient.get(
      `/currency/rate?fromCurrency=${fromCurrency}&toCurrency=${toCurrency}`,
      { suppressErrorToast: true }
    );
    return response.data.rate;
  } catch (error) {
    console.error('Exchange rate fetch error:', error);
    return 1; // Fallback to 1:1 rate
  }
};

/**
 * Default export object with all utilities.
 */
const currencyUtils = {
  getCurrencySymbol,
  formatCurrency,
  formatCompanyAmount,
  formatAmountOnly,
  parseCurrencyString,
  getCurrencyDisplayName,
  getUserType,
  buildPriceData,
  formatDualCurrency,
  formatDualCurrencyItemTotal,
  formatDualCurrencyTotal,
  convertCurrency,
  getExchangeRate,
  CURRENCY_SYMBOLS,
  CURRENCY_LOCALES,
};

export default currencyUtils;
