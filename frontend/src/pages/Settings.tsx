import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

const Settings: React.FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>User & Company Settings</CardTitle>
          <CardDescription>Update your profile and company info</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-slate-500">Settings functionality coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
