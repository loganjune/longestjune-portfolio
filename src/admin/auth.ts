// Sign-in for the editor: GitHub, through the sveltia-cms-auth helper on Cloudflare.
// The helper opens GitHub's sign-in page in a pop-up and hands the resulting token back here.
// The token lives in sessionStorage only, so closing the browser tab signs you out.

const KEY = 'lj-editor-token';

export function getToken(): string {
  try {
    return sessionStorage.getItem(KEY) || '';
  } catch {
    return '';
  }
}

export function setToken(token: string) {
  try {
    if (token) sessionStorage.setItem(KEY, token);
    else sessionStorage.removeItem(KEY);
  } catch {
    /* private mode: the token just isn't remembered */
  }
}

/** Opens the GitHub sign-in pop-up. Resolves with a token, or rejects with a readable message. */
export function login(authUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const base = authUrl.replace(/\/$/, '');
    const authOrigin = new URL(base).origin;
    const popup = window.open(
      `${base}/auth?provider=github&site_id=${encodeURIComponent(location.hostname)}&scope=repo`,
      'lj-auth',
      'width=600,height=720',
    );
    if (!popup) return reject(new Error('Your browser blocked the sign-in window. Allow pop-ups for this site and try again.'));

    const done = (fn: () => void) => {
      removeEventListener('message', onMsg);
      clearInterval(watch);
      fn();
    };
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== authOrigin || typeof e.data !== 'string') return;
      if (e.data === 'authorizing:github') {
        (e.source as Window | null)?.postMessage(e.data, e.origin);
        return;
      }
      const ok = e.data.match(/^authorization:github:success:(.+)$/s);
      const bad = e.data.match(/^authorization:github:error:(.+)$/s);
      if (ok) {
        let token = '';
        try {
          token = JSON.parse(ok[1]).token || '';
        } catch {
          /* fall through */
        }
        done(() => (token ? resolve(token) : reject(new Error('Sign-in didn’t work. Please try again.'))));
      } else if (bad) {
        let msg = 'Sign-in didn’t work. Please try again.';
        try {
          msg = JSON.parse(bad[1]).error || msg;
        } catch {
          /* keep default */
        }
        done(() => reject(new Error(msg)));
      }
    };
    addEventListener('message', onMsg);
    // If the person closes the pop-up without finishing, stop waiting.
    const watch = setInterval(() => {
      if (!popup.closed) return;
      clearInterval(watch);
      // A short wait, in case the success message is still on its way.
      setTimeout(() => done(() => reject(new Error('The sign-in window was closed.'))), 800);
    }, 600);
  });
}
