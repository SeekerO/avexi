"use client";

import React, { useState, useLayoutEffect } from "react";
import Link from "next/link";
import { MdOutlineKeyboardArrowRight } from "react-icons/md";
import { IoHome } from "react-icons/io5";

const BreadCrumb = () => {
  const [pathname, setPathname] = useState<string>("");

  useLayoutEffect(() => {
    const path = window.location.pathname;
    const cleanPath = path.replace(/^\/+/, "");
    setPathname(cleanPath);
  }, []);

  return (
    <div className="flex gap-1">
      <div>Home</div>
      <div>Matcher</div>
    </div>
  );
};

export default BreadCrumb;
