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
      //console.log('paymtentmethod/req.body', req.body)
      const result = await pool.query('SELECT * FROM sf_get_payment_method($1);', [id]);
      res.status(200).json(result.rows[0]);

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

router.post('/getall', extractUser, async (req: AuthenticatedRequest, res: Response) => {
    try {

      const result = await pool.query('SELECT * FROM sf_get_payment_method_list();');
      res.status(200).json(result.rows);

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

router.post('/add', extractUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
  
      const { description } = req.body;
      //console.log('description', req.body)
    
        const result = await pool.query('SELECT * FROM sf_insert_payment_method($1);',[description]);
        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
  });

router.post('/update', extractUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
  
      const { id, description } = req.body;
      //console.log('id','description', req.body)
    
        const result = await pool.query('SELECT * FROM sf_update_payment_method($1, $2);',[id, description]);
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

        const result = await pool.query('SELECT * FROM sf_delete_payment_method($1);',[id]);
        res.status(201).json({result: result.rows[0], success: true, errorCode:'00000', message: 'success'});

    } catch (error) {
        console.error(error);
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