import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useUpdateRestaurant } from '@/lib/api/hooks';
import { Restaurant } from '@/types';
import { Edit } from 'lucide-react';

interface EditRestaurantDialogProps {
  restaurant: Restaurant;
}

export function EditRestaurantDialog({ restaurant }: EditRestaurantDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { mutateAsync: updateRestaurant, isPending } = useUpdateRestaurant();
  
  const [formData, setFormData] = useState({
    name: restaurant.name,
    cuisine: restaurant.cuisine,
    openTime: restaurant.openTime,
    closeTime: restaurant.closeTime,
    deliveryTime: restaurant.deliveryTime,
    hasMenu: restaurant.hasMenu,
    imageUrl: restaurant.imageUrl || '',
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: restaurant.name,
        cuisine: restaurant.cuisine,
        openTime: restaurant.openTime,
        closeTime: restaurant.closeTime,
        deliveryTime: restaurant.deliveryTime,
        hasMenu: restaurant.hasMenu,
        imageUrl: restaurant.imageUrl || '',
      });
    }
  }, [isOpen, restaurant]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await updateRestaurant({
        id: restaurant.id,
        data: formData,
      });
      setIsOpen(false);
    } catch {
      // Error handled by TanStack Query
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setIsOpen(true)}
        aria-label="Edit restaurant"
      >
        <Edit className="h-4 w-4" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent onClose={() => setIsOpen(false)}>
          <DialogHeader>
            <DialogTitle>Edit Restaurant</DialogTitle>
            <DialogDescription>Update the restaurant details below.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="editRestaurant-name" className="text-sm font-medium">Name</label>
              <Input
                id="editRestaurant-name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Pizza Palace"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="editRestaurant-cuisine" className="text-sm font-medium">Cuisine</label>
              <Input
                id="editRestaurant-cuisine"
                name="cuisine"
                value={formData.cuisine}
                onChange={handleChange}
                placeholder="Italian"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="editRestaurant-openTime" className="text-sm font-medium">Open Time</label>
                <Input
                  id="editRestaurant-openTime"
                  name="openTime"
                  type="time"
                  value={formData.openTime}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="editRestaurant-closeTime" className="text-sm font-medium">Close Time</label>
                <Input
                  id="editRestaurant-closeTime"
                  name="closeTime"
                  type="time"
                  value={formData.closeTime}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="editRestaurant-deliveryTime" className="text-sm font-medium">Delivery Time</label>
              <Input
                id="editRestaurant-deliveryTime"
                name="deliveryTime"
                value={formData.deliveryTime}
                onChange={handleChange}
                placeholder="30-45 minutes"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="editRestaurant-imageUrl" className="text-sm font-medium">Image URL (optional)</label>
              <Input
                id="editRestaurant-imageUrl"
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
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Updating...' : 'Update Restaurant'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
