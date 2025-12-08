import express, { Request, Response } from 'express';
import { pool } from '../config/database';
import { logger } from '../utils/logger';
import { generate_invoice_code } from '../utils/invoiceCodeGenerator';
import { logActivity } from '../utils/activityLogger';
import { extractUser } from '../middleware/extractUser';

// Type for authenticated user context
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    userId: string;
    role: string;
    email: string;
    username: string;
    full_name?: string;
  };
}

const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    reset: '\x1b[0m'
  };

// Helper function to safely parse tooth_options JSON
const parseToothOptions = (toothOptions: any): { id: number; description: string }[] => {
  if (!toothOptions) return [];
  
  // If it's already an array, return it
  if (Array.isArray(toothOptions)) return toothOptions;
  
  // If it's a string, try to parse it
  if (typeof toothOptions === 'string') {
    // Handle invalid JSON cases
    if (toothOptions === '[object Object]' || toothOptions.trim() === '') {
      return [];
    }
    
    try {
      const parsed = JSON.parse(toothOptions);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('Failed to parse tooth_options JSON:', toothOptions, error);
      return [];
    }
  }
  
  // For any other type, return empty array
  return [];
};

const router = express.Router();

// Get all invoices with pagination and filters
router.get('/invoices', async (req, res) => {
  
  try {
    const { page = 1, limit = 10, status, patient_id } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = '';
    const params: any[] = [];
    let paramIndex = 1;

    if (status && status !== 'all') {
      whereClause += ` WHERE i.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (patient_id) {
      whereClause += whereClause ? ` AND i.patient_id = $${paramIndex}` : ` WHERE i.patient_id = $${paramIndex}`;
      params.push(patient_id);
      paramIndex++;
    }
    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM invoice i ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);
    // Get paginated invoices
    const query = `
      SELECT 
        i.id invoice_id,
        i.invoice_code,
        i.patient_id,
        i.dentist_id,
        CONCAT(p.first_name, ' ', p.last_name) as patient_name,
        i.net_amount_due as amount,
        i.status,
        i.created_at,
        i.updated_at,
        i.plan_mode,
        COALESCE(
          ARRAY_AGG(
            DISTINCT jsonb_build_object(
              'charge_id', tc.id,
              'plan_id', tc.plan_id,
              'service_name', s.service_name,
              'estimated_amount', tc.estimated_amount,
              'final_amount', tc.final_amount,
              'status', tc.status,
              'notes', tc.notes
            )
          ) FILTER (WHERE tc.id IS NOT NULL),
          '{}') as treatments,
        p.contact_no as mobile_number,
        p.email_address as email
      FROM invoice i
      LEFT JOIN patient p ON i.patient_id = p.id
      LEFT JOIN treatment_charge tc ON i.id = tc.invoice_id
      LEFT JOIN service s ON tc.service_id = s.id
      ${whereClause}
      GROUP BY i.id, i.patient_id, i.net_amount_due, i.status, i.created_at, i.updated_at, p.first_name, p.last_name, p.contact_no, p.email_address
      ORDER BY i.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(Number(limit), offset);    
    const result = await pool.query(query, params);    
    
    // Convert amount strings to numbers
    const processedData = result.rows.map(row => ({
      ...row,
      amount: parseFloat(row.amount) || 0
    }));
    

    res.json({
      success: true,
      data: processedData,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching invoices'
    });
  }
});

// Get single invoice
router.get('/invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
SELECT 
        i.*,
        p.first_name || ' ' || p.last_name as patient_name,
        d.first_name || ' ' || d.last_name as dentist_name,
        p.contact_no as phone,        
        plan_mode,
        i.id as invoice_id,
        COALESCE(
          ARRAY_AGG(
            DISTINCT jsonb_build_object(
              'charge_id', tc.id,
              'plan_id', tc.plan_id,
              'service_id', tc.service_id,
              'service_name', s.service_name,
              'estimated_amount', tc.estimated_amount,
              'final_amount', tc.final_amount,
              'status', tc.status,
              'notes', tc.notes
            )
          ) FILTER (WHERE tc.id IS NOT NULL), 
          '{}') as treatments,
        p.contact_no as mobile_number,
        p.email_address as email
      FROM invoice i
      LEFT JOIN patient p ON i.patient_id = p.id      
      LEFT JOIN treatment_charge tc ON i.id = tc.invoice_id
      LEFT JOIN service s ON tc.service_id = s.id
      LEFT JOIN dentist d ON i.dentist_id = d.id
      WHERE i.id = $1
      GROUP BY i.id, i.patient_id, i.total_amount_estimated, i.final_amount, i.discount_amount, i.writeoff_amount, i.net_amount_due, i.status, i.created_at, i.updated_at, p.first_name, p.last_name, d.first_name, d.last_name, p.contact_no, p.email_address;
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Convert numeric strings to numbers
    const invoice = {
      ...result.rows[0],
      net_amount_due: parseFloat(result.rows[0].net_amount_due) || 0,
      total_amount_estimated: parseFloat(result.rows[0].total_amount_estimated) || 0,
      final_amount: parseFloat(result.rows[0].final_amount) || 0
    };

    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching invoice'
    });
  }
});

// Create new invoice
router.post('/invoices', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      patient_id,      
      plan_id,
      plan_mode,
      charges = []
    } = req.body;

    // Validate required fields
    if (!patient_id || !charges || charges.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'patient_id and charges are required'
      });
    }

    // Calculate total estimated amount from charges
    let totalEstimated = 0;
    for (const charge of charges) {
      if (charge.estimated_amount) {
        totalEstimated += parseFloat(charge.estimated_amount);
      } else {
        // Get service details to calculate amount
        const serviceQuery = 'SELECT fixed_price, base_price_min, base_price_max FROM service WHERE id = $1';
        const serviceResult = await client.query(serviceQuery, [charge.service_id]);
        if (serviceResult.rows.length > 0) {
          const service = serviceResult.rows[0];
          const amount = service.fixed_price ||
                        ((service.base_price_min + service.base_price_max) / 2) ||
                        0;
          totalEstimated += parseFloat(amount);
        }
      }
    }
    // Insert invoice
    const invoiceQuery = `
      INSERT INTO invoice (patient_id, plan_mode, total_amount_estimated, final_amount, net_amount_due, status, invoice_code)
      VALUES ($1, $2, $3, $4, $5, 'unpaid', $6)
      RETURNING *
    `;

    const invoiceResult = await client.query(invoiceQuery, [
      patient_id,      
      plan_mode,
      totalEstimated,
      totalEstimated,  // final_amount initially equals total_amount_estimated
      totalEstimated,  // net_amount_due initially equals total_amount_estimated
      generate_invoice_code(), // Assuming a function to generate unique invoice codes
    ]);
      
    const invoice = invoiceResult.rows[0];
    
    // Insert charges
    if (charges.length > 0) {
      for (const charge of charges) {
        // Get service details if amount not provided
        let finalAmount = charge.estimated_amount;
        if (!finalAmount) {
          const serviceQuery = 'SELECT fixed_price, base_price_min, base_price_max FROM service WHERE id = $1';
          const serviceResult = await client.query(serviceQuery, [charge.service_id]);
          if (serviceResult.rows.length > 0) {
            const service = serviceResult.rows[0];
            finalAmount = service.fixed_price ||
                         ((service.base_price_min + service.base_price_max) / 2) ||
                         0;
          }
        }
        const chargeQuery = `
          INSERT INTO treatment_charge (invoice_id, plan_id, service_id, estimated_amount, notes, status, invoice_code, dentist_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;
          
        await client.query(chargeQuery, [invoice.id, plan_id || null, charge.service_id, finalAmount, charge.notes || null, charge.status || 'pending', invoice.invoice_code, charge.dentist_id || null]);



        // If charge is linked to a treatment plan entry, update its status to 'invoiced'
        if (charge.entry_id) {
          const updateEntryQuery = `
            UPDATE treatment_plan_entry
            SET status = 'Invoiced',
            invoice_code = $2,
            invoice_id = $3,
            updated_at = CURRENT_TIMESTAMP
            WHERE entry_id = $1
          `;
          await client.query(updateEntryQuery, [charge.entry_id, invoice.invoice_code, invoice.id]);
        
        
        // If all treatment plan entries status are 'Invoiced', update the treatment plan header status = 'Completed'
        const allInvoicedQuery = `
          SELECT COUNT(*) = 0 AS all_invoiced FROM treatment_plan_entry
          WHERE plan_id = $1 AND status != 'Invoiced'
        `;
        const allInvoicedResult = await client.query(allInvoicedQuery, [plan_id]);
        if (allInvoicedResult.rows[0].all_invoiced) {
          const updatePlanQuery = `
            UPDATE treatment_plan_header
            SET status = 'Completed',
            updated_at = CURRENT_TIMESTAMP
            WHERE plan_id = $1
          `;
          await client.query(updatePlanQuery, [plan_id]);
        }
        
        }

        

      }
    }
    
    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: invoice,
      message: 'Invoice created successfully'
    });

    await logActivity('create', 'invoice', req.user?.username || 'unknown', '127.0.0.1',
      JSON.stringify({ details: `Created : ${patient_id}, ${plan_id}, ${plan_mode}, ${JSON.stringify(charges)}`,
        status: 'success', endpoint: '/billing/invoice'}));
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating invoice:', error);
    
    res.status(500).json({
      success: false,
      message: 'Error creating invoice'
    });
  } finally {
    client.release();
  }
});

// Update invoice [THIS ENDPOINT NO LONGER IN USE]
router.put('/invoices/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const {
      patient_id,
      dentist_id,
      plan_mode,
      charges = []
    } = req.body;

    // Validate required fields (align with POST)
    if (!patient_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'patient_id is required'
      });
    }

    // Calculate total estimated amount from charges (align with POST)
    let totalEstimated = 0;
    if (charges && charges.length > 0) {
      for (const charge of charges) {
        if (charge.estimated_amount) {
          totalEstimated += parseFloat(charge.estimated_amount);
        } else {
          // Get service details to calculate amount
          const serviceQuery = 'SELECT fixed_price, base_price_min, base_price_max FROM service WHERE id = $1';
          const serviceResult = await client.query(serviceQuery, [charge.service_id]);
          if (serviceResult.rows.length > 0) {
            const service = serviceResult.rows[0];
            const amount = service.fixed_price ||
                          ((service.base_price_min + service.base_price_max) / 2) ||
                          0;
            totalEstimated += parseFloat(amount);
          }
        }
      }
    }

    // Calculate net amount due (align with POST logic)
    const netAmountDue = totalEstimated;

    // Update invoice
    const updateQuery = `
      UPDATE invoice
      SET plan_mode = $1,
          total_amount_estimated = $2,
          net_amount_due = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `;

    const invoiceResult = await client.query(updateQuery, [
      plan_mode,
      totalEstimated,
      netAmountDue,
      id
    ]);

    if (invoiceResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    const invoice = invoiceResult.rows[0];
    // Update charges (align with POST pattern)
    if (charges && charges.length > 0) {
      // First, delete existing charges for this invoice
      await client.query('DELETE FROM treatment_charge WHERE invoice_id = $1', [id]);

      // Insert new charges
      for (const charge of charges) {
        // Validate service_id exists
        if (!charge.service_id || charge.service_id <= 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            message: `Invalid service_id: ${charge.service_id}. Service ID must be a positive number.`
          });
        }

        // Check if service exists
        const serviceCheck = await client.query('SELECT id FROM service WHERE id = $1', [charge.service_id]);
        if (serviceCheck.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            success: false,
            message: `Service with ID ${charge.service_id} does not exist.`
          });
        }

        // Get service details if amount not provided (align with POST)
        let finalAmount = charge.estimated_amount;
        if (!finalAmount) {
          const serviceQuery = 'SELECT fixed_price, base_price_min, base_price_max FROM service WHERE id = $1';
          const serviceResult = await client.query(serviceQuery, [charge.service_id]);
          if (serviceResult.rows.length > 0) {
            const service = serviceResult.rows[0];
            finalAmount = service.fixed_price ||
                         ((service.base_price_min + service.base_price_max) / 2) ||
                         0;
          }
        }
        const chargeQuery = `
          INSERT INTO treatment_charge (invoice_id, plan_id, service_id, estimated_amount, notes, status)
          VALUES ($1, $2, $3, $4, $5, 'pending')
        `;

        await client.query(chargeQuery, [          
          invoice.id,
          charge.plan_id || null,
          charge.service_id,
          finalAmount,
          charge.notes || null
        ]);

      }
    }


    await client.query('COMMIT');

    res.json({
      success: true,
      data: invoice,
      message: 'Invoice updated successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating invoice'
    });
  } finally {
    client.release();
  }
});

// Get adjustment logs for invoice
router.get('/invoices/:id/adjustments', async (req, res) => {
  try {
    const { id } = req.params;

    // Verify invoice exists
    const invoiceCheck = await pool.query('SELECT id FROM invoice WHERE id = $1', [id]);
    if (invoiceCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    const query = `
      SELECT
        al.id as adjustment_id,
        al.invoice_id,
        al.type,
        al.amount,
        al.note,
        al.created_by,
        al.created_at,
        u.first_name || ' ' || u.last_name as created_by_name
      FROM adjustment_log al
      LEFT JOIN user_info u ON al.created_by = u.username
      WHERE al.invoice_id = $1
      ORDER BY al.created_at DESC
    `;

    const result = await pool.query(query, [id]);

    // Convert amount strings to numbers
    const processedData = result.rows.map(row => ({
      ...row,
      amount: parseFloat(row.amount) || 0
    }));


    res.json({
      success: true,
      data: processedData
    });


  } catch (error) {
    console.error('Error fetching adjustments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching adjustments'
    });
  }
});

// Apply adjustment to invoice
router.post('/invoices/:id/adjustments', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { type, amount, note } = req.body;
    
    // Validate required fields
    if (!type || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Type and amount are required'
      });
    }

    // Validate adjustment type
    const validTypes = ['discount', 'write-off', 'refund'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid adjustment type. Must be one of: discount, write-off, refund'
      });
    }

    // Validate amount
    const adjustmentAmount = parseFloat(amount);
    if (isNaN(adjustmentAmount) || adjustmentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number'
      });
    }

    // Verify invoice exists and get current status
    const invoiceQuery = 'SELECT * FROM invoice WHERE id = $1';
    const invoiceResult = await client.query(invoiceQuery, [id]);

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    const invoice = invoiceResult.rows[0];

    // Get user ID from request (assuming it's set by authentication middleware)
    const createdBy = (req as any).user?.userId || (req as any).user?.id || 1; // Default to 1 if not available

    // Insert adjustment log
    const adjustmentQuery = `
      INSERT INTO adjustment_log (invoice_id, type, amount, note, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const adjustmentResult = await client.query(adjustmentQuery, [
      id,
      type,
      adjustmentAmount,
      note || null,
      createdBy
    ]);

    const adjustment = adjustmentResult.rows[0];

    // Update invoice based on adjustment type
    let updateQuery = '';
    let updateParams: any[] = [];

    switch (type) {
      case 'discount':
        updateQuery = `
          UPDATE invoice
          SET discount_amount = discount_amount + $1,
              final_amount = final_amount - $1,
              net_amount_due = GREATEST(0, net_amount_due - $1),
              status = CASE
                WHEN net_amount_due - $1 <= 0 THEN 'paid'
                ELSE status
              END,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING *
        `;
        updateParams = [adjustmentAmount, id];
        break;

      case 'write-off':
        updateQuery = `
          UPDATE invoice
          SET writeoff_amount = writeoff_amount + $1,
              final_amount = final_amount - $1,
              net_amount_due = GREATEST(0, net_amount_due - $1),
              status = CASE
                WHEN net_amount_due - $1 <= 0 THEN 'paid'
                ELSE status
              END,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING *
        `;
        updateParams = [adjustmentAmount, id];
        break;

      case 'refund':
        // For refunds, we might need to handle payment records
        // This is a simplified implementation
        updateQuery = `
          UPDATE invoice
          SET net_amount_due = net_amount_due + $1,
              final_amount = final_amount + $1,
              status = CASE
                WHEN net_amount_due + $1 > 0 THEN 'pending'
                WHEN net_amount_due + $1 <= 0 THEN 'paid'
                ELSE status
              END,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING *
        `;
        updateParams = [adjustmentAmount, id];
        break;
    }

    const updateResult = await client.query(updateQuery, updateParams);
    const updatedInvoice = updateResult.rows[0];

    // Log the adjustment in audit log
    const auditQuery = `
      INSERT INTO audit_log (entity, entity_id, action, user_id, new_data)
      VALUES ($1, $2, $3, $4, $5)
    `;

    await client.query(auditQuery, [
      'invoice',
      id,
      `adjustment_${type}`,
      createdBy,
      {
        adjustment_id: adjustment.id,
        type,
        amount: adjustmentAmount,
        note,
        previous_net_amount: invoice.net_amount_due,
        new_net_amount: updatedInvoice.net_amount_due
      }
    ]);

    await client.query('COMMIT');

    

    res.status(201).json({
      success: true,
      data: {
        adjustment: {
          ...adjustment,
          amount: parseFloat(adjustment.amount) || 0,
          created_by_name: (req as any).user?.full_name || 'System'
        },
        invoice: {
          ...updatedInvoice,
          net_amount_due: parseFloat(updatedInvoice.net_amount_due) || 0,
          discount_amount: parseFloat(updatedInvoice.discount_amount) || 0,
          writeoff_amount: parseFloat(updatedInvoice.writeoff_amount) || 0
        }
      },
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} applied successfully`
    });


  await logActivity('create', 'invoice', req.user?.username || 'unknown', '127.0.0.1',
      JSON.stringify({ details: `invoice adjustment : ${id}, ${type}, ${amount}, ${note}`,
        status: 'success', endpoint: '/billing/invoices/:id/adjustments'}));

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error applying adjustment:', error);
    res.status(500).json({
      success: false,
      message: 'Error applying adjustment'
    });
  } finally {
    client.release();
  }
});

// Get revenue report
router.get('/reports/revenue', async (req, res) => {
  try {
    const { start_date, end_date, group_by = 'month' } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'start_date and end_date are required'
      });
    }

    let groupByClause = '';
    let selectClause = '';

    switch (group_by) {
      case 'day':
        groupByClause = 'DATE(i.created_at)';
        selectClause = 'DATE(i.created_at) as period';
        break;
      case 'month':
        groupByClause = 'DATE_TRUNC(\'month\', i.created_at)';
        selectClause = 'DATE_TRUNC(\'month\', i.created_at) as period';
        break;
      case 'year':
        groupByClause = 'DATE_TRUNC(\'year\', i.created_at)';
        selectClause = 'DATE_TRUNC(\'year\', i.created_at) as period';
        break;
      default:
        groupByClause = 'DATE_TRUNC(\'month\', i.created_at)';
        selectClause = 'DATE_TRUNC(\'month\', i.created_at) as period';
    }

    // const query = `
    //   SELECT 
    //     ${selectClause},
    //     COUNT(DISTINCT i.id) as invoice_count,
    //     SUM(COALESCE(paid.total_paid, 0) + COALESCE(installment_paid.total_installment_paid, 0)) as total_revenue,  -- Actual revenue from payments + installments
    //     SUM(COALESCE(paid.total_paid, 0) + COALESCE(installment_paid.total_installment_paid, 0)) as total_paid,
    //     SUM(COALESCE(i.final_amount, i.total_amount_estimated) - COALESCE(paid.total_paid, 0) - COALESCE(installment_paid.total_installment_paid, 0)) as total_outstanding
    //   FROM invoice i
    //   LEFT JOIN (
    //     SELECT 
    //       invoice_id, 
    //       SUM(amount_paid) as total_paid 
    //     FROM payment 
    //     GROUP BY invoice_id
    //   ) paid ON i.id = paid.invoice_id
    //   LEFT JOIN (
    //     SELECT 
    //       inst.invoice_id,
    //       SUM(COALESCE(inst_pay.amount, 0)) as total_installment_paid
    //     FROM installment inst
    //     LEFT JOIN installment_payment inst_pay ON inst.id = inst_pay.installment_id
    //     GROUP BY inst.invoice_id
    //   ) installment_paid ON i.id = installment_paid.invoice_id
    //   WHERE 1=1
    //   AND i.created_at >= $1 AND i.created_at <= $2
    //   GROUP BY ${groupByClause}
    //   ORDER BY period ASC
    // `;


const query = `
      SELECT
      ${selectClause},
      COUNT(DISTINCT i.id) AS invoice_count,
      SUM(COALESCE(paid.total_paid, 0) + COALESCE(installment_paid.total_installment_paid, 0)) AS total_revenue,
      SUM(COALESCE(paid.total_paid, 0) + COALESCE(installment_paid.total_installment_paid, 0)) AS total_paid,
      SUM(
        COALESCE(i.final_amount, i.total_amount_estimated)
        - COALESCE(paid.total_paid, 0)
        - COALESCE(installment_paid.total_installment_paid, 0)
      ) AS total_outstanding
    FROM invoice i
    LEFT JOIN (
      SELECT
        invoice_id,
        SUM(amount_paid) AS total_paid
      FROM payment
      GROUP BY invoice_id
    ) paid ON i.id = paid.invoice_id
    LEFT JOIN (
      SELECT
        inst.invoice_id,
        SUM(COALESCE(inst_pay.amount, 0)) AS total_installment_paid
      FROM installment inst
      LEFT JOIN installment_payment inst_pay ON inst.id = inst_pay.installment_id
      GROUP BY inst.invoice_id
    ) installment_paid ON i.id = installment_paid.invoice_id
    WHERE
      i.created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')  -- first day of last month
      AND i.created_at <= CURRENT_DATE  -- today
    GROUP BY ${groupByClause}
    ORDER BY period ASC;
    `;

    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      data: {
        report: result.rows[0],
        summary: {
          total_invoices: result.rows[0]?.invoice_count || 0,
          total_revenue: result.rows[0]?.total_revenue || 0,
          total_paid: result.rows[0]?.total_paid || 0,
          total_outstanding: result.rows[0]?.total_outstanding || 0
        }
      }
    });
  } catch (error) {
    console.error('Error generating revenue report:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to generate revenue report'
    });
  }
});

// Get all payments with pagination and filters
router.get('/payments', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, method, start_date, end_date, invoice_id } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let whereClause = '';
    const params: any[] = [];
    let paramIndex = 1;

    // Build where clause dynamically
    const conditions = [];
    
    if (status && status !== 'all') {
      conditions.push(`i.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (method && method !== 'all') {
      conditions.push(`p.method = $${paramIndex}`);
      params.push(method);
      paramIndex++;
    }

    if (start_date) {
      conditions.push(`p.payment_date >= $${paramIndex}`);
      params.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      conditions.push(`p.payment_date <= $${paramIndex}`);
      params.push(end_date);
      paramIndex++;
    }

    if (invoice_id) {
      conditions.push(`p.invoice_id = $${paramIndex}`);
      params.push(invoice_id);
      paramIndex++;
    }

    if (conditions.length > 0) {
      whereClause = ` WHERE ${conditions.join(' AND ')}`;
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM payment p
      LEFT JOIN invoice i ON p.invoice_id = i.id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated payments
    // const query = `
    //   SELECT
    //     p.id as payment_id,
    //     i.id as invoice_id,
    //     i.invoice_code,
    //     p.amount_paid,
    //     p.method,
    //     p.transaction_ref,
    //     p.proof_of_payment,
    //     p.payment_date,
    //     i.patient_id,
    //     pt.first_name || ' ' || pt.last_name as patient_name,
    //     i.net_amount_due as invoice_amount,
    //     i.status as invoice_status
    //   FROM payment p
    //   LEFT JOIN invoice i ON p.invoice_id = i.id
    //   LEFT JOIN patient pt ON i.patient_id = pt.id
    //   ${whereClause}
    //   ORDER BY p.payment_date DESC
    //   LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    // `;

    const query = `
    with all_payments as (
                      SELECT 
                        'Direct Payment'::varchar AS payment_type,
                        p.id as payment_id,
                        p.invoice_id,
                        p.amount_paid,
                        p.method,
                        p.transaction_ref,
                        p.proof_of_payment,
                        p.payment_date,
                        NULL as installment_id,
                        NULL as notes,
                        case when p.received_amount is null then p.amount_paid else p.received_amount end as received_amount,
		                    p.change_amount
                      FROM payment p

                      UNION ALL      

                      SELECT 
                        'Installment'::varchar AS payment_type,
                        ip.id as payment_id,
                        i.invoice_id,
                        ip.amount as amount_paid,
                        ip.method,
                        ip.transaction_ref,
                        ip.proof_of_payment,
                        ip.payment_date,
                        ip.installment_id,
                        ip.notes,
                        ip.amount as received_amount,
		                    0::integer as change_amount
                      FROM installment_payment ip
                      JOIN installment i ON ip.installment_id = i.id      
                      ORDER BY payment_date DESC
      )
      select ap.*,
      i.invoice_code,
      pt.first_name || ' ' || pt.last_name as patient_name
      from all_payments ap
      LEFT JOIN invoice i ON ap.invoice_id = i.id
      LEFT JOIN patient pt ON i.patient_id = pt.id
      ${whereClause}
      ORDER BY ap.payment_date DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(Number(limit), offset);
    const result = await pool.query(query, params);
    
    // Convert amount strings to numbers
    const processedData = result.rows.map(row => ({
      ...row,
      amount_paid: parseFloat(row.amount_paid) || 0,
      invoice_amount: parseFloat(row.invoice_amount) || 0
    }));

    res.json({
      success: true,
      data: processedData,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payments'
    });
  }
});

// Get payments for a specific invoice
router.get('/invoices/:id/payments', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        'payment' as payment_type,
        p.id as payment_id,
        p.invoice_id,
        p.amount_paid,
        p.method,
        p.transaction_ref,
        p.proof_of_payment,
        p.payment_date,
        NULL as installment_id,
        NULL as notes,
		    case when p.received_amount is null then p.amount_paid else p.received_amount end as received_amount,
		    p.change_amount
      FROM payment p
      WHERE p.invoice_id = $1
      
      UNION ALL
      
      SELECT 
        'installment' as payment_type,
        ip.id as payment_id,
        i.invoice_id,
        ip.amount as amount_paid,
        ip.method,
        ip.transaction_ref,
        ip.proof_of_payment,
        ip.payment_date,
        ip.installment_id,
        ip.notes,
		    ip.amount as received_amount,
		    0::integer as change_amount
      FROM installment_payment ip
      JOIN installment i ON ip.installment_id = i.id
      WHERE i.invoice_id = $1
      
      ORDER BY payment_date DESC
    `;

    const result = await pool.query(query, [id]);

    // Convert amount strings to numbers
    const processedData = result.rows.map(row => ({
      ...row,
      amount_paid: parseFloat(row.amount_paid) || 0
    }));


    res.json({
      success: true,
      data: processedData
    });
  } catch (error) {
    console.error('Error fetching payments for invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payments for invoice'
    });
  }
});

// Create new payment
router.post('/payments', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      invoice_id,
      amount_paid,
      received_amount,
      change_amount,
      method,
      transaction_ref,
      proof_of_payment
    } = req.body;
    
    // Validate required fields
    if (!invoice_id || !amount_paid || !method) {
      return res.status(400).json({
        success: false,
        message: 'invoice_id, amount_paid, and method are required'
      });
    }

    // Validate payment method
    const validMethods = ['Bank Transfer', 'Cash'];
    if (!validMethods.includes(method)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment method. Must be one of: Bank Transfer, Cash'
      });
    }

    // Validate payment amount
    const paymentAmount = parseFloat(amount_paid);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount must be a positive number'
      });
    }

    // Get current invoice details
    const invoiceQuery = `
      SELECT id, final_amount, net_amount_due, status
      FROM invoice
      WHERE id = $1
    `;
    const invoiceResult = await client.query(invoiceQuery, [invoice_id]);

    if (invoiceResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    const invoice = invoiceResult.rows[0];
    const currentNetAmountDue = parseFloat(invoice.net_amount_due) || 0;
    const finalAmount = parseFloat(invoice.final_amount) || 0;

    // Validate payment doesn't exceed remaining balance
    if (paymentAmount > currentNetAmountDue) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Payment amount (${paymentAmount}) cannot exceed remaining balance (${currentNetAmountDue})`
      });
    }

    // Insert payment
    const paymentQuery = `
      INSERT INTO payment (invoice_id, amount_paid, received_amount, change_amount, method, transaction_ref, proof_of_payment)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const paymentResult = await client.query(paymentQuery, [
      invoice_id,
      paymentAmount,
      received_amount,
      change_amount,
      method,
      transaction_ref,
      proof_of_payment
    ]);

    const payment = paymentResult.rows[0];

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
    const totalPaidResult = await client.query(totalPaidQuery, [invoice_id]);
    const totalPaid = parseFloat(totalPaidResult.rows[0].combined_total_paid) || 0;

    // Calculate new net_amount_due = final_amount - total_amount_paid
    const newNetAmountDue = Math.max(0, finalAmount - totalPaid);
    
    // Determine new invoice status
    const newStatus = newNetAmountDue <= 0 ? 'paid' : 'unpaid';

    // Update invoice with new net_amount_due and status
    const updateInvoiceQuery = `
      UPDATE invoice
      SET net_amount_due = $1,
          status = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;

    const updatedInvoiceResult = await client.query(updateInvoiceQuery, [
      newNetAmountDue,
      newStatus,
      invoice_id
    ]);
    
    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: {
        payment: {
          ...payment,
          amount_paid: parseFloat(payment.amount_paid) || 0
        },
        invoice_update: {
          net_amount_due: newNetAmountDue,
          status: newStatus,
          total_paid: totalPaid
        }
      },
      message: 'Payment recorded successfully'
    });


  await logActivity('create', 'payments', req.user?.username || 'unknown', '127.0.0.1',
      JSON.stringify({ details: `payments : ${invoice_id},${amount_paid},${received_amount},${change_amount},${method},${transaction_ref},${proof_of_payment} `,
        status: 'success', endpoint: '/billing/payments'}));

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating payment'
    });
  } finally {
    client.release();
  }
});

// Upload payment proof
router.post('/payments/:id/proof', async (req, res) => {
  try {
    const { id } = req.params;
    const { proof_of_payment } = req.body;

    if (!proof_of_payment) {
      return res.status(400).json({
        success: false,
        message: 'proof_of_payment is required'
      });
    }

    const query = `
      UPDATE payment 
      SET proof_of_payment = $1
      WHERE id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [proof_of_payment, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }


    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error uploading payment proof:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading payment proof'
    });
  }
});

// Services endpoints
// Get all services
router.get('/services', async (req, res) => {
  try {
    const query = `
      SELECT 
        id as service_id,
        service_name,
        fixed_price,
        base_price_min,
        base_price_max,
        default_notes,
        service_time,
        created_at,
        tooth_options
      FROM service
      ORDER BY service_name ASC
    `;

    const result = await pool.query(query);

    // Convert price strings to numbers
    const processedData = result.rows.map(row => ({
      ...row,
      fixed_price: row.fixed_price ? parseFloat(row.fixed_price) : null,
      base_price_min: row.base_price_min ? parseFloat(row.base_price_min) : null,
      base_price_max: row.base_price_max ? parseFloat(row.base_price_max) : null,
      service_time: row.service_time ? parseInt(row.service_time) : null,
      tooth_options: parseToothOptions(row.tooth_options)
    }));

    res.json({
      success: true,
      data: processedData
    });
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching services'
    });
  }
});

// Get single service
router.get('/services/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        id as service_id,
        service_name,
        fixed_price,
        base_price_min,
        base_price_max,
        default_notes,
        service_time,
        created_at,
        tooth_options
      FROM service
      WHERE id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Convert price strings to numbers
    const service = {
      ...result.rows[0],
      fixed_price: result.rows[0].fixed_price ? parseFloat(result.rows[0].fixed_price) : null,
      base_price_min: result.rows[0].base_price_min ? parseFloat(result.rows[0].base_price_min) : null,
      base_price_max: result.rows[0].base_price_max ? parseFloat(result.rows[0].base_price_max) : null,
      service_time: result.rows[0].service_time ? parseInt(result.rows[0].service_time) : null,
      tooth_options: parseToothOptions(result.rows[0].tooth_options)
    };

    

    res.json({
      success: true,
      data: service
    });
  } catch (error) {
    console.error('Error fetching service:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching service'
    });
  }
});

// Create new service
router.post('/services', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      service_name,
      fixed_price,
      base_price_min,
      base_price_max,
      default_notes,
      service_time,
      tooth_options
    } = req.body;

    // Validate required fields
    if (!service_name) {
      return res.status(400).json({
        success: false,
        message: 'service_name is required'
      });
    }

    // Validate pricing - either fixed_price OR price range
    if (fixed_price) {
      if (base_price_min || base_price_max) {
        return res.status(400).json({
          success: false,
          message: 'Cannot have both fixed_price and price range'
        });
      }
    } else {
      if (!base_price_min || !base_price_max) {
        return res.status(400).json({
          success: false,
          message: 'Either fixed_price OR both base_price_min and base_price_max are required'
        });
      }
    }

    const query = `
      INSERT INTO service (service_name, fixed_price, base_price_min, base_price_max, default_notes, service_time, tooth_options)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id as service_id, service_name, fixed_price, base_price_min, base_price_max, default_notes, service_time, created_at, tooth_options
    `;

    const result = await pool.query(query, [
      service_name,
      fixed_price || null,
      base_price_min || null,
      base_price_max || null,
      default_notes || null,
      service_time || null,
      tooth_options ? JSON.stringify(tooth_options) : null
    ]);

    // Convert price strings to numbers and process tooth_options
    const newService = {
      ...result.rows[0],
      fixed_price: result.rows[0].fixed_price ? parseFloat(result.rows[0].fixed_price) : null,
      base_price_min: result.rows[0].base_price_min ? parseFloat(result.rows[0].base_price_min) : null,
      base_price_max: result.rows[0].base_price_max ? parseFloat(result.rows[0].base_price_max) : null,
      service_time: result.rows[0].service_time ? parseInt(result.rows[0].service_time) : null,
      tooth_options: parseToothOptions(result.rows[0].tooth_options)
    };

    res.status(201).json({
      success: true,
      data: newService
    });


    await logActivity('create', 'service', req.user?.username || 'unknown', '127.0.0.1',
      JSON.stringify({ details: `service : ${service_name},${fixed_price},${base_price_min},${base_price_max},${default_notes},${service_time},${tooth_options} `,
        status: 'success', endpoint: '/billing/services'}));


  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating service'
    });
  }
});

// Update service
router.put('/services/:id', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      service_name,
      fixed_price,
      base_price_min,
      base_price_max,
      default_notes,
      service_time,
      tooth_options
    } = req.body;

    console.log('Update service payload:', req.body);

    // Validate pricing if provided
    if (fixed_price && (base_price_min || base_price_max)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot have both fixed_price and price range'
      });
    }

    const query = `
      UPDATE service 
      SET 
        service_name = COALESCE($1, service_name),
        fixed_price = $2,
        base_price_min = $3,
        base_price_max = $4,
        default_notes = COALESCE($5, default_notes),
        service_time = $6,
        tooth_options = $7
      WHERE id = $8
      RETURNING id as service_id, service_name, fixed_price, base_price_min, base_price_max, default_notes, service_time, created_at, tooth_options
    `;

    const result = await pool.query(query, [
      service_name,
      fixed_price || null,
      base_price_min || null,
      base_price_max || null,
      default_notes,
      service_time || null,
      tooth_options ? JSON.stringify(tooth_options) : null,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Convert price strings to numbers and process tooth_options
    const updatedService = {
      ...result.rows[0],
      fixed_price: result.rows[0].fixed_price ? parseFloat(result.rows[0].fixed_price) : null,
      base_price_min: result.rows[0].base_price_min ? parseFloat(result.rows[0].base_price_min) : null,
      base_price_max: result.rows[0].base_price_max ? parseFloat(result.rows[0].base_price_max) : null,
      service_time: result.rows[0].service_time ? parseInt(result.rows[0].service_time) : null,
      tooth_options: parseToothOptions(result.rows[0].tooth_options)
    };

    

    res.json({
      success: true,
      data: updatedService
    });

    await logActivity('update', 'service', req.user?.username || 'unknown', '127.0.0.1',
      JSON.stringify({ details: `service : ${id},${service_name},${fixed_price},${base_price_min},${base_price_max},${default_notes},${service_time},${tooth_options} `,
        status: 'success', endpoint: `/billing/services/${id}`}));



  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating service'
    });
  }
});

// Delete service
router.delete('/services/:id', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if service is used in any treatment charges
    const checkQuery = `
      SELECT COUNT(*) as count 
      FROM treatment_charge 
      WHERE service_id = $1
    `;
    const checkResult = await pool.query(checkQuery, [id]);

    if (parseInt(checkResult.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete service that is used in treatment charges'
      });
    }

    const query = `
      DELETE FROM service 
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    

    res.json({
      success: true,
      message: 'Service deleted successfully'
    });

await logActivity('delete', 'service', req.user?.username || 'unknown', '127.0.0.1',
      JSON.stringify({ details: `service : ${id}`,
        status: 'success', endpoint: `/billing/services/${id}`}));

  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting service'
    });
  }
});

// Get payment methods report
router.get('/reports/payment-methods', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'start_date and end_date are required'
      });
    }

    const query = `
      SELECT 
        p.method as payment_method,
        COUNT(p.id) as transaction_count,
        SUM(p.amount_paid) as total_amount
      FROM payment p
      WHERE p.payment_date >= $1 AND p.payment_date <= $2
      GROUP BY p.method
      ORDER BY total_amount DESC
    `;

    const result = await pool.query(query, [start_date, end_date]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error generating payment method stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate payment method statistics'
    });
  }
});

// Installments endpoints
// Get installments for a specific invoice
router.get('/invoices/:id/installments', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        id as installment_id,
        invoice_id,
        due_date,
        amount_due,
        amount_paid,
        status,
        created_at
      FROM installment
      WHERE invoice_id = $1
      ORDER BY due_date ASC
    `;

    const result = await pool.query(query, [id]);

    // Convert amount strings to numbers
    const processedData = result.rows.map(row => ({
      ...row,
      amount_due: parseFloat(row.amount_due) || 0,
      amount_paid: parseFloat(row.amount_paid) || 0
    }));


    res.json({
      success: true,
      data: processedData
    });
  } catch (error) {
    console.error('Error fetching installments for invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching installments for invoice'
    });
  }
});

// Create installment for an invoice
router.post('/invoices/:id/installments', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { due_date, amount_due } = req.body;
    
    // Validate required fields
    if (!due_date || !amount_due) {

      return res.status(400).json({
        success: false,
        message: 'due_date and amount_due are required'
      });
    }


    // Validate that the invoice exists
    const invoiceCheck = await pool.query('SELECT id as invoice_id FROM invoice WHERE id = $1', [id]);

    
    if (invoiceCheck.rows.length === 0) {

      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    
    const query = `
      INSERT INTO installment (invoice_id, due_date, amount_due, amount_paid, status)
      VALUES ($1, $2, $3, 0, 'pending')
      RETURNING *
    `;

    const result = await pool.query(query, [id, due_date, amount_due]);
    

    // Convert amount strings to numbers
    const installment = {
      ...result.rows[0],
      amount_due: parseFloat(result.rows[0].amount_due) || 0,
      amount_paid: parseFloat(result.rows[0].amount_paid) || 0
    };


    res.status(201).json({
      success: true,
      data: installment
    });

  await logActivity('create', 'installment', req.user?.username || 'unknown', '127.0.0.1',
      JSON.stringify({ details: `installment : ${id},${due_date},${amount_due} `,
        status: 'success', endpoint: `/billing/invoices/${id}/installments`}));


  } catch (error) {
    console.error('Error creating installment:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating installment'
    });
  }
});

// Create multiple installments for an invoice
router.post('/installments', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { invoice_id, installments } = req.body;

    // Validate required fields
    if (!invoice_id || !installments || !Array.isArray(installments)) {
      return res.status(400).json({
        success: false,
        message: 'invoice_id and installments array are required'
      });
    }

    // Validate that the invoice exists
    const invoiceCheck = await client.query('SELECT id as invoice_id FROM invoice WHERE id = $1', [invoice_id]);
    if (invoiceCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    const createdInstallments = [];

    for (const installment of installments) {
      if (!installment.due_date || !installment.amount_due) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Each installment must have due_date and amount_due'
        });
      }

      const query = `
        INSERT INTO installment (invoice_id, due_date, amount_due, amount_paid, status)
        VALUES ($1, $2, $3, 0, 'pending')
        RETURNING *
      `;

      const result = await client.query(query, [invoice_id, installment.due_date, installment.amount_due]);
      
      // Convert amount strings to numbers
      const processedInstallment = {
        ...result.rows[0],
        amount_due: parseFloat(result.rows[0].amount_due) || 0,
        amount_paid: parseFloat(result.rows[0].amount_paid) || 0
      };

      createdInstallments.push(processedInstallment);
    }

    await client.query('COMMIT');

    

    res.status(201).json({
      success: true,
      data: createdInstallments
    });

    await logActivity('create', 'installments', req.user?.username || 'unknown', '127.0.0.1',
      JSON.stringify({ details: `installments : ${invoice_id},${JSON.stringify(installments)}`,
        status: 'success', endpoint: `/billing/installments`}));

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating installments:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating installments'
    });
  } finally {
    client.release();
  }
});

// Update installment
router.put('/installments/:id', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { due_date, amount_due, amount_paid, status } = req.body;

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (due_date !== undefined) {
      updates.push(`due_date = $${paramIndex}`);
      values.push(due_date);
      paramIndex++;
    }

    if (amount_due !== undefined) {
      updates.push(`amount_due = $${paramIndex}`);
      values.push(amount_due);
      paramIndex++;
    }

    if (amount_paid !== undefined) {
      updates.push(`amount_paid = $${paramIndex}`);
      values.push(amount_paid);
      paramIndex++;
    }

    if (status !== undefined) {
      const validStatuses = ['pending', 'paid', 'overdue'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be one of: pending, paid, overdue'
        });
      }
      updates.push(`status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    values.push(id);

    const query = `
      UPDATE installment 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Installment not found'
      });
    }

    // Convert amount strings to numbers
    const installment = {
      ...result.rows[0],
      amount_due: parseFloat(result.rows[0].amount_due) || 0,
      amount_paid: parseFloat(result.rows[0].amount_paid) || 0
    };


    res.json({
      success: true,
      data: installment
    });

    await logActivity('create', 'installments', req.user?.username || 'unknown', '127.0.0.1',
      JSON.stringify({ details: `installments : ${id},${due_date},${amount_due},${amount_paid},${status} `,
        status: 'success', endpoint: `/billing/installments/${id}`}));

  } catch (error) {
    console.error('Error updating installment:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating installment'
    });
  }
});

// Delete installment
router.delete('/installments/:id', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const query = `
      DELETE FROM installment 
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Installment not found'
      });
    }

    res.json({
      success: true,
      message: 'Installment deleted successfully'
    });

    await logActivity('delete', 'installments', req.user?.username || 'unknown', '127.0.0.1',
      JSON.stringify({ details: `installments : ${id}`,
        status: 'success', endpoint: `/billing/installments/${id}`}));

  } catch (error) {
    console.error('Error deleting installment:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting installment'
    });
  }
});

// Record payment for installment
router.post('/installments/:id/payments', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { invoice_id, amount, method, transaction_ref, proof_of_payment, notes } = req.body;

    // Validate required fields
    if (!amount || !method) {
      return res.status(400).json({
        success: false,
        message: 'Amount and method are required'
      });
    }

    // Validate payment amount
    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount must be a positive number'
      });
    }

    // Validate payment method
    const validMethods = ['Cash', 'Bank Transfer', 'QR'];
    if (!validMethods.includes(method)) {
      return res.status(400).json({
        success: false,
        message: `Invalid payment method. Must be one of: ${validMethods.join(', ')}`
      });
    }


    // Check if installment exists and get current details
    const installmentQuery = `
      SELECT * FROM installment WHERE id = $1
    `;
    const installmentResult = await client.query(installmentQuery, [id]);

    if (installmentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Installment not found'
      });
    }

    const installment = installmentResult.rows[0];
    const currentPaid = parseFloat(installment.amount_paid) || 0;
    const amountDue = parseFloat(installment.amount_due) || 0;
    const remainingBalance = amountDue - currentPaid;

    // Validate payment doesn't exceed remaining balance
    if (paymentAmount > remainingBalance) {
      return res.status(400).json({
        success: false,
        message: `Payment amount (${paymentAmount}) cannot exceed remaining balance (${remainingBalance})`
      });
    }

    // Insert payment record into installment_payment table
    const paymentQuery = `
      INSERT INTO installment_payment (installment_id, amount, method, transaction_ref, proof_of_payment, notes, payment_date)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const paymentResult = await client.query(paymentQuery, [
      id,
      paymentAmount,
      method,
      transaction_ref || null,
      proof_of_payment || null,
      notes || null
    ]);

    const payment = paymentResult.rows[0];

    // Update installment with new payment amount and status
    const newPaidAmount = currentPaid + paymentAmount;
    const newStatus = newPaidAmount >= amountDue ? 'paid' : 
                     new Date(installment.due_date) < new Date() ? 'overdue' : 'pending';

    const updateInstallmentQuery = `
      UPDATE installment 
      SET amount_paid = $1, status = $2
      WHERE id = $3
      RETURNING *
    `;

    const updatedInstallment = await client.query(updateInstallmentQuery, [
      newPaidAmount,
      newStatus,
      id
    ]);



    /**
     * Now, we need to update the associated invoice's net_amount_due and status
     * based on the total payments made (including this installment payment).
     */

    // Get current invoice details
    const invoiceQuery = `
      SELECT id, final_amount, net_amount_due, status
      FROM invoice
      WHERE id = $1
    `;
    const invoiceResult = await client.query(invoiceQuery, [invoice_id]);

    if (invoiceResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    const invoice = invoiceResult.rows[0];
    const currentNetAmountDue = parseFloat(invoice.net_amount_due) || 0;
    const finalAmount = parseFloat(invoice.final_amount) || 0;

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
    const totalPaidResult = await client.query(totalPaidQuery, [invoice_id]);
    const totalPaid = parseFloat(totalPaidResult.rows[0].combined_total_paid) || 0;

    // Calculate new net_amount_due = final_amount - total_amount_paid
    const newNetAmountDue = Math.max(0, finalAmount - totalPaid);


    // Determine new invoice status
    const newInvoiceStatus = newNetAmountDue <= 0 ? 'paid' : 'unpaid';

    // Update invoice with new net_amount_due and status
    const updateInvoiceQuery = `
      UPDATE invoice
      SET net_amount_due = $1,
          status = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;

    const updatedInvoiceResult = await client.query(updateInvoiceQuery, [
      newNetAmountDue,
      newInvoiceStatus,
      invoice_id
    ]);
    
    await client.query('COMMIT');

    // Convert amount strings to numbers for response
    const responsePayment = {
      ...payment,
      amount: parseFloat(payment.amount) || 0
    };


    res.status(201).json({
      success: true,
      data: responsePayment,
      message: 'Payment recorded successfully'
    });

    await logActivity('create', 'installments', req.user?.username || 'unknown', '127.0.0.1',
      JSON.stringify({ details: `installments : ${id},${invoice_id},${amount},${method},${transaction_ref},${proof_of_payment},${notes} `,
        status: 'success', endpoint: `/billing/installments/${id}/payments`}));


  } catch (error) {
    await client.query('ROLLBACK');
    console.error("ERROR STEP: Exception caught:", error);
    
    res.status(500).json({
      success: false,
      message: 'Error recording installment payment'
    });
  } finally {
    client.release();
  }
});

// Get payment history for installment
router.get('/installments/:id/payments', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify installment exists
    const installmentCheck = await pool.query('SELECT id FROM installment WHERE id = $1', [id]);
    if (installmentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Installment not found'
      });
    }

    const query = `
      SELECT 
        id as payment_id,
        installment_id,
        amount,
        method,
        transaction_ref,
        proof_of_payment,
        notes,
        payment_date,
        created_at
      FROM installment_payment
      WHERE installment_id = $1
      ORDER BY payment_date DESC
    `;
    
    const result = await pool.query(query, [id]);

    // Convert amount strings to numbers
    const processedData = result.rows.map(row => ({
      ...row,
      amount: parseFloat(row.amount) || 0
    }));

    res.json({
      success: true,
      data: processedData
    });
  } catch (error) {
    console.error('Error fetching installment payment history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching installment payment history'
    });
  }
});

// Get single treatment plan with its charges and service details
router.get('/treatment-plans/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the treatment plan with service details
    const planOptionQuery = `
      SELECT 
        tp.id as plan_id,
        tp.patient_id,
        tp.final_amount,
        tp.notes,
        tp.status
      FROM treatment_plan tp
      WHERE tp.id = $1
    `;

    const planResult = await pool.query(planOptionQuery, [id]);

    if (planResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Treatment plan not found' });
    }

    // Fetch the plan with service info (including treatment_plan fields)
    const planQuery = `
      SELECT  
		    tp.service_id,
        s.service_name,
        s.fixed_price,
        s.base_price_min,
        s.base_price_max,
        s.default_notes as service_notes,        
        tp.final_amount,
        tp.notes as plan_notes,
        tp.status as plan_status
      FROM treatment_plan tp
      LEFT JOIN service s ON s.id = tp.service_id
      WHERE tp.id = $1
    `;

    const chargesResult = await pool.query(planQuery, [id]);
        
    if (chargesResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Treatment plan service details not found' });
    }

    const planData = {
      ...chargesResult.rows[0],      
      final_amount: chargesResult.rows[0].final_amount != null ? parseFloat(chargesResult.rows[0].final_amount) : null,      
      fixed_price: chargesResult.rows[0].fixed_price != null ? parseFloat(chargesResult.rows[0].fixed_price) : null,
      base_price_min: chargesResult.rows[0].base_price_min != null ? parseFloat(chargesResult.rows[0].base_price_min) : null,
      base_price_max: chargesResult.rows[0].base_price_max != null ? parseFloat(chargesResult.rows[0].base_price_max) : null,
    };
    
    return res.json({
      success: true,
      data: planData
    });
  } catch (error) {
    console.error('Error fetching treatment plan details:', error);
    return res.status(500).json({ success: false, message: 'Error fetching treatment plan details' });
  }
});

// Create a new treatment plan (optionally with initial charges)
router.post('/treatment-plans', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { patient_id, notes, charges = [] } = req.body;

    if (!patient_id) {
      return res.status(400).json({ success: false, message: 'patient_id is required' });
    }

    const planInsert = `
      INSERT INTO treatment_plan (patient_id, status, notes)
      VALUES ($1, 'planned', $2)
      RETURNING id as plan_id, patient_id, status, notes
    `;
    const planResult = await client.query(planInsert, [patient_id, notes || null]);
    const plan = planResult.rows[0];

    const createdCharges: any[] = [];
    if (Array.isArray(charges) && charges.length > 0) {
      for (const c of charges) {
        if (!c.service_id) continue;
        const insertCharge = `
          INSERT INTO treatment_charge (plan_id, service_id, estimated_amount, status, notes)
          VALUES ($1, $2, $3, 'pending', $4)
          RETURNING id as charge_id, service_id, estimated_amount, final_amount, status, notes
        `;
        const insertRes = await client.query(insertCharge, [plan.plan_id, c.service_id, c.estimated_amount ?? null, c.notes || null]);
        createdCharges.push(insertRes.rows[0]);
      }
    }

    await client.query('COMMIT');

    await logActivity('create', 'treatment_plans', req.user?.username || 'unknown', '127.0.0.1',
      JSON.stringify({ details: `treatment_plans : ${plan.plan_id},${patient_id},${notes},${JSON.stringify(charges)} `,
        status: 'success', endpoint: `/billing/treatment-plans`}));


    return res.status(201).json({ success: true, data: { plan, charges: createdCharges }, message: 'Treatment plan created' });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating treatment plan:', error);
    return res.status(500).json({ success: false, message: 'Error creating treatment plan' });
  } finally {
    client.release();
  }
});

// Add a new charge to an existing treatment plan
router.post('/treatment-plans/:id/charges', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {

    const { id } = req.params;
    const { service_id, estimated_amount, notes } = req.body;
    
    if (!service_id) {
      return res.status(400).json({ success: false, message: 'service_id is required' });
    }

    // ensure plan exists
    const checkPlan = await pool.query('SELECT id FROM treatment_plan WHERE id = $1', [id]);
    if (checkPlan.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Treatment plan not found' });
    }

    const insertCharge = `
      INSERT INTO treatment_charge (plan_id, service_id, estimated_amount, status, notes)
      VALUES ($1, $2, $3, 'pending', $4)
      RETURNING id as charge_id, service_id, estimated_amount, final_amount, status, notes
    `;
    const result = await pool.query(insertCharge, [id, service_id, estimated_amount ?? null, notes || null]);
    const charge = result.rows[0];

    await logActivity('create', 'treatment_plans', req.user?.username || 'unknown', '127.0.0.1',
      JSON.stringify({ details: `treatment_plans : ${id},${service_id},${estimated_amount},${notes} `,
        status: 'success', endpoint: `/billing/treatment-plans/${id}/charges`}));

    return res.status(201).json({ success: true, data: charge, message: 'Charge added to treatment plan' });
  } catch (error) {
    console.error('Error adding treatment plan charge:', error);
    return res.status(500).json({ success: false, message: 'Error adding treatment plan charge' });
  }
});

// Get patient statistics
router.get('/reports/patient-stats', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let whereClause = '';
    const params: any[] = [];
    let paramIndex = 1;

    if (start_date) {
      whereClause += ` WHERE i.created_at >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      whereClause += whereClause ? ` AND i.created_at <= $${paramIndex}` : ` WHERE i.created_at <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }

    const query = `
      SELECT 
        COUNT(DISTINCT i.patient_id) as active_patients
      FROM invoice i
      JOIN patient p ON i.patient_id = p.id
      WHERE 1=1
      ${whereClause ? `AND ${whereClause.substring(7)}` : ''}
    `;
    
    const result = await pool.query(query, params);
    const stats = result.rows[0];
    

    res.json({
      success: true,
      data: {
        active_patients: parseInt(stats.active_patients) || 0,
      }
    });


  } catch (error) {
    console.error('Error generating patient stats report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate patient stats report'
    });
  }
});

// Get growth rate report (current vs previous period)
router.get('/reports/growth-rate', async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    // Calculate date ranges for current and previous periods
    const now = new Date();
    let currentStart, currentEnd, previousStart, previousEnd;

    switch (period) {
      case 'week':
        currentEnd = new Date(now);
        currentStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        previousEnd = new Date(currentStart);
        previousStart = new Date(currentStart.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        currentEnd = new Date(now);
        currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
        previousEnd = new Date(currentStart);
        previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        break;
      case 'quarter':
        const currentQuarter = Math.floor(now.getMonth() / 3);
        currentStart = new Date(now.getFullYear(), currentQuarter * 3, 1);
        currentEnd = new Date(now);
        previousStart = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
        previousEnd = new Date(currentStart);
        break;
      case 'year':
        currentStart = new Date(now.getFullYear(), 0, 1);
        currentEnd = new Date(now);
        previousStart = new Date(now.getFullYear() - 1, 0, 1);
        previousEnd = new Date(currentStart);
        break;
      default:
        currentEnd = new Date(now);
        currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
        previousEnd = new Date(currentStart);
        previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    }

    // Query for current period revenue
    // const currentQuery = `
    //   SELECT 
    //     COALESCE(SUM(COALESCE(i.final_amount, i.total_amount_estimated)), 0) as revenue
    //   FROM invoice i
    //   WHERE i.created_at >= $1 AND i.created_at <= $2
    // `;

    const currentQuery = `
      SELECT 
        COALESCE(SUM(
          CASE 
            WHEN i.status = 'paid' THEN COALESCE(i.final_amount, i.total_amount_estimated)
            ELSE COALESCE(paid.total_paid, 0)
          END
        ), 0) as revenue
      FROM invoice i
      LEFT JOIN (
        SELECT 
          invoice_id, 
          SUM(amount_paid) as total_paid 
        FROM payment 
        GROUP BY invoice_id
      ) paid ON i.id = paid.invoice_id
      WHERE i.created_at >= $1 AND i.created_at <= $2
    `;

    // Query for previous period revenue
    const previousQuery = `
      SELECT 
        COALESCE(SUM(COALESCE(i.final_amount, i.total_amount_estimated)), 0) as revenue
      FROM invoice i
      WHERE i.created_at >= $1 AND i.created_at <= $2
    `;

    const [currentResult, previousResult] = await Promise.all([
      pool.query(currentQuery, [currentStart.toISOString(), currentEnd.toISOString()]),
      pool.query(previousQuery, [previousStart.toISOString(), previousEnd.toISOString()])
    ]);

    const currentRevenue = parseFloat(currentResult.rows[0]?.revenue || 0);
    const previousRevenue = parseFloat(previousResult.rows[0]?.revenue || 0);

    // Calculate growth rate
    let growthRate = 0;
    if (previousRevenue > 0) {
      growthRate = ((currentRevenue - previousRevenue) / previousRevenue) * 100;
    } else if (currentRevenue > 0) {
      growthRate = 100; // 100% growth from 0
    }


    res.json({
      success: true,
      data: {
        growth_rate: parseFloat(growthRate.toFixed(2)),
        current_revenue: currentRevenue,
        previous_revenue: previousRevenue,
        period,
        current_period: {
          start: currentStart.toISOString(),
          end: currentEnd.toISOString()
        },
        previous_period: {
          start: previousStart.toISOString(),
          end: previousEnd.toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Error generating growth rate report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate growth rate report'
    });
  }
});



export default router;
