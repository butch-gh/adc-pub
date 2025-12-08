
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Minus } from 'lucide-react';
import { treatmentPlanApi } from '@/lib/billing-api';
import { toast } from 'sonner';

interface PlanService {
  id?: string;
  plan_id?: number;
  service_id?: number;
  service_name?: string;
  fixed_price?: number;
  base_price_min?: number;
  base_price_max?: number;
  service_notes?: string;
  final_amount?: number;
  plan_notes?: string;
  plan_status?: string;
}



interface TreatmentPlanProps {
  planServices: PlanService[];
  plansData?: any; // Use any to match the API response structure
  addPlanService: () => void;
  removePlanService: (id: string) => void;
  updatePlanService: (id: string, updates: any) => void;
  setSelectedPlanId?: (id: number) => void;
}

export function TreatmentPlan({
  planServices,
  plansData,
  addPlanService,
  removePlanService,
  updatePlanService,
  setSelectedPlanId
}: TreatmentPlanProps) {
    console.log('Rendering TreatmentPlan with planServices:', planServices);
    console.log('Available plansData:', plansData);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Treatment Plan</CardTitle>
        <CardDescription>Select plan and review service details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {planServices.map((planService, index) => (
          <div key={planService.id} className="p-4 border rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Plan Service #{index + 1}</h4>
              <div className="flex items-center gap-2">
                {planService.plan_status && (
                  <span className={`text-xs px-2 py-1 rounded-full ${planService.plan_status.toLowerCase() === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {planService.plan_status.charAt(0).toUpperCase() + planService.plan_status.slice(1)}
                  </span>
                )}
                {planServices.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removePlanService(planService.id!)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Treatment Plan</Label>
                <Select
                  value={planService.plan_id ? planService.plan_id.toString() : ''}
                  onValueChange={async (v) => {
                    const pid = parseInt(v);
                    console.log('Plan selected:', pid, 'for service:', planService.id);
                    setSelectedPlanId?.(pid);
                    try {
                      const res = await treatmentPlanApi.getPlanById(pid);
                      const planData = res?.data;
                      console.log('Plan data loaded:', planData);
                      // Update specific plan service
                      updatePlanService(planService.id!, {
                        plan_id: pid,
                        service_id: planData?.service_id,
                        service_name: planData?.service_name,
                        fixed_price: planData?.fixed_price,
                        base_price_min: planData?.base_price_min,
                        base_price_max: planData?.base_price_max,
                        service_notes: planData?.service_notes,
                        final_amount: planData?.final_amount,
                        plan_notes: planData?.plan_notes,
                        plan_status: planData?.plan_status,
                      });
                    } catch (e: any) {
                      toast.error(e?.response?.data?.message || 'Failed to load plan details');
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select treatment plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {!plansData?.data ? (
                      <SelectItem value="loading" disabled>Loading treatment plans...</SelectItem>
                    ) : plansData.data.length === 0 ? (
                      <SelectItem value="no-plans" disabled>No treatment plans found for this patient</SelectItem>
                    ) : (
                      plansData.data.map((plan: any) => {
                        // Check if this plan is already selected in other plan services
                        const isAlreadySelected = planServices.some(service => 
                          service.id !== planService.id && service.plan_id === plan.plan_id
                        );
                        
                        return (
                          <SelectItem 
                            key={plan.plan_id} 
                            value={plan.plan_id.toString()}
                            disabled={isAlreadySelected}
                            className={isAlreadySelected ? 'opacity-50 cursor-not-allowed' : ''}
                          >
                            Plan #{plan.plan_id} - {plan.status}
                            {isAlreadySelected && ' (Already selected)'}
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Service</Label>
                <Input
                  value={planService.service_name || ''}
                  placeholder="No service selected"
                  readOnly
                  className="bg-muted"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  value={(planService.final_amount ?? planService.fixed_price ?? ((planService.base_price_min || 0) + (planService.base_price_max || 0)) / 2) || ''}
                  placeholder="0.00"
                  readOnly
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input
                  value={planService.plan_notes || ''}
                  placeholder="No notes"
                  readOnly
                  className="bg-muted"
                />
              </div>
            </div>
            {planService.service_id && (
              <div className="p-3 bg-muted rounded">
                <div className="space-y-1">
                  <p className="font-medium text-sm">{planService.service_name}</p>
                  {planService.service_notes && (
                    <p className="text-sm text-muted-foreground">{planService.service_notes}</p>
                  )}
                  {planService.fixed_price ? (
                    <p className="text-sm">Fixed Price: ₱{planService.fixed_price}</p>
                  ) : (
                    <p className="text-sm">
                      Price Range: ₱{planService.base_price_min} - ₱{planService.base_price_max}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        
        <Button type="button" variant="outline" onClick={addPlanService} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Another Plan Charge
        </Button>
      </CardContent>
    </Card>
  );
}