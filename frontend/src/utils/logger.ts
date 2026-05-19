export const logger = {
  info: (msg: string, ...args: any[]) => {
    if (import.meta.env.MODE === 'development') {
      console.log(`[INFO] ${msg}`, ...args);
    }
  },
  error: (msg: string, ...args: any[]) => {
    console.error(`[ERROR] ${msg}`, ...args);
  },
  warn: (msg: string, ...args: any[]) => {
    console.warn(`[WARN] ${msg}`, ...args);
  },
};
