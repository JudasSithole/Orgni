import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, VideoOff } from "lucide-react";

export function VideoSection() {
  const [unavailable, setUnavailable] = useState(false);

  return (
    <section className="py-24 md:py-32 px-6 md:px-12 bg-background text-foreground border-t border-border">
      <div className="max-w-[1600px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-start mb-16"
        >
          <div className="lg:col-span-5">
            <h2 className="text-4xl md:text-5xl font-bold leading-[1.1] tracking-tight">
              The vision for organisational intelligence.
            </h2>
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <p className="text-xl md:text-2xl font-medium text-muted-foreground leading-relaxed">
              See how connected data changes the way businesses execute.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative w-full aspect-video bg-muted border border-border rounded-xl overflow-hidden shadow-xl group"
        >
          {/* Poster */}
          <img
            src="/orgni-product-ui.png"
            alt="Preview of the Orgni product interface"
            className="absolute inset-0 w-full h-full object-cover opacity-90"
          />
          {/* Dark scrim */}
          <div className="absolute inset-0 bg-black/40" />

          <AnimatePresence mode="wait">
            {!unavailable ? (
              <motion.button
                key="play"
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                onClick={() => setUnavailable(true)}
                className="absolute inset-0 flex flex-col items-center justify-center gap-4 cursor-pointer"
                aria-label="Play video"
              >
                <span className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-primary flex items-center justify-center shadow-[0_0_40px_rgba(254,81,1,0.4)] transition-transform duration-300 group-hover:scale-110">
                  <Play className="w-8 h-8 md:w-10 md:h-10 text-primary-foreground ml-1" fill="currentColor" />
                </span>
                <span className="text-sm md:text-base font-semibold text-white/90 tracking-wide">
                  Watch the vision
                </span>
              </motion.button>
            ) : (
              <motion.div
                key="unavailable"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25 }}
                className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm"
              >
                <div className="text-center px-6">
                  <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                    <VideoOff className="w-6 h-6 text-white/70" />
                  </div>
                  <p className="text-xl md:text-2xl font-bold text-white mb-2">
                    This video isn&apos;t available yet.
                  </p>
                  <p className="text-sm md:text-base text-white/60 font-medium mb-6">
                    We&apos;re putting the finishing touches on it. Check back soon.
                  </p>
                  <button
                    onClick={() => setUnavailable(false)}
                    className="text-sm font-semibold text-white/80 hover:text-white underline underline-offset-4 transition-colors"
                  >
                    Back
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
