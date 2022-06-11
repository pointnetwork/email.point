const { crypto } = window;

const MIN_LENGTH = 16;
const ALGORITHM = 'AES-GCM';

export function generateRandomBytes(length: number): Uint8Array {
  if (length < MIN_LENGTH) {
    throw `length should be bigger than ${MIN_LENGTH}`;
  }
  return crypto.getRandomValues(new Uint8Array(length));
}

export function getCryptoKeyFromRawKey(rawKey: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', rawKey, { name: ALGORITHM }, true, ['encrypt', 'decrypt']);
}

export async function encrypt(
  password: string,
  // iv: Uint8Array,
  data: Uint8Array
): Promise<string> {
  // get a random iv for this file
  const pwUtf8 = new TextEncoder().encode(password);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ivStr = Array.from(iv)
    .map((b) => String.fromCharCode(b))
    .join('');

  const algorithm = {
    name: ALGORITHM,
    iv,
  };

  // get cryptokey from password
  const pwHash = await crypto.subtle.digest('SHA-256', pwUtf8);
  const key = await crypto.subtle.importKey('raw', pwHash, algorithm, false, ['encrypt']);

  // encrypt
  const ctBuffer = await crypto.subtle.encrypt(algorithm, key, data);
  const ctArray = Array.from(new Uint8Array(ctBuffer));
  const ctStr = ctArray.map((byte) => String.fromCharCode(byte)).join('');

  return btoa(ivStr + ctStr);
}

export async function decrypt(password: string, data: string): Promise<Uint8Array> {
  const pwUtf8 = new TextEncoder().encode(password);
  const pwHash = await crypto.subtle.digest('SHA-256', pwUtf8);

  // extract iv from data
  const ivStr = atob(data).slice(0, 12);
  const iv = new Uint8Array(Array.from(ivStr).map((ch) => ch.charCodeAt(0)));

  const algorithm = {
    name: ALGORITHM,
    iv,
  };

  // get key from password
  const key = await crypto.subtle.importKey('raw', pwHash, algorithm, false, ['decrypt']);

  // extract encrypted data
  const ctStr = atob(data).slice(12);
  const ctUint8 = new Uint8Array(Array.from(ctStr).map((ch) => ch.charCodeAt(0)));

  const plainBuffer = await crypto.subtle.decrypt(algorithm, key, ctUint8);
  return new Uint8Array(plainBuffer); // TextDecoder().decode(plainBuffer);
}

export async function getRandomEncryptionKey() {
  const randomArray = crypto.getRandomValues(new Uint32Array(16));
  const pwUtf8 = new TextEncoder().encode(randomArray.join());
  const pwHash = await crypto.subtle.digest('SHA-256', pwUtf8);
  const hashArray = Array.from(new Uint8Array(pwHash));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}
