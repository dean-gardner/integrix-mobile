import * as Keychain from 'react-native-keychain';

const SERVICE = 'dean_gardner.auth';

export async function getToken(): Promise<string | null> {
  try {
    const creds = await Keychain.getGenericPassword({ service: SERVICE });
    return creds ? creds.password : null;
  } catch {
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  await Keychain.setGenericPassword('token', token, { service: SERVICE });
}

export async function removeToken(): Promise<void> {
  await Keychain.resetGenericPassword({ service: SERVICE });
}
