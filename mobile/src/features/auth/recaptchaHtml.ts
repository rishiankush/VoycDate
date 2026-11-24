import type { FirebaseOptions } from 'firebase/app';

const FIREBASE_CDN_VERSION = '13.1.0';

export function recaptchaHtml(config: FirebaseOptions, languageCode: string) {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <style>
      html, body { margin: 0; height: 100%; background: transparent; }
      body { display: flex; align-items: center; justify-content: center; }
    </style>
  </head>
  <body>
    <div id="recaptcha-container"></div>
    <script type="module">
      const post = (message) => window.ReactNativeWebView.postMessage(JSON.stringify(message));

      // Invisible reCAPTCHA only renders its challenge frame when Google wants a puzzle solved.
      let challengeShown = false;
      const challengeWatcher = setInterval(() => {
        const frame = document.querySelector('iframe[src*="bframe"]');
        let node = frame;
        while (node && node !== document.body) {
          const style = getComputedStyle(node);
          if (style.visibility === 'hidden' || style.opacity === '0' || style.display === 'none') return;
          node = node.parentElement;
        }
        if (frame && !challengeShown) {
          challengeShown = true;
          post({ type: 'challenge' });
        }
      }, 250);

      try {
        const { initializeApp } = await import('https://www.gstatic.com/firebasejs/${FIREBASE_CDN_VERSION}/firebase-app.js');
        const { getAuth, RecaptchaVerifier } = await import('https://www.gstatic.com/firebasejs/${FIREBASE_CDN_VERSION}/firebase-auth.js');
        const auth = getAuth(initializeApp(${JSON.stringify(config)}));
        auth.languageCode = ${JSON.stringify(languageCode)};
        const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          'expired-callback': () => post({ type: 'expired' }),
        });
        const token = await verifier.verify();
        post({ type: 'token', token });
      } catch (error) {
        post({ type: 'error', message: String(error && error.message ? error.message : error) });
      } finally {
        clearInterval(challengeWatcher);
      }
    </script>
  </body>
</html>`;
}
