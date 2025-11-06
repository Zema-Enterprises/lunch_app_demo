import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Calendar, UtensilsCrossed, Users, Plus, Clock, ShoppingBag, TrendingUp, ArrowRight, DollarSign } from 'lucide-react';
import { useEvents, useRestaurants, useUserStats, useNotificationAnalytics } from '../lib/api/hooks';
import { format } from 'date-fns';
import { SkeletonStats, SkeletonList } from '../components/loading/SkeletonLoaders';
import { EmptyState } from '../components/ui/empty-state';
import NotificationAnalyticsPanel from '@/components/notifications/NotificationAnalyticsPanel';
import { useAuthStore } from '../store/authStore';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data: events, isLoading: eventsLoading } = useEvents('OPEN');
  const { data: restaurants, isLoading: restaurantsLoading } = useRestaurants();
  const { data: userStats, isLoading: statsLoading } = useUserStats();
  const { data: analytics, isLoading: analyticsLoading } = useNotificationAnalytics();

  const activeEvents = events?.filter(e => e.status === 'OPEN') || [];
  const upcomingEvents = activeEvents.slice(0, 5);

  const isLoading = eventsLoading || restaurantsLoading || statsLoading || analyticsLoading;

  const pushTotals = analytics?.delivery?.PUSH ?? {};
  const pushSuccess = pushTotals.SUCCESS ?? 0;
  const pushFailures = pushTotals.FAILED ?? 0;
  const pushAttempts = pushSuccess + pushFailures;
  const pushSuccessRate = pushAttempts > 0 ? Math.round((pushSuccess / pushAttempts) * 100) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        {user?.role === 'ADMIN' && (
          <Button
            onClick={() => navigate('/events', { state: { openCreateEvent: true } })}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Event
          </Button>
        )}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks to get you started</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => navigate('/events')}
            >
              <ShoppingBag className="w-6 h-6" />
              <div>
                <div className="font-semibold">Order Now</div>
                <div className="text-xs text-muted-foreground">Browse active events</div>
              </div>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => navigate('/orders')}
            >
              <Users className="w-6 h-6" />
              <div>
                <div className="font-semibold">My Orders</div>
                <div className="text-xs text-muted-foreground">View order history</div>
              </div>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => navigate('/restaurants')}
            >
              <UtensilsCrossed className="w-6 h-6" />
              <div>
                <div className="font-semibold">Restaurants</div>
                <div className="text-xs text-muted-foreground">Browse options</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}

      {/* Statistics */}
      {isLoading ? (
        <SkeletonStats />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card className="transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Events</CardTitle>
              <Calendar className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeEvents.length}</div>
              <p className="text-xs text-slate-500">Open for orders</p>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Restaurants</CardTitle>
              <UtensilsCrossed className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{restaurants?.length || 0}</div>
              <p className="text-xs text-slate-500">Available options</p>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Your Orders</CardTitle>
              <ShoppingBag className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userStats?.thisWeekOrders || 0}</div>
              <p className="text-xs text-slate-500">This week</p>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              <DollarSign className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${(userStats?.totalSpent || 0).toFixed(2)}</div>
              <p className="text-xs text-slate-500">All time</p>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Push Delivery</CardTitle>
              <TrendingUp className="h-4 w-4 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pushSuccessRate !== null ? `${pushSuccessRate}%` : '—'}
              </div>
              <p className="text-xs text-slate-500">
                {pushAttempts > 0
                  ? `${pushSuccess} success / ${pushFailures} failed attempts`
                  : 'No push deliveries yet'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Two Column Layout for Analytics / Events / Orders */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1">
          <NotificationAnalyticsPanel />
        </div>

        <div className="xl:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Events */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Upcoming Events</CardTitle>
                  <CardDescription>Active lunch events you can join</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/events')}>
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <SkeletonList items={3} />
              ) : upcomingEvents.length === 0 ? (
                <EmptyState
                  icon={Calendar}
                  title="No events yet"
                  description="Create your first event to get started organizing lunch orders"
                  action={{
                    label: 'Create Event',
                    onClick: () => navigate('/events', { state: { openCreateEvent: true } }),
                  }}
                />
              ) : (
                <div className="space-y-4">
                  {upcomingEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 cursor-pointer transition-all hover:shadow-sm animate-scale-in"
                      onClick={() => navigate('/events')}
                    >
                      <div className="flex-1">
                        <h3 className="font-medium">{event.title}</h3>
                        <p className="text-sm text-slate-500">{event.restaurant?.name}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="flex items-center text-sm text-slate-600">
                            <Clock className="w-4 h-4 mr-1" />
                            {format(new Date(event.orderDeadline), 'MMM d, h:mm a')}
                          </div>
                          <p className="text-xs text-slate-500">{event.deliveryLocation}</p>
                        </div>
                        <Badge variant={event.status === 'OPEN' ? 'success' : 'secondary'}>
                          {event.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Orders */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Orders</CardTitle>
                  <CardDescription>Your latest orders</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/orders')}>
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <SkeletonList items={3} />
              ) : restaurants?.length === 0 ? (
                <EmptyState
                  icon={ShoppingBag}
                  title="No orders yet"
                  description="Place your first lunch order to see it here."
                  action={{ label: 'Browse Events', onClick: () => navigate('/events') }}
                />
              ) : (
                <div className="space-y-4">
                  {restaurants?.slice(0, 3).map((restaurant) => (
                    <div key={restaurant.id} className="flex justify-between items-center p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">{restaurant.name}</h3>
                        <p className="text-sm text-slate-500">{restaurant.cuisine}</p>
                      </div>
                      <Badge variant="secondary">Order ready</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
