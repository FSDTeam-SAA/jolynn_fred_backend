export const buildPublicProfileUrl = (username?: string) =>
  username ? `/${encodeURIComponent(username)}` : null;

export const buildLegacyProfileUrl = (
  businessOwnerId: string,
  serviceId?: string,
) => {
  const path = `/services/businesses/${businessOwnerId}`;
  return serviceId
    ? `${path}?serviceId=${encodeURIComponent(serviceId)}`
    : path;
};
