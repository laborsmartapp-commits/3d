import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Building2, ArrowRight } from 'lucide-react';

const PLACES = [
  { to: '/realm', icon: Sparkles, title: 'Celestia Grotto', text: 'Your island Realm: build, explore and discover.' },
  { to: '/convergence', icon: Building2, title: 'The Convergence', text: 'Walk Astral Boulevard and the city districts.' },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground font-body flex flex-col items-center justify-center px-6 py-12">
      <h1 className="font-heading text-4xl md:text-5xl tracking-wide text-center">Where to, traveller?</h1>
      <p className="text-muted-foreground mt-3 text-center">Choose a destination to begin.</p>
      <div className="grid gap-4 md:grid-cols-2 mt-10 w-full max-w-3xl">
        {PLACES.map(({ to, icon: Icon, title, text }) => (
          <Link key={to} to={to} className="glass rounded-2xl p-6 group hover:bg-card/80 transition-colors">
            <Icon className="w-8 h-8 text-primary" />
            <h2 className="font-heading text-2xl mt-4">{title}</h2>
            <p className="text-sm text-muted-foreground mt-2">{text}</p>
            <span className="inline-flex items-center gap-1 text-sm text-primary mt-5">Enter <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></span>
          </Link>
        ))}
      </div>
    </div>
  );
}