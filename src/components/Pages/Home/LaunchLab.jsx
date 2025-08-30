import React, { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import GlobalScene from '../../GlobalScene';

const LaunchLab = () => {
  const launchLabRef = useRef(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    
    document.body.style.backgroundColor = 'black';

    ScrollTrigger.create({
      trigger: launchLabRef.current,
      start: "top 50%",
      end: "bottom 50%",
      onEnter: () => {
        gsap.to(document.body, {
          duration: 1,
          backgroundColor: '#dadada',
          ease: 'power2.inOut'
        });
      },
      onLeave: () => {
        gsap.to(document.body, {
          duration: 1,
          backgroundColor: 'black',
          ease: 'power2.inOut'
        });
      },
      onEnterBack: () => {
        gsap.to(document.body, {
          duration: 1,
          backgroundColor: '#dadada',
          ease: 'power2.inOut'
        });
      },
      onLeaveBack: () => {
        gsap.to(document.body, {
          duration: 1,
          backgroundColor: 'black',
          ease: 'power2.inOut'
        });
      }
    });

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
      document.body.style.backgroundColor = '';
    };
  }, []);

  return (
    <div ref={launchLabRef} className='relative h-full w-full'>
        <GlobalScene />
        <div className="w-full h-screen z-20 absolute top-0 left-0 z-10 flex items-center justify-center">
            <div className='text-center flex flex-col gap-[30rem] launchlab-text'>
                <div className='flex flex-col gap-4'>
                    <p className='text-lg'>Where Science Meets Story</p>
                    <h1 className='text-5xl uppercase font-black telegraf text-[#D1E40F]'>LaunchLab</h1>
                    <p className='w-[50%] mx-auto'>Our proprietary growth engine compresses the typical brand-building timeline from years to months. Five integrated systems working as one intelligence.</p>
                </div>
                <div className='flex flex-col gap-6'>
                    <h1 className='text-5xl uppercase font-black telegraf'>smart</h1>
                    <p className='w-[30%] mx-auto'>
                        AI-driven creative and marketing optimization across every touchpoint
                    </p>
                </div>
            </div>
        </div>
    </div>
  )
}

export default LaunchLab