import { useSignal, useComputed } from "@preact/signals";
import { useEffect } from "preact/hooks";
import { Button } from "../components/Button.tsx";
import { analyzeUserSignal, showAnalysisSignal } from "../utils/signals.ts";

// TypeScript interfaces for Ethos API
interface EthosUser {
  userkey: string;
  avatar: string;
  name: string;
  username: string;
  description: string;
  score: number;
  scoreXpMultiplier: number;
  profileId?: number;
  primaryAddress?: string;
}

interface EthosSearchResponse {
  ok: boolean;
  data?: {
    values: EthosUser[];
    limit: number;
    offset: number;
    total: number;
  };
  error?: string;
}

interface SearchBarProps {
  onAnalyze?: (user: EthosUser) => void;
}

export default function SearchBar({ onAnalyze }: SearchBarProps) {
  const searchTerm = useSignal("");
  const searchResults = useSignal<EthosUser[]>([]);
  const selectedUser = useSignal<EthosUser | null>(null);
  const isSearching = useSignal(false);
  const showDropdown = useSignal(false);
  const isLoading = useSignal(false);

  // Debounced search function
  let searchTimeout: number | null = null;

  const performSearch = async (query: string) => {
    if (query.length < 2) {
      searchResults.value = [];
      showDropdown.value = false;
      return;
    }

    isLoading.value = true;

    try {
      const response = await fetch(`/api/ethos-search?query=${encodeURIComponent(query)}&limit=8`);
      const data: EthosSearchResponse = await response.json();

      if (data.ok && data.data) {
        searchResults.value = data.data.values;
        showDropdown.value = data.data.values.length > 0;
      } else {
        searchResults.value = [];
        showDropdown.value = false;
      }
    } catch (error) {
      console.error("Search error:", error);
      searchResults.value = [];
      showDropdown.value = false;
    } finally {
      isLoading.value = false;
    }
  };

  const handleInputChange = (value: string) => {
    searchTerm.value = value;
    selectedUser.value = null; // Clear selection when user types

    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Debounce search by 300ms
    searchTimeout = setTimeout(() => {
      performSearch(value);
    }, 300);
  };

  const selectUser = (user: EthosUser) => {
    selectedUser.value = user;
    searchTerm.value = user.name;
    showDropdown.value = false;
    searchResults.value = [];
  };

  const handleSearch = () => {
    console.log("🔍 SearchBar: handleSearch called");
    console.log("🔍 SearchBar: selectedUser.value:", selectedUser.value);
    
    if (!selectedUser.value) {
      console.log("❌ SearchBar: No selected user, returning");
      return;
    }
    
    console.log("🔍 SearchBar: Setting isSearching to true");
    isSearching.value = true;
    
    // Use shared signal instead of prop
    setTimeout(() => {
      console.log(`🔍 SearchBar: Analyzing user: ${selectedUser.value?.name} (${selectedUser.value?.username})`);
      console.log("🔍 SearchBar: Setting analyzeUserSignal");
      
      if (selectedUser.value) {
        console.log("✅ SearchBar: Setting signals for analysis");
        analyzeUserSignal.value = selectedUser.value;
        showAnalysisSignal.value = true;
      } else {
        console.log("❌ SearchBar: Cannot analyze - no selected user");
      }
      
      console.log("🔍 SearchBar: Setting isSearching to false");
      isSearching.value = false;
    }, 500);
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && selectedUser.value) {
      handleSearch();
    } else if (e.key === 'Escape') {
      showDropdown.value = false;
    }
  };

  const handleFocus = () => {
    if (searchResults.value.length > 0 && !selectedUser.value) {
      showDropdown.value = true;
    }
  };

  const handleBlur = () => {
    // Delay hiding dropdown to allow clicking on results
    setTimeout(() => {
      showDropdown.value = false;
    }, 200);
  };

  // Compute if search button should be enabled
  const canSearch = useComputed(() => selectedUser.value !== null && !isSearching.value);

  // Watch for analysis start and reset dropdown
  useEffect(() => {
    console.log("🔍 SearchBar: Setting up analysis watcher");
    
    const unsubscribe = showAnalysisSignal.subscribe((isAnalyzing) => {
      console.log("🔍 SearchBar: Analysis signal changed:", isAnalyzing);
      if (isAnalyzing) {
        console.log("🔍 SearchBar: Analysis started, clearing dropdown state");
        showDropdown.value = false;
        searchResults.value = [];
        // Keep the selected user and search term for reference
      }
    });

    return unsubscribe;
  }, []);

  const handleAnalyze = () => {
    if (selectedUser.value) {
      // Navigate to the profile page instead of using signals
      window.location.href = `/profile/${selectedUser.value.username}`;
    }
  };

  return (
    <div class="max-w-2xl mx-auto relative">
      <div class="flex flex-col sm:flex-row gap-4">
        <div class="flex-1 relative">
          <input
            type="text"
            placeholder="Start typing to search Ethos profiles..."
            value={searchTerm.value}
            onInput={(e) => handleInputChange((e.target as HTMLInputElement).value)}
            onKeyPress={handleKeyPress}
            onFocus={handleFocus}
            onBlur={handleBlur}
            class={`w-full px-4 py-3 text-lg border-2 rounded-lg focus:outline-none focus:ring-2 transition-colors bg-gray-700 text-white ${
              selectedUser.value 
                ? "border-green-500 focus:border-green-500 focus:ring-green-500/30 bg-green-900/30" 
                : "border-gray-600 focus:border-blue-500 focus:ring-blue-500/30"
            }`}
            disabled={isSearching.value}
          />
          
          {/* Loading indicator */}
          {isLoading.value && (
            <div class="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            </div>
          )}

          {/* Dropdown Results */}
          {showDropdown.value && searchResults.value.length > 0 && (
            <div class="absolute top-full left-0 right-0 bg-gray-800 border-2 border-gray-600 rounded-lg shadow-lg mt-1 max-h-80 overflow-y-auto z-10">
              {searchResults.value.map((user, index) => (
                <div
                  key={user.userkey}
                  class="flex items-center p-3 hover:bg-gray-700 cursor-pointer border-b border-gray-600 last:border-b-0"
                  onClick={() => selectUser(user)}
                >
                  {/* Avatar */}
                  <img
                    src={user.avatar || "/default-avatar.png"}
                    alt={`${user.name} avatar`}
                    class="w-12 h-12 rounded-full mr-3 bg-gray-600"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`;
                    }}
                  />
                  
                  {/* User Info */}
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between">
                      <h3 class="font-semibold text-white truncate">{user.name}</h3>
                      <div class="flex items-center ml-2">
                        <div class="flex items-center px-2 py-1 bg-blue-900 rounded-full">
                          <svg class="w-3 h-3 text-blue-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span class="text-sm font-bold text-blue-400">{user.score}</span>
                        </div>
                      </div>
                    </div>
                    <p class="text-sm text-gray-300 truncate">@{user.username}</p>
                    {user.description && (
                      <p class="text-xs text-gray-400 truncate mt-1">{user.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No results message */}
          {showDropdown.value && searchResults.value.length === 0 && searchTerm.value.length >= 2 && !isLoading.value && (
            <div class="absolute top-full left-0 right-0 bg-gray-800 border-2 border-gray-600 rounded-lg shadow-lg mt-1 p-4 text-center text-gray-400">
              No profiles found for "{searchTerm.value}"
            </div>
          )}
        </div>
        
        <Button
          onClick={handleAnalyze}
          disabled={!selectedUser.value}
          class="px-8 py-3 text-lg font-semibold"
        >
          Analyze Profile
        </Button>
      </div>
      
      {/* Selected user confirmation */}
      {selectedUser.value && (
        <div class="mt-4 p-3 bg-green-900/30 border border-green-500/50 rounded-lg">
          <div class="flex items-center">
            <svg class="w-5 h-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
            <span class="text-green-300">
              Selected: <strong>{selectedUser.value.name}</strong> (@{selectedUser.value.username}) - Score: {selectedUser.value.score}
            </span>
          </div>
        </div>
      )}
      
      {/* Search suggestions/hints */}
      <div class="mt-4 text-sm text-gray-400 text-center">
        <p>
          Start typing to search for Ethos profiles. Select a profile from the dropdown to analyze their reviews.
        </p>
      </div>
    </div>
  );
} 