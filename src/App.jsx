import { useRef } from "react";
import useLenis from "./hooks/useLenis";
import Noise from "./components/UiComponents/Noise";
import Crosshair from "./components/UiComponents/CrossHair";
import GlobalIcons from "./components/UiComponents/globalIcons";
import SparkCursor from "./components/UiComponents/SparkCursor";
import Details from "./components/Pages/Home/Details";
import LaunchLab from "./components/Pages/Home/LaunchLab";
import StackCards from "./components/Pages/Home/StackCards";
import LandingPage from "./components/Pages/Home/LandingPage";
import GlobalScene from "./components/GlobalScene";
function App() {
  const containerRef = useRef(null)
  useLenis()
  
  return (
    <div className="relative h-full w-full" ref={containerRef}>
      <SparkCursor 
        sparkColor='#fff'
        sparkSize={10}
        sparkRadius={15}
        sparkCount={8}
        duration={400}
      >
        <Noise />
        <Crosshair containerRef={containerRef} color='#ffffff'/>
        <GlobalIcons />
        <LandingPage />
        <Details />
        <LaunchLab />
        <StackCards />
      </SparkCursor>
    </div>
  );
}

export default App;
