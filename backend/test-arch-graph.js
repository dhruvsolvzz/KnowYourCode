require('dotenv').config();
const mongoose = require('mongoose');
const { buildArchitectureGraph } = require('./src/features/graph/builders/ArchitectureGraphBuilder');
const Repository = require('./src/shared/database/models/Repository.model');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  // Find a repo with astData
  const repo = await Repository.findOne();
  if (!repo) {
    console.log('No repo found with astData');
    process.exit(0);
  }
  
  const graph = buildArchitectureGraph(repo.importantFiles, repo.importMap, repo.astData);
  console.log('Nodes count:', graph.nodes.length);
  console.log('Edges count:', graph.edges.length);
  console.log('Sample edges:', graph.edges.slice(0, 5));
  process.exit(0);
}

test().catch(console.error);
