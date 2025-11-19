import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useRedeemInvite } from '@/lib/api/hooks';
import { useAuthStore } from '@/store/authStore';

export default function AcceptInvite() {
  const { token: routeToken } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [formState, setFormState] = useState({
    name: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const redeemInvite = useRedeemInvite();
  const { setAuthSession } = useAuthStore();
  const inviteToken = routeToken || '';

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormState((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!inviteToken) {
      setError('Invite link is invalid or missing.');
      return;
    }

    if (formState.password !== formState.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setError(null);
      const result = await redeemInvite.mutateAsync({
        token: inviteToken,
        name: formState.name,
        password: formState.password,
      });
      setAuthSession(result.token, result.user);
      setSuccess(true);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        'Unable to redeem invite. Please check your link or contact your admin.';
      setError(message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Accept Invitation</CardTitle>
          <CardDescription>
            {success
              ? 'Welcome to LunchSync!'
              : 'Complete your account to join your company workspace.'}
          </CardDescription>
        </CardHeader>
        {success ? (
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Your invitation has been accepted and your account is ready. You can jump right into your dashboard.
            </p>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <CardContent className="space-y-4">
              {!inviteToken && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm" role="alert">
                  Invite link missing. Please use the link you received via email.
                </div>
              )}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm" role="alert">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Full Name
                </label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Your name"
                  autoComplete="name"
                  value={formState.name}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  value={formState.password}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirm Password
                </label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  value={formState.confirmPassword}
                  onChange={handleChange}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={redeemInvite.isPending || !inviteToken}>
                {redeemInvite.isPending ? 'Creating account...' : 'Join Workspace'}
              </Button>
            </CardFooter>
          </form>
        )}
        {success && (
          <CardFooter className="flex flex-col gap-3">
            <Button className="w-full" type="button" onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </Button>
            <p className="text-sm text-center text-slate-500">
              Need to invite someone else? Ask an admin to send them an invite link from Company Settings.
            </p>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
