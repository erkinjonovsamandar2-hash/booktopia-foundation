import { createContext, useContext, useState } from 'react';

const LangContext = createContext(null);

const LANGS = ['uz', 'ru', 'en'];
const LANG_LABELS = { uz: "O'z", ru: 'Рус', en: 'Eng' };

export const LangProvider = ({ children }) => {
  const [lang, setLang] = useState(() => localStorage.getItem('booktopia_lang') ?? 'uz');

  const changeLang = (l) => {
    if (LANGS.includes(l)) {
      setLang(l);
      localStorage.setItem('booktopia_lang', l);
    }
  };

  return (
    <LangContext.Provider value={{ lang, changeLang, langs: LANGS, langLabels: LANG_LABELS }}>
      {children}
    </LangContext.Provider>
  );
};

export const useLang = () => {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used within LangProvider');
  return ctx;
};
