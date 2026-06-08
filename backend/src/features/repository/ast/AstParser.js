const parser = require('@babel/parser');

class AstParser {
  static parse(code) {
    try {
      return parser.parse(code, {
        sourceType: 'module',
        plugins: [
          'jsx',
          'typescript',
          'decorators-legacy',
          'classProperties'
        ],
        errorRecovery: true
      });
    } catch (err) {
      // console.warn('AST Parse error', err.message);
      return null;
    }
  }
}

module.exports = AstParser;
