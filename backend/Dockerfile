FROM node:20-bookworm

WORKDIR /app

# Python is needed because the backend spawns ml-model/predict.py
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-pip \
  && rm -rf /var/lib/apt/lists/*

# Install Node deps
COPY backend/package*.json ./backend/
RUN cd backend \
  && npm ci

# Install Python deps for ML (best-effort; keeps image self-contained)
COPY ml-model/requirements.txt ./ml-model/requirements.txt
RUN python3 -m pip install --no-cache-dir -r ./ml-model/requirements.txt

# Copy source
COPY backend ./backend
COPY ml-model ./ml-model

ENV NODE_ENV=development
ENV PORT=5000
ENV PYTHON_CMD=python3
ENV ML_PREDICT_SCRIPT=ml-model/predict.py
ENV MODEL_PATH=ml-model/model/model.pkl
ENV LOG_FILE_PATH=backend/logs/app.log

EXPOSE 5000

CMD ["npm", "run", "dev", "--prefix", "backend"]
