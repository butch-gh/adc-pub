import React from 'react';
import { PurchaseOrder, Supplier } from '@/lib/inventory-api';

interface PurchaseOrderEmailTemplateProps {
  purchaseOrder: PurchaseOrder;
  supplier?: Supplier;
  formData: {
    supplier_id: number;
    expected_delivery_date?: string;
    status: string;
    remarks?: string;
    created_by: string;
    items: Array<{
      item_id: number;
      item_name?: string;
      quantity_ordered: number;
      unit_cost: number;
      remarks?: string;
    }>;
  };
}

export const generatePurchaseOrderEmailHTML = (
  purchaseOrder: PurchaseOrder,
  supplier: Supplier | undefined,
  formData: PurchaseOrderEmailTemplateProps['formData']
): string => {
  const totalAmount = formData.items.reduce((total, item) => total + (item.quantity_ordered * (Number(item.unit_cost) || 0)), 0);

  const itemsHTML = formData.items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; vertical-align: top;">
        <div style="font-weight: 600; color: #111827;">${item.item_name || 'Unknown Item'}</div>
        ${item.remarks ? `<div style="font-size: 12px; color: #6b7280; margin-top: 4px;">${item.remarks}</div>` : ''}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #374151;">
        ${item.quantity_ordered}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #374151;">
        ₱${(Number(item.unit_cost) || 0).toFixed(2)}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; color: #111827;">
        ₱${((item.quantity_ordered || 0) * (Number(item.unit_cost) || 0)).toFixed(2)}
      </td>
    </tr>
  `).join('');

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return '#fef3c7';
      case 'approved': return '#dbeafe';
      case 'received': return '#dcfce7';
      case 'cancelled': return '#fee2e2';
      default: return '#f3f4f6';
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return '#92400e';
      case 'approved': return '#1e40af';
      case 'received': return '#166534';
      case 'cancelled': return '#dc2626';
      default: return '#374151';
    }
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Purchase Order ${purchaseOrder.po_number}</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
      <div style="max-width: 800px; margin: 0 auto; background-color: white; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">

        <!-- Header -->
        <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 40px 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 32px; font-weight: 700;">ADC Dental Clinic</h1>
          <p style="margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">Purchase Order System</p>
          <div style="margin-top: 20px; font-size: 14px; opacity: 0.8;">
            <p style="margin: 4px 0;">Professional Dental Care Services</p>
            <p style="margin: 4px 0;">15 Balagtas St, Taguig City, 1632</p>
            <p style="margin: 4px 0;">Manila, Philippines 1000</p>
          </div>
        </div>

        <!-- PO Title -->
        <div style="text-align: center; padding: 30px; background-color: #1f2937; color: white;">
          <h2 style="margin: 0; font-size: 28px; font-weight: 700;">PURCHASE ORDER</h2>
          <p style="margin: 8px 0 0 0; font-size: 20px; opacity: 0.9;">${purchaseOrder.po_number}</p>
        </div>

        <!-- PO Details -->
        <div style="padding: 30px;">
          <div style="display: table; width: 100%; margin-bottom: 30px;">
            <div style="display: table-row;">
              <div style="display: table-cell; width: 50%; padding-right: 20px;">
                <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb;">
                  <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 16px;">Supplier Information</h3>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 6px 0; font-weight: 600; color: #6b7280; width: 40%;">Supplier:</td>
                      <td style="padding: 6px 0; color: #111827; font-weight: 600;">${supplier?.supplier_name || 'Unknown Supplier'}</td>
                    </tr>
                    ${supplier?.contact_person ? `
                    <tr>
                      <td style="padding: 6px 0; font-weight: 600; color: #6b7280;">Contact Person:</td>
                      <td style="padding: 6px 0; color: #111827;">${supplier.contact_person}</td>
                    </tr>
                    ` : ''}
                    ${supplier?.phone ? `
                    <tr>
                      <td style="padding: 6px 0; font-weight: 600; color: #6b7280;">Phone:</td>
                      <td style="padding: 6px 0; color: #111827;">${supplier.phone}</td>
                    </tr>
                    ` : ''}
                    ${supplier?.email ? `
                    <tr>
                      <td style="padding: 6px 0; font-weight: 600; color: #6b7280;">Email:</td>
                      <td style="padding: 6px 0; color: #111827;">${supplier.email}</td>
                    </tr>
                    ` : ''}
                  </table>
                </div>
              </div>
              <div style="display: table-cell; width: 50%; padding-left: 20px;">
                <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb;">
                  <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 16px;">Order Details</h3>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 6px 0; font-weight: 600; color: #6b7280; width: 40%;">Order Date:</td>
                      <td style="padding: 6px 0; color: #111827;">${new Date(purchaseOrder.order_date).toLocaleDateString('en-PH')}</td>
                    </tr>
                    ${formData.expected_delivery_date ? `
                    <tr>
                      <td style="padding: 6px 0; font-weight: 600; color: #6b7280;">Expected Delivery:</td>
                      <td style="padding: 6px 0; color: #111827;">${new Date(formData.expected_delivery_date).toLocaleDateString('en-PH')}</td>
                    </tr>
                    ` : ''}
                    <tr>
                      <td style="padding: 6px 0; font-weight: 600; color: #6b7280;">Status:</td>
                      <td style="padding: 6px 0; color: #111827;">
                        <span style="background-color: ${getStatusColor(formData.status)}; color: ${getStatusTextColor(formData.status)}; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
                          ${formData.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; font-weight: 600; color: #6b7280;">Created By:</td>
                      <td style="padding: 6px 0; color: #111827;">${formData.created_by}</td>
                    </tr>
                  </table>
                </div>
              </div>
            </div>
          </div>

          ${formData.remarks ? `
          <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #f59e0b;">
            <h4 style="margin: 0 0 10px 0; color: #92400e; font-size: 14px;">Remarks:</h4>
            <p style="margin: 0; color: #92400e;">${formData.remarks}</p>
          </div>
          ` : ''}

          <!-- Items Table -->
          <div style="margin-bottom: 30px;">
            <h3 style="margin: 0 0 20px 0; color: #1f2937; font-size: 18px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Items Ordered</h3>
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
              <thead>
                <tr style="background-color: #f3f4f6;">
                  <th style="padding: 15px; text-align: left; font-weight: 700; color: #374151; border-bottom: 1px solid #e5e7eb;">Item Description</th>
                  <th style="padding: 15px; text-align: center; font-weight: 700; color: #374151; border-bottom: 1px solid #e5e7eb;">Quantity</th>
                  <th style="padding: 15px; text-align: right; font-weight: 700; color: #374151; border-bottom: 1px solid #e5e7eb;">Unit Cost</th>
                  <th style="padding: 15px; text-align: right; font-weight: 700; color: #374151; border-bottom: 1px solid #e5e7eb;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHTML}
              </tbody>
            </table>
          </div>

          <!-- Total Amount -->
          <div style="background-color: #f8fafc; padding: 25px; border-radius: 8px; margin-bottom: 30px; border: 1px solid #e5e7eb;">
            <div style="display: table; width: 100%;">
              <div style="display: table-row;">
                <div style="display: table-cell; text-align: right;">
                  <div style="font-size: 14px; color: #6b7280; margin-bottom: 5px;">Total Amount</div>
                  <div style="font-size: 24px; font-weight: 700; color: #2563eb;">₱${totalAmount.toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div style="text-align: center; margin-top: 40px; padding-top: 30px; border-top: 2px solid #e5e7eb;">
            <p style="color: #6b7280; margin: 0; font-size: 14px;">
              This purchase order was generated by ADC Dental Clinic's inventory management system.
            </p>
            <p style="color: #6b7280; margin: 8px 0 0 0; font-size: 14px;">
              Please contact us at (02) 123-4567 for any inquiries.
            </p>
            <p style="color: #9ca3af; margin: 8px 0 0 0; font-size: 12px;">
              Generated on ${new Date().toLocaleString()}
            </p>
            <p style="color: #9ca3af; margin: 4px 0 0 0; font-size: 12px;">
              ADC Dental Clinic - Quality Dental Care Since 2020
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

const PurchaseOrderEmailTemplate: React.FC<PurchaseOrderEmailTemplateProps> = () => {
  return null; // This component is just for generating HTML, not rendering
};

export default PurchaseOrderEmailTemplate;