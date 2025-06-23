import { useEffect } from "preact/hooks";
import SearchBar from "./SearchBar.tsx";
import ReviewAnalysis from "./ReviewAnalysis.tsx";
import { analyzeUserSignal, showAnalysisSignal } from "../utils/signals.ts";

export default function AppWrapper() {
  useEffect(() => {
    console.log("🏠 AppWrapper: Setting up signal watchers");
    
    // Watch for signal changes
    const unsubscribe = analyzeUserSignal.subscribe((user) => {
      console.log("🏠 AppWrapper: analyzeUserSignal changed:", user);
      if (user) {
        console.log("🏠 AppWrapper: User selected for analysis:", user);
      }
    });

    return unsubscribe;
  }, []);

  const handleBackToSearch = () => {
    console.log("🏠 AppWrapper: Resetting analysis signals");
    showAnalysisSignal.value = false;
    analyzeUserSignal.value = null;
  };

  return (
    <div>
      {/* Conditional rendering: Show either analysis or search+features */}
      {showAnalysisSignal.value && analyzeUserSignal.value ? (
        <ReviewAnalysis 
          selectedUser={analyzeUserSignal.value}
          onClose={handleBackToSearch}
        />
      ) : (
        <>
          {/* Search Section */}
          <div class="bg-gray-800 rounded-2xl shadow-lg p-8 mb-8 border border-gray-700">
            <div class="text-center mb-6">
              <h2 class="text-2xl font-semibold text-white mb-2">
                Search Ethos Profile
              </h2>
              <p class="text-gray-300">
                Enter a username or profile to get started
              </p>
            </div>
            
            <SearchBar />
          </div>

          {/* Features Preview - Only show when not analyzing */}
          <div class="grid md:grid-cols-2 gap-6">
            <div class="bg-gray-800 rounded-xl shadow-md p-6 border border-gray-700">
              <div class="flex items-center mb-4">
                <div class="w-12 h-12 bg-blue-900 rounded-lg flex items-center justify-center mr-4">
                  <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                  </svg>
                </div>
                <h3 class="text-lg font-semibold text-white">Review Analysis</h3>
              </div>
              <p class="text-gray-300">
                View comprehensive statistics of reviews given and received by any user
              </p>
            </div>

            <div class="bg-gray-800 rounded-xl shadow-md p-6 border border-gray-700">
              <div class="flex items-center mb-4">
                <div class="w-12 h-12 bg-green-900 rounded-lg flex items-center justify-center mr-4">
                  <svg class="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <h3 class="text-lg font-semibold text-white">Reciprocal Reviews</h3>
              </div>
              <p class="text-gray-300">
                Identify "Review 4 Review" patterns and mutual review relationships
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 