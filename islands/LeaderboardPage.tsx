import { useSignal, useComputed } from "@preact/signals";
import { useEffect } from "preact/hooks";

interface LeaderboardEntry {
  userkey: string;
  username: string;
  name: string;
  avatar: string;
  score: number;
  reviews_given: number;
  reviews_received: number;
  reciprocal_reviews: number;
  farming_score: number;
  risk_level: 'low' | 'moderate' | 'high';
  quick_reciprocations: number;
  avg_reciprocal_time: number;
  last_analyzed: string;
  analysis_version: string;
  processing_time: number;
  ethos_score?: number;
  ethos_xp?: number;
}

interface LeaderboardStats {
  totalEntries: number;
  highRisk: number;
  moderateRisk: number;
  lowRisk: number;
  lastUpdated: string | null;
}

export default function LeaderboardPage() {
  const entries = useSignal<LeaderboardEntry[]>([]);
  const stats = useSignal<LeaderboardStats | null>(null);
  const isLoading = useSignal(true);
  const error = useSignal<string | null>(null);
  const currentPage = useSignal(1);
  const itemsPerPage = useSignal(100);
  const sortBy = useSignal('farming_score');
  const sortOrder = useSignal<'asc' | 'desc'>('desc');
  const totalPages = useComputed(() => {
    if (!stats.value) return 1;
    return Math.ceil(stats.value.totalEntries / itemsPerPage.value);
  });

  const loadLeaderboard = async () => {
    try {
      isLoading.value = true;
      error.value = null;

      const offset = (currentPage.value - 1) * itemsPerPage.value;
      const params = new URLSearchParams({
        limit: itemsPerPage.value.toString(),
        offset: offset.toString(),
        sortBy: sortBy.value,
        sortOrder: sortOrder.value
      });

      const response = await fetch(`/api/leaderboard?${params}`);
      const data = await response.json();

      if (data.ok) {
        entries.value = data.entries;
        stats.value = data.stats;
        
        // Show helpful message if database isn't configured
        if (data.message && data.entries.length === 0) {
          console.log('ℹ️ Database not configured:', data.message);
        }
      } else {
        error.value = data.error || 'Failed to load leaderboard';
      }
    } catch (err) {
      console.error('Error loading leaderboard:', err);
      error.value = 'Failed to load leaderboard data';
    } finally {
      isLoading.value = false;
    }
  };

  useEffect(() => {
    loadLeaderboard();
  }, [currentPage.value, itemsPerPage.value, sortBy.value, sortOrder.value]);

  const handleSort = (column: string) => {
    if (sortBy.value === column) {
      // Toggle sort order if clicking the same column
      sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc';
    } else {
      // Set new column and default to desc for most columns
      sortBy.value = column;
      sortOrder.value = column === 'username' || column === 'name' ? 'asc' : 'desc';
    }
    currentPage.value = 1; // Reset to first page when sorting
  };

  const handlePageChange = (page: number) => {
    currentPage.value = page;
  };

  const getSortIcon = (column: string) => {
    if (sortBy.value !== column) {
      return '↕️'; // Neutral sort icon
    }
    return sortOrder.value === 'desc' ? '⬇️' : '⬆️';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getRiskBadgeColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return 'bg-red-900/30 border-red-500/50 text-red-400';
      case 'moderate': return 'bg-yellow-900/30 border-yellow-500/50 text-yellow-400';
      case 'low': return 'bg-emerald-900/30 border-emerald-500/50 text-emerald-400';
      default: return 'bg-gray-900/30 border-gray-500/50 text-gray-400';
    }
  };



  if (isLoading.value) {
    return (
      <div class="text-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
        <p class="text-gray-300">Loading leaderboard...</p>
      </div>
    );
  }

  if (error.value) {
    return (
      <div class="bg-red-900/30 border border-red-500/50 rounded-lg p-6 text-center">
        <p class="text-red-400 mb-4">{error.value}</p>
        <button
          onClick={loadLeaderboard}
          class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Stats Overview */}
      {stats.value && (
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div class="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div class="text-2xl font-bold text-white">{stats.value.totalEntries}</div>
            <div class="text-sm text-gray-400">Total Profiles</div>
          </div>
          <div class="bg-red-900/30 border border-red-500/50 rounded-lg p-4">
            <div class="text-2xl font-bold text-red-400">{stats.value.highRisk}</div>
            <div class="text-sm text-red-400">High Risk</div>
          </div>
          <div class="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-4">
            <div class="text-2xl font-bold text-yellow-400">{stats.value.moderateRisk}</div>
            <div class="text-sm text-yellow-400">Moderate Risk</div>
          </div>
          <div class="bg-emerald-900/30 border border-emerald-500/50 rounded-lg p-4">
            <div class="text-2xl font-bold text-emerald-400">{stats.value.lowRisk}</div>
            <div class="text-sm text-emerald-400">Low Risk</div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div class="bg-blue-900/30 border border-blue-500/50 rounded-lg p-4 mb-6">
        <p class="text-blue-300 text-sm">
          📊 This leaderboard shows users analyzed through profile searches. 
                        Higher R4R scores indicate more suspicious review patterns.
          {stats.value?.lastUpdated && (
            <span class="block mt-1">
              Last updated: {formatDate(stats.value.lastUpdated)}
            </span>
          )}
        </p>
      </div>

      {/* Leaderboard Table */}
      {entries.value.length === 0 ? (
        <div class="bg-gray-800 rounded-lg p-8 text-center border border-gray-700">
          <p class="text-gray-400 mb-4">No profiles analyzed yet!</p>
          <p class="text-sm text-gray-500 mb-4">
            Start by searching for profiles on the homepage. Each analysis will be added to this leaderboard.
          </p>
          <div class="bg-blue-900/30 border border-blue-500/50 rounded-lg p-4 mt-4">
            <p class="text-blue-300 text-sm">
              💡 <strong>Tip:</strong> The leaderboard builds organically as users search for profiles. 
              No bulk processing needed - just search and analyze!
            </p>
            <p class="text-blue-300 text-xs mt-2">
              Want persistence? Set up a database using the instructions in DATABASE_SETUP.md
            </p>
          </div>
        </div>
      ) : (
        <div class="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700">
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-700">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Rank
                  </th>
                  <th 
                    class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-600 transition-colors"
                    onClick={() => handleSort('username')}
                  >
                    User {getSortIcon('username')}
                  </th>
                  <th 
                    class="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-600 transition-colors"
                    onClick={() => handleSort('farming_score')}
                  >
                    R4R Score {getSortIcon('farming_score')}
                  </th>
                  <th 
                    class="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-600 transition-colors"
                    onClick={() => handleSort('risk_level')}
                  >
                    Risk Level {getSortIcon('risk_level')}
                  </th>
                  <th 
                    class="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-600 transition-colors"
                    onClick={() => handleSort('ethos_xp')}
                  >
                    Ethos XP {getSortIcon('ethos_xp')}
                  </th>
                  <th 
                    class="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-600 transition-colors"
                    onClick={() => handleSort('reviews_received')}
                  >
                    Reviews {getSortIcon('reviews_received')}
                  </th>
                  <th 
                    class="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-600 transition-colors"
                    onClick={() => handleSort('reciprocal_reviews')}
                  >
                    Reciprocal {getSortIcon('reciprocal_reviews')}
                  </th>
                  <th 
                    class="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-600 transition-colors"
                    onClick={() => handleSort('quick_reciprocations')}
                  >
                    Quick Recips {getSortIcon('quick_reciprocations')}
                  </th>
                  <th 
                    class="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-600 transition-colors"
                    onClick={() => handleSort('last_analyzed')}
                  >
                    Last Analyzed {getSortIcon('last_analyzed')}
                  </th>
                </tr>
              </thead>
              <tbody class="bg-gray-800 divide-y divide-gray-700">
                {entries.value.map((entry, index) => (
                  <tr key={entry.userkey} class={index % 2 === 0 ? "bg-gray-800" : "bg-gray-750"}>
                    <td class="px-6 py-4 whitespace-nowrap text-center">
                      <div class="text-lg font-bold text-white">#{(currentPage.value - 1) * itemsPerPage.value + index + 1}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center">
                        <img
                          src={entry.avatar}
                          alt={entry.name}
                          class="w-10 h-10 rounded-full mr-3"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(entry.name)}&background=random`;
                          }}
                        />
                        <div>
                          <a 
                            href={`/profile/${entry.username}`}
                            class="text-sm font-medium text-blue-400 hover:text-blue-300 hover:underline"
                          >
                            {entry.name}
                          </a>
                          <div class="text-sm text-gray-400">@{entry.username}</div>
                        </div>
                      </div>
                    </td>
                    <td class="px-6 py-4 text-center">
                      <div class={`text-2xl font-bold ${
                        entry.farming_score >= 70 
                          ? 'text-red-400' 
                          : entry.farming_score >= 40 
                            ? 'text-yellow-400'
                            : 'text-emerald-400'
                      }`}>
                        {entry.farming_score}%
                      </div>
                    </td>
                    <td class="px-6 py-4 text-center">
                      <span class={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${getRiskBadgeColor(entry.risk_level)}`}>
                        {entry.risk_level.toUpperCase()}
                      </span>
                    </td>
                    <td class="px-6 py-4 text-center">
                      <div class="text-lg font-semibold text-cyan-400">
                        {entry.ethos_xp ?? '—'}
                      </div>
                    </td>
                    <td class="px-6 py-4 text-center">
                      <div class="text-sm text-gray-300">
                        <div>Given: {entry.reviews_given}</div>
                        <div>Received: {entry.reviews_received}</div>
                      </div>
                    </td>
                    <td class="px-6 py-4 text-center">
                      <div class="text-lg font-semibold text-purple-400">
                        {entry.reciprocal_reviews}
                      </div>
                    </td>
                    <td class="px-6 py-4 text-center">
                      <div class="text-lg font-semibold text-red-400">
                        {entry.quick_reciprocations}
                      </div>
                    </td>
                    <td class="px-6 py-4 text-center">
                      <div class="text-xs text-gray-400">
                        {formatDate(entry.last_analyzed)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {entries.value.length > 0 && totalPages.value > 1 && (
        <div class="mt-6 flex justify-center items-center space-x-2">
          <button
            onClick={() => handlePageChange(currentPage.value - 1)}
            disabled={currentPage.value === 1}
            class="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            ← Previous
          </button>
          
          <div class="flex space-x-1">
            {Array.from({ length: Math.min(totalPages.value, 10) }, (_, i) => {
              const startPage = Math.max(1, currentPage.value - 5);
              const pageNumber = startPage + i;
              if (pageNumber > totalPages.value) return null;
              
              return (
                <button
                  key={pageNumber}
                  onClick={() => handlePageChange(pageNumber)}
                  class={`px-3 py-2 rounded-lg transition-colors ${
                    currentPage.value === pageNumber
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {pageNumber}
                </button>
              );
            })}
          </div>
          
          <button
            onClick={() => handlePageChange(currentPage.value + 1)}
            disabled={currentPage.value === totalPages.value}
            class="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next →
          </button>
        </div>
      )}

      {/* Page Info and Refresh Button */}
      <div class="mt-6 text-center">
        {stats.value && (
          <p class="text-gray-400 text-sm mb-4">
            Showing {Math.min((currentPage.value - 1) * itemsPerPage.value + 1, stats.value.totalEntries)} - {Math.min(currentPage.value * itemsPerPage.value, stats.value.totalEntries)} of {stats.value.totalEntries} profiles
            {totalPages.value > 1 && ` (Page ${currentPage.value} of ${totalPages.value})`}
          </p>
        )}
        <button
          onClick={loadLeaderboard}
          class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          🔄 Refresh Leaderboard
        </button>
      </div>
    </div>
  );
} 