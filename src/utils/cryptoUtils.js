/**
 * Utility functions for local database encryption using browser Web Crypto API (AES-GCM 256 bits).
 */

// Helper to convert ArrayBuffer to Base64
export function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper to convert Base64 to ArrayBuffer
export function base64ToArrayBuffer(base64) {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Derives a CryptoKey using PBKDF2 (SHA-256) from password and salt.
 * @param {string} password 
 * @param {ArrayBuffer} saltBuffer 
 * @returns {Promise<CryptoKey>} Derived key
 */
export async function deriveKey(password, saltBuffer) {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  
  const baseKey = await crypto.subtle.importKey(
    "raw",
    passwordBuffer,
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  
  return await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBuffer,
      iterations: 100000,
      hash: "SHA-256"
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts a plaintext string with a CryptoKey using AES-GCM.
 * @param {string} plaintext 
 * @param {CryptoKey} cryptoKey 
 * @returns {Promise<string>} JSON string containing base64 iv and ciphertext (ct)
 */
export async function encryptData(plaintext, cryptoKey) {
  if (!cryptoKey) throw new Error("Key is required for encryption");
  
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(plaintext);
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    cryptoKey,
    dataBuffer
  );
  
  const ivBase64 = arrayBufferToBase64(iv);
  const ciphertextBase64 = arrayBufferToBase64(ciphertextBuffer);
  
  return JSON.stringify({ iv: ivBase64, ct: ciphertextBase64 });
}

/**
 * Decrypts a ciphertext JSON with a CryptoKey.
 * @param {string} encryptedJson 
 * @param {CryptoKey} cryptoKey 
 * @returns {Promise<string>} Plaintext string
 */
export async function decryptData(encryptedJson, cryptoKey) {
  if (!cryptoKey) throw new Error("Key is required for decryption");
  
  const { iv, ct } = JSON.parse(encryptedJson);
  const ivBuffer = base64ToArrayBuffer(iv);
  const ciphertextBuffer = base64ToArrayBuffer(ct);
  
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBuffer },
    cryptoKey,
    ciphertextBuffer
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

/**
 * Initializes security on first boot by setting a salt and an encrypted validation token.
 * @param {string} password 
 * @returns {Promise<{ saltBase64: string, verificationJson: string, cryptoKey: CryptoKey }>}
 */
export async function initializeSecurity(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cryptoKey = await deriveKey(password, salt);
  
  // Create verification payload
  const token = "session_verified";
  const verificationJson = await encryptData(token, cryptoKey);
  const saltBase64 = arrayBufferToBase64(salt);
  
  return {
    saltBase64,
    verificationJson,
    cryptoKey
  };
}

/**
 * Validates a password against stored credentials.
 * @param {string} password 
 * @param {string} saltBase64 
 * @param {string} verificationJson 
 * @returns {Promise<CryptoKey|null>} derived key if correct, null if incorrect
 */
export async function validatePassword(password, saltBase64, verificationJson) {
  try {
    const saltBuffer = base64ToArrayBuffer(saltBase64);
    const cryptoKey = await deriveKey(password, saltBuffer);
    
    const decrypted = await decryptData(verificationJson, cryptoKey);
    if (decrypted === "session_verified") {
      return cryptoKey;
    }
  } catch (error) {
    console.warn("Invalid password validation attempt:", error);
  }
  return null;
}

/**
 * Derives the authentication key (authKey) from the password.
 * Uses PBKDF2 with a salt derived (XOR 0x5A) from the master salt.
 * @param {string} password 
 * @param {string} saltBase64 
 * @returns {Promise<ArrayBuffer>} Derived key as raw ArrayBuffer
 */
export async function deriveAuthKey(password, saltBase64) {
  const saltBuffer = base64ToArrayBuffer(saltBase64);
  const view = new Uint8Array(saltBuffer);
  const authSalt = new Uint8Array(view.length);
  for (let i = 0; i < view.length; i++) {
    authSalt[i] = view[i] ^ 0x5A;
  }
  
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  
  const baseKey = await crypto.subtle.importKey(
    "raw",
    passwordBuffer,
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: authSalt.buffer,
      iterations: 100000,
      hash: "SHA-256"
    },
    baseKey,
    { name: "HMAC", hash: "SHA-256", length: 256 },
    true,
    ["sign"]
  );
  
  return await crypto.subtle.exportKey("raw", derivedKey);
}

/**
 * Computes the SHA-256 hash of the authKey to send to the server as the login token.
 * @param {ArrayBuffer} authKeyBuffer 
 * @returns {Promise<string>} Hex string of SHA-256 hash
 */
export async function hashAuthKey(authKeyBuffer) {
  const hashBuffer = await crypto.subtle.digest("SHA-256", authKeyBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
