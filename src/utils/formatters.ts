/**
 * Format a number as currency (EUR)
 * @param value - The number to format
 * @param locale - The locale to use for formatting, defaults to 'nl-NL'
 * @param currency - The currency to use, defaults to 'EUR'
 * @returns Formatted currency string
 */
export const formatCurrency = (
  value: number, 
  locale = 'nl-NL', 
  currency = 'EUR'
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Format a date according to the specified period type
 * @param dateString - The date string to format
 * @param periodType - The period type (daily, monthly, quarterly, yearly)
 * @returns Formatted date string
 */
export const formatDate = (
  dateString: string,
  periodType: 'daily' | 'monthly' | 'quarterly' | 'yearly'
): string => {
  const date = new Date(dateString);
  
  switch (periodType) {
    case 'daily':
      return new Intl.DateTimeFormat('nl-NL', { 
        day: '2-digit',
        month: 'short' 
      }).format(date);
    
    case 'monthly':
      return new Intl.DateTimeFormat('nl-NL', { 
        month: 'short',
        year: 'numeric'
      }).format(date);
    
    case 'quarterly': {
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      return `Q${quarter} ${date.getFullYear()}`;
    }
    
    case 'yearly':
      return date.getFullYear().toString();
    
    default:
      return dateString;
  }
};

/**
 * Format a percentage value
 * @param value - The decimal value (0-1) to format as percentage
 * @returns Formatted percentage string
 */
export const formatPercentage = (value: number): string => {
  return new Intl.NumberFormat('nl-NL', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
};
