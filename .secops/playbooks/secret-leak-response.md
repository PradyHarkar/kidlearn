# Secret Leak Response

1. Confirm the leak source and scope.
2. Rotate or revoke the exposed secret immediately.
3. Remove the secret from the repo, logs, and generated artifacts.
4. Purge the secret from any CI outputs, artifacts, and cached files.
5. Re-run the secops scan to confirm the exposure is gone.
6. Record the fix in the finding so the same leak cannot re-open silently.
