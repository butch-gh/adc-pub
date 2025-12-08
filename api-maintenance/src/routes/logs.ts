import express, {Request, Response} from 'express';
import { pool } from '../config/database';
import { extractUser } from '../middleware/extractUser'; // Import the middleware

const router = express.Router();

// interface AuthenticatedRequest extends Request {
//   body: any;
//   user?: {
//     id: string;
//     userId: string;
//     role: string;
//     email: string;
//     username: string;
//   };
// }

router.post('/getall', extractUser, async (req: Request, res: Response) => {
    try {
        
        //console.log('logs/getall', req.body)  
        const result = await pool.query('SELECT * FROM sf_get_activity_logs();');
        //console.log('activitylogs/res', result.rows) 
        res.status(200).json(result.rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
  });

router.post('/add', extractUser, async (req: Request, res: Response) => {
    try {
  
      const { action, module, ipAdd, details } = req.body;      
      const username = (req as any).user?.username;
        console.log('req-activity-logs:', req.body)
        const result = await pool.query('SELECT * FROM sf_log_activity($1, $2, $3, $4, $5);',[action, module, username, ipAdd, details]);
        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
  });


export default router;

// p_action character varying,
// 	p_module character varying,
// 	p_username character varying,
// 	p_ip_address inet DEFAULT '127.0.0.1'::inet,
// 	p_details jsonb DEFAULT '{}'::jsonb)