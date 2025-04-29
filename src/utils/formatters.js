/**
 * @fileoverview Utility functions for formatting data.
 */

/**
 * Converts a number to its ordinal representation (e.g., 1 -> 1st, 2 -> 2nd).
 * @param {number} n The number to convert.
 * @returns {{ number: number, suffix: string }} An object containing the original number and its ordinal suffix.
 */
export function getOrdinal(n) {
    if (typeof n !== 'number' || n < 1) return { number: n, suffix: '' };
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    const suffix = s[(v - 20) % 10] || s[v] || s[0];
    return { number: n, suffix: suffix };
} 