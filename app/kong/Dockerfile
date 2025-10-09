FROM kong:3.6.0

USER root

RUN apt-get update && apt-get install -y curl tar \
    && curl -L https://github.com/kong/deck/releases/download/v1.11.0/deck_1.11.0_linux_amd64.tar.gz \
    | tar xz -C /usr/local/bin \
    && chmod +x /usr/local/bin/deck \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

USER kong
