import React from 'react';
import { projects } from '../../../Data/data';
import Card from './StackCards';
import { useScroll } from 'framer-motion';
import { useEffect, useRef } from 'react';
import styles from './style.module.scss'

const StackCardsPage = () => {
  const container = useRef(null);
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ['start start', 'end end']
  })

  return (
    <main ref={container} className={styles.main}>
      {
        projects.map( (project, i) => {
          const targetScale = 1 - ( (projects.length - i) * 0.05);
          return <Card key={`p_${i}`} i={i} {...project} progress={scrollYProgress} range={[i * .25, 1]} targetScale={targetScale}/>
        })
      }
    </main>
  )
}

export default StackCardsPage;