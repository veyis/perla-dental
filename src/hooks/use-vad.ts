'use client'

import { useMicVAD } from '@ricky0123/vad-react'

/**
 * Thin wrapper around `useMicVAD` from `@ricky0123/vad-react` configured to
 * load the Silero VAD model and the ONNX Runtime Web WASM binaries from the
 * static assets we ship under `/public/vad/`.
 *
 * The package looks for hardcoded filenames inside `baseAssetPath`:
 *   - `vad.worklet.bundle.min.js`
 *   - `silero_vad_v5.onnx` (default model is `legacy` → `silero_vad_legacy.onnx`)
 * `onnxWASMBasePath` is where ONNX Runtime fetches `ort-wasm-*.{wasm,mjs}`.
 */
export function useVAD(args: {
  onSpeechStart?: () => void
  onSpeechEnd?: (audio: Float32Array) => void
  onMisfire?: () => void
}) {
  return useMicVAD({
    startOnLoad: false,
    onSpeechStart: args.onSpeechStart,
    onSpeechEnd: args.onSpeechEnd,
    onVADMisfire: args.onMisfire,
    baseAssetPath: '/vad/',
    onnxWASMBasePath: '/vad/',
  })
}
