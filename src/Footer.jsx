// src/Footer.jsx
import React from "react";
import { APP_VERSION } from "./version";

function Footer() {
  return (
    <footer className="py-2 px-4 text-xs text-gray-400 bg-gray-900 text-right">
      {APP_VERSION}
    </footer>
  );
}

export default Footer;