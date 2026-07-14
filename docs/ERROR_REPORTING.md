# RefreeG Alert error reporting

The live RefreeG application reports uncaught browser errors and unhandled
server request errors to RefreeG Alert.

Configure these server-only environment variables in RefreeG production:

```env
REFREEG_ALERT_URL=https://your-refreeg-alert-host.example
REFREEG_REPORTER_KEY=use-the-same-random-secret-as-refreeg-alert
```

Configure the same `REFREEG_REPORTER_KEY` in RefreeG Alert. Never prefix this
variable with `NEXT_PUBLIC_`; browser reports go through the same-origin
`/api/error-report` route so the secret remains on the server.

Browser reports are schema validated, restricted to same-origin requests,
rate limited, deduplicated in the browser, and stripped of query parameters.
The Next.js instrumentation hook reports unhandled server request errors.
