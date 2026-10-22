// Arranca los emuladores de Firebase (sin cuenta) conservando los datos entre reinicios.
// Uso: npm run emulators
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const datos = './.emulator-data';
const args = ['firebase', 'emulators:start', '--project', 'demo-pequenos-atletas', '--only', 'auth,firestore,storage,functions', `--export-on-exit=${datos}`];
if (existsSync(datos)) args.push(`--import=${datos}`);

// En Windows el primer arranque de las functions puede tardar más de 10 s.
const env = { ...process.env, FUNCTIONS_DISCOVERY_TIMEOUT: '60' };
const p = spawn('npx', args, { stdio: 'inherit', shell: true, env });
p.on('exit', (code) => process.exit(code ?? 0));
