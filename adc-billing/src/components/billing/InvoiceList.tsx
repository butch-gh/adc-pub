import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { invoiceApi } from '@/lib/billing-api';
import { Invoice } from '@/types';
import { Search, Filter, Eye, X } from 'lucide-react';

interface InvoiceListProps {
  onViewInvoice?: (invoice: Invoice) => void;
}

export function InvoiceList({ }: InvoiceListProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  const { data: invoicesData, isLoading } = useQuery({
    queryKey: ['invoices', { page: currentPage, limit: pageSize, status: statusFilter }],
    queryFn: () => invoiceApi.getInvoices({
      page: currentPage,
      limit: pageSize,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    }),
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  // Client-side filtering for search
  const filteredInvoices = invoicesData?.data?.filter((invoice) => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    return (
      invoice.invoice_code.toString().includes(searchLower) ||
      invoice.patient_id.toString().includes(searchLower) ||
      (invoice.patient_name && invoice.patient_name.toLowerCase().includes(searchLower)) ||
      invoice.status.toLowerCase().includes(searchLower) ||
      formatCurrency(invoice.amount).toLowerCase().includes(searchLower)
    );
  }) || [];


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'unpaid':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'overdue':
        return 'bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-200';
      case 'pending_adjustment':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by invoice ID, patient name, or amount..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1 h-7 w-7 p-0 hover:bg-muted"
                    onClick={() => setSearchTerm('')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="pending_adjustment">Pending Adjustment</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Invoice List */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice List</CardTitle>
          <CardDescription>
            {filteredInvoices.length} of {invoicesData?.pagination?.total || 0} invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredInvoices.map((invoice) => (
                <div
                  key={invoice.invoice_id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/billing/invoices/${invoice.invoice_id}`)}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">
                        Invoice #: {invoice.invoice_code}
                      </p>
                      <Badge className={getStatusColor(invoice.status)}>
                        {invoice.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Patient: {invoice.patient_name || 'Unknown'} (ID: {invoice.patient_id})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Created: {formatDate(invoice.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {formatCurrency(invoice.amount)}
                      </p>
                      {invoice.final_amount && (
                        <p className="text-xs text-muted-foreground">
                          Final: {formatCurrency(invoice.final_amount)}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/billing/invoices/${invoice.invoice_id}`);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {(!invoicesData?.data || invoicesData.data.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No invoices found</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => navigate('/billing/invoices/create')}
                  >
                    Create your first invoice
                  </Button>
                </div>
              )}
              {invoicesData?.data && invoicesData.data.length > 0 && filteredInvoices.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No invoices match your search criteria</p>
                  <p className="text-sm mt-2">Try adjusting your search terms or filters</p>
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {invoicesData?.pagination && invoicesData.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-muted-foreground">
                Showing {filteredInvoices.length > 0 ? 1 : 0} to {filteredInvoices.length} of{' '}
                {filteredInvoices.length} filtered results
                {filteredInvoices.length !== (invoicesData?.pagination?.total || 0) &&
                  ` (from ${invoicesData?.pagination?.total || 0} total)`
                }
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === invoicesData.pagination.totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
