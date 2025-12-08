import express from 'express';
import bcrypt from 'bcryptjs';
import { generateToken, verifyToken } from '../utils/token';
import { pool } from '../config/database';
import { logger } from '../utils/logger';
import { createError } from '../middleware/errorHandler';

const router = express.Router();

// Types
interface LoginRequest {
  username: string;
  password: string;
}

interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  roles: string[];
  full_name: string;
}

interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
}


router.post('/login', async (req, res, next) => {
  try {
    const { username, password }: LoginRequest = req.body;

    if (!username || !password) {
      throw createError('Username and password are required', 400);
    }

    const result = await pool.query('SELECT * FROM sf_portal_login_user($1);', [
          username,
        ]);

    if (result.rows.length === 0) {
      throw createError('Invalid credentials', 401);
    }
    console.log('Login query result:', result.rows);
    const user = result.rows[0];

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      throw createError('Invalid credentials', 401);
    }

    const payload = {
      userId: user.id,
      username: user.username,
      role: user.role_level,
    };

    console.log('Gateway: Generating token for user:', username);
    const token = generateToken(payload);
    console.log('Gateway: Token generated, sending to client');

    // Log successful login
    logger.info(`User logged in via Gateway: ${username}`);

    const response: ApiResponse = {
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          role: payload.role,
        }
      }
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});


// Login
router.post('/login-old', async (req, res, next) => {
  try {
    const { username, password }: LoginRequest = req.body;

    if (!username || !password) {
      throw createError('Username and password are required', 400);
    }

    const result = await pool.query(
      `SELECT
         u.user_id as id,
         u.username,
         u.password_hash,
         u.role
       FROM
         users u
       WHERE
         u.username = $1`,
      [username]
    );

    console.log('Login-old query result:', result.rows);
    if (result.rows.length === 0) {
      throw createError('Invalid credentials', 401);
    }

    const user = result.rows[0];

    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      throw createError('Invalid credentials', 401);
    }

    const payload = {
      userId: user.id,
      username: user.username,
      role: user.role,
    };

    console.log('Gateway: Generating token for user:', username);
    const token = generateToken(payload);
    console.log('Gateway: Token generated, sending to client');

    // Log successful login
    logger.info(`User logged in via Gateway: ${username}`);

    const response: ApiResponse = {
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          role: payload.role,
        }
      }
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Register (Admin only)
router.post('/register', async (req, res, next) => {
  try {
    // Note: In a real app, you'd want middleware to ensure only admins can register new users.
    const { username, email, password, roles, full_name }: CreateUserRequest = req.body;

    if (!username || !email || !password || !roles || !full_name) {
      throw createError('All fields are required', 400);
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT * FROM auth.users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      throw createError('User already exists', 409);
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userResult = await client.query(
        `INSERT INTO auth.users (username, email, password_hash, full_name, is_active) 
         VALUES ($1, $2, $3, $4, true) 
         RETURNING id, username, email, full_name, created_at`,
        [username, email, hashedPassword, full_name]
      );

      const newUser = userResult.rows[0];

      // Get role IDs
      const rolesResult = await client.query(
        'SELECT id FROM auth.roles WHERE name = ANY($1::text[])',
        [roles]
      );
      const roleIds = rolesResult.rows.map(row => row.id);

      if (roleIds.length !== roles.length) {
        throw createError('One or more roles are invalid', 400);
      }

      // Insert into user_roles
      const userRolesValues = roleIds.map(roleId => `(${newUser.id}, ${roleId})`).join(',');
      await client.query(`INSERT INTO auth.user_roles (user_id, role_id) VALUES ${userRolesValues}`);

      await client.query('COMMIT');

      logger.info(`New user created via Gateway: ${username}`);

      const response: ApiResponse = {
        success: true,
        message: 'User created successfully',
        data: { ...newUser, roles },
      };

      res.status(201).json(response);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

// Verify token
router.get('/verify', async (req, res, next) => {
  try {
    const authHeader = req.get('authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
      throw createError('No token provided', 401);
    }

    const decoded = verifyToken(token) as any;
    
    const result = await pool.query(
      `SELECT
         u.user_id as id,
         u.username,
         u.email,
         u.full_name,
         u.is_active,
         u.role
       FROM
         users u
       WHERE
         u.user_id = $1`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      throw createError('User not found', 404);
    }

    const user = result.rows[0];

    if (!user.is_active) {
      throw createError('User account is not active', 403);
    }

    const response: ApiResponse = {
      success: true,
      message: 'Token is valid',
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        roles: [user.role], // Return role as array for consistency
      },
    };

    res.json(response);
  } catch (error) {
    if (error instanceof Error && (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError')) {
      return next(createError(`Invalid token: ${error.message}`, 401));
    }
    next(error);
  }
});

export default router;
