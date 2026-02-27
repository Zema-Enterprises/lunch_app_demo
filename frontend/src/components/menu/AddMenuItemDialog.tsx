import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useCreateMenuItem } from '@/lib/api/hooks';
import { Plus } from 'lucide-react';

interface AddMenuItemDialogProps {
  restaurantId: string;
}

export function AddMenuItemDialog({ restaurantId }: AddMenuItemDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { mutateAsync: createMenuItem, isPending } = useCreateMenuItem();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    available: true,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createMenuItem({
        restaurantId,
        data: {
          ...formData,
          price: parseFloat(formData.price),
        },
      });
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        price: '',
        category: '',
        available: true,
      });
      setIsOpen(false);
    } catch {
      // Error handled by TanStack Query
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="w-4 h-4 mr-2" />
        Add Menu Item
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent onClose={() => setIsOpen(false)}>
          <DialogHeader>
            <DialogTitle>Add Menu Item</DialogTitle>
            <DialogDescription>Add a new item to the restaurant menu.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="addMenuItem-name" className="text-sm font-medium">Name</label>
              <Input
                id="addMenuItem-name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Margherita Pizza"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="addMenuItem-description" className="text-sm font-medium">Description</label>
              <Textarea
                id="addMenuItem-description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Fresh mozzarella, tomato sauce, basil"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="addMenuItem-price" className="text-sm font-medium">Price ($)</label>
                <Input
                  id="addMenuItem-price"
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="12.99"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="addMenuItem-category" className="text-sm font-medium">Category</label>
                <Input
                  id="addMenuItem-category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  placeholder="Pizza, Pasta, Salad..."
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="available"
                name="available"
                checked={formData.available}
                onChange={handleChange}
              />
              <label htmlFor="available" className="text-sm font-medium">
                Available for ordering
              </label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Adding...' : 'Add Menu Item'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
