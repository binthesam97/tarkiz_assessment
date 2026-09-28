import {
  withNativeFederation,
  fromPackageJson,
} from '@angular-architects/native-federation/config';

export default withNativeFederation({
  name: 'host',

  // Angular, RxJS and the @acme/shared workspace library (via its tsconfig path) are
  // shared as singletons, so the auth session is one instance across host and remotes.
  shared: fromPackageJson({
    singleton: true,
    strictVersion: true,
    requiredVersion: 'auto',
    build: 'package',
  })
    // Share every @angular/core entry point so host and remotes run a single Angular instance.
    .patch(['@angular/core'], { includeSecondaries: { keepAll: true } }),

  skip: [
    'rxjs/ajax',
    'rxjs/fetch',
    'rxjs/testing',
    'rxjs/webSocket',
  ],

  features: {
    denseChunking: true,
  },
});
