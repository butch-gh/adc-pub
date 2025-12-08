import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings as SettingsIcon, Bell, Shield, Palette } from 'lucide-react';

export function Settings() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Configure inventory system settings and preferences</p>
        </div>
      </div>

      {/* Alert Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="w-5 h-5 mr-2" />
            Alert Settings
          </CardTitle>
          <CardDescription>
            Configure notifications and alerts for inventory management
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="low-stock-alerts">Low Stock Alerts</Label>
              <p className="text-sm text-gray-600">Get notified when items fall below reorder level</p>
            </div>
            <Switch id="low-stock-alerts" defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="expiry-alerts">Expiry Alerts</Label>
              <p className="text-sm text-gray-600">Get notified about items nearing expiry</p>
            </div>
            <Switch id="expiry-alerts" defaultChecked />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expiry-days">Days before expiry to alert</Label>
              <Input id="expiry-days" type="number" defaultValue="30" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="alert-frequency">Alert Frequency</Label>
              <Select defaultValue="daily">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate</SelectItem>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <SettingsIcon className="w-5 h-5 mr-2" />
            Inventory Settings
          </CardTitle>
          <CardDescription>
            Configure default inventory parameters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="default-reorder">Default Reorder Level (%)</Label>
              <Input id="default-reorder" type="number" defaultValue="20" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fifo-enabled">Enable FIFO Tracking</Label>
              <Switch id="fifo-enabled" defaultChecked />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="default-unit">Default Unit of Measure</Label>
            <Select defaultValue="pcs">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pcs">Pieces (pcs)</SelectItem>
                <SelectItem value="box">Boxes (box)</SelectItem>
                <SelectItem value="pack">Packs (pack)</SelectItem>
                <SelectItem value="ml">Milliliters (ml)</SelectItem>
                <SelectItem value="kg">Kilograms (kg)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* User Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            User Permissions
          </CardTitle>
          <CardDescription>
            Manage role-based access for inventory operations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Superadmin</Label>
                <p className="text-sm text-gray-600">Full access to all inventory operations</p>
              </div>
              <span className="text-sm text-green-600 font-medium">All Permissions</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Admin</Label>
                <p className="text-sm text-gray-600">Can manage items, stock, and suppliers</p>
              </div>
              <span className="text-sm text-blue-600 font-medium">Most Permissions</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Moderator</Label>
                <p className="text-sm text-gray-600">Can view reports and basic operations</p>
              </div>
              <span className="text-sm text-yellow-600 font-medium">Limited Permissions</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Staff</Label>
                <p className="text-sm text-gray-600">Can only view inventory and record usage</p>
              </div>
              <span className="text-sm text-gray-600 font-medium">View Only</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Palette className="w-5 h-5 mr-2" />
            Appearance
          </CardTitle>
          <CardDescription>
            Customize the look and feel of the inventory system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="dark-mode">Dark Mode</Label>
              <p className="text-sm text-gray-600">Switch to dark theme</p>
            </div>
            <Switch id="dark-mode" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <Select defaultValue="en">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button>Save Settings</Button>
      </div>
    </div>
  );
}
