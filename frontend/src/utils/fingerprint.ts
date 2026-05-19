export const getDeviceFingerprint = (): string => {
  const navigator_info = window.navigator;
  const screen_info = window.screen;
  
  const rawFingerprint = [
    navigator_info.userAgent,
    navigator_info.language,
    screen_info.colorDepth,
    screen_info.width + 'x' + screen_info.height,
    navigator_info.platform || 'unknown',
  ].join('||');

  // Simple string hash algorithm for local execution simplicity and stability
  let hash = 0;
  for (let i = 0; i < rawFingerprint.length; i++) {
    const char = rawFingerprint.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return 'device_' + Math.abs(hash).toString(16);
};
