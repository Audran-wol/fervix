module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
          alias: {
            '@': './src',
            '@components': './src/components',
            '@screens': './src/screens',
            '@assets': './src/assets',
            '@theme': './src/theme',
            '@state': './src/state',
            '@i18n': './src/i18n',
            '@navigation': './src/navigation',
          },
        },
      ],
    ],
  };
};
