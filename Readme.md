dotnet run --project Backend/ModelerAPI.AppHost
# ModelerAPI

ModelerAPI is a graph database modeling application built with .NET 9, using Azure Cosmos DB with Gremlin API for graph storage. The application provides a RESTful API to manage nodes and edges in a graph model.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
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

### Configuration

1. Install the Azure Cosmos DB Emulator
2. Update the Cosmos DB connection settings in `CosmosService.cs` with your emulator key
3. Set the environment variable `ASPIRE_ALLOW_UNSECURED_TRANSPORT=true` for local development

### Running the Application

1. Clone this repository
2. Navigate to the project directory
3. Start the Cosmos DB Emulator
4. Run the application using .NET Aspire: dotnet run --project Backend/ModelerAPI.AppHost



## API Reference

### Node Endpoints

- **GET /api/node** - Retrieve all nodes
- **POST /api/node** - Create a new node
  { "id": "node1", "name": "Example Node", "nodeType": "custom" }


  - **PUT /api/node/{id}** - Update an existing node
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

