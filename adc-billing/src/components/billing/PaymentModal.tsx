import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { installmentApi, paymentApi, invoiceApi } from '@/lib/billing-api';
import { Installment } from '@/types';
import { toast } from 'sonner';
import { Calendar, CreditCard, QrCode, Link as LinkIcon, Copy, Send, RefreshCw } from 'lucide-react';

interface PaymentModalProps {
  installment: Installment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentSuccess?: () => void;
  onPaymentCompleted?: (paymentData: any) => void; // New prop for completed payments
}

export function PaymentModal({ installment, open, onOpenChange, onPaymentSuccess, onPaymentCompleted }: PaymentModalProps) {
  const queryClient = useQueryClient();
  const PAYMONGO_MIN_AMOUNT = 100; // PayMongo minimum payment amount
  
  const [paymentData, setPaymentData] = useState({
    amount: '',
    method: 'QR' as 'QR' | 'Bank Transfer' | 'Cash',
    transaction_ref: '',
    notes: '',
    proof_file: null as File | null
  });

  const [onlinePayment, setOnlinePayment] = useState<{
    paymentLink?: string;
    qrCode?: string;
    linkId?: string;
    convenienceFee: number;
    totalWithFee: number;
  } | null>(null);

  // Payment tracking states
  const [isTrackingPayment, setIsTrackingPayment] = useState(false);
  const [paymentLinkCreatedAt, setPaymentLinkCreatedAt] = useState<Date | null>(null);
  const [isPaymentExceeded, setIsPaymentExceeded] = useState(false);

  // Manual payment status check mutation (no longer automatic polling)
  const checkPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!installment?.invoice_id) throw new Error('No invoice ID');
      return await paymentApi.checkPaymentStatus(installment.invoice_id);
    },
    onSuccess: (response) => {
      console.log('PaymentModal - Manual payment check result:', response);
      handlePaymentStatusResponse(response);
    },
    onError: (error: any) => {
      console.error('PaymentModal - Error checking payment status:', error);
      toast.error('Failed to check payment status. Please try again.');
    }
  });


// Fetch invoice details
  const { data: invoice } = useQuery({
    queryKey: ['invoice', installment?.invoice_id],
    queryFn: () => invoiceApi.getInvoice(installment?.invoice_id || 0),
    enabled: !!installment?.invoice_id,
  });

  // Handle payment status response
  const handlePaymentStatusResponse = (paymentStatus: any) => {
    // console.log('PaymentModal - Processing payment status:', {
    //   isTrackingPayment,
    //   paymentLinkCreatedAt,
    //   payment_completed: paymentStatus?.data?.payment_completed,
    //   paymongo_status: paymentStatus?.data?.paymongo_status,
    //   latest_payment: paymentStatus?.data?.latest_payment,
    //   full_response: paymentStatus?.data
    // });

    // CRITICAL: Only proceed if ALL conditions are met:
    // 1. We're actively tracking payment
    // 2. We have a valid payment link creation timestamp
    // 3. The API says payment is completed
    if (!isTrackingPayment || !paymentLinkCreatedAt || !paymentStatus?.data?.payment_completed) {
      console.log('PaymentModal - Payment not completed yet:', {
        hasTracking: isTrackingPayment,
        hasTimestamp: !!paymentLinkCreatedAt,
        hasCompletedStatus: paymentStatus?.data?.payment_completed
      });
      toast.info('Payment not completed yet. Please try again after the customer completes the payment.');
      return;
    }

    const latestPayment = paymentStatus.data.recent_payments[0];
    
    // Additional safety check: must have payment data
    if (!latestPayment) {
      console.log('PaymentModal - No latest payment data, ignoring completed status');
      toast.info('Payment not found. Please ensure the customer has completed the payment.');
      return;
    }

    // For PayMongo payments, verify the payment is after our link creation and status is 'paid'
    if (paymentStatus?.data?.payment_completed) {
      const paymentTime = new Date(latestPayment.payment_date).getTime();
      const linkCreatedTime = paymentLinkCreatedAt.getTime();
      
      console.log('PaymentModal - PayMongo payment verification:', {
        paymentTime: new Date(latestPayment.payment_date),
        linkCreatedTime: paymentLinkCreatedAt,
        timeDiff: paymentTime - linkCreatedTime,
        isAfterCreation: paymentTime > linkCreatedTime
      });
      
      // Only show popup if payment was made after we created the link
      if (paymentStatus?.data?.isAfterLinkCreation) {
        console.log('PaymentModal - PayMongo payment confirmed, showing success popup');
        setIsTrackingPayment(false);
        
        const completedPayment = {
          invoice_id: installment?.invoice_id || 0,
          reference_number: paymentStatus.data.reference_number,
          amount_paid: latestPayment.amount_paid,
          payment_date: latestPayment.payment_date,
          method: 'QR',
          transaction_ref: latestPayment.transaction_ref || '',
        };
        
        // Close modal first
        onOpenChange(false);
        
        // Call parent success callback to refresh data
        onPaymentSuccess?.();
        
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['invoice-installments', installment?.invoice_id] });
        queryClient.invalidateQueries({ queryKey: ['invoice', installment?.invoice_id] });
        queryClient.invalidateQueries({ queryKey: ['installment-payments', installment?.installment_id] });
        
        // Pass success data to parent after a short delay
        setTimeout(() => {
          onPaymentCompleted?.(completedPayment);
        }, 300); // 300ms delay to ensure modal closes first
        
        return;
      } else {
        console.log('PaymentModal - PayMongo payment found but it was made before link creation, ignoring');
        toast.warning('Payment found, but it was made before this payment session. Please verify the payment details.');
        return;
      }
    }
    
    // For non-PayMongo payments, apply stricter timing rules
    if (latestPayment && !paymentStatus?.data?.payment_completed) {
      const paymentTime = new Date(latestPayment.payment_date).getTime();
      const tenMinutesAgo = Date.now() - (10 * 60 * 1000); // 10 minutes ago
      const isRecentPayment = paymentTime > tenMinutesAgo;
      
      // Payment must be made after we created the link (strict check)
      const linkCreatedTime = paymentLinkCreatedAt.getTime();
      const isAfterLinkCreation = paymentTime > linkCreatedTime;
      
      console.log('PaymentModal - Manual payment timing check:', {
        paymentTime: new Date(latestPayment.payment_date),
        isRecentPayment,
        linkCreatedTime: paymentLinkCreatedAt,
        isAfterLinkCreation,
        timeDiff: paymentTime - linkCreatedTime
      });
      
      if (isRecentPayment && isAfterLinkCreation) {
        console.log('PaymentModal - Manual payment confirmed, showing success popup');
        setIsTrackingPayment(false);
        
        const completedPayment = {
          invoice_id: installment?.invoice_id || 0,
          reference_number: paymentStatus.data.reference_number,
          amount_paid: latestPayment.amount_paid,
          payment_date: latestPayment.payment_date,
          method: latestPayment.method,
          transaction_ref: latestPayment.transaction_ref,
        };
        
        // Close modal first
        onOpenChange(false);
        
        // Call parent success callback to refresh data
        onPaymentSuccess?.();
        
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['invoice-installments', installment?.invoice_id] });
        queryClient.invalidateQueries({ queryKey: ['invoice', installment?.invoice_id] });
        queryClient.invalidateQueries({ queryKey: ['installment-payments', installment?.installment_id] });
        
        // Pass success data to parent after a short delay
        setTimeout(() => {
          onPaymentCompleted?.(completedPayment);
        }, 300); // 300ms delay to ensure modal closes first
      } else {
        // Payment exists but it's either old or from before our link creation
        console.log('PaymentModal - Payment found but it\'s either too old or from before link creation, not showing popup');
        toast.warning('Payment found, but it may be from a previous session or too old. Please verify the payment details.');
      }
    } else {
      console.log('PaymentModal - No valid payment data found for tracking check');
      toast.info('No recent payments found. Please ensure the customer has completed the payment.');
    }
  };

  // Manual check payment function
  const handleCheckPayment = () => {
    if (!isTrackingPayment || !paymentLinkCreatedAt) {
      toast.error('No active payment session to check');
      return;
    }
    
    console.log('PaymentModal - Manual payment check initiated');
    checkPaymentMutation.mutate();
  };

  // Reset form when modal opens/closes or installment changes
  useEffect(() => {
    if (installment && open) {
      const remainingAmount = installment.amount_due - installment.amount_paid;
      setPaymentData({
        amount: remainingAmount > 0 ? remainingAmount.toString() : '',
        method: 'QR',
        transaction_ref: '',
        notes: '',
        proof_file: null
      });
    } else if (!open) {
      // Only reset when modal is closed
      setPaymentData({
        amount: '',
        method: 'QR',
        transaction_ref: '',
        notes: '',
        proof_file: null
      });
      // Also reset online payment and tracking states when modal closes
      setOnlinePayment(null);
      setIsTrackingPayment(false);
      setPaymentLinkCreatedAt(null);
    }
  }, [installment, open]); // Removed problematic dependencies

  // Cleanup effect to stop tracking when component unmounts
  useEffect(() => {
    return () => {
      // Cleanup function to stop tracking when component unmounts
      if (isTrackingPayment) {
        console.log('PaymentModal - Component unmounting, stopping payment tracking');
        setIsTrackingPayment(false);
        setPaymentLinkCreatedAt(null);
      }
    };
  }, [isTrackingPayment]);

  /**
   * Generated payment link
   */
  const generateLinkMutation = useMutation({
    mutationFn: async (amount: number) => {
      const convenienceFee = amount * 0.02; // 2% fee for GCash
      const totalWithFee = amount + convenienceFee;
      
      return await paymentApi.generatePaymentLink({
        invoice_id: installment?.invoice_id || 0,
        amount: totalWithFee,
        description: `Installment #${installment?.installment_id} - Dental Payment`
      });
    },
    onSuccess: (response) => {
      const baseAmount = parseFloat(paymentData.amount);
      const convenienceFee = baseAmount * 0.02;
      const totalWithFee = baseAmount + convenienceFee;
      const linkCreatedTime = new Date();

      console.log('PaymentModal - Payment link generated, starting tracking:', {
        installment_id: installment?.installment_id,
        amount: baseAmount,
        totalWithFee,
        linkCreatedAt: linkCreatedTime
      });

      setOnlinePayment({
        paymentLink: response.data?.checkout_url || '',
        qrCode: response.data?.qr_code,
        linkId: response.data?.link_id || '',
        convenienceFee,
        totalWithFee
      });
      
      // Start payment tracking and record when the link was created
      setPaymentLinkCreatedAt(linkCreatedTime);
      setIsTrackingPayment(true);
      toast.success('Payment link generated successfully. Waiting for payment...');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to generate payment link');
    }
  });

  /**
   * Generate QR code payment
   */
  const generateQRMutation = useMutation({
    mutationFn: async (amount: number) => {
      const convenienceFee = amount * 0.02; // 2% fee for GCash
      const totalWithFee = amount + convenienceFee;
      
      return await paymentApi.generatePaymentQR({
        invoice_id: installment?.invoice_id || 0,
        amount: totalWithFee,
        description: `Installment #${installment?.installment_id} - Dental Payment`
      });
    },
    onSuccess: (response) => {
      const baseAmount = parseFloat(paymentData.amount);
      const convenienceFee = baseAmount * 0.02;
      const totalWithFee = baseAmount + convenienceFee;
      const qrCreatedTime = new Date();

      console.log('PaymentModal - QR code generated, starting tracking:', {
        installment_id: installment?.installment_id,
        amount: baseAmount,
        totalWithFee,
        qrCreatedAt: qrCreatedTime
      });

      setOnlinePayment({
        paymentLink: response.data?.checkout_url || '',
        qrCode: response.data?.qr_code || '',
        linkId: response.data?.link_id || '',
        convenienceFee,
        totalWithFee
      });
      
      // Start payment tracking and record when the QR was created
      setPaymentLinkCreatedAt(qrCreatedTime);
      setIsTrackingPayment(true);
      toast.success('QR code generated successfully. Waiting for payment...');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to generate QR code');
    }
  });

  /**
   * Manual Payment Recording
   */
  
  const recordPaymentMutation = useMutation({
    mutationFn: async (data: {
      invoice_id: number;
      amount: number;
      method: string;
      transaction_ref?: string;
      notes?: string;
      proof_file?: File;
    }) => {
      if (!installment) throw new Error('No installment selected');
      
      // Only allow Cash and Bank Transfer methods for manual payment recording
      if (data.method === 'QR') {
        throw new Error('Online payments should be processed through PayMongo, not manual recording');
      }

      // Create the payment first
      const paymentResponse = await installmentApi.recordPayment(installment.installment_id, {
        invoice_id: installment.invoice_id,
        amount: data.amount,
        method: data.method,
        transaction_ref: data.transaction_ref,
        notes: data.notes,
      });

      // If there's a proof file, upload it (this would need to be implemented in the API)
      // For now, we'll just pass the file name as proof_of_payment
      if (data.proof_file && paymentResponse.data?.payment_id) {
        // TODO: Implement file upload for installment payments
        // await paymentApi.uploadPaymentProof(paymentResponse.data.payment_id, data.proof_file);
      }

      return paymentResponse;
    },
    onSuccess: () => {
      toast.success('Payment recorded successfully');
      
      // Invalidate and refetch queries immediately
      queryClient.invalidateQueries({ queryKey: ['invoice-installments', installment?.invoice_id] });
      queryClient.invalidateQueries({ queryKey: ['invoice', installment?.invoice_id] });
      queryClient.invalidateQueries({ queryKey: ['installment-payments', installment?.installment_id] });
      
      // Also trigger immediate refetch
      queryClient.refetchQueries({ queryKey: ['invoice-installments', installment?.invoice_id] });
      queryClient.refetchQueries({ queryKey: ['invoice', installment?.invoice_id] });
      
      // Call the parent's success callback to refresh data
      onPaymentSuccess?.();
      
      // Close modal
      onOpenChange(false);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to record payment';
      toast.error(errorMessage);
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type and size
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!allowedTypes.includes(file.type)) {
        toast.error('Please upload a valid file (JPEG, PNG, GIF, or PDF)');
        return;
      }

      if (file.size > maxSize) {
        toast.error('File size must be less than 5MB');
        return;
      }

      setPaymentData(prev => ({
        ...prev,
        proof_file: file
      }));
    }
  };

  const handleGeneratePaymentLink = () => {
    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0 || isNaN(parseFloat(paymentData.amount))) {
      toast.error('Please enter a valid payment amount first');
      return;
    }
    if (parseFloat(paymentData.amount) < PAYMONGO_MIN_AMOUNT) {
      toast.error(`Online payment requires minimum PHP ${PAYMONGO_MIN_AMOUNT}.00. Please use Cash or Bank Transfer for smaller amounts.`);
      return;
    }
    generateLinkMutation.mutate(parseFloat(paymentData.amount));
  };

  const handleGenerateQR = () => {
    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0 || isNaN(parseFloat(paymentData.amount))) {
      toast.error('Please enter a valid payment amount first');
      return;
    }
    if (parseFloat(paymentData.amount) < PAYMONGO_MIN_AMOUNT) {
      toast.error(`Online payment requires minimum PHP ${PAYMONGO_MIN_AMOUNT}.00. Please use Cash or Bank Transfer for smaller amounts.`);
      return;
    }
    generateQRMutation.mutate(parseFloat(paymentData.amount));
  };

  const handleCopyLink = () => {
    if (onlinePayment?.paymentLink) {
      navigator.clipboard.writeText(onlinePayment.paymentLink);
      toast.success('Payment link copied to clipboard');
    }
  };

  const handleSendToPatient = async () => {

        /**
         * SMS Sender
         */
        if (invoice?.data && invoice?.data?.mobile_number) {
            
          // Create SMS API parameters
          const apiSMSParam = {
                to: "+63" + invoice?.data?.mobile_number,
                message: `Good day, ${invoice?.data?.patient_name}. You may pay your invoice #${installment?.invoice_id} using the following link: ${onlinePayment?.paymentLink}. Ammount to pay: ${formatCurrency(onlinePayment?.totalWithFee || 0)} (including convenience fee). Thank you!`,
              };
    
          const token = localStorage.getItem('token');
          if (!token) {
              throw new Error('Token not available');
          }
          const smsresponse = await fetch(`${import.meta.env.VITE_API_URL}/appointment/sms/send`, { 
            method: 'POST', 
            body: JSON.stringify(apiSMSParam), 
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            } 
          });
    
          if (smsresponse.ok) {
            toast.success('Payment link sent to patient via SMS/Email');
          }
          else {
            toast.warning('SMS/Email failed to send. Please check integration.');
          }
        }
        
    
        /**
         * Email Sender
         */
        if (invoice?.data && invoice?.data?.email) {
            
          // Create Email API parameters
          const apiEmailParam = {
                to: invoice?.data?.email,
                subject: `Payment Link for Invoice #${installment?.invoice_id}`,
                text: `Good day, ${invoice?.data?.patient_name}.<br/><br/>You may pay your invoice #${installment?.invoice_id} using the following link: <a href="${onlinePayment?.paymentLink}">${onlinePayment?.paymentLink}</a>.<br/>Amount to pay: ${formatCurrency(onlinePayment?.totalWithFee || 0)} (including convenience fee).<br/><br/>Thank you!`,
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
            toast.success('Payment link sent to patient via SMS/Email');
          }
          else {
            toast.warning('SMS/Email failed to send. Please check integration.');
          }
        }
    
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!installment) return;
    
    const amount = parseFloat(paymentData.amount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    const remainingAmount = installment.amount_due - installment.amount_paid;
    if (amount > remainingAmount) {
      toast.error(`Payment amount cannot exceed remaining balance of ${formatCurrency(remainingAmount)}`);
      return;
    }

    if (!paymentData.method) {
      toast.error('Please select a payment method');
      return;
    }

    // For Bank Transfer - transaction reference is required
    if (paymentData.method === 'Bank Transfer' && !paymentData.transaction_ref.trim()) {
      toast.error('Transaction reference is required for bank transfers');
      return;
    }

    // Validate proof file for Bank Transfer
    if (paymentData.method === 'Bank Transfer' && !paymentData.proof_file) {
      toast.error('Proof of payment is required for bank transfers');
      return;
    }

    recordPaymentMutation.mutate({
      invoice_id: installment.invoice_id,
      amount,
      method: paymentData.method,
      transaction_ref: paymentData.transaction_ref || undefined,
      notes: paymentData.notes || undefined,
      proof_file: paymentData.proof_file || undefined
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  //const invoiceData = invoice?.data;


useEffect(() => {
    
    if (!installment || !invoice) return;
    // Check if installment amount exceeds invoice net amount due
    if (installment?.amount_due > (invoice?.data?.net_amount_due ?? 0)) {
      //toast.warning('Warning: Installment amount exceeds invoice net amount due.');
      setIsPaymentExceeded(true);
    }
    else {
      //console.log('Installment amount is within invoice net amount due.');
      setIsPaymentExceeded(false);
    }
  }, [installment, invoice]);


  if (!installment) return null;

  const remainingAmount = installment.amount_due - installment.amount_paid;
  const isFullyPaid = remainingAmount <= 0;
  // Safe number conversion helper
  // const safeNumber = (value: any): number => {
  //   const num = Number(value);
  //   return isNaN(num) ? 0 : num;
  // };

  
  

  

  // useEffect(() => {
  //   // Check if installment amount exceeds invoice net amount due
  //   if (safeNumber(installment.amount_due) > safeNumber(invoiceData?.net_amount_due ?? 0)) {
  //     //toast.warning('Warning: Installment amount exceeds invoice net amount due.');
  //     //setIsPaymentExceeded(true);
  //   }
  //   // else {
  //   //   setIsPaymentExceeded(false);
  //   // }
  // }, [installment, invoiceData]);

  // if (safeNumber(installment.amount_due) > safeNumber(invoiceData?.net_amount_due ?? 0)) {
  //   //toast.warning('Warning: Installment amount exceeds invoice net amount due.');
  //   setIsPaymentExceeded(true);
  // }
  // else {
  //   setIsPaymentExceeded(false);
  // }



  //console.log('[TRACE] - installment:', installment);
  //console.log('[TRACE] - invoiceData:', invoiceData);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>Record Payment</span>
          </DialogTitle>
          <DialogDescription>
            Record a payment for installment #{installment.installment_id}
          </DialogDescription>
        </DialogHeader>

        {/* Installment Summary */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Due Date:</span>
            </div>
            <span className="text-sm">{formatDate(installment.due_date)}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">              
              <span className="text-sm font-medium">Amount Due:</span>
            </div>
            <span className="text-sm font-semibold">{formatCurrency(installment.amount_due)}</span>
          </div>
          
          {/* <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Amount Paid:</span>
            <span className="text-sm text-green-600">{formatCurrency(installment.amount_paid)}</span>
          </div>
          
          <div className="flex items-center justify-between border-t pt-2">
            <span className="text-sm font-medium">Remaining Balance:</span>
            <span className="text-sm font-semibold text-red-600">
              {formatCurrency(remainingAmount)}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status:</span>
            <Badge 
              className={
                installment.status === 'paid' 
                  ? 'bg-green-100 text-green-800 border-green-200'
                  : installment.status === 'overdue'
                  ? 'bg-red-100 text-red-800 border-red-200'
                  : 'bg-blue-100 text-blue-800 border-blue-200'
              }
            >
              {installment.status}
            </Badge>
          </div> */}
        </div>

        {isPaymentExceeded ? (
          <div className="text-center py-4">
            <div className="text-red-600 font-medium">This installment payment exceeds the invoice amount</div>
            <div className="text-sm text-muted-foreground">Please adjust the payment amount</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2" hidden={true}>
                <Label htmlFor="payment-amount">Payment Amount *</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  step="100"
                  placeholder="0.00"
                  value={paymentData.amount}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow empty string or valid numbers
                    if (value === '' || !isNaN(parseFloat(value))) {
                      setPaymentData(prev => ({ ...prev, amount: value }));
                    }
                  }}
                  onWheel={(e) => e.currentTarget.blur()}
                  max={remainingAmount}                  
                  required
                />
                <div className="text-xs text-muted-foreground">
                  Maximum: {formatCurrency(remainingAmount)}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-method">Payment Method *</Label>
                <Select 
                  value={paymentData.method} 
                  onValueChange={(value: 'QR' | 'Bank Transfer' | 'Cash') => {
                    setPaymentData(prev => ({ 
                      ...prev, 
                      method: value,
                      // Clear proof file when switching away from Bank Transfer
                      proof_file: value === 'Bank Transfer' ? prev.proof_file : null,
                      // Clear online payment when switching away from QR
                    }));
                    // Reset online payment and tracking when changing method
                    if (value !== 'QR') {
                      setOnlinePayment(null);
                      setIsTrackingPayment(false);
                      setPaymentLinkCreatedAt(null);
                    }
                  }}
                  disabled={isTrackingPayment}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="QR">QR Code Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

                  {
                /* Transaction Reference Field */
                paymentData.method === 'Bank Transfer' ? (
                  <div className="space-y-2">
                    <Label htmlFor="transaction-ref">
                      Transaction Reference
                      {paymentData.method === 'Bank Transfer' && <span className="text-red-500"> *</span>}
                    </Label>
                    <Input
                      id="transaction-ref"
                      placeholder={paymentData.method === 'Bank Transfer' ? "Required for bank transfers" : "Enter reference number (optional)"}
                      value={paymentData.transaction_ref}
                      onChange={(e) => setPaymentData(prev => ({ ...prev, transaction_ref: e.target.value }))}
                      required={paymentData.method === 'Bank Transfer'}
                    />
                    {paymentData.method === 'Bank Transfer' && (
                      <div className="text-xs text-amber-600">
                        Transaction reference is required for bank transfers
                      </div>
                    )}
                  </div>
                ) : null}

              

              <div className="space-y-2">
                <Label htmlFor="payment-notes">Notes</Label>
                <Textarea
                  id="payment-notes"
                  placeholder="Additional notes (optional)"
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                />
              </div>

              {/* Proof of Payment - Only for Bank Transfer */}
              {paymentData.method === 'Bank Transfer' && (
                <div className="space-y-2">
                  <Label htmlFor="proof-file">
                    Proof of Payment
                    <span className="text-red-500"> *</span>
                  </Label>
                  <Input
                    id="proof-file"
                    type="file"
                    accept=".jpg,.jpeg,.png,.gif,.pdf"
                    onChange={handleFileChange}
                    className="cursor-pointer"
                    required={paymentData.method === 'Bank Transfer'}
                  />
                  <div className="text-xs text-muted-foreground">
                    Upload receipt, screenshot, or document (JPEG, PNG, GIF, PDF - Max 5MB)
                    <span className="text-amber-600 block">Proof of payment is required for bank transfers</span>
                    {paymentData.proof_file && (
                      <div className="mt-1 text-green-600">
                        Selected: {paymentData.proof_file.name}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Online Payment Section - Show when QR method is selected */}
              {paymentData.method === 'QR' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
                  <div className="flex items-center space-x-2">
                    <QrCode className="h-5 w-5 text-blue-600" />
                    <h4 className="font-medium text-blue-900">Online Payment Options</h4>
                  </div>
                  
                  <div className="space-y-3">
                    {/* Show minimum amount warning */}
                    {paymentData.amount && !isNaN(parseFloat(paymentData.amount)) && parseFloat(paymentData.amount) < PAYMONGO_MIN_AMOUNT && (
                      <div className="text-sm text-amber-700 bg-amber-100 p-3 rounded border border-amber-300">
                        <strong>⚠️ PayMongo Limitation:</strong> Online payment requires a minimum of <strong>PHP {PAYMONGO_MIN_AMOUNT}.00</strong>. 
                        Please use <strong>Cash</strong> or <strong>Bank Transfer</strong> for amounts below this threshold.
                      </div>
                    )}
                    
                    <div className="text-sm text-blue-700 bg-blue-100 p-3 rounded">
                      <strong>Note:</strong> QR Code payments are processed through PayMongo online gateway. 
                      Use the buttons below to generate payment links or QR codes. Manual payment recording 
                      is not available for QR payments.
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3" hidden={isTrackingPayment}>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleGeneratePaymentLink}
                        disabled={
                          generateLinkMutation.isPending || 
                          !paymentData.amount || 
                          isTrackingPayment || 
                          isNaN(parseFloat(paymentData.amount)) ||
                          (!!paymentData.amount && parseFloat(paymentData.amount) < PAYMONGO_MIN_AMOUNT)
                        }
                        hidden={isTrackingPayment}
                        className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
                      >
                        <LinkIcon className="h-4 w-4 mr-2" />
                        {generateLinkMutation.isPending ? 'Generating...' : 'Generate Payment Link'}
                      </Button>
                      
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleGenerateQR}
                        disabled={
                          generateQRMutation.isPending || 
                          !paymentData.amount || 
                          isTrackingPayment || 
                          isNaN(parseFloat(paymentData.amount)) ||
                          (!!paymentData.amount && parseFloat(paymentData.amount) < PAYMONGO_MIN_AMOUNT)
                        }
                        hidden={isTrackingPayment}
                        className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
                      >
                        <QrCode className="h-4 w-4 mr-2" />
                        {generateQRMutation.isPending ? 'Generating...' : 'Generate QR Code'}
                      </Button>
                    </div>

                    {onlinePayment && (
                      <div className="space-y-3 border-t border-blue-200 pt-3">
                        <div className="text-sm">
                          <div className="flex justify-between">
                            <span>Base Amount:</span>
                            <span>{formatCurrency(onlinePayment.totalWithFee - onlinePayment.convenienceFee)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Convenience Fee (2%):</span>
                            <span>{formatCurrency(onlinePayment.convenienceFee)}</span>
                          </div>
                          <div className="flex justify-between font-semibold border-t pt-1">
                            <span>Total Amount:</span>
                            <span>{formatCurrency(onlinePayment.totalWithFee)}</span>
                          </div>
                        </div>

                        {onlinePayment.paymentLink && (
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Input
                                value={onlinePayment.paymentLink}
                                readOnly
                                className="text-xs"
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={handleCopyLink}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={handleSendToPatient}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}

                        {onlinePayment.qrCode && (
                          <div className="flex justify-center">
                            <img
                              src={onlinePayment.qrCode}
                              alt="Payment QR Code"
                              className="max-w-48 h-auto border rounded"
                            />
                          </div>
                        )}
                        
                        {/* Check Payment Button - Show when tracking payment */}
                        {isTrackingPayment && (
                          <div className="pt-3 border-t border-blue-200">
                            <Button
                              type="button"
                              onClick={handleCheckPayment}
                              disabled={checkPaymentMutation.isPending}
                              className="w-full bg-green-600 hover:bg-green-700 text-white"
                            >
                              <RefreshCw className={`h-4 w-4 mr-2 ${checkPaymentMutation.isPending ? 'animate-spin' : ''}`} />
                              {checkPaymentMutation.isPending ? 'Checking...' : 'Check Online Payment'}
                            </Button>
                            <div className="text-xs text-center text-blue-600 mt-2">
                              Click to check if customer has completed the payment
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={recordPaymentMutation.isPending}
              >
                Cancel
              </Button>
              {paymentData.method === 'QR' ? (
                <Button
                  type="button"
                  disabled
                  className="bg-gray-300 text-gray-500"
                >
                  Use Payment Link/QR Above
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={recordPaymentMutation.isPending || isFullyPaid}
                >
                  {recordPaymentMutation.isPending ? 'Recording...' : 'Record Payment'}
                </Button>
              )}
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}
