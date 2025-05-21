using ModelerAPI.ApiService.Models;

namespace ModelerAPI.ApiService.Services.ModelGenerator
{
    /// <summary>
    /// Tree graph generation strategy that creates a hierarchical tree structure with maximum 5 levels of depth
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
            
            // Create the root node
            var rootNode = new Node
            {
                Name = "Root",
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
            // We'll use this to find potential parent nodes when creating new nodes
            var nodesByLevel = new Dictionary<int, List<Node>>
            {
                { 1, new List<Node> { createdRootNode } }
            };

            // Create remaining nodes
            for (int i = 1; i < nodeCount; i++)
            {
                // Determine node level (depth) - ensuring we don't exceed MaxDepth
                // As we approach nodeCount, increase the likelihood of deeper nodes
                int maxPossibleLevel = Math.Min(MaxDepth, nodes.Count > 1 ? GetMaxDepth(nodes) + 1 : 2);
                
                // Choose a level for the new node - weighted toward deeper levels as we progress
                int targetLevel;
                double completionRatio = (double)i / nodeCount;
                
                if (completionRatio < 0.3)
                    targetLevel = _random.Next(2, Math.Min(3, maxPossibleLevel + 1));
                else if (completionRatio < 0.7)
                    targetLevel = _random.Next(2, Math.Min(4, maxPossibleLevel + 1));
                else
                    targetLevel = _random.Next(2, maxPossibleLevel + 1);

                // Find a parent from the level above
                int parentLevel = targetLevel - 1;
                if (!nodesByLevel.ContainsKey(parentLevel) || nodesByLevel[parentLevel].Count == 0)
                {
                    parentLevel = nodesByLevel.Keys.Where(k => k < targetLevel)
                                             .OrderByDescending(k => k)
                                             .FirstOrDefault();
                }

                // If we can't find a suitable parent level, default to using the root
                if (parentLevel <= 0 || !nodesByLevel.ContainsKey(parentLevel))
                {
                    parentLevel = 1; // Root level
                }

                // Select a random parent from the parent level
                Node parentNode = nodesByLevel[parentLevel][_random.Next(nodesByLevel[parentLevel].Count)];

                // Create the new node
                string nodeType = targetLevel == MaxDepth 
                    ? "Leaf" // Nodes at max depth are leaves
                    : _nodeTypes[_random.Next(1, _nodeTypes.Length)]; // Skip the "Root" type

                var node = new Node
                {
                    Name = $"{nodeType} {i}",
                    NodeType = nodeType,
                    GraphId = graphId,
                    CreatedAt = DateTime.UtcNow,
                    Properties = new Dictionary<string, object>
                    {
                        { "Depth", targetLevel },
                        { "ParentId", parentNode.Id },
                        { "IsLeaf", targetLevel == MaxDepth },
                        { "CreatedDate", DateTime.UtcNow.ToString("yyyy-MM-dd") }
                    }
                };

                var createdNode = await _cosmosService.CreateNodeAsync(node);
                nodes.Add(createdNode);

                // Add the node to the appropriate level collection
                if (!nodesByLevel.ContainsKey(targetLevel))
                {
                    nodesByLevel[targetLevel] = new List<Node>();
                }
                nodesByLevel[targetLevel].Add(createdNode);
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
        /// Gets the maximum depth level present in the current set of nodes
        /// </summary>
        private int GetMaxDepth(List<Node> nodes)
        {
            int maxDepth = 1; // Start with root level
            
            foreach (var node in nodes)
            {
                if (node.Properties.TryGetValue("Depth", out var depthObj) && depthObj is int depth)
                {
                    maxDepth = Math.Max(maxDepth, depth);
                }
            }
            
            return maxDepth;
        }

        /// <summary>
        /// Determines the appropriate edge type based on the parent and child node types
        /// </summary>
        private string GetAppropriateEdgeType(string parentType, string childType)
        {
            // Select semantic edge types based on parent-child relationship
            if (parentType == "Root" || parentType == "Container" || parentType == "Group")
                return "Contains";
            else if (childType == "Leaf")
                return "ParentOf";
            else
                return _edgeTypes[_random.Next(_edgeTypes.Length)];
        }
    }
}
