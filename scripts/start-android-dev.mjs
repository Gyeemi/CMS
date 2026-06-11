import { spawn, execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const EXPO_PORTS = [8081, 19000, 19001, 19002];

function findAdbPath() {
  const sdkRoot = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (!sdkRoot) return null;

  const adbName = process.platform === 'win32' ? 'adb.exe' : 'adb';
  const adbPath = join(sdkRoot, 'platform-tools', adbName);
  return existsSync(adbPath) ? adbPath : null;
}

function forwardAndroidPorts(adbPath) {
  let forwarded = 0;

  for (const port of EXPO_PORTS) {
    try {
      execSync(`"${adbPath}" reverse tcp:${port} tcp:${port}`, { stdio: 'ignore' });
      forwarded += 1;
    } catch {
      // Device may be on Wi-Fi only; forwarding is optional.
    }
  }

  return forwarded;
}

function startExpo(mode) {
  const args = ['expo', 'start', '--android', mode === 'tunnel' ? '--tunnel' : '--lan'];
  const child = spawn('npx', args, {
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });

  child.on('exit', (code) => process.exit(code ?? 0));
}

const mode = process.argv.includes('--tunnel') ? 'tunnel' : 'lan';
const adbPath = findAdbPath();

if (adbPath) {
  try {
    const devicesOutput = execSync(`"${adbPath}" devices`, { encoding: 'utf8' });
    const hasDevice = devicesOutput
      .split('\n')
      .slice(1)
      .some((line) => line.trim().endsWith('device'));

    if (hasDevice) {
      const forwarded = forwardAndroidPorts(adbPath);
      if (forwarded > 0) {
        console.log(`Android port forwarding enabled (${forwarded} ports).`);
      }
    } else {
      console.warn('No Android device detected over USB. Wi-Fi/tunnel mode will be used.');
    }
  } catch {
    console.warn('ADB found but port forwarding failed.');
  }
} else if (mode === 'lan') {
  console.warn(
    'ANDROID_HOME is not set or adb was not found.\n' +
      'If the phone cannot reach your PC, run: npm run start:tunnel',
  );
}

startExpo(mode);
