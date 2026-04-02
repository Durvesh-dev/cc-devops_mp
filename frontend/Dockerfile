FROM node:20-bookworm

WORKDIR /app

COPY frontend/package*.json ./frontend/
RUN cd frontend \
  && npm ci

COPY frontend ./frontend

ENV NODE_ENV=development
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "run", "dev", "--prefix", "frontend", "--", "-p", "3000"]
