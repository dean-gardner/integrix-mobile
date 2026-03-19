module.exports = {
  preset: 'react-native',
  setupFiles: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(@react-navigation|react-native|@react-native|react-native-screens|react-native-safe-area-context|react-redux|@reduxjs)/)',
  ],
};
