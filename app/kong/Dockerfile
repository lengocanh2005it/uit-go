FROM kong:3.6

USER root
RUN apt-get update && apt-get install -y iputils-ping netcat curl bash \
    && rm -rf /var/lib/apt/lists/*

USER kong
