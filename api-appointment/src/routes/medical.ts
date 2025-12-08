import express, {Request, Response} from 'express';
import { pool } from '../config/database';
import { extractUser } from '../middleware/extractUser'; // Import the middleware

const router = express.Router();

interface AuthenticatedRequest extends Request {
    body: any;
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

        const { patientId } = req.body;
        console.log('trace', req.body)  
        const result = await pool.query('SELECT * FROM sf_get_medical($1);',[patientId]);
        console.log('result', result.rows)  
        res.status(200).json(result.rows[0]);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
  });

router.post('/getall', extractUser, async (req: AuthenticatedRequest, res: Response) => {
    try {

        const result = await pool.query('SELECT * FROM sf_get_medical_template();');
        res.status(200).json(result.rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
  });

router.post('/add', extractUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
  
      const { id, answers } = req.body;
      console.log('req.medical.add', req.body)
    
        const result = await pool.query('SELECT * FROM sf_insert_medical($1, $2);',[id, answers]);        
        const data = result.rows.map(row => row.sf_insert_medical);
        res.status(201).json(data);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
  });

router.post('/update', extractUser, async (req: AuthenticatedRequest, res: Response) => {
        try {
    
            const { id, answers } = req.body;
            console.log('req.medical.update', req.body)
        
            const result = await pool.query('SELECT * FROM sf_update_medical($1, $2);',[id, answers]);
            const data = result.rows.map(row => row.sf_update_medical);
            res.status(201).json(data);

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
  });

router.post('/delete', extractUser, async (req: AuthenticatedRequest, res: Response) => {
        try {

            const { id } = req.body;
            console.log('trace', req.body)

            const result = await pool.query('SELECT * FROM sf_delete_medical($1);',[id]);
            res.status(201).json(result.rows[0]);

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

export default router;