const TOOL_SCOPES = {
  get_emails: 'gmail.read',
  search_emails: 'gmail.read',
  send_email: 'gmail.send',
  get_linkedin_messages: 'linkedin.read',
  get_youtube_updates: 'youtube.read',
  manage_calendar: 'calendar.write',
  search_drive: 'drive.read',
  get_file_content: 'drive.read',
  get_github_activity: 'github.repo'
};

/**
 * Checks if the user has authorized a specific tool for execution
 */
async function checkToolPermission(toolName, req) {
  const { Permission } = req.models;

  let perm = await Permission.findOne({ where: { toolName } });
  
  if (!perm) {
    // Strict security: No unrestricted tool access. Defaults to disabled.
    console.log(`[PermissionManager] Restricting tool "${toolName}" by default.`);
    const scope = TOOL_SCOPES[toolName] || 'custom';
    perm = await Permission.create({
      toolName,
      scope,
      enabled: false
    });
  }

  return perm.enabled;
}

/**
 * Grants/enables permission for a tool
 */
async function enableToolPermission(toolName, req) {
  const { Permission } = req.models;
  const scope = TOOL_SCOPES[toolName] || 'custom';
  await Permission.upsert({
    toolName,
    scope,
    enabled: true
  });
  console.log(`[PermissionManager] Granted permission for tool: ${toolName}`);
}

/**
 * Revokes/disables permission for a tool
 */
async function disableToolPermission(toolName, req) {
  const { Permission } = req.models;
  const scope = TOOL_SCOPES[toolName] || 'custom';
  await Permission.upsert({
    toolName,
    scope,
    enabled: false
  });
  console.log(`[PermissionManager] Revoked permission for tool: ${toolName}`);
}

module.exports = {
  checkToolPermission,
  enableToolPermission,
  disableToolPermission,
  TOOL_SCOPES
};
