import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRestaurants, useDeleteRestaurant } from '@/lib/api/hooks';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import AddRestaurantDialog from '@/components/features/AddRestaurantDialog';
import { EditRestaurantDialog } from '@/components/restaurants/EditRestaurantDialog';
import { SkeletonCardGrid } from '@/components/loading/SkeletonLoaders';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Utensils, Clock, Truck } from 'lucide-react';
import type { Restaurant } from '@/types';

export default function Restaurants() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data: restaurants, isLoading } = useRestaurants();
  const deleteRestaurant = useDeleteRestaurant();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deletingRestaurant, setDeletingRestaurant] = useState<Restaurant | null>(null);

  const handleDelete = async () => {
    if (!deletingRestaurant) return;
    
    try {
      await deleteRestaurant.mutateAsync(deletingRestaurant.id);
      setDeletingRestaurant(null);
    } catch {
      // Error handled by TanStack Query
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Restaurants</h1>
            <p className="text-muted-foreground">Browse and manage restaurants</p>
          </div>
        </div>
        <SkeletonCardGrid count={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Restaurants</h1>
          <p className="text-muted-foreground">
            Browse and manage restaurants
          </p>
        </div>
        {user?.role === 'ADMIN' && (
          <Button onClick={() => setShowAddDialog(true)}>
            Add Restaurant
          </Button>
        )}
      </div>

      {!restaurants || restaurants.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="p-4 bg-gray-100 rounded-full mb-4">
                <Utensils className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No restaurants yet
              </h3>
              <p className="text-gray-600 max-w-md mb-6">
                Get started by adding your first restaurant
              </p>
              {user?.role === 'ADMIN' && (
                <Button onClick={() => setShowAddDialog(true)}>
                  Add Restaurant
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {restaurants.map((restaurant) => (
            <Card 
              key={restaurant.id} 
              className="hover:shadow-lg transition-shadow duration-200 animate-scale-in"
            >
              <CardHeader>
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-xl truncate" title={restaurant.name}>
                      {restaurant.name}
                    </CardTitle>
                    <CardDescription className="mt-1 line-clamp-2">
                      {restaurant.cuisine}
                    </CardDescription>
                  </div>
                  <Badge variant="default" className="flex-shrink-0">
                    Active
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    {restaurant.openTime} - {restaurant.closeTime}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Truck className="h-3.5 w-3.5" aria-hidden="true" />
                    Delivery: {restaurant.deliveryTime} mins
                  </p>
                  {restaurant.cuisine && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {restaurant.cuisine.split(',').map((c) => (
                        <Badge key={c.trim()} variant="outline" className="text-xs">
                          {c.trim()}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>

              <CardFooter className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => navigate(`/restaurants/${restaurant.id}`)}
                  className="flex-1"
                >
                  View Details
                </Button>
                
                {user?.role === 'ADMIN' && (
                  <>
                    <EditRestaurantDialog restaurant={restaurant} />
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeletingRestaurant(restaurant)}
                    >
                      Delete
                    </Button>
                  </>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <AddRestaurantDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
      />

      <ConfirmDialog
        isOpen={!!deletingRestaurant}
        onClose={() => setDeletingRestaurant(null)}
        onConfirm={handleDelete}
        title="Delete Restaurant"
        message={`Are you sure you want to delete "${deletingRestaurant?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={deleteRestaurant.isPending}
      />
    </div>
  );
}
