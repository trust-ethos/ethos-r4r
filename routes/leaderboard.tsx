import { Head } from "$fresh/runtime.ts";
import LeaderboardPage from "../islands/LeaderboardPage.tsx";

export default function Leaderboard() {
  return (
    <>
      <Head>
        <title>Ethos Review Farming Leaderboard</title>
        <meta name="description" content="Live rankings of Ethos users by review farming risk scores. See who has the highest reciprocal review patterns." />
        <meta property="og:title" content="Ethos Review Farming Leaderboard" />
        <meta property="og:description" content="Live rankings of Ethos users by review farming risk scores. See who has the highest reciprocal review patterns." />
        <meta property="og:type" content="website" />
      </Head>
      
      <div class="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
        <div class="px-4 py-8 mx-auto">
          <div class="max-w-7xl mx-auto">
            {/* Header */}
            <div class="text-center mb-8">
              <h1 class="text-4xl font-bold text-white mb-2">
                🏆 Review Farming Leaderboard
              </h1>
              <p class="text-lg text-gray-300 mb-4">
                Live rankings of Ethos users by review farming risk scores
              </p>
              <a 
                href="/" 
                class="inline-block text-blue-400 hover:text-blue-300 underline"
              >
                ← Back to Profile Search
              </a>
            </div>

            {/* Leaderboard Component */}
            <LeaderboardPage />
          </div>
        </div>
      </div>
    </>
  );
} 