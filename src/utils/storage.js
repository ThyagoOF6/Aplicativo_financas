/**
 * Utility for local storage operations.
 * Acts as the base layer for persistence.
 */

export const getStorageItem = (key, initialValue) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : initialValue;
  } catch (error) {
    console.error(`Error reading key ${key} from storage:`, error);
    return initialValue;
  }
};

export const setStorageItem = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing key ${key} to storage:`, error);
  }
};

export const getRawStorageItem = (key) => {
  return localStorage.getItem(key);
};

export const setRawStorageItem = (key, value) => {
  localStorage.setItem(key, value);
};
