// Client-side object detection for the anti-cheat camera layer
// (gap-analysis item #5: mobile-phone detection, multiple-people-in-frame
// detection) using onnxruntime-web running a YOLOv8(n) ONNX export locally
// in the browser (WASM/WebGL backend, video never leaves the browser).
//
// SETUP REQUIRED: drop a yolov8n.onnx (or similar COCO-trained YOLOv8
// export) at `public/models/yolov8n.onnx` in this frontend project — you
// already have a YOLO model installed locally per your notes; export it to
// ONNX (`yolo export model=yolov8n.pt format=onnx`) and place it there, or
// point NEXT_PUBLIC_YOLO_MODEL_URL at wherever you're hosting it. Without
// that file present, `loadObjectModel()` rejects and the camera hook simply
// skips phone/person detection (fails open, never blocks the interview).

import * as ort from "onnxruntime-web";

const MODEL_URL = process.env.NEXT_PUBLIC_YOLO_MODEL_URL || "/models/yolov8n.onnx";
const INPUT_SIZE = 640;
// COCO class indices this feature cares about.
const CLASS_PERSON = 0;
const CLASS_CELL_PHONE = 67;
const SCORE_THRESHOLD = 0.45;

let sessionPromise: Promise<ort.InferenceSession> | null = null;
let modelAvailable = true;

export async function loadObjectModel(): Promise<ort.InferenceSession | null> {
  if (!modelAvailable) return null;
  if (!sessionPromise) {
    ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/";
    sessionPromise = ort.InferenceSession.create(MODEL_URL, {
      executionProviders: ["wasm"],
    }).catch((e) => {
      modelAvailable = false;
      console.warn("[objectMonitor] YOLO model not available — phone/person detection disabled:", e);
      throw e;
    });
  }
  try {
    return await sessionPromise;
  } catch {
    return null;
  }
}

function preprocess(video: HTMLVideoElement): Float32Array {
  const canvas = document.createElement("canvas");
  canvas.width = INPUT_SIZE;
  canvas.height = INPUT_SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(video, 0, 0, INPUT_SIZE, INPUT_SIZE);
  const { data } = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);

  // HWC RGBA -> CHW RGB, normalized 0..1
  const out = new Float32Array(3 * INPUT_SIZE * INPUT_SIZE);
  const plane = INPUT_SIZE * INPUT_SIZE;
  for (let i = 0; i < plane; i++) {
    out[i] = data[i * 4] / 255; // R
    out[plane + i] = data[i * 4 + 1] / 255; // G
    out[2 * plane + i] = data[i * 4 + 2] / 255; // B
  }
  return out;
}

export interface ObjectFrameResult {
  personCount: number;
  phoneDetected: boolean;
}

export async function analyzeVideoFrameForObjects(video: HTMLVideoElement): Promise<ObjectFrameResult | null> {
  const session = await loadObjectModel();
  if (!session) return null;

  const inputData = preprocess(video);
  const tensor = new ort.Tensor("float32", inputData, [1, 3, INPUT_SIZE, INPUT_SIZE]);
  const inputName = session.inputNames[0];
  const outputs = await session.run({ [inputName]: tensor });
  const outputName = session.outputNames[0];
  const out = outputs[outputName];

  // Standard ultralytics YOLOv8 ONNX export shape: [1, 84, 8400]
  // (4 box coords + 80 COCO class scores, per anchor).
  const dims = out.dims;
  if (dims.length !== 3) return { personCount: 0, phoneDetected: false };
  const numAttrs = dims[1];
  const numAnchors = dims[2];
  const data = out.data as Float32Array;

  let personCount = 0;
  let phoneDetected = false;
  const seenPersonBoxes: [number, number][] = [];

  for (let a = 0; a < numAnchors; a++) {
    let bestClass = -1;
    let bestScore = 0;
    for (let c = 4; c < numAttrs; c++) {
      const score = data[c * numAnchors + a];
      if (score > bestScore) {
        bestScore = score;
        bestClass = c - 4;
      }
    }
    if (bestScore < SCORE_THRESHOLD) continue;

    if (bestClass === CLASS_CELL_PHONE) {
      phoneDetected = true;
    } else if (bestClass === CLASS_PERSON) {
      const cx = data[0 * numAnchors + a];
      const cy = data[1 * numAnchors + a];
      // Cheap de-dupe: YOLO emits many overlapping anchors per real object;
      // only count a new person if it's not near an already-counted centre.
      const isDuplicate = seenPersonBoxes.some(([px, py]) => Math.hypot(px - cx, py - cy) < INPUT_SIZE * 0.08);
      if (!isDuplicate) {
        seenPersonBoxes.push([cx, cy]);
        personCount++;
      }
    }
  }

  return { personCount, phoneDetected };
}

export function isObjectModelAvailable() {
  return modelAvailable;
}
