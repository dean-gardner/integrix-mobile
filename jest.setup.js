jest.mock('@react-native-async-storage/async-storage', () => {
  const storage = {};
  return {
    __esModule: true,
    default: {
      getItem: (k) => Promise.resolve(storage[k] ?? null),
      setItem: (k, v) => {
        storage[k] = v;
        return Promise.resolve();
      },
      removeItem: (k) => {
        delete storage[k];
        return Promise.resolve();
      },
    },
  };
});
