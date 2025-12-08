import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database';
import { extractUser } from '../middleware/extractUser';

// Define the user type for proper TypeScript support
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    userId: string;
    role: string;
    email: string;
    username: string;
  };
}

const router = express.Router();
const cache = new Map<string, string>();

router.post('/register', extractUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
        console.log(req.body);
        const {firstName, lastName, mI, birthDate,
            sex, job, daysOnDuty, address, email,
            contactNo, role} = req.body;
        const hashedPassword = await bcrypt.hash(contactNo, 8);
        
        const result = await pool.query('SELECT * FROM sf_insert_user($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);',
            [firstName, lastName, mI, birthDate,
                sex, job, daysOnDuty, address, email,
                contactNo, hashedPassword, role]
        );
        
        const data = result.rows.map(row => row.sf_insert_user);
        res.status(201).json(data);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Note: Login should be handled by API Gateway in microservice architecture
// Keep this for backward compatibility or internal use
router.post('/login', async (req: Request, res: Response) => {
    try {
        console.log(req.body);
        const { un, pw } = req.body;

        // Fetch user details from the database
        const result = await pool.query('SELECT * FROM sf_login_user($1);', [un]);          
        if (!result.rows[0]) {
            return res.status(201).send('USER_NOT_EXIST');
        }

        // Compare passwords
        const isMatch = await bcrypt.compare(pw, result.rows[0].password);
        if (!isMatch) {
            return res.status(201).send('INVALID_CREDENTIALS');
        }

        // Extract user role from database response
        const userRole = result.rows[0].role;

        // Generate JWT with role in payload
        const token = jwt.sign(
            { un: result.rows[0].username, role: userRole },
            process.env.JWT_SECRET as string,
            { expiresIn: '1h' }
        );

        cache.set('token', token);        
        console.log('TRACE SET-TOKEN:', token);
        res.status(201).json({ token });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/token', (req: Request, res: Response) => {
    try {
        const token = cache.get('token');
        console.log('TRACE GET-TOKEN:', token);
        res.status(200).json({ token: token });
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
});



// Dev-only: reset a user's password to a provided plaintext (for debugging)
router.post('/dev/reset-password', async (req: Request, res: Response) => {
    try {
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).send('Not allowed in production');
        }

        const devSecret = req.headers['x-dev-secret'];
        if (!devSecret || devSecret !== process.env.DEV_SECRET) {
            return res.status(401).send('Unauthorized');
        }

        const { username, newPassword } = req.body as { username?: string; newPassword?: string };
        if (!username || !newPassword) {
            return res.status(400).send('Missing required fields');
        }

        if (newPassword.length < 6) {
            return res.status(400).send('New password must be at least 6 characters long');
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        const changeResult = await pool.query('SELECT * FROM sf_change_pw($1, $2);', [username, hashedNewPassword]);

        console.log('DEV RESET-PW RESULT', changeResult.rows[0]);
        if (changeResult.rows[0]) {
            return res.status(200).send('CHANGED_SUCCESS_DEV');
        }

        return res.status(500).send('Failed to update password');
    } catch (err) {
        console.error('DEV RESET ERROR', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/logout', extractUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const username = req.user?.username;
        
        // Clear the token from cache
        cache.delete('token');
        
        console.log('TRACE LOGOUT:', username);
        
        res.status(200).json({ 
            message: 'LOGOUT_SUCCESS',
            user: username
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/changepw', extractUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
        console.log(req.body);
        const { currentPassword, newPassword } = req.body;
        const username = req.user?.username;

        if (!currentPassword || !newPassword) {
            return res.status(400).send('Missing required fields');
        }

        if (!username) {
            return res.status(401).send('User not authenticated');
        }

        // Fetch the user details from the database
        const result = await pool.query('SELECT * FROM sf_login_user($1);', [username]);

        if (!result.rows[0]) {
            return res.status(404).send('USER_NOT_FOUND');
        }

        // Compare current password with the stored hash
        const isMatch = await bcrypt.compare(currentPassword, result.rows[0].password);
        if (!isMatch) {
            return res.status(200).send('INVALID_CURRENT_PASSWORD');
        }

        // Validate the new password
        if (newPassword.length < 6) {
            return res.status(200).send('New password must be at least 6 characters long');
        }

        // Hash the new password
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        
        // Update the password in the database
        const changeResult = await pool.query('SELECT * FROM sf_change_pw($1, $2);', [username, hashedNewPassword]);
        
        console.log('TRACE CHANGEPW RESULT', changeResult.rows[0]);
        if (changeResult.rows[0]) {            
            return res.status(200).send('CHANGED_SUCCESS');
        }
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/changeun', extractUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
        console.log(req.body);
        const { currentUserName, newUserName } = req.body;
        const username = req.user?.username;
        
        if (!currentUserName || !newUserName) {
            return res.status(400).send('Missing required fields');
        }
        
        if (!username) {
            return res.status(401).send('User not authenticated');
        }
        
        // Fetch the user details from the database
        const result = await pool.query('SELECT * FROM sf_login_user($1);', [username]);
        
        if (!result.rows[0]) {
            return res.status(404).send('USER_NOT_FOUND');
        }
        
        // Check if the current username matches
        if (currentUserName !== result.rows[0].username) {
            return res.status(200).send('INVALID_CURRENT_USERNAME');
        }
        
        // Validate the new username
        if (newUserName.trim().length < 4) {
            return res.status(400).send('New username must be at least 4 characters long');
        }
        // Update the username in the database
        const changeResult = await pool.query('SELECT * FROM sf_change_un($1, $2);', [currentUserName, newUserName]);


        if (changeResult.rows[0]) {
            return res.status(200).send('CHANGED_SUCCESS');
        }

        return res.status(500).send('Failed to update username');
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});




export default router;