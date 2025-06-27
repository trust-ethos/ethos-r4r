import { useSignal } from "@preact/signals";
import { useRef, useEffect } from "preact/hooks";

// Define types for the network data
interface NetworkNode {
  id: string;
  x?: number;
  y?: number;
  color?: string;
  size?: number;
  label?: string;
  image?: string;
  userkey: string;
  username: string;
  name: string;
  avatar: string;
  score: number;
}

interface NetworkLink {
  source: string;
  target: string;
  color?: string;
  width?: number;
  reviewType?: 'reciprocal' | 'given' | 'received';
  isReciprocal?: boolean;
  timeDifference?: number;
}

interface ReviewPair {
  userkey: string;
  name: string;
  username: string;
  avatar: string;
  score: number;
  givenReview?: any;
  receivedReview?: any;
  isReciprocal: boolean;
  timeDifference?: number;
  r4rScore?: number; // Add R4R score for high-risk user highlighting
}

interface NetworkGraphProps {
  selectedUser: {
    userkey: string;
    name: string;
    username: string;
    avatar: string;
    score: number;
  };
  reviewPairs: ReviewPair[];
  centralUserR4rScore?: number; // R4R score for the central user
}

export default function NetworkGraph({ selectedUser, reviewPairs, centralUserR4rScore }: NetworkGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cosmographRef = useRef<any>(null);
  const isLoading = useSignal(true);
  const error = useSignal<string | null>(null);

  // Helper function to get color based on review type
  // Function to get node color based on relationship type and R4R score
  const getNodeColor = (relationshipType: 'central' | 'reciprocal' | 'given' | 'received', r4rScore?: number): string => {
    // High R4R score (≥70%) gets red color regardless of relationship type
    if (r4rScore !== undefined && r4rScore >= 70) {
      return '#EF4444'; // Red for high R4R score users
    }
    
    switch (relationshipType) {
      case 'central': return '#3B82F6'; // Blue for central user
      case 'reciprocal': return '#10B981'; // Green for reciprocal
      case 'given': return '#60A5FA'; // Light blue for given only
      case 'received': return '#A78BFA'; // Light purple for received only
      default: return '#6B7280'; // Gray fallback
    }
  };

  // Simplified color scheme - just match the node colors for consistency
  const getLinkColor = (relationshipType: 'reciprocal' | 'given' | 'received', targetR4rScore?: number): string => {
    // If target has high R4R score, make the link red
    if (targetR4rScore !== undefined && targetR4rScore >= 70) {
      return '#EF4444'; // Red for connections to high R4R score users
    }
    
    switch (relationshipType) {
      case 'reciprocal': return '#10B981'; // Green - matches reciprocal nodes
      case 'given': return '#60A5FA'; // Light blue - matches given nodes  
      case 'received': return '#A78BFA'; // Light purple - matches received nodes
      default: return '#6B7280'; // Gray fallback
    }
  };

  useEffect(() => {
    let cosmographInstance: any = null;
    
    const initializeGraph = async () => {
      try {
        isLoading.value = true;
        error.value = null;

        // Dynamically import Cosmograph
        const { Cosmograph } = await import("@cosmograph/cosmograph");
        
        if (!containerRef.current) return;

        // Prepare nodes and links data
        const nodes: NetworkNode[] = [];
        const links: NetworkLink[] = [];

        // Add the central user (selected user)
        nodes.push({
          id: selectedUser.userkey,
          userkey: selectedUser.userkey,
          username: selectedUser.username,
          name: selectedUser.name,
          avatar: selectedUser.avatar,
          score: selectedUser.score,
          size: 24, // Larger size for central node
          color: getNodeColor('central', centralUserR4rScore),
          label: `@${selectedUser.username}`, // Show Twitter handle
          image: selectedUser.avatar // Profile picture
        });

        // Group relationships by type for better positioning
        const reciprocalPairs: ReviewPair[] = [];
        const oneWayGivenPairs: ReviewPair[] = [];
        const oneWayReceivedPairs: ReviewPair[] = [];
        
        reviewPairs.forEach(pair => {
          if (pair.isReciprocal) {
            reciprocalPairs.push(pair);
          } else if (pair.givenReview && !pair.receivedReview) {
            oneWayGivenPairs.push(pair);
          } else if (pair.receivedReview && !pair.givenReview) {
            oneWayReceivedPairs.push(pair);
          }
        });

        // Add connected users with pre-calculated positions for better grouping
        const centerX = 0;
        const centerY = 0;
        const reciprocalRadius = 150; // Smaller inner circle for better zoom
        const oneWayRadius = 250; // Smaller outer circle for better zoom
        
        // Position reciprocal users in inner circle
        reciprocalPairs.forEach((pair, index) => {
          const angle = (index / reciprocalPairs.length) * 2 * Math.PI;
          const x = centerX + Math.cos(angle) * reciprocalRadius;
          const y = centerY + Math.sin(angle) * reciprocalRadius;
          
          nodes.push({
            id: pair.userkey,
            userkey: pair.userkey,
            username: pair.username,
            name: pair.name,
            avatar: pair.avatar,
            score: pair.score,
            size: 18,
            color: getNodeColor('reciprocal', pair.r4rScore),
            label: `@${pair.username}`,
            image: pair.avatar,
            x: x,
            y: y
          });
        });

        // Position one-way given users in upper outer arc
        oneWayGivenPairs.forEach((pair, index) => {
          const angle = (index / Math.max(oneWayGivenPairs.length, 1)) * Math.PI - Math.PI/2; // Upper semicircle
          const x = centerX + Math.cos(angle) * oneWayRadius;
          const y = centerY + Math.sin(angle) * oneWayRadius;
          
          nodes.push({
            id: pair.userkey,
            userkey: pair.userkey,
            username: pair.username,
            name: pair.name,
            avatar: pair.avatar,
            score: pair.score,
            size: 14,
            color: getNodeColor('given', pair.r4rScore),
            label: `@${pair.username}`,
            image: pair.avatar,
            x: x,
            y: y
          });
        });

        // Position one-way received users in lower outer arc
        oneWayReceivedPairs.forEach((pair, index) => {
          const angle = (index / Math.max(oneWayReceivedPairs.length, 1)) * Math.PI + Math.PI/2; // Lower semicircle
          const x = centerX + Math.cos(angle) * oneWayRadius;
          const y = centerY + Math.sin(angle) * oneWayRadius;
          
          nodes.push({
            id: pair.userkey,
            userkey: pair.userkey,
            username: pair.username,
            name: pair.name,
            avatar: pair.avatar,
            score: pair.score,
            size: 14,
            color: getNodeColor('received', pair.r4rScore),
            label: `@${pair.username}`,
            image: pair.avatar,
            x: x,
            y: y
          });
        });

        // Create links for all relationships - simplified colors
        reviewPairs.forEach(pair => {
          // Handle reciprocal relationships
          if (pair.isReciprocal && pair.givenReview && pair.receivedReview) {
            links.push({
              source: selectedUser.userkey,
              target: pair.userkey,
              reviewType: 'reciprocal',
              color: getLinkColor('reciprocal', pair.r4rScore), // Pass R4R score for color decision
              width: 4, // Thicker for reciprocal relationships
              isReciprocal: true,
              timeDifference: pair.timeDifference
            });
          } else {
            // Handle one-way relationships
            
            // Add link for given review
            if (pair.givenReview) {
              links.push({
                source: selectedUser.userkey,
                target: pair.userkey,
                reviewType: 'given',
                color: getLinkColor('given', pair.r4rScore), // Pass R4R score for color decision
                width: 2,
                isReciprocal: false,
                timeDifference: pair.timeDifference
              });
            }

            // Add link for received review (if no given review)
            if (pair.receivedReview && !pair.givenReview) {
              links.push({
                source: pair.userkey,
                target: selectedUser.userkey,
                reviewType: 'received',
                color: getLinkColor('received', pair.r4rScore), // Pass R4R score for color decision
                width: 2,
                isReciprocal: false,
                timeDifference: pair.timeDifference
              });
            }
          }
        });

        // Initialize Cosmograph with settings optimized for grouped layout
        cosmographInstance = new Cosmograph(containerRef.current, {
          nodeSize: (node: NetworkNode) => node.size || 16,
          nodeColor: (node: NetworkNode) => node.color || '#6B7280',
          linkColor: (link: NetworkLink) => link.color || '#374151',
          linkWidth: (link: NetworkLink) => link.width || 1,
          backgroundColor: '#111827', // Dark background to match theme
          spaceSize: 2048, // Smaller space for better initial zoom
          // Minimal simulation for static positioning
          simulationRepulsion: 0, // No repulsion
          simulationLinkSpring: 0, // No spring force
          simulationLinkDistance: 100, // Keep for reference
          simulationFriction: 0.99, // Very high friction (settles quickly)
          simulationGravity: 0, // No gravity
          simulationCenter: 0, // No centering force
          showFPSMonitor: false,
          pixelRatio: 2,
          scaleNodesOnZoom: true,
          renderLinks: true,
          curvedLinks: true, // Enable curved links for better aesthetics
          linkArrows: true,
          hoveredNodeRingColor: '#3B82F6',
          focusedNodeRingColor: '#F59E0B',
          // Show labels for better identification
          showDynamicLabels: true,
          nodeLabelAccessor: (node: NetworkNode) => node.label || `@${node.username}`,
          nodeLabelColor: '#FFFFFF',
          // Event handlers in configuration
          onClick: (clickedNode: NetworkNode | undefined) => {
            if (clickedNode && clickedNode.username) {
              // Navigate to the clicked user's profile
              window.location.href = `/profile/${clickedNode.username}`;
            }
          },
          onNodeMouseOver: (hoveredNode: NetworkNode | undefined) => {
            if (hoveredNode) {
              // Show user info on hover
              console.log(`Hovered: @${hoveredNode.username} (${hoveredNode.name})`);
            }
          }
        });

        cosmographRef.current = cosmographInstance;

        // Set the data
        cosmographInstance.setData(nodes, links);

        // Set initial zoom to show the network at a reasonable scale
        // Wait a bit for the layout to settle, then zoom to fit nicely
        setTimeout(() => {
          if (cosmographInstance) {
            cosmographInstance.zoomToFit(0); // No animation - instant zoom to fit
          }
        }, 100); // Shorter delay since no simulation

        isLoading.value = false;
      } catch (err) {
        console.error('Error initializing Cosmograph:', err);
        error.value = 'Failed to load network visualization';
        isLoading.value = false;
      }
    };

    initializeGraph();

    // Cleanup
    return () => {
      if (cosmographInstance) {
        cosmographInstance.remove();
      }
    };
  }, [selectedUser, reviewPairs]);

  if (error.value) {
    return (
      <div class="bg-red-900/30 border border-red-500/50 rounded-lg p-6 text-center">
        <p class="text-red-400">{error.value}</p>
      </div>
    );
  }

  // Calculate statistics for the summary
  const reciprocalCount = reviewPairs.filter(pair => pair.isReciprocal).length;
  const oneWayCount = reviewPairs.length - reciprocalCount;

  return (
    <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700">
      <div class="px-6 py-4 bg-gray-700 border-b border-gray-600">
        <h3 class="text-lg font-semibold text-white">Review Network</h3>
        <p class="text-sm text-gray-300 mt-1">
          Interactive visualization of review relationships. Click nodes to explore other profiles.
        </p>
        
        {/* Relationship Summary */}
        <div class="mt-3 flex flex-wrap gap-4 text-sm">
          <div class="flex items-center bg-green-900/30 px-3 py-1 rounded">
            <div class="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
            <span class="text-green-300">{reciprocalCount} Reciprocal</span>
          </div>
          <div class="flex items-center bg-gray-600/30 px-3 py-1 rounded">
            <div class="w-2 h-2 rounded-full bg-gray-500 mr-2"></div>
            <span class="text-gray-300">{oneWayCount} One-way</span>
          </div>
          <div class="flex items-center bg-blue-900/30 px-3 py-1 rounded">
            <span class="text-blue-300">Total: {reviewPairs.length} connections</span>
          </div>
        </div>
      </div>
      
      <div class="relative">
        {isLoading.value && (
          <div class="absolute inset-0 flex items-center justify-center bg-gray-800 z-10">
            <div class="text-center">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-2"></div>
              <p class="text-gray-300 text-sm">Loading network visualization...</p>
            </div>
          </div>
        )}
        
        <div 
          ref={containerRef}
          class="w-full h-64 bg-gray-900 rounded-b-lg"
          style={{ minHeight: '256px' }}
        />
      </div>

      {/* Legend */}
      <div class="px-6 py-4 bg-gray-750 border-t border-gray-600">
        <h4 class="text-sm font-medium text-gray-300 mb-3">Legend</h4>
        <div class="grid grid-cols-2 gap-4 text-xs">
          <div>
            <p class="text-gray-400 mb-2">Node Colors:</p>
            <div class="space-y-1">
              <div class="flex items-center">
                <div class="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                <span class="text-gray-300">Central User</span>
              </div>
              <div class="flex items-center">
                <div class="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                <span class="text-gray-300">Reciprocal (inner circle)</span>
              </div>
              <div class="flex items-center">
                <div class="w-3 h-3 rounded-full bg-blue-400 mr-2"></div>
                <span class="text-gray-300">Reviews Given (upper arc)</span>
              </div>
              <div class="flex items-center">
                <div class="w-3 h-3 rounded-full bg-purple-400 mr-2"></div>
                <span class="text-gray-300">Reviews Received (lower arc)</span>
              </div>
              <div class="flex items-center">
                <div class="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                <span class="text-gray-300">High R4R Score (≥70%)</span>
              </div>
            </div>
          </div>
          <div>
            <p class="text-gray-400 mb-2">Link Colors:</p>
            <div class="space-y-1">
              <div class="flex items-center">
                <div class="w-4 h-1 bg-green-500 mr-2"></div>
                <span class="text-gray-300">Reciprocal Reviews</span>
              </div>
              <div class="flex items-center">
                <div class="w-4 h-1 bg-blue-400 mr-2"></div>
                <span class="text-gray-300">Reviews Given</span>
              </div>
              <div class="flex items-center">
                <div class="w-4 h-1 bg-purple-400 mr-2"></div>
                <span class="text-gray-300">Reviews Received</span>
              </div>
              <div class="flex items-center">
                <div class="w-4 h-1 bg-red-500 mr-2"></div>
                <span class="text-gray-300">High R4R Connections</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 