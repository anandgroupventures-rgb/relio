// Input sanitization utilities to prevent XSS and injection attacks

const DANGEROUS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /<[^>]+>/g,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /data:\s*text\/html/gi,
];

/**
 * Sanitizes user input by removing HTML tags and dangerous patterns
 * @param {string} input - Raw user input
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Sanitized string
 */
export function sanitizeInput(input, maxLength = 500) {
  if (!input || typeof input !== "string") return "";
  
  let sanitized = input;
  
  // Remove dangerous patterns
  DANGEROUS_PATTERNS.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, "");
  });
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
}

/**
 * Sanitizes lead data object
 * @param {Object} data - Lead data object
 * @returns {Object} Sanitized lead data
 */
export function sanitizeLeadData(data) {
  const maxLengths = {
    name: 100,
    mobile: 20,
    email: 100,
    projectInterest: 200,
    budget: 50,
    source: 50,
    referredBy: 100,
    remarks: 1000,
    bhk: 20,
    type: 20,
  };

  const sanitized = {};
  
  Object.keys(data).forEach((key) => {
    if (typeof data[key] === "string") {
      sanitized[key] = sanitizeInput(data[key], maxLengths[key] || 500);
    } else {
      sanitized[key] = data[key];
    }
  });
  
  return sanitized;
}

/**
 * Validates email format
 * @param {string} email 
 * @returns {boolean}
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates mobile number (Indian format)
 * @param {string} mobile 
 * @returns {boolean}
 */
export function isValidMobile(mobile) {
  const clean = mobile.replace(/\D/g, "");
  return clean.length >= 10 && clean.length <= 12;
}

/**
 * Cleans mobile number to digits only
 * @param {string} mobile 
 * @returns {string}
 */
export function cleanMobile(mobile) {
  return mobile.replace(/\D/g, "").slice(0, 12);
}
