import React, { useRef } from 'react';
import { useTransform, motion, useScroll } from 'framer-motion';

const Card = ({ i, title, description, src, url, color, progress, range, targetScale }) => {
  const container = useRef(null);
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ['start end', 'start start']
  });

  const imageScale = useTransform(scrollYProgress, [0, 1], [2, 1]);
  const scale = useTransform(progress, range, [1, targetScale]);

  return (
    <div ref={container} className="h-screen flex items-center justify-center sticky top-0">
      <motion.div 
        style={{
          backgroundColor: color, 
          scale, 
          top: `calc(-5vh + ${i * 80}px)`
        }} 
        className="flex relative -top-1/4 h-[40vh] w-[40vw] max-w-[90vw] rounded-[25px] p-12 origin-top flex-col gap-4 justify-center items-center overflow-hidden shadow-lg"
      >
        <div className='absolute -top-1/3 left-1/2 -translate-x-1/2 w-[40vh] h-[40vh] blur-[10vw] bg-[#D1E40F] rounded-full'></div>
        <div className='absolute top-10 left-10'>
          <img src="/arrowTopRight.svg" alt={title} width={20} height={20} />
        </div>
        <div className='absolute bottom-0 left-0'>
          <img src="/cardIcon.svg" alt={title} width={250} height={250} />
        </div>
        <h1 className='telegraf text-5xl uppercase font-bold'>
          {title}
        </h1>
        <p className='text-lg font-light text-center max-w-lg'>
          {description}
        </p>
      </motion.div>
    </div>
  );
};

export default Card;
