import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useCreateRestaurant } from '@/lib/api/hooks';

interface AddRestaurantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AddRestaurantDialog: React.FC<AddRestaurantDialogProps> = ({ open, onOpenChange }) => {
  const createRestaurant = useCreateRestaurant();
  const [formData, setFormData] = useState({
    name: '',
    cuisine: '',
    openTime: '',
    closeTime: '',
    deliveryTime: '',
    hasMenu: false,
    imageUrl: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createRestaurant.mutateAsync(formData);
      onOpenChange(false);
      setFormData({
        name: '',
        cuisine: '',
        openTime: '',
        closeTime: '',
        deliveryTime: '',
        hasMenu: false,
        imageUrl: '',
      });
    } catch {
      // Error handled by TanStack Query
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>Add Restaurant</DialogTitle>
          <DialogDescription>Add a new restaurant for your team to order from.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="addRestaurant-name" className="text-sm font-medium">Name</label>
            <Input
              id="addRestaurant-name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Pizza Palace"
              required
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="addRestaurant-cuisine" className="text-sm font-medium">Cuisine</label>
            <Input
              id="addRestaurant-cuisine"
              name="cuisine"
              value={formData.cuisine}
              onChange={handleChange}
              placeholder="Italian"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="addRestaurant-openTime" className="text-sm font-medium">Open Time</label>
              <Input
                id="addRestaurant-openTime"
                name="openTime"
                type="time"
                value={formData.openTime}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="addRestaurant-closeTime" className="text-sm font-medium">Close Time</label>
              <Input
                id="addRestaurant-closeTime"
                name="closeTime"
                type="time"
                value={formData.closeTime}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="addRestaurant-deliveryTime" className="text-sm font-medium">Delivery Time</label>
            <Input
              id="addRestaurant-deliveryTime"
              name="deliveryTime"
              value={formData.deliveryTime}
              onChange={handleChange}
              placeholder="30-45 minutes"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="addRestaurant-imageUrl" className="text-sm font-medium">Image URL (optional)</label>
            <Input
              id="addRestaurant-imageUrl"
              name="imageUrl"
              value={formData.imageUrl}
              onChange={handleChange}
              placeholder="https://..."
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="hasMenu"
              name="hasMenu"
              checked={formData.hasMenu}
              onChange={handleChange}
            />
            <label htmlFor="hasMenu" className="text-sm font-medium">
              Restaurant has a menu
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createRestaurant.isPending}>
              {createRestaurant.isPending ? 'Adding...' : 'Add Restaurant'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddRestaurantDialog;
