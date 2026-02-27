import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { useCreateEvent, useRestaurants } from '@/lib/api/hooks';
import { Plus } from 'lucide-react';

type CreateEventDialogProps = {
  autoOpen?: boolean;
  onAutoOpenHandled?: () => void;
};

export function CreateEventDialog({ autoOpen = false, onAutoOpenHandled }: CreateEventDialogProps = {}) {
  const [isOpen, setIsOpen] = useState(autoOpen);
  const { mutateAsync: createEvent, isPending } = useCreateEvent();
  const { data: restaurants = [] } = useRestaurants();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    restaurantId: '',
    deliveryLocation: '',
    orderDeadline: '',
    paymentMethod: 'EVENT_CREATOR' as 'EVENT_CREATOR' | 'INDIVIDUAL' | 'COMPANY_EXPENSE',
  });
  const [deadlineError, setDeadlineError] = useState('');
  const minDeadline = useMemo(() => {
    const now = new Date();
    const tzOffsetMs = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - tzOffsetMs).toISOString().slice(0, 16);
  }, []);

  useEffect(() => {
    if (autoOpen) {
      setIsOpen(true);
      onAutoOpenHandled?.();
    }
  }, [autoOpen, onAutoOpenHandled]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeadlineError('');

    // Validate order deadline is in the future
    const deadline = new Date(formData.orderDeadline);
    if (deadline <= new Date()) {
      setDeadlineError('Order deadline must be in the future');
      return;
    }

    try {
      await createEvent({
        ...formData,
        orderDeadline: deadline.toISOString(),
      });

      setFormData({
        title: '',
        description: '',
        restaurantId: '',
        deliveryLocation: '',
        orderDeadline: '',
        paymentMethod: 'EVENT_CREATOR',
      });
      setDeadlineError('');
      setIsOpen(false);
    } catch {
      // Error handled by TanStack Query
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Create Event
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent onClose={() => setIsOpen(false)}>
          <DialogHeader>
            <DialogTitle>Create New Event</DialogTitle>
            <DialogDescription>Fill in the details to create a new lunch event.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="title" className="text-sm font-medium block mb-1">
                Event Title
              </label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Team Lunch - Pizza Day"
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="text-sm font-medium block mb-1">
                Description
              </label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Weekly team lunch gathering"
                rows={3}
              />
            </div>

            <div>
              <label
                htmlFor="restaurant"
                id="create-event-restaurant-label"
                className="text-sm font-medium block mb-1"
              >
                Restaurant
              </label>
              <Select
                id="restaurant"
                aria-labelledby="create-event-restaurant-label"
                value={formData.restaurantId}
                onChange={(e) => setFormData({ ...formData, restaurantId: e.target.value })}
                required
              >
                <option value="">Select a restaurant</option>
                {restaurants.map((restaurant) => (
                  <option key={restaurant.id} value={restaurant.id}>
                    {restaurant.name} - {restaurant.cuisine}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label htmlFor="deliveryLocation" className="text-sm font-medium block mb-1">
                Delivery Location
              </label>
              <Input
                id="deliveryLocation"
                value={formData.deliveryLocation}
                onChange={(e) => setFormData({ ...formData, deliveryLocation: e.target.value })}
                placeholder="Office Conference Room A"
                required
              />
            </div>

            <div>
              <label htmlFor="orderDeadline" className="text-sm font-medium block mb-1">
                Order Deadline
              </label>
              <Input
                id="orderDeadline"
                type="datetime-local"
                value={formData.orderDeadline}
                onChange={(e) => {
                  setFormData({ ...formData, orderDeadline: e.target.value });
                  setDeadlineError('');
                }}
                min={minDeadline}
                required
                className={deadlineError ? 'border-red-500' : ''}
              />
              {deadlineError && (
                <p role="alert" className="text-sm text-red-500 mt-1">{deadlineError}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="paymentMethod"
                id="create-event-payment-label"
                className="text-sm font-medium block mb-1"
              >
                Payment Method
              </label>
              <Select
                id="paymentMethod"
                aria-labelledby="create-event-payment-label"
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
              >
                <option value="EVENT_CREATOR">Event Creator Pays</option>
                <option value="INDIVIDUAL">Individual Pays</option>
                <option value="COMPANY_EXPENSE">Company Expense</option>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Creating...' : 'Create Event'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
