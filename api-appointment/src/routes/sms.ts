import express, { Request, Response } from 'express';
import axios from 'axios';
import { extractUser } from '../middleware/extractUser';

const router = express.Router();

const apiKey = process.env.PHILSMS_API_KEY;
const senderId = process.env.PHILSMS_SENDER_ID;

// Type for user context (if needed for future expansion)
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    userId: string;
    role: string;
    email: string;
    username: string;
  };
}

router.post('/send', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  const { to, message } = req.body;
  const sanitizedTo = typeof to === 'string' ? to.replace(/^\+/, '') : '';
  console.log('SMS--> ', 'RECIPIENT: ', to, 'MESSAGE: ', message);

  try {
    const response = await axios.post('https://app.philsms.com/api/v3/sms/send', {
      recipient: sanitizedTo,
      message: message,
      sender_id: senderId,
    }, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const data = response.data;
    console.log('SMS data:', data);
    res.status(200).json({ sid: data.data.uid });
    console.log('SMS END:');
  } catch (error: any) {
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

export default router;

