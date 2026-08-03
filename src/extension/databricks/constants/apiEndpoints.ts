export const DatabricksApiEndpoints = {
    CURRENT_USER: "/api/2.0/preview/scim/v2/Me",
    CLUSTERS_LIST: "/api/2.1/clusters/list",
    COMMAND_EXECUTE: "/api/1.2/commands/execute",
    COMMAND_STATUS: "/api/1.2/commands/status",
    CREATE_CONTEXT: "/api/1.2/contexts/create",
    DESTROY_CONTEXT: "/api/1.2/contexts/destroy",
} as const;