import { CheckCircle2, Receipt, Calendar, CreditCard } from 'lucide-react';

interface PaymentSuccessPopupProps {
  isOpen: boolean;
  onClose: () => void;
  paymentData: {
    invoice_id: number;
    reference_number?: string;
    amount_paid: number;
    payment_date: string;
    method: string;
    transaction_ref?: string;
  };
}

export function PaymentSuccessPopup({ isOpen, onClose, paymentData }: PaymentSuccessPopupProps) {
  if (!isOpen) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        {/* Success Icon and Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Completed</h2>
          <div className="w-full h-px bg-gray-200"></div>
        </div>

        {/* Payment Details */}
        <div className="space-y-4 mb-6">
          {paymentData.reference_number && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Reference No.:</span>
              <span className="font-medium text-gray-900">{paymentData.reference_number}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 flex items-center">
              <Receipt className="h-4 w-4 mr-1" />
              Amount:
            </span>
            <span className="font-bold text-lg text-gray-900">
              {formatCurrency(paymentData.amount_paid)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 flex items-center">
              <CreditCard className="h-4 w-4 mr-1" />
              Payment Method:
            </span>
            <span className="font-medium text-gray-900">
              {paymentData.method} (via PayMongo)
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              Payment Date:
            </span>
            <span className="font-medium text-gray-900">
              {formatDate(paymentData.payment_date)}
            </span>
          </div>

          {paymentData.transaction_ref && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Transaction ID:</span>
              <span className="font-mono text-xs text-gray-700 bg-gray-100 px-2 py-1 rounded">
                {paymentData.transaction_ref.length > 20 
                  ? `${paymentData.transaction_ref.substring(0, 20)}...` 
                  : paymentData.transaction_ref}
              </span>
            </div>
          )}
        </div>

        <div className="border-t pt-4">
          <div className="text-center mb-4">
            <p className="text-lg font-semibold text-green-600">Status: PAID</p>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={() => {
                // Optional: Print receipt functionality
                window.print();
              }}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Print Receipt
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}