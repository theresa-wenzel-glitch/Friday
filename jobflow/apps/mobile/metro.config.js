/**
 * Metro-Konfiguration fuer das Monorepo.
 *
 * Ohne diese Einstellungen findet Metro die Pakete unter packages/ nicht:
 * pnpm legt Abhaengigkeiten als Symlinks ab, und Metro sucht standardmaessig
 * nur im node_modules der App.
 */
const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Aenderungen an den geteilten Paketen sollen die App neu laden.
config.watchFolders = [workspaceRoot];

// Erst im eigenen node_modules suchen, dann im Wurzelverzeichnis.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// pnpm-Symlinks nicht aufloesen - sonst liegt derselbe Code doppelt im Bundle.
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
