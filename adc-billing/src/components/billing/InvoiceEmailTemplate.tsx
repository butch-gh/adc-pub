import React from 'react';
import { Invoice, Payment, AdjustmentLog } from '@/types';

interface InvoiceEmailTemplateProps {
  invoice: Invoice;
  payments: Payment[];
  adjustments: AdjustmentLog[];
}

const formatCurrency = (amount: number) => {
  return `${amount.toLocaleString('en-PH', {
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

// Calculate financial values
const calculateFinancials = (invoice: Invoice, payments: Payment[], adjustments: AdjustmentLog[]) => {
  const subtotal = invoice.treatments?.reduce((sum, treatment) => {
    const amount = Number(treatment.final_amount) || Number(treatment.estimated_amount) || 0;
    return sum + amount;
  }, 0) || invoice.total_amount_estimated || 0;

  const totalPaid = payments?.reduce((sum, payment) => sum + Number(payment.amount_paid), 0) || 0;

  const discountFromAdjustments = adjustments
    .filter((adj) => adj.type === 'discount')
    .reduce((sum, adj) => sum + Math.abs(Number(adj.amount)), 0) || 0;

  const refundAmount = adjustments
    .filter((adj: any) => adj.type === 'refund' || (adj.note && adj.note.toLowerCase().includes('refund')))
    .reduce((sum, adj) => sum + Math.abs(Number(adj.amount)), 0) || 0;

  const writeoffAmount = adjustments
    .filter((adj: any) => adj.type === 'write-off' || (adj.note && adj.note.toLowerCase().includes('write-off')))
    .reduce((sum, adj) => sum + Math.abs(Number(adj.amount)), 0) || 0;

  const totalDiscounts = (invoice.discount_amount || 0) + discountFromAdjustments;
  const netAmount = subtotal - (totalDiscounts + writeoffAmount + refundAmount);
  const balanceDue = netAmount - totalPaid;

  return {
    subtotal,
    totalPaid,
    totalDiscounts,
    refundAmount,
    writeoffAmount,
    netAmount,
    balanceDue,
  };
};

export const generateInvoiceEmailHTML = (invoice: Invoice, payments: Payment[], adjustments: AdjustmentLog[]): string => {
  const financials = calculateFinancials(invoice, payments, adjustments);

  const treatmentsHTML = invoice.treatments?.map((treatment) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; vertical-align: top;">
        <div style="font-weight: 600; color: #111827; margin-bottom: 4px;">${treatment.service_name}</div>
        ${treatment.notes ? `<div style="font-size: 12px; color: #6b7280;">${treatment.notes}</div>` : ''}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #6b7280;">
        ${formatCurrency(treatment.estimated_amount || 0)}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; color: #111827;">
        ${formatCurrency(treatment.final_amount || treatment.estimated_amount || 0)}
      </td>
    </tr>
  `).join('') || '';

  const paymentsHTML = payments?.length > 0 ? payments.map((payment) => `
    <div style="background-color: #f8fafc; padding: 12px; border-radius: 6px; margin-bottom: 8px; border-left: 3px solid #2563eb;">
      <div style="font-weight: 600; color: #111827; margin-bottom: 4px;">Payment #${payment.payment_id}</div>
      <div style="font-size: 12px; color: #6b7280;">
        Date: ${formatDate(payment.payment_date)} | Method: ${payment.method}
        ${payment.transaction_ref ? ` | Ref: ${payment.transaction_ref}` : ''}
      </div>
      <div style="font-weight: 600; color: #059669; margin-top: 4px;">${formatCurrency(payment.amount_paid)}</div>
    </div>
  `).join('') : '<div style="color: #6b7280; font-style: italic;">No payments recorded</div>';

  const adjustmentsHTML = adjustments?.length > 0 ? adjustments.map((adjustment) => {
    const isRefund = adjustment.type === 'refund' || adjustment.note?.toLowerCase().includes('refund');
    const isDiscount = adjustment.type === 'discount' || adjustment.note?.toLowerCase().includes('discount');
    const isWriteoff = adjustment.type === 'write-off' || adjustment.note?.toLowerCase().includes('write-off');

    const color = isRefund ? '#dc2626' : isDiscount ? '#059669' : isWriteoff ? '#7c3aed' : '#374151';

    return `
      <div style="background-color: #f8fafc; padding: 12px; border-radius: 6px; margin-bottom: 8px; border-left: 3px solid ${color};">
        <div style="font-weight: 600; color: #111827; margin-bottom: 4px;">Adjustment #${adjustment.adjustment_id}</div>
        <div style="font-size: 12px; color: #6b7280;">
          Date: ${formatDate(adjustment.created_at)} | Type: ${adjustment.type}
          ${adjustment.note ? ` | Note: ${adjustment.note}` : ''}
        </div>
        <div style="font-weight: 600; color: ${color}; margin-top: 4px;">
          ${Number(adjustment.amount) < 0 ? '' : '+'}${formatCurrency(Math.abs(Number(adjustment.amount)))}
        </div>
      </div>
    `;
  }).join('') : '<div style="color: #6b7280; font-style: italic;">No adjustments made</div>';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice ${invoice.invoice_code} - ADC Dental Clinic</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
      <div style="max-width: 800px; margin: 0 auto; background-color: white; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">

        <!-- Header -->
        <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 40px 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 32px; font-weight: 700;">ADC Dental Clinic</h1>
          <p style="margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">Professional Dental Care Services</p>
          <div style="margin-top: 20px; font-size: 14px; opacity: 0.8;">
            <p style="margin: 4px 0;">15 Balagtas St, Taguig City, 1632</p>
            <p style="margin: 4px 0;">Manila, Philippines 1000</p>
            <p style="margin: 4px 0;">Phone: 0915-036-7309 | Email: info@adrianodental.com</p>
          </div>
        </div>

        <!-- Invoice Title -->
        <div style="text-align: center; padding: 30px; background-color: #1f2937; color: white;">
          <h2 style="margin: 0; font-size: 28px; font-weight: 700;">INVOICE</h2>
          <p style="margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">Invoice #${invoice.invoice_code}</p>
        </div>

        <!-- Invoice Details -->
        <div style="padding: 30px;">
          <div style="display: table; width: 100%; margin-bottom: 30px;">
            <div style="display: table-row;">
              <div style="display: table-cell; width: 50%; padding-right: 20px;">
                <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb;">
                  <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 16px;">Invoice Details</h3>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 6px 0; font-weight: 600; color: #6b7280; width: 40%;">Invoice Number:</td>
                      <td style="padding: 6px 0; color: #111827;">${invoice.invoice_code}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; font-weight: 600; color: #6b7280;">Issue Date:</td>
                      <td style="padding: 6px 0; color: #111827;">${formatDate(invoice.created_at)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; font-weight: 600; color: #6b7280;">Status:</td>
                      <td style="padding: 6px 0; color: #111827;">
                        <span style="background-color: ${invoice.status === 'paid' ? '#dcfce7' : invoice.status === 'partial' ? '#fef3c7' : '#fee2e2'}; color: ${invoice.status === 'paid' ? '#166534' : invoice.status === 'partial' ? '#92400e' : '#dc2626'}; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
                          ${invoice.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  </table>
                </div>
              </div>
              <div style="display: table-cell; width: 50%; padding-left: 20px;">
                <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb;">
                  <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 16px;">Patient Information</h3>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 6px 0; font-weight: 600; color: #6b7280; width: 40%;">Patient Name:</td>
                      <td style="padding: 6px 0; color: #111827;">${invoice.patient_name || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; font-weight: 600; color: #6b7280;">Patient ID:</td>
                      <td style="padding: 6px 0; color: #111827;">${invoice.patient_id}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; font-weight: 600; color: #6b7280;">Dentist:</td>
                      <td style="padding: 6px 0; color: #111827;">${invoice.dentist_name || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; font-weight: 600; color: #6b7280;">Contact:</td>
                      <td style="padding: 6px 0; color: #111827;">${invoice.mobile_number || 'N/A'}</td>
                    </tr>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <!-- Services Table -->
          <div style="margin-bottom: 30px;">
            <h3 style="margin: 0 0 20px 0; color: #1f2937; font-size: 18px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Services & Charges</h3>
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
              <thead>
                <tr style="background-color: #f3f4f6;">
                  <th style="padding: 15px; text-align: left; font-weight: 700; color: #374151; border-bottom: 1px solid #e5e7eb;">Service Description</th>
                  <th style="padding: 15px; text-align: right; font-weight: 700; color: #374151; border-bottom: 1px solid #e5e7eb;">Estimated</th>
                  <th style="padding: 15px; text-align: right; font-weight: 700; color: #374151; border-bottom: 1px solid #e5e7eb;">Final Amount</th>
                </tr>
              </thead>
              <tbody>
                ${treatmentsHTML}
              </tbody>
            </table>
          </div>

          <!-- Financial Summary -->
          <div style="background-color: #f8fafc; padding: 25px; border-radius: 8px; margin-bottom: 30px; border: 1px solid #e5e7eb;">
            <h3 style="margin: 0 0 20px 0; color: #1f2937; font-size: 18px;">Financial Summary</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #374151;">Subtotal:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #374151;">${formatCurrency(financials.subtotal)}</td>
              </tr>
              ${financials.totalDiscounts > 0 ? `
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #059669;">Discounts:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #059669;">-${formatCurrency(financials.totalDiscounts)}</td>
              </tr>
              ` : ''}
              ${financials.writeoffAmount > 0 ? `
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #7c3aed;">Write-off:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #7c3aed;">-${formatCurrency(financials.writeoffAmount)}</td>
              </tr>
              ` : ''}
              ${financials.refundAmount > 0 ? `
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #dc2626;">Refunds:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #dc2626;">-${formatCurrency(financials.refundAmount)}</td>
              </tr>
              ` : ''}
              <tr style="border-top: 2px solid #d1d5db;">
                <td style="padding: 12px 0; font-weight: 700; color: #1f2937; font-size: 16px;">Total Amount:</td>
                <td style="padding: 12px 0; text-align: right; font-weight: 700; color: #2563eb; font-size: 16px;">${formatCurrency(financials.netAmount)}</td>
              </tr>
              ${financials.totalPaid > 0 ? `
              <tr>
                <td style="padding: 8px 0; font-weight: 600; color: #059669;">Amount Paid:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #059669;">-${formatCurrency(financials.totalPaid)}</td>
              </tr>
              ` : ''}
              <tr style="border-top: 2px solid #d1d5db;">
                <td style="padding: 12px 0; font-weight: 700; color: #1f2937; font-size: 16px;">Balance Due:</td>
                <td style="padding: 12px 0; text-align: right; font-weight: 700; color: ${financials.balanceDue > 0 ? '#dc2626' : '#059669'}; font-size: 16px;">${formatCurrency(financials.balanceDue)}</td>
              </tr>
            </table>
          </div>

          <!-- Payment History -->
          ${payments && payments.length > 0 ? `
          <div style="margin-bottom: 30px;">
            <h3 style="margin: 0 0 20px 0; color: #1f2937; font-size: 18px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Payment History</h3>
            ${paymentsHTML}
          </div>
          ` : ''}

          <!-- Adjustments History -->
          ${adjustments && adjustments.length > 0 ? `
          <div style="margin-bottom: 30px;">
            <h3 style="margin: 0 0 20px 0; color: #1f2937; font-size: 18px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Adjustments History</h3>
            ${adjustmentsHTML}
          </div>
          ` : ''}

          <!-- Footer -->
          <div style="text-align: center; margin-top: 40px; padding-top: 30px; border-top: 2px solid #e5e7eb;">
            <p style="color: #6b7280; margin: 0; font-size: 14px;">
              Thank you for choosing Adriano Dental Clinic. For any questions, please contact us at (02) 123-4567
            </p>
            <p style="color: #9ca3af; margin: 8px 0 0 0; font-size: 12px;">
              This invoice was generated on ${new Date().toLocaleString()}
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

const InvoiceEmailTemplate: React.FC<InvoiceEmailTemplateProps> = () => {
  return null; // This component is just for generating HTML, not rendering
};

export default InvoiceEmailTemplate;