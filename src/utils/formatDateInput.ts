/**
 * Formats a raw date input string into DD/MM/YYYY, inserting slashes
 * automatically while the user types.
 */
export const formatDateInput = (value: string, previousValue: string): string => {
  const digits = value.replace(/\D/g, '');
  const limitedDigits = digits.slice(0, 8);
  const isDeleting = value.length < previousValue.length;

  if (limitedDigits.length >= 4) {
    return `${limitedDigits.slice(0, 2)}/${limitedDigits.slice(2, 4)}/${limitedDigits.slice(4)}`;
  }

  if (limitedDigits.length >= 2 && !isDeleting) {
    return `${limitedDigits.slice(0, 2)}/${limitedDigits.slice(2)}`;
  }

  return limitedDigits;
};
