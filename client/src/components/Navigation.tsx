import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FileText,
  Presentation,
  ScrollText,
  GraduationCap,
  Upload,
  BarChart3,
  Bookmark,
  Menu,
  X,
  Users2,
  MessageSquare,
  Bell,
  User,
  Settings,
  LogOut,
  ChevronDown,
  MoreHorizontal,
  Loader2,
  Sun,
  Moon,
  Laptop2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import ThemeToggleGlide from "@/components/ThemeToggleGlide";

const navItems = [
  { name: "Home", href: "/", icon: GraduationCap },
  { name: "Notes", href: "/notes", icon: FileText },
  { name: "PPTs", href: "/ppts", icon: Presentation },
  { name: "Past Papers", href: "/past-papers", icon: ScrollText },
  { name: "Tutorials", href: "/tutorials", icon: Upload },
  { name: "Classmates", href: "/classmates", icon: Users2 },
  { name: "Mock Tests", href: "/mock-tests", icon: BarChart3 },
  { name: "Community", href: "/community", icon: MessageSquare },
  { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { name: "My Library", href: "/library", icon: Bookmark },
  { name: "Notifications", href: "/notifications", icon: Bell },
];

/* Segmented theme toggle */
function ThemeSegmented() {
  const { mode, setMode } = useTheme();
  const options = [
    { key: "light", icon: Sun, label: "Light" },
    { key: "system", icon: Laptop2, label: "System" },
    { key: "dark", icon: Moon, label: "Dark" },
  ] as const;

  const activeIndex = options.findIndex((o) => o.key === mode);
  return (
    <div
      className="relative rounded-full border px-1 py-1 border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-sm"
      role="tablist"
      aria-label="Theme"
    >
      {/* slider */}
      <motion.span
        layout
        className="absolute top-1 bottom-1 rounded-full bg-[hsl(var(--muted))]"
        initial={false}
        transition={{ type: "spring", stiffness: 500, damping: 34 }}
        style={{
          left: `calc(${activeIndex} * (2.25rem + 0.25rem) + 0.25rem)`,
          width: "2.25rem",
        }}
        aria-hidden
      />
      <div className="relative flex gap-1">
        {options.map((opt, i) => {
          const Icon = opt.icon;
          const selected = opt.key === mode;
          return (
            <button
              key={opt.key}
              role="tab"
              aria-selected={selected}
              onClick={() => setMode(opt.key)}
              className={cn(
                "relative z-10 inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                selected
                  ? "text-[hsl(var(--foreground))]"
                  : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              )}
              title={opt.label}
              aria-label={opt.label}
            >
              <Icon className="w-4.5 h-4.5" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const moreRef = useRef<HTMLDivElement | null>(null);
  const userRef = useRef<HTMLDivElement | null>(null);

  const { logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch user profile
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/me/`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Token ${token}` : "",
          },
        });
        if (res.ok) {
          const data = await res.json();
          setUserData(data.user ?? data);
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setMoreOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const primary = navItems.slice(0, 5);
  const more = navItems.slice(5);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await new Promise((r) => setTimeout(r, 1600));
      await logout();
      setUserMenuOpen(false);
      setIsMobileMenuOpen(false);
      navigate("/login");
    } finally {
      setLoggingOut(false);
    }
  };

  const initials = userData
    ? `${userData.first_name?.[0] || ""}${userData.last_name?.[0] || ""}`.toUpperCase()
    : "RF";

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "backdrop-blur-md bg-[hsl(var(--card)/0.72)] border-b border-[hsl(var(--border))]"
          : "bg-transparent"
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm bg-gradient-to-br from-indigo-600 to-sky-400">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-semibold bg-gradient-to-r from-indigo-600 to-sky-400 bg-clip-text text-transparent">
              ResourceFinder
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-4 flex-1 justify-center">
            <ul className="flex items-center gap-2">
              {primary.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <li key={item.name}>
                    <Link to={item.href}>
                      <Button
                        variant={isActive ? "default" : "ghost"}
                        size="sm"
                        className={cn(
                          "flex items-center gap-2 font-medium px-3",
                          isActive
                            ? "bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.2)]"
                            : "hover:bg-[hsl(var(--muted))]"
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.name}</span>
                      </Button>
                    </Link>
                  </li>
                );
              })}

              {/* More dropdown */}
              <li ref={moreRef} className="relative">
                <Button
                  variant={moreOpen ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setMoreOpen((s) => !s)}
                  className="flex items-center gap-2 px-3"
                  aria-expanded={moreOpen}
                >
                  <MoreHorizontal className="w-4 h-4" />
                  <span>More</span>
                  <ChevronDown className="w-4 h-4" />
                </Button>

                {moreOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute right-0 mt-2 w-56 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--popover))] text-[hsl(var(--popover-foreground))] shadow-lg"
                  >
                    <div className="py-1">
                      {more.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.href;
                        return (
                          <Link key={item.name} to={item.href}>
                            <div
                              className={cn(
                                "w-full px-4 py-2 flex items-center gap-3 text-sm cursor-pointer transition-colors",
                                isActive
                                  ? "bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))]"
                                  : "hover:bg-[hsl(var(--muted))]"
                              )}
                            >
                              <Icon className="w-4 h-4" />
                              <span>{item.name}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </li>
            </ul>
          </div>

          {/* Right actions (desktop) */}
          <div className="hidden md:flex items-center gap-2">
            {/* Theme toggle */}
            <ThemeToggleGlide />

            {/* Notifications */}
            <Link to="/notifications">
              <Button variant="ghost" size="icon" aria-label="Notifications" className="hover:bg-[hsl(var(--muted))]">
                <Bell className="w-5 h-5" />
              </Button>
            </Link>

            {/* Messages */}
            <Button variant="ghost" size="icon" aria-label="Messages" className="hover:bg-[hsl(var(--muted))]">
              <MessageSquare className="w-5 h-5" />
            </Button>

            {/* User avatar + dropdown */}
            <div ref={userRef} className="relative">
              <Button
                variant={userMenuOpen ? "default" : "ghost"}
                size="sm"
                onClick={() => setUserMenuOpen((s) => !s)}
                className="flex items-center gap-2 px-3"
                aria-expanded={userMenuOpen}
              >
                {userData?.profile_pic ? (
                  <img
                    src={userData.profile_pic?.file_url}
                    alt="avatar"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center text-sm font-semibold">
                    {initials}
                  </div>
                )}
                <ChevronDown className="w-4 h-4" />
              </Button>

              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute right-0 mt-2 w-48 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--popover))] text-[hsl(var(--popover-foreground))] shadow-lg"
                >
                  <div className="py-1">
                    <Link to="/profile">
                      <div className="w-full px-4 py-2 flex items-center gap-3 text-sm hover:bg-[hsl(var(--muted))]">
                        <User className="w-4 h-4" />
                        <span>{userData?.first_name ? `${userData.first_name} ${userData.last_name || ""}` : "Profile"}</span>
                      </div>
                    </Link>
                    <Link to="/settings">
                      <div className="w-full px-4 py-2 flex items-center gap-3 text-sm hover:bg-[hsl(var(--muted))]">
                        <Settings className="w-4 h-4" />
                        <span>Settings</span>
                      </div>
                    </Link>
                    <div className="border-t my-1" />
                    <button
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="w-full px-4 py-2 flex items-center gap-3 text-sm text-left hover:bg-[hsl(var(--muted))] disabled:opacity-60"
                    >
                      {loggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                      <span>{loggingOut ? "Logging out..." : "Log out"}</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen((s) => !s)}
              aria-expanded={isMobileMenuOpen}
              aria-label="Toggle navigation"
              className="hover:bg-[hsl(var(--muted))]"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))]"
          >
            <div className="py-4 space-y-2 px-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link key={item.name} to={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      className={cn(
                        "w-full justify-start gap-3",
                        isActive ? "bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))]" : "hover:bg-[hsl(var(--muted))]"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </Button>
                  </Link>
                );
              })}

              {/* Theme toggle inside mobile menu */}
              <div className="flex items-center justify-between pt-3">
                <div>
                  <div className="text-sm font-medium">Theme</div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">Light / Dark</div>
                </div>
                <ThemeToggleGlide />
              </div>

              <div className="pt-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-start gap-2 sm:gap-4">
                  <Link to="/profile" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button className="w-full sm:w-auto px-6 py-2 rounded-xl shadow-sm hover:shadow-md transition">
                      Profile
                    </Button>
                  </Link>

                  <Link to="/settings" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button className="w-full sm:w-auto px-6 py-2 rounded-xl shadow-sm hover:shadow-md transition">
                      Settings
                    </Button>
                  </Link>

                  <Button
                    className="w-full sm:w-auto px-6 py-2 rounded-xl shadow-sm hover:shadow-md transition"
                    onClick={handleLogout}
                    disabled={loggingOut}
                  >
                    {loggingOut ? "Logging out..." : "Log out"}
                  </Button>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </div>
    </motion.nav>
  );
};
