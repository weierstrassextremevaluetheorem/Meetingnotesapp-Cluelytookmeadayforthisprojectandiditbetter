export const IPC = {
  // Recording
  RECORDING_START: 'recording:start',
  RECORDING_STOP: 'recording:stop',
  RECORDING_STATUS: 'recording:status',
  TRANSCRIPT_DELTA: 'transcript:delta',
  TRANSCRIPT_COMPLETED: 'transcript:completed',
  NOTES_READY: 'notes:ready',
  NOTES_GENERATE: 'notes:generate',
  APP_ERROR: 'app:error',

  // Profiles
  PROFILES_LIST: 'profiles:list',
  PROFILES_GET: 'profiles:get',
  PROFILES_CREATE: 'profiles:create',
  PROFILES_UPDATE: 'profiles:update',
  PROFILES_DELETE: 'profiles:delete',

  // Sessions
  SESSIONS_LIST: 'sessions:list',
  SESSIONS_GET: 'sessions:get',
  SESSIONS_SEARCH: 'sessions:search',
  SESSIONS_EXPORT_MD: 'sessions:exportMd',
  SESSIONS_DELETE: 'sessions:delete',

  // Session Feedback
  SESSION_FEEDBACK: 'sessions:feedback',

  // Settings
  SETTINGS_GET_ALL: 'settings:getAll',
  SETTINGS_SET: 'settings:set',
  SETTINGS_GET_API_KEY: 'settings:getApiKey',

  // Window
  WINDOW_TOGGLE: 'window:toggle',
  WINDOW_COLLAPSE: 'window:collapse',
  WINDOW_CLOSE: 'window:close',

  // Terminology
  TERMINOLOGY_LIST: 'terminology:list',
  TERMINOLOGY_ADD: 'terminology:add',
  TERMINOLOGY_DELETE: 'terminology:delete',

  // Integrations
  SLACK_EXPORT: 'integrations:slack:export',
  NOTION_EXPORT: 'integrations:notion:export',

  // Audit
  AUDIT_LOG: 'audit:log'
} as const
