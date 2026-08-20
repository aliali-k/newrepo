// Client-side face monitoring for the anti-cheat camera layer
// (Master Build Doc §18 gaze-tracking cell + gap-analysis items #2/#3:
// baseline face capture, continuous face-match, gaze-away detection).
//
// Uses @mediapipe/tasks-vision's FaceLandmarker (runs on-device via WASM,
// no server round-trip, no video ever leaves the browser). This is the
// "FaceMesh" model referenced in the build docs — tasks-vision is Google's
// current package for it (the standalone @mediapipe/face_mesh package is
// deprecated in favour of this one).
//
// NOTE ON THE FACE DESCRIPTOR: this computes a geometric descriptor (a
// vector of normalized distances between stable landmarks — eye corners,
// nose, jaw width, etc.), NOT a deep face-recognition embedding. It is a
// reasonable, zero-install, in-browser proxy for "is roughly the same face
// still in frame" (baseline-capture → continuous match), but it is not as
// robust as a trained embedding model (e.g. InsightFace, which is already
// used server-side for MentorConnect identity verification). If stronger
// impersonation resistance is needed later, run the InsightFace check
// server-side on periodically-sampled frames instead of relying on this
// alone.

import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
} from "@mediapipe/tasks-vision";

const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

let landmarkerPromise: Promise<FaceLandmarker> | null = null;

async function getLandmarker(): Promise<FaceLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = FilesetResolver.forVisionTasks(WASM_BASE).then((fileset) =>
      FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
        runningMode: "VIDEO",
        numFaces: 3, // detect up to 3 so "multiple people" can fire
        outputFacialTransformationMatrixes: true,
        outputFaceBlendshapes: false,
      })
    );
  }
  return landmarkerPromise;
}

export interface FaceFrameResult {
  faceCount: number;
  /** Head yaw in degrees, 0 = looking straight at the camera. Only set when faceCount >= 1. */
  yawDeg?: number;
  pitchDeg?: number;
  descriptor?: number[];
}

// Key landmark indices (MediaPipe FaceMesh 468-point topology) used to build
// a lightweight, pose-normalized-ish geometric descriptor.
const DESCRIPTOR_LANDMARKS = [33, 133, 362, 263, 1, 61, 291, 199, 10, 152];

function buildDescriptor(landmarks: { x: number; y: number; z: number }[]): number[] {
  const pts = DESCRIPTOR_LANDMARKS.map((i) => landmarks[i]).filter(Boolean);
  if (pts.length < DESCRIPTOR_LANDMARKS.length) return [];
  const out: number[] = [];
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const dx = pts[i].x - pts[j].x;
      const dy = pts[i].y - pts[j].y;
      out.push(Math.sqrt(dx * dx + dy * dy));
    }
  }
  // Normalize by the first (largest, most stable) distance so scale/distance
  // from the camera doesn't dominate the comparison.
  const scale = out[0] || 1;
  return out.map((v) => v / scale);
}

function matrixToEuler(m: number[]): { yaw: number; pitch: number } {
  // m is a 4x4 column-major transformation matrix from MediaPipe.
  // Extract yaw/pitch from the rotation part (approximation, sufficient for
  // an "is the candidate looking away" heuristic, not precise 3D tracking).
  const r02 = m[8],
    r22 = m[10],
    r12 = m[9],
    r11 = m[5];
  const yaw = Math.atan2(r02, r22) * (180 / Math.PI);
  const pitch = Math.atan2(-r12, r11) * (180 / Math.PI);
  return { yaw, pitch };
}

export async function analyzeVideoFrame(video: HTMLVideoElement, timestampMs: number): Promise<FaceFrameResult> {
  const landmarker = await getLandmarker();
  const result: FaceLandmarkerResult = landmarker.detectForVideo(video, timestampMs);
  const faceCount = result.faceLandmarks?.length || 0;
  if (faceCount === 0) return { faceCount: 0 };

  const landmarks = result.faceLandmarks[0];
  const descriptor = buildDescriptor(landmarks);

  let yawDeg: number | undefined;
  let pitchDeg: number | undefined;
  const matrix = result.facialTransformationMatrixes?.[0]?.data;
  if (matrix) {
    const euler = matrixToEuler(matrix);
    yawDeg = euler.yaw;
    pitchDeg = euler.pitch;
  }

  return { faceCount, yawDeg, pitchDeg, descriptor };
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || !b.length || a.length !== b.length) return 0;
  let dot = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function disposeFaceLandmarker() {
  landmarkerPromise?.then((l) => l.close()).catch(() => {});
  landmarkerPromise = null;
}
