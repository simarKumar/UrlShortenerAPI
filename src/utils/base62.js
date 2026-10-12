const CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const BASE = CHARS.length;

/**
 * Encodes an integer ID into a Base62 string.
 * @param {number} num 
 * @returns {string}
 */
function encode(num) {
  if (num === 0) return CHARS[0];

  let result = '';
  while (num > 0) {
    const remainder = num % BASE;
    result = CHARS[remainder] + result;
    num = Math.floor(num / BASE);
  }

  return result;
}

/**
 * Decodes a Base62 string back to an integer ID.
 * @param {string} str 
 * @returns {number}
 */
function decode(str) {
  let num = 0;
  for (const char of str) {
    num = num * BASE + CHARS.indexOf(char);
  }
  return num;
}

module.exports = { encode, decode };
