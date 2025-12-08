import express, { Request, Response } from 'express';
import crypto from 'crypto';
import axios from 'axios';
import { pool } from '../config/database';
import { logger } from '../utils/logger';
import { logActivity } from '../utils/activityLogger';


const router = express.Router();

const PAYMONGO_WEBHOOK_SECRET = process.env.PAYMONGO_WEBHOOK_SECRET || '';
const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY || '';

// Helper function to get PayMongo auth header
const getPayMongoAuthHeader = (): string => {
  return `Basic ${Buffer.from(PAYMONGO_SECRET_KEY + ':').toString('base64')}`;
};

// Helper function to retrieve link details including metadata
const getLinkDetails = async (linkId: string): Promise<any> => {
  try {
    const response = await axios.get(
      `https://api.paymongo.com/v1/links/${linkId}`,
      {
        headers: {
          'Authorization': getPayMongoAuthHeader(),
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data.data;
  } catch (error) {
    logger.error('Failed to retrieve link details:', error);
    return null;
  }
};

/**
 * POST /webhooks/paymongo
 * Handle PayMongo webhook events for payment confirmations
 */
router.post('/paymongo', async (req, res) => {
  try {
    const signature = req.headers['paymongo-signature'] as string;
    const payload = JSON.stringify(req.body);

    // Log detailed webhook information for debugging
    // console.log('=== PayMongo Webhook Debug ===');
    // console.log('Headers:', JSON.stringify(req.headers, null, 2));
    // console.log('Body:', JSON.stringify(req.body, null, 2));
    
    // console.log('===============================');

    // Temporarily disable signature verification for testing
    const DISABLE_SIGNATURE_VERIFICATION = process.env.NODE_ENV === 'development';

    if (!DISABLE_SIGNATURE_VERIFICATION && PAYMONGO_WEBHOOK_SECRET && signature) {
      // Parse PayMongo's signature format: t=timestamp,te=test_signature,li=live_signature
      const signatureParts: Record<string, string> = {};
      signature.split(',').forEach(part => {
        const [key, value] = part.split('=');
        if (key && value) {
          signatureParts[key.trim()] = value.trim();
        }
      });

      const timestamp = signatureParts['t'];
      const testSignature = signatureParts['te'];
      const liveSignature = signatureParts['li'];

      // Use live signature if available, otherwise use test signature
      const receivedSignature = liveSignature || testSignature;

      // Create the signed payload: timestamp.payload
      const signedPayload = `${timestamp}.${payload}`;

      const expectedSignature = crypto
        .createHmac('sha256', PAYMONGO_WEBHOOK_SECRET)
        .update(signedPayload)
        .digest('hex');

      console.log('Signature received:', signature);
      console.log('Parsed signature:', receivedSignature);
      console.log('Timestamp:', timestamp);
      console.log('Expected signature:', expectedSignature);
      console.log('Signature match:', receivedSignature === expectedSignature);

      if (receivedSignature !== expectedSignature) {
        logger.warn('Invalid PayMongo webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }

      // Optional: Check timestamp to prevent replay attacks (signature older than 5 minutes)
      const currentTime = Math.floor(Date.now() / 1000);
      const signatureAge = currentTime - parseInt(timestamp);
      if (signatureAge > 300) { // 5 minutes
        logger.warn('Webhook signature expired (older than 5 minutes)');
        return res.status(401).json({ error: 'Signature expired' });
      }
    } else {
      if (DISABLE_SIGNATURE_VERIFICATION) {
        logger.info('Webhook signature validation disabled for development');
      } else {
        logger.warn('Webhook signature validation skipped - PAYMONGO_WEBHOOK_SECRET not configured');
      }
    }

    const event = req.body.data;

    //logger.info(`Received PayMongo webhook event: ${event?.attributes?.type || 'unknown'}`);

    // Handle payment success event
    if (event?.attributes?.type === 'link.payment.paid') {
      // Debug: log the full event structure
      // console.log('=== FULL EVENT STRUCTURE ===');
      // console.log('Event:', JSON.stringify(event, null, 2));
      // console.log('Event attributes:', JSON.stringify(event.attributes, null, 2));
      // console.log('Event data:', JSON.stringify(event.attributes?.data, null, 2));
      // console.log('Event data attributes:', JSON.stringify(event.attributes?.data?.attributes, null, 2));
      // console.log('=============================');

      // IMPORTANT: In PayMongo webhook, the linkId is in event.id, NOT in event.attributes.data.id
      const linkId = event.id; // This is the actual link ID (link_xxxx format)
      const paidAmount = event.attributes.data.attributes.amount / 100; // Convert from centavos to PHP
      const referenceNumber = event.attributes.data.attributes.reference_number;
      
      console.log('Webhook payment details:', {
        linkId,
        paidAmount,
        referenceNumber
      });
      
      // Try multiple possible locations for metadata
      let metadata: any = {};
      
      // First, try to get metadata from the payment object
      if (event.attributes.data.attributes.payments && event.attributes.data.attributes.payments.length > 0) {
        const payment = event.attributes.data.attributes.payments[0];
        metadata = payment.data.attributes.metadata || {};
        //console.log('Found metadata in payment:', metadata);
      }
      
      // If not found in payment, try to get the original link metadata
      if (!metadata.invoice_id) {
        try {
          // Try to retrieve link details using the actual link ID
          const linkDetails = await getLinkDetails(linkId);
          
          if (linkDetails && linkDetails.attributes) {
            metadata = linkDetails.attributes.metadata || {};
            console.log('Found metadata from link details:', metadata);
          } else {
            // Fallback: Try to find by reference number in database
            try {
              const linkQuery = await pool.query(
                'SELECT paymongo_link_id, id as invoice_id FROM invoice WHERE paymongo_reference_number = $1 LIMIT 1',
                [referenceNumber]
              );
              
              if (linkQuery.rows && linkQuery.rows.length > 0) {
                const invoiceData = linkQuery.rows[0];
                metadata.invoice_id = invoiceData.invoice_id.toString();
                console.log('Found invoice_id from reference number lookup:', metadata.invoice_id);
              }
            } catch (dbError: any) {
              console.log('Database lookup by reference number failed:', dbError.message);
            }
          }
        } catch (error) {
          console.log('Error retrieving link metadata:', error);
        }
      }
      
      // Fallback: extract invoice_id and payment type from description if still not found
      let isInstallmentPayment = false;
      let installmentId = null;
      
      if (!metadata.invoice_id) {
        try {
          const description = event.attributes.data.attributes.description;
          console.log('Description:', description);
          
          // Check if this is an installment payment: "Installment #9 - Dental Payment"
          const installmentMatch = description.match(/Installment #(\d+)/);
          if (installmentMatch) {
            isInstallmentPayment = true;
            installmentId = parseInt(installmentMatch[1]);
            console.log('Detected installment payment for installment_id:', installmentId);
          } else {
            // Parse invoice ID from description: "Invoice #9 - Dental Payment"
            const invoiceMatch = description.match(/Invoice #(\d+)/);
            if (invoiceMatch) {
              metadata.invoice_id = invoiceMatch[1];
              console.log('Extracted invoice_id from description:', metadata.invoice_id);
            }
          }
        } catch (error) {
          console.log('Error extracting payment info from description:', error);
        }
      }

      //console.log('Final metadata used:', metadata);
      console.log('Payment type - isInstallment:', isInstallmentPayment, 'installmentId:', installmentId);

      const transactionRef = event.attributes.data.attributes.reference_number;//event.attributes.data.id; // Use PayMongo's payment ID as reference
      let invoiceId: number | null = null;

      // Validate we have either invoice_id or installment_id
      if (isInstallmentPayment) {
        if (!installmentId || isNaN(installmentId)) {
          logger.error('Invalid installment_id in webhook description:', installmentId);
          return res.status(400).json({ error: 'Invalid installment_id in description' });
        }
        logger.info(`Processing installment payment for installment #${installmentId}: PHP ${paidAmount}`);
      } else {
        invoiceId = parseInt(metadata.invoice_id);
        if (!invoiceId || isNaN(invoiceId)) {
          logger.error('Invalid invoice_id in webhook metadata:', metadata);
          return res.status(400).json({ error: 'Invalid invoice_id in metadata' });
        }
        logger.info(`Processing invoice payment for invoice #${invoiceId}: PHP ${paidAmount}`);
      }

      // Calculate base amount and convenience fee (2% fee)
      const convenienceFeeRate = 0.02;
      const totalWithFee = paidAmount;
      const convenienceFee = Math.round((totalWithFee / (1 + convenienceFeeRate)) * convenienceFeeRate * 100) / 100;
      const baseAmount = Math.round((totalWithFee - convenienceFee) * 100) / 100;

      logger.info(`Payment breakdown - Base: ${baseAmount}, Fee: ${convenienceFee}, Total: ${totalWithFee}`);

      // Check if payment already exists (idempotency)
      try {
        if (isInstallmentPayment) {
          console.log('[Handling installment payment logic]');
          // Handle installment payment
          const existingInstallmentPaymentResult = await pool.query(
            'SELECT id FROM installment_payment WHERE transaction_ref = $1',
            [transactionRef]
          );

          if (existingInstallmentPaymentResult.rows && existingInstallmentPaymentResult.rows.length > 0) {
            logger.info(`Installment payment with transaction_ref ${transactionRef} already exists, skipping`);
            return res.json({ received: true, status: 'duplicate' });
          }

          // Get installment details and invoice_id - BUT FIRST CHECK IF IT EXISTS
          let installmentResult = await pool.query(
            'SELECT id, invoice_id, amount_due, amount_paid FROM installment WHERE id = $1',
            [installmentId]
          );

          let installment;
          
          if (!installmentResult.rows || installmentResult.rows.length === 0) {
            // INSTALLMENT DOESN'T EXIST - WE NEED TO CREATE IT
            logger.warn(`Installment #${installmentId} not found, attempting to create it from payment data`);
            
            // We need to extract invoice_id from somewhere
            // Option 1: Try to find it from the payment link metadata
            let invoiceIdFromMetadata = null;
            if (metadata.invoice_id) {
              invoiceIdFromMetadata = parseInt(metadata.invoice_id);
            }
            
            // Option 2: If no metadata, we can't create the installment
            if (!invoiceIdFromMetadata) {
              logger.error(`Cannot create installment #${installmentId} - no invoice_id found in metadata`);
              return res.status(400).json({ 
                error: 'Cannot create installment - no invoice_id found',
                installment_id: installmentId,
                metadata: metadata
              });
            }
            
            // Create the installment record with the payment amount as the due amount
            const insertResult = await pool.query(
              `INSERT INTO installment (
                id,
                invoice_id, 
                due_date, 
                amount_due, 
                amount_paid, 
                status,
                created_at,
                created_by
              ) VALUES ($1, $2, CURRENT_DATE, $3, 0, 'pending', CURRENT_DATE, 'paymongo_webhook_auto')
              RETURNING id, invoice_id, amount_due, amount_paid`,
              [installmentId, invoiceIdFromMetadata, baseAmount]
            );
            
            installment = insertResult.rows[0];
            logger.info(`Created new installment #${installmentId} for invoice #${invoiceIdFromMetadata} with amount_due: ${baseAmount}`);
            
          } else {
            installment = installmentResult.rows[0];
          }

          invoiceId = installment.invoice_id; // Set invoiceId for later use
          
          // Insert installment payment record
          await pool.query(
            `INSERT INTO installment_payment (
              installment_id, 
              amount, 
              method, 
              transaction_ref, 
              payment_date,
              paymongo_link_id
            ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5)`,
            [
              installmentId,
              baseAmount,
              'QR/Online',
              transactionRef,
              linkId
            ]
          );

          // Update installment amount_paid and status
          const newAmountPaid = parseFloat(installment.amount_paid) + baseAmount;
          const newStatus = newAmountPaid >= parseFloat(installment.amount_due) ? 'paid' : 'pending';
          
          await pool.query(
            `UPDATE installment 
             SET amount_paid = $2, 
                 status = $3,
                 updated_at = CURRENT_DATE,
                 updated_by = 'paymongo_webhook'
             WHERE id = $1`,
            [installmentId, newAmountPaid, newStatus]
          );

          // Update invoice net_amount_due: final_amount - total_installment_payments
          try {
            // First, let's get the current state for debugging
            const debugQuery = await pool.query(
              `SELECT 
                 i.id,
                 i.final_amount,
                 i.net_amount_due as current_net_amount_due,
                 COALESCE(SUM(inst.amount_paid), 0) as total_installment_paid,
                 COUNT(inst.id) as installment_count
               FROM invoice i
               LEFT JOIN installment inst ON i.id = inst.invoice_id
               WHERE i.id = $1
               GROUP BY i.id, i.final_amount, i.net_amount_due`,
              [invoiceId]
            );
            
            if (debugQuery.rows.length > 0) {
              const debugData = debugQuery.rows[0];
              logger.info(`BEFORE UPDATE - Invoice #${invoiceId}:`, {
                final_amount: debugData.final_amount,
                current_net_amount_due: debugData.current_net_amount_due,
                total_installment_paid: debugData.total_installment_paid,
                installment_count: debugData.installment_count
              });
            }
            
            // Now update with a more precise query
            await pool.query(
              `UPDATE invoice 
               SET net_amount_due = GREATEST(0, 
                 final_amount - (
                   SELECT COALESCE(SUM(inst.amount_paid), 0)
                   FROM installment inst 
                   WHERE inst.invoice_id = invoice.id
                 )
               ),
               updated_at = CURRENT_TIMESTAMP,
               updated_by = 'paymongo_webhook'
               WHERE id = $1`,
              [invoiceId]
            );
            
            // Log the updated result for verification
            const updatedInvoiceResult = await pool.query(
              `SELECT 
                 i.final_amount,
                 i.net_amount_due,
                 COALESCE(SUM(inst.amount_paid), 0) as total_installment_paid
               FROM invoice i
               LEFT JOIN installment inst ON i.id = inst.invoice_id
               WHERE i.id = $1
               GROUP BY i.id, i.final_amount, i.net_amount_due`,
              [invoiceId]
            );
            
            if (updatedInvoiceResult.rows.length > 0) {
              const { final_amount, net_amount_due, total_installment_paid } = updatedInvoiceResult.rows[0];
              logger.info(`AFTER UPDATE - Invoice #${invoiceId}:`, {
                final_amount: parseFloat(final_amount),
                total_installment_paid: parseFloat(total_installment_paid),
                calculated_net_due: parseFloat(final_amount) - parseFloat(total_installment_paid),
                actual_net_amount_due: parseFloat(net_amount_due)
              });
              
              // Validation check
              const expectedNetDue = Math.max(0, parseFloat(final_amount) - parseFloat(total_installment_paid));
              if (Math.abs(parseFloat(net_amount_due) - expectedNetDue) > 0.01) {
                logger.warn(`NET_AMOUNT_DUE MISMATCH for invoice #${invoiceId}:`, {
                  expected: expectedNetDue,
                  actual: parseFloat(net_amount_due),
                  difference: parseFloat(net_amount_due) - expectedNetDue
                });
              }
            }
            
          } catch (updateError: any) {
            logger.warn(`Could not update invoice net_amount_due: ${updateError.message}`);
          }

          logger.info(`Installment payment recorded successfully for installment #${installmentId}: ${baseAmount} (+ ${convenienceFee} fee), new total paid: ${newAmountPaid}, status: ${newStatus}`);

        } else {
          console.log('[Handling regular invoice payment logic]');
          // Handle regular invoice payment (existing logic)
          const existingPaymentsResult = await pool.query(
            'SELECT id FROM payment WHERE transaction_ref = $1',
            [transactionRef]
          );

          if (existingPaymentsResult.rows && existingPaymentsResult.rows.length > 0) {
            logger.info(`Payment with transaction_ref ${transactionRef} already exists, skipping`);
            return res.json({ received: true, status: 'duplicate' });
          }

          // Insert payment record - Updated to match your table schema
          await pool.query(
            `INSERT INTO payment (
              invoice_id, 
              amount_paid, 
              method, 
              transaction_ref, 
              convenience_fee,
              paymongo_link_id,
              payment_date
            ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
            [
              invoiceId,
              baseAmount,
              'QR/Online',
              transactionRef,
              convenienceFee,
              linkId
            ]
          );

          logger.info(`Payment recorded successfully for invoice #${invoiceId}: ${baseAmount} (+ ${convenienceFee} fee)`);
        }

        // Update invoice status only for direct invoice payments (not installment payments)
        if (!isInstallmentPayment && invoiceId) {
          console.log('[Handling direct invoice payment logic]');
          try {

          // Calculate total amount paid so far for this invoice
          const totalPaidQuery = `
            SELECT SUM(total_paid) AS total_paid
            FROM (
                SELECT COALESCE(SUM(amount_paid), 0) AS total_paid
                FROM payment
                WHERE invoice_id = $1

                UNION ALL

                SELECT COALESCE(SUM(ip.amount), 0) AS total_paid
                FROM installment i
                INNER JOIN installment_payment ip ON i.id = ip.installment_id
                WHERE i.invoice_id = $1
            ) AS combined_total_paid;
          `;
          const totalPaidResult = await pool.query(totalPaidQuery, [invoiceId]);
          const totalPaid = parseFloat(totalPaidResult.rows[0].total_paid) || 0;

            // Get the current invoice final_amount before this payment
            const invoiceStatusQuery = `
              SELECT final_amount
              FROM invoice 
              WHERE id = $1
            `;
            
            const statusResult = await pool.query(invoiceStatusQuery, [invoiceId]);
            
            if (statusResult.rows.length > 0) {
              const invoiceData = statusResult.rows[0];
              const netFinalAmount = parseFloat(invoiceData.final_amount) || 0;
              const totalNetAmountRemain = netFinalAmount - totalPaid;

              logger.info(`Invoice #${invoiceId} payment calculation: Net Amount Due: ${netFinalAmount}, Payment Amount: ${baseAmount}, Remaining: ${totalNetAmountRemain}`);

              // Determine status based on remaining amount
              const newStatus = totalNetAmountRemain <= 0 ? 'paid' : 'pending';
              const paymentCompletedAt = totalNetAmountRemain <= 0 ? 'NOW()' : 'NULL';
              
              await pool.query(
                `UPDATE invoice 
                 SET paymongo_status = 'paid',                       
                     status = $2,
                     payment_completed_at = CURRENT_TIMESTAMP,
                     net_amount_due = $3,
                     updated_at = CURRENT_TIMESTAMP,
                     updated_by = 'paymongo_webhook'
                 WHERE id = $1`,
                [invoiceId, newStatus, Math.max(0, totalNetAmountRemain)]
              );
              
              logger.info(`Updated invoice #${invoiceId} status to '${newStatus}' (remaining: ${Math.max(0, totalNetAmountRemain)})`);

              
                await logActivity('payment', 'billing', 'paymongo', '127.0.0.1',
                  JSON.stringify({ details: `[regular invoice payment] online payment (paymongo-webhook) : ${invoiceId},${baseAmount},${totalNetAmountRemain},${newStatus} `,
                    status: 'success', endpoint: '/billing/paymongo'}));


              if (newStatus === 'paid') {                
                logger.info(`Invoice #${invoiceId} fully paid! Total payments: ${totalPaid}`);
              } else {                
                logger.info(`Invoice #${invoiceId} partially paid. Total payments: ${totalPaid}, remaining: ${totalNetAmountRemain}`);
              }
            }
          } catch (updateError: any) {
            // Continue even if invoice update fails (columns might not exist)
            logger.warn(`Could not update invoice status (columns might not exist): ${updateError.message}`);
          }
        } else if (isInstallmentPayment && invoiceId) {
          console.log('[Handling installment payment logic]');
          // For installment payments, check if all installments are paid to update invoice status
          try {


          // Calculate total amount paid so far for this invoice
          const totalPaidQuery = `
            SELECT SUM(total_paid) AS combined_total_paid
            FROM (
                SELECT COALESCE(SUM(amount_paid), 0) AS total_paid
                FROM payment
                WHERE invoice_id = $1

                UNION ALL

                SELECT COALESCE(SUM(ip.amount), 0) AS total_paid
                FROM installment i
                INNER JOIN installment_payment ip ON i.id = ip.installment_id
                WHERE i.invoice_id = $1
            ) AS combined_total_paid;
          `;
          const totalPaidResult = await pool.query(totalPaidQuery, [invoiceId]);
          const totalPaid = parseFloat(totalPaidResult.rows[0].combined_total_paid) || 0;


            // First, always update paymongo_status to 'paid' for any successful installment payment
            await pool.query(
              `UPDATE invoice 
               SET paymongo_status = 'paid',
                    paymongo_link_id = NULL,
                   updated_at = CURRENT_TIMESTAMP,
                   updated_by = 'paymongo_webhook_installment'
               WHERE id = $1`,
              [invoiceId]
            );
            
            logger.info(`Updated paymongo_status to 'active' for invoice #${invoiceId} (installment payment)`);


            if (totalPaidResult.rows.length > 0) {

              // Get invoice details
              const invoiceQuery = await pool.query(
                'SELECT final_amount, net_amount_due FROM invoice WHERE id = $1',
                [invoiceId]
              );
              
              if (invoiceQuery.rows.length > 0) {
                const invoice = invoiceQuery.rows[0];
                const finalAmount = parseFloat(invoice.final_amount);

                
                // Calculate the new net_amount_due
                const newNetAmountDue = Math.max(0, finalAmount - totalPaid);
                
                // Determine invoice status based on net_amount_due
                const newStatus = newNetAmountDue <= 0 ? 'paid' : 'unpaid';
                const paymentCompletedAt = newNetAmountDue === 0 ? 'NOW()' : 'NULL';
                
               
                // Update invoice with calculated net_amount_due and correct status
                await pool.query(
                  `UPDATE invoice 
                   SET net_amount_due = $2,
                       status = $3,
                       payment_completed_at = CURRENT_TIMESTAMP,
                       updated_at = CURRENT_TIMESTAMP,
                       updated_by = 'paymongo_webhook'
                   WHERE id = $1`,
                  [invoiceId, newNetAmountDue, newStatus]
                );
                
                // update invoice to reset paymongo_status to 'paid' in case it was 'unpaid'


                await logActivity('payment', 'billing', 'paymongo', '127.0.0.1',
                  JSON.stringify({ details: `[installment invoice payment] online payment (paymongo-webhook) : ${invoiceId},${baseAmount},${newNetAmountDue},${newStatus} `,
                    status: 'success', endpoint: '/billing/paymongo'}));


                //await pool.query(`UPDATE invoice SET paymongo_status = $2, payment_link_id = $3 WHERE id = $1`, [invoiceId, 'active', null]);
                if (newStatus === 'paid') {                
                  logger.info(`Invoice #${invoiceId} fully paid! Total installment payments: ${totalPaid}, net_amount_due: ${newNetAmountDue}`);
                } else {                  
                  logger.info(`Invoice #${invoiceId} partially paid. installments completed, total paid: ${totalPaid}, remaining: ${newNetAmountDue}`);
                }
              }
            }
          } catch (updateError: any) {
            logger.warn(`Could not update invoice status for installment payment: ${updateError.message}`);
          }
        }
        
        res.json({ received: true, status: 'processed' });

      } catch (dbError: any) {
        logger.error('Database error while recording payment:', {
          error: dbError.message,
          code: dbError.code,
          table: dbError.table || 'unknown',
          invoiceId: invoiceId,
          installmentId: isInstallmentPayment ? installmentId : null,
          linkId: linkId,
          paymentType: isInstallmentPayment ? 'installment' : 'invoice'
        });

        // Check if it's a table missing error
        if (dbError.code === '42P01') {
          const paymentTypeDesc = isInstallmentPayment ? 'installment' : 'invoice';
          logger.warn(`Payment table does not exist. ${paymentTypeDesc} payment processing will continue without database storage.`);
          // For now, just log the payment without storing it
          if (isInstallmentPayment) {
            logger.info(`Installment payment received but not stored - Installment: ${installmentId}, Amount: ${paidAmount}, Link: ${linkId}`);
          } else {
            logger.info(`Invoice payment received but not stored - Invoice: ${invoiceId}, Amount: ${paidAmount}, Link: ${linkId}`);
          }
          res.json({ received: true, status: 'logged_only' });
        } else {
          // For other database errors, still return success to PayMongo to prevent retries
          logger.error('Failed to store payment in database, but acknowledging webhook to prevent retries');
          res.json({ received: true, status: 'error_acknowledged' });
        }
      }
    } else {
      // Handle other event types or unknown events
      logger.info(`Received webhook event type: ${event?.attributes?.type || 'unknown'}`);
      res.json({ received: true, status: 'ignored' });
    }

  } catch (error: any) {
    logger.error('Error processing PayMongo webhook:', error);
    
    // Always return 200 to PayMongo to prevent retries for application errors
    res.status(200).json({ 
      success: false, 
      error: 'Internal server error',
      message: 'Webhook processing failed but acknowledged',
      status: 'error'
    });
  }
});

/**
 * GET /webhooks/paymongo/test
 * Test endpoint to verify webhook is accessible
 */
router.get('/paymongo/test', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'PayMongo webhook endpoint is accessible',
    timestamp: new Date().toISOString(),
    headers: req.headers,
    url: req.url,
    method: req.method
  });
});

/**
 * POST /webhooks/paymongo/dev-test
 * Development test endpoint that simulates a PayMongo webhook
 */
router.post('/paymongo/dev-test', async (req: Request, res: Response) => {
  try {
    console.log('=== DEV TEST WEBHOOK ===');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('========================');

    // Simulate a PayMongo payment event
    const mockEvent = {
      data: {
        attributes: {
          type: 'link.payment.paid',
          data: {
            id: 'pay_test_' + Date.now(),
            attributes: {
              amount: 10250, // PHP 102.50 in centavos
              status: 'paid',
              metadata: {
                invoice_id: '123',
                system: 'dental-clinic'
              }
            }
          }
        }
      }
    };

    // Use the actual webhook processing logic
    const event = mockEvent.data;
    const linkId = event.attributes.data.id;
    const paidAmount = event.attributes.data.attributes.amount / 100;
    const metadata = event.attributes.data.attributes.metadata || {};
    const invoiceId = parseInt(metadata.invoice_id);
    const transactionRef = event.attributes.data.id;

    logger.info(`DEV TEST: Processing payment for invoice #${invoiceId}: PHP ${paidAmount}`);

    res.json({ 
      success: true, 
      message: 'Dev test webhook processed',
      processed_data: {
        invoice_id: invoiceId,
        amount: paidAmount,
        transaction_ref: transactionRef
      }
    });

  } catch (error: any) {
    logger.error('Error in dev test webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
