import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import authToken from '../middleware/auth';

// Types for register body
interface RegisterBody {
  firstName: string;
  lastName: string;
  mI: string;
  birthDate: string;
  sex: string;
  job: string;
  daysOnDuty: string;
  address: string;
  email: string;
  contactNo: string;
  role: string;
}

// Types for login body
interface LoginBody {
  un: string;
  pw: string;
}

interface ChangePwBody {
  currentPassword: string;
  newPassword: string;
}

interface ChangeUnBody {
  currentUsername: string;
  newUsername: string;
}

const securityRoutes = (pool: Pool) => {
  const router = express.Router();
  const cache = new Map<string, string>();

// Login route
  router.post(
    '/login',
    async (req: Request<{}, {}, LoginBody>, res: Response) => {
      try {
        const { un, pw } = req.body;
        console.log('Login attempt for user:', un);
        const result = await pool.query('SELECT * FROM sf_login_user($1);', [
          un,
        ]);
        console.log('Login query result:', result.rows);
        if (!result.rows[0]) {
          return res.status(201).send('USER_NOT_EXIST');
        }

        const isMatch = await bcrypt.compare(pw, result.rows[0].password);
        if (!isMatch) {
          return res.status(201).send('INVALID_CREDENTIALS');
        }

        const userRole = result.rows[0].role;

        const token = jwt.sign(
          { un: result.rows[0].username, role: userRole },
          process.env.JWT_SECRET as string,
          { expiresIn: '1h' }
        );

        cache.set('token', token);
        res.status(201).json({ token });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    }
  );

  // Register route
  router.post(
    '/register',
    authToken,
    async (req: Request<{}, {}, RegisterBody>, res: Response) => {
      try {
        const {
          firstName,
          lastName,
          mI,
          birthDate,
          sex,
          job,
          daysOnDuty,
          address,
          email,
          contactNo,
          role,
        } = req.body;

        const hashedPassword = await bcrypt.hash(contactNo, 8);

        const result = await pool.query(
          'SELECT * FROM sf_insert_user($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);',
          [
            firstName,
            lastName,
            mI,
            birthDate,
            sex,
            job,
            daysOnDuty,
            address,
            email,
            contactNo,
            hashedPassword,
            role,
          ]
        );

        const data = result.rows.map((row) => row.sf_insert_user);
        res.status(201).json(data);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    }
  );

  // Token route
  router.post('/token', (req: Request, res: Response) => {
    try {
      const token = cache.get('token');
      res.status(200).json({ token });
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  });

  // Logout route
  router.post(
    '/logout',
    authToken,
    async (req: Request, res: Response) => {
      try {
        const { un } = req.user!;

        cache.delete('token');

        res.status(200).json({
          message: 'LOGOUT_SUCCESS',
          user: un,
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    }
  );

  // Change password route
  router.post(
    '/changepw',
    authToken,
    async (req: Request<{}, {}, ChangePwBody>, res: Response) => {
      try {
        const { currentPassword, newPassword } = req.body;
        const { un } = req.user!;

        if (!currentPassword || !newPassword) {
          return res.status(400).send('Missing required fields');
        }

        const result = await pool.query('SELECT * FROM sf_login_user($1);', [
          un,
        ]);

        if (!result.rows[0]) {
          return res.status(404).send('USER_NOT_FOUND');
        }

        const isMatch = await bcrypt.compare(
          currentPassword,
          result.rows[0].password
        );
        if (!isMatch) {
          return res.status(200).send('INVALID_CURRENT_PASSWORD');
        }

        if (newPassword.length < 6) {
          return res
            .status(200)
            .send('New password must be at least 6 characters long');
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        const changeResult = await pool.query(
          'SELECT * FROM sf_change_pw($1, $2);',
          [un, hashedNewPassword]
        );

        if (changeResult.rows[0]) {
          return res.status(200).send('CHANGED_SUCCESS');
        }
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    }
  );

  // Change username route
  router.post(
    '/changeun',
    authToken,
    async (req: Request<{}, {}, ChangeUnBody>, res: Response) => {
      try {
        const { currentUsername, newUsername } = req.body;
        const { un } = req.user!;

        if (!currentUsername || !newUsername) {
          return res.status(400).send('Missing required fields');
        }

        const result = await pool.query('SELECT * FROM sf_login_user($1);', [
          un,
        ]);

        if (!result.rows[0]) {
          return res.status(404).send('USER_NOT_FOUND');
        }

        if (currentUsername !== result.rows[0].username) {
          return res.status(200).send('INVALID_CURRENT_USERNAME');
        }

        if (newUsername.trim().length === 0) {
          return res.status(400).send('New username cannot be empty');
        }

        const changeResult = await pool.query(
          'SELECT * FROM sf_change_un($1, $2);',
          [un, newUsername]
        );

        if (changeResult.rows[0]) {
          return res.status(200).send('CHANGED_SUCCESS');
        }

        return res.status(500).send('Failed to update username');
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    }
  );

  return router;
};

export default securityRoutes;
