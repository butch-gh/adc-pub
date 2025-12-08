import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { invoiceApi, installmentApi } from '@/lib/billing-api';
import { Installment } from '@/types';
import { ArrowLeft, Calendar, DollarSign, CreditCard, XSquare } from 'lucide-react';
import { toast } from 'sonner';
import { PaymentModal } from './PaymentModal';
//import { PaymentHistory } from './PaymentHistory';
import { PaymentSuccessPopup } from './PaymentSuccessPopup';

export function InstallmentManagement() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const invoiceId = parseInt(id || '0');
  const amountMinLimit = 100; // Example limit for payment amount

  const [newInstallment, setNewInstallment] = useState({
    due_date: '',
    amount_due: amountMinLimit.toString(),
  });

  // Payment modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<Installment | null>(null);

  // Payment success popup state
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [completedPaymentData, setCompletedPaymentData] = useState<any>(null);
  const [isPaymentExceeded, setIsPaymentExceeded] = useState(false);

  // Fetch invoice details
  const { data: invoice, isLoading: invoiceLoading } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => invoiceApi.getInvoice(invoiceId),
    enabled: !!invoiceId,
  });

  // Fetch installments for this invoice
  const { data: installmentsData, isLoading: installmentsLoading } = useQuery({
    queryKey: ['invoice-installments', invoiceId],
    queryFn: () => installmentApi.getInstallments(invoiceId),
    enabled: !!invoiceId,
  });

  // Create installment mutation
  const createInstallmentMutation = useMutation({
    mutationFn: async (data: { due_date: string; amount_due: number }) => {
      
      try {
        const response = await invoiceApi.createInstallment(invoiceId, data);

        return response;
      } catch (error) {
        console.error('Error in mutation function:', error);
        throw error;
      }
    },
    onSuccess: () => {
      
      toast.success('Installment created successfully');
      queryClient.invalidateQueries({ queryKey: ['invoice-installments', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
      setNewInstallment({ due_date: '', amount_due: amountMinLimit.toString() });
    },
    onError: (error: any) => {
      console.error('Error creating installment:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create installment';
      toast.error(errorMessage);
    },
    onSettled: () => {
      //console.log('Mutation settled');
    }
  });

  // Delete installment mutation
  const deleteInstallmentMutation = useMutation({
    mutationFn: async (installmentId: number) => {
      
      try {
        const response = await installmentApi.deleteInstallment(installmentId);
        
        return response;
      } catch (error) {
        console.error('Error deleting installment:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast.success('Installment deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['invoice-installments', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
    },
    onError: (error: any) => {
      console.error('Error deleting installment:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete installment';
      toast.error(errorMessage);
    }
  });

  // Add timeout protection for stuck mutations
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (createInstallmentMutation.isPending) {
      
      timeoutId = setTimeout(() => {
      
        createInstallmentMutation.reset();
        toast.error('Request timeout. Please try again.');
      }, 30000); // 30 second timeout - increased
    }
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [createInstallmentMutation.isPending, createInstallmentMutation.reset]);

  const handleInputChange = (field: string, value: string) => {

    if (field === 'amount_due') {
      setIsPaymentExceeded(
        (safeNumber(value) > safeNumber(invoice?.data?.net_amount_due ?? 0)) ||
        safeNumber(value) < amountMinLimit
      );
    }

    setNewInstallment(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCreateInstallment = (e: React.FormEvent) => {
    e.preventDefault();
    

    if (!newInstallment.due_date || !newInstallment.amount_due) {
      toast.error('Please fill in all required fields');
      return;
    }

    const amount = parseFloat(newInstallment.amount_due);
    if (amount <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    createInstallmentMutation.mutate({
      due_date: newInstallment.due_date,
      amount_due: amount
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

  const calculateInstallmentStatus = (installment: Installment): 'pending' | 'paid' | 'overdue' => {
    // Check if installment is paid by status field or amount comparison
    const isPaidByStatus = installment.status === 'paid';
    const isPaidByAmount = installment.amount_paid >= installment.amount_due;
    
    if (isPaidByStatus || isPaidByAmount) return 'paid';
    
    const isOverdue = new Date(installment.due_date) < new Date();
    return isOverdue ? 'overdue' : 'pending';
  };

  const getInstallmentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleRecordPayment = (installment: Installment) => {
    setSelectedInstallment(installment);
    setPaymentModalOpen(true);
  };

  const handlePaymentSuccess = () => {
    // Invalidate queries to refresh data after successful payment
    queryClient.invalidateQueries({ queryKey: ['invoice-installments', invoiceId] });
    queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
    
    // Also refetch the data immediately to ensure fresh data
    queryClient.refetchQueries({ queryKey: ['invoice-installments', invoiceId] });
    queryClient.refetchQueries({ queryKey: ['invoice', invoiceId] });
    
    // Optional: Show success message
    toast.success('Payment recorded successfully! Data refreshed.');
  };

  const handlePaymentCompleted = (paymentData: any) => {
    // Show the success popup at the parent level
    setCompletedPaymentData(paymentData);
    setShowSuccessPopup(true);
  };

  const handleDeleteInstallment = async (installment: Installment) => {
    if (installment.amount_paid > 0) {
      toast.error('Cannot delete installment with payments');
      return;
    }

    if (window.confirm(`Are you sure you want to delete Installment #${installment.installment_id}?`)) {
      deleteInstallmentMutation.mutate(installment.installment_id);
    }
  };

  const isRecordPaymentDisabled = (installment: Installment) => {
    // Check if installment is fully paid by status field or amount comparison
    const isPaidByStatus = installment.status === 'paid';
    const isPaidByAmount = installment.amount_paid >= installment.amount_due;
    
    // If installment is fully paid, always disable
    if (isPaidByStatus || isPaidByAmount) return true;
    
    
    // Note: Current installment status types are 'pending' | 'paid' | 'overdue'
    // 'cancelled' status is not currently supported in the database schema
    // If you need cancelled status, please update the database schema first
    
    // For now, you could disable payments for 'overdue' status when invoice is paid
    //if (invoiceData.status === 'paid' && installment.status === 'cancelled') return true;
    if (invoiceData.status === 'paid' && installment.status === 'cancelled') return true;
    
    return false;
  };

  if (invoiceLoading) {
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
  const installments = installmentsData?.data || [];
  const totalInstallments = installments.reduce((sum: number, inst: Installment) => sum + inst.amount_due, 0);
  const totalPaid = installments.reduce((sum: number, inst: Installment) => sum + inst.amount_paid, 0);
  const remainingBalance = totalInstallments - totalPaid;
  

  const safeNumber = (value: any): number => {
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  };


  
  // useEffect(() => {
  //   // Check if installment amount exceeds invoice net amount due
  //   if (safeNumber(newInstallment.amount_due) > safeNumber(invoiceData?.net_amount_due ?? 0)) {
  //     //toast.warning('Warning: Installment amount exceeds invoice net amount due.');
  //     setIsPaymentExceeded(true);
  //   }
  //   else {
  //     setIsPaymentExceeded(false);
  //   }
  // }, [newInstallment, invoiceData]);







  return (
    <div className="max-w-4xl mx-auto space-y-6">
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
          <h1 className="text-2xl font-bold">Installment Management</h1>
          <p className="text-muted-foreground">
            Invoice #{invoiceData.invoice_id} - Patient ID: {invoiceData.patient_id}
          </p>
        </div>
      </div>

      {/* Invoice Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Installment Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Final Amount</p>
              <p className="text-lg font-semibold">{formatCurrency(invoiceData.final_amount || 0)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Installments</p>
              <p className="text-lg font-semibold">{formatCurrency(totalInstallments)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Installment Paid</p>
              <p className="text-lg font-semibold text-green-600">{formatCurrency(totalPaid)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Remaining Balance</p>
              <p className="text-lg font-semibold text-red-600">{formatCurrency(remainingBalance)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create New Installment - Hidden when invoice is paid */}
      {invoiceData.status !== 'paid' && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Installment</CardTitle>
            <CardDescription>
              Add a new installment payment schedule for this invoice
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateInstallment} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date *</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={newInstallment.due_date}
                    onChange={(e) => handleInputChange('due_date', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount_due">Amount Due *</Label>
                  <Input
                    id="amount_due"
                    type="number"
                    step="100"
                    placeholder={formatCurrency(amountMinLimit)}
                    value={newInstallment.amount_due}
                    onChange={(e) => handleInputChange('amount_due', e.target.value)}
                    onWheel={(e) => e.currentTarget.blur()}
                    required
                  />
                  {safeNumber(newInstallment.amount_due) > safeNumber(invoice?.data?.net_amount_due ?? 0) && (
                    <p className="text-xs text-red-600">Amount cannot exceed {formatCurrency(safeNumber(invoice?.data?.net_amount_due ?? 0))}</p>
                  )}
                  {safeNumber(newInstallment.amount_due) < amountMinLimit && (
                    <p className="text-xs text-red-600">Amount cannot be less than {formatCurrency(amountMinLimit)}</p>
                  )}

              <p className="text-xs text-muted-foreground">
                Minimum Limit: {formatCurrency(amountMinLimit)} - Maximum (Net Amount Due): {formatCurrency(safeNumber(invoice?.data?.net_amount_due ?? 0))}
              </p>
                </div>
              </div>
              <div className="flex items-center justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setNewInstallment({ due_date: '', amount_due: '' });
                    createInstallmentMutation.reset(); // Reset mutation state
                  }}
                >
                  Clear
                </Button>
                <Button
                  type="submit"
                  disabled={createInstallmentMutation.isPending || isPaymentExceeded}

                >
                  {createInstallmentMutation.isPending ? 'Creating...' : 'Create Installment'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Installments List */}
      <Card>
        <CardHeader>
          <CardTitle>Installment Schedule</CardTitle>
          <CardDescription>
            Current installment payments for this invoice
          </CardDescription>
        </CardHeader>
        <CardContent>
          {installmentsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : installments.length > 0 ? (
            <div className="space-y-4">
              {installments.map((installment: Installment) => {
                const currentStatus = calculateInstallmentStatus(installment);
                return (
                  <div key={installment.installment_id} className="border rounded-lg">
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Calendar className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">Installment #{installment.installment_id}</p>
                          <p className="text-sm text-muted-foreground">
                            Due: {formatDate(installment.due_date)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Due Amount</p>
                          <p className="font-medium">{formatCurrency(installment.amount_due)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Paid Amount</p>
                          <p className="font-medium text-green-600">{formatCurrency(installment.amount_paid)}</p>
                        </div>
                        <Badge className={getInstallmentStatusColor(currentStatus)}>
                          {currentStatus}
                        </Badge>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleRecordPayment(installment)}
                            disabled={isRecordPaymentDisabled(installment)}
                          >
                            <CreditCard className="h-4 w-4 mr-2" />
                            Record Payment
                          </Button>
                          {/* Show delete button for pending installments with no payments */}
                          {currentStatus === 'pending' && installment.amount_paid === 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteInstallment(installment)}
                              disabled={deleteInstallmentMutation.isPending}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <XSquare className="h-4 w-4 mr-2" />
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* <div className="px-4 pb-4">
                      <PaymentHistory installmentId={installment.installment_id} />
                    </div> */}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No installments created yet</p>
              <p className="text-sm">Create your first installment above</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Modal */}
      <PaymentModal
        installment={selectedInstallment}
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        onPaymentSuccess={handlePaymentSuccess}
        onPaymentCompleted={handlePaymentCompleted}
      />

      {/* Payment Success Popup */}
      {showSuccessPopup && completedPaymentData && (
        <PaymentSuccessPopup
          isOpen={showSuccessPopup}
          onClose={() => {
            setShowSuccessPopup(false);
            setCompletedPaymentData(null);
          }}
          paymentData={completedPaymentData}
        />
      )}
    </div>
  );
}
