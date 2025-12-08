import { jwtDecode } from 'jwt-decode';

// Conditionally import jsonwebtoken only on server-side
let jwt: any = null;
if (typeof window === 'undefined') {
  // Server-side only
  jwt = require('jsonwebtoken');
}

const JWT_SECRET: string = process.env.JWT_SECRET ?? 'adriano-dental-clinic';
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN ?? '1d';

// Note: This should only be used by the API server, not frontend
//console.log('Frontend auth package loaded (should not generate tokens):', { JWT_SECRET: JWT_SECRET.slice(0, 10) + '...', JWT_EXPIRES_IN });

export function generateToken(payload: object): string {
  if (!jwt) {
    throw new Error('Token generation is only available on the server-side');
  }
  console.warn('WARNING: Token generation should only happen on the API server, not frontend!');
  console.log('Frontend: Generating token with expiresIn:', JWT_EXPIRES_IN);
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as any);
  console.log('Frontend: Token generated successfully');
  
  // Debug: decode the token to check its expiration
  const decoded = jwtDecode(token) as any;
  if (decoded && decoded.exp) {
    const expirationTime = new Date(decoded.exp * 1000);
    console.log('Frontend: Token will expire at:', expirationTime.toISOString());
  }
  
  return token;
}

export function verifyToken(token: string): object | null {
  if (!jwt) {
    throw new Error('Token verification is only available on the server-side');
  }
  try {
    return jwt.verify(token, JWT_SECRET) as object;
  } catch (error) {
    console.error('Invalid token:', error);
    return null;
  }
}

export function decodeToken(token: string): object | null {
  try {
    return jwtDecode(token) as object;
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
}
