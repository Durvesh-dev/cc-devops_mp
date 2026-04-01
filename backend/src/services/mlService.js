const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

const PROJECT_ROOT = path.resolve(__dirname, "../../..");
const DEFAULT_PREDICT_SCRIPT = path.resolve(PROJECT_ROOT, "ml-model/predict.py");

function resolvePythonCommand() {
  if (process.env.PYTHON_CMD) {
    return process.env.PYTHON_CMD;
  }

  const candidates = [
    path.resolve(PROJECT_ROOT, ".venv/Scripts/python.exe"),
    path.resolve(PROJECT_ROOT, ".venv/bin/python"),
  ];

  const existing = candidates.find((candidate) => fs.existsSync(candidate));
  return existing || "python";
}

function resolveDefaultModelPath() {
  const candidates = [
    path.resolve(PROJECT_ROOT, "ml-model/model/model.pkl"),
    path.resolve(PROJECT_ROOT, "ml-model/models/model.pkl"),
    path.resolve(PROJECT_ROOT, "ml-model/model.pkl"),
  ];

  const existing = candidates.find((candidate) => fs.existsSync(candidate));
  return existing || candidates[0];
}

function runPredict(logText) {
  return new Promise((resolve, reject) => {
    const scriptPath = process.env.ML_PREDICT_SCRIPT
      ? path.resolve(PROJECT_ROOT, process.env.ML_PREDICT_SCRIPT)
      : DEFAULT_PREDICT_SCRIPT;

    const modelPath = process.env.MODEL_PATH
      ? path.resolve(PROJECT_ROOT, process.env.MODEL_PATH)
      : resolveDefaultModelPath();

    const pythonCmd = resolvePythonCommand();
    const child = spawn(pythonCmd, [scriptPath, logText], {
      cwd: PROJECT_ROOT,
      env: {
        ...process.env,
        MODEL_PATH: modelPath,
      },
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(new Error(`Failed to run predictor: ${error.message}`));
    });

    child.on("close", (code) => {
      if (code !== 0) {
        const details = stderr.trim() || stdout.trim() || "unknown error";
        return reject(
          new Error(`Predict script exited with code ${code}: ${details}`),
        );
      }

      try {
        const parsed = JSON.parse(stdout.trim());
        return resolve(parsed);
      } catch (_error) {
        return reject(new Error("Invalid ML response: expected JSON output from predict.py"));
      }
    });
  });
}

async function predictLog(logText) {
  if (typeof logText !== "string" || !logText.trim()) {
    throw new Error("Log text is required for prediction");
  }
  return runPredict(logText.trim());
}

// Kept for compatibility with existing route handlers.
async function analyzeLog(logText) {
  return predictLog(logText);
}

// ML training is maintained outside this backend in a separate workflow.
async function retrainModelLocally() {
  return { skipped: true, reason: "Managed externally" };
}

module.exports = {
  predictLog,
  analyzeLog,
  retrainModelLocally,
};