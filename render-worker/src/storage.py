import boto3
from botocore.config import Config


def upload(path, job_id, run_id, cfg):
    missing = [k for k in ("endpoint", "bucket", "key_id", "secret") if not cfg.get(k)]
    if missing:
        raise RuntimeError(f"Storage not configured (missing {', '.join(missing)})")
    s3 = boto3.client("s3", endpoint_url=cfg["endpoint"], region_name=cfg["region"], aws_access_key_id=cfg["key_id"],
                      aws_secret_access_key=cfg["secret"], config=Config(retries={"max_attempts": 5, "mode": "standard"}))
    key = f"{cfg['prefix']}/{job_id}/{run_id}.mp4"
    s3.upload_file(path, cfg["bucket"], key, ExtraArgs={"ContentType": "video/mp4"})
    s3.head_object(Bucket=cfg["bucket"], Key=key)  # confirm it is really stored
    return f"s3://{cfg['bucket']}/{key}"