import express, { Request, Response } from 'express';
import { pool } from '../config/database';
import { logger } from '../utils/logger';
import { extractUser } from '../middleware/extractUser';
import { logActivity } from '../utils/activityLogger';

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

const router = express.Router();

// Get dashboard statistics
router.get('/dashboard/stats', async (req, res) => {
  try {
    // Get total items count
    const totalItemsQuery = 'SELECT COUNT(*) as total FROM items';
    const totalItemsResult = await pool.query(totalItemsQuery);
    const totalItems = parseInt(totalItemsResult.rows[0].total);

    // Get low stock items count
    const lowStockQuery = `
      SELECT 
      COUNT(*) AS total
      FROM (
          SELECT 
              i.item_id,
              COALESCE(SUM(sb.qty_available), 0) AS total_available,
              i.reorder_level
          FROM items i
          LEFT JOIN stock_batches sb ON i.item_id = sb.item_id
          GROUP BY i.item_id, i.reorder_level
          HAVING COALESCE(SUM(sb.qty_available), 0) <= i.reorder_level          
      ) AS low_stock_items;
    `;
    const lowStockResult = await pool.query(lowStockQuery);
    const lowStockItems = parseInt(lowStockResult.rows[0].total);

    // Get total suppliers count
    const totalSuppliersQuery = 'SELECT COUNT(*) as total FROM suppliers'; // WHERE active = true
    const totalSuppliersResult = await pool.query(totalSuppliersQuery);
    const totalSuppliers = parseInt(totalSuppliersResult.rows[0].total);

    // Get pending orders count
    const pendingOrdersQuery = "SELECT COUNT(*) as total FROM purchase_order WHERE status = 'Pending'";
    const pendingOrdersResult = await pool.query(pendingOrdersQuery);
    const pendingOrders = parseInt(pendingOrdersResult.rows[0].total);
    
    // Get recent activities (last 7 days)
    const recentActivitiesQuery = `
      (SELECT 'stock_in' as type, 
              'Stock added: ' || i.item_name || ' (+' || si.qty_added || ' units)' as message,
              si.created_at as time
       FROM stock_in si
       JOIN items i ON si.item_id = i.item_id
       WHERE si.created_at >= CURRENT_DATE - INTERVAL '7 days'
       ORDER BY si.created_at DESC
       LIMIT 5)
      UNION ALL
      (SELECT 'stock_out' as type,
              'Stock removed: ' || i.item_name || ' (-' || so.qty_released || ' units)' as message,
              soh.created_at as time
       FROM stock_out so
       JOIN stock_out_headers soh ON so.stock_out_id = soh.stock_out_id
       JOIN items i ON so.item_id = i.item_id
       WHERE soh.created_at >= CURRENT_DATE - INTERVAL '7 days'
       ORDER BY soh.created_at DESC
       LIMIT 5)
      ORDER BY time DESC
      LIMIT 10
    `;
    const recentActivitiesResult = await pool.query(recentActivitiesQuery);

    res.json({
      success: true,
      data: {
        totalItems,
        lowStockItems,
        totalSuppliers,
        pendingOrders,        
        recentActivities: recentActivitiesResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    //logger.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics'
    });
  }
});

// Get batch expiry alerts
router.get('/dashboard/batch-alerts', async (req, res) => {
  try {
    const query = `
      SELECT 
    sb.batch_id,
    sb.batch_no,
    i.item_name,
    sb.expiry_date,
    sb.qty_available,
    CASE 
      WHEN sb.expiry_date < CURRENT_DATE THEN 'expired'
      WHEN sb.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring-soon'
      ELSE 'good'
    END as status,
    CASE 
      WHEN sb.expiry_date < CURRENT_DATE THEN 0
      ELSE (sb.expiry_date - CURRENT_DATE)
    END as days_left
FROM stock_batches sb
JOIN items i ON sb.item_id = i.item_id
WHERE sb.qty_available > 0
  AND (sb.expiry_date <= CURRENT_DATE + INTERVAL '60 days')
  AND sb.expiry_date IS NOT NULL
ORDER BY 
    CASE 
      WHEN sb.expiry_date < CURRENT_DATE THEN 1
      WHEN sb.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 2
      ELSE 3
    END,
    sb.expiry_date ASC
LIMIT 10;
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching batch alerts:', error);
    //logger.error('Error fetching batch alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching batch alerts'
    });
  }
});

// Get all inventory items with pagination and filters
router.get('/items', async (req, res) => {
  try {
    console.log('Fetching inventory with params:', req.query);
    const { page = 1, limit = 10, search, category, low_stock } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (item_name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (category) {
      whereClause += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (low_stock === 'true') {
      whereClause += ` AND quantity_in_stock <= reorder_level`;
    }

    // Get total count
    const countQuery = `
      WITH item_stock AS (
          SELECT 
              i.item_id,
              COALESCE(SUM(sb.qty_available), 0) AS total_available,
              i.reorder_level
          FROM items i
          LEFT JOIN stock_batches sb ON i.item_id = sb.item_id
          GROUP BY i.item_id, i.reorder_level
      )
      SELECT COUNT(*) AS total
      FROM item_stock
      ${whereClause};`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated inventory
    const query = `
        SELECT
        i.item_id,
        i.item_code,
        i.item_name,
        c.category_id,
        c.category_name,
        s.supplier_id,
		    s.supplier_name,
        i.unit_of_measure,
        i.reorder_level,        
        i.storage_location,
        i.created_at
      FROM items i
	  	left join suppliers s on s.supplier_id = i.supplier_id
	    left join categories c on c.category_id = i.category_id
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    console.log('Final inventory query:', query);
    params.push(Number(limit), offset);
    const result = await pool.query(query, params);

    logger.info(`Inventory: Retrieved ${result.rows.length} items`, {
      page: Number(page),
      limit: Number(limit),
      total
    });

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    //logger.error('Error fetching inventory:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching inventory'
    });
  }
});

// Get single inventory item
router.get('/items/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        i.*,
        s.supplier_name,
        s.contact_person,
        s.phone as supplier_phone
      FROM items i
      LEFT JOIN suppliers s ON i.supplier_id = s.supplier_id
      WHERE i.item_id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    logger.info(`Inventory: Retrieved item ${id}`);

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error fetching inventory item:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching inventory item'
    });
  }
});

// Get all items (from items table for purchase orders)
router.get('/item-catalog', async (req, res) => {
  try {
    console.log('Fetching item catalog with params:', req.query);
    const { page = 1, limit = 10, search, category_id } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (item_name ILIKE $${paramIndex} OR item_code ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (category_id) {
      whereClause += ` AND category_id = $${paramIndex}`;
      params.push(category_id);
      paramIndex++;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM items ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated items
    const query = `
      SELECT
        i.item_id,
        i.item_code,
        i.item_name,
        i.category_id,
        c.category_name,
        i.unit_of_measure,
        i.reorder_level,
        i.supplier_id,
        s.supplier_name,
        i.storage_location,
        i.created_at
      FROM items i
      LEFT JOIN categories c ON i.category_id = c.category_id
      LEFT JOIN suppliers s ON i.supplier_id = s.supplier_id
      ${whereClause}
      ORDER BY i.item_name
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(Number(limit), offset);
    const result = await pool.query(query, params);

    logger.info(`Item Catalog: Retrieved ${result.rows.length} items`, {
      page: Number(page),
      limit: Number(limit),
      total
    });

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    logger.error('Error fetching item catalog:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching item catalog'
    });
  }
});


// get categories for dropdowns
router.get('/categories', async (req, res) => {
  try {
    const query = `
      SELECT category_id, category_name
      FROM categories
      ORDER BY category_name
    `;
    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories'
    });
  }
});

// Get item options for dropdowns
router.get('/item-options', async (req, res) => {
  try {
    
    const query = `
      SELECT
        i.item_id,
        i.item_code,
        i.item_name,
		c.category_id,        
		c.category_name        
      FROM items i
      LEFT JOIN categories c ON i.category_id = c.category_id      	  
	  ORDER BY i.item_name, c.category_name ASC 
    `;
    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Error fetching item options:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching item options'
    });
  }
});

// Create new inventory item
router.post('/items', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      item_code,
      item_name,      
      category_id,
      supplier_id,
      unit_of_measure,      
      reorder_level,      
      storage_location      
    } = req.body;

//  item_code: (formData.item_code ?? '').trim(),
//         item_name: formData.item_name.trim(),        
//         category_id: Number(formData.category_id),
//         supplier_id: formData.supplier_id ? Number(formData.supplier_id) : undefined,
//         unit_of_measure: formData.unit_of_measure,
//         reorder_level: Number(formData.reorder_level),        
//         storage_location: formData.storage_location ? Number(formData.storage_location) : undefined,


    const query = `
      INSERT INTO items (
        item_code, item_name, category_id, supplier_id, unit_of_measure, 
        reorder_level, storage_location, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const result = await pool.query(query, [
      item_code,
      item_name,      
      category_id,
      supplier_id,
      unit_of_measure,
      reorder_level,      
      storage_location
    ]);

    logger.info(`Inventory: Created item ${result.rows[0].item_id}`);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Inventory item created successfully'
    });

    await logActivity('create', 'inventory', req.user?.username || 'unknown', '127.0.0.1',
      JSON.stringify({ details: `create new product : ${item_code},${item_name},${category_id}, ${supplier_id}, ${unit_of_measure}, ${reorder_level}, ${storage_location}`,
        status: 'success', endpoint: '/inventory/items'}));



  } catch (error) {
    console.error('Error creating inventory item:', error);
    //logger.error('Error creating inventory item:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating inventory item'
    });
  }
});

// Update inventory item
router.put('/items/:id', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      item_code,
      item_name,      
      category_id,
      supplier_id,
      unit_of_measure,      
      reorder_level,      
      storage_location      
    } = req.body;

    const query = `
      UPDATE items
      SET 
        item_code = $1,
        item_name = $2,
        category_id = $3,
        supplier_id = $4,
        unit_of_measure = $5,        
        reorder_level = $6,        
        storage_location = $7,        
        updated_at = CURRENT_TIMESTAMP
      WHERE item_id = $8
      RETURNING *
    `;
    console.log('Update inventory query:', query, id);
    const result = await pool.query(query, [
      item_code,
      item_name,      
      category_id,
      supplier_id,
      unit_of_measure,      
      reorder_level,      
      storage_location,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    logger.info(`Inventory: Updated item ${id}`);

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Inventory item updated successfully'
    });

        await logActivity('update', 'inventory', req.user?.username || 'unknown', '127.0.0.1',
      JSON.stringify({ details: `update product : ${id},${item_code},${item_name},${category_id}, ${supplier_id}, ${unit_of_measure}, ${reorder_level}, ${storage_location}`,
        status: 'success', endpoint: `/inventory/items/${id}`}));


  } catch (error) {
    console.error('Error updating inventory item:', error);
    //logger.error('Error updating inventory item:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating inventory item'
    });
  }
});

// Stock In endpoints

// Get all stock in records with pagination
router.get('/stock-in', async (req, res) => {
  try {
    const { page = 1, limit = 10, search, supplier_id } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (i.item_name ILIKE $${paramIndex} OR sb.batch_no ILIKE $${paramIndex} OR s.supplier_name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (supplier_id) {
      whereClause += ` AND si.supplier_id = $${paramIndex}`;
      params.push(supplier_id);
      paramIndex++;
    }
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM stock_in si ${whereClause.replace('si.', '').replace('i.', '').replace('sb.', '').replace('s.', '')}`;
    
    const countResult = await pool.query(countQuery, params);
    
    const total = parseInt(countResult.rows[0].total);
    

    // Get paginated stock in records
    const query = `
      SELECT
        si.stock_in_id,
        i.item_name,
        sb.batch_no,
        si.qty_added,
        s.supplier_name,
        si.date_in,
        si.remarks,
        si.created_at
      FROM stock_in si
      JOIN items i ON si.item_id = i.item_id
      LEFT JOIN stock_batches sb ON si.batch_id = sb.batch_id
      LEFT JOIN suppliers s ON si.supplier_id = s.supplier_id
      ${whereClause}
      ORDER BY si.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(Number(limit), offset);
    const result = await pool.query(query, params);

    logger.info(`Stock In: Retrieved ${result.rows.length} records`, {
      page: Number(page),
      limit: Number(limit),
      total
    });

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    logger.error('Error fetching stock in records:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching stock in records'
    });
  }
});

// Create new stock in record
router.post('/stock-in', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      item_id,
      batch_no,
      qty_added,
      supplier_id,
      date_in,
      expiry_date,
      remarks
    } = req.body;

    let batch_id = null;

    // If batch_no is provided, find or create the batch
    if (batch_no) {
      // First, check if batch already exists for this item
      const existingBatchQuery = `
        SELECT batch_id FROM stock_batches
        WHERE item_id = $1 AND batch_no = $2
      `;
      const existingBatch = await pool.query(existingBatchQuery, [item_id, batch_no]);

      if (existingBatch.rows.length > 0) {
        batch_id = existingBatch.rows[0].batch_id;
      } else {
        // Create new batch
        const createBatchQuery = `
          INSERT INTO stock_batches (item_id, batch_no, expiry_date, qty_available)
          VALUES ($1, $2, $3, 0)
          RETURNING batch_id
        `;
        const newBatch = await pool.query(createBatchQuery, [item_id, batch_no, expiry_date]);
        batch_id = newBatch.rows[0].batch_id;
      }
    }

    const query = `
      INSERT INTO stock_in (
        item_id, batch_id, qty_added, supplier_id, date_in, remarks
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await pool.query(query, [
      item_id,
      batch_id,
      qty_added,
      supplier_id,
      date_in,
      remarks
    ]);

    // Update stock batch quantity if batch_id is provided
    if (batch_id) {
      await pool.query(
        'UPDATE stock_batches SET qty_available = qty_available + $1 WHERE batch_id = $2',
        [qty_added, batch_id]
      );
    }

    logger.info(`Stock In: Created record ${result.rows[0].stock_in_id}`, {
      item_id,
      qty_added,
      supplier_id,
      batch_no
    });

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Stock in record created successfully'
    });

        await logActivity('create', 'inventory', req.user?.username || 'unknown', '127.0.0.1',
      JSON.stringify({ details: `create new stock-in : ${item_id},${batch_no},${qty_added},${supplier_id},${date_in},${remarks}`,
        status: 'success', endpoint: `/inventory/stock-in`}));


  } catch (error) {
    logger.error('Error creating stock in record:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating stock in record'
    });
  }
});

// Enhanced Receive Delivery endpoint (for multiple items in one delivery)
router.post('/receive-delivery', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const {
      stock_in_no,
      po_id,
      supplier_id,
      date_received,
      received_by,
      remarks,
      items
    } = req.body;

    // Validate required fields
    if (!stock_in_no || !date_received || !received_by || !Array.isArray(items) || items.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'stock_in_no, date_received, received_by, and items array are required'
      });
    }

    // Validate items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.item_id || !item.batch_no || !item.qty_received) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Item ${i + 1}: item_id, batch_no, and qty_received are required`
        });
      }
      if (item.qty_received <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Item ${i + 1}: qty_received must be greater than 0`
        });
      }
    }

    // Calculate totals before creating header
    let totalItems = items.length;
    let totalAmount = items.reduce((sum, item) => sum + ((item.unit_cost || 0) * item.qty_received), 0);

    // Create main stock_in header record
    const createStockInQuery = `
      INSERT INTO stock_in_headers (
        stock_in_no, po_id, supplier_id, date_received, received_by, remarks, 
        total_items, total_amount, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      RETURNING stock_in_header_id
    `;

    let headerResult;
    try {
      headerResult = await client.query(createStockInQuery, [
        stock_in_no,
        po_id || null,
        supplier_id || null,
        date_received,
        received_by,
        remarks || null,
        totalItems,
        totalAmount
      ]);
    } catch (headerError) {
      // If the table doesn't exist, fall back to individual stock_in records
      console.log('stock_in_headers table not found, using individual records approach');
      
      let totalItems = 0;
      let totalAmount = 0;
      
      // Process each item individually (fallback approach)
      for (const item of items) {
        let batch_id = null;

        // Find or create batch
        if (item.batch_no) {
          const existingBatchQuery = `
            SELECT batch_id FROM stock_batches
            WHERE item_id = $1 AND batch_no = $2
          `;
          const existingBatch = await client.query(existingBatchQuery, [item.item_id, item.batch_no]);

          if (existingBatch.rows.length > 0) {
            batch_id = existingBatch.rows[0].batch_id;
          } else {
            const createBatchQuery = `
              INSERT INTO stock_batches (item_id, batch_no, expiry_date, qty_available, created_at)
              VALUES ($1, $2, $3, 0, CURRENT_TIMESTAMP)
              RETURNING batch_id
            `;
            const newBatch = await client.query(createBatchQuery, [
              item.item_id, 
              item.batch_no, 
              item.expiry_date || null
            ]);
            batch_id = newBatch.rows[0].batch_id;
          }
        }

        // Create individual stock_in record with enhanced remarks
        const stockInRemarks = `${stock_in_no} | ${remarks || ''} | ${item.remarks || ''}`.trim();
        const createIndividualStockInQuery = `
          INSERT INTO stock_in (
            item_id, batch_id, qty_added, supplier_id, date_in, remarks, created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
          RETURNING stock_in_id
        `;

        await client.query(createIndividualStockInQuery, [
          item.item_id,
          batch_id,
          item.qty_received,
          supplier_id || null,
          date_received,
          stockInRemarks
        ]);

        // Update batch quantity
        if (batch_id) {
          await client.query(
            'UPDATE stock_batches SET qty_available = qty_available + $1 WHERE batch_id = $2',
            [item.qty_received, batch_id]
          );
        }

        totalItems++;
        totalAmount += (item.unit_cost || 0) * item.qty_received;
      }

      await client.query('COMMIT');

      logger.info(`Receive Delivery (fallback): Processed ${totalItems} items for ${stock_in_no}`, {
        stock_in_no,
        total_items: totalItems,
        total_amount: totalAmount,
        supplier_id,
        po_id
      });

      return res.status(201).json({
        success: true,
        data: {
          stock_in_id: null,
          stock_in_no,
          total_items: totalItems,
          total_amount: totalAmount
        },
        message: 'Delivery received successfully (individual records)'
      });
    }

    // If we reach here, the header was created successfully
    const stockInHeaderId = headerResult.rows[0].stock_in_header_id;
    
    // Reset counters for actual processing
    let processedItems = 0;
    let processedAmount = 0;

    // Process each item and create stock_batches
    for (const item of items) {
      let batch_id = null;
      let batchExists = false;

      // Find or create batch
      if (item.batch_no) {
        const existingBatchQuery = `
          SELECT batch_id FROM stock_batches
          WHERE item_id = $1 AND batch_no = $2
        `;
        const existingBatch = await client.query(existingBatchQuery, [item.item_id, item.batch_no]);

        if (existingBatch.rows.length > 0) {
          batch_id = existingBatch.rows[0].batch_id;
          batchExists = true;
        } else {
          const createBatchQuery = `
            INSERT INTO stock_batches (
              stock_in_header_id, item_id, batch_no, expiry_date, 
              qty_received, qty_available, unit_cost, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $5, $6, CURRENT_TIMESTAMP)
            RETURNING batch_id
          `;
          const newBatch = await client.query(createBatchQuery, [
            stockInHeaderId,
            item.item_id,
            item.batch_no,
            item.expiry_date || null,
            item.qty_received,
            item.unit_cost || 0
          ]);
          batch_id = newBatch.rows[0].batch_id;
        }
      }

      // Update existing batch quantity if it was found
      if (batch_id && batchExists) {
        await client.query(
          'UPDATE stock_batches SET qty_available = qty_available + $1 WHERE batch_id = $2',
          [item.qty_received, batch_id]
        );
      }

      // Create individual stock_in record linked to header
      const createStockInItemQuery = `
        INSERT INTO stock_in (
          stock_in_header_id, item_id, batch_id, qty_added, 
          supplier_id, date_in, remarks, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
        RETURNING stock_in_id
      `;

      await client.query(createStockInItemQuery, [
        stockInHeaderId,
        item.item_id,
        batch_id,
        item.qty_received,
        supplier_id || null,
        date_received,
        item.remarks || null
      ]);

      processedItems++;
      processedAmount += (item.unit_cost || 0) * item.qty_received;
    }

    // Update purchase order status if po_id provided
    if (po_id) {
      await client.query(
        `UPDATE purchase_order SET status = 'Received', updated_at = CURRENT_TIMESTAMP WHERE po_id = $1`,
        [po_id]
      );
    }

    await client.query('COMMIT');

    logger.info(`Receive Delivery: Successfully processed delivery ${stock_in_no}`, {
      stock_in_header_id: stockInHeaderId,
      stock_in_no,
      total_items: totalItems,
      total_amount: totalAmount,
      supplier_id,
      po_id
    });

    res.status(201).json({
      success: true,
      data: {
        stock_in_id: stockInHeaderId,
        stock_in_no,
        total_items: totalItems,
        total_amount: totalAmount
      },
      message: 'Delivery received successfully'
    });


    // stock_in_no,
    //   po_id,
    //   supplier_id,
    //   date_received,
    //   received_by,
    //   remarks,
    //   items

        await logActivity('create', 'inventory', req.user?.username || 'unknown', '127.0.0.1',
      JSON.stringify({ details: `receive delivery : ${stock_in_no},${po_id},${supplier_id},${date_received},${received_by},${remarks},${JSON.stringify(items)}`,
        status: 'success', endpoint: `/inventory/receive-delivery`}));


  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error processing receive delivery:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing delivery'
    });
  } finally {
    client.release();
  }
});

// Get receive delivery records (enhanced stock-in headers)
router.get('/receive-delivery', async (req, res) => {
  try {
    const { page = 1, limit = 10, search, supplier_id, po_id } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (sih.stock_in_no ILIKE $${paramIndex} OR s.supplier_name ILIKE $${paramIndex} OR sih.received_by ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (supplier_id) {
      whereClause += ` AND sih.supplier_id = $${paramIndex}`;
      params.push(supplier_id);
      paramIndex++;
    }

    if (po_id) {
      whereClause += ` AND sih.po_id = $${paramIndex}`;
      params.push(po_id);
      paramIndex++;
    }

    // Try to get from enhanced table first
    let countQuery = `SELECT COUNT(*) as total FROM stock_in_headers sih ${whereClause}`;
    let dataQuery = `
      SELECT
        sih.stock_in_header_id,
        sih.stock_in_no,
        sih.po_id,
        po.po_number,
        sih.supplier_id,
        s.supplier_name,
        sih.date_received,
        sih.received_by,
        sih.remarks,
        sih.total_items,
        sih.total_amount,
        sih.created_at
      FROM stock_in_headers sih
      LEFT JOIN suppliers s ON sih.supplier_id = s.supplier_id
      LEFT JOIN purchase_order po ON sih.po_id = po.po_id
      ${whereClause}
      ORDER BY sih.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    try {
      const countResult = await pool.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total);

      params.push(Number(limit), offset);
      const result = await pool.query(dataQuery, params);

      res.json({
        success: true,
        data: result.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (enhancedError) {
      // Fallback to grouped individual stock_in records
      console.log('Enhanced table not available, using grouped stock_in records');
      
      // Reset params for fallback query
      const fallbackParams: any[] = [];
      let fallbackParamIndex = 1;
      let fallbackWhereClause = 'WHERE 1=1';

      if (search) {
        fallbackWhereClause += ` AND (si.remarks ILIKE $${fallbackParamIndex} OR s.supplier_name ILIKE $${fallbackParamIndex})`;
        fallbackParams.push(`%${search}%`);
        fallbackParamIndex++;
      }

      if (supplier_id) {
        fallbackWhereClause += ` AND si.supplier_id = $${fallbackParamIndex}`;
        fallbackParams.push(supplier_id);
        fallbackParamIndex++;
      }

      const fallbackQuery = `
        SELECT
          si.date_in as date_received,
          si.supplier_id,
          s.supplier_name,
          COUNT(*) as total_items,
          SUM(si.qty_added) as total_quantity,
          si.remarks,
          MIN(si.created_at) as created_at
        FROM stock_in si
        LEFT JOIN suppliers s ON si.supplier_id = s.supplier_id
        ${fallbackWhereClause}
        GROUP BY si.date_in, si.supplier_id, s.supplier_name, si.remarks
        ORDER BY MIN(si.created_at) DESC
        LIMIT $${fallbackParamIndex} OFFSET $${fallbackParamIndex + 1}
      `;

      fallbackParams.push(Number(limit), offset);
      const fallbackResult = await pool.query(fallbackQuery, fallbackParams);

      res.json({
        success: true,
        data: fallbackResult.rows.map((row, index) => ({
          stock_in_header_id: null,
          stock_in_no: `GROUPED-${row.date_received}-${index + 1}`,
          po_id: null,
          po_number: null,
          supplier_id: row.supplier_id,
          supplier_name: row.supplier_name,
          date_received: row.date_received,
          received_by: 'Various',
          remarks: row.remarks,
          total_items: parseInt(row.total_items),
          total_amount: 0,
          created_at: row.created_at
        })),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: fallbackResult.rows.length,
          pages: Math.ceil(fallbackResult.rows.length / Number(limit))
        }
      });
    }

  } catch (error) {
    logger.error('Error fetching receive delivery records:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching receive delivery records'
    });
  }
});

// Get single receive delivery record with items
router.get('/receive-delivery/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Try enhanced table first
    try {
      const headerQuery = `
        SELECT
          sih.stock_in_header_id,
          sih.stock_in_no,
          sih.po_id,
          po.po_number,
          sih.supplier_id,
          s.supplier_name,
          sih.date_received,
          sih.received_by,
          sih.remarks,
          sih.total_items,
          sih.total_amount,
          sih.created_at
        FROM stock_in_headers sih
        LEFT JOIN suppliers s ON sih.supplier_id = s.supplier_id
        LEFT JOIN purchase_order po ON sih.po_id = po.po_id
        WHERE sih.stock_in_header_id = $1
      `;

      const headerResult = await pool.query(headerQuery, [id]);

      if (headerResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Receive delivery record not found'
        });
      }

      // Get items for this delivery
      const itemsQuery = `
        SELECT
          sb.batch_id,
          sb.item_id,
          i.item_name,
          sb.batch_no,
          sb.expiry_date,
          sb.qty_received,
          sb.qty_available,
          sb.unit_cost,
          si.remarks as item_remarks
        FROM stock_batches sb
        JOIN items i ON sb.item_id = i.item_id
        LEFT JOIN stock_in si ON si.batch_id = sb.batch_id AND si.stock_in_header_id = $1
        WHERE sb.stock_in_header_id = $1
        ORDER BY sb.created_at
      `;

      const itemsResult = await pool.query(itemsQuery, [id]);

      res.json({
        success: true,
        data: {
          ...headerResult.rows[0],
          items: itemsResult.rows
        }
      });

    } catch (enhancedError) {
      return res.status(404).json({
        success: false,
        message: 'Enhanced receive delivery table not available'
      });
    }

  } catch (error) {
    logger.error('Error fetching receive delivery record:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching receive delivery record'
    });
  }
});

// Get single stock in record
router.get('/stock-in/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT
        si.stock_in_id,
        i.item_name,
        sb.batch_no,
        si.qty_added,
        s.supplier_name,
        si.date_in,
        si.remarks,
        si.created_at
      FROM stock_in si
      JOIN items i ON si.item_id = i.item_id
      LEFT JOIN stock_batches sb ON si.batch_id = sb.batch_id
      LEFT JOIN suppliers s ON si.supplier_id = s.supplier_id
      WHERE si.stock_in_id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Stock in record not found'
      });
    }

    logger.info(`Stock In: Retrieved record ${id}`);

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error fetching stock in record:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching stock in record'
    });
  }
});

// ---------------------- STOCK-OUT HEADERS (Enhanced Stock-Out with Headers) ----------------------

// Helper: generate next Stock-Out reference number
async function generateStockOutRefNo(client: any): Promise<string> {
  const dateOnly = new Date().toISOString().split('T')[0];
  const yyyymmdd = dateOnly.replace(/-/g,'');
  const countRes = await client.query('SELECT COUNT(*) AS cnt FROM stock_out_headers WHERE DATE(stock_out_date) = $1', [dateOnly]);
  const seq = (parseInt(countRes.rows[0].cnt) + 1).toString().padStart(3,'0');
  return `SO-${yyyymmdd}-${seq}`;
}

// Create stock-out transaction (header + items)
router.post('/stock-out-transaction', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const {
      released_to,
      purpose,
      created_by,
      items,      
      charge_id,
      invoice_id,      
      is_treatment_usage = false
    } = req.body;

    // Validation
    if (!released_to || !created_by || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: released_to, created_by, and items'
      });
    }

    // Generate reference number
    const reference_no = await generateStockOutRefNo(client);
    const stock_out_date = new Date().toISOString();

    // Insert header with treatment fields
    const headerQuery = `
      INSERT INTO stock_out_headers (
        reference_no, stock_out_date, released_to, purpose, created_by,
        charge_id, invoice_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING stock_out_id
    `;
    const headerResult = await client.query(headerQuery, [
      reference_no,
      stock_out_date,
      released_to,
      purpose || null,
      created_by,      
      is_treatment_usage ? charge_id || null : null,
      is_treatment_usage ? invoice_id || null : null      
    ]);
    const stock_out_id = headerResult.rows[0].stock_out_id;

    // Process each item
    let total_items = 0;
    for (const item of items) {
      const { item_id, batch_id, qty_released, remarks } = item;
      
      // Check available quantity
      const batchCheck = await client.query(
        'SELECT qty_available FROM stock_batches WHERE batch_id = $1',
        [batch_id]
      );
      
      if (batchCheck.rows.length === 0) {
        throw new Error(`Batch ID ${batch_id} not found`);
      }
      
      const available_qty = batchCheck.rows[0].qty_available;
      if (available_qty < qty_released) {
        throw new Error(`Insufficient quantity for batch ${batch_id}. Available: ${available_qty}, Requested: ${qty_released}`);
      }

      // Insert stock-out item
      await client.query(
        'INSERT INTO stock_out (stock_out_id, item_id, batch_id, qty_released, remarks) VALUES ($1, $2, $3, $4, $5)',
        [stock_out_id, item_id, batch_id, qty_released, remarks || null]
      );

      // Update batch quantity
      await client.query(
        'UPDATE stock_batches SET qty_available = qty_available - $1 WHERE batch_id = $2',
        [qty_released, batch_id]
      );

      // If this is treatment usage, create treatment_stock_usage record
      // if (is_treatment_usage) {
      //   try {
      //     await client.query(
      //       `INSERT INTO treatment_stock_usage (
      //         treatment_id, stock_out_id, item_id, qty_used, 
      //         patient_name, dentist_name, treatment_type, remarks
      //       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      //       [
      //         treatment_id || null,
      //         stock_out_id,
      //         item_id,
      //         qty_released,
      //         patient_name || null,
      //         dentist_name || null,
      //         treatment_type || null,
      //         remarks || null
      //       ]
      //     );
      //   } catch (treatmentError: any) {
      //     console.warn('Error creating treatment_stock_usage record:', treatmentError.message);
      //     // Continue without failing the entire transaction
      //   }
      // }

      total_items += qty_released;
    }

    await client.query('COMMIT');

    logger.info(`Stock-Out Transaction Created: ${reference_no}`, {
      stock_out_id,
      released_to,
      total_items,
      items_count: items.length,
      is_treatment_usage
    });

    res.json({
      success: true,
      data: {
        stock_out_id,
        reference_no,
        total_items,
        items_count: items.length,
        is_treatment_usage        
      },
      message: `Stock-out transaction created successfully. Reference: ${reference_no}`
    });


            await logActivity('create', 'inventory', req.user?.username || 'unknown', '127.0.0.1',
      JSON.stringify({ details: `create stock-out : ${released_to},${purpose},${created_by},${JSON.stringify(items)},${charge_id},${invoice_id},${is_treatment_usage}`,
        status: 'success', endpoint: `/inventory/stock-out-transaction`}));


  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating stock-out transaction:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Error creating stock-out transaction'
    });
  } finally {
    client.release();
  }
});

// Get stock-out transactions (headers with summary)
router.get('/stock-out-transactions', async (req, res) => {
  try {
    const { page = 1, limit = 10, search, released_to } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (soh.reference_no ILIKE $${paramIndex} OR soh.released_to ILIKE $${paramIndex + 1})`;
      params.push(`%${search}%`, `%${search}%`);
      paramIndex += 2;
    }

    if (released_to) {
      whereClause += ` AND soh.released_to ILIKE $${paramIndex}`;
      params.push(`%${released_to}%`);
      paramIndex++;
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM stock_out_headers soh
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated data with summary
    const query = `
      SELECT 
        soh.stock_out_id,
        soh.reference_no,
        soh.stock_out_date,
        soh.released_to,
        soh.purpose,
        soh.created_by,
        soh.created_at,
        COUNT(so.id) as items_count,
        SUM(so.qty_released) as total_qty_released
      FROM stock_out_headers soh
      LEFT JOIN stock_out so ON soh.stock_out_id = so.stock_out_id
      ${whereClause}
      GROUP BY soh.stock_out_id, soh.reference_no, soh.stock_out_date, soh.released_to, soh.purpose, soh.created_by, soh.created_at
      ORDER BY soh.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(Number(limit), offset);
    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching stock-out transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching stock-out transactions'
    });
  }
});

// Get single stock-out transaction with items
router.get('/stock-out-transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get header
    const headerQuery = `
      SELECT 
        stock_out_id,
        reference_no,
        stock_out_date,
        released_to,
        purpose,
        created_by,
        created_at
      FROM stock_out_headers
      WHERE stock_out_id = $1
    `;
    const headerResult = await pool.query(headerQuery, [id]);

    if (headerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Stock-out transaction not found'
      });
    }

    // Get items
    const itemsQuery = `
      SELECT 
        so.id,
        so.item_id,
        i.item_name,
        so.batch_id,
        sb.batch_no,
        so.qty_released,
        so.remarks
      FROM stock_out so
      JOIN items i ON so.item_id = i.item_id
      JOIN stock_batches sb ON so.batch_id = sb.batch_id
      WHERE so.stock_out_id = $1
      ORDER BY so.id
    `;
    const itemsResult = await pool.query(itemsQuery, [id]);

    const stockOutTransaction = {
      ...headerResult.rows[0],
      items: itemsResult.rows
    };

    res.json({
      success: true,
      data: stockOutTransaction
    });
  } catch (error) {
    console.error('Error fetching stock-out transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching stock-out transaction'
    });
  }
});

// Get available batches for stock-out (batches with qty > 0)
router.get('/available-batches', async (req, res) => {
  try {
    const { item_id } = req.query;

    let whereClause = 'WHERE sb.qty_available > 0';
    const params: any[] = [];
    let paramIndex = 1;

    if (item_id) {
      whereClause += ` AND sb.item_id = $${paramIndex}`;
      params.push(Number(item_id));
      paramIndex++;
    }

    const query = `
      SELECT 
        sb.batch_id,
        sb.item_id,
        i.item_name,
        sb.batch_no,
        sb.expiry_date,
        sb.qty_available
      FROM stock_batches sb
      JOIN items i ON sb.item_id = i.item_id
      ${whereClause}
      ORDER BY i.item_name, sb.expiry_date ASC NULLS LAST, sb.batch_no
    `;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching available batches:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching available batches'
    });
  }
});

// Get treatment stock usage records
router.get('/treatment-stock-usage', async (req, res) => {
  try {
    const { 
      treatment_id, 
      patient_name, 
      dentist_name, 
      days = 30, 
      page = 1, 
      limit = 10 
    } = req.query;
    
    const offset = (Number(page) - 1) * Number(limit);
    
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;
    
    if (treatment_id) {
      whereClause += ` AND tsu.treatment_id = $${paramIndex}`;
      params.push(parseInt(treatment_id as string));
      paramIndex++;
    }
    
    if (patient_name) {
      whereClause += ` AND tsu.patient_name ILIKE $${paramIndex}`;
      params.push(`%${patient_name}%`);
      paramIndex++;
    }
    
    if (dentist_name) {
      whereClause += ` AND tsu.dentist_name ILIKE $${paramIndex}`;
      params.push(`%${dentist_name}%`);
      paramIndex++;
    }
    
    if (days) {
      whereClause += ` AND tsu.created_at >= CURRENT_DATE - INTERVAL '${days} days'`;
    }
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM treatment_stock_usage tsu
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);
    
    // Get paginated data
    const dataQuery = `
      SELECT 
        tsu.id,
        tsu.treatment_id,
        tsu.stock_out_id,
        tsu.item_id,
        i.item_name,
        tsu.qty_used,
        tsu.patient_name,
        tsu.dentist_name,
        tsu.treatment_type,
        tsu.remarks,
        tsu.created_at,
        soh.reference_no,
        soh.stock_out_date
      FROM treatment_stock_usage tsu
      JOIN items i ON tsu.item_id = i.item_id
      LEFT JOIN stock_out_headers soh ON tsu.stock_out_id = soh.stock_out_id
      ${whereClause}
      ORDER BY tsu.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(Number(limit), offset);
    const dataResult = await pool.query(dataQuery, params);
    
    res.json({
      success: true,
      data: dataResult.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching treatment stock usage:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching treatment stock usage records'
    });
  }
});

// ---------------------- LEGACY STOCK-OUT ROUTES ----------------------

// Get all stock out records
router.get('/stock-out', async (req, res) => {
  try {
    console.log('Fetching stock out records with params:', req.query);
    const { page = 1, limit = 10, search, item_id, usage_type } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (i.item_name ILIKE $${paramIndex} OR so.remarks ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (item_id) {
      whereClause += ` AND so.item_id = $${paramIndex}`;
      params.push(item_id);
      paramIndex++;
    }

    if (usage_type) {
      whereClause += ` AND so.usage_type = $${paramIndex}`;
      params.push(usage_type);
      paramIndex++;
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM stock_out so
      JOIN items i ON so.item_id = i.item_id
      LEFT JOIN stock_batches sb ON so.batch_id = sb.batch_id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated stock out records
    const query = `
      SELECT
        so.stock_out_id,
        i.item_name,
        sb.batch_no,
        so.qty_released,
        so.usage_type,
        so.date_out,
        so.remarks,
        soh.created_at
      FROM stock_out so
      JOIN stock_out_headers soh ON so.stock_out_id = soh.stock_out_id
      JOIN items i ON so.item_id = i.item_id
      LEFT JOIN stock_batches sb ON so.batch_id = sb.batch_id
      ${whereClause}
      ORDER BY soh.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(Number(limit), offset);
    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    logger.error('Error fetching stock out records:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching stock out records'
    });
  }
});

// Get single stock out record
router.get('/stock-out/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT
        so.stock_out_id,
        i.item_name,
        sb.batch_no,
        so.qty_released,
        so.usage_type,
        so.date_out,
        so.remarks,
        soh.created_at
      FROM stock_out so
      JOIN stock_out_headers soh ON so.stock_out_id = soh.stock_out_id
      JOIN items i ON so.item_id = i.item_id
      LEFT JOIN stock_batches sb ON so.batch_id = sb.batch_id
      WHERE so.stock_out_id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Stock out record not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error fetching stock out record:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching stock out record'
    });
  }
});

// Create new stock out record
router.post('/stock-out', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { item_id, batch_id, qty_released, usage_type, date_out, remarks } = req.body;

    // Validate required fields
    if (!item_id || !qty_released || !date_out) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: item_id, qty_released, date_out'
      });
    }

    // Check if batch exists and has sufficient quantity
    if (batch_id) {
      const batchQuery = 'SELECT qty_available FROM stock_batches WHERE batch_id = $1';
      const batchResult = await pool.query(batchQuery, [batch_id]);

      if (batchResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid batch_id: batch does not exist'
        });
      }

      if (batchResult.rows[0].qty_available < qty_released) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient quantity in batch'
        });
      }
    }

    // Insert stock out record
    const insertQuery = `
      INSERT INTO stock_out (
        item_id, batch_id, qty_released, usage_type, date_out, remarks
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      item_id,
      batch_id || null,
      qty_released,
      usage_type || 'treatment',
      date_out,
      remarks || null
    ]);

    // Update batch quantity if batch_id provided
    if (batch_id) {
      await pool.query(
        'UPDATE stock_batches SET qty_available = qty_available - $1 WHERE batch_id = $2',
        [qty_released, batch_id]
      );
    }

    // Get the created record with joined data
    const selectQuery = `
      SELECT
        so.stock_out_id,
        i.item_name,
        sb.batch_no,
        so.qty_released,
        so.usage_type,
        so.date_out,
        so.remarks,
        soh.created_at
      FROM stock_out so
      JOIN items i ON so.item_id = i.item_id
      LEFT JOIN stock_batches sb ON so.batch_id = sb.batch_id
      JOIN stock_out_headers soh ON so.stock_out_id = soh.stock_out_id
      WHERE so.stock_out_id = $1
    `;

    const finalResult = await pool.query(selectQuery, [result.rows[0].stock_out_id]);

    res.status(201).json({
      success: true,
      data: finalResult.rows[0]
    });


            await logActivity('create', 'inventory', req.user?.username || 'unknown', '127.0.0.1',
      JSON.stringify({ details: `create stock-out : ${item_id},${batch_id},${qty_released},${usage_type},${date_out},${remarks}`,
        status: 'success', endpoint: `/inventory/stock-out`}));


  } catch (error) {
    logger.error('Error creating stock out record:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating stock out record'
    });
  }
});

// Get suppliers for dropdowns
router.get('/supplier-options', async (req, res) => {
  try {
    const query = `
      SELECT
        supplier_id,
        supplier_name
      FROM suppliers
      ORDER BY supplier_name ASC
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Error fetching supplier options:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching supplier options'
    });
  }
});

// Get all suppliers
router.get('/suppliers', async (req, res) => {
  try {
    console.log('Fetching suppliers with params:', req.query);
    const { page = 1, limit = 10, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (supplier_name ILIKE $${paramIndex} OR contact_person ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM suppliers ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated suppliers
    const query = `
      SELECT
        supplier_id,
        supplier_name,
        contact_person,
        phone,
        email,
        address,
        created_at
      FROM suppliers
      ${whereClause}
      ORDER BY supplier_name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(Number(limit), offset);
    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    logger.error('Error fetching suppliers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching suppliers'
    });
  }
});

// Get single supplier
router.get('/suppliers/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT
        supplier_id,
        supplier_name,
        contact_person,
        phone,
        email,
        address,
        created_at
      FROM suppliers
      WHERE supplier_id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Error fetching supplier:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching supplier'
    });
  }
});

// Create new supplier
router.post('/suppliers', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { supplier_name, contact_person, phone, email, address } = req.body;

    // Validate required fields
    if (!supplier_name) {
      return res.status(400).json({
        success: false,
        message: 'Supplier name is required'
      });
    }

    // Check if supplier name already exists
    const existingQuery = 'SELECT supplier_id FROM suppliers WHERE supplier_name = $1';
    const existing = await pool.query(existingQuery, [supplier_name]);

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Supplier with this name already exists'
      });
    }

    // Insert supplier
    const insertQuery = `
      INSERT INTO suppliers (
        supplier_name, contact_person, phone, email, address
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      supplier_name,
      contact_person || null,
      phone || null,
      email || null,
      address || null
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });


            await logActivity('create', 'inventory', req.user?.username || 'unknown', '127.0.0.1',
      JSON.stringify({ details: `create supplier : ${supplier_name},${contact_person},${phone},${email},${address}`,
        status: 'success', endpoint: `/inventory/suppliers`}));

  } catch (error) {
    logger.error('Error creating supplier:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating supplier'
    });
  }
});

// Update supplier
router.put('/suppliers/:id', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { supplier_name, contact_person, phone, email, address } = req.body;

    // Validate required fields
    if (!supplier_name) {
      return res.status(400).json({
        success: false,
        message: 'Supplier name is required'
      });
    }

    // Check if supplier exists
    const existingQuery = 'SELECT supplier_id FROM suppliers WHERE supplier_id = $1';
    const existing = await pool.query(existingQuery, [id]);

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    // Check if another supplier with the same name exists
    const nameCheckQuery = 'SELECT supplier_id FROM suppliers WHERE supplier_name = $1 AND supplier_id != $2';
    const nameCheck = await pool.query(nameCheckQuery, [supplier_name, id]);

    if (nameCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Another supplier with this name already exists'
      });
    }

    // Update supplier
    const updateQuery = `
      UPDATE suppliers
      SET
        supplier_name = $1,
        contact_person = $2,
        phone = $3,
        email = $4,
        address = $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE supplier_id = $6
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [
      supplier_name,
      contact_person || null,
      phone || null,
      email || null,
      address || null,
      id
    ]);

    res.json({
      success: true,
      data: result.rows[0]
    });

      await logActivity('update', 'inventory', req.user?.username || 'unknown', '127.0.0.1',
      JSON.stringify({ details: `update supplier : ${id}, ${supplier_name},${contact_person},${phone},${email},${address}`,
        status: 'success', endpoint: `/inventory/suppliers/${id}`}));

  } catch (error) {
    logger.error('Error updating supplier:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating supplier'
    });
  }
});

// Delete supplier
router.delete('/suppliers/:id', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if supplier is being used in inventory or stock_in records
    const usageCheckQuery = `
      SELECT COUNT(*) as usage_count
      FROM (
        SELECT item_id FROM items WHERE supplier_id = $1
        UNION ALL
        SELECT stock_in_id FROM stock_in WHERE supplier_id = $1
      ) as usage_check
    `;
    const usageCheck = await pool.query(usageCheckQuery, [id]);

    if (parseInt(usageCheck.rows[0].usage_count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete supplier that is being used in inventory or stock records'
      });
    }

    // Delete supplier
    const deleteQuery = 'DELETE FROM suppliers WHERE supplier_id = $1 RETURNING *';
    const result = await pool.query(deleteQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

          await logActivity('delete', 'inventory', req.user?.username || 'unknown', '127.0.0.1',
      JSON.stringify({ details: `delete supplier : ${id}`,
        status: 'success', endpoint: `/inventory/suppliers/${id}`}));

  } catch (error) {
    logger.error('Error deleting supplier:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting supplier'
    });
  }
});

// ---------------------- PURCHASE ORDERS (Aligned to purchase_order / purchase_order_items schema) ----------------------

// List purchase orders
router.get('/purchase-orders', async (req, res) => {
  try {
    const { page = 1, limit = 10, search, supplier_id, status } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let idx = 1;

    if (search) {
      whereClause += ` AND (po.po_number ILIKE $${idx} OR s.supplier_name ILIKE $${idx})`;
      params.push(`%${search}%`); idx++;
    }
    if (supplier_id) { whereClause += ` AND po.supplier_id = $${idx}`; params.push(supplier_id); idx++; }
    if (status) { whereClause += ` AND po.status = $${idx}`; params.push(status); idx++; }

    const countQuery = `SELECT COUNT(*) AS total FROM purchase_order po LEFT JOIN suppliers s ON s.supplier_id = po.supplier_id ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    const dataQuery = `
      SELECT
        po.po_id,
        po.po_number,
        s.supplier_name,
        TO_CHAR(po.order_date,'YYYY-MM-DD') AS order_date,
        TO_CHAR(po.expected_delivery_date,'YYYY-MM-DD') AS expected_delivery_date,
        po.status,
        po.total_amount,
        po.created_at,
        po.updated_at,
        COUNT(poi.poi_id) AS items_count
      FROM purchase_order po
      LEFT JOIN suppliers s ON s.supplier_id = po.supplier_id
      LEFT JOIN purchase_order_items poi ON poi.po_id = po.po_id
      ${whereClause}
      GROUP BY po.po_id, s.supplier_name
      ORDER BY po.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `;
    params.push(Number(limit), offset);
    const listResult = await pool.query(dataQuery, params);

    res.json({
      success: true,
      data: listResult.rows,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) }
    });
  } catch (error) {
    logger.error('PO: list failed', error);
    res.status(500).json({ success: false, message: 'Error fetching purchase orders' });
  }
});

// Get single purchase order (with items)
router.get('/purchase-orders/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const headerQuery = `
      SELECT po.po_id, po.po_number, po.supplier_id, s.supplier_name,
             TO_CHAR(po.order_date,'YYYY-MM-DD') AS order_date,
             TO_CHAR(po.expected_delivery_date,'YYYY-MM-DD') AS expected_delivery_date,
             po.status, po.total_amount, po.remarks, po.created_by,
             po.created_at, po.updated_at
      FROM purchase_order po
      JOIN suppliers s ON s.supplier_id = po.supplier_id
      WHERE po.po_id = $1
    `;
    const headerResult = await pool.query(headerQuery, [id]);
    if (headerResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }

    const itemsQuery = `
      SELECT poi.poi_id, poi.item_id, i.item_code, i.item_name,
             poi.quantity_ordered, poi.unit_cost, poi.subtotal, poi.remarks
      FROM purchase_order_items poi
      JOIN items i ON i.item_id = poi.item_id
      WHERE poi.po_id = $1
      ORDER BY poi.poi_id
    `;
    const itemsResult = await pool.query(itemsQuery, [id]);
    console.log('PO items fetched:', itemsResult.rows);
    res.json({ success: true, data: { ...headerResult.rows[0], items: itemsResult.rows } });
  } catch (error) {
    console.error('PO: get failed', error);
    //logger.error('PO: get failed', error);
    res.status(500).json({ success: false, message: 'Error fetching purchase order' });
  }
});

// Helper: generate next PO number (current date + sequence) with retry logic
async function generatePoNumber(client: any): Promise<string> {
  const dateOnly = new Date().toISOString().split('T')[0];
  const yyyymmdd = dateOnly.replace(/-/g,'');
  
  // Try up to 10 times to generate a unique PO number
  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      // Get count of existing POs for today and add attempt number for uniqueness
      const countRes = await client.query(
        'SELECT COUNT(*) AS cnt FROM purchase_order WHERE DATE(order_date) = $1', 
        [dateOnly]
      );
      
      const baseCount = parseInt(countRes.rows[0].cnt);
      const seq = (baseCount + attempt).toString().padStart(3, '0');
      const poNumber = `PO-${yyyymmdd}-${seq}`;
      
      // Check if this PO number already exists
      const existsRes = await client.query(
        'SELECT COUNT(*) AS exists_count FROM purchase_order WHERE po_number = $1',
        [poNumber]
      );
      
      if (parseInt(existsRes.rows[0].exists_count) === 0) {
        return poNumber;
      }
    } catch (error) {
      console.warn(`PO number generation attempt ${attempt} failed:`, error);
    }
  }
  
  // Fallback: use timestamp-based unique identifier
  const timestamp = Date.now().toString().slice(-6);
  return `PO-${yyyymmdd}-${timestamp}`;
}

// Create purchase order
router.post('/purchase-orders', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { supplier_id, expected_delivery_date, remarks, items, status = 'Pending', created_by } = req.body;

    if (!supplier_id || !created_by || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'supplier_id, created_by and at least one item are required' });
    }

    // Validate items & compute total
    let totalAmount = 0;
    for (const it of items) {
      if (!it.item_id || !it.quantity_ordered || !it.unit_cost) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Each item requires item_id, quantity_ordered, unit_cost' });
      }
      if (it.quantity_ordered <= 0 || it.unit_cost < 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Invalid item quantity or unit cost' });
      }
      totalAmount += it.quantity_ordered * it.unit_cost;
    }

    // Retry logic for PO creation in case of duplicate key issues
    let poId: number;
    let poNumber: string;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        poNumber = await generatePoNumber(client);
        const insertHeader = `
          INSERT INTO purchase_order (po_number, supplier_id, order_date, expected_delivery_date, status, total_amount, remarks, created_by)
          VALUES ($1,$2,CURRENT_TIMESTAMP,$3,$4,$5,$6,$7)
          RETURNING *
        `;
        const headerRes = await client.query(insertHeader, [poNumber, supplier_id, expected_delivery_date || null, status, totalAmount, remarks || null, created_by || null]);
        poId = headerRes.rows[0].po_id;
        break; // Success, exit retry loop
      } catch (error: any) {
        if (error.code === '23505' && error.constraint === 'purchase_order_po_number_key') {
          // Duplicate key error, retry with new PO number
          retryCount++;
          console.log(`PO number collision detected, retrying... (attempt ${retryCount}/${maxRetries})`);
          if (retryCount >= maxRetries) {
            throw new Error('Unable to generate unique PO number after multiple attempts');
          }
          continue;
        } else {
          // Other error, rethrow
          throw error;
        }
      }
    }

    const insertItem = `
      INSERT INTO purchase_order_items (po_id, item_id, quantity_ordered, unit_cost, remarks)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING poi_id
    `;
    for (const it of items) {
      await client.query(insertItem, [poId!, it.item_id, it.quantity_ordered, it.unit_cost, it.remarks || null]);
    }

    await client.query('COMMIT');

    logger.info('PO created', { po_id: poId!, po_number: poNumber!, totalAmount });

    res.status(201).json({ success: true, data: { po_id: poId!, po_number: poNumber! }, message: 'Purchase order created' });

//supplier_id, expected_delivery_date, remarks, items, status = 'Pending', created_by

      await logActivity('create', 'inventory', req.user?.username || 'unknown', '127.0.0.1',
      JSON.stringify({ details: `create purchase order : ${supplier_id}, ${expected_delivery_date}, ${remarks}, ${JSON.stringify(items)}, ${status}, ${created_by}`,
        status: 'success', endpoint: `/inventory/purchase-orders`}));

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('PO: create failed', error);
    
    // Provide more specific error messages
    if (error.code === '23505') {
      res.status(409).json({ success: false, message: 'Duplicate purchase order number. Please try again.' });
    } else if (error.message === 'Unable to generate unique PO number after multiple attempts') {
      res.status(500).json({ success: false, message: 'Unable to generate unique purchase order number. Please contact support.' });
    } else {
      res.status(500).json({ success: false, message: 'Error creating purchase order' });
    }
  } finally {
    client.release();
  }
});

// Update purchase order (header + replace items)
router.put('/purchase-orders/:id', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { supplier_id, expected_delivery_date, status, remarks, items } = req.body;

    const existing = await client.query('SELECT status FROM purchase_order WHERE po_id = $1', [id]);
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }
    if (['Received','Cancelled'].includes(existing.rows[0].status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Cannot modify a Received or Cancelled purchase order' });
    }

    if (!supplier_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'supplier_id is required' });
    }

    // If items provided, validate and compute new total
    let totalAmount: number | null = null;
    if (Array.isArray(items)) {
      if (items.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'At least one item required' });
      }
      totalAmount = 0;
      for (const it of items) {
        if (!it.item_id || !it.quantity_ordered || !it.unit_cost) {
          await client.query('ROLLBACK');
          return res.status(400).json({ success: false, message: 'Each item requires item_id, quantity_ordered, unit_cost' });
        }
        if (it.quantity_ordered <= 0 || it.unit_cost < 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ success: false, message: 'Invalid item quantity or unit cost' });
        }
        totalAmount += it.quantity_ordered * it.unit_cost;
      }
    }

    const updateHeader = `
      UPDATE purchase_order
      SET supplier_id=$1, expected_delivery_date=$2, status=$3, remarks=$4,
          total_amount = COALESCE($5,total_amount), updated_at = CURRENT_TIMESTAMP
      WHERE po_id = $6
      RETURNING *
    `;
    const headerRes = await client.query(updateHeader, [supplier_id, expected_delivery_date || null, status || existing.rows[0].status, remarks || null, totalAmount, id]);

    if (Array.isArray(items)) {
      await client.query('DELETE FROM purchase_order_items WHERE po_id = $1', [id]);
      const insertItem = `INSERT INTO purchase_order_items (po_id, item_id, quantity_ordered, unit_cost, remarks) VALUES ($1,$2,$3,$4,$5)`;
      for (const it of items) {
        await client.query(insertItem, [id, it.item_id, it.quantity_ordered, it.unit_cost, it.remarks || null]);
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, data: { po_id: headerRes.rows[0].po_id }, message: 'Purchase order updated' });

      await logActivity('update', 'inventory', req.user?.username || 'unknown', '127.0.0.1',
      JSON.stringify({ details: `update purchase order : ${id}, ${supplier_id}, ${expected_delivery_date}, ${remarks}, ${JSON.stringify(items)}, ${status}`,
        status: 'success', endpoint: `/inventory/purchase-orders/${id}`}));

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('PO: update failed', error);
    res.status(500).json({ success: false, message: 'Error updating purchase order' });
  } finally { client.release(); }
});

// Delete purchase order
router.delete('/purchase-orders/:id', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    // Prevent deletion if status is Received
    const statusRes = await pool.query('SELECT status FROM purchase_order WHERE po_id = $1', [id]);
    if (statusRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Purchase order not found' });
    if (statusRes.rows[0].status === 'Received') return res.status(400).json({ success: false, message: 'Cannot delete a Received purchase order' });

    const delRes = await pool.query('DELETE FROM purchase_order WHERE po_id = $1 RETURNING *', [id]);
    res.json({ success: true, data: delRes.rows[0], message: 'Purchase order deleted' });

      await logActivity('delete', 'inventory', req.user?.username || 'unknown', '127.0.0.1',
      JSON.stringify({ details: `delete purchase order : ${id}`,
        status: 'success', endpoint: `/inventory/purchase-orders/${id}`}));

  } catch (error) {
    logger.error('PO: delete failed', error);
    res.status(500).json({ success: false, message: 'Error deleting purchase order' });
  }
});
// -------------------------------------------------------------------------------------------------

// Report endpoints
// Get expiry report
router.get('/reports/expiry', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const daysNum = parseInt(days as string);

    const query = `
      SELECT
        sb.batch_id as id,
        i.item_name as name,
        sb.batch_no as batch_number,
        TO_CHAR(sb.expiry_date, 'YYYY-MM-DD') as expiry_date,
        sb.qty_available as quantity,
        i.unit_of_measure as unit,
        CASE
          WHEN sb.expiry_date IS NULL THEN 999
          ELSE (sb.expiry_date - CURRENT_DATE)
        END as days_until_expiry
      FROM stock_batches sb
      LEFT JOIN items i ON sb.item_id = i.item_id
      WHERE sb.expiry_date IS NOT NULL
        AND sb.expiry_date <= CURRENT_DATE + INTERVAL '${daysNum} days'
        AND sb.qty_available > 0
      ORDER BY sb.expiry_date ASC
      LIMIT 10
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    logger.error('Error fetching expiry report:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching expiry report'
    });
  }
});

// Get low stock report
router.get('/reports/low-stock', async (req, res) => {
  try {
    const query = `
      SELECT
        i.item_id as id,
        i.item_name as name,
        COALESCE(SUM(sb.qty_available), 0) as current_stock,
        i.reorder_level as minimum_stock,
        i.unit_of_measure as unit,
        s.supplier_name
      FROM items i
      LEFT JOIN stock_batches sb ON i.item_id = sb.item_id
      LEFT JOIN suppliers s ON i.supplier_id = s.supplier_id
      GROUP BY i.item_id, i.item_name, i.reorder_level, i.unit_of_measure, s.supplier_name
      HAVING COALESCE(SUM(sb.qty_available), 0) <= i.reorder_level
      ORDER BY (i.reorder_level - COALESCE(SUM(sb.qty_available), 0)) DESC
      LIMIT 10
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Error fetching low stock report:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching low stock report'
    });
  }
});

// Get purchase history report
router.get('/reports/purchase-history', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const daysNum = parseInt(days as string);

    const query = `
      SELECT
    po.po_id,
    po.po_number,
    TO_CHAR(po.order_date, 'YYYY-MM-DD') AS po_date,
    s.supplier_name,

    i.item_name,
    poi.quantity_ordered,
    
    COALESCE(SUM(si.qty_added), 0) AS quantity_received,

    poi.unit_cost,
    (poi.quantity_ordered * poi.unit_cost) AS ordered_total,
    (COALESCE(SUM(si.qty_added), 0) * poi.unit_cost) AS received_total,

    CASE
        WHEN COALESCE(SUM(si.qty_added), 0) = 0 THEN 'Pending'
        WHEN COALESCE(SUM(si.qty_added), 0) < poi.quantity_ordered THEN 'Partially Received'
        WHEN COALESCE(SUM(si.qty_added), 0) >= poi.quantity_ordered THEN 'Completed'
    END AS receiving_status

FROM purchase_order po
JOIN purchase_order_items poi ON po.po_id = poi.po_id
JOIN items i ON poi.item_id = i.item_id

LEFT JOIN stock_in_headers sih ON sih.po_id = po.po_id
LEFT JOIN stock_in si ON si.stock_in_header_id = sih.stock_in_header_id 
                       AND si.item_id = poi.item_id

LEFT JOIN suppliers s 
       ON COALESCE(sih.supplier_id, po.supplier_id, si.supplier_id) = s.supplier_id
WHERE po.order_date >= CURRENT_DATE - INTERVAL '${daysNum} days'
GROUP BY 
    po.po_id, po.po_number, po.order_date, s.supplier_name,
    i.item_name, poi.quantity_ordered, poi.unit_cost

ORDER BY po.order_date DESC;
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Error fetching purchase history report:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching purchase history report'
    });
  }
});

// Batch upload items
router.post('/batch-upload', async (req, res) => {
  try {
    const { items } = req.body;
    
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request: items array is required'
      });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{
        row: number;
        item_code: string;
        error: string;
      }>
    };

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        try {
          // Validate required fields
          if (!item.item_code || !item.item_name || !item.category_id || !item.unit_of_measure || !item.supplier_id) {
            throw new Error('Missing required fields');
          }

          // Check if item already exists
          const existingItem = await client.query(
            'SELECT item_id FROM items WHERE item_code = $1',
            [item.item_code]
          );

          let itemId;
          
          if (existingItem.rows.length > 0) {
            // Update existing item
            const updateResult = await client.query(`
              UPDATE items SET 
                item_name = $2,
                category_id = $3,
                unit_of_measure = $4,
                reorder_level = $5,
                supplier_id = $6,
                storage_location = $7,
                updated_at = CURRENT_TIMESTAMP
              WHERE item_code = $1
              RETURNING item_id
            `, [
              item.item_code,
              item.item_name,
              item.category_id,
              item.unit_of_measure,
              item.reorder_level || 0,
              item.supplier_id,
              item.storage_location || null
            ]);
            itemId = updateResult.rows[0].item_id;
          } else {
            // Create new item
            const insertResult = await client.query(`
              INSERT INTO items (
                item_code, item_name, category_id, unit_of_measure, 
                reorder_level, supplier_id, storage_location, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
              RETURNING item_id
            `, [
              item.item_code,
              item.item_name,
              item.category_id,
              item.unit_of_measure,
              item.reorder_level || 0,
              item.supplier_id,
              item.storage_location || null
            ]);
            itemId = insertResult.rows[0].item_id;
          }

          // Create stock batch if batch info is provided
          if (item.batch_no && item.qty_available && item.qty_available > 0) {
            // Check if batch already exists
            const existingBatch = await client.query(
              'SELECT batch_id FROM stock_batches WHERE item_id = $1 AND batch_no = $2',
              [itemId, item.batch_no]
            );

            let batchId;
            
            if (existingBatch.rows.length > 0) {
              // Update existing batch quantity
              const updateBatchResult = await client.query(`
                UPDATE stock_batches SET 
                  qty_available = qty_available + $3,
                  updated_at = CURRENT_TIMESTAMP
                WHERE item_id = $1 AND batch_no = $2
                RETURNING batch_id
              `, [itemId, item.batch_no, item.qty_available]);
              batchId = updateBatchResult.rows[0].batch_id;
            } else {
              // Create new batch
              const insertBatchResult = await client.query(`
                INSERT INTO stock_batches (
                  item_id, batch_no, expiry_date, qty_available, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                RETURNING batch_id
              `, [
                itemId,
                item.batch_no,
                item.expiry_date || null,
                item.qty_available
              ]);
              batchId = insertBatchResult.rows[0].batch_id;
            }

            // Record stock in transaction
            await client.query(`
              INSERT INTO stock_in (
                item_id, batch_id, qty_added, date_in, remarks, created_at
              ) VALUES ($1, $2, $3, CURRENT_DATE, 'Batch Upload', CURRENT_TIMESTAMP)
            `, [itemId, batchId, item.qty_available]);

            // Update inventory quantity
            // await client.query(`
            //   UPDATE inventory SET 
            //     quantity_in_stock = COALESCE(quantity_in_stock, 0) + $2,
            //     updated_at = CURRENT_TIMESTAMP
            //   WHERE item_id = $1
            // `, [itemId, item.qty_available]);

            // If inventory record doesn't exist, create it
            const inventoryExists = await client.query(
              'SELECT item_id FROM items WHERE item_id = $1',
              [itemId]
            );

            if (inventoryExists.rows.length === 0) {
              await client.query(`
                INSERT INTO items (
                  item_id, reorder_level, created_at, updated_at
                ) VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
              `, [itemId, item.reorder_level || 0]);
            }
          }

          results.success++;
        } catch (error) {
          logger.error(`Error processing item at index ${i}:`, error);
          results.failed++;
          results.errors.push({
            row: i + 2, // Account for header row
            item_code: item.item_code || 'N/A',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      await client.query('COMMIT');
      
      res.json({
        success: true,
        data: results
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    logger.error('Error in batch upload:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing batch upload'
    });
  }
});

// Stock Batches endpoints

// Get all stock batches
router.get('/batches', async (req, res) => {
  try {
    const { 
      item_id, 
      batch_no, 
      search, 
      category_id, 
      expiry_filter,
      page = 1, 
      limit = 50 
    } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE sb.qty_available >= 0'; // Include zero quantities for display
    const params: any[] = [];
    let paramIndex = 1;

    if (item_id) {
      whereClause += ` AND sb.item_id = $${paramIndex}`;
      params.push(item_id);
      paramIndex++;
    }

    if (batch_no) {
      whereClause += ` AND sb.batch_no ILIKE $${paramIndex}`;
      params.push(`%${batch_no}%`);
      paramIndex++;
    }

    // Search filter for item name or batch number
    if (search) {
      whereClause += ` AND (i.item_name ILIKE $${paramIndex} OR sb.batch_no ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Category filter
    if (category_id) {
      whereClause += ` AND i.category_id = $${paramIndex}`;
      params.push(category_id);
      paramIndex++;
    }

    // Expiry filter
    if (expiry_filter) {
      switch (expiry_filter) {
        case 'expired':
          whereClause += ` AND sb.expiry_date < CURRENT_DATE`;
          break;
        case 'expiring-soon':
          whereClause += ` AND sb.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'`;
          break;
        case 'good':
          whereClause += ` AND (sb.expiry_date IS NULL OR sb.expiry_date > CURRENT_DATE + INTERVAL '30 days')`;
          break;
      }
    }

    // Get total count with joins
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM stock_batches sb 
      JOIN items i ON sb.item_id = i.item_id
      LEFT JOIN categories c ON i.category_id = c.category_id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated batches with additional fields
    const query = `
      SELECT 
        sb.batch_id,
        sb.item_id,
        i.item_name,
        i.item_code,
        c.category_name,
        sb.batch_no,
        sb.expiry_date,
        sb.qty_available,
        sb.unit_cost,
        sb.created_at,
        sih.date_received,
        s.supplier_name
      FROM stock_batches sb
      JOIN items i ON sb.item_id = i.item_id
      LEFT JOIN categories c ON i.category_id = c.category_id
      LEFT JOIN stock_in_headers sih ON sb.stock_in_header_id = sih.stock_in_header_id
      LEFT JOIN suppliers s ON sih.supplier_id = s.supplier_id
      ${whereClause}
      ORDER BY sb.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    console.log('Stock Batches Query:', query, 'Params:', params);
    params.push(Number(limit), offset);
    const result = await pool.query(query, params);

    logger.info(`Stock Batches: Retrieved ${result.rows.length} batches`);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    logger.error('Error fetching stock batches:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching stock batches'
    });
  }
});

// Get single stock batch
router.get('/batches/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        sb.batch_id,
        sb.item_id,
        i.item_name,
        sb.batch_no,
        sb.expiry_date,
        sb.qty_available,
        sb.created_at,
        sb.updated_at
      FROM stock_batches sb
      JOIN items i ON sb.item_id = i.item_id
      WHERE sb.batch_id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Stock batch not found'
      });
    }

    logger.info(`Stock Batches: Retrieved batch ${id}`);

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error fetching stock batch:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching stock batch'
    });
  }
});

// Create new stock batch
router.post('/batches', async (req, res) => {
  try {
    const { item_id, batch_no, expiry_date, qty_available = 0 } = req.body;

    // Validate required fields
    if (!item_id || !batch_no) {
      return res.status(400).json({
        success: false,
        message: 'Item ID and batch number are required'
      });
    }

    // Check if batch already exists for this item
    const existingBatch = await pool.query(
      'SELECT batch_id FROM stock_batches WHERE item_id = $1 AND batch_no = $2',
      [item_id, batch_no]
    );

    if (existingBatch.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Batch already exists for this item'
      });
    }

    const query = `
      INSERT INTO stock_batches (
        item_id, batch_no, expiry_date, qty_available, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const result = await pool.query(query, [
      item_id,
      batch_no,
      expiry_date || null,
      qty_available
    ]);

    logger.info(`Stock Batches: Created batch ${result.rows[0].batch_id}`, {
      item_id,
      batch_no,
      qty_available
    });

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Stock batch created successfully'
    });
  } catch (error) {
    logger.error('Error creating stock batch:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating stock batch'
    });
  }
});

// Update stock batch
router.put('/batches/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { batch_no, expiry_date, qty_available, reason, adjusted_by } = req.body;

    // Get current quantity before update
    const currentBatchQuery = 'SELECT qty_available FROM stock_batches WHERE batch_id = $1';
    const currentBatchResult = await client.query(currentBatchQuery, [id]);
    
    if (currentBatchResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Stock batch not found'
      });
    }

    const oldQty = currentBatchResult.rows[0].qty_available;

    // Update stock batch
    const updateQuery = `
      UPDATE stock_batches
      SET 
        batch_no = $1,
        expiry_date = $2,
        qty_available = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE batch_id = $4
      RETURNING *
    `;

    const result = await client.query(updateQuery, [
      batch_no,
      expiry_date || null,
      qty_available,
      id
    ]);

    // Insert stock adjustment record if quantity changed
    if (oldQty !== qty_available) {
      const adjustmentQuery = `
        INSERT INTO stock_adjustments (batch_id, old_qty, new_qty, reason, adjustment_type, adjusted_by)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;
      await client.query(adjustmentQuery, [
        id,
        oldQty,
        qty_available,
        reason || 'Batch quantity update',
        'Correction', // Default to Correction for batch updates
        adjusted_by || null
      ]);
    }

    await client.query('COMMIT');

    logger.info(`Stock Batches: Updated batch ${id}, qty changed from ${oldQty} to ${qty_available}`);

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Stock batch updated successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error updating stock batch:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating stock batch'
    });
  } finally {
    client.release();
  }
});

// Delete stock batch
router.delete('/batches/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if batch has remaining quantity
    const batchCheck = await pool.query(
      'SELECT qty_available FROM stock_batches WHERE batch_id = $1',
      [id]
    );

    if (batchCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Stock batch not found'
      });
    }

    if (batchCheck.rows[0].qty_available > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete batch with remaining quantity. Set quantity to 0 first.'
      });
    }

    await pool.query('DELETE FROM stock_batches WHERE batch_id = $1', [id]);

    logger.info(`Stock Batches: Deleted batch ${id}`);

    res.json({
      success: true,
      message: 'Stock batch deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting stock batch:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting stock batch'
    });
  }
});

// Stock Adjustments endpoints

// Create stock adjustment (dedicated endpoint for quantity adjustments)
router.post('/stock-adjustments', extractUser, async (req: AuthenticatedRequest, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { batch_id, new_qty, reason, adjustment_type, adjusted_by } = req.body;

    // Validate required fields
    if (!batch_id || new_qty === undefined) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'batch_id and new_qty are required'
      });
    }

    // Get current quantity
    const currentBatchQuery = `
      SELECT sb.qty_available, sb.batch_no, i.item_name 
      FROM stock_batches sb
      JOIN items i ON sb.item_id = i.item_id
      WHERE sb.batch_id = $1
    `;
    const currentBatchResult = await client.query(currentBatchQuery, [batch_id]);
    
    if (currentBatchResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Stock batch not found'
      });
    }

    const oldQty = currentBatchResult.rows[0].qty_available;
    const batchInfo = currentBatchResult.rows[0];

    // Validate new quantity is not negative
    if (new_qty < 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'New quantity cannot be negative'
      });
    }

    // Insert stock adjustment record
    const adjustmentQuery = `
      INSERT INTO stock_adjustments (batch_id, old_qty, new_qty, reason, adjustment_type, adjusted_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const adjustmentResult = await client.query(adjustmentQuery, [
      batch_id,
      oldQty,
      new_qty,
      reason || 'Manual stock adjustment',
      adjustment_type || 'Correction',
      adjusted_by || null
    ]);

    // Update stock batch quantity
    const updateBatchQuery = `
      UPDATE stock_batches
      SET qty_available = $1, updated_at = CURRENT_TIMESTAMP
      WHERE batch_id = $2
      RETURNING *
    `;
    const batchResult = await client.query(updateBatchQuery, [new_qty, batch_id]);

    await client.query('COMMIT');

    logger.info(`Stock Adjustment: Batch ${batch_id} (${batchInfo.item_name} - ${batchInfo.batch_no}) adjusted from ${oldQty} to ${new_qty}`, {
      batch_id,
      old_qty: oldQty,
      new_qty,
      reason,
      adjusted_by
    });

    res.json({
      success: true,
      data: {
        adjustment: adjustmentResult.rows[0],
        updated_batch: batchResult.rows[0]
      },
      message: 'Stock adjustment completed successfully'
    });


      await logActivity('create', 'inventory', req.user?.username || 'unknown', '127.0.0.1',
      JSON.stringify({ details: `create stock adjustment : ${batch_id},${new_qty},${reason},${adjustment_type},${adjusted_by}`,
        status: 'success', endpoint: `/inventory/stock-adjustments`}));

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error creating stock adjustment:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating stock adjustment'
    });
  } finally {
    client.release();
  }
});

// Get stock adjustment history
router.get('/stock-adjustments', async (req, res) => {
  try {
    const { 
      batch_id, 
      item_id, 
      adjusted_by,
      days = 30,
      page = 1, 
      limit = 50 
    } = req.query;
    console.log('Query params:', req.query);
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = `WHERE sa.adjusted_at >= CURRENT_DATE - INTERVAL '${days} days'`;
    const params: any[] = [];
    let paramIndex = 1;

    if (batch_id) {
      whereClause += ` AND sa.batch_id = $${paramIndex}`;
      params.push(batch_id);
      paramIndex++;
    }

    if (item_id) {
      whereClause += ` AND sb.item_id = $${paramIndex}`;
      params.push(item_id);
      paramIndex++;
    }

    if (adjusted_by) {
      whereClause += ` AND sa.adjusted_by = $${paramIndex}`;
      params.push(adjusted_by);
      paramIndex++;
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM stock_adjustments sa
      JOIN stock_batches sb ON sa.batch_id = sb.batch_id
      JOIN items i ON sb.item_id = i.item_id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get adjustment records
    const query = `
      SELECT 
        sa.adjustment_id,
        sa.batch_id,
        sb.batch_no,
        i.item_id,
        i.item_name,
        sa.old_qty,
        sa.new_qty,
        (sa.new_qty - sa.old_qty) as qty_change,
        sa.reason,
        sa.adjustment_type,
        sa.adjusted_by,
        sa.adjusted_at
      FROM stock_adjustments sa
      JOIN stock_batches sb ON sa.batch_id = sb.batch_id
      JOIN items i ON sb.item_id = i.item_id
      ${whereClause}
      ORDER BY sa.adjusted_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(Number(limit), offset);
    const result = await pool.query(query, params);

    logger.info(`Stock Adjustments: Retrieved ${result.rows.length} adjustment records`);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching stock adjustments:', error);
    //logger.error('Error fetching stock adjustments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching stock adjustments'
    });
  }
});

// Get single stock adjustment
router.get('/stock-adjustments/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        sa.adjustment_id,
        sa.batch_id,
        sb.batch_no,
        i.item_id,
        i.item_name,
        sa.old_qty,
        sa.new_qty,
        (sa.new_qty - sa.old_qty) as qty_change,
        sa.reason,
        sa.adjustment_type,
        sa.adjusted_by,
        sa.adjusted_at
      FROM stock_adjustments sa
      JOIN stock_batches sb ON sa.batch_id = sb.batch_id
      JOIN items i ON sb.item_id = i.item_id
      WHERE sa.adjustment_id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Stock adjustment not found'
      });
    }

    logger.info(`Stock Adjustments: Retrieved adjustment ${id}`);

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error fetching stock adjustment:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching stock adjustment'
    });
  }
});


router.post('/dentists', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sf_get_dentist_list();');
    res.status(200).json(result.rows);
    console.log(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
