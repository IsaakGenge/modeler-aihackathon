using ModelerAPI.ApiService.Models;

namespace ModelerAPI.ApiService.Services.ModelGenerator
{
    /// <summary>
    /// Tree graph generation strategy that creates a hierarchical Christmas tree structure 
    /// with a single root and predominantly leaf nodes by level 3
    /// </summary>
    public class TreeGraphStrategy : IGraphGenerationStrategy
    {
        private readonly ICosmosService _cosmosService;
        private readonly Random _random = new Random();
        private const int MaxDepth = 5; // Maximum depth of the tree

        // Possible node types for organization
        private readonly string[] _nodeTypes = {
            "Root", "Branch", "Leaf", "Container", "Element", "Group", "Item", "Component", "Module"
        };

        // Possible edge relationship types
        private readonly string[] _edgeTypes = {
            "Contains", "ParentOf", "DependsOn", "References", "Owns", "Includes"
        };

        public TreeGraphStrategy(ICosmosService cosmosService)
        {
            _cosmosService = cosmosService ?? throw new ArgumentNullException(nameof(cosmosService));
        }

        public async Task<(string GraphId, List<Node> Nodes, List<Edge> Edges)> GenerateGraphAsync(int nodeCount, string graphName)
        {
            if (nodeCount < 2)
                throw new ArgumentException("Tree graph requires at least 2 nodes", nameof(nodeCount));

            // Create a new graph
            var graphId = Guid.NewGuid().ToString();
            var graph = new Graph
            {
                Id = graphId,
                Name = graphName,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                DocumentType = "Graph",
                PartitionKey = graphId
            };

            await _cosmosService.CreateItemAsync(graph, graphId);

            // All nodes in the graph
            var nodes = new List<Node>();

            // Create the root node (star at the top of the Christmas tree)
            var rootNode = new Node
            {
                Name = "Tree Top",
                NodeType = "Root",
                GraphId = graphId,
                CreatedAt = DateTime.UtcNow,
                Properties = new Dictionary<string, object>
                {
                    { "Depth", 1 },
                    { "IsRoot", true },
                    { "CreatedDate", DateTime.UtcNow.ToString("yyyy-MM-dd") }
                }
            };

            var createdRootNode = await _cosmosService.CreateNodeAsync(rootNode);
            nodes.Add(createdRootNode);

            // Keep track of nodes at each level for building the tree
            var nodesByLevel = new Dictionary<int, List<Node>>
            {
                { 1, new List<Node> { createdRootNode } }
            };

            // Define the Christmas tree shape with fewer nodes at top, more in middle, tapering at bottom
            var nodesPerLevel = CalculateNodesPerLevel(nodeCount);

            // Track the total nodes created so far
            int nodesCreated = 1; // starting with the root

            // Create nodes level by level to achieve the Christmas tree shape
            for (int level = 2; level <= MaxDepth && nodesCreated < nodeCount; level++)
            {
                int nodesToCreateAtLevel = Math.Min(nodesPerLevel[level], nodeCount - nodesCreated);

                for (int i = 0; i < nodesToCreateAtLevel; i++)
                {
                    // Find a parent from the level above
                    int parentLevel = level - 1;

                    // If we somehow don't have parents at the previous level, find the nearest level with parents
                    if (!nodesByLevel.ContainsKey(parentLevel) || nodesByLevel[parentLevel].Count == 0)
                    {
                        parentLevel = nodesByLevel.Keys.Where(k => k < level)
                                                 .OrderByDescending(k => k)
                                                 .FirstOrDefault();
                    }

                    // Select a parent - ensure even distribution of children
                    Node parentNode;
                    if (level == 2) // First level below root always connects to root
                    {
                        parentNode = nodesByLevel[1][0]; // Root node
                    }
                    else
                    {
                        // Select parent from previous level based on having fewer children
                        var possibleParents = nodesByLevel[parentLevel];
                        parentNode = possibleParents[i % possibleParents.Count];
                    }

                    // Determine node type - more likely to be a leaf as we go deeper
                    bool isLeaf = level >= 3 && (_random.NextDouble() > 0.3 || level == MaxDepth);
                    string nodeType = isLeaf ? "Leaf" : "Branch";

                    var node = new Node
                    {
                        Name = $"{nodeType} {nodesCreated}",
                        NodeType = nodeType,
                        GraphId = graphId,
                        CreatedAt = DateTime.UtcNow,
                        Properties = new Dictionary<string, object>
                        {
                            { "Depth", level },
                            { "ParentId", parentNode.Id },
                            { "IsLeaf", isLeaf },
                            { "CreatedDate", DateTime.UtcNow.ToString("yyyy-MM-dd") }
                        }
                    };

                    var createdNode = await _cosmosService.CreateNodeAsync(node);
                    nodes.Add(createdNode);
                    nodesCreated++;

                    // Add the node to the appropriate level collection
                    if (!nodesByLevel.ContainsKey(level))
                    {
                        nodesByLevel[level] = new List<Node>();
                    }
                    nodesByLevel[level].Add(createdNode);

                    if (nodesCreated >= nodeCount)
                        break;
                }
            }

            // Create edges to connect the nodes in a tree structure
            var edges = new List<Edge>();

            foreach (var node in nodes.Where(n => n.NodeType != "Root"))
            {
                if (node.Properties.TryGetValue("ParentId", out var parentIdObj) && parentIdObj is string parentId)
                {
                    var parent = nodes.FirstOrDefault(n => n.Id == parentId);
                    if (parent != null)
                    {
                        // Determine appropriate edge type based on parent-child relationship
                        string edgeType = GetAppropriateEdgeType(parent.NodeType, node.NodeType);

                        var edge = new Edge
                        {
                            Source = parent.Id,
                            Target = node.Id,
                            EdgeType = edgeType,
                            GraphId = graphId,
                            CreatedAt = DateTime.UtcNow,
                            Properties = new Dictionary<string, object>
                            {
                                { "Relationship", edgeType },
                                { "ParentType", parent.NodeType },
                                { "ChildType", node.NodeType },
                                { "CreatedDate", DateTime.UtcNow.ToString("yyyy-MM-dd") }
                            }
                        };

                        var createdEdge = await _cosmosService.CreateEdgeAsync(edge);
                        edges.Add(createdEdge);
                    }
                }
            }

            return (graphId, nodes, edges);
        }

        /// <summary>
        /// Calculates how many nodes should be at each level to form a Christmas tree shape
        /// </summary>
        private Dictionary<int, int> CalculateNodesPerLevel(int totalNodes)
        {
            var nodesPerLevel = new Dictionary<int, int>();

            // Root is at level 1
            nodesPerLevel[1] = 1;
            int remainingNodes = totalNodes - 1;

            if (remainingNodes <= 0)
                return nodesPerLevel;

            // For a Christmas tree shape:
            // - Level 2: Few branches (near the top of the tree)
            // - Level 3: More branches (middle of the tree, widest part)
            // - Level 4: Fewer branches than level 3 (tapering)
            // - Level 5: Least branches (bottom of the tree)

            // Calculate percentages for each level
            double level2Percentage = 0.15; // 15% at level 2
            double level3Percentage = 0.45; // 45% at level 3 (bulk of the tree)
            double level4Percentage = 0.30; // 30% at level 4
            double level5Percentage = 0.10; // 10% at level 5

            // Ensure we have at least 2 nodes at level 2
            nodesPerLevel[2] = Math.Max(2, (int)(remainingNodes * level2Percentage));
            remainingNodes -= nodesPerLevel[2];

            if (remainingNodes <= 0)
                return nodesPerLevel;

            // Calculate nodes for remaining levels
            double remainingPercentageTotal = level3Percentage + level4Percentage + level5Percentage;

            // Level 3 - the widest part of the tree
            nodesPerLevel[3] = (int)(totalNodes * level3Percentage / remainingPercentageTotal * remainingNodes);
            remainingNodes -= nodesPerLevel[3];

            if (remainingNodes <= 0)
                return nodesPerLevel;

            // Level 4 - tapering
            nodesPerLevel[4] = (int)(totalNodes * level4Percentage / (level4Percentage + level5Percentage) * remainingNodes);
            remainingNodes -= nodesPerLevel[4];

            // Level 5 - bottom of the tree
            nodesPerLevel[5] = Math.Max(0, remainingNodes);

            return nodesPerLevel;
        }        

        /// <summary>
        /// Determines the appropriate edge type based on the parent and child node types
        /// </summary>
        private string GetAppropriateEdgeType(string parentType, string childType)
        {
            if (parentType == "Root")
                return "Contains";
            else if (parentType == "Branch" && childType == "Leaf")
                return "ParentOf";
            else if (parentType == "Branch" && childType == "Branch")
                return "Contains";
            else
                return _edgeTypes[_random.Next(_edgeTypes.Length)];
        }
    }
}