import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import React from 'react';

const HorizontalLogo = () => {
  const isDarkMode = useSelector((state) => state.customizer.isDark);
  const activetopbarBg = useSelector((state) => state.customizer.topbarBg);
  return (
    <Link to="/" className="d-flex align-items-center gap-2">
      {isDarkMode || activetopbarBg !== 'white' ? (
        <>
          {/* <LogoWhiteIcon /> */}
          {/* <LogoWhiteText className="d-none d-lg-block" /> */}
        </>
      ) : (
        <>
          {/* <LogoDarkIcon /> */}
          {/* <LogoDarkText className="d-none d-lg-block" /> */}
        </>
      )}
      <img 
        src="/evsLogo-removebg-preview.png" 
        alt="Evs Logo" 
        className="evs-logo-glow"
        style={{ height: '30px' }} 
      />
    </Link>
  );
};

export default HorizontalLogo;
