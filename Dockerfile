FROM denoland/deno:alpine

EXPOSE 8000

WORKDIR /app
USER deno

ADD server.ts .
RUN deno cache server.ts

CMD ["run", "--allow-net", "server.ts"]