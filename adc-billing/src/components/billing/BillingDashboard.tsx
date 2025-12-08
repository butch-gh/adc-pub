import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { invoiceApi, reportsApi } from '@/lib/billing-api';
import { Invoice } from '@/types';
import { DollarSign, CreditCard, TrendingUp, Users, ArrowUpRight, Eye, Plus, FileText } from 'lucide-react';

interface BillingDashboardProps {
  onViewInvoice?: (invoice: Invoice) => void;
}

export function BillingDashboard({ }: BillingDashboardProps) {
  const navigate = useNavigate();
  const selectedPeriod = 'month';

  // Fetch recent invoices
  const { data: invoicesData, isLoading: invoicesLoading } = useQuery({
    queryKey: ['invoices', { page: 1, limit: 10 }],
    queryFn: () => invoiceApi.getInvoices({ page: 1, limit: 10 }),
  });

  // Fetch revenue stats
  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ['revenue-report', selectedPeriod],
    queryFn: () => reportsApi.getRevenueReport({
      start_date: getStartDate(selectedPeriod),
      end_date: new Date().toISOString().split('T')[0],
      group_by: selectedPeriod === 'month' ? 'month' : 'day'
    }),
  });

  // Fetch patient stats
  const { data: patientStatsData, isLoading: patientStatsLoading } = useQuery({
    queryKey: ['patient-stats'],
    queryFn: () => reportsApi.getPatientStats(),
  });

  // Fetch growth rate
  const { data: growthRateData, isLoading: growthRateLoading } = useQuery({
    queryKey: ['growth-rate', selectedPeriod],
    queryFn: () => reportsApi.getGrowthRate({ period: selectedPeriod as 'week' | 'month' | 'quarter' | 'year' }),
  });

  const getStartDate = (period: string) => {
    const now = new Date();
    switch (period) {
      case 'week':
        now.setDate(now.getDate() - 7);
        break;
      case 'month':
        now.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        now.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        now.setFullYear(now.getFullYear() - 1);
        break;
    }
    return now.toISOString().split('T')[0];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'partial':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'unpaid':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'overdue':
        return 'bg-red-200 text-red-900 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  // Helper function to safely get revenue data
  const getTotalRevenue = () => {
    if (!revenueData) return 0;
    
    // Try different possible structures based on API response
    if (revenueData.data?.summary?.total_revenue) {
      return revenueData.data.summary.total_revenue;
    }
    if (revenueData.data?.report?.total_revenue) {
      return revenueData.data.report.total_revenue;
    }
    if (revenueData.data?.total_revenue) {
      return revenueData.data.total_revenue;
    }
    if ((revenueData as any).total_revenue) {
      return (revenueData as any).total_revenue;
    }
    
    return 0;
  };

  //console.log("invoicesData Data:", invoicesData);
  //console.log("revenueData Data:", revenueData);
  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Welcome to ADC Billing</h1>
            <p className="text-blue-100">Manage your dental clinic's billing operations efficiently</p>
          </div>
          <div className="hidden md:flex items-center space-x-3">
            <Button
              onClick={() => navigate('/billing/invoices/create')}
              className="bg-white text-blue-600 hover:bg-blue-50 shadow-md"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Invoice
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-emerald-800">Total Revenue</CardTitle>
            <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-900 mb-1">
              {revenueLoading ? '...' : formatCurrency(getTotalRevenue())}
            </div>
            <div className="flex items-center text-xs text-emerald-700">
              <ArrowUpRight className="w-3 h-3 mr-1" />
              +20.1% from last {selectedPeriod}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-amber-800">Pending Payments</CardTitle>
            <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-900 mb-1">
              {invoicesData?.data?.filter(inv => inv.status !== 'paid')?.length || 0}
            </div>
            <p className="text-xs text-amber-700">
              Invoices awaiting payment
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-blue-800">Active Patients</CardTitle>
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900 mb-1">
              {patientStatsLoading ? '...' : (patientStatsData?.data?.active_patients || 0)}
            </div>
            <p className="text-xs text-blue-700">
              With billing history
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-purple-800">Growth Rate</CardTitle>
            <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900 mb-1">
              {growthRateLoading ? '...' : `${growthRateData?.data?.growth_rate >= 0 ? '+' : ''}${growthRateData?.data?.growth_rate || 0}%`}
            </div>
            <div className="flex items-center text-xs text-purple-700">
              <ArrowUpRight className="w-3 h-3 mr-1" />
              Compared to last {selectedPeriod}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Invoices */}
      <Card className="shadow-sm border-gray-200">
        <CardHeader className="bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg text-gray-900">Recent Invoices</CardTitle>
              <CardDescription className="text-gray-600">
                Latest billing activities and payment status
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate('/billing/invoices')}
              className="hover:bg-gray-50"
            >
              View All
              <ArrowUpRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {invoicesLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {invoicesData?.data?.slice(0, 5).map((invoice) => (
                <div
                  key={invoice.invoice_id}
                  className="flex items-center justify-between p-6 hover:bg-gray-50 cursor-pointer transition-colors duration-200 group"
                  onClick={() => navigate(`/billing/invoices/${invoice.invoice_id}`)}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors duration-200">
                      <span className="text-sm font-semibold text-blue-700">#{invoice.invoice_id}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors duration-200">
                        Invoice #: {invoice.invoice_code}
                      </p>
                      <p className="text-sm text-gray-500">
                        Patient ID: {invoice.patient_id}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(invoice.amount)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(invoice.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className={`${getStatusColor(invoice.status)} font-medium`}>
                      {invoice.status}
                    </Badge>
                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {(!invoicesData?.data || invoicesData.data.length === 0) && (
                <div className="text-center py-12 text-gray-500">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-lg font-medium">No invoices found</p>
                  <p className="text-sm">Create your first invoice to get started</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
