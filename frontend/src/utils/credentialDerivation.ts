import { Ed25519KeyIdentity } from '@dfinity/identity';

/**
 * Derives a deterministic Ed25519KeyIdentity from a username and password.
 * This allows username/password users to cryptographically sign canister calls.
 */
export async function deriveIdentity(username: string, password: string): Promise<Ed25519KeyIdentity> {
    const encoder = new TextEncoder();
    // Normalize username to lowercase and trim spaces to ensure robustness
    const cleanUsername = username.toLowerCase().trim();
    const data = encoder.encode(`${cleanUsername}:${password}`);
    
    // Hash using SHA-256 to get a deterministic 32-byte digest
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const secretKey = new Uint8Array(hashBuffer);
    
    return Ed25519KeyIdentity.fromSecretKey(secretKey);
}

/**
 * Converts a Uint8Array to a hex string.
 */
export function bufToHex(buffer: Uint8Array): string {
    return Array.from(buffer)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Converts a hex string back to a Uint8Array.
 */
export function hexToBuf(hex: string): Uint8Array {
    const matches = hex.match(/.{1,2}/g);
    if (!matches) return new Uint8Array(0);
    return new Uint8Array(matches.map((byte) => parseInt(byte, 16)));
}
