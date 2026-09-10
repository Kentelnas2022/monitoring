'use client';

import React, { useState } from 'react';
import { 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck,
  Activity,
  Send,
  Radio,
  Server,
  CheckCircle2,
  Building2,
  Clock,
  AlertCircle
} from 'lucide-react';

interface LoginLandingPageProps {
  onLogin: (user?: any) => void;
}

export const LoginLandingPage: React.FC<LoginLandingPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        onLogin(data.user);
      } else {
        setErrorMessage(data.message || 'Invalid credentials. Please verify your email/username and password.');
      }
    } catch {
      setErrorMessage('Network connection error: Unable to reach the authentication service.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen w-full flex flex-col justify-between bg-[#f8fafc] text-slate-900 selection:bg-[#237227] selection:text-white relative overflow-x-hidden font-sans"
      style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
      {/* Background Decorative Mesh & Radial Accents (Clean, Light, System-Aligned) */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-emerald-100/50 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-[550px] h-[550px] bg-emerald-50/70 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-[600px] h-[600px] bg-slate-100/80 rounded-full blur-3xl" />
        
        {/* Subtle Micro-Grid Texture */}
        <div 
          className="absolute inset-0 opacity-[0.4]"
          style={{
            backgroundImage: `radial-gradient(#94a3b8 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />
      </div>

      {/* MAIN BODY: SPLIT LANDING HERO & NATURAL LOGIN CONSOLE */}
      <main className="relative z-10 flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-16 flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-16 my-auto">
        
        {/* LEFT COLUMN: INTRODUCTION TO THE SYSTEM */}
        <div className="w-full lg:w-7/12 space-y-6 text-left">
          
          {/* Multifactors Sales Logo & Agency Badge */}
          <div className="flex flex-wrap items-center gap-3.5">
            <img
              src="/multifactors-logo.png?v=2"
              alt="Multifactors Sales & Services Inc."
              className="h-10 sm:h-12 w-auto object-contain"
            />
            <div className="h-6 w-[1px] bg-slate-300/80 hidden sm:block" />
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200/90 shadow-2xs text-xs font-semibold text-slate-700">
              <span className="h-2 w-2 rounded-full bg-[#237227]" />
              <span>DICT Region 10 NOC Operations</span>
            </div>
          </div>

          {/* Hero Headline: Multifactors Sales Network Monitoring System */}
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
              Multifactors Sales <br className="hidden sm:block" />
              <span className="text-[#237227]">Network Monitoring System</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl font-normal">
              Enterprise network infrastructure monitoring and real-time telemetry platform. Providing continuous visibility, automated downtime detection, and instant incident response across regional facilities.
            </p>
          </div>

          {/* 3 Core System Capabilities Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
            
            {/* Feature 1: Live Polling */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
              <div className="h-9 w-9 rounded-xl bg-emerald-50 text-[#237227] flex items-center justify-center">
                <Activity className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">Real-Time Telemetry</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                  15s/30s heartbeat polling across gateways, switches, and APs.
                </p>
              </div>
            </div>

            {/* Feature 2: Telegram Dispatch */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
              <div className="h-9 w-9 rounded-xl bg-emerald-50 text-[#237227] flex items-center justify-center">
                <Send className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">Telegram Dispatch</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                  Instant downtime alerts routed to designated field engineers.
                </p>
              </div>
            </div>

            {/* Feature 3: Area Assignment */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
              <div className="h-9 w-9 rounded-xl bg-emerald-50 text-[#237227] flex items-center justify-center">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">Area Assignment</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                  Assigned technicians for CDO, Bukidnon, Camiguin, and Lanao.
                </p>
              </div>
            </div>
          </div>

          {/* Key Uptime & Performance Metrics */}
          <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center gap-6 sm:gap-10 text-xs">
            <div>
              <div className="text-lg sm:text-xl font-extrabold text-slate-900">99.8%</div>
              <div className="text-[11px] text-slate-500 font-medium">Target Uptime SLA</div>
            </div>
            <div>
              <div className="text-lg sm:text-xl font-extrabold text-slate-900">12 Sites</div>
              <div className="text-[11px] text-slate-500 font-medium">Monitored Facilities</div>
            </div>
            <div>
              <div className="text-lg sm:text-xl font-extrabold text-slate-900">&lt; 30s</div>
              <div className="text-[11px] text-slate-500 font-medium">Outage Response Speed</div>
            </div>
            <div>
              <div className="text-lg sm:text-xl font-extrabold text-[#237227]">v2.4-PROD</div>
              <div className="text-[11px] text-slate-500 font-medium">Ruijie Cloud Engine</div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: NATURAL, CLEAN LOGIN CONSOLE (NO SIGNUP) */}
        <div className="w-full lg:w-5/12 max-w-md">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xl shadow-slate-200/50 space-y-5 text-left">
            
            {/* Header: Title & Subtitle */}
            <div className="space-y-1 text-center sm:text-left">
              <div className="inline-flex items-center justify-center h-11 w-11 rounded-2xl bg-emerald-50 text-[#237227] mb-2 shadow-2xs">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Console Sign In
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Enter your authorized credentials to access the NOC dashboard.
              </p>
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200/90 text-rose-800 text-xs font-semibold flex items-start gap-2.5 animate-in fade-in duration-150">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 leading-snug">{errorMessage}</div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4 pt-1">
              
              {/* Work Email / Username */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Official Email / Username
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter official email or username"
                    className="w-full h-11 pl-10 pr-3.5 text-xs rounded-xl bg-white border border-slate-300 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200 transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Account Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter account password"
                    className="w-full h-11 pl-10 pr-10 text-xs rounded-xl bg-white border border-slate-300 text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200 transition-all shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me Toggle */}
              <div className="flex items-center justify-between pt-0.5 text-xs">
                <label className="flex items-center gap-2 text-slate-600 font-medium cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#237227] accent-[#237227] cursor-pointer"
                  />
                  <span>Keep me signed in</span>
                </label>

                <span className="text-[11px] text-slate-400">NOC Session</span>
              </div>

              {/* Sign In Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 rounded-xl bg-[#237227] hover:bg-[#1b5e20] active:scale-[0.99] text-white font-bold text-xs tracking-wider transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-75"
                >
                  {isLoading ? (
                    <span className="animate-pulse">Authenticating Session...</span>
                  ) : (
                    <>
                      <span>Sign In to Dashboard</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>

              {/* Security & Authorized Personnel Notice */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400 text-center">
                <ShieldCheck className="h-3.5 w-3.5 text-[#237227] shrink-0" />
                <span>Authorized Government Personnel Only • Region 10</span>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* 3. CLEAN FOOTER */}
      <footer className="relative z-20 w-full border-t border-slate-200/70 bg-white/60 py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            © {new Date().getFullYear()} Department of Information and Communications Technology (DICT). All rights reserved.
          </div>
          <div className="text-[11px] text-slate-400">
            Enterprise Cloud Integration by Multifactors Sales & Services Inc.
          </div>
        </div>
      </footer>
    </div>
  );
};