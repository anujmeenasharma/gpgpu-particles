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
    start: "#fff",
    end: "#ffaa44",
    emissiveIntensity: 0.1,
  },
  Sphere: {
    start: "#fff",
    end: "#ffaa44",
    emissiveIntensity: 0.15,
  },

  Torus: {
    start: "#fff",
    end: "#ffaa44",
    emissiveIntensity: 0.3,
  },

  Cone: {
    start: "#fff",
    end: "#ffaa44",
    emissiveIntensity: 0.18,
  },
};

const tmpColor = new Color();

export const GPGPUParticles = ({ nbParticles = 60000, curGeometry = "Box" }) => {
  const { displacementMode, strength, mouseRadius } = useControls({
    displacementMode: {
      options: ["Liquid", "Repel", "Attract", "Swirl", "Tornado"],
      value: "Repel",
    },
    strength: { value: 100, min: 0, max: 500, step: 1 },
    mouseRadius: { value: 1.5, min: 0.1, max: 5.0, step: 0.05 },
  });

  // Mouse tracking state
  const [mousePosition, setMousePosition] = useState(new THREE.Vector3(0, 0, 0));
  const lastMouseMoveRef = useRef(0);
  const prevMousePositionRef = useRef(new THREE.Vector3(0, 0, 0));
  const smoothedMouseDirRef = useRef(new THREE.Vector3(0, 0, 0));
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
      lastMouseMoveRef.current = performance.now();
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
      mouseDirection: uniform(vec3(0, 0, 0)),
      mouseStrength: uniform(100.0),
      mouseRadius: uniform(1.5),
      displacementWeights: uniform(vec4(1, 0, 0, 0)), // Repel, Attract, Swirl, Tornado
      // Liquid mode controls
      isLiquid: uniform(0.0),
      liquidDamping: uniform(3.0),
      liquidSpring: uniform(6.0),
      relaxStrength: uniform(0.0),
    };

    // buffers
    const spawnPositionsBuffer = instancedArray(nbParticles, "vec3");
    const offsetPositionsBuffer = instancedArray(nbParticles, "vec3");
    const agesBuffer = instancedArray(nbParticles, "float");
    const velocitiesBuffer = instancedArray(nbParticles, "vec3");

    const spawnPosition = spawnPositionsBuffer.element(instanceIndex);
    const offsetPosition = offsetPositionsBuffer.element(instanceIndex);
    const age = agesBuffer.element(instanceIndex);
    const velocity = velocitiesBuffer.element(instanceIndex);

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
      velocity.assign(0);
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

        // Directional force based on cursor movement (no magnet effect)
        const mouseDirForce = uniforms.mouseDirection
          .normalize()
          .mul(falloff)
          .mul(uniforms.mouseStrength)
          .mul(deltaTime);

        // If Liquid mode, use directional flow; else, use selected displacement.
        If(uniforms.isLiquid.greaterThan(0.5), () => {
          // v += directional force (already includes deltaTime)
          velocity.addAssign(mouseDirForce);
        }).Else(() => {
          offsetPosition.addAssign(appliedForce);
        });
      });
      
      // Liquid integration step (always executed; no-op if not liquid due to zero terms)
      // Damping: v -= v * damping * dt
      velocity.subAssign(velocity.mul(uniforms.liquidDamping).mul(deltaTime).mul(uniforms.isLiquid));
      // Spring-back to model (offset -> 0): v += -offset * spring * relax * dt
      velocity.addAssign(
        offsetPosition
          .mul(-1)
          .mul(uniforms.liquidSpring)
          .mul(uniforms.relaxStrength)
          .mul(deltaTime)
          .mul(uniforms.isLiquid)
      );
      // x += v * dt
      offsetPosition.addAssign(velocity.mul(deltaTime).mul(uniforms.isLiquid));

      offsetPosition.addAssign(
        mx_fractal_noise_vec3(spawnPosition.mul(age))
          .mul(offsetSpeed)
          .mul(deltaTime)
      );

      age.addAssign(deltaTime);

      If(age.greaterThan(lifetime), () => {
        age.assign(0);
        offsetPosition.assign(0);
        velocity.assign(0);
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
    uniforms.mouseRadius.value = mouseRadius;
    uniforms.mouseStrength.value = strength;

    // Update displacement mode weights and liquid flag
    if (displacementMode === "Liquid") {
      // No radial forces for liquid; rely on directional flow only
      uniforms.displacementWeights.value.set(0, 0, 0, 0);
      uniforms.isLiquid.value = 1.0;
    } else {
      uniforms.isLiquid.value = 0.0;
      if (displacementMode === "Repel") {
        uniforms.displacementWeights.value.set(1, 0, 0, 0);
      } else if (displacementMode === "Attract") {
        uniforms.displacementWeights.value.set(0, 1, 0, 0);
      } else if (displacementMode === "Swirl") {
        uniforms.displacementWeights.value.set(0, 0, 1, 0);
      } else if (displacementMode === "Tornado") {
        uniforms.displacementWeights.value.set(0, 0, 0, 1);
      }
    }

    // Liquid relax strength ramps up after you stop moving the mouse
    const now = performance.now();
    const secondsSinceMove = (now - lastMouseMoveRef.current) / 1000;
    const relaxDelay = 0.25; // seconds before starting to relax
    const relaxFade = 0.9; // seconds to reach full relaxation
    let relax = 0;
    if (secondsSinceMove > relaxDelay) {
      relax = Math.min(1, (secondsSinceMove - relaxDelay) / relaxFade);
    }
    uniforms.relaxStrength.value = relax;

    // Update mouse direction (flow direction), smoothed per-frame
    const deltaPos = new THREE.Vector3().copy(mousePosition).sub(prevMousePositionRef.current);
    prevMousePositionRef.current.copy(mousePosition);
    if (deltaPos.lengthSq() > 1e-9) {
      deltaPos.normalize();
      smoothedMouseDirRef.current.lerp(deltaPos, Math.min(1, delta * 12));
    } else {
      smoothedMouseDirRef.current.lerp(new THREE.Vector3(0, 0, 0), Math.min(1, delta * 6));
    }
    uniforms.mouseDirection.value.copy(smoothedMouseDirRef.current);
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
