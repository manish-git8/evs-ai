import React from 'react';

const AuthLogo = () => {
  return (
    <div className="p-4 d-flex justify-content-center gap-2">
      <img 
        src="/evsLogo.png" 
        alt="Evs Logo" 
        className="evs-logo-glow"
        style={{ height: '50px', zIndex: '1' }} 
      />
    </div>
  );
};

export default AuthLogo;
