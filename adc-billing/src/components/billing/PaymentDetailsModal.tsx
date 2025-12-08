import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X, Send, FileText, Mail, User } from 'lucide-react';
import { toast } from 'sonner';
import { pdf } from '@react-pdf/renderer';
import PaymentReceiptTemplate from './PaymentReceiptTemplate';

interface CombinedPayment {
  payment_id: number;
  invoice_id?: number;
  invoice_code?: string;
  installment_id?: number;
  amount_paid: number;
  received_amount: number;
  change_amount: number;
  method: string;
  payment_date: string;
  transaction_ref?: string;
  proof_of_payment?: string;
  notes?: string;
  payment_type?: string;
  patient_name?: string;
}

interface InvoiceData {
  mobile_number?: string;
  patient_name?: string;
  email?: string;
}

interface PaymentDetailsModalProps {
  isOpen: boolean;
  payment: CombinedPayment | null;
  invoice?: { data?: InvoiceData };
  onClose: () => void;
}

const PaymentDetailsModal: React.FC<PaymentDetailsModalProps> = ({
  isOpen,
  payment,
  invoice,
  onClose,
}) => {
  const [showEmailConfirm, setShowEmailConfirm] = useState(false);
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  const handleSendToPatient = async () => {
    const invoiceId = payment?.invoice_code;
    
    /**
     * SMS Sender
     */
    // if (invoice?.data && invoice?.data?.mobile_number) {
        
    //   // Create SMS API parameters with payment details
    //   const apiSMSParam = {
    //         to: "+63" + invoice?.data?.mobile_number,
    //         message: `ADC Dental Clinic - Payment Receipt\n\nReceipt #: ${payment?.payment_id.toString().padStart(6, '0')}\nPatient: ${payment?.patient_name || invoice?.data?.patient_name || 'N/A'}\nInvoice: ${payment?.invoice_code || 'N/A'}\nAmount Paid: ${formatCurrency(payment?.amount_paid || 0)}\nMethod: ${payment?.method || 'N/A'}\nDate: ${payment?.payment_date ? new Date(payment.payment_date).toLocaleDateString() : 'N/A'}\n\nThank you for your payment!`,
    //       };

    //   const token = localStorage.getItem('token');
    //   if (!token) {
    //       throw new Error('Token not available');
    //   }
    //   const smsresponse = await fetch(`${import.meta.env.VITE_API_URL}/appointment/sms/send`, { 
    //     method: 'POST', 
    //     body: JSON.stringify(apiSMSParam), 
    //     headers: { 
    //       'Content-Type': 'application/json',
    //       'Authorization': `Bearer ${token}`
    //     } 
    //   });

    //   if (smsresponse.ok) {
    //     toast.success('Payment details sent to patient via SMS');
    //   }
    //   else {
    //     toast.error('SMS failed to send. Please check integration.');
    //   }
    // }
    

    /**
     * Email Sender
     */
    if (invoice?.data && invoice?.data?.email) {
        
      // Create Email API parameters with payment details
      const apiEmailParam = {
            to: invoice?.data?.email,
            subject: `Payment Receipt - Invoice #${invoiceId}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
                <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 20px;">
                  <h1 style="color: #2563eb; margin: 0; font-size: 24px;">ADC Dental Clinic</h1>
                  <h2 style="color: #6b7280; margin: 10px 0 0 0; font-size: 16px;">Payment Receipt</h2>
                </div>
                
                <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
                  <h3 style="color: #374151; margin-top: 0; margin-bottom: 15px; font-size: 18px;">Payment Details</h3>
                  
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #6b7280; width: 40%;">Receipt Number:</td>
                      <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #111827;">#${payment?.payment_id.toString().padStart(6, '0')}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #6b7280;">Patient Name:</td>
                      <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #111827;">${payment?.patient_name || invoice?.data?.patient_name || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #6b7280;">Invoice Code:</td>
                      <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #111827;">${payment?.invoice_code || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #6b7280;">Received Amount:</td>
                      <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #059669; font-weight: bold; font-size: 16px;">${formatCurrency(payment?.received_amount || 0)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #6b7280;">Change Amount:</td>
                      <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #059669; font-weight: bold; font-size: 16px;">${formatCurrency(payment?.change_amount || 0)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #6b7280;">Amount Paid:</td>
                      <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #059669; font-weight: bold; font-size: 16px;">${formatCurrency(payment?.amount_paid || 0)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #6b7280;">Payment Method:</td>
                      <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #111827;">${payment?.method || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #6b7280;">Payment Date:</td>
                      <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #111827;">${payment?.payment_date ? new Date(payment.payment_date).toLocaleString() : 'N/A'}</td>
                    </tr>
                    ${payment?.transaction_ref ? `
                    <tr>
                      <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #6b7280;">Transaction Reference:</td>
                      <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #111827; font-family: monospace;">${payment.transaction_ref}</td>
                    </tr>
                    ` : ''}
                  </table>
                </div>
                
                ${payment?.notes ? `
                <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
                  <h4 style="color: #92400e; margin-top: 0; margin-bottom: 8px; font-size: 14px;">Notes:</h4>
                  <p style="color: #92400e; margin: 0; font-size: 14px;">${payment.notes}</p>
                </div>
                ` : ''}
                
                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                  <p style="color: #6b7280; margin: 0; font-size: 12px;">
                    This payment receipt was generated on ${new Date().toLocaleString()}
                  </p>
                  <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 12px;">
                    ADC Dental Clinic - Quality Dental Care
                  </p>
                </div>
              </div>
            `,
          };

      const token = localStorage.getItem('token');
      if (!token) {
          throw new Error('Token not available');
      }
      const emailresponse = await fetch(`${import.meta.env.VITE_API_URL}/appointment/email/send`, {
        method: 'POST',
        body: JSON.stringify(apiEmailParam),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (emailresponse.ok) {
        toast.success('Payment details sent to patient via Email');
      }
      else {
        toast.error('Email failed to send. Please check integration.');
      }
    }
  };

  const handleGeneratePDF = async () => {
    if (!payment) return;

    try {
      const blob = await pdf(
        <PaymentReceiptTemplate
          payment={payment}
          invoice={invoice}
        />
      ).toBlob();

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payment-receipt-${payment.invoice_code || payment.payment_id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('PDF receipt generated successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF receipt');
    }
  };

  if (!isOpen || !payment) return null;














  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Payment Details</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            Detailed information about payment {payment.invoice_code}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Payment Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Payment Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Patient Name</label>
                <div className="text-sm font-mono">{payment.patient_name}</div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Invoice Code</label>
                <div className="text-sm font-mono">{payment.invoice_code}</div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Received Amount</label>
                <div className="text-lg font-bold text-green-600">{formatCurrency(payment.received_amount)}</div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Change Amount</label>
                <div className="text-lg font-bold text-green-600">{formatCurrency(payment.change_amount)}</div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Amount Paid</label>
                <div className="text-lg font-bold text-green-600">{formatCurrency(payment.amount_paid)}</div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Payment Method</label>
                <div className="text-sm">{payment.method}</div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Payment Date</label>
                <div className="text-sm">{new Date(payment.payment_date).toLocaleString()}</div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <div className="text-sm">{getStatusBadge('completed')}</div>
              </div>
            </div>
          </div>

          {/* Transaction Details */}
          {payment.transaction_ref && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Transaction Details</h3>              
              {/* <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Amount Paid</label>
                <div className="text-lg font-bold text-green-600">{formatCurrency(payment.amount_paid)}</div>
              </div> */}
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Transaction Reference</label>
                <div className="text-sm font-mono bg-muted p-2 rounded">{payment.transaction_ref}</div>
              </div>
            </div>
          )}

          {/* Additional Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Additional Information</h3>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Payment Date</label>
              <div className="text-sm">{new Date(payment.payment_date).toLocaleString()}</div>
            </div>
          </div>

          {/* Notes/Comments Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Notes & Comments</h3>
            <div className="text-sm text-muted-foreground">
              <p>{payment.notes || 'No additional notes available for this payment.'}</p>
            </div>
          </div>
        </CardContent>
        <div className="flex items-center justify-end space-x-2 p-6 pt-0">
          <Button
            variant="outline"
            onClick={handleGeneratePDF}
          >
            <FileText className="h-4 w-4 mr-2" />
            Generate PDF
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowEmailConfirm(true)}
            disabled={!invoice?.data?.mobile_number && !invoice?.data?.email}
          >
            <Send className="h-4 w-4 mr-2" />
            Send Email to Patient
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </Card>

      {/* Email Confirmation Dialog */}
      <Dialog open={showEmailConfirm} onOpenChange={setShowEmailConfirm}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600" />
              Send Payment Receipt
            </DialogTitle>
            <DialogDescription>
              Confirm sending the payment receipt to the patient via email.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <FileText className="h-5 w-5 text-gray-600" />
                <div>
                  <p className="font-medium text-gray-900">Receipt #{payment?.payment_id.toString().padStart(6, '0')}</p>
                  <p className="text-sm text-gray-600">Amount: {formatCurrency(payment?.amount_paid || 0)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <User className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">Patient</p>
                  <p className="text-sm text-gray-600">{payment?.patient_name || invoice?.data?.patient_name || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <Mail className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">Email Address</p>
                  <p className="text-sm text-gray-600">{invoice?.data?.email}</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailConfirm(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                setShowEmailConfirm(false);
                void handleSendToPatient();
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Send className="h-4 w-4 mr-2" />
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentDetailsModal;