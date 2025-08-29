import { extend, useFrame, useThree } from "@react-three/fiber";
import { useControls } from "leva";
import { useEffect, useMemo, useRef, useState } from "react";
import { lerp, randInt } from "three/src/math/MathUtils.js";
import * as THREE from "three/webgpu";

import { Fn } from "three/src/nodes/TSL.js";
import {
  ceil,
  color,
  deltaTime,
  hash,
  If,
  instancedArray,
  instanceIndex,
  length,
  min,
  mix,
  mx_fractal_noise_vec3,
  range,
  saturate,
  smoothstep,
  sqrt,
  texture,
  uniform,
  uv,
  vec2,
  vec3,
  vec4,
  cross,
} from "three/tsl";
import {
  NormalBlending,
  BoxGeometry,
  Color,
  DataTexture,
  FloatType,
  RGBAFormat,
  SphereGeometry,
  TorusGeometry,
  ConeGeometry,
  SpriteNodeMaterial,
} from "three/webgpu";

const randValue = /*#__PURE__*/ Fn(({ min, max, seed = 42 }) => {
  return hash(instanceIndex.add(seed)).mul(max.sub(min)).add(min);
});

const MODEL_COLORS = {
  Box: {
    start: "#ff4444",
    end: "#ffaa44",
    emissiveIntensity: 0.1,
  },
  Sphere: {
    start: "#44ff44",
    end: "#44ffaa",
    emissiveIntensity: 0.15,
  },

  Torus: {
    start: "#ff44ff",
    end: "#ffaa88",
    emissiveIntensity: 0.3,
  },

  Cone: {
    start: "#00aaff",
    end: "#0066ff",
    emissiveIntensity: 0.18,
  },
};

const tmpColor = new Color();

export const GPGPUParticles = ({ nbParticles = 50000, curGeometry = "Box" }) => {
  const { displacementMode } = useControls({
    displacementMode: {
      options: ["Repel", "Attract", "Swirl", "Tornado"],
      value: "Repel",
    },
  });

  // Mouse tracking state
  const [mousePosition, setMousePosition] = useState(new THREE.Vector3(0, 0, 0));
  const { camera, size, raycaster } = useThree();

  // Mouse event handling
  useEffect(() => {
    const handleMouseMove = (event) => {
      const mouse = new THREE.Vector2();
      mouse.x = (event.clientX / size.width) * 2 - 1;
      mouse.y = -(event.clientY / size.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      
      // Project mouse to a plane at z=0 for 3D interaction
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      const intersectionPoint = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, intersectionPoint);
      
      if (intersectionPoint) {
        setMousePosition(intersectionPoint);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [camera, size, raycaster]);

  const geometries = useMemo(() => {
    const geometries = [];
    
    if (curGeometry === "Box") {
      geometries.push(new BoxGeometry(2, 2, 2, 128, 128, 128));
    } else if (curGeometry === "Sphere") {
      geometries.push(new SphereGeometry(1.5, 256, 128));

    } else if (curGeometry === "Torus") {
      geometries.push(new TorusGeometry(1.2, 0.4, 64, 256));

    } else if (curGeometry === "Cone") {
      geometries.push(new ConeGeometry(1.2, 2.5, 128, 64));
    }
    
    return geometries;
  }, [curGeometry]);

  const targetPositionsTexture = useMemo(() => {
    const size = Math.ceil(Math.sqrt(nbParticles)); // Make a square texture
    const data = new Float32Array(size * size * 4);

    for (let i = 0; i < nbParticles; i++) {
      data[i * 4 + 0] = 0; // X
      data[i * 4 + 1] = 0; // Y
      data[i * 4 + 2] = 0; // Z
      data[i * 4 + 3] = 1; // Alpha (not needed, but required for 4-component format)
    }

    const texture = new DataTexture(data, size, size, RGBAFormat, FloatType);
    return texture;
  }, [nbParticles]);

  useEffect(() => {
    if (geometries.length === 0) return;
    for (let i = 0; i < nbParticles; i++) {
      const geometryIndex = randInt(0, geometries.length - 1);
      const randomGeometryIndex = randInt(
        0,
        geometries[geometryIndex].attributes.position.count - 1
      );
      targetPositionsTexture.image.data[i * 4 + 0] =
        geometries[geometryIndex].attributes.position.array[
          randomGeometryIndex * 3 + 0
        ];
      targetPositionsTexture.image.data[i * 4 + 1] =
        geometries[geometryIndex].attributes.position.array[
          randomGeometryIndex * 3 + 1
        ];
      targetPositionsTexture.image.data[i * 4 + 2] =
        geometries[geometryIndex].attributes.position.array[
          randomGeometryIndex * 3 + 2
        ];
      targetPositionsTexture.image.data[i * 4 + 3] = 1;
    }
    targetPositionsTexture.needsUpdate = true;
  }, [geometries]);

  const gl = useThree((state) => state.gl);

  const { nodes, uniforms, computeUpdate } = useMemo(() => {
    // uniforms
    const uniforms = {
      color: uniform(color("#ffffff")),
      endColor: uniform(color("#ffffff")),
      emissiveIntensity: uniform(MODEL_COLORS[curGeometry]?.emissiveIntensity ?? 0.15),
      particleOpacity: uniform(0.6),
      mousePosition: uniform(vec3(0, 0, 0)),
      mouseStrength: uniform(5.0),
      mouseRadius: uniform(1.5),
      displacementWeights: uniform(vec4(1, 0, 0, 0)), // Repel, Attract, Swirl, Tornado
    };

    // buffers
    const spawnPositionsBuffer = instancedArray(nbParticles, "vec3");
    const offsetPositionsBuffer = instancedArray(nbParticles, "vec3");
    const agesBuffer = instancedArray(nbParticles, "float");

    const spawnPosition = spawnPositionsBuffer.element(instanceIndex);
    const offsetPosition = offsetPositionsBuffer.element(instanceIndex);
    const age = agesBuffer.element(instanceIndex);

    // init Fn
    const lifetime = randValue({ min: 0.1, max: 6, seed: 13 });

    const computeInit = Fn(() => {
      spawnPosition.assign(
        vec3(
          randValue({ min: -3, max: 3, seed: 0 }),
          randValue({ min: -3, max: 3, seed: 1 }),
          randValue({ min: -3, max: 3, seed: 2 })
        )
      );
      offsetPosition.assign(0);
      age.assign(randValue({ min: 0, max: lifetime, seed: 11 }));
    })().compute(nbParticles);

    gl.computeAsync(computeInit);

    const instanceSpeed = randValue({ min: 0.01, max: 0.05, seed: 12 });
    const offsetSpeed = randValue({ min: 0.1, max: 0.5, seed: 14 });

    // Texture data
    const size = ceil(sqrt(nbParticles));
    const col = instanceIndex.modInt(size).toFloat();
    const row = instanceIndex.div(size).toFloat();
    const x = col.div(size.toFloat());
    const y = row.div(size.toFloat());
    const targetPos = texture(targetPositionsTexture, vec2(x, y)).xyz;

    // update Fn
    const computeUpdate = Fn(() => {
      const distanceToTarget = targetPos.sub(spawnPosition);
      If(distanceToTarget.length().greaterThan(0.01), () => {
        spawnPosition.addAssign(
          distanceToTarget
            .normalize()
            .mul(min(instanceSpeed, distanceToTarget.length()))
        );
      });
      
      // Mouse displacement force
      const currentPos = spawnPosition.add(offsetPosition);
      const mouseToParticle = currentPos.sub(uniforms.mousePosition);
      const mouseDistance = mouseToParticle.length();
      
      If(mouseDistance.lessThan(uniforms.mouseRadius), () => {
        const falloff = smoothstep(uniforms.mouseRadius, 0, mouseDistance);

        // Base radial direction from mouse → particle
        const radialDir = mouseToParticle.normalize();

        // Repel and Attract
        const repelForce = radialDir
          .mul(falloff)
          .mul(uniforms.mouseStrength)
          .mul(deltaTime);
        const attractForce = repelForce.mul(-1);

        // Swirl around Z axis (screen-space swirl)
        const swirlDir = cross(vec3(0, 0, 1), radialDir).normalize();
        const swirlForce = swirlDir
          .mul(falloff)
          .mul(uniforms.mouseStrength)
          .mul(deltaTime);

        // Tornado = swirl + upward (along +Z)
        const upForce = vec3(0, 0, 1)
          .mul(falloff)
          .mul(uniforms.mouseStrength)
          .mul(deltaTime);
        const tornadoForce = swirlForce.add(upForce);

        // Blend by weights coming from UI selection
        const appliedForce = repelForce
          .mul(uniforms.displacementWeights.x)
          .add(attractForce.mul(uniforms.displacementWeights.y))
          .add(swirlForce.mul(uniforms.displacementWeights.z))
          .add(tornadoForce.mul(uniforms.displacementWeights.w));

        offsetPosition.addAssign(appliedForce);
      });
      
      offsetPosition.addAssign(
        mx_fractal_noise_vec3(spawnPosition.mul(age))
          .mul(offsetSpeed)
          .mul(deltaTime)
      );

      age.addAssign(deltaTime);

      If(age.greaterThan(lifetime), () => {
        age.assign(0);
        offsetPosition.assign(0);
      });
    })().compute(nbParticles);

    const scale = vec3(range(0.005, 0.02));
    const particleLifetimeProgress = saturate(age.div(lifetime));

    const colorNode = vec4(
      uniforms.color,
      uniforms.particleOpacity // Controlled opacity for a lighter look
    );

    // Transform the particles to a circle
    const dist = length(uv().sub(0.5));
    const circle = smoothstep(0.5, 0.49, dist);
    const finalColor = colorNode.mul(circle);

    // Add a random offset to the particles
    const randOffset = vec3(
      range(-0.001, 0.001),
      range(-0.001, 0.001),
      range(-0.001, 0.001)
    );

    return {
      uniforms,
      computeUpdate,
      nodes: {
        positionNode: spawnPosition.add(offsetPosition).add(randOffset),
        colorNode: finalColor,
        emissiveNode: finalColor.mul(uniforms.emissiveIntensity),
        scaleNode: scale.mul(smoothstep(1, 0, particleLifetimeProgress)),
      },
    };
  }, [nbParticles, targetPositionsTexture]);

  const lerpedStartColor = useRef(new Color(MODEL_COLORS[curGeometry].start));
  const lerpedEndColor = useRef(new Color(MODEL_COLORS[curGeometry].end));
  const targetStartColor = useRef(new Color(MODEL_COLORS[curGeometry].start));
  const targetEndColor = useRef(new Color(MODEL_COLORS[curGeometry].end));

  useEffect(() => {
    targetStartColor.current.set(MODEL_COLORS[curGeometry].start);
    targetEndColor.current.set(MODEL_COLORS[curGeometry].end);
  }, [curGeometry]);

  useFrame((_, delta) => {
    gl.compute(computeUpdate);

    lerpedStartColor.current.lerp(targetStartColor.current, delta);
    lerpedEndColor.current.lerp(targetEndColor.current, delta);
    uniforms.color.value.set(lerpedStartColor.current);
    uniforms.endColor.value.set(lerpedEndColor.current);

    uniforms.emissiveIntensity.value = lerp(
      uniforms.emissiveIntensity.value,
      MODEL_COLORS[curGeometry].emissiveIntensity,
      delta
    );

    // Update mouse uniforms
    uniforms.mousePosition.value.copy(mousePosition);

    // Update displacement mode weights
    if (displacementMode === "Repel") {
      uniforms.displacementWeights.value.set(1, 0, 0, 0);
    } else if (displacementMode === "Attract") {
      uniforms.displacementWeights.value.set(0, 1, 0, 0);
    } else if (displacementMode === "Swirl") {
      uniforms.displacementWeights.value.set(0, 0, 1, 0);
    } else if (displacementMode === "Tornado") {
      uniforms.displacementWeights.value.set(0, 0, 0, 1);
    }
  });

  return (
    <>
      <sprite count={nbParticles}>
        <spriteNodeMaterial
          {...nodes}
          transparent
          depthWrite={false}
          blending={NormalBlending}
        />
      </sprite>
    </>
  );
};

extend({ SpriteNodeMaterial });
