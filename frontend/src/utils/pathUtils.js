import routeParentMap from './routeParentMap';

export const getStaticPath = (path) => {
  const matchedPrefix = Object.keys(routeParentMap).find((prefix) =>
    path.startsWith(prefix)
  );
  return matchedPrefix || path;
};

export const getEffectivePath = (path) => {
  const staticPath = getStaticPath(path);
  return routeParentMap[staticPath] || staticPath;
};
