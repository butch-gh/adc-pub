import express, { Request, Response } from 'express';
import { extractUser } from '../middleware/extractUser';
import { sendEmail } from "../utils/mail.service";

const router = express.Router();

router.post("/send", extractUser, async (req: Request, res: Response) => {
  const { to, subject, text, html } = req.body;
  if (!to || !subject) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  try {
    const result = await sendEmail({ to, subject, text, html });
    return res.status(200).json({ success: true, result });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Failed to send email" });
  }
});

export default router;

