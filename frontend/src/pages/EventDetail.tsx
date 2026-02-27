import { useParams, useNavigate } from 'react-router-dom';
import { useEvent, useJoinEvent, useLeaveEvent, useCloseEvent, useMarkEventDelivered, useCompleteEvent } from '@/lib/api/hooks';
import { useAuthStore } from '@/store/authStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Clock, MapPin, Users, Calendar, User, Truck, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import type { Event, User as UserType } from '@/types';
import OrdersSection from '@/components/events/OrdersSection';
import { buildTenantPath } from '@/lib/api/tenant';

interface UserEventState {
  isParticipant: boolean;
  isCreator: boolean;
  isAdmin: boolean;
  canJoin: boolean;
  canLeave: boolean;
  canCloseEvent: boolean;
  canMarkDelivered: boolean;
  canCompleteEvent: boolean;
}

const getUserEventState = (user: UserType | null, event: Event | undefined): UserEventState => {
  if (!user || !event) {
    return {
      isParticipant: false,
      isCreator: false,
      isAdmin: false,
      canJoin: false,
      canLeave: false,
      canCloseEvent: false,
      canMarkDelivered: false,
      canCompleteEvent: false,
    };
  }

  const isParticipant = event.participants?.some((p) => p.userId === user.id) || false;
  const isCreator = event.createdById === user.id;
  const isAdmin = user.role === 'ADMIN';
  const isOpen = event.status === 'OPEN';
  const isClosed = event.status === 'CLOSED';
  const hasManagerAccess = isCreator || isAdmin;
  const deadlinePassed = new Date() >= new Date(event.orderDeadline);

  return {
    isParticipant,
    isCreator,
    isAdmin,
    canJoin: !isParticipant && isOpen && !deadlinePassed,
    canLeave: isParticipant && !isCreator && isOpen && !deadlinePassed,
    canCloseEvent: hasManagerAccess && isOpen,
    // Can mark delivered when event is CLOSED and not yet delivered
    canMarkDelivered: hasManagerAccess && isClosed && !event.deliveredAt,
    // Can complete event when event is CLOSED (completion will check all requirements)
    canCompleteEvent: hasManagerAccess && isClosed,
  };
};

const EventDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data: event, isLoading, isError } = useEvent(id || '');
  const joinEvent = useJoinEvent();
  const leaveEvent = useLeaveEvent();
  const closeEvent = useCloseEvent();
  const markDelivered = useMarkEventDelivered();
  const completeEvent = useCompleteEvent();

  const userState = getUserEventState(user, event);

  const handleJoinEvent = async () => {
    if (!id) return;
    try {
      await joinEvent.mutateAsync(id);
    } catch {
      // Error handled by TanStack Query
    }
  };

  const handleLeaveEvent = async () => {
    if (!id) return;
    if (!confirm('Are you sure you want to leave this event?')) return;
    try {
      await leaveEvent.mutateAsync(id);
    } catch {
      // Error handled by TanStack Query
    }
  };

  const handleCloseEvent = async () => {
    if (!id) return;
    if (!confirm('Are you sure you want to close this event? No more orders will be accepted.')) return;
    try {
      await closeEvent.mutateAsync(id);
    } catch {
      // Error handled by TanStack Query
    }
  };

  const handleMarkDelivered = async () => {
    if (!id) return;
    try {
      await markDelivered.mutateAsync(id);
    } catch {
      // Error handled by TanStack Query
    }
  };

  const handleCompleteEvent = async () => {
    if (!id) return;
    try {
      await completeEvent.mutateAsync(id);
    } catch {
      // Error handled by TanStack Query
    }
  };

  if (isLoading) {
    return (
      <div className="p-6" data-testid="event-detail-loading">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (isError || !event) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Event not found</h1>
        <p className="text-gray-600 mb-4">
          The event you're looking for doesn't exist or you don't have access to it.
        </p>
        <Button onClick={() => navigate(buildTenantPath('/events'))}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Events
        </Button>
      </div>
    );
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-green-500 text-white';
      case 'CLOSED':
        return 'bg-yellow-500 text-white';
      case 'COMPLETED':
        return 'bg-blue-500 text-white';
      case 'CANCELLED':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate(buildTenantPath('/events'))}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{event.title}</h1>
              <Badge className={getStatusBadgeColor(event.status)}>
                {event.status}
              </Badge>
              {event.deliveredAt && (
                <Badge className="bg-blue-500 text-white">
                  <Truck className="w-3 h-3 mr-1" />
                  Delivered
                </Badge>
              )}
            </div>
            {event.description && (
              <p className="text-gray-600 mt-2">{event.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        {userState.canJoin && (
          <Button onClick={handleJoinEvent} disabled={joinEvent.isPending}>
            {joinEvent.isPending ? 'Joining...' : 'Join Event'}
          </Button>
        )}
        {userState.canLeave && (
          <Button variant="outline" onClick={handleLeaveEvent} disabled={leaveEvent.isPending}>
            {leaveEvent.isPending ? 'Leaving...' : 'Leave Event'}
          </Button>
        )}
        {userState.canCloseEvent && (
          <Button variant="destructive" onClick={handleCloseEvent} disabled={closeEvent.isPending}>
            {closeEvent.isPending ? 'Closing...' : 'Close Event'}
          </Button>
        )}
        {userState.canMarkDelivered && (
          <Button
            variant="outline"
            onClick={handleMarkDelivered}
            disabled={markDelivered.isPending}
            className="text-blue-700 border-blue-300 hover:bg-blue-50"
          >
            <Truck className="w-4 h-4 mr-2" />
            {markDelivered.isPending ? 'Marking...' : 'Mark Delivered'}
          </Button>
        )}
        {userState.canCompleteEvent && (
          <Button
            onClick={handleCompleteEvent}
            disabled={completeEvent.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            {completeEvent.isPending ? 'Completing...' : 'Complete Event'}
          </Button>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Event Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Event Information Card */}
          <Card>
            <CardHeader>
              <CardTitle>Event Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start">
                <Calendar className="w-5 h-5 mr-3 text-gray-500 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-gray-700">Order Deadline</div>
                  <div className="text-sm text-gray-900">
                    {format(new Date(event.orderDeadline), 'PPP p')}
                  </div>
                </div>
              </div>

              <div className="flex items-start">
                <MapPin className="w-5 h-5 mr-3 text-gray-500 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-gray-700">Delivery Location</div>
                  <div className="text-sm text-gray-900">{event.deliveryLocation}</div>
                </div>
              </div>

              {event.estimatedDelivery && (
                <div className="flex items-start">
                  <Clock className="w-5 h-5 mr-3 text-gray-500 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-gray-700">Estimated Delivery</div>
                    <div className="text-sm text-gray-900">{event.estimatedDelivery}</div>
                  </div>
                </div>
              )}

              {event.createdBy && (
                <div className="flex items-start">
                  <User className="w-5 h-5 mr-3 text-gray-500 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-gray-700">Created By</div>
                    <div className="text-sm text-gray-900">{event.createdBy.name}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Restaurant Information Card */}
          {event.restaurant && (
            <Card>
              <CardHeader>
                <CardTitle>Restaurant</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">{event.restaurant.name}</h3>
                  <p className="text-sm text-gray-600">{event.restaurant.cuisine} Cuisine</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Operating Hours:</span>
                    <div className="text-gray-900">
                      {event.restaurant.openTime} - {event.restaurant.closeTime}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Delivery Time:</span>
                    <div className="text-gray-900">{event.restaurant.deliveryTime}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Participants Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Participants
                </CardTitle>
                <Badge variant="outline">
                  {event.participants?.length || 0} Participant{event.participants?.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {event.participants && event.participants.length > 0 ? (
                <div className="space-y-2">
                  {event.participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50"
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {participant.user?.name || 'Unknown User'}
                        </p>
                        <p className="text-xs text-gray-500">
                          Joined {format(new Date(participant.joinedAt), 'PPp')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  No participants yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Orders Section - Full Width */}
      <OrdersSection eventId={id || ''} event={event} user={user} />
    </div>
  );
};

export default EventDetail;
