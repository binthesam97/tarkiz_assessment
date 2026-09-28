// Runtime configuration. Local defaults; in the deployed container this file is regenerated
// from environment variables at start-up (see docker/entrypoint.sh), so one build serves every environment.
window.__APP_CONFIG__ = {
  apiUrl: 'http://localhost:3000/api',
  wsUrl: 'ws://localhost:3000/ws',
  assessmentUrl: 'http://localhost:4200',
};
