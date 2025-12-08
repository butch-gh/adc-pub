import React from 'react';

interface StockInItem {
  id: string;
  item_id: number;
  item_name: string;
  batch_no: string;
  expiry_date: string;
  qty_received: number;
  unit_cost: number;
  total_cost: number;
  remarks: string;
}

interface StockInEmailTemplateProps {
  stockInData: {
    stock_in_no: string;
    date_received: string;
    po_id: number | null;
    po_number?: string;
    supplier_id: number | null;
    supplier_name: string;
    received_by: string;
    remarks: string;
    items: StockInItem[];
  };
}

export const generateStockInEmailHTML = (stockInData: StockInEmailTemplateProps['stockInData']): string => {
  const formatCurrency = (amount: number) => {
    return `PHP ${amount.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const calculateTotals = () => {
    const totalItems = stockInData.items.length;
    const totalQuantity = stockInData.items.reduce((sum, item) => sum + item.qty_received, 0);
    const totalAmount = stockInData.items.reduce((sum, item) => sum + item.total_cost, 0);

    return { totalItems, totalQuantity, totalAmount };
  };

  const { totalItems, totalQuantity, totalAmount } = calculateTotals();

  const itemsTableRows = stockInData.items.map((item, index) => `
    <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f9f9f9'};">
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">${item.item_name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.batch_no}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.expiry_date ? formatDate(item.expiry_date) : 'N/A'}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.qty_received}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.unit_cost)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">${formatCurrency(item.total_cost)}</td>
    </tr>
  `).join('');

  const remarksSection = stockInData.remarks ? `
    <div style="margin-top: 30px; padding: 20px; background-color: #f8fafc; border-radius: 8px; border-left: 4px solid #2563eb;">
      <h3 style="margin: 0 0 10px 0; color: #1f2937; font-size: 16px; font-weight: bold;">Remarks</h3>
      <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.5;">${stockInData.remarks}</p>
    </div>
  ` : '';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Stock-In Delivery Receipt - ${stockInData.stock_in_no}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
      <div style="max-width: 800px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

        <!-- Header -->
        <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 40px 30px; text-align: center; color: white;">
          <h1 style="margin: 0 0 10px 0; font-size: 32px; font-weight: bold;">Adriano Dental Clinic</h1>
          <p style="margin: 0 0 5px 0; font-size: 16px; opacity: 0.9;">Professional Dental Care Services</p>
          <p style="margin: 0 0 5px 0; font-size: 14px; opacity: 0.8;">15 Balagtas St, Taguig City, 1632</p>
          <p style="margin: 0 0 5px 0; font-size: 14px; opacity: 0.8;">Manila, Philippines 1000</p>
          <p style="margin: 0; font-size: 14px; opacity: 0.8;">Phone: 0915-036-7309 | Email: info@adrianodental.com</p>
        </div>

        <!-- Title -->
        <div style="padding: 30px; text-align: center; background-color: #f8fafc; border-bottom: 2px solid #2563eb;">
          <h2 style="margin: 0; font-size: 28px; font-weight: bold; color: #1f2937;">RECEIVED DELIVERY SLIP</h2>
          <p style="margin: 10px 0 0 0; font-size: 16px; color: #6b7280;">Stock-In Confirmation</p>
        </div>

        <!-- Stock-In Details -->
        <div style="padding: 30px; display: flex; justify-content: space-between; gap: 30px;">
          <div style="flex: 1;">
            <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px; font-weight: bold; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">Stock-In Details</h3>
            <div style="margin-bottom: 10px;">
              <span style="font-weight: bold; color: #374151;">Stock-In No.:</span>
              <span style="margin-left: 10px; color: #2563eb; font-weight: bold; font-size: 16px;">${stockInData.stock_in_no}</span>
            </div>
            <div style="margin-bottom: 10px;">
              <span style="font-weight: bold; color: #374151;">Date Received:</span>
              <span style="margin-left: 10px; color: #1f2937;">${formatDate(stockInData.date_received)}</span>
            </div>
            <div style="margin-bottom: 10px;">
              <span style="font-weight: bold; color: #374151;">Reference PO:</span>
              <span style="margin-left: 10px; color: #1f2937;">${stockInData.po_id ? `PO-${stockInData.po_number}` : 'N/A'}</span>
            </div>
          </div>
          <div style="flex: 1;">
            <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px; font-weight: bold; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">Received By</h3>
            <div style="margin-bottom: 10px;">
              <span style="font-weight: bold; color: #374151;">Name:</span>
              <span style="margin-left: 10px; color: #1f2937;">${stockInData.received_by}</span>
            </div>
          </div>
        </div>

        <!-- Supplier Information -->
        <div style="padding: 0 30px 30px 30px;">
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #2563eb;">
            <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px; font-weight: bold;">Supplier Information</h3>
            <div style="display: flex; flex-wrap: wrap; gap: 20px;">
              <div style="flex: 1; min-width: 200px;">
                <span style="font-weight: bold; color: #374151;">Supplier Name:</span>
                <div style="margin-top: 5px; color: #1f2937; font-weight: bold;">${stockInData.supplier_name || 'N/A'}</div>
              </div>
              <div style="flex: 1; min-width: 200px;">
                <span style="font-weight: bold; color: #374151;">Supplier ID:</span>
                <div style="margin-top: 5px; color: #1f2937;">${stockInData.supplier_id || 'N/A'}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Items Received Table -->
        <div style="padding: 0 30px 30px 30px;">
          <h3 style="margin: 0 0 20px 0; color: #1f2937; font-size: 18px; font-weight: bold;">Items Received</h3>
          <table style="width: 100%; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); border-radius: 8px; overflow: hidden;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="padding: 15px; text-align: left; font-weight: bold; color: #374151; border-bottom: 2px solid #e5e7eb;">Item Description</th>
                <th style="padding: 15px; text-align: left; font-weight: bold; color: #374151; border-bottom: 2px solid #e5e7eb;">Batch No.</th>
                <th style="padding: 15px; text-align: left; font-weight: bold; color: #374151; border-bottom: 2px solid #e5e7eb;">Expiry Date</th>
                <th style="padding: 15px; text-align: center; font-weight: bold; color: #374151; border-bottom: 2px solid #e5e7eb;">Qty</th>
                <th style="padding: 15px; text-align: right; font-weight: bold; color: #374151; border-bottom: 2px solid #e5e7eb;">Unit Cost</th>
                <th style="padding: 15px; text-align: right; font-weight: bold; color: #374151; border-bottom: 2px solid #e5e7eb;">Total Cost</th>
              </tr>
            </thead>
            <tbody>
              ${itemsTableRows}
            </tbody>
          </table>
        </div>

        <!-- Summary -->
        <div style="padding: 0 30px 30px 30px;">
          <div style="background-color: #f8fafc; padding: 25px; border-radius: 8px; border: 2px solid #e5e7eb;">
            <h3 style="margin: 0 0 20px 0; color: #1f2937; font-size: 18px; font-weight: bold;">Summary</h3>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span style="color: #374151; font-size: 16px;">Total Items:</span>
              <span style="color: #1f2937; font-weight: bold; font-size: 16px;">${totalItems}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
              <span style="color: #374151; font-size: 16px;">Total Quantity Received:</span>
              <span style="color: #1f2937; font-weight: bold; font-size: 16px;">${totalQuantity}</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-top: 2px solid #2563eb; padding-top: 15px; margin-top: 15px;">
              <span style="color: #1f2937; font-size: 18px; font-weight: bold;">Total Amount:</span>
              <span style="color: #2563eb; font-size: 18px; font-weight: bold;">${formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </div>

        ${remarksSection}

        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 2px solid #e5e7eb;">
          <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">Thank you for your delivery to Adriano Dental Clinic.</p>
          <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">This is a computer-generated delivery slip.</p>
          <p style="margin: 0; color: #9ca3af; font-size: 12px;">For any questions, please contact us at (02) 123-4567 or email: info@adrianodental.com</p>
        </div>

      </div>
    </body>
    </html>
  `;
};

const StockInEmailTemplate: React.FC<StockInEmailTemplateProps> = ({ stockInData }) => {
  return (
    <div
      dangerouslySetInnerHTML={{ __html: generateStockInEmailHTML(stockInData) }}
      style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '20px', maxHeight: '600px', overflow: 'auto' }}
    />
  );
};

export default StockInEmailTemplate;