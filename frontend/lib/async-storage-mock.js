// Mock for @react-native-async-storage/async-storage in browser builds.
// MetaMask SDK imports this at module level; aliasing to this file
// prevents "Module not found" warnings in Next.js webpack.
const AsyncStorage = {
  getItem: () => Promise.resolve(null),
  setItem: () => Promise.resolve(),
  removeItem: () => Promise.resolve(),
  clear: () => Promise.resolve(),
  getAllKeys: () => Promise.resolve([]),
  multiGet: () => Promise.resolve([]),
  multiSet: () => Promise.resolve(),
  multiRemove: () => Promise.resolve(),
};

module.exports = AsyncStorage;
module.exports.default = AsyncStorage;
