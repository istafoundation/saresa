"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone, Shield, Star, CheckCircle2 } from "lucide-react";

interface VersionData {
  latestVersion: string;
  downloadUrl: string;
  updateUrl: string;
  forceUpdate: boolean;
  isUpdateEnabled: boolean;
  updateMessage: string;
  android: {
    versionCode: number;
  };
}

interface DownloadSectionProps {
  variant?: "light" | "dark" | "colorful";
  accentColor?: string;
  bgGradient?: string;
}

export function DownloadSection({
  variant = "light",
  accentColor = "#3b82f6",
  bgGradient = "from-blue-600 to-indigo-700",
}: DownloadSectionProps) {
  const [versionData, setVersionData] = useState<VersionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/version")
      .then((res) => res.json())
      .then((data) => {
        setVersionData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const features = [
    { icon: Smartphone, text: "Works on all Android devices" },
    { icon: Shield, text: "Safe & kid-friendly content" },
    { icon: Star, text: "Gamified learning experience" },
  ];

  const variantStyles = {
    light: {
      bg: "bg-linear-to-br from-slate-50 to-blue-50",
      card: "bg-white border border-slate-200",
      title: "text-slate-900",
      subtitle: "text-slate-600",
      featureText: "text-slate-700",
    },
    dark: {
      bg: "bg-linear-to-br from-slate-900 to-slate-800",
      card: "bg-slate-800/50 border border-slate-700/50 backdrop-blur",
      title: "text-white",
      subtitle: "text-slate-300",
      featureText: "text-slate-300",
    },
    colorful: {
      bg: `bg-linear-to-br ${bgGradient}`,
      card: "bg-white/10 border border-white/20 backdrop-blur-xl",
      title: "text-white",
      subtitle: "text-white/80",
      featureText: "text-white/90",
    },
  };

  const styles = variantStyles[variant];

  return (
    <section className={`py-24 ${styles.bg} relative overflow-hidden`} id="download">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-20 left-10 w-72 h-72 rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: accentColor }}
        />
        <div
          className="absolute bottom-20 right-10 w-96 h-96 rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: accentColor }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6"
            style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
          >
            <Download className="w-4 h-4" />
            <span>Download Now</span>
          </div>
          <h2 className={`text-4xl md:text-5xl font-bold mb-4 ${styles.title}`}>
            Get ISTA Kids Today
          </h2>
          <p className={`text-lg max-w-2xl mx-auto ${styles.subtitle}`}>
            Start your child's learning adventure with our gamified educational app.
            Available now on Android devices.
          </p>
        </div>

        <div className={`max-w-lg mx-auto ${styles.card} rounded-3xl p-8 shadow-2xl`}>
          {/* App Icon & Info */}
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-200/20">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ backgroundColor: accentColor }}
            >
              <Star className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className={`text-xl font-bold ${styles.title}`}>ISTA Kids</h3>
              <p className={`text-sm ${styles.subtitle}`}>
                Educational Games for Children
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-3 mb-8">
            {features.map((feature, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${accentColor}20` }}
                >
                  <feature.icon className="w-4 h-4" style={{ color: accentColor }} />
                </div>
                <span className={`text-sm ${styles.featureText}`}>{feature.text}</span>
              </div>
            ))}
          </div>

          {/* Download Button */}
          {loading ? (
            <div className="w-full h-14 bg-slate-200/30 rounded-2xl animate-pulse" />
          ) : versionData ? (
            <div className="space-y-4">
              <a
                href={versionData.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-center gap-3 w-full py-4 rounded-2xl font-bold text-white shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all"
                style={{ backgroundColor: accentColor }}
              >
                <Download className="w-5 h-5 group-hover:animate-bounce" />
                <span>Download APK</span>
              </a>
              <div className="flex items-center justify-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4" style={{ color: accentColor }} />
                <span className={styles.subtitle}>
                  Version {versionData.latestVersion} • Android
                </span>
              </div>
            </div>
          ) : (
            <div className={`text-center py-4 ${styles.subtitle}`}>
              Version info unavailable
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
