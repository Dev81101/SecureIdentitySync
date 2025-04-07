/**
 * Utility functions for SQL Server database operations
 */

/**
 * Parses a JSON string from the database or returns null if not valid
 * @param jsonString The JSON string to parse
 * @returns The parsed object or null
 */
export function parseJsonFromDb<T>(jsonString: string | null | undefined): T | null {
  if (!jsonString) {
    return null;
  }
  
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error('Error parsing JSON from database:', error);
    return null;
  }
}

/**
 * Converts an array to a JSON string for storing in the database
 * @param array The array to convert
 * @returns A JSON string representation
 */
export function arrayToJsonString<T>(array: T[] | null | undefined): string | null {
  if (!array) {
    return null;
  }
  
  try {
    return JSON.stringify(array);
  } catch (error) {
    console.error('Error converting array to JSON string:', error);
    return null;
  }
}