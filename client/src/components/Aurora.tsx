import { motion } from "framer-motion";

const Aurora = () => (
  <div className="pointer-events-none fixed inset-0 w-screen h-screen overflow-hidden">
    {/* Top-left source */}
    <motion.div
      className="absolute -top-24 -left-24 h-72 w-72 rounded-full blur-3xl
      bg-gradient-to-tr from-indigo-500/40 via-fuchsia-500/30 to-cyan-400/40
      dark:from-indigo-600/40 dark:via-fuchsia-600/40 dark:to-cyan-500/40"
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 60, ease: "linear" }}
    />

    {/* Bottom-right source */}
    <motion.div
      className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full blur-3xl
      bg-gradient-to-tr from-emerald-400/30 via-sky-400/30 to-purple-400/30
      dark:from-emerald-500/30 dark:via-sky-500/30 dark:to-purple-500/30"
      animate={{ rotate: -360 }}
      transition={{ repeat: Infinity, duration: 80, ease: "linear" }}
    />

    {/* Top-right source */}
    <motion.div
      className="absolute -top-28 -right-28 h-72 w-72 rounded-full blur-3xl
      bg-gradient-to-bl from-cyan-400/35 via-blue-500/25 to-fuchsia-400/30
      dark:from-cyan-500/35 dark:via-blue-600/25 dark:to-fuchsia-500/30"
      animate={{ rotate: 200 }}
      transition={{ repeat: Infinity, duration: 90, ease: "linear" }}
    />

    {/* Bottom-left source */}
    <motion.div
      className="absolute -bottom-28 -left-28 h-80 w-80 rounded-full blur-3xl
      bg-gradient-to-tr from-pink-400/30 via-indigo-400/25 to-sky-400/30
      dark:from-pink-500/30 dark:via-indigo-500/25 dark:to-sky-500/30"
      animate={{ rotate: -220 }}
      transition={{ repeat: Infinity, duration: 100, ease: "linear" }}
    />
  </div>
);

export default Aurora;
