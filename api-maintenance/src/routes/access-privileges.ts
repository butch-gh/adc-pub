import express, { Request, Response } from 'express';
import { pool } from '../config/database';
import { extractUser } from '../middleware/extractUser';
import { logActivity } from '../middleware/activityLogger';

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

router.post('/get', extractUser, async (req: Request, res: Response) => {
  try {
    const { id } = req.body;
    console.log('Access Privilege ID:', req.body);
    const result = await pool.query('SELECT * FROM sf_get_access_privilege($1);', [id]);
    res.status(200).json(result.rows[0]);    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/getall', extractUser, async (req: Request, res: Response) => {
  try {
    const username = (req as any).user?.username;
    console.log('Access Privilege Username:', username);
    const result = await pool.query('SELECT * FROM sf_get_access_privilege_list($1);', [username]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/getlevel', extractUser, async (req: Request, res: Response) => {
  try {
    const username = req.user?.username;
    const result = await pool.query('SELECT * FROM sf_get_role_level($1);', [username]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/getscreen', extractUser, async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM sf_get_access_screen();');
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/getscreen-lov', extractUser, async (req: Request, res: Response) => {
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

router.post('/add', extractUser, async (req: Request, res: Response) => {
  try {
    const { selectedLevel, description, accessPermissions } = req.body;
    const result = await pool.query('SELECT * FROM sf_insert_role($1, $2, $3);', [selectedLevel, description, accessPermissions]);
    const data = result.rows.map(row => row.sf_insert_role);
    res.status(201).json(data);
    await logActivity({
      action: 'create',
      module: 'access-privileges',
      username: req.user?.username || 'unknown',
      ipAdd: '',
      details: JSON.stringify({details: `Created : ${selectedLevel}, ${description}, ${accessPermissions}`, status:'success', endpoint: '/maintenance/access-privileges/add'})
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
    await logActivity({
      action: 'create',
      module: 'access-privileges',
      username: req.user?.username || 'unknown',
      ipAdd: '',
      details: JSON.stringify({details: (error as Error).message,status:'error', endpoint: '/maintenance/access-privileges/add'})
    });
  }
});

router.post('/update', extractUser, async (req: Request, res: Response) => {
  try {
    const { id, selectedLevel, description, accessPermissions } = req.body;
    const result = await pool.query('SELECT * FROM sf_update_access_privilege($1, $2, $3, $4);', [id, selectedLevel, description, accessPermissions]);
    res.status(201).json(result.rows[0]);
    await logActivity({
      action: 'update',
      module: 'access-privileges',
      username: req.user?.username || 'unknown',
      ipAdd: '',
      details: JSON.stringify({details: `Updated : ${id}, ${selectedLevel}, ${description}, ${accessPermissions}`, status:'success', endpoint: '/maintenance/access-privileges/update'})
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
    await logActivity({
      action: 'update',
      module: 'access-privileges',
      username: req.user?.username || 'unknown',
      ipAdd: '',
      details: JSON.stringify({details: (error as Error).message,status:'error', endpoint: '/maintenance/access-privileges/update'})
    });
  }
});

router.post('/delete', extractUser, async (req: Request, res: Response) => {
  try {
    const { id } = req.body;
    const result = await pool.query('SELECT * FROM sf_delete_access_privilege($1);', [id]);
    res.status(201).json({ result: result.rows[0], success: true, errorCode: '00000', message: 'success' });
    
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