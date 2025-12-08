import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, Truck, AlertTriangle, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ProductForm } from './ProductForm';
import { PurchaseOrderForm } from './PurchaseOrderForm';
import { inventoryApi, DashboardStats, BatchAlert, LowStockReportItem } from '@/lib/inventory-api';

export function InventoryDashboard() {
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [isPurchaseOrderFormOpen, setIsPurchaseOrderFormOpen] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [batchAlerts, setBatchAlerts] = useState<BatchAlert[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Load dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch dashboard stats
        const statsResponse = await inventoryApi.getDashboardStats();
        setDashboardStats(statsResponse.data);

        // Fetch batch alerts
        const batchResponse = await inventoryApi.getBatchAlerts();
        setBatchAlerts(batchResponse.data);

        // Fetch low stock alerts
        const lowStockResponse = await inventoryApi.getLowStockReport();
        setLowStockAlerts(lowStockResponse.data);

      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // Default categories for dental inventory
  const categories = [
    'Equipment',
    'Consumables',
    'Medications',
    'Instruments',
    'X-ray Supplies',
    'Sterilization',
    'Office Supplies',
    'Personal Protective Equipment'
  ];

  // Use dashboard stats or default values
  const stats = dashboardStats ? {
    totalProducts: dashboardStats.totalItems,
    lowStockItems: dashboardStats.lowStockItems,
    totalSuppliers: dashboardStats.totalSuppliers,
    pendingOrders: dashboardStats.pendingOrders,
    totalValue: dashboardStats.totalValue,
    monthlyGrowth: 8.5 // This could be calculated from historical data
  } : {
    totalProducts: 0,
    lowStockItems: 0,
    totalSuppliers: 0,
    pendingOrders: 0,
    totalValue: 0,
    monthlyGrowth: 0
  };

  const recentActivities = dashboardStats?.recentActivities || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }
  

  console.log('Dashboard:', batchAlerts, lowStockAlerts, stats, recentActivities);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage your dental clinic's inventory and supplies</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={() => setIsProductFormOpen(true)}>
            <Package className="w-4 h-4 mr-2" />
            Add Product
          </Button>
          <Button onClick={() => setIsPurchaseOrderFormOpen(true)}>
            <Truck className="w-4 h-4 mr-2" />
            New Order
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+12%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.lowStockItems}</div>
            <p className="text-xs text-muted-foreground">
              Items below minimum threshold
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Suppliers</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSuppliers}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+3</span> new this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingOrders}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting delivery
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Recent Activities */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
            <CardDescription>Latest inventory updates and transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    activity.type === 'stock_in' ? 'bg-green-500' :
                    activity.type === 'stock_out' ? 'bg-red-500' :
                    activity.type === 'new_supplier' ? 'bg-blue-500' : 'bg-gray-500'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{activity.message}</p>
                    <p className="text-xs text-gray-500">{new Date(activity.time).toLocaleString()}</p>
                  </div>
                </div>
              ))}
              {recentActivities.length === 0 && (
                <p className="text-sm text-gray-500">No recent activities</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Low Stock Alerts</CardTitle>
            <CardDescription>Items requiring immediate attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lowStockAlerts.map((item) => (
                <div key={item.id} className="border border-red-200 rounded-lg p-3 bg-red-50">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900">{item.name}</h4>
                    <Badge variant="destructive" className="text-xs">
                      {item.current_stock}/{item.minimum_stock}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Supplier: {item.supplier_name}</p>
                  {/* <Button size="sm" variant="outline" className="w-full mt-2 text-xs">
                    Order More
                  </Button> */}
                </div>
              ))}
              {lowStockAlerts.length === 0 && (
                <p className="text-sm text-gray-500">No low stock alerts</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Batch Expiry Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-orange-600">Batch Expiry Alerts</CardTitle>
            <CardDescription>Monitor batch expiration dates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {batchAlerts.map((batch) => (
                <div key={batch.batch_id} className={`border rounded-lg p-3 ${
                  batch.status === 'expired' ? 'border-red-200 bg-red-50' :
                  batch.status === 'expiring-soon' ? 'border-yellow-200 bg-yellow-50' :
                  'border-green-200 bg-green-50'
                }`}>
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900">{batch.batch_no}</h4>
                    <Badge className={`text-xs ${
                      batch.status === 'expired' ? 'bg-red-100 text-red-800' :
                      batch.status === 'expiring-soon' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {batch.days_left === 0 ? 'Expired' :
                       batch.days_left > 0 ? `${batch.days_left} days` : 'Good'}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{batch.item_name}</p>
                  <p className="text-xs text-gray-500">Expires: {batch.expiry_date}</p>
                </div>
              ))}
              {batchAlerts.length === 0 && (
                <p className="text-sm text-gray-500">No batch expiry alerts</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      {/* <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common inventory management tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2" onClick={() => setIsProductFormOpen(true)}>
              <Package className="w-6 h-6" />
              <span className="text-sm">Add Product</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2" onClick={() => setIsPurchaseOrderFormOpen(true)}>
              <Truck className="w-6 h-6" />
              <span className="text-sm">New Order</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
              <Users className="w-6 h-6" />
              <span className="text-sm">Add Supplier</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
              <TrendingUp className="w-6 h-6" />
              <span className="text-sm">View Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card> */}

      {/* Product Form Dialog */}
      <ProductForm
        isOpen={isProductFormOpen}
        onClose={() => setIsProductFormOpen(false)}
        onSuccess={() => {
          setIsProductFormOpen(false);
          // TODO: Refresh inventory data here
        }}
        mode="create"
        categories={categories}
      />

      {/* Purchase Order Form Dialog */}
      <PurchaseOrderForm
        isOpen={isPurchaseOrderFormOpen}
        onClose={() => setIsPurchaseOrderFormOpen(false)}
        onSave={() => {
          setIsPurchaseOrderFormOpen(false);
          // TODO: Refresh purchase orders data here
        }}
        mode="create"
      />
    </div>
  );
}
