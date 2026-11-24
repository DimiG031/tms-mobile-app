declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_API_URL?: string;
    EXPO_PUBLIC_GPS_EXPO_FETCH?: string;
  }
}

declare const process: {
  env: NodeJS.ProcessEnv;
};
