'use strict';

/**
 * Converts a flat GitHub tree array into a nested folder structure JSON.
 * Input: [{ path: 'src/app.js', type: 'blob' }, ...]
 * Output: { name: 'root', type: 'directory', children: [...] }
 */
const buildFolderTree = (flatTree) => {
  const root = { name: 'root', type: 'directory', path: '', children: [] };
  const nodeMap = { '': root };

  for (const item of flatTree) {
    if (!item.path) continue;
    const parts = item.path.split('/');
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];

      if (!nodeMap[currentPath]) {
        const isFile = i === parts.length - 1 && item.type === 'blob';
        const node = {
          name: parts[i],
          path: currentPath,
          type: isFile ? 'file' : 'directory',
          ...(isFile ? { size: item.size } : { children: [] }),
        };
        nodeMap[currentPath] = node;
        nodeMap[parentPath].children.push(node);
      }
    }
  }

  return root;
};

module.exports = { buildFolderTree };
