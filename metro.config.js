const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable hot reloading
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Enable hot reloading for all file types
      if (req.url && req.url.includes('hot')) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      }
      return middleware(req, res, next);
    };
  },
};

// Add support for additional file extensions
config.resolver.assetExts.push(
  // Add any additional asset extensions you need
  'png',
  'jpg',
  'jpeg',
  'gif',
  'svg',
  'json'
);

// Add support for additional source extensions
config.resolver.sourceExts.push(
  'js',
  'jsx',
  'ts',
  'tsx',
  'json'
);

module.exports = config;
