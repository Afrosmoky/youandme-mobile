// Minimal ambient declaration for the `process` global. React Native exposes
// `process.env` at runtime but ships no TS types for it, and we read
// `JAITY_API_URL` in src/api/client.ts. @types/node is intentionally absent.
declare const process: {
  env: { [key: string]: string | undefined };
};
