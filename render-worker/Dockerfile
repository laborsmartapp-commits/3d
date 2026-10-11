# Krush Studio cloud render worker for RunPod Serverless (NVIDIA GPU).
FROM nvidia/cuda:12.4.1-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    NVIDIA_VISIBLE_DEVICES=all \
    NVIDIA_DRIVER_CAPABILITIES=all \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 python3-pip ffmpeg ca-certificates fonts-liberation \
      libglvnd0 libegl1 libgl1 libgles2 libvulkan1 \
    && rm -rf /var/lib/apt/lists/*

# Let libglvnd / the Vulkan loader find the NVIDIA driver libraries injected at runtime.
RUN mkdir -p /usr/share/glvnd/egl_vendor.d /etc/vulkan/icd.d \
 && echo '{"file_format_version":"1.0.0","ICD":{"library_path":"libEGL_nvidia.so.0"}}' > /usr/share/glvnd/egl_vendor.d/10_nvidia.json \
 && echo '{"file_format_version":"1.0.0","ICD":{"library_path":"libGLX_nvidia.so.0","api_version":"1.3"}}' > /etc/vulkan/icd.d/nvidia_icd.json

WORKDIR /worker
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt \
 && python3 -m playwright install --with-deps chromium

COPY src/ ./src/
COPY tests/ ./tests/

CMD ["python3", "-u", "src/handler.py"]