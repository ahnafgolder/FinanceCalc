'use client';
import { useLanguage } from './LanguageContext';

export default function LanguageToggle() {
  const { lang, toggleLang } = useLanguage();

  return (
    <button 
      onClick={toggleLang}
      className="lang-toggle-btn"
      title={lang === 'en' ? 'বাংলায় দেখুন' : 'Switch to English'}
    >
      <span className="icon" style={{ fontSize: '16px' }}>🌐</span>
      <span>{lang === 'en' ? 'বাংলা' : 'English'}</span>
    </button>
  );
}
