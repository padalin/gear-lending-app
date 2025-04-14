// src/Footer.jsx
import React from "react";
import { APP_VERSION } from "./version";

function Footer() {
  return (
    <footer className="fixed bottom-2 right-4 text-xs text-gray-400 bg-gray-900">
      {APP_VERSION}
    </footer>
  );
}

export default Footer;
