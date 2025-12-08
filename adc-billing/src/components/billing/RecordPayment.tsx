import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { invoiceApi, paymentApi } from '@/lib/billing-api';
import { ArrowLeft, QrCode, Link as LinkIcon, Copy, Send, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { PaymentSuccessPopup } from '@/components/billing/PaymentSuccessPopup';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export function RecordPayment() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const invoiceId = parseInt(id || '0');
  const amountMinLimit = 1; // Example limit for payment amount
  const PAYMONGO_MIN_AMOUNT = 100; // PayMongo minimum payment amount

  const [paymentData, setPaymentData] = useState({
    amount_paid: '100',
    change_amount: 0,
    received_amount: 0,
    method: 'QR' as 'QR' | 'Cash',
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
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [completedPaymentData, setCompletedPaymentData] = useState<any>(null);
  const [isPaymentAmountValid, setIsPaymentAmountValid] = useState(true);
  const [showOverpayConfirm, setShowOverpayConfirm] = useState(false);

  

  // Fetch invoice details
  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => invoiceApi.getInvoice(invoiceId),
    enabled: !!invoiceId,
  });

  // Fetch adjustments for this invoice (including refunds)
  const { data: adjustmentsData } = useQuery({
    queryKey: ['invoice-adjustments', invoiceId],
    queryFn: () => invoiceApi.getAdjustmentLogs(invoiceId),
    enabled: !!invoiceId,
  });

  // Manual payment status check mutation (no longer automatic polling)
  const checkPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!invoiceId) throw new Error('No invoice ID');
      return await paymentApi.checkPaymentStatus(invoiceId);
    },
    onSuccess: (response) => {
      console.log('RecordPayment - Manual payment check result:', response);
      handlePaymentStatusResponse(response);
    },
    onError: (error: any) => {
      console.error('RecordPayment - Error checking payment status:', error);
      toast.error('Failed to check payment status. Please try again.');
    }
  });

  // Handle payment status response
  const handlePaymentStatusResponse = (paymentStatus: any) => {
    // console.log('RecordPayment - Processing payment status:', {
    //   isTrackingPayment,
    //   paymentLinkCreatedAt,
    //   payment_completed: paymentStatus?.data?.payment_completed,
    //   paymongo_status: paymentStatus?.data?.paymongo_status,
    //   latest_payment: paymentStatus?.data?.recent_payments?.[0],
    //   full_response: paymentStatus?.data
    // });

    // CRITICAL: Only proceed if ALL conditions are met:
    // 1. We're actively tracking payment
    // 2. We have a valid payment link creation timestamp
    // 3. The API says payment is completed
    if (!isTrackingPayment || !paymentLinkCreatedAt || !paymentStatus?.data?.payment_completed) {
      console.log('RecordPayment - Payment not completed yet:', {
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
      console.log('RecordPayment - No latest payment data, ignoring completed status');
      toast.info('Payment not found. Please ensure the customer has completed the payment.');
      return;
    }

    // For PayMongo payments, verify the payment is after our link creation and status is 'paid'
    if (paymentStatus?.data?.payment_completed ) {
      const paymentTime = new Date(latestPayment.payment_date).getTime();
      const linkCreatedTime = paymentLinkCreatedAt.getTime();
      
      console.log('RecordPayment - PayMongo payment verification:', {
        paymentTime: new Date(latestPayment.payment_date),
        linkCreatedTime: paymentLinkCreatedAt,
        timeDiff: paymentTime - linkCreatedTime,
        isAfterCreation: paymentTime > linkCreatedTime
      });
      
      // Only show popup if payment was made after we created the link
      if (paymentStatus?.data?.isAfterLinkCreation) {
        console.log('RecordPayment - PayMongo payment confirmed, showing success popup');
        setIsTrackingPayment(false);
        
        const completedPayment = {
          invoice_id: invoiceId,
          reference_number: paymentStatus.data.reference_number,
          amount_paid: latestPayment.amount_paid,
          payment_date: latestPayment.payment_date,
          method: 'QR',
          transaction_ref: latestPayment.transaction_ref || '',
        };
        
        // Refresh data
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
        queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
        queryClient.invalidateQueries({ queryKey: ['invoice-payments', invoiceId] });
        
        // Show success popup
        setCompletedPaymentData(completedPayment);
        setShowSuccessPopup(true);
        
        return;
      } else {
        console.log('RecordPayment - PayMongo payment found but it was made before link creation, ignoring');
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
      
      console.log('RecordPayment - Manual payment timing check:', {
        paymentTime: new Date(latestPayment.payment_date),
        isRecentPayment,
        linkCreatedTime: paymentLinkCreatedAt,
        isAfterLinkCreation,
        timeDiff: paymentTime - linkCreatedTime
      });
      
      if (isRecentPayment && isAfterLinkCreation) {
        console.log('RecordPayment - Manual payment confirmed, showing success popup');
        setIsTrackingPayment(false);
        
        const completedPayment = {
          invoice_id: invoiceId,
          reference_number: paymentStatus.data.reference_number,
          amount_paid: latestPayment.amount_paid,
          payment_date: latestPayment.payment_date,
          method: latestPayment.method,
          transaction_ref: latestPayment.transaction_ref,
        };
        
        // Refresh data
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
        queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
        queryClient.invalidateQueries({ queryKey: ['invoice-payments', invoiceId] });
        
        // Show success popup
        setCompletedPaymentData(completedPayment);
        setShowSuccessPopup(true);
      } else {
        // Payment exists but it's either old or from before our link creation
        console.log('RecordPayment - Payment found but it\'s either too old or from before link creation, not showing popup');
        toast.warning('Payment found, but it may be from a previous session or too old. Please verify the payment details.');
      }
    } else {
      console.log('RecordPayment - No valid payment data found for tracking check');
      toast.info('No recent payments found. Please ensure the customer has completed the payment.');
    }
  };

  // Manual check payment function
  const handleCheckPayment = () => {
    if (!isTrackingPayment || !paymentLinkCreatedAt) {
      toast.error('No active payment session to check');
      return;
    }
    
    console.log('RecordPayment - Manual payment check initiated');
    checkPaymentMutation.mutate();
  };

  // Note: Automatic payment polling has been replaced with manual checking via handleCheckPayment()

  // Cleanup effect to stop tracking when component unmounts
  useEffect(() => {
    return () => {
      // Cleanup function to stop tracking when component unmounts
      if (isTrackingPayment) {
        console.log('RecordPayment - Component unmounting, stopping payment tracking');
        setIsTrackingPayment(false);
        setPaymentLinkCreatedAt(null);
      }
    };
  }, [isTrackingPayment]);

  // Generate payment link mutation
  const generateLinkMutation = useMutation({
    mutationFn: async (amount: number) => {
      const convenienceFee = amount * 0.02; // 2% fee for GCash
      const totalWithFee = amount + convenienceFee;
      
      return await paymentApi.generatePaymentLink({
        invoice_id: invoiceId,
        amount: totalWithFee,
        description: `Invoice #${invoiceId} - Dental Payment`
      });
    },
    onSuccess: (response) => {
      const baseAmount = parseFloat(paymentData.amount_paid);
      const convenienceFee = baseAmount * 0.02;
      const totalWithFee = baseAmount + convenienceFee;
      const linkCreatedTime = new Date();

      console.log('RecordPayment - Payment link generated, starting tracking:', {
        invoice_id: invoiceId,
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
   * Generate QR code mutation
   */  
  const generateQRMutation = useMutation({
    mutationFn: async (amount: number) => {
      const convenienceFee = amount * 0.02; // 2% fee for GCash
      const totalWithFee = amount + convenienceFee;
      
      return await paymentApi.generatePaymentQR({
        invoice_id: invoiceId,
        amount: totalWithFee,
        description: `Invoice #${invoiceId} - Dental Payment`
      });
    },
    onSuccess: (response) => {
      const baseAmount = parseFloat(paymentData.amount_paid);
      const convenienceFee = baseAmount * 0.02;
      const totalWithFee = baseAmount + convenienceFee;
      const qrCreatedTime = new Date();

      console.log('RecordPayment - QR code generated, starting tracking:', {
        invoice_id: invoiceId,
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
   * Handle form submission for manual payment recording
   * Creates a payment record via API
   */
  const createPaymentMutation = useMutation({
    mutationFn: async (data: any) => {
      // Only allow Cash and Bank Transfer methods for manual payment recording
      if (data.method === 'QR') {
        throw new Error('Online payments should be processed through PayMongo, not manual recording');
      }

      

      const netAmountDue = invoice?.data ? invoice.data.net_amount_due : 0;

      let change = parseFloat(data.amount_paid) - netAmountDue;
      change = change < 0 ? 0 : change;
      // console.log('[PAYMENT MUTATION] amount_paid:', parseFloat(data.amount_paid));
      // console.log('[PAYMENT MUTATION] net_amount_due:', netAmountDue);
      // console.log('[PAYMENT MUTATION] change amount:', change); 
      const paymentParam = {
        invoice_id: invoiceId,
        amount_paid: change > 0 ? netAmountDue : parseFloat(data.amount_paid),
        change_amount: change,
        received_amount: parseFloat(data.amount_paid),
        method: data.method,
        transaction_ref: data.transaction_ref || undefined,
      }
      //console.log('RecordPayment - Final payment parameters to send to API:', paymentParam);
      // First create the payment
      const paymentResponse = await paymentApi.createPayment(paymentParam);

      // // If there's a proof file, upload it
      // if (data.proof_file && paymentResponse.data?.payment_id) {
      //   await paymentApi.uploadPaymentProof(paymentResponse.data.payment_id, data.proof_file);
      // }

      return paymentResponse;
    },
    onSuccess: () => {
      toast.success('Payment recorded successfully');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoice-payments', invoiceId] });
      navigate(`/billing/invoices/${invoiceId}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to record payment');
    },
  });

  // const handleInputChange = (field: string, value: any) => {


  //   if (field === 'method') {

  //   }

  //   setPaymentData(prev => ({
  //     ...prev,
  //     [field]: value
  //   }));
  // };




  // const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const file = e.target.files?.[0];
  //   if (file) {
  //     // Validate file type and size
  //     const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
  //     const maxSize = 5 * 1024 * 1024; // 5MB

  //     if (!allowedTypes.includes(file.type)) {
  //       toast.error('Please upload a valid file (JPEG, PNG, GIF, or PDF)');
  //       return;
  //     }

  //     if (file.size > maxSize) {
  //       toast.error('File size must be less than 5MB');
  //       return;
  //     }

  //     setPaymentData(prev => ({
  //       ...prev,
  //       proof_file: file
  //     }));
  //   }
  // };

  const handleGeneratePaymentLink = () => {
    if (!paymentData.amount_paid || parseFloat(paymentData.amount_paid) <= 0 || isNaN(parseFloat(paymentData.amount_paid))) {
      toast.error('Please enter a valid payment amount first');
      return;
    }
    if (parseFloat(paymentData.amount_paid) < PAYMONGO_MIN_AMOUNT) {
      toast.error(`Online payment requires minimum PHP ${PAYMONGO_MIN_AMOUNT}.00. Please use Cash for smaller amounts.`);
      return;
    }
    generateLinkMutation.mutate(parseFloat(paymentData.amount_paid));
  };

  const handleGenerateQR = () => {
    if (!paymentData.amount_paid || parseFloat(paymentData.amount_paid) <= 0 || isNaN(parseFloat(paymentData.amount_paid))) {
      toast.error('Please enter a valid payment amount first');
      return;
    }
    if (parseFloat(paymentData.amount_paid) < PAYMONGO_MIN_AMOUNT) {
      toast.error(`Online payment requires minimum PHP ${PAYMONGO_MIN_AMOUNT}.00. Please use Cash for smaller amounts.`);
      return;
    }
    generateQRMutation.mutate(parseFloat(paymentData.amount_paid));
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
    // if (invoice?.data && invoice?.data?.mobile_number) {
        
    //   // Create SMS API parameters
    //   const apiSMSParam = {
    //         to: "+63" + invoice?.data?.mobile_number,
    //         message: `Good day, ${invoice?.data?.patient_name}. You may pay your invoice #${invoiceId} using the following link: ${onlinePayment?.paymentLink}. Ammount to pay: ${formatCurrency(onlinePayment?.totalWithFee || 0)} (including convenience fee). Thank you!`,
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
    //     toast.success('Payment link sent to patient via SMS/Email');
    //   }
    //   else {
    //     toast.warning('SMS/Email failed to send. Please check integration.');
    //   }
    // }
    

    /**
     * Email Sender
     */
    if (invoice?.data && invoice?.data?.email) {
        
      // Create Email API parameters
      const apiEmailParam = {
            to: invoice?.data?.email,
            subject: `Payment Link for Invoice #${invoiceId}`,
            html: `Good day, ${invoice?.data?.patient_name}.<br/><br/>You may pay your invoice #${invoiceId} using the following link: <a href="${onlinePayment?.paymentLink}">${onlinePayment?.paymentLink}</a>.<br/>Amount to pay: ${formatCurrency(onlinePayment?.totalWithFee || 0)} (including convenience fee).<br/><br/>Thank you!`,
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

    if (!paymentData.amount_paid || parseFloat(paymentData.amount_paid) <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    if (!invoice?.data) {
      toast.error('Invoice not found');
      return;
    }

    // Validate payment amount doesn't exceed outstanding balance
    //const outstandingBalance = invoice.data.net_amount_due;
    // if (parseFloat(paymentData.amount_paid) > outstandingBalance && paymentData.method === 'QR') {
    //   toast.error('Payment amount cannot exceed outstanding balance');
    //   return;
    // }
    //console.log('Outstanding balance:', outstandingBalance);
    //console.log('RecordPayment - Submitting manual payment:', paymentData);
    const changeAmount = parseFloat(paymentData.amount_paid) - invoiceData.net_amount_due;
    //console.log('Payment amount:', parseFloat(paymentData.amount_paid), invoiceData.net_amount_due);
    //console.log('Calculated change amount:', changeAmount);
    if (changeAmount > 0 && paymentData.method === 'Cash') {
      // open app-styled confirmation dialog instead of native confirm
      setShowOverpayConfirm(true);
      return;
    }

    

    // For GCash/Online Payment - transaction reference is optional (can be added after payment)
    // For Bank Transfer - transaction reference is required
    // if (paymentData.method === 'Bank Transfer' && !paymentData.transaction_ref.trim()) {
    //   toast.error('Transaction reference is required for bank transfers');
    //   return;
    // }

    // Validate proof file for Bank Transfer
    // if (paymentData.method === 'Bank Transfer' && !paymentData.proof_file) {
    //   toast.error('Proof of payment is required for bank transfers');
    //   return;
    // }

    //console.log('RecordPayment - Final payment data to submit:', paymentData);
    // If no overpayment confirmation required, proceed to create payment
    createPaymentMutation.mutate(paymentData);
  };

  // Confirm overpay handler (called from the dialog)
  const handleConfirmOverpay = () => {
    setShowOverpayConfirm(false);
    //console.log('RecordPayment - User confirmed overpayment, proceeding to record payment', paymentData);
    createPaymentMutation.mutate(paymentData);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!invoice?.data) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Invoice not found</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate('/billing/invoices')}
        >
          Back to Invoices
        </Button>
      </div>
    );
  }

  const invoiceData = invoice.data;
  
  const adjustments = adjustmentsData?.data || [];
  
  // Safe number conversion helper
  const safeNumber = (value: any): number => {
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  };
  
  // Calculate adjustment amounts from adjustments data (same logic as InvoiceDetail)
  const discountFromAdjustments = adjustments
    .filter((adj: any) => adj.type === 'discount')
    .reduce((sum: number, adj: any) => sum + Math.abs(safeNumber(adj.amount)), 0);
  
  const writeoffFromAdjustments = adjustments
    .filter((adj: any) => adj.type === 'write-off' || adj.reason?.toLowerCase().includes('write-off'))
    .reduce((sum: number, adj: any) => sum + Math.abs(safeNumber(adj.amount)), 0);
  
  const refundFromAdjustments = adjustments
    .filter((adj: any) => adj.type === 'refund' || adj.reason?.toLowerCase().includes('refund') || adj.reason?.toLowerCase().includes('return'))
    .reduce((sum: number, adj: any) => sum + Math.abs(safeNumber(adj.amount)), 0);
  
  // Calculate totals (use only adjustments data to avoid duplication)
  const totalDiscounts = discountFromAdjustments;
  const totalWriteoffs = writeoffFromAdjustments;
  const totalRefunds = refundFromAdjustments;
  const totalAdjustments = totalDiscounts + totalWriteoffs + totalRefunds;

  // Calculate final amount: original amount minus all adjustments
  const originalAmount = safeNumber(invoiceData.total_amount_estimated);
  const calculatedFinalAmount = originalAmount - totalAdjustments;
  const finalAmount = calculatedFinalAmount;

  // Calculate total payments made with safe number conversion
  const totalPayments = invoiceData.payments?.reduce((sum: number, payment: any) => {
    return sum + safeNumber(payment.amount_paid);
  }, 0) || 0;

  // Calculate outstanding balance
  const outstandingBalance = finalAmount - totalPayments;

  const netAmountDue = invoiceData.net_amount_due;



  const handleInputChange = (field: string, value: any) => {
    // If field is amount_paid and value is empty or invalid, don't update change calculation
    if (field === 'amount_paid') {
      // Allow empty string or valid numbers
      if (value === '' || !isNaN(parseFloat(value))) {
        const amount = parseFloat(value);
        const changeAmount = !isNaN(amount) ? amount - invoiceData.net_amount_due : 0;
        setPaymentData(prev => ({
          ...prev,
          [field]: value,
          change_amount: changeAmount > 0 ? changeAmount : 0
        }));
      }
    } else {
      // For other fields, just update normally
      setPaymentData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };


  
  useEffect(() => {
    if (paymentData){
    // Validate payment amount on initial load
    const amount = parseFloat(paymentData.amount_paid);
    
    // If amount is NaN or empty, mark as invalid
    if (!paymentData.amount_paid || isNaN(amount)) {
      setIsPaymentAmountValid(false);
      return;
    }
    
    if (paymentData.method === 'QR') {
      if ((amount > netAmountDue || amount < PAYMONGO_MIN_AMOUNT)) {
          setIsPaymentAmountValid(false);
        } else {
          setIsPaymentAmountValid(true);
        }
      } else {
        if (amount < amountMinLimit) {
          setIsPaymentAmountValid(false); 
        } else {
          setIsPaymentAmountValid(true);
        }
      }
    }
    
  }, [paymentData]);





  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/billing/invoices/${invoiceId}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Record Payment</h1>
          <p className="text-muted-foreground">
            Invoice #{invoiceData.invoice_id} - Patient ID: {invoiceData.patient_id}
          </p>
        </div>
      </div>

      {/* Invoice Summary */}
      <Card>
        <CardHeader>
      {/* Overpayment confirmation dialog */}
      <Dialog open={showOverpayConfirm} onOpenChange={(open) => setShowOverpayConfirm(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Overpayment</DialogTitle>
            <DialogDescription>
              The payment amount exceeds the outstanding balance. Proceeding will record the payment and issue change to the patient.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm">Payment Amount: <span className="font-medium">{formatCurrency(safeNumber(paymentData.amount_paid))}</span></p>
            <p className="text-sm">Net Amount Due: <span className="font-medium">{formatCurrency(invoiceData.net_amount_due)}</span></p>
            <p className="text-sm">Change: <span className="font-medium text-red-600">{formatCurrency(safeNumber(paymentData.amount_paid) - invoiceData.net_amount_due)}</span></p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOverpayConfirm(false)}>Cancel</Button>
            <Button onClick={handleConfirmOverpay}>Confirm and Record Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Success Popup */}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
              <p className="text-lg font-semibold">{formatCurrency(calculatedFinalAmount)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Outstanding Balance</p>
              <p className="text-lg font-semibold text-red-600">{formatCurrency(outstandingBalance)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Form */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
          <CardDescription>
            Record a new payment for this invoice
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Payment Method */}
            <div className="space-y-2">
              <Label htmlFor="method">Payment Method *</Label>
              <Select
                value={paymentData.method}
                onValueChange={(value: 'QR' | 'Cash') => {
                  handleInputChange('method', value);
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
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="QR">GCash / Online Payment</SelectItem>                  
                  <SelectItem value="Cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Payment Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="100"
                placeholder="0.00"
                value={paymentData.amount_paid}
                onChange={(e) => handleInputChange('amount_paid', e.target.value)}
                onWheel={(e) => e.currentTarget.blur()}
                required
                //min={1}
                //max={netAmountDue}
                disabled={isTrackingPayment}
              />
              {safeNumber(paymentData.amount_paid) > netAmountDue && paymentData.method === 'QR' && (
                <p className="text-xs text-red-600">Amount cannot exceed {formatCurrency(netAmountDue)}</p>
              )}
              {safeNumber(paymentData.amount_paid) < PAYMONGO_MIN_AMOUNT && paymentData.method === 'QR' && (
                <p className="text-xs text-red-600">Online payment requires minimum {formatCurrency(PAYMONGO_MIN_AMOUNT)}</p>
              )}
              {safeNumber(paymentData.amount_paid) < amountMinLimit && paymentData.method !== 'QR' && (
                <p className="text-xs text-red-600">Amount cannot be less than {formatCurrency(amountMinLimit)}</p>
              )}

              {
                paymentData.method === 'QR' ? (
                  <p className="text-xs text-muted-foreground">
                    Minimum Limit: {formatCurrency(PAYMONGO_MIN_AMOUNT)} - Maximum (Net Amount Due): {formatCurrency(netAmountDue)}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Minimum Limit: {formatCurrency(amountMinLimit)} - Maximum: No limit
                  </p>
                )
              }
              {
                paymentData.method !== 'QR' && (
                  <p className="text-sm text-muted-foreground">
                    <p>Payment Amount: {formatCurrency(safeNumber(paymentData.amount_paid))} </p>
                    <p>Net Amount Due: {formatCurrency(netAmountDue)} </p>
                    <span className='text-sm text-green-500'>Change: {safeNumber(paymentData.amount_paid) - netAmountDue > 0 ? formatCurrency(safeNumber(paymentData.amount_paid) - netAmountDue) : '0.00'}</span>
                  </p>
                )
              }
            </div>



            {/* GCash / Online Payment Options */}
            {paymentData.method === 'QR' && (
              <Card className="border-2 border-primary/20 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Online Payment Options</CardTitle>
                  <CardDescription className="text-sm">
                    Generate a payment link or QR code for the patient
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Show minimum amount warning */}
                  {parseFloat(paymentData.amount_paid) < PAYMONGO_MIN_AMOUNT && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                      <div className="flex items-start gap-2">
                        <div className="text-amber-600 font-medium text-sm">
                          ⚠️ PayMongo Limitation
                        </div>
                      </div>
                      <p className="text-sm text-amber-800 mt-1">
                        Online payment requires a minimum of <strong>{formatCurrency(PAYMONGO_MIN_AMOUNT)}</strong>. 
                        Please use <strong>Cash</strong> payment method for amounts below this threshold.
                      </p>
                    </div>
                  )}

                  {/* Show convenience fee info */}
                  {isPaymentAmountValid && paymentData.amount_paid && !isNaN(parseFloat(paymentData.amount_paid)) && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Base Amount:</span>
                          <span className="font-medium">{formatCurrency(parseFloat(paymentData.amount_paid))}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Convenience Fee (2%):</span>
                          <span className="font-medium">{formatCurrency(parseFloat(paymentData.amount_paid) * 0.02)}</span>
                        </div>
                        <div className="flex justify-between border-t border-yellow-300 pt-1 mt-1">
                          <span className="font-semibold">Total to Pay:</span>
                          <span className="font-semibold text-lg">{formatCurrency(parseFloat(paymentData.amount_paid) * 1.02)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Generate buttons */}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={handleGeneratePaymentLink}
                      disabled={!isPaymentAmountValid || generateLinkMutation.isPending || isTrackingPayment}
                    >
                      <LinkIcon className="h-4 w-4 mr-2" />
                      {generateLinkMutation.isPending ? 'Generating...' : 'Generate Payment Link'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={handleGenerateQR}
                      disabled={!isPaymentAmountValid|| generateQRMutation.isPending || isTrackingPayment}
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      {generateQRMutation.isPending ? 'Generating...' : 'Generate QR Code'}
                    </Button>
                  </div>

                  {/* Payment Link Display */}
                  {onlinePayment?.paymentLink && !onlinePayment?.qrCode && (
                    <div className="space-y-3 p-4 bg-white border border-gray-200 rounded-md">
                      <div>
                        <Label className="text-sm font-medium">Payment Link (auto-generated)</Label>
                        <div className="flex items-center gap-2 mt-2">
                          <Input
                            value={onlinePayment.paymentLink}
                            readOnly
                            className="font-mono text-xs"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={handleCopyLink}
                        >
                          <Copy className="h-3 w-3 mr-2" />
                          Copy Link
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={handleSendToPatient}
                        >
                          <Send className="h-3 w-3 mr-2" />
                          Send to Patient via SMS/Email
                        </Button>
                      </div>
                      
                      {/* Check Payment Button - Show when tracking payment */}
                      {isTrackingPayment && (
                        <div className="pt-3 border-t border-gray-200">
                          <Button
                            type="button"
                            onClick={handleCheckPayment}
                            disabled={checkPaymentMutation.isPending}
                            className="w-full bg-green-600 hover:bg-green-700 text-white"
                          >
                            <RefreshCw className={`h-4 w-4 mr-2 ${checkPaymentMutation.isPending ? 'animate-spin' : ''}`} />
                            {checkPaymentMutation.isPending ? 'Checking...' : 'Check Online Payment'}
                          </Button>
                          <div className="text-xs text-center text-gray-600 mt-2">
                            Click to check if customer has completed the payment
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* QR Code Display */}
                  {onlinePayment?.qrCode && (
                    <div className="space-y-3 p-4 bg-white border border-gray-200 rounded-md">
                      <div className="text-center">
                        <Label className="text-sm font-medium">Scan QR Code to Pay</Label>
                        <div className="mt-3 flex justify-center">
                          <div className="p-4 bg-white border-2 border-gray-300 rounded-lg inline-block">
                            {/* QR Code Image - base64 encoded */}
                            <img
                              src={onlinePayment.qrCode.startsWith('data:') ? onlinePayment.qrCode : `data:image/png;base64,${onlinePayment.qrCode}`}
                              alt="Payment QR Code"
                              className="w-48 h-48"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          *Patient scans QR using GCash app or bank app
                        </p>
                      </div>
                      {onlinePayment?.paymentLink && (
                        <div className="pt-2 border-t">
                          <Label className="text-xs text-muted-foreground">Payment Link:</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <Input
                              value={onlinePayment.paymentLink}
                              readOnly
                              className="font-mono text-xs h-8"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleCopyLink}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {/* Check Payment Button - Show when tracking payment */}
                      {isTrackingPayment && (
                        <div className="pt-3 border-t border-gray-200">
                          <Button
                            type="button"
                            onClick={handleCheckPayment}
                            disabled={checkPaymentMutation.isPending}
                            className="w-full bg-green-600 hover:bg-green-700 text-white"
                          >
                            <RefreshCw className={`h-4 w-4 mr-2 ${checkPaymentMutation.isPending ? 'animate-spin' : ''}`} />
                            {checkPaymentMutation.isPending ? 'Checking...' : 'Check Online Payment'}
                          </Button>
                          <div className="text-xs text-center text-gray-600 mt-2">
                            Click to check if customer has completed the payment
                          </div>
                        </div>
                      )}


                      {/* Stop Tracking Button */}
                      {
                        isTrackingPayment && (
                          <div className="mt-4">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setIsTrackingPayment(false);
                                setPaymentLinkCreatedAt(null); // Reset the timestamp
                                toast.info('Payment tracking stopped');
                              }}
                              className="text-xs"
                            >
                              Stop Tracking
                            </Button>
                          </div>
                        )
                      }
                      
                      
                    </div>
                  )}

                  {/* Manual confirmation section */}
                  {onlinePayment && !isTrackingPayment && (
                    <div className="pt-3 border-t border-gray-200">
                      <p className="text-xs text-muted-foreground mb-2">
                        After patient completes payment, enter the reference number below:
                      </p>
                      <div className="space-y-2">
                        <Label htmlFor="reference" className="text-sm">
                          Reference No. (optional)
                        </Label>
                        <Input
                          id="reference"
                          placeholder="Enter GCash reference number"
                          value={paymentData.transaction_ref}
                          onChange={(e) => handleInputChange('transaction_ref', e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Transaction Reference - Only for Bank Transfer */}
            {/* {paymentData.method === 'Bank Transfer' && (
              <div className="space-y-2">
                <Label htmlFor="reference">
                  Transaction Reference *
                  {paymentData.method === 'Bank Transfer' && ' (Bank Reference No.)'}
                </Label>
                <Input
                  id="reference"
                  placeholder="Enter transaction reference"
                  value={paymentData.transaction_ref}
                  onChange={(e) => handleInputChange('transaction_ref', e.target.value)}
                  disabled={!isPaymentAmountValid}
                  required
                />
              </div>
            )} */}

            {/* Proof of Payment Upload */}
            {/* {paymentData.method === 'Bank Transfer' && (
              <div className="space-y-2">
                <Label htmlFor="proof">Proof of Payment *</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="proof"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('proof')?.click()}
                    disabled={!isPaymentAmountValid}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {paymentData.proof_file ? paymentData.proof_file.name : 'Upload Proof'}
                  </Button>
                  {paymentData.proof_file && (
                    <Badge variant="secondary">
                      <FileText className="h-3 w-3 mr-1" />
                      {paymentData.proof_file.name}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Upload bank receipt, transfer confirmation, or screenshot (JPEG, PNG, PDF, max 5MB)
                </p>
              </div>
            )} */}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes about this payment..."
                value={paymentData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                disabled={!isPaymentAmountValid}
                rows={3}
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex items-center justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/billing/invoices/${invoiceId}`)}
              >
                Cancel
              </Button>
              {/* Only show Record Payment button for Cash and Bank Transfer methods */}
              {paymentData.method !== 'QR' && isPaymentAmountValid && (
                <Button
                  type="submit"
                  //disabled={!isPaymentAmountValid}
                >
                  {createPaymentMutation.isLoading ? 'Recording...' : 'Record Payment'}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      
      {/* Payment Success Popup */}
      {showSuccessPopup && completedPaymentData && (
        <PaymentSuccessPopup
          isOpen={showSuccessPopup}
          onClose={() => {
            setShowSuccessPopup(false);
            setCompletedPaymentData(null);
            setPaymentLinkCreatedAt(null); // Reset tracking timestamp
            // Navigate back to invoice detail
            navigate(`/billing/invoices/${invoiceId}`);
          }}
          paymentData={completedPaymentData}
        />
      )}
    </div>
  );
}
