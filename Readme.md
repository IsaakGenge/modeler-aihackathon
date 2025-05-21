# ModelerAPI

ModelerAPI is a graph database modeling application built with .NET 9, using Azure Cosmos DB with Gremlin API for graph storage. The application provides a RESTful API to manage nodes and edges in a graph model.

## Table of Contents
- [Demo](#demo)
- [Features](#features)
  - [Core Graph Database Technology](#core-graph-database-technology)
  - [Advanced Graph Generation](#advanced-graph-generation)
  - [Rich Type System](#rich-type-system)
  - [Interactive Visualization](#interactive-visualization)
  - [Developer-Friendly API](#developer-friendly-api)
  - [User Interface](#user-interface)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [Installing Azure Cosmos DB Emulator](#installing-azure-cosmos-db-emulator)
  - [Configuring Cosmos DB Emulator for Gremlin API](#configuring-cosmos-db-emulator-for-gremlin-api)
  - [Configuration](#configuration)
  - [Running the Application](#running-the-application)
- [API Reference](#api-reference)
- [Swagger Documentation](#swagger-documentation)
- [Development](#development)

## Demo 
- **[Frontend](https://white-tree-05d734f0f.6.azurestaticapps.net)
- **[Swagger](https://modelerapiapiservice20250521101918-cjggfabua3f8cxap.eastus-01.azurewebsites.net/index.html)

## Features

### Core Graph Database Technology
- **Complete Graph Management** with full CRUD operations for nodes and edges
- **Persistent Storage** via Azure Cosmos DB with Gremlin API support
- **RESTful API** for programmatic access to all graph operations
- **Gremlin Query Support** for advanced graph traversal and analysis

### Advanced Graph Generation
- **Intelligent Plant Simulation Engine** 
  - Creates realistic industrial plant topologies with boilers, pumps, valves, and more
  - Automatically establishes logical process flows and control relationships
  - Simulates monitoring systems and sensor integrations
- **Versatile Graph Strategies**
  - Random Graph - For general-purpose network modeling
  - Star Graph - Hub-and-spoke structures for centralized systems
  - Chain Graph - Linear sequential processes and workflows

### Rich Type System
- **Specialized Node Types**
  - Industrial components (boilers, pumps, valves, etc.)
  - Generic entities (person, place, thing, concept)
  - Structural elements (hub, satellite, chain)
- **Semantic Edge Types**
  - Industrial relationships (flowTo, controls, monitors, heats, cools)
  - Generic connections (related, belongs, contains, depends)
  - Sequential links (next)

### Interactive Visualization
- **Cytoscape-powered Graph Rendering** with multiple layout algorithms:
  - Hierarchical (breadthfirst)
  - Circular
  - Grid
  - Concentric
  - Force-directed (cose)
  - Random
- **Intelligent Visual Styling** based on node and edge types
- **Interactive Graph Controls** for zooming, panning, and reorganizing
- **Dark Mode Support** for comfortable viewing

### Developer-Friendly API
- **Comprehensive Swagger Documentation** with interactive testing
- **TypeScript-ready Models** for frontend integration
- **XML-documented Endpoints** for IntelliSense and documentation generation
- **.NET 9 + Aspire** architecture for modern, distributed applications

### User Interface
- **Graph Manager Component** for intuitive graph interaction
- **Node and Edge Creation Tools** with type selection
- **Responsive Layout** that adapts to different screen sizes
- **View Controls** for customizing the graph presentation

## Architecture

The application consists of:

- **Backend API** (.NET 9 Web API)
  - RESTful API endpoints for node and edge management
  - Cosmos DB service abstraction for data access
  - Gremlin client integration for graph operations
  - Model generation strategies for different graph types
  
- **Frontend** (NPM-based web application)
  - User interface for interacting with the graph model
  - Cytoscape-based graph visualization
  - References the backend API service

## Prerequisites

- [.NET 9 SDK](https://dotnet.microsoft.com/download)
- [Azure Cosmos DB Emulator](https://docs.microsoft.com/en-us/azure/cosmos-db/local-emulator)
- [Node.js and npm](https://nodejs.org/) (for the frontend application)
- Visual Studio 2022 or another compatible IDE

## Getting Started

### Installing Azure Cosmos DB Emulator

1. Download the Azure Cosmos DB Emulator from the [Microsoft Download Center](https://aka.ms/cosmosdb-emulator)
2. Run the installer and follow the on-screen instructions to complete the installation
3. By default, the emulator installs to `C:\Program Files\Azure Cosmos DB Emulator`

### Configuring Cosmos DB Emulator for Gremlin API

1. Start the Cosmos DB Emulator by:
   - Navigating to the installation directory and running `Microsoft.Azure.Cosmos.Emulator.exe /EnableGremlinEndpoint /GremlinPort=65400`

2. Once the emulator is running, you'll see the notification icon in your system tray
   - The emulator runs by default on port 8081
   - Right-click the icon and select "Open Data Explorer" to launch the emulator web interface

3. Create a database and container for your graph data:
   - In the Data Explorer, click "New Database"
   - Create a database named `db1`
   - Within that database, create a container named `coll1`
   - When creating the container:
     - Set the partition key to `/pkey`    
     - Click "OK" to create the container

4. Note the Gremlin endpoint details from the emulator:
   - Gremlin Endpoint: `localhost:8081`
   - Gremlin Port: 65400 (this is the default Gremlin port in the emulator)
   - Default Master Key: `C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==`
   
### Configuration

#### Application Settings

The application uses the standard .NET configuration system with the Options pattern. All configuration settings are stored in `appsettings.json` and can be overridden in environment-specific files like `appsettings.Development.json`.

1. **Cosmos DB Settings**

   Connection settings for Cosmos DB are configured in the `CosmosDb` section:
   
1. "CosmosDb": { "EndpointUrl": "https://localhost:8081", "PrimaryKey": "C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==", "DatabaseName": "db1", "ContainerName": "coll1", "GremlinHostname": "localhost", "GremlinPort": 65400, "GremlinUsername": "/dbs/db1/colls/coll1", "GremlinPassword": "C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==" }
     
   These settings are mapped to the `CosmosDbSettings` class and injected into services via dependency injection.

2. **CORS Settings**

   Cross-Origin Resource Sharing settings are configured in the `Cors` section:
   "Cors": { "AllowedOrigins": ["http://localhost:4200"] }
   These settings control which origins can access the API and are mapped to the `CorsSettings` class.

3. **Customizing Settings**

   To customize these settings for your environment:
   
   - Update the corresponding values in `appsettings.json` or `appsettings.Development.json`
   - For production deployments, use environment variables or secrets management
   - The connection values shown above are for the local Cosmos DB Emulator

4. **Environment Variables**

   Set the environment variable `ASPIRE_ALLOW_UNSECURED_TRANSPORT=true` for local development:
   - In Windows, run Command Prompt as Administrator and enter:
      setx ASPIRE_ALLOW_UNSECURED_TRANSPORT true
   
### Running the Application

1. Clone this repository
2. Navigate to the project directory
3. Ensure the Cosmos DB Emulator is running (check the notification icon in your system tray)
4. Run the application using .NET Aspire:  dotnet run --project Backend/ModelerAPI.AppHost



## API Reference

### Node Endpoints

- **GET /api/node** - Retrieve all nodes
- **POST /api/node** - Create a new node
- { "name": "Example Node", "nodeType": "custom" }
- **PUT /api/node/{id}** - Update an existing node
- **DELETE /api/node/{id}** - Delete a node

### Edge Endpoints

- **GET /api/edge** - Retrieve all edges
- **POST /api/edge** - Create a new edge between nodes
- { "source": "nodeId1", "target": "nodeId2", "edgeType": "related" }
  
- **PUT /api/edge/{id}** - Update an existing edge
- **DELETE /api/edge/{id}** - Delete an edge

### Types Endpoints

- **GET /api/types/nodes** - Retrieve all available node types with styling properties
- **GET /api/types/edges** - Retrieve all available edge types with styling properties

## Swagger Documentation

The API includes comprehensive Swagger/OpenAPI documentation that provides:

- Interactive API documentation
- Ability to test API endpoints directly from the UI
- Parameter descriptions and sample request/response data
- Authentication information

To access the Swagger UI:

1. Start the application in development mode
2. Navigate to the root URL of the API service http://localhost:5447/index.html
3. The Swagger UI will be displayed automatically at the application's root

The Swagger documentation includes:

- API title: Modeler API
- Version: v1
- Description: Graph modeling API for creating and managing graph models
- Contact information for API support

The API documentation is generated from XML comments in the codebase, ensuring the documentation is always up-to-date with the implementation.

## Development

### Project Structure

- **ModelerAPI.ApiService** - Main API service with controllers and models
- **ModelerAPI.AppHost** - .NET Aspire host application
- **Frontend** - Web-based user interface

### Node and Edge Types

The application includes predefined node and edge types for various graph modeling scenarios:

#### Node Types by Category:

- **Plant**: Boiler, Pump, Furnace, HeatExchanger, Valve, Tank, Pipe, Sensor, ControlSystem, Turbine, Condenser, Filter, Compressor, CoolingTower
- **Random**: Person, Place, Thing, Concept
- **Star**: Hub, Satellite
- **Chain**: Chain

#### Edge Types by Category:

- **Plant**: FlowTo, ConnectedTo, ControlledBy, Controls, Monitors, Heats, Cools, Pressurizes, Filters, Supplies, ReceivesFrom, PumpsTo, RegulatesFlowTo
- **Random**: Related, Belongs, Contains, Depends
- **Chain**: Next

### ModelGenerator Strategies

The application supports multiple graph generation strategies:

- **PlantGraphStrategy**: Creates industrial plant simulations with appropriate components and connections
- Other strategies for generating different graph types (Random, Star, Chain)

### Configuration Classes

- **CosmosDbSettings** - Configuration for Cosmos DB and Gremlin connections
- **CorsSettings** - Configuration for CORS policies

### Adding New Features

To add a new feature:

1. Create appropriate models in the `Models` directory
2. Add necessary methods to the `ICosmosService` interface
3. Implement the methods in the `CosmosService` class
4. Create or update controllers to expose the functionality via API endpoints

  

   