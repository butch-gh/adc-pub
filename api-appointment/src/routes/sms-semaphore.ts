import express, { Request, Response } from 'express';
import axios from 'axios';
import { extractUser } from '../middleware/extractUser';

const router = express.Router();

const apiKey = process.env.SEMAPHORE_API_KEY;
const senderName = process.env.SEMAPHORE_SENDER_NAME || 'ADClinic';

// Type for user context (same as your pattern)
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

  // Normalize PH mobile number (0917xxx → 63917xxx)
  let sanitizedTo = typeof to === 'string' ? to.replace(/^\+/, '') : '';
  if (sanitizedTo.startsWith('0')) sanitizedTo = '63' + sanitizedTo.substring(1);

  console.log('SMS --> RECIPIENT:', sanitizedTo, 'MESSAGE:', message);

  try {
    const params = new URLSearchParams();
    params.append('apikey', apiKey || '');
    params.append('number', sanitizedTo);
    params.append('message', message);
    params.append('sendername', senderName);

    const response = await axios.post('https://api.semaphore.co/api/v4/messages', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const data = response.data;
    console.log('SMS data:', data);

    // Semaphore returns an array
    // Return message_id so you can store or track delivery
    res.status(200).json({ messageId: data[0]?.message_id });

    console.log('SMS END:');
  } catch (error: any) {
    console.error('Semaphore error:', error?.response?.data || error.message);
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

export default router;
