import { PageProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
import ProfileAnalysisPage from "../../islands/ProfileAnalysisPage.tsx";

export default function ProfilePage({ params }: PageProps) {
  const xhandle = params.xhandle;

  return (
    <>
      <Head>
        <title>Ethos Profile Analysis - @{xhandle}</title>
        <meta name="description" content={`Review analysis for Ethos user @${xhandle}. View their review patterns, reciprocal relationships, and reputation metrics.`} />
        <meta property="og:title" content={`Ethos Profile Analysis - @${xhandle}`} />
        <meta property="og:description" content={`Review analysis for Ethos user @${xhandle}. View their review patterns, reciprocal relationships, and reputation metrics.`} />
        <meta property="og:type" content="website" />
      </Head>
      
      <div class="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
        <div class="px-4 py-8 mx-auto">
          <div class="max-w-6xl mx-auto">
            {/* Header */}
            <div class="text-center mb-8">
              <h1 class="text-4xl font-bold text-white mb-2">
                Profile Analysis: @{xhandle}
              </h1>
              <p class="text-lg text-gray-300">
                Review patterns and reputation analysis
              </p>
              <a 
                href="/" 
                class="inline-block mt-4 text-blue-400 hover:text-blue-300 underline"
              >
                ← Search another profile
              </a>
            </div>

            {/* Profile Analysis Component */}
            <ProfileAnalysisPage xhandle={xhandle} />
          </div>
        </div>
      </div>
    </>
  );
} 