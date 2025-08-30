import React, { useEffect, useRef } from 'react';
import { projects } from '../../../data/project';
import Card from './Card';
import { useScroll } from 'framer-motion';

const StackCards = () => {
  const container = useRef(null);
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ['start start', 'end end']
  });

  useEffect(() => {
    let lenis;
    
    const initLenis = async () => {
      const Lenis = (await import('lenis')).default;
      lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smooth: true,
        touchMultiplier: 2,
      });

      function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);
    };

    initLenis();

    return () => {
      if (lenis) {
        lenis.destroy();
      }
    };
  }, []);

  return (
    <div ref={container} className="relative z-20 mt-[50vh] min-h-screen">
      <div className='h-screen sticky top-0 w-full flex items-center justify-between px-44'>
        <h1 className='text-4xl font-bold telegraf uppercase w-[20%]'>
          BUILT for builders who think bigger
        </h1>
        <p className='text-sm w-[20%]'>
          We work with brands that share our belief: that great products deserve grestorytelling, and that authentic consumer connection drives sustainable competitiadvantage.
        </p>
      </div>
      {projects.map((project, i) => {
        const targetScale = 1 - ((projects.length - i) * 0.05);
        return (
          <>
            <Card 
              key={i} 
              i={i} 
              {...project} 
              progress={scrollYProgress} 
              range={[i * 0.25, 1]} 
              targetScale={targetScale}
            />
          </>
        );
      })}
    </div>
  );
};

export default StackCards;