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
  reviewType?: 'positive' | 'negative' | 'neutral' | 'reciprocal';
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
}

export default function NetworkGraph({ selectedUser, reviewPairs }: NetworkGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cosmographRef = useRef<any>(null);
  const isLoading = useSignal(true);
  const error = useSignal<string | null>(null);

  // Helper function to get color based on review type
  const getReviewColor = (reviewType: string): string => {
    switch (reviewType) {
      case 'positive': return '#10B981'; // Green
      case 'negative': return '#EF4444'; // Red
      case 'neutral': return '#F59E0B'; // Yellow
      default: return '#6B7280'; // Gray
    }
  };

  // Helper function to get color based on reciprocal timing
  const getReciprocalColor = (timeDifference?: number): string => {
    if (!timeDifference) return '#10B981'; // Default green
    
    if (timeDifference < 0.0208) return '#EF4444'; // Red for very quick (< 30 minutes)
    if (timeDifference < 1) return '#F59E0B'; // Yellow for quick (< 1 day)
    if (timeDifference < 7) return '#3B82F6'; // Blue for moderate (< 1 week)
    return '#10B981'; // Green for normal timing
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
          color: '#3B82F6', // Blue for central user
          label: `@${selectedUser.username}`, // Show Twitter handle
          image: selectedUser.avatar // Profile picture
        });

        // Group reciprocal and non-reciprocal relationships
        const reciprocalPairs: ReviewPair[] = [];
        const oneWayPairs: ReviewPair[] = [];
        
        reviewPairs.forEach(pair => {
          if (pair.isReciprocal) {
            reciprocalPairs.push(pair);
          } else {
            oneWayPairs.push(pair);
          }
        });

        // Add connected users and their relationships
        reviewPairs.forEach(pair => {
          // Add the connected user node if not already added
          if (!nodes.find(n => n.id === pair.userkey)) {
            nodes.push({
              id: pair.userkey,
              userkey: pair.userkey,
              username: pair.username,
              name: pair.name,
              avatar: pair.avatar,
              score: pair.score,
              size: pair.isReciprocal ? 18 : 14, // Larger size for reciprocal relationships
              color: pair.isReciprocal ? '#10B981' : '#6B7280', // Green for reciprocal, gray for one-way
              label: `@${pair.username}`, // Show Twitter handle
              image: pair.avatar // Profile picture
            });
          }

          // Handle reciprocal relationships with special grouped visualization
          if (pair.isReciprocal && pair.givenReview && pair.receivedReview) {
            // Create a single bidirectional link for reciprocal relationships
            const givenType = pair.givenReview.data?.score || 'neutral';
            const receivedType = pair.receivedReview.data?.score || 'neutral';
            
            // Use timing-based color for reciprocal relationships
            const reciprocalColor = getReciprocalColor(pair.timeDifference);
            
            links.push({
              source: selectedUser.userkey,
              target: pair.userkey,
              reviewType: 'reciprocal', // Special type for reciprocal
              color: reciprocalColor,
              width: 5, // Thicker for reciprocal relationships
              isReciprocal: true,
              timeDifference: pair.timeDifference
            });
          } else {
            // Handle one-way relationships with individual links
            
            // Add link for given review
            if (pair.givenReview) {
              const reviewType = pair.givenReview.data?.score || 'neutral';
              links.push({
                source: selectedUser.userkey,
                target: pair.userkey,
                reviewType: reviewType as 'positive' | 'negative' | 'neutral',
                color: getReviewColor(reviewType),
                width: 2,
                isReciprocal: false,
                timeDifference: pair.timeDifference
              });
            }

            // Add link for received review (if no given review)
            if (pair.receivedReview && !pair.givenReview) {
              const reviewType = pair.receivedReview.data?.score || 'neutral';
              links.push({
                source: pair.userkey,
                target: selectedUser.userkey,
                reviewType: reviewType as 'positive' | 'negative' | 'neutral',
                color: getReviewColor(reviewType),
                width: 2,
                isReciprocal: false,
                timeDifference: pair.timeDifference
              });
            }
          }
        });

        // Initialize Cosmograph
        cosmographInstance = new Cosmograph(containerRef.current, {
          nodeSize: (node: NetworkNode) => node.size || 16,
          nodeColor: (node: NetworkNode) => node.color || '#6B7280',
          linkColor: (link: NetworkLink) => link.color || '#374151',
          linkWidth: (link: NetworkLink) => link.width || 1,
          backgroundColor: '#111827', // Dark background to match theme
          spaceSize: 8192,
          // Spread out nodes more for better visibility
          simulationRepulsion: 4.0, // Increased repulsion to spread nodes
          simulationLinkSpring: 0.5, // Reduced spring force
          simulationLinkDistance: 100, // Increased link distance
          simulationFriction: 0.75, // Reduced friction for more movement
          simulationGravity: 0.1, // Reduced gravity
          simulationCenter: 0.05, // Reduced centering force
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
          class="w-full h-96 bg-gray-900 rounded-b-lg"
          style={{ minHeight: '400px' }}
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
                <span class="text-gray-300">Reciprocal Reviews</span>
              </div>
              <div class="flex items-center">
                <div class="w-3 h-3 rounded-full bg-gray-500 mr-2"></div>
                <span class="text-gray-300">One-way Reviews</span>
              </div>
            </div>
          </div>
          <div>
            <p class="text-gray-400 mb-2">Link Colors:</p>
            <div class="space-y-1">
              <div class="flex items-center">
                <div class="w-4 h-1 bg-green-500 mr-2"></div>
                <span class="text-gray-300">Positive Review</span>
              </div>
              <div class="flex items-center">
                <div class="w-4 h-1 bg-red-500 mr-2"></div>
                <span class="text-gray-300">Negative Review</span>
              </div>
              <div class="flex items-center">
                <div class="w-4 h-1 bg-yellow-500 mr-2"></div>
                <span class="text-gray-300">Neutral Review</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 