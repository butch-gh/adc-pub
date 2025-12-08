import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { installmentApi } from '@/lib/billing-api';
import { InstallmentPayment } from '@/types';
import { ChevronDown, ChevronUp, Clock, Receipt, DollarSign } from 'lucide-react';

interface PaymentHistoryProps {
  installmentId: number;
}

export function PaymentHistory({ installmentId }: PaymentHistoryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: paymentsData, isLoading } = useQuery({
    queryKey: ['installment-payments', installmentId],
    queryFn: () => installmentApi.getPaymentHistory(installmentId),
    enabled: isExpanded, // Only fetch when expanded
  });

  const payments = paymentsData?.data || [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'Cash':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Bank Transfer':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'QR':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Credit Card':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Check':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="mt-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <Clock className="h-4 w-4" />
        <span>Payment History</span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </Button>

      {isExpanded && (
        <Card className="mt-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center space-x-2">
              <Receipt className="h-4 w-4" />
              <span>Payment Records</span>
            </CardTitle>
            <CardDescription className="text-xs">
              All payments made for this installment
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : payments.length > 0 ? (
              <div className="space-y-3">
                {payments.map((payment: InstallmentPayment) => (
                  <div
                    key={payment.payment_id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <DollarSign className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-sm">
                            {formatCurrency(payment.amount)}
                          </span>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getPaymentMethodColor(payment.method)}`}
                          >
                            {payment.method}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDateTime(payment.payment_date)}
                        </div>
                        {payment.transaction_ref && (
                          <div className="text-xs text-muted-foreground">
                            Ref: {payment.transaction_ref}
                          </div>
                        )}
                        {payment.proof_of_payment && (
                          <div className="text-xs text-muted-foreground">
                            Proof: {payment.proof_of_payment}
                          </div>
                        )}
                        {payment.notes && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Note: {payment.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div className="mt-3 pt-3 border-t">
                  <div className="text-xs text-muted-foreground">
                    Total payments: {payments.length} • Total amount:{' '}
                    <span className="font-medium text-green-600">
                      {formatCurrency(
                        payments.reduce((sum: number, payment: InstallmentPayment) => sum + payment.amount, 0)
                      )}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No payments recorded yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}