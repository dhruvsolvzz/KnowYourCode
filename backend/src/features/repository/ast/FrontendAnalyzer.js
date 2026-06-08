const traverse = require('@babel/traverse').default;
const AstParser = require('./AstParser');

class FrontendAnalyzer {
  static analyze(code, filePath) {
    const ast = AstParser.parse(code);
    if (!ast) return null;

    const data = {
      path: filePath,
      apiCalls: [], // { method, url, payloadFields }
      stateOps: [], // { type: 'dispatch' | 'setState', action: string }
    };

    traverse(ast, {
      CallExpression(path) {
        const callee = path.node.callee;
        
        // Detect axios.post('/api/something', { email, password })
        if (
          callee.type === 'MemberExpression' &&
          callee.object.name === 'axios' &&
          ['post', 'get', 'put', 'patch', 'delete'].includes(callee.property.name)
        ) {
          const args = path.node.arguments;
          if (args.length > 0 && (args[0].type === 'StringLiteral' || args[0].type === 'TemplateLiteral')) {
            let url = '';
            if (args[0].type === 'StringLiteral') url = args[0].value;
            else if (args[0].type === 'TemplateLiteral') {
              url = args[0].quasis.map(q => q.value.raw).join('${}');
            }

            let payloadFields = [];
            if (args.length > 1 && args[1].type === 'ObjectExpression') {
              payloadFields = args[1].properties
                .filter(p => p.key && p.key.name)
                .map(p => p.key.name);
            } else if (args.length > 1 && args[1].type === 'Identifier') {
                payloadFields.push(args[1].name);
            }

            data.apiCalls.push({
              method: callee.property.name.toUpperCase(),
              url,
              payloadFields
            });
          }
        }
        // Detect dispatch(login(user))
        else if (callee.type === 'Identifier' && callee.name === 'dispatch') {
          const args = path.node.arguments;
          if (args.length > 0 && args[0].type === 'CallExpression') {
            data.stateOps.push({
              type: 'dispatch',
              action: args[0].callee.name || 'unknown'
            });
          }
        }
      }
    });

    return data;
  }
}

module.exports = FrontendAnalyzer;
