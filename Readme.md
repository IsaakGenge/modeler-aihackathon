# ModelerAPI

ModelerAPI is a graph database modeling application built with .NET 9, using Azure Cosmos DB with Gremlin API for graph storage. The application provides a RESTful API to manage nodes and edges in a graph model.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [Installing Azure Cosmos DB Emulator](#installing-azure-cosmos-db-emulator)
  - [Configuring Cosmos DB Emulator for Gremlin API](#configuring-cosmos-db-emulator-for-gremlin-api)
  - [Configuration](#configuration)
  - [Running the Application](#running-the-application)
- [API Reference](#api-reference)
- [Development](#development)
- [License](#license)

## Features

- Create, read, update, and delete nodes in a graph database
- Create, read, update, and delete relationships (edges) between nodes
- Integration with Azure Cosmos DB for persistent storage
- Gremlin API for graph traversal and queries
- .NET Aspire distributed application architecture

## Architecture

The application consists of:

- **Backend API** (.NET 9 Web API)
  - RESTful API endpoints for node and edge management
  - Cosmos DB service abstraction for data access
  - Gremlin client integration for graph operations
  
- **Frontend** (NPM-based web application)
  - User interface for interacting with the graph model
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

1. The default connection strings for the Cosmos DB Emulator are already configured in `CosmosService.cs`
   - The default endpoint is `https://localhost:8081`
   - The default master key is `C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==`
   - The Gremlin connection is configured to use port 65400 and database path `/dbs/db1/colls/coll1`

2. If you used different database or container names, update the connection settings in `CosmosService.cs`

3. Set the environment variable `ASPIRE_ALLOW_UNSECURED_TRANSPORT=true` for local development:
   - In Windows, run Command Prompt as Administrator and enter:
      setx ASPIRE_ALLOW_UNSECURED_TRANSPORT true

      
### Running the Application

1. Clone this repository
2. Navigate to the project directory
3. Ensure the Cosmos DB Emulator is running (check the notification icon in your system tray)
4. Run the application using .NET Aspire:
   dotnet run --project Backend/ModelerAPI.AppHost

   
## API Reference

### Node Endpoints

- **GET /api/node** - Retrieve all nodes
- **POST /api/node** - Create a new node
  { "id": "node1", "name": "Example Node", "nodeType": "custom" }
- - **PUT /api/node/{id}** - Update an existing node
- **DELETE /api/node/{id}** - Delete a node

### Edge Endpoints

- **GET /api/edge** - Retrieve all edges
- **POST /api/edge** - Create a new edge between nodes
- **PUT /api/edge/{id}** - Update an existing edge
- **DELETE /api/edge/{id}** - Delete an edge

## Development

### Project Structure

- **ModelerAPI.ApiService** - Main API service with controllers and models
- **ModelerAPI.AppHost** - .NET Aspire host application
- **Frontend** - Web-based user interface

### Adding New Features

To add a new feature:

1. Create appropriate models in the `Models` directory
2. Add necessary methods to the `ICosmosService` interface
3. Implement the methods in the `CosmosService` class
4. Create or update controllers to expose the functionality via API endpoints
