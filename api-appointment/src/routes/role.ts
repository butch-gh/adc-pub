import express, { Request, Response } from 'express';
import { pool } from '../config/database';
import { extractUser } from '../middleware/extractUser';
import { logActivity } from '../utils/activityLogger';

const router = express.Router();

// Type for user context
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    userId: string;
    role: string;
    email: string;
    username: string;
  };
}

router.post('/get', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.body;
    const result = await pool.query('SELECT * FROM sf_get_access_privilege($1);', [id]);        
    res.status(200).json(result.rows[0]);
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/getall', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const username = req.user?.username;    
    const result = await pool.query('SELECT * FROM sf_get_access_privilege_list($1);', [username]);    
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/getlevel', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const username = req.user?.username;    
    const result = await pool.query('SELECT * FROM sf_get_role_level($1);', [username]);    
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/getscreen', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {    
    const result = await pool.query('SELECT * FROM sf_get_access_screen();');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/getscreen-lov', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { level } = req.body;
    const username = req.user?.username;    
    const result = await pool.query('SELECT * FROM sf_get_access_screen_lov($1, $2);', [username, level]);    
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/add', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { selectedLevel, description, accessPermissions } = req.body;        
    const result = await pool.query('SELECT * FROM sf_insert_role($1, $2, $3);', [selectedLevel, description, accessPermissions]);
    const data = result.rows.map(row => row.sf_insert_role);
    await logActivity('create', 'role', req.user?.username || 'unknown', '127.0.0.1',
      JSON.stringify({ details: `Created : ${selectedLevel}, ${description}, ${accessPermissions}`,
        status: 'success', endpoint: '/appointment/role/add'}));
    res.status(201).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
    
  }
});

router.post('/update', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, selectedLevel, description, accessPermissions } = req.body;
    const result = await pool.query('SELECT * FROM sf_update_access_privilege($1, $2, $3, $4);', [id, selectedLevel, description, accessPermissions]);
    res.status(201).json(result.rows[0]);

    // Log activity to database
    await logActivity('update', 'role', req.user?.username || 'unknown', '127.0.0.1',
      JSON.stringify({ details: `Updated : ${id}, ${selectedLevel}, ${description}, ${accessPermissions}`,
        status: 'success', endpoint: '/appointment/role/update'}));
    
  } catch (error) {
    console.error('Failed to update role:', error);    
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/delete', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.body;
    const result = await pool.query('SELECT * FROM sf_delete_access_privilege($1);', [id]);
    res.status(201).json({ result: result.rows[0], success: true, errorCode: '00000', message: 'success' });

    await logActivity('delete', 'role', req.user?.username || 'unknown', '127.0.0.1',
      JSON.stringify({details: `Deleted : ${id}`, 
        status: 'success', endpoint: '/appointment/role/delete'}));

  } catch (error) {
    console.error(error);
    if (typeof error === 'object' && error !== null && 'code' in error && (error as any).code === '23503') {
      res.status(201).json({
        success: false,
        errorCode: (error as any).code,
        message: (error as any).message || 'An error occurred.',
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Internal Server Error',
      });
    }
  }
});

export default router;