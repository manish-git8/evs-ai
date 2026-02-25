import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en', 
    debug: true,
    interpolation: {
      escapeValue: false, // React में XSS से बचाने की ज़रूरत नहीं है
    },
    resources: {
      en: {
        translation:{
            "loginTitle": "Login",
            "email": "Email Address",
            "emailPlaceholder": "Enter your email",
            "password": "Password",
            "passwordPlaceholder": "Enter your password",
            "loginAs": "Login as",
            "user": "User",
            "supplier": "Supplier",
            "rememberMe": "Remember me",
            "forgotPassword": "Forgot Password?",
            "noAccount": "Don't have an account?",
            "registerHere": "Register here",
            "loggingIn": "Logging in...",
            "unexpectedError": "An unexpected error occurred",
            "invalidEntityType": "Invalid entity type",
            "emailRequired": "Email is required",
            "passwordRequired": "Password is required",
            "passwordMin": "Password must be at least 6 characters",
            "entityTypeRequired": "Please select a login type",
            "loginImageAlt": "Login illustration"
          }
          
      },
      hi: {
        translation:{
            "loginTitle": "अपने खाते में लॉगिन करें",
            "email": "ईमेल पता",
            "password": "पासवर्ड",
            "loginAs": "के रूप में लॉगिन करें",
            "user": "उपयोगकर्ता",
            "supplier": "आपूर्तिकर्ता",
            "rememberMe": "मुझे याद रखें",
            "forgotPassword": "पासवर्ड भूल गए?",
            "loggingIn": "लॉगिन हो रहा है...",
            "login": "लॉगिन करें",
            "orLoginWith": "या इसके साथ लॉगिन करें",
            "noAccount": "खाता नहीं है?",
            "registerHere": "यहां रजिस्टर करें"
          }
            
      }
    },
  });

export default i18n;
