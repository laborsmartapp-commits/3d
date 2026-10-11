# Krush Studio — RunPod render worker

Turns a recorded Krush Studio take into an H.264 MP4 master on a RunPod GPU.

```
Studio "Render"  ->  submitRenderJob (Base44)  ->  RunPod /v2/{endpoint}/run
RunPod worker    ->  renderWorker claim  ->  headless Chromium (GPU WebGL) opens {APP_URL}/render
/render page     ->  renderWorker bundle (take, world snapshot, all PerformanceChunks)
                 ->  rebuilds the stage, freezes time, exposes frame(i) at t = i / fps
worker           ->  frame(i) + PNG capture  ->  FFmpeg libx264 MP4  ->  ffprobe check  ->  S3/R2 upload
RunPod           ->  renderWebhook  ->  status re-fetched from RunPod  ->  RenderJob completed
```

## Layout
- `Dockerfile`: CUDA 12.4 runtime + Python + Playwright Chromium + FFmpeg + NVIDIA EGL/Vulkan ICDs
- `src/handler.py`: RunPod handler (validation, claim, render, encode, verify, upload)
- `src/browser.py`: GPU Chromium launcher; rejects software WebGL unless `ALLOW_SOFTWARE_GL=1`
- `src/renderer.py`: frame-by-frame page controller
- `src/encoder.py`: FFmpeg pipeline + ffprobe
- `src/storage.py`: S3 / Cloudflare R2 upload
- `src/app_api.py`: calls to the app's `renderWorker` function
- `tests/smoke_scene.html`, `tests/smoke_test.py`, `tests/test_input.json`: Three.js smoke test
- `github-workflow.yml`: CI that builds, smoke-tests and publishes to GHCR

## 1. Build and publish the image
Pick one of these:

**A. GitHub Actions (recommended).** Copy `render-worker/github-workflow.yml` to `.github/workflows/render-worker.yml` in the repo, then commit to `main`. The workflow builds the image, runs the smoke test, and pushes
`ghcr.io/<owner>/krush-render-worker:<commit-sha>`. The run summary shows the digest. Then, on GitHub, go to Packages → krush-render-worker → Package settings and either make it Public or add a GHCR credential in RunPod (Settings → Container Registry Auth, using a classic token with `read:packages`).

**B. Local Docker.**
```
cd render-worker
docker build --platform linux/amd64 -t ghcr.io/<owner>/krush-render-worker:1.0.0 .
docker run --rm -e ALLOW_SOFTWARE_GL=1 ghcr.io/<owner>/krush-render-worker:1.0.0 python3 tests/smoke_test.py
docker push ghcr.io/<owner>/krush-render-worker:1.0.0
```
Docker Hub works the same way (`docker.io/<user>/krush-render-worker:1.0.0`).

## 2. Storage (Cloudflare R2 or S3)
1. In R2, create a private bucket named `krush-renders`.
2. Create an R2 API token with Object Read & Write on that bucket only, and note the Access Key ID and Secret.
3. The endpoint is `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`.

Give the worker (RunPod) and the app (Base44 Secrets) the same values:
`STORAGE_ENDPOINT`, `STORAGE_BUCKET` (worker only), `STORAGE_REGION=auto`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`.
The app only uses them to create one-hour download links.

## 3. RunPod "Deploy a New Endpoint" screen
- Source: **Docker Image**
- Container image: the exact tag or digest from step 1, e.g. `ghcr.io/<owner>/krush-render-worker@sha256:...`. Never use `latest` in production.
- Registry credentials: only if the package is private.
- Endpoint type: **Queue** (not Load Balancer)
- GPU: start with **24 GB** (RTX 4090 / L4 / A5000), with 48 GB (L40S / A6000) as the second choice for 4K Maximum
- Active workers: 0. Max workers: 1–2 to start. Flex workers. Idle timeout: 5 s.
- Execution timeout: 14400 s. The app also sets a per-job limit sized to the job.
- Container disk: **20 GB**
- FlashBoot: on
- Environment variables: everything in `.env.example`. Store the storage keys as RunPod Secrets.
- Create the endpoint and copy its **Endpoint ID** into the app's Secrets page as `RUNPOD_ENDPOINT_ID`.

## 4. First deployment tests (in order)
1. RunPod console → endpoint → Requests → run `tests/test_input.json`. It should return `ok: true`, `width 1920`, `height 1080`, `fps 30`, and a **hardware** `gpu` string (not SwiftShader). This checks the image, worker, GPU WebGL, Three.js and FFmpeg, plus storage if configured.
2. In Krush Studio, record a 5–10 s take, choose 1080p · Standard · 30 fps, and click Render. Watch the job go Queued → Rendering → Encoding → Completed.
3. Download the master from the Recorded Scenes Library. Check that it is 1920×1080 and that its timing matches the browser preview.
4. Only then try 1440p, and after that 4K.

## Security and limits
- Each submit mints a random single-job token, and only its SHA-256 is stored. The token can read only its own job's take, and only while the job is active.
- `claim` binds the job to one RunPod run id, so duplicate or foreign runs are refused.
- Completion is never taken from the worker or the webhook body. The app re-fetches the status from RunPod with its own key.
- Limits: allowlisted app host; fixed resolutions, fps and presets; `MAX_FRAMES`; per-frame and page-load timeouts; a per-job RunPod `executionTimeout`; and takes of at most 600 s.

## Known limits
- Only actors the stage can spawn are posed. Today that is `krush` (the player). Extra actor tracks need the stage to expose `engine.actors[id]` objects.
- Takes recorded before this version have no camera-cut ids, so camera switches inside them are interpolated over one sample interval.
- Ambient particles use a seeded random generator, so re-renders match each other. They are not identical to the live session.
- Audio is muxed only when the job input includes `audio_url`. Takes do not record audio today.