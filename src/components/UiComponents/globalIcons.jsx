import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/all"
import { useRef } from "react"
gsap.registerPlugin(ScrollTrigger)
import Magnet from "./Magnet"

const globalIcons = () => {
  const gooeyRef = useRef(null)
  useGSAP(()=>{
    gsap.from(gooeyRef.current, {
      scale: 0,
      duration: 2,
      ease: "power4.out",
      force3D: true,
      smoothOrigin: true,
    }, "<")

    gsap.to(gooeyRef.current, {
      top: "50%",
      scale: 1.3,
      duration: 2,
      ease: "power4.inOut",
      scrollTrigger: {
        trigger: gooeyRef.current,
        start: "top 80%",
        end: "bottom top",
        invalidateOnRefresh: true,
        toggleActions: "play none play reverse",
      }
    }, "<")

    gsap.to(gooeyRef.current, {
      top: -1000,
      duration: 1.3,
      ease: "power4.inOut",
      scrollTrigger: {
        trigger: gooeyRef.current,
        start: "top -=500%",
        end: "bottom -=530%",
        invalidateOnRefresh: true,
        toggleActions: "play none play reverse",
      }
    })

  })
  return (
    <div className="fixed w-full px-16 z-20 left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 flex items-center justify-between gap-6 will-change-transform">
        <Magnet>
          <img src="/leftIcon.svg" alt="mainLanding" className="w-16 h-16 will-change-transform animate-spin duration-300" />
        </Magnet>
        <Magnet>
          <img src="/rightIcon.svg" alt="mainLanding" className="w-16 h-16 will-change-transform animate-spin duration-300" />
        </Magnet>
        <div ref={gooeyRef} className="isGooey h-[500px] scale-3d scale-[2.5] w-[500px] bg-[#d2e40fae] rounded-full fixed z-10 top-[700%] -translate-y-1/2 left-1/2 -translate-x-1/2 blur-3xl will-change-transform"></div>
    </div>
  )
}

export default globalIcons