import { PageProps } from "$fresh/server.ts";
import { JSX } from "preact";

export default function AdminPage(props: PageProps) {
  return (
    <div class="min-h-screen bg-gray-900 text-white">
      <div class="container mx-auto px-4 py-8">
        <div class="max-w-4xl mx-auto">
          <h1 class="text-3xl font-bold text-blue-400 mb-8">
            🔧 Ethos R4R Admin Panel
          </h1>
          
          <div class="grid gap-6 md:grid-cols-2">
            {/* Job Scheduler Card */}
            <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 class="text-xl font-semibold text-green-400 mb-4">
                📊 R4R Job Scheduler
              </h2>
              <p class="text-gray-300 mb-4">
                Calculate R4R scores for active Ethos users in batches.
              </p>
              
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-2">
                    Batch Size (users per batch)
                  </label>
                  <input 
                    type="number" 
                    id="batchSize"
                    value="20" 
                    min="1" 
                    max="50"
                    class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-2">
                    Max Users to Process
                  </label>
                  <input 
                    type="number" 
                    id="maxUsers"
                    value="200" 
                    min="10" 
                    max="1000"
                    class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div class="flex items-center">
                  <input 
                    type="checkbox" 
                    id="onlyHighActivity"
                    checked
                    class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                                     <label for="onlyHighActivity" class="ml-2 text-sm text-gray-300">
                     Only high-activity users (score &gt; 50)
                   </label>
                </div>
                
                <button 
                  onclick="startJobScheduler()"
                  class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors"
                >
                  🚀 Start Job Scheduler
                </button>
              </div>
              
              <div id="jobStatus" class="mt-4 hidden">
                <div class="bg-gray-700 rounded p-3">
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-sm font-medium">Processing...</span>
                    <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                  </div>
                  <div id="jobProgress" class="text-xs text-gray-400"></div>
                </div>
              </div>
              
              <div id="jobResults" class="mt-4 hidden">
                <div class="bg-gray-700 rounded p-3">
                  <h4 class="font-medium mb-2">Results:</h4>
                  <div id="jobResultsContent" class="text-sm text-gray-300"></div>
                </div>
              </div>
            </div>

            {/* Batch Calculator Card */}
            <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 class="text-xl font-semibold text-purple-400 mb-4">
                🎯 Batch Calculator
              </h2>
              <p class="text-gray-300 mb-4">
                Calculate R4R scores for specific users.
              </p>
              
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-300 mb-2">
                    User Keys (one per line)
                  </label>
                  <textarea 
                    id="userKeys"
                    rows="6"
                    placeholder="service:x.com:123456789&#10;service:x.com:987654321"
                    class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm font-mono"
                  ></textarea>
                </div>
                
                <button 
                  onclick="startBatchCalculation()"
                  class="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition-colors"
                >
                  🧮 Calculate Batch
                </button>
              </div>
              
              <div id="batchStatus" class="mt-4 hidden">
                <div class="bg-gray-700 rounded p-3">
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-sm font-medium">Calculating...</span>
                    <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400"></div>
                  </div>
                  <div id="batchProgress" class="text-xs text-gray-400"></div>
                </div>
              </div>
              
              <div id="batchResults" class="mt-4 hidden">
                <div class="bg-gray-700 rounded p-3">
                  <h4 class="font-medium mb-2">Results:</h4>
                  <div id="batchResultsContent" class="text-sm text-gray-300"></div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div class="mt-8 bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 class="text-xl font-semibold text-yellow-400 mb-4">
              ⚡ Quick Actions
            </h2>
            <div class="grid gap-4 md:grid-cols-3">
              <a 
                href="/leaderboard" 
                class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded text-center transition-colors"
              >
                📊 View Leaderboard
              </a>
              <button 
                onclick="refreshLeaderboard()"
                class="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded transition-colors"
              >
                🔄 Refresh Data
              </button>
              <button 
                onclick="exportData()"
                class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded transition-colors"
              >
                📥 Export Data
              </button>
            </div>
          </div>
          
          {/* System Status */}
          <div class="mt-8 bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 class="text-xl font-semibold text-cyan-400 mb-4">
              📈 System Status
            </h2>
            <div id="systemStatus" class="text-gray-300">
              <div class="flex justify-between py-2 border-b border-gray-700">
                <span>Database Status:</span>
                <span id="dbStatus" class="text-green-400">Connected</span>
              </div>
              <div class="flex justify-between py-2 border-b border-gray-700">
                <span>Total Users in DB:</span>
                <span id="totalUsers" class="text-blue-400">Loading...</span>
              </div>
              <div class="flex justify-between py-2">
                <span>Last Update:</span>
                <span id="lastUpdate" class="text-yellow-400">Loading...</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{
        __html: `
          // Load system status on page load
          document.addEventListener('DOMContentLoaded', function() {
            loadSystemStatus();
          });

          async function loadSystemStatus() {
            try {
              const response = await fetch('/api/leaderboard');
              const data = await response.json();
              
              if (data.ok && data.data) {
                document.getElementById('totalUsers').textContent = data.data.stats?.total_users || '0';
                const lastUpdate = data.data.stats?.latest_analysis;
                if (lastUpdate) {
                  document.getElementById('lastUpdate').textContent = new Date(lastUpdate).toLocaleString();
                } else {
                  document.getElementById('lastUpdate').textContent = 'Never';
                }
              }
            } catch (error) {
              console.error('Failed to load system status:', error);
              document.getElementById('totalUsers').textContent = 'Error';
              document.getElementById('lastUpdate').textContent = 'Error';
            }
          }

          async function startJobScheduler() {
            const batchSize = parseInt(document.getElementById('batchSize').value);
            const maxUsers = parseInt(document.getElementById('maxUsers').value);
            const onlyHighActivity = document.getElementById('onlyHighActivity').checked;
            
            // Show status
            document.getElementById('jobStatus').classList.remove('hidden');
            document.getElementById('jobResults').classList.add('hidden');
            document.getElementById('jobProgress').textContent = 'Starting job scheduler...';
            
            try {
              const response = await fetch('/api/schedule-r4r-jobs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ batchSize, maxUsers, onlyHighActivity })
              });
              
              const result = await response.json();
              
              // Hide status, show results
              document.getElementById('jobStatus').classList.add('hidden');
              document.getElementById('jobResults').classList.remove('hidden');
              
              if (result.ok) {
                const data = result.data;
                document.getElementById('jobResultsContent').innerHTML = \`
                  <div class="space-y-2">
                    <div>✅ <strong>Success!</strong></div>
                    <div>📊 Processed: \${data.processedUsers}/\${data.totalUsers} users</div>
                    <div>📦 Batches: \${data.successfulBatches}/\${data.totalBatches} successful</div>
                    \${data.errors.length > 0 ? \`<div class="text-red-400">❌ Errors: \${data.errors.length}</div>\` : ''}
                  </div>
                \`;
              } else {
                document.getElementById('jobResultsContent').innerHTML = \`
                  <div class="text-red-400">❌ Error: \${result.error}</div>
                \`;
              }
              
              // Refresh system status
              setTimeout(loadSystemStatus, 1000);
              
            } catch (error) {
              document.getElementById('jobStatus').classList.add('hidden');
              document.getElementById('jobResults').classList.remove('hidden');
              document.getElementById('jobResultsContent').innerHTML = \`
                <div class="text-red-400">❌ Network Error: \${error.message}</div>
              \`;
            }
          }

          async function startBatchCalculation() {
            const userKeysText = document.getElementById('userKeys').value.trim();
            if (!userKeysText) {
              alert('Please enter at least one user key');
              return;
            }
            
            const userkeys = userKeysText.split('\\n').map(key => key.trim()).filter(key => key);
            
            // Show status
            document.getElementById('batchStatus').classList.remove('hidden');
            document.getElementById('batchResults').classList.add('hidden');
            document.getElementById('batchProgress').textContent = \`Processing \${userkeys.length} users...\`;
            
            try {
              const response = await fetch('/api/calculate-r4r-batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userkeys })
              });
              
              const result = await response.json();
              
              // Hide status, show results
              document.getElementById('batchStatus').classList.add('hidden');
              document.getElementById('batchResults').classList.remove('hidden');
              
              if (result.ok) {
                const data = result.data;
                document.getElementById('batchResultsContent').innerHTML = \`
                  <div class="space-y-2">
                    <div>✅ <strong>Processed:</strong> \${data.processed}/\${data.totalRequested} users</div>
                    \${data.errors.length > 0 ? \`<div class="text-red-400">❌ Errors: \${data.errors.length}</div>\` : ''}
                    <div class="mt-2">
                      <strong>Results:</strong>
                      <div class="max-h-32 overflow-y-auto mt-1">
                        \${data.results.map(r => \`<div class="text-xs">@\${r.username}: \${r.r4rScore}%</div>\`).join('')}
                      </div>
                    </div>
                  </div>
                \`;
              } else {
                document.getElementById('batchResultsContent').innerHTML = \`
                  <div class="text-red-400">❌ Error: \${result.error}</div>
                \`;
              }
              
            } catch (error) {
              document.getElementById('batchStatus').classList.add('hidden');
              document.getElementById('batchResults').classList.remove('hidden');
              document.getElementById('batchResultsContent').innerHTML = \`
                <div class="text-red-400">❌ Network Error: \${error.message}</div>
              \`;
            }
          }

          function refreshLeaderboard() {
            loadSystemStatus();
            alert('Data refreshed! Check the leaderboard page for updates.');
          }

          function exportData() {
            window.open('/api/leaderboard', '_blank');
          }
        `
      }}></script>
    </div>
  );
} 