import requests


class AppError(Exception):
    pass


class AppApi:
    """Calls the Krush Studio `renderWorker` backend function with the single-job token."""

    def __init__(self, app_url, job_id, token, run_id):
        self.url = f"{app_url}/functions/renderWorker"
        self.base = {"job_id": job_id, "token": token, "runpod_id": run_id}

    def call(self, action, **kw):
        r = requests.post(self.url, json={"action": action, **self.base, **kw}, timeout=30)
        if r.status_code >= 400:
            raise AppError(f"{action} rejected ({r.status_code}): {r.text[:300]}")
        return r.json()

    def progress(self, stage, pct, message):
        try:
            self.call("progress", stage=stage, progress=round(pct, 1), message=message)
        except Exception as e:  # progress is best-effort; never kill a render over it
            print(f"progress update failed: {e}")