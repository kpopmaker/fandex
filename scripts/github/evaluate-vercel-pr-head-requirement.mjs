import fs from 'node:fs';

function usage(message) {
  if (message) process.stderr.write(message + '\n');
  process.stderr.write(
    'Usage: node scripts/github/evaluate-vercel-pr-head-requirement.mjs '
      + '--head-ref <branch> --config-path <vercel.json>\n',
  );
  process.exit(2);
}

export function evaluateVercelGitDeploymentRequirement(input) {
  const headRef =
    typeof input?.headRef === 'string' ? input.headRef.trim() : '';
  if (!headRef) {
    return Object.freeze({
      required: true,
      reason: 'head-ref-invalid',
      source: 'fail-closed',
    });
  }

  const config = input?.config;
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return Object.freeze({
      required: true,
      reason: 'config-invalid',
      source: 'fail-closed',
    });
  }

  const git = config.git;
  if (!git || typeof git !== 'object' || Array.isArray(git)) {
    return Object.freeze({
      required: true,
      reason: 'deployment-policy-unspecified',
      source: 'vercel-default',
    });
  }

  const deploymentEnabled = git.deploymentEnabled;

  if (typeof deploymentEnabled === 'boolean') {
    return Object.freeze({
      required: deploymentEnabled,
      reason: deploymentEnabled
        ? 'deployment-enabled-global'
        : 'deployment-disabled-global',
      source: 'vercel-json',
    });
  }

  if (
    !deploymentEnabled
    || typeof deploymentEnabled !== 'object'
    || Array.isArray(deploymentEnabled)
  ) {
    return Object.freeze({
      required: true,
      reason: 'deployment-policy-unspecified',
      source: 'vercel-default',
    });
  }

  const exact = deploymentEnabled[headRef];
  if (typeof exact === 'boolean') {
    return Object.freeze({
      required: exact,
      reason: exact
        ? 'deployment-enabled-exact-ref'
        : 'deployment-disabled-exact-ref',
      source: 'vercel-json',
    });
  }

  const wildcard = deploymentEnabled['*'];
  if (typeof wildcard === 'boolean') {
    return Object.freeze({
      required: wildcard,
      reason: wildcard
        ? 'deployment-enabled-wildcard'
        : 'deployment-disabled-wildcard',
      source: 'vercel-json',
    });
  }

  return Object.freeze({
    required: true,
    reason: 'deployment-policy-unspecified',
    source: 'vercel-default',
  });
}

function parseCli(argv) {
  let headRef = '';
  let configPath = '';
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--head-ref') {
      headRef = argv[index + 1] ?? '';
      index += 1;
      continue;
    }
    if (arg === '--config-path') {
      configPath = argv[index + 1] ?? '';
      index += 1;
      continue;
    }
    usage('Unknown argument: ' + arg);
  }
  if (!headRef || !configPath) usage('Both arguments are required.');
  return { headRef, configPath };
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  const { headRef, configPath } = parseCli(process.argv);
  let config;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    config = null;
  }

  process.stdout.write(
    JSON.stringify(
      evaluateVercelGitDeploymentRequirement({ headRef, config }),
    ) + '\n',
  );
}
