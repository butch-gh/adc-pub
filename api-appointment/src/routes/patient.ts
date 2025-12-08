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

        const { id } = req.body;
        //console.log('trace', req.body)  
        const result = await pool.query('SELECT * FROM sf_get_patient($1);',[id]);
        res.status(200).json(result.rows[0]);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
  });

router.post('/getAll', extractUser, async (req: AuthenticatedRequest, res: Response) => {
    try {

        const result = await pool.query('SELECT * FROM sf_get_patient_list();');
        console.log(result.rows);
        res.status(200).json(result.rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
  });

router.post('/add', extractUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
  
      const { firstName, lastName, middleName, birthDate, sex, address, email, contactNo } = req.body;
      console.log(req.body)
    
        const result = await pool.query('SELECT * FROM sf_insert_patient($1, $2, $3, $4, $5, $6, $7, $8);',
            [firstName, lastName, middleName, birthDate, sex, address, email, contactNo]);
        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
  });

router.post('/update', extractUser, async (req: AuthenticatedRequest, res: Response) => {
        try {
    
            const { id, firstName, lastName, middleName, birthDate, sex, address, email, contactNo } = req.body;
            //console.log('trace', req.body)
        
            const result = await pool.query('SELECT * FROM sf_update_patient($1, $2, $3, $4, $5, $6, $7, $8, $9);',
                [id, firstName, lastName, middleName, birthDate, sex, address, email, contactNo]);
            res.status(201).json(result.rows[0]);

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
  });

router.post('/delete', extractUser, async (req: AuthenticatedRequest, res: Response) => {
        try {

            const { id } = req.body;
            //console.log('id', req.body)

            const result = await pool.query('SELECT * FROM sf_delete_patient($1);',[id]);
            res.status(201).json({result: result.rows[0], success: true, errorCode:'00000', message: 'success'});

        } catch (error) {
            console.error(error);
            //res.status(500).json({ error: 'Internal Server Error' });        
            // Check if the error is Foreign key
            if (typeof error === 'object' && error !== null && 'code' in error && (error as any).code === '23503') {
            res.status(201).json({
                success: false,
                errorCode: (error as any).code, 
                message: (error as any).message || 'An error occurred.',
            });
            } else {
            // Handle generic errors
            res.status(500).json({
                success: false,
                message: 'Internal Server Error',
            });
            }
        }
    });

export default router;