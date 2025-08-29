import { GPGPUParticles } from "./GPGPUParticles";

export const Experience = ({ curGeometry = "Box" }) => {
  return (
    <>
      {/* <Environment preset="warehouse" /> */}
      <GPGPUParticles curGeometry={curGeometry} />
      {/* <mesh>
        <boxGeometry />
        <meshStandardMaterial color="hotpink" />
      </mesh> */}
    </>
  );
};
