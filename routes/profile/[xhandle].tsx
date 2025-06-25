import { PageProps, RouteContext } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
import ProfileAnalysisPage from "../../islands/ProfileAnalysisPage.tsx";

interface ProfileData {
  userkey: string;
  name: string;
  username: string;
  avatar: string;
  score: number;
  reviewsGiven?: number;
  reviewsReceived?: number;
  reciprocalReviews?: number;
}

export async function handler(req: Request, ctx: RouteContext) {
  const xhandle = ctx.params.xhandle;
  let profileData: ProfileData | null = null;

  try {
    // Use the same API endpoints as the client-side code
    const searchUrl = `https://ethos.network/api/user-search?query=${encodeURIComponent(xhandle)}`;
    console.log(`Fetching profile data from: ${searchUrl}`);
    
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Ethos R4R Analyzer Bot/1.0',
        'Accept': 'application/json'
      }
    });
    
    if (searchResponse.ok) {
      const searchResults = await searchResponse.json();
      console.log(`Found ${searchResults.length} search results for ${xhandle}`);
      
      const user = searchResults.find((u: any) => 
        u.username?.toLowerCase() === xhandle.toLowerCase() || 
        u.userkey?.toLowerCase() === xhandle.toLowerCase()
      );

      if (user) {
        console.log(`Found user: ${user.name} (@${user.username})`);
        profileData = {
          userkey: user.userkey,
          name: user.name || user.username,
          username: user.username,
          avatar: user.avatar || '/logo.svg',
          score: user.score || 0
        };

        // Try to fetch additional review statistics with timeout
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
          
          const [activitiesGiven, activitiesReceived] = await Promise.all([
            fetch(`https://ethos.network/api/activities?userkey=${user.userkey}&type=given&limit=100`, {
              signal: controller.signal,
              headers: { 'Accept': 'application/json' }
            }),
            fetch(`https://ethos.network/api/activities?userkey=${user.userkey}&type=received&limit=100`, {
              signal: controller.signal,
              headers: { 'Accept': 'application/json' }
            })
          ]);
          
          clearTimeout(timeoutId);

          if (activitiesGiven.ok && activitiesReceived.ok) {
            const givenData = await activitiesGiven.json();
            const receivedData = await activitiesReceived.json();
            
            profileData.reviewsGiven = givenData.length;
            profileData.reviewsReceived = receivedData.length;
            
            // Calculate reciprocal reviews
            const reciprocalCount = givenData.filter((given: any) => 
              receivedData.some((received: any) => received.author?.userkey === given.subject?.userkey)
            ).length;
            
            profileData.reciprocalReviews = reciprocalCount;
            console.log(`Review stats: ${profileData.reviewsGiven} given, ${profileData.reviewsReceived} received, ${reciprocalCount} reciprocal`);
          }
        } catch (error) {
          console.log('Could not fetch review statistics:', error);
        }
      } else {
        console.log(`No user found matching: ${xhandle}`);
      }
    } else {
      console.log(`Search API returned status: ${searchResponse.status}`);
    }
  } catch (error) {
    console.log('Error fetching profile data:', error);
  }

  return ctx.render({ profileData, xhandle });
}

export default function ProfilePage({ data }: PageProps<{ profileData: ProfileData | null; xhandle: string }>) {
  const { profileData, xhandle } = data;

  // Generate dynamic meta content
  const displayName = profileData?.name || `@${xhandle}`;
  const username = profileData?.username || xhandle;
  const ethosScore = profileData?.score ? ` (${profileData.score} Ethos Score)` : '';
  
  // Create dynamic description based on available data
  let description = `Review analysis for ${displayName}${ethosScore}`;
  if (profileData?.reviewsGiven !== undefined && profileData?.reviewsReceived !== undefined) {
    description += ` • ${profileData.reviewsGiven} reviews given, ${profileData.reviewsReceived} received`;
    if (profileData.reciprocalReviews !== undefined) {
      description += ` • ${profileData.reciprocalReviews} reciprocal reviews`;
    }
  }
  description += ' • Analyze review patterns and R4R behavior';

  const title = `${displayName} - Ethos R4R Analyzer`;
  const profileImage = profileData?.avatar || '/logo.svg';

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="profile" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={profileImage} />
        <meta property="og:url" content={`https://ethos-r4r-analyzer.deno.dev/profile/${username}`} />
        <meta property="og:site_name" content="Ethos R4R Analyzer" />
        
        {/* Profile-specific Open Graph tags */}
        {profileData && (
          <>
            <meta property="profile:username" content={username} />
            <meta property="profile:first_name" content={profileData.name.split(' ')[0]} />
            {profileData.name.includes(' ') && (
              <meta property="profile:last_name" content={profileData.name.split(' ').slice(1).join(' ')} />
            )}
          </>
        )}
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={profileImage} />
        {profileData?.username && (
          <meta name="twitter:creator" content={`@${profileData.username}`} />
        )}
        
        {/* Additional SEO meta tags */}
        <meta name="author" content={displayName} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={`https://ethos-r4r-analyzer.deno.dev/profile/${username}`} />
        
        {/* Structured data for better SEO */}
        {profileData && (
          <script type="application/ld+json">
            {JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Person",
              "name": profileData.name,
              "alternateName": `@${profileData.username}`,
              "image": profileData.avatar,
              "url": `https://ethos-r4r-analyzer.deno.dev/profile/${username}`,
              "description": description,
              "sameAs": [
                `https://ethos.network/profile/${profileData.userkey}`
              ]
            })}
          </script>
        )}
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