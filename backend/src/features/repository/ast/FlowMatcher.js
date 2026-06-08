class FlowMatcher {
  /**
   * Matches frontend API calls to backend routes.
   * @param {Array} frontendFiles - Results from FrontendAnalyzer
   * @param {Array} backendFiles - Results from BackendAnalyzer
   */
  static match(frontendFiles, backendFiles) {
    const edges = [];

    const allRoutes = backendFiles.flatMap(bf => 
      bf.routes.map(r => ({ ...r, file: bf.path }))
    );

    frontendFiles.forEach(ff => {
      ff.apiCalls.forEach(apiCall => {
        // Find matching route
        const match = allRoutes.find(r => {
          if (r.method !== apiCall.method) return false;
          // Simple heuristic: does the URL end with the route path?
          const cleanApiUrl = apiCall.url.split('?')[0].replace(/`/g, '');
          return cleanApiUrl.endsWith(r.path) || cleanApiUrl.includes(r.path);
        });

        if (match) {
          edges.push({
            source: ff.path,
            target: match.file,
            type: 'dataflow',
            label: `${apiCall.method} ${apiCall.url}`,
            payload: apiCall.payloadFields,
            handler: match.handler
          });
        }
      });
    });

    return edges;
  }
}

module.exports = FlowMatcher;
