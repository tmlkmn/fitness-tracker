// Learn more: https://docs.expo.dev/guides/customizing-metro
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const sharedRoot = path.resolve(projectRoot, "../../packages/shared");

const config = getDefaultConfig(projectRoot);

// apps/mobile is deliberately NOT an npm workspace: it keeps its own install
// so React Native never shares a dependency tree (or a React version) with the
// web app. Metro therefore doesn't see the monorepo on its own:
//  - watch packages/shared, which node_modules/@fitmusc/shared symlinks to;
//  - resolve the shared package's bare imports (zod, …) as if they came from
//    this app, so they use apps/mobile/node_modules and never the repo root's
//    web install (outside the watched folders, and possibly other versions).
config.watchFolders = [sharedRoot];

const normalize = (p) => (process.platform === "win32" ? p.toLowerCase() : p);
const sharedPrefix = normalize(sharedRoot + path.sep);
const appEntry = path.join(projectRoot, "package.json");
const upstreamResolve = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const isBare = !moduleName.startsWith(".") && !path.isAbsolute(moduleName);
  const fromShared = normalize(context.originModulePath).startsWith(sharedPrefix);
  const ctx = isBare && fromShared ? { ...context, originModulePath: appEntry } : context;
  return upstreamResolve
    ? upstreamResolve(ctx, moduleName, platform)
    : context.resolveRequest(ctx, moduleName, platform);
};

module.exports = config;
