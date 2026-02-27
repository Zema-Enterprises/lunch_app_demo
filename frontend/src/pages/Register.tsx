import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { registerSchema, RegisterFormData, PASSWORD_REQUIREMENTS_HINT } from '@/lib/validation/schemas';
import { buildTenantPath } from '@/lib/api/tenant';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register: registerUser, isLoading } = useAuthStore();
  
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await registerUser({
        email: data.email,
        password: data.password,
        name: data.name,
        companyName: data.companyName,
        companyDomain: data.companyDomain,
        companySlug: data.companySlug,
      });
      navigate(buildTenantPath('/dashboard'));
    } catch (err: any) {
      setError('root', { message: err.response?.data?.message || 'Registration failed' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>Register your company to get started</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)} aria-label="Registration form">
          <CardContent className="space-y-4">
            {errors.root && (
              <div 
                className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm"
                role="alert"
              >
                {errors.root.message}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">Your Name</label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                {...register('name')}
              />
              {errors.name && (
                <p id="name-error" className="text-sm text-red-600" role="alert">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <Input
                id="email"
                type="email"
                placeholder="john@company.com"
                autoComplete="email"
                {...register('email')}
              />
              {errors.email && (
                <p id="email-error" className="text-sm text-red-600" role="alert">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                {...register('password')}
              />
              {errors.password && (
                <p id="password-error" className="text-sm text-red-600" role="alert">{errors.password.message}</p>
              )}
              {!errors.password && (
                <p className="text-xs text-slate-500">{PASSWORD_REQUIREMENTS_HINT}</p>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p id="confirmPassword-error" className="text-sm text-red-600" role="alert">{errors.confirmPassword.message}</p>
              )}
            </div>
            <div className="border-t pt-4 mt-4">
              <p className="text-sm font-medium mb-3">Company Information</p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="companyName" className="text-sm font-medium">Company Name</label>
                  <Input
                    id="companyName"
                    type="text"
                    placeholder="Acme Inc"
                    {...register('companyName')}
                  />
                  {errors.companyName && (
                    <p id="companyName-error" className="text-sm text-red-600" role="alert">{errors.companyName.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label htmlFor="companyDomain" className="text-sm font-medium">Company Domain</label>
                  <Input
                    id="companyDomain"
                    type="text"
                    placeholder="acme.com"
                    {...register('companyDomain')}
                  />
                  {errors.companyDomain && (
                    <p id="companyDomain-error" className="text-sm text-red-600" role="alert">{errors.companyDomain.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label htmlFor="companySlug" className="text-sm font-medium">Company Slug</label>
                  <Input
                    id="companySlug"
                    type="text"
                    placeholder="acme-inc"
                    {...register('companySlug')}
                  />
                  {errors.companySlug && (
                    <p id="companySlug-error" className="text-sm text-red-600" role="alert">{errors.companySlug.message}</p>
                  )}
                  <p className="text-xs text-slate-500">
                    Only lowercase letters, numbers, and hyphens
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Creating account...' : 'Create Account'}
            </Button>
            <p className="text-sm text-center text-slate-600">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-slate-900 hover:underline">
                Sign in
              </Link>
            </p>
            <p className="text-xs text-center text-slate-500">
              Joining an existing company? Use the invite link sent by your administrator to finish setup.
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default Register;
