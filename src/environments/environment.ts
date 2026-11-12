// Development settings. `ionic serve` (the browser and the phone) uses this file.
//
// The API address is built from the address the page was opened on:
//   - Open the app at http://localhost:8100      -> API at http://localhost:8000/api
//   - Open the app at http://192.168.8.39:8100   -> API at http://192.168.8.39:8000/api
// So the same build works on the PC (localhost), on the phone over USB (adb reverse),
// and on the phone over Wi-Fi (your PC's LAN IP), with no editing.
const host = window.location.hostname || 'localhost';

export const environment = {
  production: false,
  apiBase: `http://${host}:8000/api`,
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.