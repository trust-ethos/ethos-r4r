import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import ReviewAnalysis from "./ReviewAnalysis.tsx";

interface ProfileData {
  userkey: string;
  name: string;
  username: string;
  avatar: string;
  score: number;
}

interface ProfileAnalysisPageProps {
  xhandle: string;
}

export default function ProfileAnalysisPage({ xhandle }: ProfileAnalysisPageProps) {
  const profileData = useSignal<ProfileData | null>(null);
  const isLoading = useSignal(true);
  const error = useSignal<string | null>(null);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        isLoading.value = true;
        error.value = null;

        console.log(`Searching for user: ${xhandle}`);

        // Search for the user by their xhandle with a higher limit
        const searchResponse = await fetch(`/api/ethos-search?query=${encodeURIComponent(xhandle)}&limit=10`);
        
        if (!searchResponse.ok) {
          throw new Error("Failed to search for user");
        }

        const searchData = await searchResponse.json();
        console.log("Search response:", searchData);
        
        if (!searchData.ok || !searchData.data || !searchData.data.values || searchData.data.values.length === 0) {
          // Try searching without @ symbol if it was included
          const cleanHandle = xhandle.startsWith('@') ? xhandle.slice(1) : xhandle;
          if (cleanHandle !== xhandle) {
            console.log(`Retrying search without @ symbol: ${cleanHandle}`);
            const retryResponse = await fetch(`/api/ethos-search?query=${encodeURIComponent(cleanHandle)}&limit=10`);
            const retryData = await retryResponse.json();
            
            if (retryData.ok && retryData.data && retryData.data.values && retryData.data.values.length > 0) {
              searchData.data = retryData.data;
            } else {
              throw new Error(`User "${xhandle}" not found. Try searching from the homepage to find the correct username.`);
            }
          } else {
            throw new Error(`User "${xhandle}" not found. Try searching from the homepage to find the correct username.`);
          }
        }

        // Find exact match by username (case insensitive)
        let user = searchData.data.values.find((u: any) => 
          u.username.toLowerCase() === xhandle.toLowerCase()
        );

        // If no exact match, try partial match
        if (!user) {
          user = searchData.data.values.find((u: any) => 
            u.username.toLowerCase().includes(xhandle.toLowerCase()) ||
            u.name.toLowerCase().includes(xhandle.toLowerCase())
          );
        }

        // Fallback to first result if still no match
        if (!user) {
          user = searchData.data.values[0];
        }

        console.log("Selected user:", user);

        profileData.value = {
          userkey: user.userkey,
          name: user.name,
          username: user.username,
          avatar: user.avatar,
          score: user.score
        };

      } catch (err) {
        console.error("Error fetching profile data:", err);
        error.value = err instanceof Error ? err.message : "Failed to load profile data";
      } finally {
        isLoading.value = false;
      }
    };

    fetchProfileData();
  }, [xhandle]);

  if (isLoading.value) {
    return (
      <div class="bg-gray-800 rounded-2xl shadow-lg p-8 border border-gray-700">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p class="text-gray-300 mb-4">Loading profile data for @{xhandle}...</p>
          <p class="text-sm text-gray-400">
            Fetching user information and review data from Ethos API
          </p>
        </div>
      </div>
    );
  }

  if (error.value) {
    return (
      <div class="bg-gray-800 rounded-2xl shadow-lg p-8 border border-gray-700">
        <div class="text-center">
          <div class="text-red-400 mb-4">
            <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 class="text-xl font-semibold text-white mb-2">Profile Not Found</h2>
          <p class="text-gray-300 mb-2">Could not find user: <strong>@{xhandle}</strong></p>
          <p class="text-sm text-gray-400 mb-6">{error.value}</p>
          <div class="flex flex-col sm:flex-row gap-3 justify-center">
            <a 
              href="/" 
              class="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Search for Another Profile
            </a>
            <a 
              href={`/?search=${encodeURIComponent(xhandle)}`}
              class="inline-block px-6 py-3 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Try Searching "{xhandle}"
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (!profileData.value) {
    return (
      <div class="bg-gray-800 rounded-2xl shadow-lg p-8 border border-gray-700">
        <div class="text-center">
          <p class="text-gray-400">No profile data available</p>
        </div>
      </div>
    );
  }

  return (
    <ReviewAnalysis 
      selectedUser={profileData.value}
      onClose={() => {
        // Navigate back to home page
        window.location.href = "/";
      }}
    />
  );
} 