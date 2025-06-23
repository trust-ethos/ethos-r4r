import { useSignal, useComputed } from "@preact/signals";
import { useEffect } from "preact/hooks";

// TypeScript interfaces for Ethos API v2 Activities
interface EthosActivity {
  id: string;
  type: string;
  timestamp: string;
  archived: boolean;
  author: {
    userkey: string;
    name: string;
    username: string;
    avatar: string;
    score: number;
  };
  subject: {
    userkey: string;
    name: string;
    username: string;
    avatar: string;
    score: number;
  };
  content?: {
    text: string;
    rating?: "positive" | "negative" | "neutral";
  };
}

interface EthosActivitiesResponse {
  values: EthosActivity[];
  total: number;
  limit: number;
  offset: number;
}

interface ReviewPair {
  userkey: string;
  name: string;
  username: string;
  avatar: string;
  score: number;
  givenReview?: EthosActivity;
  receivedReview?: EthosActivity;
  isReciprocal: boolean;
  timeDifference?: number; // Time difference in hours (absolute value)
}

interface ReviewAnalysisProps {
  selectedUser: {
    userkey: string;
    name: string;
    username: string;
    avatar: string;
    score: number;
  };
  onClose: () => void;
}

export default function ReviewAnalysis({ selectedUser, onClose }: ReviewAnalysisProps) {
  const givenReviews = useSignal<EthosActivity[]>([]);
  const receivedReviews = useSignal<EthosActivity[]>([]);
  const isLoading = useSignal(true);
  const error = useSignal<string | null>(null);

  // Computed statistics
  const stats = useComputed(() => {
    const given = givenReviews.value.filter(r => !r.archived);
    const received = receivedReviews.value.filter(r => !r.archived);
    
    // Count reciprocal reviews using the same logic as our pairing algorithm
    const userMap = new Map<string, { hasGiven: boolean; hasReceived: boolean }>();
    
    // Track users from given reviews
    given.forEach(review => {
      const username = review.subject.username;
      if (!userMap.has(username)) {
        userMap.set(username, { hasGiven: false, hasReceived: false });
      }
      userMap.get(username)!.hasGiven = true;
    });
    
    // Track users from received reviews
    received.forEach(review => {
      const username = review.author.username;
      if (!userMap.has(username)) {
        userMap.set(username, { hasGiven: false, hasReceived: false });
      }
      userMap.get(username)!.hasReceived = true;
    });
    
    // Count reciprocal relationships
    const reciprocalCount = Array.from(userMap.values())
      .filter(user => user.hasGiven && user.hasReceived)
      .length;

    // Calculate Review Farming Score with time gap analysis
    const reviewFarmingScore = received.length > 0 
      ? (() => {
          // Base reciprocal percentage
          const baseScore = (reciprocalCount / received.length) * 100;
          
          // Count suspicious quick reciprocations (under 30 minutes = 0.0208 days)
          // We need to calculate this from the actual review data
          let quickReciprocations = 0;
          
          given.forEach(givenReview => {
            const targetUsername = givenReview.subject.username;
            const matchingReceived = received.find(r => r.author.username === targetUsername);
            
            if (matchingReceived) {
              const givenDate = parseTimestamp(givenReview.timestamp);
              const receivedDate = parseTimestamp(matchingReceived.timestamp);
              const timeDiff = Math.abs(givenDate.getTime() - receivedDate.getTime()) / (1000 * 60 * 60 * 24);
              
              if (timeDiff < 0.0208) { // Under 30 minutes
                quickReciprocations++;
              }
            }
          });
          
          // Calculate suspicious ratio
          const suspiciousRatio = reciprocalCount > 0 ? quickReciprocations / reciprocalCount : 0;
          
          // Apply penalty based on suspicious patterns
          let adjustedScore = baseScore;
          
          console.log("Farming Score Calculation:");
          console.log("Base score:", baseScore.toFixed(1) + "%");
          console.log("Quick reciprocations:", quickReciprocations);
          console.log("Total reciprocations:", reciprocalCount);
          console.log("Quick reciprocation rate:", (suspiciousRatio * 100).toFixed(1) + "%");
          
          // Apply penalties based on percentage of reciprocals that are quick
          if (suspiciousRatio >= 0.8 && quickReciprocations >= 2) {
            // 80%+ of reciprocals are quick: major red flag, add 30-50 points
            const penalty = 30 + (suspiciousRatio * 20);
            adjustedScore += penalty;
            console.log("Major penalty applied (80%+ quick):", penalty.toFixed(1) + " points");
          } else if (suspiciousRatio >= 0.6 && quickReciprocations >= 2) {
            // 60-79% of reciprocals are quick: high penalty, add 20-35 points
            const penalty = 20 + (suspiciousRatio * 15);
            adjustedScore += penalty;
            console.log("High penalty applied (60-79% quick):", penalty.toFixed(1) + " points");
          } else if (suspiciousRatio >= 0.4 && quickReciprocations >= 2) {
            // 40-59% of reciprocals are quick: moderate penalty, add 15-25 points
            const penalty = 15 + (suspiciousRatio * 10);
            adjustedScore += penalty;
            console.log("Moderate penalty applied (40-59% quick):", penalty.toFixed(1) + " points");
          } else if (suspiciousRatio >= 0.2 && quickReciprocations >= 2) {
            // 20-39% of reciprocals are quick: small penalty, add 5-15 points
            const penalty = 5 + (suspiciousRatio * 10);
            adjustedScore += penalty;
            console.log("Small penalty applied (20-39% quick):", penalty.toFixed(1) + " points");
          } else {
            console.log("No penalty applied (<20% quick or <2 total quick reciprocations)");
          }
          
          console.log("Final adjusted score:", Math.min(Math.round(adjustedScore), 100) + "%");
          
          // Cap at 100%
          return Math.min(Math.round(adjustedScore), 100);
        })()
      : 0;

    return {
      given: given.length,
      received: received.length,
      reciprocal: reciprocalCount,
      farmingScore: reviewFarmingScore
    };
  });

  // Computed review pairs
  const reviewPairs = useComputed(() => {
    const pairs: ReviewPair[] = [];
    const userMap = new Map<string, ReviewPair>();

    // First, create a map of all unique users from given reviews
    givenReviews.value.filter(r => !r.archived).forEach(givenReview => {
      const targetUserkey = givenReview.subject.userkey;
      const targetUsername = givenReview.subject.username;
      
      // Use username as the unique key since userkeys might vary
      const uniqueKey = targetUsername;
      
      if (!userMap.has(uniqueKey)) {
        userMap.set(uniqueKey, {
          userkey: targetUserkey,
          name: givenReview.subject.name,
          username: givenReview.subject.username,
          avatar: givenReview.subject.avatar,
          score: givenReview.subject.score,
          givenReview: givenReview,
          receivedReview: undefined,
          isReciprocal: false,
          timeDifference: undefined
        });
      }
    });

    // Then, match received reviews to existing users
    receivedReviews.value.filter(r => !r.archived).forEach(receivedReview => {
      const fromUsername = receivedReview.author.username;
      
      if (userMap.has(fromUsername)) {
        // Update existing entry with received review
        const existing = userMap.get(fromUsername)!;
        existing.receivedReview = receivedReview;
        existing.isReciprocal = true;
        
        // Calculate time difference in days
        if (existing.givenReview && receivedReview) {
          console.log("Calculating time difference:");
          console.log("Given timestamp:", existing.givenReview.timestamp);
          console.log("Received timestamp:", receivedReview.timestamp);
          
          const givenDate = parseTimestamp(existing.givenReview.timestamp);
          const receivedDate = parseTimestamp(receivedReview.timestamp);
          
          console.log("Given date:", givenDate);
          console.log("Received date:", receivedDate);
          
          const diffMs = Math.abs(givenDate.getTime() - receivedDate.getTime());
          existing.timeDifference = diffMs / (1000 * 60 * 60 * 24); // Convert to days
          
          console.log("Diff (ms):", diffMs);
          console.log("Diff (days):", existing.timeDifference);
        }
      } else {
        // Create new entry for users who only have received reviews
        userMap.set(fromUsername, {
          userkey: receivedReview.author.userkey,
          name: receivedReview.author.name,
          username: receivedReview.author.username,
          avatar: receivedReview.author.avatar,
          score: receivedReview.author.score,
          givenReview: undefined,
          receivedReview: receivedReview,
          isReciprocal: false,
          timeDifference: undefined
        });
      }
    });

    // Convert map to array
    const result = Array.from(userMap.values());

    return result.sort((a, b) => {
      // Sort reciprocal reviews first, then by name
      if (a.isReciprocal && !b.isReciprocal) return -1;
      if (!a.isReciprocal && b.isReciprocal) return 1;
      return a.name.localeCompare(b.name);
    });
  });

  // Fetch review data
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        isLoading.value = true;
        error.value = null;

        // Fetch given and received reviews in parallel
        const [givenResponse, receivedResponse] = await Promise.all([
          fetch("/api/ethos-activities-given", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userkey: selectedUser.userkey, limit: 500 })
          }),
          fetch("/api/ethos-activities-received", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userkey: selectedUser.userkey, limit: 500 })
          })
        ]);

        if (!givenResponse.ok || !receivedResponse.ok) {
          throw new Error("Failed to fetch review data");
        }

        const givenData: EthosActivitiesResponse = await givenResponse.json();
        const receivedData: EthosActivitiesResponse = await receivedResponse.json();

        givenReviews.value = givenData.values || [];
        receivedReviews.value = receivedData.values || [];

      } catch (err) {
        console.error("Error fetching reviews:", err);
        error.value = "Failed to load review data. Please try again.";
      } finally {
        isLoading.value = false;
      }
    };

    fetchReviews();
  }, [selectedUser.userkey]);

  const getRatingColor = (rating?: string) => {
    switch (rating) {
      case "positive": return "text-green-600 bg-green-100";
      case "negative": return "text-red-600 bg-red-100";
      case "neutral": return "text-yellow-600 bg-yellow-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  const parseTimestamp = (timestamp: string | number): Date => {
    // Handle different timestamp formats
    let date: Date;
    
    // Convert to string if it's a number
    const timestampStr = timestamp.toString();
    
    // Try parsing as ISO string first
    if (timestampStr.includes('T') || timestampStr.includes('-')) {
      date = new Date(timestamp);
    } else {
      // Assume it's a Unix timestamp
      const numTimestamp = typeof timestamp === 'number' ? timestamp : parseInt(timestampStr);
      // If it's in seconds (10 digits), convert to milliseconds
      if (numTimestamp.toString().length === 10) {
        date = new Date(numTimestamp * 1000);
      } else {
        // Assume it's already in milliseconds
        date = new Date(numTimestamp);
      }
    }
    
    return date;
  };

  const formatDate = (timestamp: string | number) => {
    const date = parseTimestamp(timestamp);
    
    // Fallback if date is invalid
    if (isNaN(date.getTime())) {
      return "Invalid date";
    }
    
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const formatTimeDifference = (days?: number) => {
    if (days === undefined) return "—";
    
    if (days < 1/24/60) { // Less than 1 minute
      return "< 1 min";
    }
    
    if (days < 1/24) { // Less than 1 hour
      const minutes = Math.round(days * 24 * 60);
      return `${minutes} min${minutes !== 1 ? 's' : ''}`;
    }
    
    if (days < 1) { // Less than 1 day
      const hours = Math.round(days * 24);
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    
    if (days < 30) { // Less than 30 days
      return `${days.toFixed(1)} day${days.toFixed(1) !== '1.0' ? 's' : ''}`;
    }
    
    const months = Math.round(days / 30);
    return `${months} month${months !== 1 ? 's' : ''}`;
  };

  if (isLoading.value) {
    return (
      <div class="mt-8 text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
        <p class="text-gray-300">Loading review analysis...</p>
      </div>
    );
  }

  if (error.value) {
    return (
      <div class="mt-8 bg-red-900/30 border border-red-500/50 rounded-lg p-6 text-center">
        <p class="text-red-400">{error.value}</p>
        <button
          onClick={onClose}
          class="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Back to Search
        </button>
      </div>
    );
  }

  return (
    <div class="mt-8">
      {/* Header */}
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center">
          <img
            src={selectedUser.avatar}
            alt={selectedUser.name}
            class="w-12 h-12 rounded-full mr-4"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser.name)}&background=random`;
            }}
          />
          <div>
            <h2 class="text-2xl font-bold text-white">{selectedUser.name}</h2>
            <p class="text-gray-300">@{selectedUser.username} • Score: {selectedUser.score}</p>
          </div>
        </div>
        <div class="flex gap-3">
          <a
            href={`https://app.ethos.network/profile/x/${selectedUser.username}`}
            target="_blank"
            rel="noopener noreferrer"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Open in Ethos
          </a>
          <button
            onClick={onClose}
            class="px-4 py-2 text-gray-300 hover:text-white border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
          >
            ← Back to Search
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div class="bg-blue-900/30 border border-blue-500/50 rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-blue-400">{stats.value.given}</div>
          <div class="text-sm text-blue-400">Reviews Given</div>
        </div>
        <div class="bg-green-900/30 border border-green-500/50 rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-green-400">{stats.value.received}</div>
          <div class="text-sm text-green-400">Reviews Received</div>
        </div>
        <div class="bg-purple-900/30 border border-purple-500/50 rounded-lg p-4 text-center">
          <div class="text-2xl font-bold text-purple-400">{stats.value.reciprocal}</div>
          <div class="text-sm text-purple-400">Reciprocal Reviews</div>
        </div>
        <div class={`rounded-lg p-4 text-center ${
          stats.value.farmingScore >= 70 
            ? 'bg-red-900/30 border border-red-500/50' 
            : stats.value.farmingScore >= 40 
              ? 'bg-yellow-900/30 border border-yellow-500/50'
              : 'bg-emerald-900/30 border border-emerald-500/50'
        }`}>
          <div class={`text-2xl font-bold ${
            stats.value.farmingScore >= 70 
              ? 'text-red-400' 
              : stats.value.farmingScore >= 40 
                ? 'text-yellow-400'
                : 'text-emerald-400'
          }`}>
            {stats.value.farmingScore}%
          </div>
          <div class={`text-sm ${
            stats.value.farmingScore >= 70 
              ? 'text-red-400' 
              : stats.value.farmingScore >= 40 
                ? 'text-yellow-400'
                : 'text-emerald-400'
          }`}>
            Farming Score
          </div>
          <div class="text-xs text-gray-400 mt-1">
            {stats.value.farmingScore >= 70 
              ? 'High Risk' 
              : stats.value.farmingScore >= 40 
                ? 'Moderate Risk'
                : 'Low Risk'
            }
          </div>
          {/* Show quick reciprocation count if any exist */}
          {(() => {
            const quickCount = reviewPairs.value.filter(pair => 
              pair.isReciprocal && pair.timeDifference !== undefined && pair.timeDifference < 0.0208
            ).length;
            return quickCount > 0 ? (
              <div class="text-xs text-red-600 mt-1 font-medium">
                {quickCount} quick reciprocation{quickCount !== 1 ? 's' : ''} (&lt;30min)
              </div>
            ) : null;
          })()}
        </div>
      </div>

      {/* Review Pairs Table */}
      <div class="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700">
        <div class="px-6 py-4 bg-gray-700 border-b border-gray-600">
          <h3 class="text-lg font-semibold text-white">Review Relationships</h3>
          <p class="text-sm text-gray-300 mt-1">
            Reviews paired by user. Green checkmarks indicate reciprocal reviews (both users reviewed each other).
          </p>
        </div>

        {reviewPairs.value.length === 0 ? (
          <div class="p-8 text-center text-gray-400">
            No reviews found for this user.
          </div>
        ) : (
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-700">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    User
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Review Given
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Review Received
                  </th>
                  <th class="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Time Gap
                  </th>
                  <th class="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Reciprocal
                  </th>
                </tr>
              </thead>
              <tbody class="bg-gray-800 divide-y divide-gray-700">
                {reviewPairs.value.map((pair, index) => (
                  <tr key={pair.userkey} class={index % 2 === 0 ? "bg-gray-800" : "bg-gray-750"}>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center">
                        <img
                          src={pair.avatar}
                          alt={pair.name}
                          class="w-10 h-10 rounded-full mr-3"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(pair.name)}&background=random`;
                          }}
                        />
                        <div>
                          <a 
                            href={`/profile/${pair.username}`}
                            class="text-sm font-medium text-blue-400 hover:text-blue-300 hover:underline"
                          >
                            {pair.name}
                          </a>
                          <div class="text-sm text-gray-400">@{pair.username}</div>
                        </div>
                      </div>
                    </td>
                    <td class="px-6 py-4">
                      {pair.givenReview ? (
                        <div class="text-sm">
                          <div class={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getRatingColor(pair.givenReview.content?.rating)}`}>
                            {pair.givenReview.content?.rating || "Review"}
                          </div>
                          <div class="text-xs text-gray-400 mt-1">
                            {formatDate(pair.givenReview.timestamp)}
                          </div>
                        </div>
                      ) : (
                        <div class="text-sm text-gray-500">No review given</div>
                      )}
                    </td>
                    <td class="px-6 py-4">
                      {pair.receivedReview ? (
                        <div class="text-sm">
                          <div class={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getRatingColor(pair.receivedReview.content?.rating)}`}>
                            {pair.receivedReview.content?.rating || "Review"}
                          </div>
                          <div class="text-xs text-gray-400 mt-1">
                            {formatDate(pair.receivedReview.timestamp)}
                          </div>
                        </div>
                      ) : (
                        <div class="text-sm text-gray-500">No review received</div>
                      )}
                    </td>
                    <td class="px-6 py-4 text-center">
                      {pair.isReciprocal && pair.timeDifference !== undefined ? (
                        <div class={`text-sm font-medium ${
                          pair.timeDifference < 1 
                            ? 'text-red-600' // Very quick (same day) - suspicious
                            : pair.timeDifference < 7 
                              ? 'text-yellow-600' // Within a week - moderately suspicious
                              : 'text-green-600' // More than a week - normal
                        }`}>
                          {formatTimeDifference(pair.timeDifference)}
                        </div>
                      ) : (
                        <div class="text-gray-500 text-sm">—</div>
                      )}
                    </td>
                    <td class="px-6 py-4 text-center">
                      {pair.isReciprocal ? (
                        <div class="flex items-center justify-center">
                          <svg class="w-6 h-6 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                          </svg>
                        </div>
                      ) : (
                        <div class="text-gray-500">
                          <svg class="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
} 