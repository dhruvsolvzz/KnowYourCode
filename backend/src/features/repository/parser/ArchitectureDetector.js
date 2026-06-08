'use strict';

/**
 * Detect the technology stack from file paths and package.json contents.
 */
const detectArchitecture = (flatTree, packageJsonContent = null) => {
  const paths = flatTree.map((f) => f.path.toLowerCase());
  const stack = {
    frontend: [],
    backend: [],
    database: [],
    testing: [],
  };

  // Parse package.json dependencies
  let deps = {};
  if (packageJsonContent) {
    try {
      const pkg = JSON.parse(packageJsonContent);
      deps = { ...pkg.dependencies, ...pkg.devDependencies };
    } catch (_) {}
  }

  const hasDep = (name) => name in deps;
  const hasPath = (pattern) => paths.some((p) => p.includes(pattern));

  // Frontend detection
  if (hasDep('react') || hasDep('react-dom')) stack.frontend.push('React');
  if (hasDep('next')) stack.frontend.push('Next.js');
  if (hasDep('vue')) stack.frontend.push('Vue');
  if (hasDep('svelte')) stack.frontend.push('Svelte');
  if (hasDep('vite')) stack.frontend.push('Vite');
  if (hasDep('tailwindcss')) stack.frontend.push('Tailwind CSS');
  if (hasDep('@reduxjs/toolkit') || hasDep('redux')) stack.frontend.push('Redux');
  if (hasDep('zustand')) stack.frontend.push('Zustand');
  if (hasDep('@tanstack/react-query')) stack.frontend.push('TanStack Query');
  if (hasDep('react-router-dom')) stack.frontend.push('React Router');
  if (hasDep('@reactflow/core') || hasDep('reactflow')) stack.frontend.push('React Flow');
  if (hasDep('three')) stack.frontend.push('Three.js');

  // Backend detection
  if (hasDep('express')) stack.backend.push('Express.js');
  if (hasDep('fastify')) stack.backend.push('Fastify');
  if (hasDep('koa')) stack.backend.push('Koa');
  if (hasDep('nestjs') || hasDep('@nestjs/core')) stack.backend.push('NestJS');
  if (hasDep('passport')) stack.backend.push('Passport.js');
  if (hasDep('jsonwebtoken')) stack.backend.push('JWT');
  if (hasDep('@google/generative-ai')) stack.backend.push('Gemini AI');
  if (hasDep('openai')) stack.backend.push('OpenAI');

  // Database detection
  if (hasDep('mongoose')) stack.database.push('MongoDB');
  if (hasDep('pg') || hasDep('postgres')) stack.database.push('PostgreSQL');
  if (hasDep('mysql2')) stack.database.push('MySQL');
  if (hasDep('prisma') || hasDep('@prisma/client')) stack.database.push('Prisma');
  if (hasDep('typeorm')) stack.database.push('TypeORM');
  if (hasDep('redis') || hasDep('ioredis')) stack.database.push('Redis');

  // Testing detection
  if (hasDep('jest')) stack.testing.push('Jest');
  if (hasDep('vitest')) stack.testing.push('Vitest');
  if (hasDep('mocha')) stack.testing.push('Mocha');
  if (hasDep('@testing-library/react')) stack.testing.push('React Testing Library');

  // Fallback: check file presence
  if (hasPath('vite.config') && !stack.frontend.includes('Vite')) stack.frontend.push('Vite');
  if (hasPath('next.config') && !stack.frontend.includes('Next.js')) stack.frontend.push('Next.js');

  return stack;
};

/**
 * Detect "important" files by path pattern.
 */
const IMPORTANT_PATTERNS = [
  { pattern: /^(src\/)?index\.(js|ts|jsx|tsx)$/, type: 'entry', role: 'Application entry point' },
  { pattern: /app\.(js|ts)$/, type: 'entry', role: 'Express app setup' },
  { pattern: /server\.(js|ts)$/, type: 'entry', role: 'Server entry point' },
  { pattern: /routes?\//i, type: 'route', role: 'API route handler' },
  { pattern: /controllers?\//i, type: 'controller', role: 'Request controller' },
  { pattern: /services?\//i, type: 'service', role: 'Business logic service' },
  { pattern: /models?\//i, type: 'model', role: 'Data model' },
  { pattern: /schemas?\//i, type: 'model', role: 'Schema definition' },
  { pattern: /middleware/i, type: 'config', role: 'Middleware' },
  { pattern: /config\//i, type: 'config', role: 'Configuration' },
  { pattern: /package\.json$/, type: 'config', role: 'Package manifest' },
  { pattern: /\.env\.example$/, type: 'config', role: 'Environment template' },
  { pattern: /dockerfile/i, type: 'config', role: 'Docker configuration' },
  { pattern: /\.(js|jsx|ts|tsx|py|go|java|rb|php)$/i, type: 'component', role: 'Source file' } // Fallback for all source files
];

const detectImportantFiles = (flatTree) => {
  const IGNORED_DIRS = ['node_modules', '.git', '.next', 'dist', 'build', '.cache', '.turbo', 'coverage', '__pycache__', '.vscode'];
  
  const files = flatTree.filter((f) => {
    if (f.type !== 'blob') return false;
    // Split path to check if any part is an ignored directory
    const pathParts = f.path.split(/[/\\]/);
    return !pathParts.some(part => IGNORED_DIRS.includes(part));
  });
  
  const important = [];

  for (const file of files) {
    for (const { pattern, type, role } of IMPORTANT_PATTERNS) {
      if (pattern.test(file.path)) {
        important.push({ path: file.path, type, role });
        break;
      }
    }
  }

  return important.slice(0, 300); // Cap increased to 300 for a more complete graph
};

module.exports = { detectArchitecture, detectImportantFiles };
