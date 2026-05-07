const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const metroResolver = require("metro-resolver");

const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const origin = context.originModulePath ?? "";
  const normalizedOrigin = origin.replace(/\\/g, "/");
  const inLodash =
    normalizedOrigin.includes("/node_modules/lodash/") ||
    normalizedOrigin.includes("/node_modules\\lodash\\");

  if (
    typeof moduleName === "string" &&
    moduleName.startsWith("./") &&
    path.extname(moduleName) === "" &&
    inLodash
  ) {
    return metroResolver.resolve(context, `${moduleName}.js`, platform);
  }

  return metroResolver.resolve(context, moduleName, platform);
};

module.exports = config;
