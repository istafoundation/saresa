"use client";

import Link from "next/link";
import { Heart, Github, Twitter, Mail, Sparkles } from "lucide-react";

interface LandingFooterProps {
  variant?: "light" | "dark";
  accentColor?: string;
}

export function LandingFooter({
  variant = "light",
  accentColor = "#3b82f6",
}: LandingFooterProps) {
  const currentYear = new Date().getFullYear();

  const styles = {
    light: {
      bg: "bg-slate-50 border-t border-slate-200",
      title: "text-slate-900",
      text: "text-slate-600",
      link: "text-slate-700 hover:text-blue-600",
      muted: "text-slate-400",
    },
    dark: {
      bg: "bg-slate-900 border-t border-slate-800",
      title: "text-white",
      text: "text-slate-400",
      link: "text-slate-300 hover:text-white",
      muted: "text-slate-600",
    },
  };

  const s = styles[variant];

  const links = {
    product: [
      { label: "Download App", href: "#download" },
      { label: "Features", href: "#features" },
      { label: "Parent Dashboard", href: "/dashboard" },
    ],
    support: [
      { label: "Help Center", href: "#" },
      { label: "Contact Us", href: "mailto:support@istafoundation.org" },
      { label: "Privacy Policy", href: "#" },
    ],
    social: [
      { icon: Github, href: "https://github.com/istafoundation/saresa", label: "GitHub" },
      { icon: Twitter, href: "#", label: "Twitter" },
      { icon: Mail, href: "mailto:contact@istafoundation.org", label: "Email" },
    ],
  };

  return (
    <footer className={`${s.bg} py-16`}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: accentColor }}
              >
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className={`text-xl font-bold ${s.title}`}>ISTA Kids</span>
            </Link>
            <p className={`${s.text} max-w-md mb-6`}>
              Empowering parents to nurture their children's learning journey through
              gamified educational content. Making learning fun and effective.
            </p>
            <div className="flex items-center gap-4">
              {links.social.map((social, idx) => (
                <a
                  key={idx}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${s.link}`}
                  style={{ backgroundColor: `${accentColor}10` }}
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className={`font-bold mb-4 ${s.title}`}>Product</h4>
            <ul className="space-y-3">
              {links.product.map((link, idx) => (
                <li key={idx}>
                  <Link href={link.href} className={`text-sm transition-colors ${s.link}`}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h4 className={`font-bold mb-4 ${s.title}`}>Support</h4>
            <ul className="space-y-3">
              {links.support.map((link, idx) => (
                <li key={idx}>
                  <a
                    href={link.href}
                    className={`text-sm transition-colors ${s.link}`}
                    target={link.href.startsWith("mailto") ? undefined : "_blank"}
                    rel="noopener noreferrer"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className={`pt-8 border-t ${variant === "dark" ? "border-slate-800" : "border-slate-200"} flex flex-col md:flex-row items-center justify-between gap-4`}>
          <p className={`text-sm ${s.muted}`}>
            © {currentYear} ISTA Foundation. All rights reserved.
          </p>
          <p className={`text-sm ${s.text} flex items-center gap-1`}>
            Made with <Heart className="w-4 h-4 text-red-500 fill-red-500" /> for curious minds
          </p>
        </div>
      </div>
    </footer>
  );
}
