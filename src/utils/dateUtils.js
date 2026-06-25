/**
 * Utility functions for calendar and date grids.
 */

/**
 * Gets the number of days in a month (1-indexed month, e.g. 1 = Jan, 12 = Dec).
 */
export const getDaysInMonth = (year, month) => {
  return new Date(year, month, 0).getDate();
};

/**
 * Gets the weekday index of the first day of the month (0 = Sunday, 6 = Saturday).
 * Note: month is 0-indexed here (0 = Jan, 11 = Dec).
 */
export const getFirstDayOfMonth = (year, month) => {
  return new Date(year, month, 1).getDay();
};

/**
 * Generates an array of cells representing a 7x5 or 7x6 calendar grid for a given month/year.
 * @param {number} year 
 * @param {number} month (0-indexed, e.g. 5 = June)
 * @returns {Array<{ day: number|null, dateString: string|null, isCurrentMonth: boolean }>}
 */
export const generateCalendarGrid = (year, month) => {
  const firstDayIndex = getFirstDayOfMonth(year, month);
  const totalDays = getDaysInMonth(year, month + 1);
  
  const cells = [];
  
  // 1. Add pre-padding empty cells
  for (let i = 0; i < firstDayIndex; i++) {
    cells.push({ day: null, dateString: null, isCurrentMonth: false });
  }
  
  // 2. Add current month cells
  for (let day = 1; day <= totalDays; day++) {
    // Format YYYY-MM-DD
    const padMonth = String(month + 1).padStart(2, '0');
    const padDay = String(day).padStart(2, '0');
    const dateString = `${year}-${padMonth}-${padDay}`;
    
    cells.push({
      day,
      dateString,
      isCurrentMonth: true
    });
  }
  
  // 3. Add post-padding empty cells to complete the last week (grid should be multiple of 7)
  const remaining = cells.length % 7;
  if (remaining !== 0) {
    const postPadding = 7 - remaining;
    for (let i = 0; i < postPadding; i++) {
      cells.push({ day: null, dateString: null, isCurrentMonth: false });
    }
  }
  
  return cells;
};

/**
 * Localized month names.
 */
export const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];
