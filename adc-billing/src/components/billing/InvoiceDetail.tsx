import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { invoiceApi, paymentApi } from '@/lib/billing-api';
import { Payment } from '@/types';
import { InvoicePDFGenerator } from './InvoicePDFGenerator';
import { generateInvoiceEmailHTML } from './InvoiceEmailTemplate';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  CreditCard, 
  Calendar, 
  Settings, 
  User,
  Clock,
  AlertCircle,
  CheckCircle,
  FileText,
  Mail
} from 'lucide-react';

export function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const invoiceId = parseInt(id || '0');

  // Fetch invoice details
  const { data: invoice, isLoading: invoiceLoading, error: invoiceError } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => invoiceApi.getInvoice(invoiceId),
    enabled: !!invoiceId,
  });

  // Fetch payments for this invoice
  const { data: paymentsData, isLoading: paymentsLoading } = useQuery({
    queryKey: ['invoice-payments', invoiceId],
    queryFn: () => paymentApi.getPayments(invoiceId),
    enabled: !!invoiceId,
  });

  // Fetch adjustments for this invoice (including refunds)
  const { data: adjustmentsData } = useQuery({
    queryKey: ['invoice-adjustments', invoiceId],
    queryFn: () => invoiceApi.getAdjustmentLogs(invoiceId),
    enabled: !!invoiceId,
  });


  const totalChange = paymentsData?.data?.reduce((sum, payment) => sum + Number(payment.change_amount), 0) || 0;
  const totalReceived = paymentsData?.data?.reduce((sum, payment) => sum + Number(payment.received_amount), 0) || 0;

  // Calculate payment totals with better accuracy
  const totalPaid = paymentsData?.data?.reduce((sum, payment) => sum + Number(payment.amount_paid), 0) || 0;
  const invoiceData = invoice?.data;
  
  // Enhanced payment calculations with proper subtotal calculation
  // Calculate subtotal from actual treatment charges
  const subtotal = invoiceData?.treatments?.reduce((sum: number, treatment: any) => {
    const amount = Number(treatment.final_amount) || Number(treatment.estimated_amount) || 0;
    return sum + amount;
  }, 0) || invoiceData?.total_amount_estimated || 0;
  
  const discountAmount = invoiceData?.discount_amount || 0;
  //const _writeoffAmount = invoiceData?.writeoff_amount || 0;
  
  // Calculate adjustment amounts from adjustments data
  const adjustments = adjustmentsData?.data || [];
  const discountFromAdjustments = adjustments
    .filter((adj: any) => adj.type === 'discount')
    .reduce((sum: number, adj: any) => sum + Math.abs(Number(adj.amount)), 0) || 0;
  
  const refundAmount = adjustments
    .filter((adj: any) => adj.type === 'refund' || adj.reason?.toLowerCase().includes('refund') || adj.reason?.toLowerCase().includes('return'))
    .reduce((sum: number, adj: any) => sum + Math.abs(Number(adj.amount)), 0) || 0;
  
  

const writeoffAmount = adjustments
    .filter((adj: any) => adj.type === 'write-off' || adj.reason?.toLowerCase().includes('write-off') || adj.reason?.toLowerCase().includes('return'))
    .reduce((sum: number, adj: any) => sum + Math.abs(Number(adj.amount)), 0) || 0;
  


  // Calculate total amount after adjustments
  const totalDiscounts = discountAmount + discountFromAdjustments;
  const calculatedNetAmount = subtotal - (totalDiscounts + writeoffAmount + refundAmount);
  const netAmount = calculatedNetAmount; // Use calculated amount instead of potentially stale DB value

  const balanceDue = netAmount - totalPaid;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'partial':
        return <Clock className="h-4 w-4 text-amber-600" />;
      case 'unpaid':
      case 'overdue':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleSendEmail = async () => {
    if (!invoiceData?.email) {
      toast.error('Patient email address not available');
      return;
    }

    try {
      const emailHTML = generateInvoiceEmailHTML(invoiceData, paymentsData?.data || [], adjustmentsData?.data || []);
      
      const apiEmailParam = {
        to: invoiceData.email,
        subject: `Invoice ${invoiceData.invoice_code} - ADC Dental Clinic`,
        html: emailHTML,
      };

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not available');
      }

      const emailResponse = await fetch(`${import.meta.env.VITE_API_URL}/appointment/email/send`, {
        method: 'POST',
        body: JSON.stringify(apiEmailParam),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (emailResponse.ok) {
        toast.success('Invoice sent to patient via email successfully');
      } else {
        const errorData = await emailResponse.json();
        throw new Error(errorData.message || 'Failed to send email');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Failed to send email. Please try again.');
    }
  };

  if (invoiceLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading invoice details...</p>
        </div>
      </div>
    );
  }

  if (invoiceError || !invoiceData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Invoice Not Found</h2>
            <p className="text-muted-foreground mt-2">The requested invoice could not be found or you don't have permission to view it.</p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate('/billing/invoices')}
            className="mt-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Invoices
          </Button>
        </div>
      </div>
    );
  }
 
  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Modern Header Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/60">
          <div className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              {/* Invoice Title & Back Button */}
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/billing/invoices')}
                  className="h-9 px-3"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <div className="flex gap-2">                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const email = invoiceData?.email || 'the patient';
                      const code = invoiceData?.invoice_code || '';
                      const confirmed = window.confirm(`Send invoice ${code} to ${email}?`);
                      if (confirmed) {
                        void handleSendEmail();
                      }
                    }}
                    disabled={!invoiceData.email}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Email Invoice
                  </Button>
                  <InvoicePDFGenerator
                    invoice={invoiceData}
                    payments={paymentsData?.data || []}
                    adjustments={adjustmentsData?.data || []}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/billing/invoices/${invoiceId}/record-payment`)}
                    disabled={invoiceData.status === 'paid' && balanceDue <= 0}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Record Payment
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/billing/invoices/${invoiceId}/installments`)}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Installments
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/billing/invoices/${invoiceId}/adjustments`)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Adjustments
                  </Button>
                  {/* <Button
                    size="sm"
                    onClick={() => navigate(`/billing/invoices/${invoiceId}/edit`)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button> */}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/60">
          <div className="p-6">
              
              {/* Invoice Header */}
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-3xl font-bold text-gray-900">Invoice #: {invoiceData.invoice_code}</h1>
                  {/* <Badge className={`${getStatusColor(invoiceData.status)} border px-3 py-1 font-medium`}>
                    {getStatusIcon(invoiceData.status)}
                    <span className="ml-1 capitalize">{invoiceData.status.replace('_', ' ')}</span>
                  </Badge> */}
                </div>
                <p className="text-gray-600 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Created on {formatDate(invoiceData.created_at)}
                </p>
              </div>


              {/* Financial Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-700 mb-1">Total Amount</p>
                        <p className="text-2xl font-bold text-blue-900">{formatCurrency(netAmount)}</p>
                      </div>
                      {/* <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Receipt className="h-6 w-6 text-blue-600" />
                      </div> */}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-700 mb-1">Amount Paid</p>
                        <p className="text-2xl font-bold text-green-900">{formatCurrency(totalPaid)}</p>
                      </div>
                      {/* <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      </div> */}
                    </div>
                  </CardContent>
                </Card>

                <Card className={`bg-gradient-to-br ${balanceDue > 0 ? 'from-red-50 to-red-100/50 border-red-200' : 'from-green-50 to-green-100/50 border-green-200'}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-sm font-medium ${balanceDue > 0 ? 'text-red-700' : 'text-green-700'} mb-1`}>Balance Due</p>
                        <p className={`text-2xl font-bold ${balanceDue > 0 ? 'text-red-900' : 'text-green-900'}`}>{invoiceData.net_amount_due}</p>
                        {/* <p className={`text-2xl font-bold ${balanceDue > 0 ? 'text-red-900' : 'text-green-900'}`}>{formatCurrency(balanceDue)}</p> */}
                      </div>
                      {/* <div className={`h-12 w-12 ${balanceDue > 0 ? 'bg-red-100' : 'bg-green-100'} rounded-lg flex items-center justify-center`}>
                        <DollarSign className={`h-6 w-6 ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`} />
                      </div> */}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-gray-50 to-gray-100/50 border-gray-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Payment Status</p>
                        <p className="text-lg font-semibold text-gray-900 capitalize">
                          {invoiceData.status.replace('_', ' ')}
                        </p>
                      </div>
                      <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        {getStatusIcon(invoiceData.status)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>



          </div>
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Patient Information */}
            <Card className="bg-white shadow-sm border border-gray-200/60">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5 text-gray-600" />
                  Patient Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500">Patient ID</p>
                    <p className="text-base font-semibold text-gray-900">{invoiceData.patient_id}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500">Patient Name</p>
                    <p className="text-base font-semibold text-gray-900">{invoiceData.patient_name || 'N/A'}</p>
                  </div>
                  {/* <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-500">Dentist Name</p>
                    <p className="text-base font-semibold text-gray-900">{invoiceData.dentist_name || 'N/A'}</p>
                  </div> */}
                </div>
              </CardContent>
            </Card>

            {/* Invoice Items */}
            <Card className="bg-white shadow-sm border border-gray-200/60">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5 text-gray-600" />
                    Invoice Items
                  </CardTitle>
                  <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                    {invoiceData.treatments?.length || 0} service(s)
                  </Badge>
                </div>
                <CardDescription>
                  Services and charges for this invoice
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {invoiceData.treatments && invoiceData.treatments.length > 0 ? (
                    <div className="space-y-4">
                      {invoiceData.treatments.map((treatment: any, index: number) => (
                        <div key={treatment.charge_id || index} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50/50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-lg text-gray-900">{treatment.service_name}</h4>
                                <Badge 
                                  variant="secondary"
                                  className="text-xs bg-gray-100 text-gray-800 border-gray-200"
                                >
                                  {treatment.status}
                                </Badge>
                              </div>
                              {treatment.notes && (
                                <p className="text-sm text-gray-600 mb-3 p-2 bg-gray-50 rounded">{treatment.notes}</p>
                              )}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-6 text-sm">
                                  <div>
                                    <span className="text-gray-500">Estimated:</span>
                                    <span className="font-semibold ml-2 text-gray-900">{formatCurrency(treatment.estimated_amount || 0)}</span>
                                  </div>
                                  {treatment.final_amount && treatment.final_amount !== treatment.estimated_amount && (
                                    <div>
                                      <span className="text-gray-500">Final:</span>
                                      <span className="font-semibold ml-2 text-green-700">{formatCurrency(treatment.final_amount)}</span>
                                    </div>
                                  )}
                                </div>
                                <div className="text-right">
                                  <span className="text-xl font-bold text-gray-900">
                                    {formatCurrency(treatment.final_amount || treatment.estimated_amount || 0)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Financial Summary */}
                      <div className="border-t border-gray-200 pt-4 mt-6 bg-gray-50/50 p-4 rounded-lg">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Subtotal</span>
                            <span className="font-medium text-gray-900">{formatCurrency(subtotal)}</span>
                          </div>
                          {totalDiscounts > 0 && (
                            <div className="flex justify-between items-center text-green-600">
                              <span>Discount</span>
                              <span className="font-medium">-{formatCurrency(totalDiscounts)}</span>
                            </div>
                          )}
                          {writeoffAmount > 0 && (
                            <div className="flex justify-between items-center text-red-600">
                              <span>Write-off</span>
                              <span className="font-medium">-{formatCurrency(writeoffAmount)}</span>
                            </div>
                          )}
                          {refundAmount > 0 && (
                            <div className="flex justify-between items-center text-blue-600">
                              <span>Refund</span>
                              <span className="font-medium">-{formatCurrency(refundAmount)}</span>
                            </div>
                          )}
                          <hr className="border-gray-300" />
                          <div className="flex justify-between items-center text-lg font-semibold">
                            <span className="text-gray-900">Total Amount</span>
                            <span className="text-gray-900">{formatCurrency(netAmount)}</span>
                          </div>
                          {totalPaid > 0 && (
                            <div className="flex justify-between items-center text-green-600">
                              <span>Total Amount Received</span>
                              <span className="font-semibold">{formatCurrency(totalReceived)}</span>
                            </div>
                          )}
                          {totalPaid > 0 && (
                            <div className="flex justify-between items-center text-green-600">
                              <span>Change</span>
                              <span className="font-semibold">{formatCurrency(totalChange)}</span>
                            </div>
                          )}
                          {totalPaid > 0 && (
                            <div className="flex justify-between items-center text-green-600">
                              <span>Amount Paid</span>
                              <span className="font-semibold">-{formatCurrency(totalPaid)}</span>
                            </div>
                          )}
                          <hr className="border-gray-300" />
                          <div className="flex justify-between items-center text-xl font-bold">
                            <span className="text-gray-900">Balance Due</span>
                            <span className={balanceDue > 0 ? 'text-red-600' : 'text-green-600'}>
                              {formatCurrency(balanceDue)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg">No invoice items found</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Payment History & Adjustments */}
          <div className="space-y-6">
            {/* Adjustments History */}
            <Card className="bg-white shadow-sm border border-gray-200/60">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Settings className="h-5 w-5 text-gray-600" />
                  Adjustments History
                </CardTitle>
                <CardDescription>
                  All adjustments made to this invoice
                </CardDescription>
              </CardHeader>
              <CardContent>
                {adjustments && adjustments.length > 0 ? (
                  <div className="space-y-4">
                    {adjustments.map((adjustment: any, index: number) => {
                      const isRefund = adjustment.type === 'refund' || adjustment.reason?.toLowerCase().includes('refund') || adjustment.reason?.toLowerCase().includes('return');
                      const isDiscount = adjustment.type === 'discount' || adjustment.reason?.toLowerCase().includes('discount') || adjustment.reason?.toLowerCase().includes('promo');
                      const isWriteoff = adjustment.type === 'writeoff' || adjustment.reason?.toLowerCase().includes('write') || adjustment.reason?.toLowerCase().includes('write-off');
                      
                      const getAdjustmentColor = () => {
                        if (isRefund) return 'bg-blue-100 text-blue-800 border-blue-200';
                        if (isDiscount) return 'bg-green-100 text-green-800 border-green-200';
                        if (isWriteoff) return 'bg-red-100 text-red-800 border-red-200';
                        return 'bg-gray-100 text-gray-800 border-gray-200';
                      };

                      const getAdjustmentIcon = () => {
                        if (isRefund) return <ArrowLeft className="h-3 w-3 mr-1" />;
                        if (isDiscount) return <CheckCircle className="h-3 w-3 mr-1" />;
                        if (isWriteoff) return <AlertCircle className="h-3 w-3 mr-1" />;
                        return <Settings className="h-3 w-3 mr-1" />;
                      };

                      return (
                        <div key={adjustment.adjustment_id || index} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50/50 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-semibold text-gray-900">Adjustment #{adjustment.adjustment_id || index + 1}</p>
                            <Badge className={getAdjustmentColor()}>
                              {getAdjustmentIcon()}
                              {isRefund ? 'Refund' : isDiscount ? 'Discount' : isWriteoff ? 'Write-off' : 'Adjustment'}
                            </Badge>
                          </div>
                          <div className="space-y-1 text-sm text-gray-600">
                            <p className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              {formatDate(adjustment.created_at || adjustment.adjustment_date)}
                            </p>
                            <p>Reason: <span className="font-medium">{adjustment.reason || 'N/A'}</span></p>
                            {adjustment.notes && (
                              <p>Notes: <span className="font-medium">{adjustment.notes}</span></p>
                            )}
                          </div>
                          <div className="text-right mt-2">
                            <p className={`text-lg font-bold ${Number(adjustment.amount) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {Number(adjustment.amount) < 0 ? '' : '+'}{formatCurrency(Math.abs(Number(adjustment.amount)))}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No adjustments found</p>
                    <p className="text-sm text-gray-400 mt-1">Adjustments will appear here once made</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment History */}
            <Card className="bg-white shadow-sm border border-gray-200/60">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CreditCard className="h-5 w-5 text-gray-600" />
                  Payment History
                </CardTitle>
                <CardDescription>
                  All payments made for this invoice
                </CardDescription>
              </CardHeader>
              <CardContent>
                {paymentsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : paymentsData?.data && paymentsData.data.length > 0 ? (
                  <div className="space-y-4">
                    {paymentsData.data.map((payment: Payment) => (
                      <div key={payment.payment_id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50/50 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold text-gray-900">Payment #{payment.payment_id}</p>
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Completed
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {formatDate(payment.payment_date)}
                          </p>
                          <p>Method: <span className="font-medium">{payment.method}</span></p>
                          {payment.transaction_ref && (
                            <p>Reference: <span className="font-medium">{payment.transaction_ref}</span></p>
                          )}
                        </div>
                        <div className="text-right mt-2">
                          <p className="text-lg font-bold text-green-600">{formatCurrency(payment.amount_paid)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No payments found</p>
                    <p className="text-sm text-gray-400 mt-1">Payments will appear here once recorded</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
