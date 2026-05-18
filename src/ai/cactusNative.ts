type CactusFileSystemStatic = {
  modelExists: (model: string) => Promise<boolean>;
  getModelPath: (model: string) => Promise<string>;
  downloadModel: (
    model: string,
    url: string,
    onProgress?: (progress: number) => void,
  ) => Promise<void>;
};

type CactusNativeModule = {
  CactusFileSystem: CactusFileSystemStatic;
};

/** Cactus filesystem helpers (same module useCactusLM uses internally). */
export function getCactusFileSystem(): CactusFileSystemStatic {
  // Metro resolves this path at bundle time; it is not in the package "exports" map.
  const mod =
    require("cactus-react-native/lib/module/native/index.js") as CactusNativeModule;
  return mod.CactusFileSystem;
}
