declare module "@tridipdas13/tfjs-react-native" {
  import type { Tensor3D } from "@tensorflow/tfjs-core";

  export function decodeJpeg(
    contents: Uint8Array,
    channels?: 0 | 1 | 3,
  ): Tensor3D;
}
