import AppWrapper from "../islands/AppWrapper.tsx";

export default function Home() {

  return (
    <div class="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <div class="px-4 py-8 mx-auto">
        <div class="max-w-4xl mx-auto">
          {/* Header */}
          <div class="text-center mb-12">
            <h1 class="text-5xl font-bold text-white mb-4">
              Ethos Review Analyzer
            </h1>
            <p class="text-xl text-gray-300 mb-2">
              Discover review patterns and "Review 4 Review" relationships
            </p>
            <p class="text-lg text-gray-400">
              Search for any Ethos user to analyze their review history and connections
            </p>
          </div>

          {/* App Content - Now handled by island for proper signal watching */}
          <AppWrapper />
        </div>
      </div>
    </div>
  );
}
