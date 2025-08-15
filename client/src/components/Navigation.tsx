import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

export const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();

  const moreRef = useRef<HTMLDivElement | null>(null);
  const userRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close menus on navigation
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setMoreOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  // Click outside to close dropdowns
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // split nav into primary and more
  const primary = navItems.slice(0, 5);
  const more = navItems.slice(5);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled ? "glass border-b" : "bg-transparent"
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-2xl flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              ResourceFinder
            </span>
          </Link>

          {/* Desktop Menu Bar - visible on md+ */}
          <div className="hidden md:flex items-center space-x-4 flex-1 justify-center">
            <ul className="flex items-center space-x-2">
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
                          "flex items-center space-x-2 font-medium px-3",
                          isActive && "bg-primary/10 text-primary hover:bg-primary/20"
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.name}</span>
                      </Button>
                    </Link>
                  </li>
                );
              })}

              {/* More dropdown for the rest of items */}
              <li ref={moreRef} className="relative">
                <Button
                  variant={moreOpen ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setMoreOpen(!moreOpen)}
                  className="flex items-center space-x-2 px-3"
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
                    className="absolute right-0 mt-2 w-56 bg-white dark:bg-surface-800 rounded-lg shadow-lg border overflow-hidden"
                  >
                    <div className="py-2">
                      {more.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.href;
                        return (
                          <Link key={item.name} to={item.href}>
                            <button
                              className={cn(
                                "w-full px-4 py-2 flex items-center space-x-3 text-sm text-left hover:bg-muted",
                                isActive && "bg-primary/10 text-primary"
                              )}
                            >
                              <Icon className="w-4 h-4" />
                              <span>{item.name}</span>
                            </button>
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
          <div className="hidden md:flex items-center space-x-2">
            {/* Notifications */}
            <Link to="/notifications">
            <Button variant="ghost" size="icon" aria-label="Notifications">
              <Bell className="w-5 h-5" />
            </Button>
            </Link>
            {/* Messages (optional) */}
            <Button variant="ghost" size="icon" aria-label="Messages">
              <MessageSquare className="w-5 h-5" />
            </Button>

            {/* User avatar + dropdown */}
            <div ref={userRef} className="relative">
              <Button
                variant={userMenuOpen ? "default" : "ghost"}
                size="sm"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-2 px-3"
                aria-expanded={userMenuOpen}
              >
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">
                  RF
                </div>
                <ChevronDown className="w-4 h-4" />
              </Button>

              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute right-0 mt-2 w-44 bg-white dark:bg-surface-800 rounded-lg shadow-lg border overflow-hidden"
                >
                  <div className="py-2">
                    <Link to="/profile">
                      <button className="w-full px-4 py-2 flex items-center space-x-3 text-sm text-left hover:bg-muted">
                        <User className="w-4 h-4" />
                        <span>Profile</span>
                      </button>
                    </Link>
                    <Link to="/settings">
                      <button className="w-full px-4 py-2 flex items-center space-x-3 text-sm text-left hover:bg-muted">
                        <Settings className="w-4 h-4" />
                        <span>Settings</span>
                      </button>
                    </Link>
                    <div className="border-t my-1" />
                    <button
                      onClick={() => {
                        // TODO: wire up real logout
                        console.log("logout");
                      }}
                      className="w-full px-4 py-2 flex items-center space-x-3 text-sm text-left hover:bg-muted"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log out</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden" />
          </div>

          {/* Mobile Menu Button - visible on small */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
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
            className="md:hidden border-t glass"
          >
            <div className="py-4 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;

                return (
                  <Link key={item.name} to={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      className={cn(
                        "w-full justify-start space-x-3",
                        isActive && "bg-primary/10 text-primary"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </Button>
                  </Link>
                );
              })}

              {/* Quick user actions in mobile menu */}
              <div className="px-4 pt-2">
                <Link to="/profile" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button className="w-full justify-start">Profile</Button>
                </Link>
                <Link to="/settings" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button className="w-full justify-start">Settings</Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.nav>
  );
};
