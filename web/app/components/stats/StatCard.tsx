import { LucideIcon } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  color?: "emerald" | "amber" | "rose" | "blue" | "violet" | "indigo";
  className?: string;
}

export function StatCard({ 
  label, 
  value, 
  icon: Icon, 
  trend, 
  color = "emerald",
  className 
}: StatCardProps) {
  
  const colorStyles = {
    emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    amber: "bg-amber-50 text-amber-600 ring-amber-100",
    rose: "bg-rose-50 text-rose-600 ring-rose-100",
    blue: "bg-blue-50 text-blue-600 ring-blue-100",
    violet: "bg-violet-50 text-violet-600 ring-violet-100",
    indigo: "bg-indigo-50 text-indigo-600 ring-indigo-100",
  };

  return (
    <div className={cn("bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between", className)}>
      <div className="flex items-start justify-between mb-4">
        <div className={cn("p-3 rounded-xl ring-1", colorStyles[color])}>
          <Icon size={24} />
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full",
            trend.positive ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50"
          )}>
            <span>{trend.positive ? "+" : ""}{trend.value}%</span>
          </div>
        )}
      </div>
      <div>
        <p className="text-slate-500 font-medium text-sm mb-1">{label}</p>
        <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{value}</h3>
        {trend && <p className="text-slate-400 text-xs mt-2">{trend.label}</p>}
      </div>
    </div>
  );
}
