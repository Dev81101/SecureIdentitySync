// This file handles cryptographic operations for the authentication flow

/**
 * Signs a challenge using the private key
 * @param challenge - The challenge to sign
 * @param privateKeyPem - The private key in PEM format
 * @returns Promise resolving to the base64-encoded signature
 */
export async function signChallenge(challenge: string, privateKeyPem: string): Promise<string> {
  try {
    // Import the private key
    const privateKey = await window.crypto.subtle.importKey(
      'pkcs8',
      pemToArrayBuffer(privateKeyPem),
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: { name: 'SHA-256' },
      },
      false,
      ['sign']
    );

    // Convert the challenge to an ArrayBuffer
    const encoder = new TextEncoder();
    const data = encoder.encode(challenge);

    // Sign the challenge
    const signature = await window.crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      privateKey,
      data
    );

    // Convert the signature to a base64 string
    return arrayBufferToBase64(signature);
  } catch (error) {
    console.error('Error signing challenge:', error);
    throw new Error('Failed to sign challenge');
  }
}

/**
 * Converts a PEM-formatted key to an ArrayBuffer
 * @param pem - The PEM-formatted key
 * @returns ArrayBuffer representation of the key
 */
function pemToArrayBuffer(pem: string): ArrayBuffer {
  // Remove header, footer, and newlines
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '');

  // Decode base64 to binary string
  const binaryString = window.atob(base64);
  
  // Convert binary string to ArrayBuffer
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return bytes.buffer;
}

/**
 * Converts an ArrayBuffer to a base64 string
 * @param buffer - The ArrayBuffer to convert
 * @returns Base64 string representation
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(buffer));
  return window.btoa(binary);
}

/**
 * Stores the authentication challenge in session storage
 * @param challenge - The challenge to store
 */
export function storeChallenge(challenge: string): void {
  sessionStorage.setItem('auth_challenge', challenge);
}

/**
 * Retrieves the authentication challenge from session storage
 * @returns The stored challenge or null if not found
 */
export function getChallenge(): string | null {
  return sessionStorage.getItem('auth_challenge');
}

/**
 * Stores the private key in local storage
 * Note: In a production app, consider more secure storage options
 * @param privateKey - The private key to store
 */
export function storePrivateKey(privateKey: string): void {
  localStorage.setItem('auth_private_key', privateKey);
}

/**
 * Retrieves the private key from local storage
 * @returns The stored private key or null if not found
 */
export function getPrivateKey(): string | null {
  return localStorage.getItem('auth_private_key');
}

/**
 * Clears all authentication data from storage
 */
export function clearAuthData(): void {
  sessionStorage.removeItem('auth_challenge');
  sessionStorage.removeItem('auth_email');
  // Consider if you want to remove the private key on logout
  // localStorage.removeItem('auth_private_key');
}
