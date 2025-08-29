import { Canvas } from "@react-three/fiber";
import { Suspense, useCallback, useState } from "react";
import * as THREE from "three/webgpu";
import { Experience } from "./components/Experience";
import { PostProcessing } from "./components/PostProcessing";

function App() {
  const [frameloop, setFrameloop] = useState("never");
  const models = ["Box", "Sphere", "Torus", "Cone"];
  const [modelIndex, setModelIndex] = useState(0);

  const prevModel = () => {
    setModelIndex((idx) => (idx - 1 + models.length) % models.length);
  };

  const nextModel = () => {
    setModelIndex((idx) => (idx + 1) % models.length);
  };
  
  return (
    <>
      <Canvas
        shadows
        camera={{ position: [0, 0, 10], fov: 50 }}
        frameloop={frameloop}
        gl={useCallback((canvas) => {
          const renderer = new THREE.WebGPURenderer({
            canvas,
            powerPreference: "high-performance",
            antialias: true,
            alpha: true,
            stencil: false,
          });
          renderer.init().then(() => setFrameloop("always"));
          return renderer;
        }, [])}
      >
        <Suspense>
          <Experience curGeometry={models[modelIndex]} />
        </Suspense>
        <PostProcessing />
      </Canvas>
      <button
        onClick={prevModel}
        style={{
          position: "fixed",
          left: 16,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 10,
          width: 48,
          height: 48,
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.3)",
          background: "rgba(0,0,0,0.4)",
          color: "#fff",
          cursor: "pointer",
          fontSize: 20,
          lineHeight: "48px",
        }}
        aria-label="Previous model"
      >
        ◀
      </button>
      <button
        onClick={nextModel}
        style={{
          position: "fixed",
          right: 16,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 10,
          width: 48,
          height: 48,
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.3)",
          background: "rgba(0,0,0,0.4)",
          color: "#fff",
          cursor: "pointer",
          fontSize: 20,
          lineHeight: "48px",
        }}
        aria-label="Next model"
      >
        ▶
      </button>
    </>
  );
}

export default App;
