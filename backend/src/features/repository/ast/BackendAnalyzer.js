const traverse = require('@babel/traverse').default;
const AstParser = require('./AstParser');

class BackendAnalyzer {
  static analyze(code, filePath) {
    const ast = AstParser.parse(code);
    if (!ast) return null;

    const data = {
      path: filePath,
      routes: [], // { method, path, handler }
      dbCalls: [], // { model, operation }
    };

    traverse(ast, {
      CallExpression(path) {
        const callee = path.node.callee;

        // Detect router.post('/login', loginController)
        if (
          callee.type === 'MemberExpression' &&
          (callee.object.name === 'router' || callee.object.name === 'app') &&
          ['get', 'post', 'put', 'delete', 'patch'].includes(callee.property.name)
        ) {
          const args = path.node.arguments;
          if (args.length >= 2 && args[0].type === 'StringLiteral') {
            const method = callee.property.name.toUpperCase();
            const routePath = args[0].value;
            let handler = 'anonymous';
            
            const lastArg = args[args.length - 1];
            if (lastArg.type === 'Identifier') {
              handler = lastArg.name;
            } else if (lastArg.type === 'MemberExpression' && lastArg.property.type === 'Identifier') {
              handler = lastArg.property.name;
            }

            data.routes.push({
              method,
              path: routePath,
              handler
            });
          }
        }

        // Detect User.findOne(), prisma.user.findMany()
        if (
          callee.type === 'MemberExpression' &&
          callee.object.type === 'Identifier' &&
          // Common DB operations
          ['find', 'findOne', 'create', 'updateOne', 'findById', 'save', 'delete', 'findMany'].includes(callee.property.name)
        ) {
           data.dbCalls.push({
             model: callee.object.name,
             operation: callee.property.name
           });
        }
        
        // Prisma format: prisma.user.findMany
        if (
          callee.type === 'MemberExpression' &&
          callee.object.type === 'MemberExpression' &&
          callee.object.object.name === 'prisma'
        ) {
            data.dbCalls.push({
                model: callee.object.property.name,
                operation: callee.property.name
            });
        }
      }
    });

    return data;
  }
}

module.exports = BackendAnalyzer;
