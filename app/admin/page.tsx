import React from 'react';
import Navbar from '@/components/Navbar';
import AdminDashboard from '@/components/AdminDashboard';
import AnimatedChatbot from '@/components/AnimatedChatbot';

export const metadata = {
  title: 'Admin Command Console | HumanFlow AI',
  description: 'Manage HumanFlow AI queue, API keys, system telemetry, and automation webhooks.',
};

export default function AdminPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar />
      <main className="flex-1">
        <AdminDashboard />
      </main>
      <AnimatedChatbot />
    </div>
  );
}
