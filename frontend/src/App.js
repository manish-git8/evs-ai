import React, { useEffect, Suspense } from 'react';
import { useRoutes, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import Swal from 'sweetalert2';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';
import Themeroutes from './routes/Router';
import ThemeSelector from './layouts/theme/ThemeSelector';
import Loader from './layouts/loader/Loader';

const App = () => {
  const routing = useRoutes(Themeroutes);
  const direction = useSelector((state) => state.customizer.isRTL);
  const isMode = useSelector((state) => state.customizer.isDark);
  const navigate = useNavigate();

  useEffect(() => {
    const timeoutDuration = 12 * 60 * 60 * 1000;
    const clearLocalStorage = () => {
      localStorage.removeItem('i18nextLng');
      localStorage.removeItem('entityId');
      localStorage.removeItem('user');
      localStorage.removeItem('userDetails');
      localStorage.removeItem('lastActivityTimestamp');
    };

    const lastActivity = localStorage.getItem('lastActivityTimestamp');
    const currentTime = Date.now();

    if (lastActivity && currentTime - Number(lastActivity) >= timeoutDuration) {
      clearLocalStorage();
      navigate('/login');
    } else {
      localStorage.setItem('lastActivityTimestamp', currentTime);
    }

    const timer = setTimeout(() => {
      clearLocalStorage();
      navigate('/login');
    }, timeoutDuration);

    const handleBeforeUnload = () => {
      localStorage.setItem('lastActivityTimestamp', Date.now());
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [navigate]);
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      response => response,
      error => {
        if (error.response?.status === 401) {
          Swal.fire({
            icon: 'error',
            title: 'Session Expired',
            text: 'Your session has expired. Please log in again.',
            confirmButtonText: 'OK',
            confirmButtonColor: '#549383',
            allowOutsideClick: false,
            customClass: {
              container: 'full-screen-alert',
            },
          }).then(() => {
            localStorage.clear();
            sessionStorage.clear();
            navigate('/login');
          });
        }
        return Promise.reject(error);
      }
    );
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [navigate]);

  return (
    <Suspense fallback={<Loader />}>
      <div
        className={`${direction ? 'rtl' : 'ltr'} ${isMode ? 'dark' : ''}`}
        dir={direction ? 'rtl' : 'ltr'}
      >
        <ThemeSelector />
        {routing}
        <ToastContainer
          position="top-right"
          autoClose={2000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover={false}
          style={{ top: '12px', right: '12px' }}
          toastStyle={{
            marginBottom: '0',
            position: 'absolute',
            top: 0,
            right: 0,
          }}
        />
      </div>
    </Suspense>
  );
};
export default App;