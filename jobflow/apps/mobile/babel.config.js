/**
 * Babel-Konfiguration.
 *
 * babel-preset-expo bringt alles mit, was Expo Router und React Native
 * brauchen - eigene Plugins sind hier bewusst nicht noetig.
 */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { unstable_transformImportMeta: true }]],
  };
};
