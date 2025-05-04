# OT-SQL-DATA-GRID
## Introduction
OT-SQL-DATA-GRID is a collaborative data-grid editor designed to support real-time collaborative operations. This project allows multiple users to simultaneously edit a data grid, with changes being synchronized across all clients in real-time. The editor is built with a focus on providing a seamless and efficient collaborative experience.
[Online demo is here.](http://124.223.88.106/)

## Purpose
This project is created for learning purposes and is inspired by [ot.js](https://github.com/Operational-Transformation/operational-transformation.github.com). It aims to explore and demonstrate the principles of operational transformation (OT) in a practical application, providing insights into building collaborative editing tools.

## Features
- Real-time collaborative editing
- Support for adding, deleting, and updating rows and columns
- Synchronization of changes across multiple clients

## Roadmap
- [ ] Complete remaining tests
- [ ] Add turborepo
- [ ] Implement OPFS
- [ ] Selection functionality
- [ ] Rewrite sql-parse in TypeScript and apply it to the project
- [ ] Add other field types and controls

## Project Structure
The project is organized into two main applications:

- Backend: Handles the server-side logic and synchronization of operations.
- Frontend: Provides the user interface and client-side logic for the data-grid editor.

## Getting Started
### Installation
Clone the repository:
```
git clone git@github.com:Saifa-96/ot-sql-data-grid.git
```

Install dependencies:
```
pnpm i
```

Build packages:
```
pnpm build:packages
```

### Development
Start the backend:
```
# In the project root
pnpm dev:server
```

Start the frontend:
```
# In the project root
pnpm dev:client
```