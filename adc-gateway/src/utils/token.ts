import * as jwt from 'jsonwebtoken';

const JWT_SECRET: string = process.env.JWT_SECRET ?? 'adriano-dental-clinic-graphql-secret';
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN ?? '1d';

console.log('GraphQL Gateway token service loaded with:', { 
  JWT_SECRET: JWT_SECRET.slice(0, 10) + '...', 
  JWT_EXPIRES_IN 
});

export interface TokenPayload {
  userId: string | number;
  username: string;
  role: string;
  email?: string;
}

export function generateToken(payload: TokenPayload): string {
  console.log('GraphQL Gateway: Generating token with expiresIn:', JWT_EXPIRES_IN);
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
  console.log('GraphQL Gateway: Token generated successfully');
  
  // Debug: decode the token to check its expiration
  const decoded = jwt.decode(token) as any;
  if (decoded && decoded.exp) {
    const expirationTime = new Date(decoded.exp * 1000);
    const currentTime = new Date();
    console.log('GraphQL Gateway: Token will expire at:', expirationTime.toISOString());
    console.log('GraphQL Gateway: Current time is:', currentTime.toISOString());
    console.log('GraphQL Gateway: Token expires in:', Math.round((decoded.exp * 1000 - Date.now()) / 1000), 'seconds');
  }
  
  return token;
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch (error) {
    console.error('Invalid token:', error);
    return null;
  }
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    return jwt.decode(token) as TokenPayload;
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
}
