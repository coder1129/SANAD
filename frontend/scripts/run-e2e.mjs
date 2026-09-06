import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const root = process.cwd();

try {
  const existing = await fetch('http://127.0.0.1:3100/robots.txt');
  if (existing) {
    throw new Error(
      'Port 3100 is already in use. Stop that server before running E2E tests.',
    );
  }
} catch (error) {
  if (error instanceof Error && error.message.startsWith('Port 3100')) {
    throw error;
  }
}

const server = spawn(
  process.execPath,
  [resolve(root, 'node_modules/next/dist/bin/next'), 'start', '--port', '3100'],
  {
    cwd: root,
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  },
);

server.stdout.pipe(process.stdout);
server.stderr.pipe(process.stderr);

let stopping = false;

async function stopServer() {
  if (stopping) return;
  stopping = true;

  if (process.platform === 'win32') {
    const netstat = spawn('netstat', ['-ano'], {
      stdio: ['ignore', 'pipe', 'ignore'],
      windowsHide: true,
    });
    let output = '';
    netstat.stdout.setEncoding('utf8');
    netstat.stdout.on('data', (chunk) => {
      output += chunk;
    });
    await once(netstat, 'exit');

    const listenerPattern =
      /^\s*TCP\s+\S+:3100\s+\S+\s+LISTENING\s+(\d+)\s*$/gim;
    const listenerPids = new Set(
      [...output.matchAll(listenerPattern)].map((match) => match[1]),
    );

    for (const pid of listenerPids) {
      try {
        process.kill(Number(pid), 'SIGTERM');
        continue;
      } catch {
        // Fall back to taskkill when direct termination is unavailable.
      }

      const killer = spawn('taskkill', ['/pid', pid, '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true,
      });
      await once(killer, 'exit');
    }

    // Unpipe before destroying child streams; otherwise Node may report an
    // unhandled ERR_STREAM_PREMATURE_CLOSE after Playwright has already passed.
    server.stdout.unpipe(process.stdout);
    server.stderr.unpipe(process.stderr);
    server.stdout.destroy();
    server.stderr.destroy();
    return;
  }

  if (server.pid !== undefined) {
    try {
      process.kill(-server.pid, 'SIGTERM');
      await Promise.race([once(server, 'exit'), delay(5_000)]);
      if (server.exitCode === null) process.kill(-server.pid, 'SIGKILL');
    } catch {
      // The process group already exited.
    }
  }

  server.stdout.unpipe(process.stdout);
  server.stderr.unpipe(process.stderr);
  server.stdout.destroy();
  server.stderr.destroy();
}

async function waitForServer() {
  const deadline = Date.now() + 120_000;

  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(
        `Next.js exited before E2E tests (code ${server.exitCode}).`,
      );
    }

    try {
      const response = await fetch('http://127.0.0.1:3100/robots.txt');
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }

    await delay(250);
  }

  throw new Error('Timed out waiting for Next.js on port 3100.');
}

try {
  await waitForServer();

  const runner = spawn(
    process.execPath,
    [resolve(root, 'node_modules/@playwright/test/cli.js'), 'test'],
    { cwd: root, stdio: 'inherit', windowsHide: true },
  );
  const [code] = await once(runner, 'exit');
  process.exitCode = typeof code === 'number' ? code : 1;
} finally {
  await stopServer();
}
