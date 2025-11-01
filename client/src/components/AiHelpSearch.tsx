import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { Search, Loader2, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface SearchResult {
  name: string;
  path: string;
  description: string;
}

export function AiHelpSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout>();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search function
  useEffect(() => {
    if (query.trim().length === 0) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new timer
    debounceTimer.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await apiRequest('POST', '/api/search/help', { query });
        const data = await response.json();
        setResults(data.results || []);
        setShowDropdown(true);
      } catch (error) {
        console.error('Search error:', error);
        toast({
          title: 'Search failed',
          description: 'Could not complete search. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsSearching(false);
      }
    }, 500); // Wait 500ms after user stops typing

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query, toast]);

  const handleResultClick = (path: string) => {
    navigate(path);
    setQuery('');
    setResults([]);
    setShowDropdown(false);
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search for help... (try: messages, schedule, settings)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 pr-10"
          data-testid="input-ai-search"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Dropdown results */}
      {showDropdown && results.length > 0 && (
        <Card className="absolute top-full mt-2 w-full z-50 shadow-lg max-h-96 overflow-auto bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <div className="p-3">
            {results.map((result, index) => (
              <button
                key={index}
                onClick={() => handleResultClick(result.path)}
                className="w-full text-left p-4 rounded-md hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors flex items-start gap-3 group border-b border-gray-100 dark:border-gray-700 last:border-0"
                data-testid={`search-result-${index}`}
              >
                <div className="flex-1">
                  <div className="font-semibold text-base flex items-center gap-2 text-gray-900 dark:text-white">
                    {result.name}
                    <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300 mt-1.5 leading-relaxed">
                    {result.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* No results message */}
      {showDropdown && !isSearching && query.trim().length > 0 && results.length === 0 && (
        <Card className="absolute top-full mt-2 w-full z-50 shadow-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <div className="p-4 text-center text-sm text-gray-600 dark:text-gray-300">
            No results found. Try different keywords.
          </div>
        </Card>
      )}
    </div>
  );
}
