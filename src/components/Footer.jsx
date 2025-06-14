import React from "react";

function Footer() {
  return (
    <footer className="bg-light text-center text-muted py-3 mt-auto">
      <div className="container">
        <small>
          &copy; {new Date().getFullYear()} Saturn AI. All rights reserved.
        </small>
      </div>
    </footer>
  );
}

export default Footer;
