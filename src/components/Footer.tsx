import React from 'react';
import './Footer.css';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="footer">
      <div className="footer-content">
        <p className="copyright">© {currentYear} Inovie - inovie SCAN</p>
        <div className="footer-links">
          <a href="#" className="footer-link">Mentions légales</a>
          <a href="#" className="footer-link">Politique de confidentialité</a>
          <a href="#" className="footer-link">Contact</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
