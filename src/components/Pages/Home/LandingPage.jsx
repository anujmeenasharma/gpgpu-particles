import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { SplitText } from "gsap/SplitText"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useRef, useEffect } from "react"

gsap.registerPlugin(SplitText, ScrollTrigger)

const LandingPage = () => {
  const textRef = useRef(null)
  const textRef1 = useRef(null)
  const textRef2 = useRef(null)
  const textRef3 = useRef(null)
  const textRef4 = useRef(null)
  const imageRef = useRef(null)

  useGSAP(() => {
      const tl = gsap.timeline()
      tl.from([textRef.current, textRef1.current, textRef2.current, textRef3.current, textRef4.current], {
        opacity: 0,
        y: 250,
        duration: 2,
        stagger: 0.1,
        ease: "power4.out",
        force3D: true,
        smoothOrigin: true,
      })
      tl.from(imageRef.current, {
        y: 250,
        opacity: 0,
        duration: 2,
        ease: "power4.out",
        force3D: true,
        smoothOrigin: true,
      }, "<")
  }, [])
  
  return (
    <div className="h-screen w-full relative overflow-hidden">
      <div className="absolute z-20 left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 flex justify-center items-center flex-col gap-6">
        <div ref={imageRef}>
          <img src="/landingMain.svg" alt="mainLanding" className="w-24 w-24" />
        </div>
        <div className="flex flex-col gap-2">
          <p ref={textRef} className="will-change-transform capitalize text-center">
            we build brands that build culture
          </p>
          <div className="flex gap-2 justify-center">
            <h1 
              ref={textRef1} 
            
              className="text-6xl font-semibold uppercase will-change-transform telegraf"
            >
              moonshot
            </h1>
            <h1 
              ref={textRef2} 
            
              className="uppercase text-6xl font-light font-montserrat will-change-transform telegraf"
            >
              studio
            </h1>
          </div>
          <p ref={textRef3} className="text-center will-change-transform font-light text-sm w-[50%] mx-auto">
            the intersection of creative intution and strategic intelligence. where breakthrough products become household names and bold ideas scale into lasting legacies.
          </p>
        </div>
        <h1 ref={textRef4} className="text-center font-light uppercase flex items-center gap-2">
          See how it works
          <img src="/arrowBottomRight.svg" alt="arrowDown" className="w-3 h-3" />
        </h1>
      </div>
    </div>
  )
}

export default LandingPage