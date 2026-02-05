"use client";

import Image from "next/image";
import { LandingNav, DownloadSection, LandingFooter } from "./components/landing";
import { motion, Variants } from "framer-motion";
import { 
  TreePine, 
  Leaf, 
  Sun,
  Bird,
  Flower2,
  Sprout,
  Heart,
  Users,
  Shield,
  Trophy,
  BookOpen,
  Target,
  ArrowRight,
  CheckCircle2,
  Sparkles
} from "lucide-react";
import { useUser, SignInButton } from "@clerk/nextjs";
import Link from "next/link";

export default function LandingPage() {
  const { isSignedIn, isLoaded } = useUser();

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
      },
    },
  };

  const heroVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { duration: 0.8, ease: "easeOut" } 
    }
  };

  const features = [
    {
      icon: Sprout,
      title: "Grow Together",
      description: "Watch your child's knowledge bloom with each daily learning session",
      color: "#22c55e",
    },
    {
      icon: Sun,
      title: "Bright Learning",
      description: "Sunshine-filled games that make vocabulary stick naturally",
      color: "#eab308",
    },
    {
      icon: Bird,
      title: "Free Exploration",
      description: "Kids discover at their own pace through the forest of knowledge",
      color: "#3b82f6",
    },
    {
      icon: Shield,
      title: "Safe Haven",
      description: "A protected environment with parent controls and content filters",
      color: "#10b981",
    },
    {
      icon: Trophy,
      title: "Nature Rewards",
      description: "Collect seeds, grow virtual gardens, and unlock achievements",
      color: "#f59e0b",
    },
    {
      icon: Heart,
      title: "Made with Love",
      description: "Carefully crafted by educators and parents who understand",
      color: "#ec4899",
    },
  ];

  const testimonials = [
    {
      quote: "My daughter wakes up excited to learn every day. The nature theme makes it feel like an adventure!",
      author: "Priya M.",
      role: "Parent of 7-year-old",
    },
    {
      quote: "Finally, an app that combines education with the beauty of nature. My son loves collecting virtual flowers!",
      author: "Rahul S.",
      role: "Parent of 5-year-old",
    },
    {
      quote: "The app controls feature gives me peace of mind. I can ensure healthy screen time habits.",
      author: "Anita K.",
      role: "Parent of 8-year-old",
    },
  ];

  return (
    <div className="min-h-screen bg-linear-to-b from-emerald-50 via-green-50 to-amber-50 overflow-hidden">
      {/* Nature Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-100/50 via-transparent to-transparent" />
        
        {/* Decorative leaves */}
        <Leaf className="absolute top-20 left-10 w-16 h-16 text-emerald-200/60 transform rotate-45" />
        <Leaf className="absolute top-40 right-20 w-12 h-12 text-green-200/60 transform -rotate-12" />
        <Leaf className="absolute bottom-40 left-1/4 w-10 h-10 text-lime-200/60 transform rotate-90" />
        <TreePine className="absolute bottom-0 left-5 w-24 h-24 text-emerald-100/40" />
        <TreePine className="absolute bottom-0 right-10 w-20 h-20 text-green-100/40" />
        
        {/* Sun rays */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-linear-to-br from-yellow-200/30 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Navigation */}
      <LandingNav variant="light" logoColor="#16a34a" buttonBg="#16a34a" />

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 md:pt-32 md:pb-24 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Content */}
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={containerVariants}
              className="space-y-6 md:space-y-8"
            >
              <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-sm font-semibold border border-emerald-200">
                <Leaf className="w-4 h-4" />
                <span>Nurture Young Minds Naturally</span>
              </motion.div>

              <motion.div variants={itemVariants}>
                <h1 className="font-heading text-4xl md:text-6xl lg:text-7xl font-extrabold text-slate-800 leading-tight">
                  Let Learning
                  <span className="block mt-2">
                    <span className="bg-linear-to-r from-emerald-600 via-green-500 to-lime-500 bg-clip-text text-transparent">
                      Blossom 🌿
                    </span>
                  </span>
                </h1>
              </motion.div>

              <motion.p variants={itemVariants} className="text-lg md:text-xl text-slate-600 leading-relaxed max-w-lg font-medium">
                Like a garden needs care, young minds need the right environment. 
                ISTA Kids creates a beautiful space where children grow through play.
              </motion.p>

              {/* CTAs */}
              <motion.div variants={itemVariants} className="flex flex-wrap gap-4">
                <a
                  href="#download"
                  className="group flex items-center gap-3 px-6 py-3 md:px-8 md:py-4 bg-linear-to-r from-emerald-600 to-green-600 text-white font-bold rounded-2xl shadow-xl shadow-emerald-500/30 hover:shadow-2xl hover:shadow-emerald-500/40 transform hover:-translate-y-1 transition-all"
                >
                  <Sprout className="w-5 h-5" />
                  <span>Plant the Seed</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </a>
                
                {!isLoaded ? (
                  <div className="w-40 h-14 bg-emerald-100 rounded-2xl animate-pulse" />
                ) : isSignedIn ? (
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-2 px-6 py-3 md:px-8 md:py-4 bg-white text-slate-700 font-bold rounded-2xl border-2 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 shadow-sm transition-all"
                  >
                    <Target className="w-5 h-5 text-emerald-600" />
                    <span>Garden View</span>
                  </Link>
                ) : (
                  <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                    <button className="flex items-center gap-2 px-6 py-3 md:px-8 md:py-4 bg-white text-slate-700 font-bold rounded-2xl border-2 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 shadow-sm transition-all cursor-pointer">
                      <Users className="w-5 h-5 text-emerald-600" />
                      <span>Parent Portal</span>
                    </button>
                  </SignInButton>
                )}
              </motion.div>

              {/* Trust Badges */}
              <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-6 pt-4">
                {["Organic Learning", "Ad-Free", "Kid-Safe"].map((badge, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                    <Flower2 className="w-4 h-4 text-pink-500" />
                    <span>{badge}</span>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* Right: Forest Scene with Mascots */}
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={heroVariants}
              className="relative flex justify-center lg:justify-end"
            >
              <div className="relative w-64 h-64 md:w-[420px] md:h-[420px]">
                {/* Background Circle - Forest Floor */}
                <div className="absolute inset-8 rounded-full bg-linear-to-br from-emerald-100 to-lime-100 shadow-inner" />
                
                {/* Grass/Ground decoration */}
                <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-3/4 h-12 bg-linear-to-t from-emerald-300/50 to-transparent rounded-full blur-sm" />
                
                {/* Sunlight effect */}
                <div className="absolute -top-10 right-0 w-32 h-32">
                  <Sun className="w-full h-full text-yellow-300/60 animate-pulse" />
                </div>
                
                {/* Mascots */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative flex items-end justify-center gap-2 pt-8">
                    <div className="relative transform hover:scale-105 transition-transform duration-300 animate-sway">
                      <Image
                        src="/mascot/female_mascot.png"
                        alt="Forest Explorer - Girl"
                        width={160}
                        height={160}
                        className="drop-shadow-xl"
                        priority
                      />
                    </div>
                    <div className="relative transform hover:scale-105 transition-transform duration-300 animate-sway-delayed">
                      <Image
                        src="/mascot/male_mascot.png"
                        alt="Forest Explorer - Boy"
                        width={180}
                        height={180}
                        className="drop-shadow-xl"
                        priority
                      />
                    </div>
                  </div>
                </div>

                {/* Floating Nature Elements */}
                <div className="absolute top-8 left-4 animate-float-leaf">
                  <div className="bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-full text-sm font-semibold text-amber-700 shadow-md">
                    🌻 +10 Seeds
                  </div>
                </div>
                <div className="absolute top-20 right-8 animate-flutter">
                  <Bird className="w-8 h-8 text-sky-400" />
                </div>
                <div className="absolute bottom-24 left-4 animate-float-leaf-delayed">
                  <div className="bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-full text-sm font-semibold text-emerald-700 shadow-md">
                    🌱 Level Up!
                  </div>
                </div>
                <div className="absolute bottom-32 right-0">
                  <Flower2 className="w-10 h-10 text-pink-400 animate-bloom" />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Organic Stats Bar */}
      <motion.section 
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="py-12 bg-linear-to-r from-emerald-600 via-green-600 to-teal-600 relative overflow-hidden"
      >
        {/* Wave Divider Top */}
        <div className="absolute top-0 left-0 right-0 w-full overflow-hidden leading-none z-20">
          <svg className="relative block w-full h-12 md:h-24" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" className="fill-amber-50"></path>
          </svg>
        </div>

        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-10 left-0 w-40 h-40 border border-white rounded-full" />
          <div className="absolute -bottom-10 right-10 w-32 h-32 border border-white rounded-full" />
        </div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10 pt-12 md:pt-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { icon: Sprout, value: "10K+", label: "Growing Learners" },
              { icon: BookOpen, value: "500+", label: "Learning Paths" },
              { icon: Trophy, value: "50K+", label: "Seeds Collected" },
              { icon: Heart, value: "98%", label: "Happy Parents" },
            ].map((stat, idx) => (
              <div key={idx} className="text-center text-white">
                <stat.icon className="w-8 h-8 mx-auto mb-2 text-lime-300" />
                <div className="text-3xl md:text-4xl font-black font-heading">{stat.value}</div>
                <div className="text-sm text-emerald-100 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Features Section */}
      <section className="py-24 px-6 relative" id="features">
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-lime-100 text-lime-700 rounded-full text-sm font-semibold mb-6 border border-lime-200">
              <Sparkles className="w-4 h-4" />
              <span>Natural Learning</span>
            </div>
            <h2 className="font-heading text-4xl md:text-5xl font-extrabold text-slate-800 mb-4">
              Features That <span className="text-emerald-600">Flourish</span>
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Organic, wholesome learning experiences designed with nature's wisdom
            </p>
          </motion.div>

          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={containerVariants}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                className="group bg-white/80 backdrop-blur rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-100 hover:border-emerald-200"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transform group-hover:scale-110 group-hover:rotate-6 transition-transform"
                  style={{ backgroundColor: `${feature.color}15` }}
                >
                  <feature.icon className="w-7 h-7" style={{ color: feature.color }} />
                </div>
                <h3 className="font-heading text-xl font-bold text-slate-800 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-linear-to-br from-emerald-50 to-green-100 relative overflow-hidden">
        {/* Wave Divider Top */}
        <div className="absolute top-0 left-0 right-0 w-full overflow-hidden leading-none z-20 transform rotate-180">
           <svg className="relative block w-full h-12 md:h-16" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z" className="fill-white"></path>
          </svg>
        </div>

        <div className="absolute inset-0 opacity-30">
          <TreePine className="absolute bottom-0 left-10 w-40 h-40 text-emerald-200" />
          <TreePine className="absolute bottom-0 right-20 w-32 h-32 text-green-200" />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="font-heading text-4xl md:text-5xl font-extrabold text-slate-800 mb-4">
              Voices from the <span className="text-emerald-600">Garden</span>
            </h2>
            <p className="text-lg text-slate-600">
              Hear what other parents have to say about their journey
            </p>
          </motion.div>

          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={containerVariants}
            className="grid md:grid-cols-3 gap-8"
          >
            {testimonials.map((testimonial, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                className="bg-white rounded-3xl p-8 shadow-xl border border-emerald-100"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-slate-700 leading-relaxed mb-6 italic">
                  "{testimonial.quote}"
                </p>
                <div className="border-t border-emerald-100 pt-4">
                  <div className="font-bold text-slate-800">{testimonial.author}</div>
                  <div className="text-sm text-emerald-600">{testimonial.role}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Download Section */}
      <DownloadSection variant="light" accentColor="#16a34a" />

      {/* Footer */}
      <LandingFooter variant="light" accentColor="#16a34a" />

      {/* Custom Animations */}
      <style jsx global>{`
        @keyframes sway {
          0%, 100% { transform: rotate(-2deg); }
          50% { transform: rotate(2deg); }
        }
        @keyframes float-leaf {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(5deg); }
        }
        @keyframes flutter {
          0%, 100% { transform: translateX(0) translateY(0); }
          25% { transform: translateX(5px) translateY(-5px); }
          50% { transform: translateX(10px) translateY(0); }
          75% { transform: translateX(5px) translateY(5px); }
        }
        @keyframes bloom {
          0%, 100% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.1) rotate(10deg); }
        }
        .animate-sway {
          animation: sway 4s ease-in-out infinite;
        }
        .animate-sway-delayed {
          animation: sway 4s ease-in-out infinite;
          animation-delay: 0.5s;
        }
        .animate-float-leaf {
          animation: float-leaf 3s ease-in-out infinite;
        }
        .animate-float-leaf-delayed {
          animation: float-leaf 3s ease-in-out infinite;
          animation-delay: 1s;
        }
        .animate-flutter {
          animation: flutter 3s ease-in-out infinite;
        }
        .animate-bloom {
          animation: bloom 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

// Add Star icon import for testimonials
function Star(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" />
    </svg>
  );
}
