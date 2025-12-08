import { UseFormWatch, UseFormSetValue, FieldArrayWithId } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Minus } from 'lucide-react';

interface Service {
  service_id: number;
  service_name: string;
  fixed_price?: number;
  base_price_min?: number;
  base_price_max?: number;
}

interface TreatmentChargesProps {
  fields: FieldArrayWithId<any, "charges", "id">[];
  watch: UseFormWatch<any>;
  setValue: UseFormSetValue<any>;
  servicesData?: { data?: Service[] };
  addCharge: () => void;
  removeCharge: (index: number) => void;
  getServiceById: (serviceId: number) => Service | undefined;
  errors?: any;
}

export function TreatmentCharges({
  fields,
  watch,
  setValue,
  servicesData,
  addCharge,
  removeCharge,
  getServiceById,
  errors
}: TreatmentChargesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Treatment Charges</CardTitle>
        <CardDescription>
          Add services and their estimated costs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.map((field, index) => (
          <div key={field.id} className="p-4 border rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Charge #{index + 1}</h4>
              {fields.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeCharge(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Minus className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Service</Label>
                <Select
                  key={`service-select-${index}-${watch(`charges.${index}.service_id`)}`}
                  value={watch(`charges.${index}.service_id`)?.toString() || ''}
                  onValueChange={(value) => {
                    console.log(`Setting service for charge ${index} to:`, value);
                    setValue(`charges.${index}.service_id`, parseInt(value));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select service">
                      {(() => {
                        const serviceId = watch(`charges.${index}.service_id`);
                        if (serviceId && serviceId > 0) {
                          const service = getServiceById(serviceId);
                          return service ? service.service_name : "Select service";
                        }
                        return "Select service";
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {servicesData?.data?.map((service: any) => (
                      <SelectItem key={service.service_id} value={service.service_id.toString()}>
                        {service.service_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Estimated Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={watch(`charges.${index}.estimated_amount`) || ''}
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    if (inputValue === '') {
                      setValue(`charges.${index}.estimated_amount`, undefined);
                    } else {
                      const numericValue = parseFloat(inputValue);
                      setValue(`charges.${index}.estimated_amount`, isNaN(numericValue) ? undefined : numericValue);
                    }
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Additional notes for this charge"
                value={watch(`charges.${index}.notes`) || ''}
                onChange={(e) => setValue(`charges.${index}.notes`, e.target.value)}
              />
            </div>

            {/* Service Info */}
            {watch(`charges.${index}.service_id`) && (
              <div className="p-3 bg-muted rounded">
                {(() => {
                  const service = getServiceById(watch(`charges.${index}.service_id`));
                  if (!service) return <p className="text-sm text-muted-foreground">Service not found</p>;
                  return (
                    <div className="space-y-1">
                      <p className="font-medium text-sm">{service.service_name}</p>

                      {service.fixed_price ? (
                        <p className="text-sm">Fixed Price: ₱{service.fixed_price}</p>
                      ) : (
                        <p className="text-sm">
                          Price Range: ₱{service.base_price_min} - ₱{service.base_price_max}
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        ))}

        <Button type="button" variant="outline" onClick={addCharge} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Another Charge
        </Button>

        {errors?.charges && (
          <p className="text-sm text-red-600">{errors.charges.message}</p>
        )}
      </CardContent>
    </Card>
  );
}