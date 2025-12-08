import express, { Request, Response } from 'express';
import axios from 'axios';
import QRCode from 'qrcode';
import { pool } from '../config/database';
import { logger } from '../utils/logger';
import { logActivity } from '../utils/activityLogger';
import { authenticate } from '../middleware/authenticate';

const router = express.Router();


// PayMongo configuration
const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY || '';

// Helper function to generate Base64 authorization header
const getPayMongoAuthHeader = (): string => {
  return `Basic ${Buffer.from(PAYMONGO_SECRET_KEY + ':').toString('base64')}`;
};

// Helper function to generate QR code locally
const generateQRCodeLocally = async (url: string): Promise<string> => {
  try {
    const base64 = await QRCode.toDataURL(url);
    return base64; // Returns "data:image/png;base64,iVBORw0KG..."
  } catch (error) {
    logger.error('Error generating QR code locally:', error);
    throw new Error('Failed to generate QR code');
  }
};

/**
 * POST /payments/generate-link
 * Generate a PayMongo payment link for an invoice
 */
router.post('/generate-link', authenticate, async (req: Request, res: Response) => {
  const { invoice_id, amount, description } = req.body;

  // Validation
  if (!invoice_id || !amount || !description) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: invoice_id, amount, description'
    });
  }

  if (!PAYMONGO_SECRET_KEY) {
    return res.status(500).json({
      success: false,
      message: 'PayMongo API key not configured'
    });
  }

  try {
    // Check if payment link already exists for this invoice
    const existingLinkQuery = await pool.query(
      'SELECT paymongo_link_id, paymongo_status FROM invoice WHERE id = $1',
      [invoice_id]
    );

    try {
      if (existingLinkQuery.rows.length > 0 && existingLinkQuery.rows[0].paymongo_link_id) {
        const existingLink = existingLinkQuery.rows[0];
        
        // Only prevent if status is 'active' and no payments made
        if (existingLink.paymongo_status === 'active') {
          // Check if any payments exist for this invoice
          const paymentsQuery = await pool.query(
            'SELECT COUNT(*) as payment_count FROM payment WHERE invoice_id = $1',
            [invoice_id]
          );
          
          const hasPayments = parseInt(paymentsQuery.rows[0].payment_count) > 0;
          
          if (!hasPayments) {
            return res.status(409).json({
              success: false,
              message: 'Active payment link already exists for this invoice. Complete or cancel the existing payment first.',
              data: { link_id: existingLink.paymongo_link_id }
            });
          }
        }
      }
    } catch (dbError: any) {
      // Continue if database query fails (table might not exist)
      logger.warn('Could not check existing payment link:', dbError.message);
    }

    

    // Create PayMongo payment link
    const response = await axios.post(
      'https://api.paymongo.com/v1/links',
      {
        data: {
          attributes: {
            amount: Math.round(amount * 100), // Convert to centavos (PHP 1020 = 102000 centavos)
            description: description,
            remarks: `Patient payment for invoice #${invoice_id}`,
            metadata: {
              invoice_id: invoice_id.toString(),
              system: 'dental-clinic',
              amount_with_fee: amount.toString()
            }
          }
        }
      },
      {
        headers: {
          'Authorization': getPayMongoAuthHeader(),
          'Content-Type': 'application/json'
        }
      }
    );

    const linkData = response.data.data;

    // Update invoice with PayMongo link information
    try {
      await pool.query(
        `UPDATE invoice 
         SET paymongo_link_id = $1, 
             paymongo_reference_number = $2,
             paymongo_status = 'active',
             payment_link_created_at = NOW(),
             paymongo_checkout_url = $4,
             updated_at = CURRENT_DATE,
             updated_by = 'system'
         WHERE id = $3`,
        [linkData.id, linkData.attributes.reference_number, invoice_id, linkData.attributes.checkout_url]
      );
      
    } catch (dbError: any) {
      // Log but don't fail if invoice update fails (table might not exist)
      console.warn(`Failed to update invoice ${invoice_id} with link_id (table might not exist):`, dbError.message);
    }

    

    res.json({
      success: true,
      data: {
        link_id: linkData.id,
        checkout_url: linkData.attributes.checkout_url,
        reference_number: linkData.attributes.reference_number,
        qr_code: linkData.attributes.qr_code_base64 || undefined
      }
    });


    await logActivity('generate', 'billing', req.user?.un || 'paymongo', '127.0.0.1',
      JSON.stringify({ details: `online payment (generate-link) : ${invoice_id},${amount},${description} `,
        status: 'success', endpoint: '/billing/generate-link'}));



  } catch (error: any) {
    console.error('PayMongo API Error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to generate payment link',
      error: error.response?.data?.errors || error.message
    });
  }
});

/**
 * POST /payments/generate-qr
 * Generate a PayMongo payment link with QR code
 */
router.post('/generate-qr', authenticate, async (req: Request, res: Response) => {
  const { invoice_id, amount, description } = req.body;
  
  // Validation
  if (!invoice_id || !amount || !description) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: invoice_id, amount, description'
    });
  }

  if (!PAYMONGO_SECRET_KEY) {
    return res.status(500).json({
      success: false,
      message: 'PayMongo API key not configured'
    });
  }

  try {
    // Check if payment link already exists for this invoice
    const existingLinkQuery = await pool.query(
      'SELECT paymongo_link_id, paymongo_status FROM invoice WHERE id = $1',
      [invoice_id]
    );

    // if (existingLinkQuery.rows.length > 0 && existingLinkQuery.rows[0].paymongo_link_id) {
    //   const existingLink = existingLinkQuery.rows[0];
    //   if (existingLink.paymongo_status !== 'paid') {
    //     return res.status(409).json({
    //       success: false,
    //       message: 'Payment link already exists for this invoice',
    //       data: { link_id: existingLink.paymongo_link_id }
    //     });
    //   }
    // }

    

    // Create PayMongo payment link
    const response = await axios.post(
      'https://api.paymongo.com/v1/links',
      {
        data: {
          attributes: {
            amount: Math.round(amount * 100), // Convert to centavos
            description: description,
            remarks: `Patient payment for invoice #${invoice_id}`,
            metadata: {
              invoice_id: invoice_id.toString(),
              system: 'dental-clinic',
              qr_requested: 'true',
              amount_with_fee: amount.toString()
            }
          }
        }
      },
      {
        headers: {
          'Authorization': getPayMongoAuthHeader(),
          'Content-Type': 'application/json'
        }
      }
    );

    const linkData = response.data.data;

    // Get QR code - either from PayMongo or generate locally
    let qrCode = linkData.attributes.qr_code_base64;
    if (!qrCode) {
      console.warn('PayMongo did not provide QR code, generating locally');
      qrCode = await generateQRCodeLocally(linkData.attributes.checkout_url);
    }

    // Update invoice with PayMongo link information
    await pool.query(
      `UPDATE invoice 
       SET paymongo_link_id = $1, 
           paymongo_reference_number = $2,
           paymongo_status = 'active',
           payment_link_created_at = NOW(),
           paymongo_checkout_url = $4,
           updated_at = CURRENT_DATE,
           updated_by = 'system'
       WHERE id = $3`,
      [linkData.id, linkData.attributes.reference_number, invoice_id, linkData.attributes.checkout_url]
    );



    res.json({
      success: true,
      data: {
        link_id: linkData.id,
        checkout_url: linkData.attributes.checkout_url,
        reference_number: linkData.attributes.reference_number,
        qr_code: qrCode
      }
    });

    await logActivity('generate', 'billing', req.user?.un || 'paymongo', '127.0.0.1',
      JSON.stringify({ details: `online payment (generate-QR) : ${invoice_id},${amount},${description} `,
        status: 'success', endpoint: '/billing/generate-qr'}));


  } catch (error: any) {
    console.error('PayMongo API Error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to generate QR code',
      error: error.response?.data?.errors || error.message
    });
  }
});

/**
 * GET /payments/status/:invoice_id
 * Check PayMongo payment status for an invoice
 */
router.get('/status/:invoice_id', authenticate, async (req: Request, res: Response) => {
  const { invoice_id } = req.params;

  if (!invoice_id) {
    return res.status(400).json({
      success: false,
      message: 'Invoice ID is required'
    });
  }

  try {
    // Check invoice payment status in database
    const invoiceQuery = await pool.query(
      `SELECT 
        id,
        paymongo_link_id,
        paymongo_reference_number,
        paymongo_status,
        payment_link_created_at,
        payment_completed_at,
        status as invoice_status
      FROM invoice 
      WHERE id = $1`,
      [invoice_id]
    );

    if (invoiceQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    const invoice = invoiceQuery.rows[0];
    const invoice_transactionRef = invoice.paymongo_reference_number;
    // Check if there are any payments for this invoice
    const paymentsQuery = await pool.query(
      `SELECT 
            id,
            amount_paid,
            method,
            transaction_ref,
            payment_date,
            paymongo_link_id
        FROM payment
        WHERE invoice_id = $1

        UNION ALL

        SELECT 
            i.id,
            COALESCE(SUM(ip.amount), 0) AS amount_paid,
            MAX(ip.method) AS method,
            MAX(ip.transaction_ref) AS transaction_ref,
            MAX(ip.payment_date) AS payment_date,
            MAX(ip.paymongo_link_id) AS paymongo_link_id
        FROM installment i
        INNER JOIN installment_payment ip ON i.id = ip.installment_id
        WHERE i.invoice_id = $1
        GROUP BY i.id

        ORDER BY payment_date DESC;`,
      [invoice_id]
    );

    const payments = paymentsQuery.rows;
    const totalPaid = payments.reduce((sum, payment) => sum + parseFloat(payment.amount_paid || 0), 0);

    

    
    // Check if payment is completed with stricter validation
    // For PayMongo payments, if status is 'paid', it means payment was successful
    // For manual tracking, we also check for recent payments
    const linkCreatedTime = invoice.payment_link_created_at ? new Date(invoice.payment_link_created_at).getTime() : 0;
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    //console.info('Link created at:', new Date(linkCreatedTime), 'Five minutes ago:', new Date(fiveMinutesAgo));
    // Filter for recent payments with strict timing checks
    const recentPayments = payments.filter(payment => {
      if (!payment.payment_date) return false;
      const paymentTime = new Date(payment.payment_date).getTime();
      
      // Payment must be:
      // 1. Within last 5 minutes, AND
      // 2. After the payment link was created (STRICT: must have valid link creation time)
      //const isRecent = paymentTime > fiveMinutesAgo;
      const isAfterLinkCreation = linkCreatedTime > 0 && paymentTime > linkCreatedTime;
      
      return isAfterLinkCreation;
    });
    
    if (recentPayments.length === 0) {
      res.json({
      success: true,
      data: {
        invoice_id: parseInt(invoice_id),
        paymongo_status: invoice.paymongo_status,
        payment_completed: false,
        payment_completed_at: invoice.payment_completed_at,
        total_payments: payments.length,
        total_amount_paid: totalPaid,
        isAfterLinkCreation: false,
        //latest_payment: payments.length > 0 ? payments[0] : null,
        recent_payments: [],
        link_id: invoice.paymongo_link_id,
        reference_number: invoice.paymongo_reference_number
      }
    });
    } else {
      

      const paymentDate = new Date(recentPayments[0].payment_date).getTime();
          const isAfterLinkCreation2 = linkCreatedTime > 0 && paymentDate > linkCreatedTime;
          
          // check only the reference number for the payment considered completed
          const isReferenceNumberMatched = payments.some(payment => payment.transaction_ref === invoice_transactionRef);
          const isPaymentCompleted = invoice.paymongo_status === 'paid' || isReferenceNumberMatched;

          

          res.json({
            success: true,
            data: {
              invoice_id: parseInt(invoice_id),
              paymongo_status: invoice.paymongo_status,
              payment_completed: isPaymentCompleted,
              payment_completed_at: invoice.payment_completed_at,
              total_payments: payments.length,
              total_amount_paid: totalPaid,
              isAfterLinkCreation: isAfterLinkCreation2,
              //latest_payment: payments.length > 0 ? payments[0] : null,
              recent_payments: recentPayments,
              link_id: invoice.paymongo_link_id,
              reference_number: invoice.paymongo_reference_number
            }
          });

    }

  } catch (error: any) {
    console.error('Error checking payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check payment status',
      error: error.message
    });
  }
});

/**
 * PUT /payments/fix-status/:invoice_id
 * Fix payment status based on actual payments in database
 */
router.put('/fix-status/:invoice_id', authenticate, async (req: Request, res: Response) => {
  const { invoice_id } = req.params;

  if (!invoice_id) {
    return res.status(400).json({
      success: false,
      message: 'Invoice ID is required'
    });
  }

  try {
    // Check current status and payments
    const statusQuery = await pool.query(
      `SELECT 
        i.id,
        i.paymongo_status,
        i.paymongo_link_id,
        COUNT(p.id) as payment_count,
        SUM(p.amount_paid) as total_paid
      FROM invoice i
      LEFT JOIN payment p ON i.id = p.invoice_id
      WHERE i.id = $1
      GROUP BY i.id, i.paymongo_status, i.paymongo_link_id`,
      [invoice_id]
    );

    if (statusQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    const invoiceData = statusQuery.rows[0];
    const hasPayments = parseInt(invoiceData.payment_count) > 0;
    const currentStatus = invoiceData.paymongo_status;

    // Update status if payments exist but status isn't 'paid'
    if (hasPayments && currentStatus !== 'paid') {
      await pool.query(
        `UPDATE invoice 
         SET paymongo_status = 'paid',
             payment_completed_at = NOW(),
             updated_at = CURRENT_DATE,
             updated_by = 'status_correction'
         WHERE id = $1`,
        [invoice_id]
      );

      

      return res.json({
        success: true,
        message: 'Invoice status corrected',
        data: {
          invoice_id: parseInt(invoice_id),
          old_status: currentStatus,
          new_status: 'paid',
          payment_count: parseInt(invoiceData.payment_count),
          total_paid: parseFloat(invoiceData.total_paid || 0)
        }
      });
    }

    // If no payments exist, reset status to allow new payment links
    if (!hasPayments && currentStatus !== 'pending') {
      await pool.query(
        `UPDATE invoice 
         SET paymongo_status = 'pending',
             updated_at = CURRENT_DATE,
             updated_by = 'status_correction'
         WHERE id = $1`,
        [invoice_id]
      );



      return res.json({
        success: true,
        message: 'Invoice status reset to allow new payment links',
        data: {
          invoice_id: parseInt(invoice_id),
          old_status: currentStatus,
          new_status: 'pending',
          payment_count: 0
        }
      });
    }

    return res.json({
      success: true,
      message: 'Invoice status is already correct',
      data: {
        invoice_id: parseInt(invoice_id),
        status: currentStatus,
        payment_count: parseInt(invoiceData.payment_count),
        total_paid: parseFloat(invoiceData.total_paid || 0)
      }
    });

  } catch (error: any) {
    console.error('Error fixing payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fix payment status',
      error: error.message
    });
  }
});

export default router;