import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, FileText, Presentation, ScrollText, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Map type to icon
const getIcon = (type: string) => {
  switch (type) {
    case "notes": return FileText;
    case "ppt": return Presentation;
    case "paper": return ScrollText;
    default: return FileText;
  }
};

interface SearchBarProps {
  placeholder?: string;
  className?: string;
  size?: "default" | "lg";
}

interface SearchResult {
  id: string;
  title: string;
  type: string;
  subject: string | null;
  semester: string | null;
  preview: string;
  first_file_url?: string | null;
  first_mime_type?: string | null;
}

export const SearchBar = ({ 
  placeholder = "Search for notes, presentations, papers...", 
  className,
  size = "default" 
}: SearchBarProps) => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const storedToken = localStorage.getItem("token") || sessionStorage.getItem("token");

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setIsOpen(false);
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/resources/search?q=${encodeURIComponent(query)}&limit=8`, {
          headers: {
          'Authorization': `Token ${storedToken}`,
          }
        });
        if (!res.ok) throw new Error("Failed to fetch search results");
        const data: SearchResult[] = await res.json();
        setResults(data);
        setIsOpen(true);
      } catch (err) {
        console.error(err);
        setError("Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms debounce

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, storedToken]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  return (
    <div ref={searchRef} className={cn("relative w-full max-w-2xl", className)}>
      <div className="relative">
        <Search className={cn(
          "absolute left-4 text-muted-foreground",
          size === "lg" ? "top-6 w-6 h-6" : "top-4 w-5 h-5"
        )} />
        <div className="relative p-0.5 rounded-3xl overflow-hidden animated-border">
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onFocus={() => query.length > 0 && setIsOpen(true)}
          className={cn(
            "pl-12 pr-4 glass border-black/20 text-foreground placeholder:text-muted-foreground bg-white/10 backdrop-blur-xl",
            size === "lg" ? "h-16 text-lg rounded-3xl" : "h-14 rounded-2xl"
          )}
        />
        </div>
      </div>

      {/* Search Results Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-2 glass border border-white/20 rounded-2xl shadow-strong backdrop-blur-xl z-50 max-h-96 overflow-y-auto"
          >
            <div className="p-2">
              {loading && (
                <div className="p-8 text-center text-muted-foreground">
                  <Search className="w-6 h-6 mx-auto mb-2 animate-spin" />
                  <p>Searching...</p>
                </div>
              )}

              {!loading && error && (
                <div className="p-8 text-center text-red-500">
                  <p>{error}</p>
                </div>
              )}

              {!loading && !error && results.length > 0 && results.map((result, index) => {
                const Icon = getIcon(result.type);
                return (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group"
                  >
                    <Button
                      variant="ghost"
                      className="w-full p-4 h-auto justify-start text-left hover:bg-white/10 rounded-xl"
                      onClick={() => {
                        setIsOpen(false);
                        setQuery("");
                        // maybe navigate or open resource here
                        if (result.first_file_url) {
                          window.open(result.first_file_url, "_blank");
                        }
                      }}
                    >
                      <div className="flex items-start space-x-3 w-full">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-foreground truncate">
                              {result.title}
                            </h3>
                            <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          {result.subject && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {result.subject}{result.semester ? ` • ${result.semester} Semester` : ""}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {result.preview}
                          </p>
                        </div>
                      </div>
                    </Button>
                  </motion.div>
                );
              })}

              {!loading && !error && results.length === 0 && query.length > 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No results found for "{query}"</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
