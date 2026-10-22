# One image: builds the React app, then serves it and the API from a single FastAPI process.
FROM node:20-slim AS web
WORKDIR /web
COPY app/frontend/package.json app/frontend/package-lock.json ./
RUN npm ci
COPY app/frontend/ ./
RUN npm run build

FROM python:3.12-slim
WORKDIR /srv/app/backend
COPY app/backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY app/backend/app ./app
COPY --from=web /web/dist /srv/app/frontend/dist
RUN useradd --system --create-home portal && mkdir /data && chown portal /data
USER portal
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
