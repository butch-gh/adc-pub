import React from 'react';
import { StockOutTransaction } from '../../lib/inventory-api';

interface TreatmentStockUsageSlipProps {
  transaction: StockOutTransaction;
  onClose: () => void;
}

export const TreatmentStockUsageSlip: React.FC<TreatmentStockUsageSlipProps> = ({
  transaction,
  onClose
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white p-8 max-w-4xl mx-auto">
      <div className="text-center border-b pb-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">TREATMENT STOCK USAGE SLIP</h1>
        <p className="text-gray-600 mt-2">Adriano Dental Clinic</p>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="font-semibold text-gray-700 mb-2">Transaction Details</h3>
          <div className="space-y-1 text-sm">
            <p><span className="font-medium">Reference No:</span> {transaction.reference_no}</p>
            <p><span className="font-medium">Date:</span> {new Date(transaction.stock_out_date).toLocaleDateString()}</p>
            <p><span className="font-medium">Released To:</span> {transaction.released_to}</p>
            <p><span className="font-medium">Prepared By:</span> {transaction.created_by}</p>
          </div>
        </div>
        
        {(transaction.patient_name || transaction.dentist_name || transaction.treatment_type) && (
          <div>
            <h3 className="font-semibold text-gray-700 mb-2">Treatment Information</h3>
            <div className="space-y-1 text-sm">
              {transaction.patient_name && (
                <p><span className="font-medium">Patient:</span> {transaction.patient_name}</p>
              )}
              {transaction.dentist_name && (
                <p><span className="font-medium">Attending Dentist:</span> {transaction.dentist_name}</p>
              )}
              {transaction.treatment_type && (
                <p><span className="font-medium">Treatment Type:</span> {transaction.treatment_type}</p>
              )}
              {transaction.treatment_id && (
                <p><span className="font-medium">Treatment ID:</span> {transaction.treatment_id}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {transaction.purpose && (
        <div className="mb-6">
          <h3 className="font-semibold text-gray-700 mb-2">Purpose</h3>
          <p className="text-sm text-gray-600">{transaction.purpose}</p>
        </div>
      )}

      <div className="mb-6">
        <h3 className="font-semibold text-gray-700 mb-3">Items Used</h3>
        <div className="border border-gray-300">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">Item Name</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">Batch No</th>
                <th className="px-4 py-2 text-center text-sm font-medium text-gray-700 border-b">Qty Used</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {transaction.items?.map((item, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}>
                  <td className="px-4 py-2 text-sm text-gray-800 border-b">{item.item_name}</td>
                  <td className="px-4 py-2 text-sm text-gray-600 border-b">{item.batch_no}</td>
                  <td className="px-4 py-2 text-sm text-gray-800 text-center border-b">{item.qty_released}</td>
                  <td className="px-4 py-2 text-sm text-gray-600 border-b">{item.remarks || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-between items-center text-sm text-gray-600 border-t pt-4">
        <div>
          <p><span className="font-medium">Total Items:</span> {transaction.items?.length || 0}</p>
          <p><span className="font-medium">Total Quantity:</span> {transaction.items?.reduce((sum, item) => sum + item.qty_released, 0) || 0}</p>
        </div>
        <div className="text-right">
          <p>Generated on: {new Date().toLocaleString()}</p>
        </div>
      </div>

      <div className="mt-8 text-center space-x-4 no-print">
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Print Slip
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          Close
        </button>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            .no-print {
              display: none !important;
            }
            body {
              font-size: 12px;
            }
            .bg-gray-25 {
              background-color: #f9f9f9 !important;
            }
          }
        `
      }} />
    </div>
  );
};

export default TreatmentStockUsageSlip;