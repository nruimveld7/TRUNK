import net from 'node:net';
import { getConfig } from './config';

const clean = (value: string) => value.replace(/[\r\n]/g, '').trim();

export async function sendAccessNotification(args: {
  recipient: string | null;
  displayName: string;
  role: 'Maintainer' | null;
  siteName: string;
}): Promise<void> {
  const config = getConfig();
  const recipient = clean(config.EMAIL_RECIPIENT_OVERRIDE || args.recipient || '');
  const sender = clean(config.SMTP_MAIL_FROM);
  if (!config.SMTP_RELAY_HOST || !recipient || !sender) return;
  const subject = args.role
    ? `${args.siteName} Maintainer access granted`
    : `${args.siteName} Maintainer access removed`;
  const text = args.role
    ? `Hello ${args.displayName},\n\nYour ${args.siteName} access level is now ${args.role}.`
    : `Hello ${args.displayName},\n\nYour ${args.siteName} access has been removed.`;
  const socket = net.createConnection({ host: config.SMTP_RELAY_HOST, port: 25 });
  socket.setTimeout(10_000);
  const read = () =>
    new Promise<string>((resolve, reject) => {
      const onData = (data: Buffer) => {
        const response = data.toString('utf8');
        if (/^\d{3}[ -]/.test(response)) {
          cleanup();
          resolve(response);
        }
      };
      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };
      const cleanup = () => {
        socket.off('data', onData);
        socket.off('error', onError);
      };
      socket.on('data', onData);
      socket.on('error', onError);
    });
  const command = async (value: string) => {
    socket.write(`${value}\r\n`);
    return read();
  };
  try {
    await read();
    await command('EHLO trunk.local');
    await command(`MAIL FROM:<${sender}>`);
    await command(`RCPT TO:<${recipient}>`);
    await command('DATA');
    socket.write(
      `From: ${sender}\r\nTo: ${recipient}\r\nSubject: ${clean(subject)}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${text}\r\n.\r\n`
    );
    await read();
    await command('QUIT');
  } finally {
    socket.end();
  }
}
