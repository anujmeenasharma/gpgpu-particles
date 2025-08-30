import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { SplitText } from "gsap/SplitText"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useRef } from "react"

gsap.registerPlugin(SplitText, ScrollTrigger)

const Details = () => {
  const detailsRef = useRef(null)
  const titleRef = useRef(null)
  const mainContainerRef = useRef(null)
  const stickyWrapperRef = useRef(null)

  useGSAP(()=>{
    document.fonts.ready.then(() => {
      const split = SplitText.create(detailsRef.current, { 
        type: "words", 
        aria: "hidden" 
      });

      const splitTitle = SplitText.create(titleRef.current, { 
        type: "words", 
        wordsClass: "word",
        mask: "words",
        autoSplit: true,
      });

      gsap.set(split.words, { opacity: 0 });

      gsap.to(split.words, {
        opacity: 1,
        stagger: 0.05,
        ease: "none",
        scrollTrigger: {
          trigger: stickyWrapperRef.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 1,
          toggleActions: "play none none reverse"
        }
      });

      gsap.from(splitTitle.words, {
        y: 200,
        opacity: 0,
        stagger: 0.1,
        ease: "power2.inOut",
        duration: 2,
        scrollTrigger: {
          trigger: stickyWrapperRef.current,
          start: "top 98%",
          end: "bottom 20%",
          toggleActions: "play none none reverse"
        }
      })
    });
  })

  return (
    <div ref={stickyWrapperRef} className="relative w-full" style={{ height: "400vh" }}>
      <div ref={mainContainerRef} className="sticky top-0 h-screen w-full z-20 overflow-hidden flex gap-4 flex-col items-center justify-center">
        <h1 ref={titleRef} className="text-5xl uppercase font-bold telegraf">
          we don't flip brands. we build futures.
        </h1>
        <div className="relative text-center w-[50%]">
          <p ref={detailsRef} className="animate-me" aria-hidden="true">
            Most brand builders chase quick exits and financial engineering. We craft enduring consumer experiences that own moments, shape categories, and live in people's daily lives. Our approach combines the creative instincts of a growth studio with the operational precision of a technology platform. We identify high-potential consumer products, then apply our proprietary LaunchLab™ system to build authentic brand stories that resonate with modern audiences.
          </p>
          <p className="sr-only">
            Most brand builders chase quick exits and financial engineering. We craft enduring consumer experiences that own moments, shape categories, and live in people's daily lives. Our approach combines the creative instincts of a growth studio with the operational precision of a technology platform. We identify high-potential consumer products, then apply our proprietary LaunchLab™ system to build authentic brand stories that resonate with modern audiences.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Details