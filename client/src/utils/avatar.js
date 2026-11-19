const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export const getAvatarSource = (profilePicture) => {
  if (!profilePicture) return undefined;

  try {
    const apiOrigin = new URL(API_URL).origin;
    return new URL(profilePicture, `${apiOrigin}/`).toString();
  } catch {
    return profilePicture;
  }
};
